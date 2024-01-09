<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Class, Doc, Ref, SortingOrder, isOtherDay, Timestamp } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import activity, {
    ActivityExtension,
    ActivityMessage,
    ActivityMessagesFilter,
    DisplayActivityMessage,
    type DisplayDocUpdateMessage
  } from '@hcengineering/activity'
  import notification, { InboxNotificationsClient } from '@hcengineering/notification'
  import { getResource } from '@hcengineering/platform'
  import { get } from 'svelte/store'

  import ActivityMessagePresenter from './activity-message/ActivityMessagePresenter.svelte'
  import { combineActivityMessages, filterActivityMessages, getClosestDateSelectorDate } from '../activityMessagesUtils'
  import ActivityMessagesSeparator from './activity-message/ActivityMessagesSeparator.svelte'
  import JumpToDateSelector from './JumpToDateSelector.svelte'
  import ActivityExtensionComponent from './ActivityExtension.svelte'

  export let _class: Ref<Class<ActivityMessage>> = activity.class.ActivityMessage
  export let object: Doc
  export let isLoading = false
  export let selectedMessageId: Ref<ActivityMessage> | undefined = undefined
  export let scrollElement: HTMLDivElement | undefined = undefined
  export let startFromBottom = false
  export let filter: Ref<ActivityMessagesFilter> | undefined = undefined
  export let withDates: boolean = true
  export let collection: string | undefined = undefined
  export let showEmbedded = false
  export let skipLabels = false
  export let lastViewedTimestamp: Timestamp | undefined = undefined

  const dateSelectorHeight = 30
  const headerHeight = 50

  const client = getClient()
  const messagesQuery = createQuery()

  let prevMessagesLength = 0
  let messages: DisplayActivityMessage[] = []
  let displayMessages: DisplayActivityMessage[] = []
  let filters: ActivityMessagesFilter[] = []
  let extensions: ActivityExtension[] = []

  let separatorElement: HTMLDivElement | undefined = undefined
  let separatorPosition: number | undefined = undefined
  let showDateSelector = false
  let selectedDate: Timestamp | undefined = undefined

  let isViewportInitialized = false

  let inboxClient: InboxNotificationsClient | undefined = undefined

  getResource(notification.function.GetInboxNotificationsClient).then((getClientFn) => {
    inboxClient = getClientFn()
  })

  $: client.findAll(activity.class.ActivityExtension, { ofClass: object._class }).then((res) => {
    extensions = res
  })

  client.findAll(activity.class.ActivityMessagesFilter, {}).then((res) => {
    filters = res
  })

  $: messagesQuery.query(
    _class,
    { attachedTo: object._id },
    (result: ActivityMessage[]) => {
      prevMessagesLength = messages.length
      messages = combineActivityMessages(result)
      isLoading = false
    },
    {
      sort: {
        createdOn: SortingOrder.Ascending
      }
    }
  )

  function scrollToBottom (afterScrollFn?: () => void) {
    setTimeout(() => {
      if (scrollElement !== undefined) {
        scrollElement?.scrollTo(0, scrollElement.scrollHeight)
        afterScrollFn?.()
      }
    }, 100)
  }

  function scrollToSeparator (afterScrollFn?: () => void) {
    setTimeout(() => {
      if (separatorElement) {
        separatorElement.scrollIntoView()
        afterScrollFn?.()
      }
    }, 100)
  }

  function handleJumpToDate (e: CustomEvent) {
    const date = e.detail.date

    if (!date || !scrollElement) {
      return
    }

    let closestDate = getClosestDateSelectorDate(date, scrollElement)

    if (!closestDate) {
      return
    }

    if (closestDate < date) {
      closestDate = undefined
    } else {
      scrollToDate(closestDate)
    }
  }

  function scrollToDate (date: Timestamp) {
    let offset = date && document.getElementById(date.toString())?.offsetTop

    if (!offset || !scrollElement) {
      return
    }

    offset = offset - headerHeight - dateSelectorHeight / 2

    scrollElement.scrollTo({ left: 0, top: offset })
  }

  function handleScroll () {
    updateSelectedDate()
    readViewportMessages()
  }

  function readViewportMessages () {
    if (!isViewportInitialized) {
      return
    }

    const containerRect = scrollElement?.getBoundingClientRect()

    if (containerRect === undefined) {
      return
    }

    const messagesToRead: DisplayActivityMessage[] = []

    for (const message of displayMessages) {
      const msgElement = document.getElementById(message._id)

      if (!msgElement) {
        continue
      }

      const messageRect = msgElement.getBoundingClientRect()

      if (messageRect.top >= containerRect.top && messageRect.bottom - messageRect.height / 2 <= containerRect.bottom) {
        messagesToRead.push(message)
      }
    }

    readMessage(messagesToRead)
  }

  function readMessage (messages: DisplayActivityMessage[]) {
    if (inboxClient === undefined || messages.length === 0) {
      return
    }

    const allIds = messages
      .map((message) => {
        const combined =
          message._class === activity.class.DocUpdateMessage
            ? (message as DisplayDocUpdateMessage)?.combinedMessagesIds
            : undefined

        return [message._id, ...(combined ?? [])]
      })
      .flat()

    inboxClient.readMessages(allIds)

    const notifyContext = get(inboxClient.docNotifyContextByDoc).get(object._id)
    const lastTimestamp = messages[messages.length - 1].createdOn ?? 0

    if (notifyContext !== undefined && (notifyContext.lastViewedTimestamp ?? 0) < lastTimestamp) {
      client.update(notifyContext, { lastViewedTimestamp: lastTimestamp })
    }
  }

  function updateSelectedDate () {
    if (!scrollElement) {
      return
    }

    const clientRect = scrollElement.getBoundingClientRect()
    const dateSelectors = scrollElement.getElementsByClassName('dateSelector')
    const firstVisibleDateElement = Array.from(dateSelectors)
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

    if (!firstVisibleDateElement) {
      return
    }

    showDateSelector = clientRect.top - firstVisibleDateElement.getBoundingClientRect().top > -dateSelectorHeight / 2
    selectedDate = parseInt(firstVisibleDateElement.id)
  }

  $: filterActivityMessages(messages, filters, object._class, filter).then((filteredMessages) => {
    displayMessages = filteredMessages
  })

  function getNewPosition (displayMessages: ActivityMessage[], lastViewedTimestamp?: Timestamp): number | undefined {
    if (displayMessages.length === 0) {
      return undefined
    }

    if (separatorPosition !== undefined) {
      return separatorPosition
    }

    if (lastViewedTimestamp === undefined) {
      return -1
    }

    if (lastViewedTimestamp === 0) {
      return 0
    }

    const lastViewedMessageIdx = displayMessages.findIndex((message, index) => {
      const createdOn = message.createdOn ?? 0
      const nextCreatedOn = displayMessages[index + 1]?.createdOn ?? 0

      return lastViewedTimestamp >= createdOn && lastViewedTimestamp < nextCreatedOn
    })

    return lastViewedMessageIdx !== -1 ? lastViewedMessageIdx + 1 : -1
  }

  $: separatorPosition = getNewPosition(displayMessages, lastViewedTimestamp)
  $: initializeViewport(scrollElement, separatorElement, separatorPosition)

  function initializeViewport (
    scrollElement?: HTMLDivElement,
    separatorElement?: HTMLDivElement,
    separatorPosition?: number
  ) {
    if (separatorPosition === undefined) {
      return
    }

    if (separatorPosition < 0 && scrollElement) {
      scrollToBottom(markViewportInitialized)
    } else if (separatorElement) {
      scrollToSeparator(markViewportInitialized)
    }
  }

  function markViewportInitialized () {
    // We should mark viewport as initialized when scroll is finished
    setTimeout(() => {
      isViewportInitialized = true
      readViewportMessages()
    }, 100)
  }

  function handleMessageSent () {
    scrollToBottom(markViewportInitialized)
  }

  $: if (isViewportInitialized && messages.length > prevMessagesLength) {
    setTimeout(() => { readViewportMessages() }, 100)
  }
</script>

{#if !isLoading}
  <div class="flex-col vScroll" bind:this={scrollElement} on:scroll={handleScroll}>
    {#if startFromBottom}
      <div class="grower" />
    {/if}
    {#if showDateSelector}
      <div class="ml-2 pr-2 fixed">
        <JumpToDateSelector {selectedDate} fixed on:jumpToDate={handleJumpToDate} />
      </div>
    {/if}
    {#each displayMessages as message, index}
      {#if index === separatorPosition}
        <ActivityMessagesSeparator bind:element={separatorElement} title={activity.string.New} line reverse isNew />
      {/if}

      {#if withDates && (index === 0 || isOtherDay(message.createdOn ?? 0, displayMessages[index - 1].createdOn ?? 0))}
        <JumpToDateSelector selectedDate={message.createdOn} on:jumpToDate={handleJumpToDate} />
      {/if}

      <ActivityMessagePresenter
        value={message}
        skipLabel={skipLabels}
        {showEmbedded}
        isHighlighted={message._id === selectedMessageId}
        shouldScroll={selectedMessageId === message._id}
      />
    {/each}
  </div>
{/if}
<div class="ref-input">
  <ActivityExtensionComponent
    kind="input"
    {extensions}
    props={{ object, boundary: scrollElement, collection }}
    on:submit={handleMessageSent}
  />
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

  .ref-input {
    margin: 1.25rem 1rem;
  }
</style>
