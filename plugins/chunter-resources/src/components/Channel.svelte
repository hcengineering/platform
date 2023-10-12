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
  import attachment, { Attachment } from '@hcengineering/attachment'
  import type { ChunterMessage, Message } from '@hcengineering/chunter'
  import core, { Doc, Ref, Space, Timestamp, WithLookup } from '@hcengineering/core'
  import { DocUpdates } from '@hcengineering/notification'
  import { NotificationClientImpl } from '@hcengineering/notification-resources'
  import { createQuery } from '@hcengineering/presentation'
  import { location as locationStore } from '@hcengineering/ui'
  import { afterUpdate, beforeUpdate, onDestroy } from 'svelte'
  import chunter from '../plugin'
  import { getDay, isMessageHighlighted, messageIdForScroll, scrollAndHighLight, shouldScrollToMessage } from '../utils'
  import ChannelSeparator from './ChannelSeparator.svelte'
  import JumpToDateSelector from './JumpToDateSelector.svelte'
  import MessageComponent from './Message.svelte'

  export let space: Ref<Space> | undefined
  export let pinnedIds: Ref<ChunterMessage>[]
  export let savedMessagesIds: Ref<ChunterMessage>[]
  export let savedAttachmentsIds: Ref<Attachment>[]
  export let isScrollForced = false
  export let content: HTMLElement | undefined = undefined

  let autoscroll: boolean = false

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
    autoscroll = content !== undefined && content.offsetHeight + content.scrollTop > content.scrollHeight - 20
  })

  afterUpdate(() => {
    if ($shouldScrollToMessage && !$isMessageHighlighted) {
      scrollAndHighLight()

      return
    }
    if (content && (autoscroll || isScrollForced)) {
      content.scrollTo(0, content.scrollHeight)
      isScrollForced = false
    }
  })

  let messages: WithLookup<Message>[] = []
  const query = createQuery()

  const notificationClient = NotificationClientImpl.getClient()
  const docUpdates = notificationClient.docUpdatesStore

  $: updateQuery(space)

  function updateQuery (space: Ref<Space> | undefined) {
    if (space === undefined) {
      query.unsubscribe()
      messages = []
      return
    }
    query.query(
      chunter.class.Message,
      {
        space
      },
      (res) => {
        messages = res
        newMessagesPos = newMessagesStart(messages, $docUpdates)
        notificationClient.read(space)
      },
      {
        lookup: {
          _id: { attachments: attachment.class.Attachment, reactions: chunter.class.Reaction },
          createBy: core.class.Account
        }
      }
    )
  }

  function newMessagesStart (messages: Message[], docUpdates: Map<Ref<Doc>, DocUpdates>): number {
    if (space === undefined) return -1
    const docUpdate = docUpdates.get(space)
    const lastView = docUpdate?.txes?.findLast((tx) => !tx.isNew)
    if (!docUpdate?.txes.some((tx) => tx.isNew)) return -1
    if (docUpdate === undefined || lastView === undefined) return -1
    for (let index = 0; index < messages.length; index++) {
      const message = messages[index]
      if ((message.createdOn ?? 0) >= lastView.modifiedOn) return index
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

    const dateSelectors = content?.getElementsByClassName('dateSelector')
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
      content?.scrollTo({ left: 0, top: offset })
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
    if (!content) return

    const clientRect = content.getBoundingClientRect()
    const dateSelectors = content.getElementsByClassName('dateSelector')
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
</script>

<div class="flex-col vScroll" bind:this={content} on:scroll={handleScroll}>
  <div class="grower" />
  {#if showFixed}
    <div class="ml-2 pr-2 fixed">
      <JumpToDateSelector {selectedDate} fixed on:jumpToDate={handleJumpToDate} />
    </div>
  {/if}
  {#if messages}
    {#each messages as message, i (message._id)}
      {#if newMessagesPos === i}
        <ChannelSeparator title={chunter.string.New} line reverse isNew />
      {/if}
      {#if i === 0 || isOtherDay(message.createdOn ?? 0, messages[i - 1].createdOn ?? 0)}
        <JumpToDateSelector selectedDate={message.createdOn} on:jumpToDate={handleJumpToDate} />
      {/if}
      <MessageComponent
        isHighlighted={$messageIdForScroll === message._id && $isMessageHighlighted}
        {message}
        on:openThread
        isPinned={pinnedIds.includes(message._id)}
        isSaved={savedMessagesIds.includes(message._id)}
        {savedAttachmentsIds}
      />
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
