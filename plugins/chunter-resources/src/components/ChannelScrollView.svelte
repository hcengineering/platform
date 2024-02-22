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
  import { Class, Doc, getDay, Ref, Timestamp } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import activity, {
    ActivityExtension,
    ActivityMessage,
    ActivityMessagesFilter,
    DisplayActivityMessage
  } from '@hcengineering/activity'
  import { Loading, Scroller, ScrollParams } from '@hcengineering/ui'
  import {
    ActivityExtension as ActivityExtensionComponent,
    ActivityMessagePresenter
  } from '@hcengineering/activity-resources'
  import { InboxNotificationsClientImpl } from '@hcengineering/notification-resources'
  import { get } from 'svelte/store'
  import { tick } from 'svelte'

  import ActivityMessagesSeparator from './ChannelMessagesSeparator.svelte'
  import { filterChatMessages, getClosestDate, readChannelMessages } from '../utils'
  import HistoryLoading from './LoadingHistory.svelte'
  import { ChannelDataProvider } from '../channelDataProvider'
  import JumpToDateSelector from './JumpToDateSelector.svelte'

  export let provider: ChannelDataProvider
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
  export let loadMoreAllowed = true

  const dateSelectorHeight = 30
  const headerHeight = 50
  const minMsgHeightRem = 4.375

  const client = getClient()
  const inboxClient = InboxNotificationsClientImpl.getClient()
  const contextByDocStore = inboxClient.docNotifyContextByDoc
  const filters = client.getModel().findAllSync(activity.class.ActivityMessagesFilter, {})

  const messagesStore = provider.messagesStore
  const isLoadingStore = provider.isLoadingStore
  const isLoadingMoreStore = provider.isLoadingMoreStore
  const newTimestampStore = provider.newTimestampStore
  const datesStore = provider.datesStore

  let messages: ActivityMessage[] = []
  let displayMessages: DisplayActivityMessage[] = []
  let extensions: ActivityExtension[] = []

  let scroller: Scroller | undefined = undefined
  let separatorElement: HTMLDivElement | undefined = undefined
  let scrollContentBox: HTMLDivElement | undefined = undefined

  let autoscroll = false
  let shouldScrollToNew = false
  let shouldWaitAndRead = false
  let isScrollInitialized = false

  let selectedDate: Timestamp | undefined = undefined
  let dateToJump: Timestamp | undefined = undefined

  let messagesCount = 0

  $: messages = $messagesStore
  $: isLoading = $isLoadingStore

  $: extensions = client.getModel().findAllSync(activity.class.ActivityExtension, { ofClass: objectClass })

  $: notifyContext = $contextByDocStore.get(objectId)

  $: filterChatMessages(messages, filters, objectClass, selectedFilters).then((filteredMessages) => {
    displayMessages = filteredMessages
  })

  function scrollToBottom (afterScrollFn?: () => void) {
    if (scroller !== undefined && scrollElement !== undefined) {
      scroller.scrollBy(scrollElement.scrollHeight)
      updateSelectedDate()
      afterScrollFn?.()
    }
  }

  function scrollToSeparator () {
    if (separatorElement) {
      separatorElement.scrollIntoView()
      updateShouldScrollToNew()
      readViewportMessages()
    }
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
      if (displayMessages.some(({ _id }) => _id === selectedMessageId)) {
        setTimeout(scrollToMessage, 50)
      }
      return
    }

    msgElement.scrollIntoView()
    readViewportMessages()
  }

  function isDateRendered (date: Timestamp) {
    const day = getDay(date)

    return document.getElementById(day.toString()) != null
  }

  async function jumpToDate (e: CustomEvent) {
    const date = e.detail.date

    if (!date || !scrollElement) {
      return
    }

    const closestDate = getClosestDate(date, get(provider.datesStore))

    if (closestDate === undefined) {
      return
    }

    if (isDateRendered(closestDate)) {
      scrollToDate(closestDate)
    } else {
      void provider.jumpToDate(closestDate)
      dateToJump = closestDate
    }
  }

  function scrollToDate (date: Timestamp) {
    autoscroll = false
    dateToJump = undefined
    shouldWaitAndRead = false

    const day = getDay(date)
    const element = document.getElementById(day.toString())

    let offset = element?.offsetTop

    if (!offset || !scroller) {
      return
    }

    offset = offset - headerHeight - dateSelectorHeight / 2

    scroller?.scroll(offset)
  }

  function updateShouldScrollToNew () {
    if (scrollElement) {
      const { offsetHeight, scrollHeight, scrollTop } = scrollElement
      const offset = 100

      shouldScrollToNew = scrollHeight <= scrollTop + offsetHeight + offset
    }
  }

  function shouldLoadMoreUp () {
    if (!scrollElement) {
      return false
    }

    return scrollElement.scrollTop === 0
  }

  function shouldLoadMoreDown () {
    if (!scrollElement) {
      return false
    }

    const { scrollHeight, scrollTop, clientHeight } = scrollElement

    return scrollTop + clientHeight === scrollHeight
  }

  let scrollToRestore = 0

  function loadMore () {
    if (!loadMoreAllowed || $isLoadingMoreStore || !scrollElement || isInitialScrolling) {
      return
    }

    const minMsgHeightPx = minMsgHeightRem * parseFloat(getComputedStyle(document.documentElement).fontSize)
    const maxMsgPerScreen = Math.ceil(scrollElement.clientHeight / minMsgHeightPx)
    const limit = Math.max(maxMsgPerScreen, provider.limit)

    if (shouldLoadMoreUp() && scrollElement && provider.canLoadMore('backward', messages[0]?.createdOn)) {
      shouldScrollToNew = false
      scrollToRestore = scrollElement.scrollHeight
      void provider.loadMore('backward', messages[0]?.createdOn, limit)
    } else if (shouldLoadMoreDown() && provider.canLoadMore('forward', messages[messages.length - 1]?.createdOn)) {
      shouldScrollToNew = false
      void provider.loadMore('forward', messages[messages.length - 1]?.createdOn, limit)
    }
  }

  function handleScroll ({ autoScrolling }: ScrollParams) {
    if (autoScrolling) {
      return
    }

    shouldWaitAndRead = false
    autoscroll = false

    updateShouldScrollToNew()
    loadMore()
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

    void readChannelMessages(messagesToRead, notifyContext)
  }

  function updateSelectedDate () {
    if (!withDates) {
      return
    }

    if (scrollContentBox === undefined || scrollElement === undefined) {
      return
    }

    const containerRect = scrollElement.getBoundingClientRect()

    const messagesElements = scrollContentBox?.getElementsByClassName('activityMessage')

    if (messagesElements === undefined) {
      return
    }

    const reversedMessages = [...displayMessages].reverse()
    const reversedDates = [...get(datesStore)].reverse()

    for (const message of reversedMessages) {
      const msgElement = messagesElements?.[message._id as any]

      if (!msgElement) {
        continue
      }

      const createdOn = message.createdOn

      if (createdOn === undefined) {
        continue
      }

      if (messageInView(msgElement, containerRect)) {
        selectedDate = reversedDates.find((date) => date <= createdOn)

        break
      }
    }
  }

  $: void initializeScroll($isLoadingStore, separatorElement, $newTimestampStore)

  let isInitialScrolling = true
  async function initializeScroll (isLoading: boolean, separatorElement?: HTMLDivElement, newTimestamp?: Timestamp) {
    if (isLoading || isScrollInitialized) {
      return
    }

    updateSelectedDate()

    if (selectedMessageId !== undefined && messages.some(({ _id }) => _id === selectedMessageId)) {
      isScrollInitialized = true
      await wait()
      scrollToMessage()
      isInitialScrolling = false
    } else if (newTimestamp === undefined) {
      isScrollInitialized = true
      shouldWaitAndRead = true
      autoscroll = true
      shouldScrollToNew = true
      waitLastMessageRenderAndRead(() => {
        isInitialScrolling = false
        autoscroll = false
      })
    } else if (separatorElement) {
      isScrollInitialized = true
      await wait()
      scrollToSeparator()
      isInitialScrolling = false
    }
  }

  function waitLastMessageRenderAndRead (onComplete?: () => void) {
    if (isLastMessageViewed()) {
      readViewportMessages()
      shouldScrollToNew = true
      shouldWaitAndRead = false
      onComplete?.()
    } else if (shouldWaitAndRead && messages.length > 0) {
      setTimeout(() => {
        waitLastMessageRenderAndRead(onComplete)
      }, 50)
    } else {
      onComplete?.()
    }
  }

  let scrollToLastMessage = false

  function scrollUntilSeeLastMessage () {
    if (isLastMessageViewed()) {
      readViewportMessages()
      shouldScrollToNew = true
      scrollToLastMessage = false
    } else if (scrollToLastMessage && shouldScrollToNew) {
      setTimeout(() => {
        scrollToBottom(scrollUntilSeeLastMessage)
      }, 50)
    } else {
      scrollToLastMessage = false
    }
  }

  function scrollToNewMessages () {
    if (!scrollElement || !shouldScrollToNew) {
      return
    }

    scrollToLastMessage = true
    scrollToBottom()
    scrollUntilSeeLastMessage()
  }

  async function wait () {
    // One tick is not enough for messages to be rendered,
    // I think this is due to the fact that we are using a Component, which takes some time to load,
    // because after one tick I see spinners from Component
    await tick() // wait until the DOM is updated
    await tick() // wait until the DOM is updated
  }

  async function restoreScroll () {
    if (!scrollElement || !scroller) {
      scrollToRestore = 0
      return
    }

    await wait()

    const delta = scrollElement.scrollHeight - scrollToRestore

    scroller.scrollBy(delta)

    scrollToRestore = 0
    dateToJump = 0
    autoscroll = false
    shouldWaitAndRead = false
  }

  async function handleMessagesUpdated (newCount: number) {
    if (newCount === messagesCount) {
      return
    }

    if (scrollToRestore > 0) {
      void restoreScroll()
    } else if (dateToJump !== undefined) {
      await wait()
      scrollToDate(dateToJump)
    } else if (newCount > messagesCount) {
      await wait()
      scrollToNewMessages()
    }

    messagesCount = newCount
  }

  $: handleMessagesUpdated(displayMessages.length)
  function handleResize () {
    if (!isInitialScrolling && isScrollInitialized) {
      loadMore()
    }
  }
</script>

{#if isLoading}
  <Loading />
{:else}
  <div class="flex-col h-full relative">
    {#if startFromBottom}
      <div class="grower" />
    {/if}
    {#if withDates && displayMessages.length > 0}
      <div class="ml-2 pr-2">
        <JumpToDateSelector {selectedDate} fixed on:jumpToDate={jumpToDate} />
      </div>
    {/if}
    {#if isInitialScrolling}
      <div class="overlay">
        <Loading />
      </div>
    {/if}
    <Scroller
      {autoscroll}
      bottomStart={startFromBottom}
      bind:this={scroller}
      bind:divScroll={scrollElement}
      bind:divBox={scrollContentBox}
      noStretch={false}
      onScroll={handleScroll}
      onResize={handleResize}
    >
      {#if loadMoreAllowed && provider.canLoadMore('backward', messages[0]?.createdOn)}
        <HistoryLoading isLoading={$isLoadingMoreStore} />
      {/if}
      <slot name="header" />

      {#each displayMessages as message (message._id)}
        {@const isSelected = message._id === selectedMessageId}

        {#if message.createdOn === $newTimestampStore}
          <ActivityMessagesSeparator bind:element={separatorElement} label={activity.string.New} />
        {/if}

        {#if withDates && message.createdOn && $datesStore.includes(message.createdOn)}
          <JumpToDateSelector selectedDate={message.createdOn} on:jumpToDate={jumpToDate} />
        {/if}

        <div class="msg">
          <ActivityMessagePresenter
            value={message}
            skipLabel={skipLabels}
            {showEmbedded}
            hoverStyles="filledHover"
            isHighlighted={isSelected}
            shouldScroll={isSelected}
            withShowMore={false}
            showLinksPreview={false}
          />
        </div>
      {/each}

      {#if loadMoreAllowed && provider.canLoadMore('forward', messages[messages.length - 1]?.createdOn)}
        <HistoryLoading isLoading={$isLoadingMoreStore} />
      {/if}
    </Scroller>
  </div>
  {#if object}
    <div class="ref-input">
      <ActivityExtensionComponent kind="input" {extensions} props={{ object, boundary: scrollElement, collection }} />
    </div>
  {/if}
{/if}

<style lang="scss">
  .msg {
    margin: 0 1.5rem;
    min-height: 4.375rem;
    height: auto;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .grower {
    flex-grow: 10;
    flex-shrink: 5;
  }

  .ref-input {
    margin: 1.25rem 1rem;
  }

  .overlay {
    width: 100%;
    height: 100%;
    position: absolute;
    background: var(--theme-panel-color);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
