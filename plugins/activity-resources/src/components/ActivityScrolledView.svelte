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
  import { Class, Doc, Ref, SortingOrder, isOtherDay, Timestamp, getCurrentAccount } from '@hcengineering/core'
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
  import { filterActivityMessages, getClosestDateSelectorDate } from '../activityMessagesUtils'
  import ActivityMessagesSeparator from './activity-message/ActivityMessagesSeparator.svelte'
  import JumpToDateSelector from './JumpToDateSelector.svelte'
  import ActivityExtensionComponent from './ActivityExtension.svelte'
  import ChatMessage from './ChatMessage.svelte'
  import { Scroller, ScrollParams } from '@hcengineering/ui'

  export let messages: DisplayActivityMessage[] = []
  export let object: Doc | undefined
  export let objectClass: Ref<Class<Doc>>
  export let objectId: Ref<Doc>
  export let selectedMessageId: Ref<ActivityMessage> | undefined = undefined
  export let scrollElement: HTMLDivElement | undefined = undefined
  export let startFromBottom = false
  export let selectedFilters: Ref<ActivityMessagesFilter>[] = []
  export let withDates: boolean = true
  export let collection: string | undefined = undefined
  export let showEmbedded = false
  export let skipLabels = false
  export let lastViewedTimestamp: Timestamp | undefined = undefined

  const dateSelectorHeight = 30
  const headerHeight = 50

  const client = getClient()

  let displayMessages: DisplayActivityMessage[] = []
  let filters: ActivityMessagesFilter[] = []
  let extensions: ActivityExtension[] = []

  let separatorElement: HTMLDivElement | undefined = undefined
  let separatorPosition: number | undefined = undefined
  let selectedDate: Timestamp | undefined = undefined

  let autoscroll = false
  let scrollContentBox: HTMLDivElement | undefined = undefined
  let inboxClient: InboxNotificationsClient | undefined = undefined
  let shouldWaitAndRead = false

  getResource(notification.function.GetInboxNotificationsClient).then((getClientFn) => {
    inboxClient = getClientFn()
  })

  $: extensions = client.getModel().findAllSync(activity.class.ActivityExtension, { ofClass: objectClass })

  filters = client.getModel().findAllSync(activity.class.ActivityMessagesFilter, {})

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

  function scrollToMessage () {
    if (!selectedMessageId) {
      return
    }

    if (!scrollElement || !scrollContentBox) {
      setTimeout(scrollToMessage, 50)
    }

    const messagesElements = scrollContentBox?.getElementsByClassName('activityMessage')
    const msgElement = messagesElements?.[selectedMessageId as any]
    if (!msgElement) {
      if (messages.some(({ _id }) => _id === selectedMessageId)) {
        setTimeout(scrollToMessage, 50)
      }
      return
    }

    msgElement.scrollIntoView()
    readViewportMessages()
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
    autoscroll = false

    const element = date ? document.getElementById(date.toString()) : undefined

    let offset = element?.offsetTop

    if (!offset || !scrollElement) {
      return
    }

    offset = offset - headerHeight - dateSelectorHeight / 2

    scrollElement.scrollTo({ left: 0, top: offset })
  }

  function handleScroll ({ autoScrolling }: ScrollParams) {
    shouldWaitAndRead = false
    if (autoScrolling && isLastMessageViewed()) {
      readViewportMessages()
      return
    }

    if (autoScrolling) {
      return
    }

    updateSelectedDate()
    readViewportMessages()
  }

  function isLastMessageViewed (): boolean {
    if (!scrollElement) {
      return false
    }

    const last = displayMessages[displayMessages.length - 1]

    if (last === undefined) {
      return false
    }

    const containerRect = scrollElement.getBoundingClientRect()
    const messagesElements = scrollContentBox?.getElementsByClassName('activityMessage')
    const msgElement = messagesElements?.[last._id as any]

    if (!msgElement) {
      return false
    }

    return messageInView(msgElement, containerRect)
  }

  function messageInView (msgElement: Element, containerRect: DOMRect): boolean {
    const messageRect = msgElement.getBoundingClientRect()

    return messageRect.top >= containerRect.top && messageRect.bottom - messageRect.height / 2 <= containerRect.bottom
  }

  function readViewportMessages () {
    if (scrollElement === undefined || scrollContentBox === undefined) {
      return
    }

    const containerRect = scrollElement.getBoundingClientRect()

    const messagesToRead: DisplayActivityMessage[] = []
    const messagesElements = scrollContentBox?.getElementsByClassName('activityMessage')

    for (const message of displayMessages) {
      const msgElement = messagesElements?.[message._id as any]

      if (!msgElement) {
        continue
      }

      if (messageInView(msgElement, containerRect)) {
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

    const notifyContext = get(inboxClient.docNotifyContextByDoc).get(objectId)
    const lastTimestamp = messages[messages.length - 1].createdOn ?? 0

    if (notifyContext !== undefined && (notifyContext.lastViewedTimestamp ?? 0) < lastTimestamp) {
      client.update(notifyContext, { lastViewedTimestamp: lastTimestamp })
    }
  }

  function updateSelectedDate () {
    if (scrollContentBox === undefined || scrollElement === undefined) {
      return
    }

    const clientRect = scrollElement.getBoundingClientRect()
    const dateSelectors = scrollContentBox.getElementsByClassName('dateSelector')

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

    selectedDate = parseInt(firstVisibleDateElement.id)
  }

  $: filterActivityMessages(messages, filters, objectClass, selectedFilters).then((filteredMessages) => {
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
      const nextMessage = displayMessages[index + 1]

      if (message.createdBy === getCurrentAccount()._id) {
        return false
      }

      const createdOn = message.createdOn ?? 0
      const nextCreatedOn = nextMessage?.createdOn ?? 0

      return lastViewedTimestamp >= createdOn && lastViewedTimestamp < nextCreatedOn
    })

    return lastViewedMessageIdx !== -1 ? lastViewedMessageIdx + 1 : -1
  }

  $: separatorPosition = getNewPosition(displayMessages, lastViewedTimestamp)
  $: initializeScroll(separatorElement, separatorPosition)

  function initializeScroll (separatorElement?: HTMLDivElement, separatorPosition?: number) {
    if (separatorPosition === undefined) {
      return
    }
    if (messages.some(({ _id }) => _id === selectedMessageId)) {
      scrollToMessage()
      return
    }
    if (separatorPosition < 0) {
      shouldWaitAndRead = true
      autoscroll = true
    } else if (separatorElement) {
      scrollToSeparator(() =>
        setTimeout(() => {
          readViewportMessages()
        }, 100)
      )
    }
  }

  function waitLastMessageRenderAndRead () {
    if (isLastMessageViewed()) {
      readViewportMessages()
      shouldWaitAndRead = false
    } else if (shouldWaitAndRead) {
      setTimeout(waitLastMessageRenderAndRead, 50)
    }
  }

  $: if (shouldWaitAndRead) {
    waitLastMessageRenderAndRead()
  }

  function handleMessageSent () {
    scrollToBottom()
    shouldWaitAndRead = true
  }
</script>

<div class="flex-col h-full">
  {#if startFromBottom}
    <div class="grower" />
  {/if}
  {#if selectedDate}
    <div class="ml-2 pr-2">
      <JumpToDateSelector {selectedDate} fixed on:jumpToDate={handleJumpToDate} />
    </div>
  {/if}
  <Scroller
    {autoscroll}
    bottomStart={startFromBottom}
    bind:divScroll={scrollElement}
    bind:divBox={scrollContentBox}
    onScroll={handleScroll}
  >
    <slot name="header" />
    {#each displayMessages as message, index}
      {@const isSelected = message._id === selectedMessageId}
      {@const prevMessage = displayMessages[index - 1]}
      {#if index === separatorPosition}
        <ActivityMessagesSeparator bind:element={separatorElement} label={activity.string.New} />
      {/if}

      {#if withDates && (index === 0 || isOtherDay(message.createdOn ?? 0, prevMessage?.createdOn ?? 0))}
        <JumpToDateSelector selectedDate={message.createdOn} on:jumpToDate={handleJumpToDate} />
      {/if}

      <div style:margin="0 1.5rem">
        <ActivityMessagePresenter
          value={message}
          skipLabel={skipLabels}
          {showEmbedded}
          isHighlighted={isSelected}
          shouldScroll={isSelected}
        />
      </div>
    {/each}
  </Scroller>
</div>

{#if object}
  <div class="ref-input">
    <ActivityExtensionComponent
      kind="input"
      {extensions}
      props={{ object, boundary: scrollElement, collection }}
      on:submit={handleMessageSent}
    />
  </div>
{/if}

<style lang="scss">
  .grower {
    flex-grow: 10;
    flex-shrink: 5;
  }

  .ref-input {
    margin: 1.25rem 1rem;
  }
</style>
