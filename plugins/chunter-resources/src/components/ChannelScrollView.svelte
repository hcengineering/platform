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
  import activity, {
    ActivityExtension,
    ActivityMessage,
    ActivityMessagesFilter,
    DisplayActivityMessage
  } from '@hcengineering/activity'
  import {
    ActivityExtension as ActivityExtensionComponent,
    ActivityMessagePresenter,
    canGroupMessages,
    messageInFocus,
    sortActivityMessages
  } from '@hcengineering/activity-resources'
  import { Doc, getCurrentAccount, getDay, Ref, Timestamp } from '@hcengineering/core'
  import { DocNotifyContext } from '@hcengineering/notification'
  import { InboxNotificationsClientImpl } from '@hcengineering/notification-resources'
  import { getResource } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Loading, ModernButton, Scroller, ScrollParams } from '@hcengineering/ui'
  import { afterUpdate, beforeUpdate, onDestroy, onMount, tick } from 'svelte'
  import { get } from 'svelte/store'

  import { ChannelDataProvider, MessageMetadata } from '../channelDataProvider'
  import chunter from '../plugin'
  import {
    chatReadMessagesStore,
    filterChatMessages,
    getClosestDate,
    readChannelMessages,
    recheckNotifications
  } from '../utils'
  import BlankView from './BlankView.svelte'
  import ActivityMessagesSeparator from './ChannelMessagesSeparator.svelte'
  import JumpToDateSelector from './JumpToDateSelector.svelte'
  import HistoryLoading from './LoadingHistory.svelte'

  export let provider: ChannelDataProvider
  export let object: Doc
  export let selectedMessageId: Ref<ActivityMessage> | undefined = undefined
  export let scrollElement: HTMLDivElement | undefined | null = undefined
  export let startFromBottom = false
  export let selectedFilters: Ref<ActivityMessagesFilter>[] = []
  export let embedded = false
  export let collection: string | undefined = undefined
  export let showEmbedded = false
  export let skipLabels = false
  export let loadMoreAllowed = true
  export let isAsideOpened = false
  export let fullHeight = true
  export let fixedInput = true
  export let freeze = false

  const doc = object

  const dateSelectorHeight = 30
  const headerHeight = 52
  const minMsgHeightRem = 2
  const loadMoreThreshold = 40

  const me = getCurrentAccount()
  const client = getClient()
  const inboxClient = InboxNotificationsClientImpl.getClient()
  const contextByDocStore = inboxClient.contextByDoc
  const notificationsByContextStore = inboxClient.inboxNotificationsByContext

  let filters: ActivityMessagesFilter[] = []
  const filterResources = new Map<
  Ref<ActivityMessagesFilter>,
  (message: ActivityMessage, _class?: Ref<Doc>) => boolean
  >()

  const messagesStore = provider.messagesStore
  const isLoadingStore = provider.isLoadingStore
  const isLoadingMoreStore = provider.isLoadingMoreStore
  const isTailLoadedStore = provider.isTailLoaded
  const newTimestampStore = provider.newTimestampStore
  const datesStore = provider.datesStore
  const metadataStore = provider.metadataStore

  let messages: ActivityMessage[] = []
  let displayMessages: DisplayActivityMessage[] = []
  let extensions: ActivityExtension[] = []

  let scroller: Scroller | undefined | null = undefined
  let separatorElement: HTMLDivElement | undefined = undefined
  let scrollContentBox: HTMLDivElement | undefined = undefined

  let autoscroll = false
  let shouldScrollToNew = false
  let shouldWaitAndRead = false
  let isScrollInitialized = false

  let selectedDate: Timestamp | undefined = undefined
  let dateToJump: Timestamp | undefined = undefined

  let prevScrollHeight = 0
  let isScrollAtBottom = false

  let messagesCount = 0

  let wasAsideOpened = isAsideOpened

  $: messages = $messagesStore
  $: isLoading = $isLoadingStore

  $: extensions = client.getModel().findAllSync(activity.class.ActivityExtension, { ofClass: doc._class })

  $: notifyContext = $contextByDocStore.get(doc._id)

  void client
    .getModel()
    .findAll(activity.class.ActivityMessagesFilter, {})
    .then(async (res) => {
      filters = res
      for (const filter of filters) {
        filterResources.set(filter._id, await getResource(filter.filter))
      }
    })

  let isPageHidden = false
  let lastMsgBeforeFreeze: Ref<ActivityMessage> | undefined = undefined

  function handleVisibilityChange (): void {
    if (document.hidden) {
      isPageHidden = true
      lastMsgBeforeFreeze = shouldScrollToNew ? displayMessages[displayMessages.length - 1]?._id : undefined
    } else {
      if (isPageHidden) {
        isPageHidden = false
        void provider.updateNewTimestamp(notifyContext)
      }
    }
  }

  function isFreeze (): boolean {
    return freeze || isPageHidden
  }

  $: displayMessages = filterChatMessages(messages, filters, filterResources, doc._class, selectedFilters)

  const unsubscribe = inboxClient.inboxNotificationsByContext.subscribe(() => {
    if (notifyContext !== undefined && !isFreeze()) {
      recheckNotifications(notifyContext)
      readViewportMessages()
    }
  })

  function scrollToBottom (afterScrollFn?: () => void): void {
    if (scroller != null && scrollElement != null && !isFreeze()) {
      scroller.scrollBy(scrollElement.scrollHeight)
      updateSelectedDate()
      afterScrollFn?.()
    }
  }

  function scrollToSeparator (): void {
    if (separatorElement && scrollElement) {
      const messagesElements = scrollContentBox?.getElementsByClassName('activityMessage')
      const messagesHeight = displayMessages
        .slice(separatorIndex)
        .reduce((res, msg) => res + (messagesElements?.[msg._id as any]?.clientHeight ?? 0), 0)

      separatorElement.scrollIntoView()

      if (messagesHeight >= scrollElement.clientHeight) {
        scroller?.scrollBy(-50)
      }

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

  function isDateRendered (date: Timestamp): boolean {
    const day = getDay(date)

    return document.getElementById(day.toString()) != null
  }

  function jumpToDate (e: CustomEvent): void {
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

  function scrollToDate (date: Timestamp): void {
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

  function updateShouldScrollToNew (): void {
    if (scrollElement) {
      const { offsetHeight, scrollHeight, scrollTop } = scrollElement
      const offset = 100

      shouldScrollToNew = scrollHeight <= scrollTop + offsetHeight + offset
    }
  }

  function shouldLoadMoreUp (): boolean {
    if (!scrollElement) {
      return false
    }

    return scrollElement.scrollTop <= loadMoreThreshold
  }

  function shouldLoadMoreDown (): boolean {
    if (!scrollElement) {
      return false
    }

    const { scrollHeight, scrollTop, clientHeight } = scrollElement

    return scrollHeight - Math.ceil(scrollTop + clientHeight) <= loadMoreThreshold
  }

  let scrollToRestore = 0
  let backwardRequested = false

  function loadMore (): void {
    if (!loadMoreAllowed || $isLoadingMoreStore || !scrollElement || isInitialScrolling) {
      return
    }

    const minMsgHeightPx = minMsgHeightRem * parseFloat(getComputedStyle(document.documentElement).fontSize)
    const maxMsgPerScreen = Math.ceil(scrollElement.clientHeight / minMsgHeightPx)
    const limit = Math.max(maxMsgPerScreen, provider.limit)

    if (!shouldLoadMoreUp()) {
      backwardRequested = false
    }

    if (shouldLoadMoreUp() && !backwardRequested) {
      shouldScrollToNew = false
      scrollToRestore = scrollElement?.scrollHeight ?? 0
      provider.addNextChunk('backward', messages[0]?.createdOn, limit)
      backwardRequested = true
    } else if (shouldLoadMoreDown() && !$isTailLoadedStore) {
      scrollToRestore = 0
      shouldScrollToNew = false
      isScrollAtBottom = false
      provider.addNextChunk('forward', messages[messages.length - 1]?.createdOn, limit)
    }
  }

  function scrollToStartOfNew (): void {
    if (!scrollElement || !lastMsgBeforeFreeze) {
      return
    }

    const lastIndex = displayMessages.findIndex(({ _id }) => _id === lastMsgBeforeFreeze)
    if (lastIndex === -1) return
    const firstNewMessage = displayMessages.find(({ createdBy }, index) => index > lastIndex && createdBy !== me._id)

    if (firstNewMessage === undefined) {
      scrollToBottom()
      return
    }

    const messagesElements = scrollContentBox?.getElementsByClassName('activityMessage')
    const msgElement = messagesElements?.[firstNewMessage._id as any]

    if (!msgElement) {
      return
    }

    const messageRect = msgElement.getBoundingClientRect()

    const topOffset = messageRect.top - 150

    if (topOffset < 0) {
      scroller?.scrollBy(topOffset)
    } else if (topOffset > 0) {
      scroller?.scrollBy(topOffset)
    }
  }

  async function handleScroll ({ autoScrolling }: ScrollParams): Promise<void> {
    saveScrollPosition()
    updateDownButtonVisibility($metadataStore, displayMessages, scrollElement)
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

  const messagesToReadAccumulator: Set<DisplayActivityMessage> = new Set<DisplayActivityMessage>()
  let messagesToReadAccumulatorTimer: any

  function readViewportMessages (): void {
    if (!scrollElement || !scrollContentBox || isFreeze()) {
      return
    }

    const containerRect = scrollElement.getBoundingClientRect()

    const messagesElements = scrollContentBox?.getElementsByClassName('activityMessage')

    for (const message of displayMessages) {
      const msgElement = messagesElements?.[message._id as any]

      if (!msgElement) {
        continue
      }

      if (messageInView(msgElement, containerRect)) {
        messagesToReadAccumulator.add(message)
      }
    }

    clearTimeout(messagesToReadAccumulatorTimer)
    messagesToReadAccumulatorTimer = setTimeout(() => {
      const messagesToRead = [...messagesToReadAccumulator]
      messagesToReadAccumulator.clear()
      void readChannelMessages(sortActivityMessages(messagesToRead), notifyContext)
    }, 500)
  }

  function updateSelectedDate (): void {
    if (embedded) {
      return
    }

    if (!scrollContentBox || !scrollElement) {
      return
    }

    const containerRect = scrollElement.getBoundingClientRect()

    const messagesElements = scrollContentBox?.getElementsByClassName('activityMessage')

    if (messagesElements === undefined) {
      return
    }

    const reversedDates = [...get(datesStore)].reverse()

    for (const message of displayMessages) {
      const msgElement = messagesElements?.[message._id as any]

      if (!msgElement) {
        continue
      }

      const createdOn = message.createdOn

      if (createdOn === undefined) {
        continue
      }

      const messageRect = msgElement.getBoundingClientRect()

      const isInView =
        messageRect.top > 0 &&
        messageRect.top < containerRect.bottom &&
        messageRect.bottom - headerHeight - 2 * dateSelectorHeight > 0 &&
        messageRect.bottom <= containerRect.bottom

      if (isInView) {
        selectedDate = reversedDates.find((date) => date <= createdOn)

        break
      }
    }

    if (selectedDate) {
      const day = getDay(selectedDate)
      const dateElement = document.getElementById(day.toString())

      let isElementVisible = false

      if (dateElement) {
        const elementRect = dateElement.getBoundingClientRect()
        isElementVisible =
          elementRect.top + dateSelectorHeight / 2 >= containerRect.top && elementRect.bottom <= containerRect.bottom
      }

      if (isElementVisible) {
        selectedDate = undefined
      }
    }
  }

  $: newTimestamp = $newTimestampStore
  $: separatorIndex =
    newTimestamp !== undefined
      ? displayMessages.findIndex((message) => (message.createdOn ?? 0) >= (newTimestamp ?? 0))
      : -1
  $: void initializeScroll(isLoading, separatorElement, separatorIndex)

  let isInitialScrolling = true
  async function initializeScroll (isLoading: boolean, separatorElement?: HTMLDivElement, separatorIndex?: number) {
    if (isLoading || isScrollInitialized) {
      return
    }

    updateSelectedDate()

    if (selectedMessageId !== undefined && messages.some(({ _id }) => _id === selectedMessageId)) {
      isScrollInitialized = true
      await wait()
      scrollToMessage()
      isInitialScrolling = false
    } else if (separatorIndex === -1) {
      await wait()
      isScrollInitialized = true
      shouldWaitAndRead = true
      autoscroll = true
      shouldScrollToNew = true
      isInitialScrolling = false
      waitLastMessageRenderAndRead(() => {
        autoscroll = false
      })
    } else if (separatorElement) {
      await wait()
      scrollToSeparator()
      isScrollInitialized = true
      isInitialScrolling = false
    }

    updateDownButtonVisibility($metadataStore, displayMessages, scrollElement)
  }

  function reinitializeScroll (): void {
    isScrollInitialized = false
    void initializeScroll(isLoading, separatorElement, separatorIndex)
  }

  function adjustScrollPosition (selectedMessageId: Ref<ActivityMessage> | undefined): void {
    if (isLoading || !isScrollInitialized || isInitialScrolling) {
      return
    }
    const msg = $metadataStore.find(({ _id }) => _id === selectedMessageId)
    if (msg !== undefined) {
      const isReload = provider.jumpToMessage(msg)
      if (isReload) {
        reinitializeScroll()
      }
    } else if (selectedMessageId === undefined) {
      provider.jumpToEnd()
      reinitializeScroll()
    }
  }

  $: adjustScrollPosition(selectedMessageId)

  function waitLastMessageRenderAndRead (onComplete?: () => void) {
    if (isLastMessageViewed()) {
      readViewportMessages()
      shouldScrollToNew = true
      shouldWaitAndRead = false
      onComplete?.()
    } else if (shouldWaitAndRead && messages.length > 0) {
      shouldWaitAndRead = false
      setTimeout(() => {
        waitLastMessageRenderAndRead(onComplete)
      }, 500)
    } else {
      onComplete?.()
    }
  }

  function scrollToNewMessages (): void {
    if (!scrollElement || !shouldScrollToNew) {
      readViewportMessages()
      return
    }

    scrollToBottom()
    readViewportMessages()
  }

  async function wait (): Promise<void> {
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

  async function handleMessagesUpdated (newCount: number): Promise<void> {
    if (newCount === messagesCount) {
      return
    }

    const prevCount = messagesCount
    messagesCount = newCount

    if (isFreeze()) {
      await wait()
      scrollToStartOfNew()
      return
    }

    if (scrollToRestore > 0) {
      void restoreScroll()
    } else if (dateToJump !== undefined) {
      await wait()
      scrollToDate(dateToJump)
    } else if (shouldScrollToNew && prevCount > 0 && newCount > prevCount) {
      await wait()
      scrollToNewMessages()
    } else {
      await wait()
      readViewportMessages()
    }
  }

  $: void handleMessagesUpdated(displayMessages.length)
  function handleResize (): void {
    if (isInitialScrolling || !isScrollInitialized) {
      return
    }

    if (shouldScrollToNew) {
      scrollToBottom()
    }

    loadMore()
  }

  function saveScrollPosition (): void {
    if (!scrollElement) {
      return
    }

    const { offsetHeight, scrollHeight, scrollTop } = scrollElement

    prevScrollHeight = scrollHeight
    isScrollAtBottom = scrollHeight <= Math.ceil(scrollTop + offsetHeight)
  }

  beforeUpdate(() => {
    if (!scrollElement) return

    if (isScrollInitialized && scrollElement.scrollHeight === scrollElement.clientHeight) {
      isScrollAtBottom = true
    }
  })

  afterUpdate(() => {
    if (!scrollElement) return
    const { offsetHeight, scrollHeight, scrollTop } = scrollElement

    if (!isInitialScrolling && !isFreeze() && prevScrollHeight < scrollHeight && isScrollAtBottom) {
      scrollToBottom()
    } else if (isFreeze()) {
      isScrollAtBottom = scrollHeight <= Math.ceil(scrollTop + offsetHeight)
    }
  })

  async function compensateAside (isOpened: boolean): Promise<void> {
    if (!isInitialScrolling && isScrollAtBottom && !wasAsideOpened && isOpened) {
      await wait()
      scrollToBottom()
    }

    wasAsideOpened = isOpened
  }

  $: void compensateAside(isAsideOpened)

  function canGroupChatMessages (message: ActivityMessage, prevMessage?: ActivityMessage): boolean {
    let prevMetadata: MessageMetadata | undefined = undefined

    if (prevMessage === undefined) {
      const metadata = $metadataStore
      prevMetadata = metadata.find((_, index) => metadata[index + 1]?._id === message._id)
    }

    return canGroupMessages(message, prevMessage ?? prevMetadata)
  }

  onMount(() => {
    chatReadMessagesStore.update(() => new Set())
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onDestroy(() => {
    unsubscribe()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  let showScrollDownButton = false

  $: updateDownButtonVisibility($metadataStore, displayMessages, scrollElement)

  function updateDownButtonVisibility (
    metadata: MessageMetadata[],
    displayMessages: DisplayActivityMessage[],
    element?: HTMLDivElement | null
  ): void {
    if (metadata.length === 0 || displayMessages.length === 0) {
      showScrollDownButton = false
      return
    }

    if (!$isTailLoadedStore) {
      showScrollDownButton = true
    } else if (element != null) {
      const { scrollHeight, scrollTop, offsetHeight } = element

      showScrollDownButton = scrollHeight > offsetHeight + scrollTop + 50
    } else {
      showScrollDownButton = false
    }
  }

  async function handleScrollDown (): Promise<void> {
    selectedMessageId = undefined
    messageInFocus.set(undefined)

    const metadata = $metadataStore
    const lastMetadata = metadata[metadata.length - 1]
    const lastMessage = displayMessages[displayMessages.length - 1]

    if (lastMetadata._id !== lastMessage._id) {
      separatorIndex = -1
      provider.jumpToEnd(true)
      reinitializeScroll()
    } else {
      scrollToBottom()
    }

    const op = client.apply(undefined, 'chunter.scrollDown')
    await inboxClient.readDoc(op, doc._id)
    await op.commit()
  }

  let forceRead = false
  $: void forceReadContext(isScrollAtBottom, notifyContext)

  async function forceReadContext (isScrollAtBottom: boolean, context?: DocNotifyContext): Promise<void> {
    if (context === undefined || !isScrollAtBottom || forceRead || isFreeze()) return
    const { lastUpdateTimestamp = 0, lastViewedTimestamp = 0 } = context

    if (lastViewedTimestamp >= lastUpdateTimestamp) return

    const notifications = $notificationsByContextStore.get(context._id) ?? []
    const unViewed = notifications.filter(({ isViewed }) => !isViewed)

    if (unViewed.length === 0) {
      forceRead = true
      const op = client.apply(undefined, 'chunter.forceReadContext')
      await inboxClient.readDoc(op, object._id)
      await op.commit()
    }
  }

  const canLoadNextForwardStore = provider.canLoadNextForwardStore

  $: if (!freeze && !isPageHidden && isScrollInitialized) {
    readViewportMessages()
  }
</script>

{#if isLoading}
  <Loading />
{:else}
  <div class="flex-col relative" class:h-full={fullHeight}>
    {#if startFromBottom}
      <div class="grower" />
    {/if}
    {#if !embedded && displayMessages.length > 0 && selectedDate}
      <div class="selectedDate">
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
      disableOverscroll
      onScroll={handleScroll}
      onResize={handleResize}
    >
      {#if loadMoreAllowed && !embedded}
        <HistoryLoading isLoading={$isLoadingMoreStore} />
      {/if}
      <slot name="header" />

      {#if displayMessages.length === 0 && !embedded}
        <BlankView
          icon={chunter.icon.Thread}
          header={chunter.string.NoMessagesInChannel}
          label={chunter.string.SendMessagesInChannel}
        />
      {/if}
      {#each displayMessages as message, index (message._id)}
        {@const isSelected = message._id === selectedMessageId}
        {@const canGroup = canGroupChatMessages(message, displayMessages[index - 1])}

        {#if separatorIndex === index}
          <ActivityMessagesSeparator bind:element={separatorElement} label={activity.string.New} />
        {/if}

        {#if !embedded && message.createdOn && $datesStore.includes(message.createdOn)}
          <JumpToDateSelector selectedDate={message.createdOn} on:jumpToDate={jumpToDate} />
        {/if}

        <ActivityMessagePresenter
          {doc}
          value={message}
          skipLabel={skipLabels}
          {showEmbedded}
          hoverStyles="filledHover"
          isHighlighted={isSelected}
          shouldScroll={isSelected}
          withShowMore={false}
          attachmentImageSize="x-large"
          type={canGroup ? 'short' : 'default'}
          hideLink
        />
      {/each}

      {#if !fixedInput}
        <div class="ref-input flex-col">
          <ActivityExtensionComponent
            kind="input"
            {extensions}
            props={{ object, boundary: scrollElement, collection, autofocus: true, withTypingInfo: true }}
          />
        </div>
      {/if}

      {#if loadMoreAllowed && $canLoadNextForwardStore}
        <HistoryLoading isLoading={$isLoadingMoreStore} />
      {/if}
    </Scroller>

    {#if !embedded && showScrollDownButton}
      <div class="down-button absolute">
        <ModernButton
          label={chunter.string.LatestMessages}
          shape="round"
          size="small"
          kind="primary"
          on:click={handleScrollDown}
        />
      </div>
    {/if}
  </div>
  {#if fixedInput && object}
    <div class="ref-input flex-col">
      <ActivityExtensionComponent
        kind="input"
        {extensions}
        props={{ object, boundary: scrollElement, collection, autofocus: true, withTypingInfo: true }}
      />
    </div>
  {/if}
{/if}

<style lang="scss">
  .grower {
    flex-grow: 10;
    flex-shrink: 5;
  }

  .ref-input {
    flex-shrink: 0;
    margin: 1.25rem 1rem 1rem;
    margin-bottom: 0;
    max-height: 18.75rem;
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

  .selectedDate {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
  }

  .down-button {
    width: 100%;
    display: flex;
    justify-content: center;
    bottom: -0.75rem;
    animation: 0.5s fadeIn;
    animation-fill-mode: forwards;
    visibility: hidden;
  }

  @keyframes fadeIn {
    99% {
      visibility: hidden;
    }
    100% {
      visibility: visible;
    }
  }
</style>
