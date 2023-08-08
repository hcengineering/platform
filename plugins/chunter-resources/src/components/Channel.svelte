<!--
// Copyright © 2020 Anticrm Platform Contributors.
// 
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { afterUpdate, beforeUpdate, onDestroy } from 'svelte'
  import attachment, { Attachment } from '@hcengineering/attachment'
  import type { ChunterMessage, Message } from '@hcengineering/chunter'
  import core, { Account, Doc, Ref, Space, Timestamp, WithLookup, getCurrentAccount } from '@hcengineering/core'
  import notification, { DocUpdates } from '@hcengineering/notification'
  import { NotificationClientImpl } from '@hcengineering/notification-resources'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { location as locationStore, showPanel, Spinner } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  import chunter from '../plugin'
  import { getDay, isMessageHighlighted, messageIdForScroll, scrollAndHighLight, shouldScrollToMessage } from '../utils'
  import ChannelSeparator from './ChannelSeparator.svelte'
  import JumpToDateSelector from './JumpToDateSelector.svelte'
  import MessageComponent from './Message.svelte'
  import NotificationView from './NotificationView.svelte'
  import { EmployeeAccount } from '@hcengineering/contact'

  export let space: Ref<Space> | undefined
  export let pinnedIds: Ref<ChunterMessage>[]
  export let savedMessagesIds: Ref<ChunterMessage>[]
  export let savedAttachmentsIds: Ref<Attachment>[]
  export let isScrollForced = false

  let div: HTMLDivElement | undefined
  let autoscroll: boolean = false

  const currentUser = getCurrentAccount()._id

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const spaceQuery = createQuery()
  let spaceObject: Space | undefined
  let isDirectMessageSpace = false
  let directUser: Ref<Account> | undefined
  const docUpdatesQuery = createQuery()

  type FeedData = (Message | DocUpdates)
  let feed: FeedData[] = []

  let loadingUpdates = true
  let loadingMessages = true
  let messages: WithLookup<Message>[] = []
  let docs: DocUpdates[] = []

  $: spaceQuery.query(core.class.Space, { _id: space }, (res) => {
    ;[spaceObject] = res
    if (spaceObject !== undefined) {
      isDirectMessageSpace = hierarchy.isDerived(spaceObject._class, chunter.class.DirectMessage)
      if (isDirectMessageSpace) {
        directUser = spaceObject.members.filter(m => m !== currentUser)[0]
      }
    }

    feed = []
    loadingMessages = true
    messages = []
  })

  $: if (directUser !== undefined && isDirectMessageSpace) {
    docUpdatesQuery.query(
      notification.class.DocUpdates,
      {
        user: getCurrentAccount()._id,
        hidden: false,
        attachedToClass: { $ne: chunter.class.DirectMessage }
      },
      (res) => {
        docs = res
        loadingUpdates = false
      },
      {
        sort: {
          lastTxTime: -1
        }
      }
    )
  } else {
    docUpdatesQuery.unsubscribe()
    loadingUpdates = false
  }

  function filterDocUpdates(docs: DocUpdates[], directUser?: Ref<Account>): DocUpdates[] {
    if (directUser === undefined) {
      return []
    }

    const result: DocUpdates[] = []
    for (const doc of docs) {
      if (doc.txes.length === 0) continue
      const txes = doc.txes.filter((p) => p.modifiedBy === directUser)
      if (txes.length > 0) {
        result.push({...doc, txes})
      }
    }
    return result
  }

  const unsubscribe = locationStore.subscribe((newLocation) => {
    const messageId = newLocation.fragment

    if (!messageId) {
      messageIdForScroll.set('')

      return
    }
    if (messageId === $messageIdForScroll) {
      return
    }
    messageIdForScroll.set(messageId)
    shouldScrollToMessage.set(true)
    scrollAndHighLight()
  })
  onDestroy(unsubscribe)

  beforeUpdate(() => {
    autoscroll = div !== undefined && div.offsetHeight + div.scrollTop > div.scrollHeight - 20
  })

  afterUpdate(() => {
    if ($shouldScrollToMessage && !$isMessageHighlighted) {
      scrollAndHighLight()

      return
    }
    if (div && (autoscroll || isScrollForced)) {
      div.scrollTo(0, div.scrollHeight)
      isScrollForced = false
    }
  })

  const query = createQuery()

  const notificationClient = NotificationClientImpl.getClient()
  const docUpdates = notificationClient.docUpdatesStore

  $: query.query(
    chunter.class.Message,
    {
      space
    },
    (res) => {
      messages = res
      newMessagesPos = newMessagesStart(messages, $docUpdates)
      if (space !== undefined) {
        notificationClient.read(space)
      }
      loadingMessages = false
    },
    {
      lookup: {
        _id: { attachments: attachment.class.Attachment, reactions: chunter.class.Reaction },
        createBy: core.class.Account
      }
    }
  )

  function buildFeed(feed: FeedData[], docs: DocUpdates[], messages: Message[], directUser?: Ref<Account>): FeedData[] {
    feed = [...messages, ...filterDocUpdates(docs, directUser)]
    feed.sort((a, b) => {
      const ta = hierarchy.isDerived(a._class, chunter.class.Message) ? (a.createdOn ?? 0) : (a as DocUpdates).txes[0].modifiedOn
      const tb = hierarchy.isDerived(b._class, chunter.class.Message) ? (b.createdOn ?? 0): (b as DocUpdates).txes[0].modifiedOn
      return ta - tb
    })
    return feed
  }

  function newMessagesStart (messages: Message[], docUpdates: Map<Ref<Doc>, DocUpdates>): number {
    if (space === undefined) return -1
    const docUpdate = docUpdates.get(space)
    let lastView: number | undefined
    for (const tx of docUpdate?.txes ?? []) {
      if (tx.isNew) {
        lastView = tx.modifiedOn
        break
      }
    }
    if (docUpdate === undefined || lastView === undefined) return -1
    for (let index = 0; index < messages.length; index++) {
      const message = messages[index]
      if ((message.createdOn ?? 0) >= lastView) return index - 1
    }
    return -1
  }

  $: markUnread(messages, $docUpdates)
  function markUnread (messages: Message[], docUpdates: Map<Ref<Doc>, DocUpdates>) {
    const newPos = newMessagesStart(messages, docUpdates)
    if (newPos !== -1) {
      newMessagesPos = newPos
    }
  }

  let newMessagesPos: number = -1

  function isOtherDay (time1: Timestamp, time2: Timestamp) {
    return getDay(time1) !== getDay(time2)
  }

  function handleJumpToDate (e: CustomEvent<any>) {
    const date = e.detail.date
    if (!date) {
      return
    }

    const dateSelectors = div?.getElementsByClassName('dateSelector')
    if (!dateSelectors) return

    let closestDate: Timestamp | undefined = parseInt(dateSelectors[dateSelectors.length - 1].id)

    for (const elem of Array.from(dateSelectors).reverse()) {
      const curDate = parseInt(elem.id)
      if (curDate < date) break
      else if (curDate - date < closestDate - date) {
        closestDate = curDate
      }
    }
    if (closestDate && closestDate < date) closestDate = undefined

    if (closestDate) {
      scrollToDate(closestDate)
    }
  }

  const pinnedHeight = 30
  const headerHeight = 50
  function scrollToDate (date: Timestamp) {
    let offset = date && document.getElementById(date.toString())?.offsetTop
    if (offset) {
      offset = offset - headerHeight - dateSelectorHeight / 2
      if (pinnedIds.length > 0) offset = offset - pinnedHeight
      div?.scrollTo({ left: 0, top: offset })
    }
  }

  let showFixed: boolean | undefined
  let selectedDate: Timestamp | undefined = undefined
  function handleScroll () {
    const upperVisible = getFirstVisible()
    if (upperVisible) {
      selectedDate = parseInt(upperVisible.id)
    }
  }

  const dateSelectorHeight = 30
  function getFirstVisible (): Element | undefined {
    if (!div) return

    const clientRect = div.getBoundingClientRect()
    const dateSelectors = div.getElementsByClassName('dateSelector')
    const firstVisible = Array.from(dateSelectors)
      .reverse()
      .find((child) => {
        if (child?.nodeType === Node.ELEMENT_NODE) {
          const rect = child?.getBoundingClientRect()
          if (rect.top - dateSelectorHeight / 2 <= clientRect.top + dateSelectorHeight) {
            return true
          }
        }
        return false
      })
    if (firstVisible) {
      showFixed = clientRect.top - firstVisible.getBoundingClientRect().top > -dateSelectorHeight / 2
    }
    return firstVisible
  }

  function toMessage(data: FeedData): Message {
    return data as Message
  }

  function toDocUpdate(data: FeedData): DocUpdates {
    return data as DocUpdates
  }

  async function select (value: DocUpdates | undefined) {
    if (!value) {
      return
    }

    const targetClass = hierarchy.getClass(value.attachedToClass)
    const panelComponent = hierarchy.as(targetClass, view.mixin.ObjectPanel)
    const component = panelComponent.component ?? view.component.EditDoc
    showPanel(component, value.attachedTo, value.attachedToClass, 'content')
  }

  $: feed = buildFeed(feed, docs, messages, directUser)

  function updateMessage(feed: FeedData[], message: Message) {
    const msgIndex = feed.findIndex((d) => d._id === message._id)
    if (msgIndex > 0) {
      feed[msgIndex] = message
    }
  }
</script>

<div class="flex-col vScroll" bind:this={div} on:scroll={handleScroll}>
  <div class="grower" />
  {#if showFixed}
    <div class="ml-2 pr-2 fixed">
      <JumpToDateSelector {selectedDate} fixed on:jumpToDate={handleJumpToDate} />
    </div>
  {/if}
  {#if loadingMessages || loadingUpdates}
    <Spinner />
  {:else}
    {#each feed as data, i (data._id)}
      {#if newMessagesPos === i}
        <ChannelSeparator title={chunter.string.New} line reverse isNew />
      {/if}
      {#if i === 0 || isOtherDay(data.createdOn ?? 0, feed[i - 1].createdOn ?? 0)}
        <JumpToDateSelector selectedDate={data.createdOn} on:jumpToDate={handleJumpToDate} />
      {/if}
      {#if hierarchy.isDerived(data._class, notification.class.DocUpdates)}
        {@const item = toDocUpdate(data)}
        <div class="mb-4">
          <NotificationView
            value={item}
            selected={false}
            on:click={() => select(item)}
          />
        </div>
      {:else}
        {@const message = toMessage(data)}
        <MessageComponent
          isHighlighted={$messageIdForScroll === data._id && $isMessageHighlighted}
          {message}
          on:openThread
          on:openThread={() => updateMessage(feed, message)}
          isPinned={pinnedIds.includes(message._id)}
          isSaved={savedMessagesIds.includes(message._id)}
          {savedAttachmentsIds}
        />
      {/if}
    {/each}
  {/if}
</div>

<style lang="scss">
  .grower {
    flex-grow: 10;
    flex-shrink: 5;
  }
  .fixed {
    position: absolute;
    align-self: center;
    z-index: 1;
  }
</style>
