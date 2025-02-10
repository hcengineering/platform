<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import activity, { ActivityMessage } from '@hcengineering/activity'
  import { ActivityMessagePresenter, canGroupMessages, messageInFocus } from '@hcengineering/activity-resources'
  import core, { Doc, generateId, getCurrentAccount, Ref, Space, Timestamp, Tx, TxCUD } from '@hcengineering/core'
  import { DocNotifyContext } from '@hcengineering/notification'
  import { InboxNotificationsClientImpl } from '@hcengineering/notification-resources'
  import { addTxListener, getClient, removeTxListener } from '@hcengineering/presentation'
  import { ModernButton, Scroller } from '@hcengineering/ui'
  import { afterUpdate, onDestroy, onMount, tick } from 'svelte'

  import { ChannelDataProvider, MessageMetadata } from '../channelDataProvider'
  import chunter from '../plugin'
  import { getScrollToDateOffset, getSelectedDate, jumpToDate, readViewportMessages } from '../scroll'
  import { chatReadMessagesStore, recheckNotifications } from '../utils'
  import BaseChatScroller from './BaseChatScroller.svelte'
  import BlankView from './BlankView.svelte'
  import ChannelInput from './ChannelInput.svelte'
  import ActivityMessagesSeparator from './ChannelMessagesSeparator.svelte'
  import JumpToDateSelector from './JumpToDateSelector.svelte'
  import HistoryLoading from './LoadingHistory.svelte'

  export let provider: ChannelDataProvider
  export let object: Doc
  export let channel: Doc
  export let selectedMessageId: Ref<ActivityMessage> | undefined = undefined
  export let fixedInput = true
  export let collection: string = 'messages'
  export let fullHeight = true
  export let freeze = false
  export let loadMoreAllowed = true
  export let autofocus = true
  export let withInput: boolean = true
  export let readonly: boolean = false
  export let onReply: ((message: ActivityMessage) => void) | undefined = undefined

  const minMsgHeightRem = 2
  const loadMoreThreshold = 200
  const newSeparatorOffset = 150

  const me = getCurrentAccount()
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const inboxClient = InboxNotificationsClientImpl.getClient()
  const contextByDocStore = inboxClient.contextByDoc
  const notificationsByContextStore = inboxClient.inboxNotificationsByContext

  // Stores
  const metadataStore = provider.metadataStore
  const messagesStore = provider.messagesStore
  const isLoadingStore = provider.isLoadingStore
  const isTailLoadedStore = provider.isTailLoaded
  const newTimestampStore = provider.newTimestampStore
  const datesStore = provider.datesStore
  const canLoadNextForwardStore = provider.canLoadNextForwardStore
  const isLoadingMoreStore = provider.isLoadingMoreStore

  const doc = object
  const uuid = generateId()

  let messages: ActivityMessage[] = []
  let messagesCount = 0

  // Elements
  let scroller: Scroller | undefined | null = undefined
  let scrollDiv: HTMLDivElement | undefined | null = undefined
  let contentDiv: HTMLDivElement | undefined | null = undefined
  let separatorDiv: HTMLDivElement | undefined | null = undefined

  // Dates
  let selectedDate: Timestamp | undefined = undefined
  let dateToJump: Timestamp | undefined = undefined

  // Scrolling
  let isScrollInitialized = false
  let shouldScrollToNew = false
  let isScrollAtBottom = false

  let isLatestMessageButtonVisible = false

  // Pagination
  let backwardRequested = false
  let restoreScrollTop = 0
  let restoreScrollHeight = 0

  let isPageHidden = false
  let lastMsgBeforeFreeze: Ref<ActivityMessage> | undefined = undefined
  let needUpdateTimestamp = false

  $: messages = $messagesStore
  $: notifyContext = $contextByDocStore.get(doc._id)
  $: isThread = hierarchy.isDerived(doc._class, activity.class.ActivityMessage)
  $: isChunterSpace = hierarchy.isDerived(doc._class, chunter.class.ChunterSpace)
  $: readonly = hierarchy.isDerived(channel._class, core.class.Space)
    ? readonly || (channel as Space).archived
    : readonly

  $: separatorIndex =
    $newTimestampStore !== undefined
      ? messages.findIndex((message) => (message.createdOn ?? 0) >= ($newTimestampStore ?? 0))
      : -1

  $: if (!freeze && !isPageHidden && isScrollInitialized) {
    read()
  }

  const unsubscribe = inboxClient.inboxNotificationsByContext.subscribe(() => {
    if (notifyContext !== undefined && !isFreeze()) {
      recheckNotifications(notifyContext)
      read()
    }
  })

  $: void initializeScroll($isLoadingStore, separatorDiv, separatorIndex)
  $: adjustScrollPosition(selectedMessageId)
  $: void handleMessagesUpdated(messages.length)

  function adjustScrollPosition (selectedMessageId?: Ref<ActivityMessage>): void {
    if ($isLoadingStore || !isScrollInitialized) {
      return
    }
    const msgData = $metadataStore.find(({ _id }) => _id === selectedMessageId)
    if (msgData !== undefined) {
      const isReload = provider.jumpToMessage(msgData)
      if (isReload) {
        reinitializeScroll()
      } else {
        scrollToMessage()
      }
    } else if (selectedMessageId === undefined) {
      provider.jumpToEnd()
      reinitializeScroll()
    }
  }

  function handleWindowFocus (): void {
    checkWindowVisibility(false)
  }

  function handleWindowBlur (): void {
    checkWindowVisibility(true)
  }

  function handleVisibilityChange (): void {
    checkWindowVisibility(document.hidden)
  }

  function checkWindowVisibility (hidden: boolean): void {
    if (document.hidden || !document.hasFocus() || hidden) {
      if (isPageHidden) return
      isPageHidden = true
      needUpdateTimestamp = true
      lastMsgBeforeFreeze = shouldScrollToNew ? messages[messages.length - 1]?._id : undefined
    } else {
      if (isPageHidden) {
        isPageHidden = false
        needUpdateTimestamp = false
      }
    }
  }

  function isFreeze (): boolean {
    return freeze || isPageHidden
  }

  function scrollToBottom (): void {
    if (scroller != null && scrollDiv != null && !isFreeze()) {
      scrollDiv.scroll({ top: 0, behavior: 'instant' })
      updateSelectedDate()
    }
  }

  function scrollToSeparator (): void {
    if (separatorDiv == null || scrollDiv == null || contentDiv == null) {
      return
    }

    const messagesElements = contentDiv?.getElementsByClassName('activityMessage')
    const messagesHeight = messages
      .slice(separatorIndex)
      .reduce((res, msg) => res + (messagesElements?.[msg._id as any]?.clientHeight ?? 0), 0)

    separatorDiv.scrollIntoView()

    if (messagesHeight >= scrollDiv.clientHeight) {
      scroller?.scrollBy(-newSeparatorOffset)
    }

    updateShouldScrollToNew()
    read()
  }

  function scrollToMessage (): void {
    if (selectedMessageId === undefined) return
    if (scrollDiv == null || contentDiv == null) {
      setTimeout(scrollToMessage, 50)
      return
    }

    const messagesElements = contentDiv?.getElementsByClassName('activityMessage')
    const msgElement = messagesElements?.[selectedMessageId as any]

    if (msgElement == null) {
      if (messages.some(({ _id }) => _id === selectedMessageId)) {
        setTimeout(scrollToMessage, 50)
        return
      }
    } else {
      msgElement.scrollIntoView({ block: 'start' })
    }
    read()
  }

  function scrollToStartOfNew (): void {
    if (scrollDiv == null || lastMsgBeforeFreeze === undefined) return
    if (needUpdateTimestamp || $newTimestampStore === undefined) {
      void provider.updateNewTimestamp(notifyContext)
      needUpdateTimestamp = false
    }
    const lastIndex = messages.findIndex(({ _id }) => _id === lastMsgBeforeFreeze)
    if (lastIndex === -1) return
    const firstNewMessage = messages.find(({ createdBy }, index) => index > lastIndex && createdBy !== me._id)

    if (firstNewMessage === undefined) {
      scrollToBottom()
      return
    }

    const messagesElements = contentDiv?.getElementsByClassName('activityMessage')
    const msgElement = messagesElements?.[firstNewMessage._id as any]

    if (msgElement == null) return

    const messageRect = msgElement.getBoundingClientRect()
    const topOffset = messageRect.top - newSeparatorOffset

    if (topOffset < 0) {
      scroller?.scrollBy(topOffset)
    } else if (topOffset > 0) {
      scroller?.scrollBy(topOffset)
    }
  }

  function updateShouldScrollToNew (): void {
    if (scrollDiv != null && contentDiv != null) {
      const { scrollTop } = scrollDiv
      const offset = 100

      shouldScrollToNew = Math.abs(scrollTop) < offset
    }
  }

  async function wait (): Promise<void> {
    // One tick is not enough for messages to be rendered,
    // I think this is due to the fact that we are using a Component, which takes some time to load,
    // because after one tick I see spinners from Component
    await tick() // wait until the DOM is updated
    await tick() // wait until the DOM is updated
  }

  async function initializeScroll (
    isLoading: boolean,
    separatorElement?: HTMLDivElement | null,
    separatorIndex?: number
  ): Promise<void> {
    if (isLoading || isScrollInitialized) {
      return
    }

    const selectedMessageExists =
      selectedMessageId !== undefined && messages.some(({ _id }) => _id === selectedMessageId)
    if (selectedMessageExists) {
      await wait()
      scrollToMessage()
      isScrollInitialized = true
    } else if (separatorIndex === -1) {
      isScrollInitialized = true
      shouldScrollToNew = true
      isScrollAtBottom = true
    } else if (separatorElement != null) {
      await wait()
      scrollToSeparator()
      isScrollInitialized = true
    }

    if (isScrollInitialized) {
      await wait()
      updateSelectedDate()
      updateScrollData()
      updateDownButtonVisibility($metadataStore, messages, scrollDiv)
      loadMore()
    }
  }

  function reinitializeScroll (): void {
    isScrollInitialized = false
    void initializeScroll($isLoadingStore, separatorDiv, separatorIndex)
  }

  function handleJumpToDate (e: CustomEvent<{ date?: Timestamp }>): void {
    const result = jumpToDate(e, provider, uuid, scrollDiv)

    dateToJump = result.dateToJump

    if (result.scrollOffset !== undefined && result.scrollOffset !== 0 && scroller != null) {
      scroller?.scroll(result.scrollOffset)
    }
  }

  function scrollToDate (date: Timestamp): void {
    const offset = getScrollToDateOffset(date, uuid)

    if (offset !== undefined && offset !== 0 && scroller != null) {
      scroller?.scroll(offset)
      dateToJump = undefined
    }
  }

  function updateSelectedDate (): void {
    if (isThread) return
    selectedDate = getSelectedDate(provider, uuid, scrollDiv, contentDiv)
  }

  function read (): void {
    if (isFreeze() || notifyContext === undefined || !isScrollInitialized) return
    readViewportMessages(messages, notifyContext._id, scrollDiv, contentDiv)
  }

  function updateScrollData (): void {
    if (scrollDiv == null) return
    const { scrollTop } = scrollDiv

    isScrollAtBottom = Math.abs(scrollTop) < 50
  }

  function canGroupChatMessages (message: ActivityMessage, prevMessage?: ActivityMessage): boolean {
    let prevMetadata: MessageMetadata | undefined = undefined

    if (prevMessage === undefined) {
      const metadata = $metadataStore
      prevMetadata = metadata.find((_, index) => metadata[index + 1]?._id === message._id)
    }

    return canGroupMessages(message, prevMessage ?? prevMetadata)
  }

  $: updateDownButtonVisibility($metadataStore, messages, scrollDiv)

  function updateDownButtonVisibility (
    metadata: MessageMetadata[],
    messages: ActivityMessage[],
    scrollDiv?: HTMLDivElement | null
  ): void {
    if (metadata.length === 0 || messages.length === 0) {
      isLatestMessageButtonVisible = false
      return
    }

    if (!$isTailLoadedStore) {
      isLatestMessageButtonVisible = true
    } else if (scrollDiv != null) {
      const { scrollTop } = scrollDiv

      isLatestMessageButtonVisible = Math.abs(scrollTop) > 200
    } else {
      isLatestMessageButtonVisible = false
    }
  }

  async function handleScrollToLatestMessage (): Promise<void> {
    selectedMessageId = undefined
    messageInFocus.set(undefined)

    const metadata = $metadataStore
    const lastMetadata = metadata[metadata.length - 1]
    const lastMessage = messages[messages.length - 1]

    if (lastMetadata._id !== lastMessage._id) {
      separatorIndex = -1
      provider.jumpToEnd(true)
      reinitializeScroll()
    } else {
      scrollToBottom()
    }

    await inboxClient.readDoc(doc._id)
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
      await inboxClient.readDoc(object._id)
    }
  }

  function shouldLoadMoreUp (): boolean {
    if (scrollDiv == null) return false
    const { scrollHeight, scrollTop, clientHeight } = scrollDiv

    return scrollHeight + Math.ceil(scrollTop - clientHeight) <= loadMoreThreshold
  }

  function shouldLoadMoreDown (): boolean {
    if (scrollDiv == null) return false

    return Math.abs(scrollDiv.scrollTop) <= loadMoreThreshold
  }

  function loadMore (): void {
    if (!loadMoreAllowed || $isLoadingMoreStore || scrollDiv == null || !isScrollInitialized) {
      return
    }

    const minMsgHeightPx = minMsgHeightRem * parseFloat(getComputedStyle(document.documentElement).fontSize)
    const maxMsgPerScreen = Math.ceil(scrollDiv.clientHeight / minMsgHeightPx)
    const limit = Math.max(maxMsgPerScreen, provider.limit)
    const isLoadMoreUp = shouldLoadMoreUp()
    const isLoadMoreDown = shouldLoadMoreDown()

    if (!isLoadMoreUp && backwardRequested) {
      backwardRequested = false
    }

    if (isLoadMoreUp && !backwardRequested) {
      shouldScrollToNew = false
      restoreScrollTop = scrollDiv?.scrollTop ?? 0
      restoreScrollHeight = 0
      void provider.addNextChunk('backward', messages[0]?.createdOn, limit)
      backwardRequested = true
    } else if (isLoadMoreUp && backwardRequested) {
      restoreScrollTop = scrollDiv?.scrollTop ?? 0
    } else if (isLoadMoreDown && !$isTailLoadedStore) {
      restoreScrollTop = 0
      restoreScrollHeight = scrollDiv?.scrollHeight ?? 0
      shouldScrollToNew = false
      isScrollAtBottom = false
      void provider.addNextChunk('forward', messages[messages.length - 1]?.createdOn, limit)
    }
  }

  async function restoreScroll (): Promise<void> {
    await wait()

    if (scrollDiv == null || scroller == null) return

    if (restoreScrollTop !== 0) {
      scroller.scroll(restoreScrollTop)
    } else if (restoreScrollHeight !== 0) {
      const delta = restoreScrollHeight - scrollDiv.scrollHeight
      scroller.scroll(delta)
    }
    backwardRequested = false
    restoreScrollHeight = 0
    restoreScrollTop = 0
    dateToJump = 0
  }

  function scrollToNewMessages (): void {
    if (scrollDiv == null || !shouldScrollToNew) {
      read()
      return
    }

    scrollToBottom()
    read()
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

    if (restoreScrollTop !== 0 || restoreScrollHeight !== 0) {
      void restoreScroll()
    } else if (dateToJump !== undefined) {
      await wait()
      scrollToDate(dateToJump)
    } else if (shouldScrollToNew && prevCount > 0 && newCount > prevCount) {
      await wait()
      scrollToNewMessages()
    } else {
      await wait()
      read()
    }
  }

  async function handleScroll (): Promise<void> {
    updateScrollData()
    updateDownButtonVisibility($metadataStore, messages, scrollDiv)
    updateShouldScrollToNew()
    loadMore()
    updateSelectedDate()
    read()
  }

  function handleResize (): void {
    if (!isScrollInitialized) return
    if (shouldScrollToNew) {
      scrollToBottom()
    }

    loadMore()
  }

  const newMessageTxListener = (txes: Tx[]): void => {
    const ctx = txes
      .map((it) => it as TxCUD<ActivityMessage>)
      .filter((it) => it.attachedTo === doc._id && it._class === core.class.TxCreateDoc)

    if (ctx.length > 0 && shouldScrollToNew) {
      void wait().then(scrollToNewMessages)
    }
  }

  afterUpdate(() => {
    if (isFreeze()) {
      updateScrollData()
    }
  })

  onMount(() => {
    chatReadMessagesStore.update(() => new Set())
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('blur', handleWindowBlur)
    addTxListener(newMessageTxListener)
  })

  onDestroy(() => {
    unsubscribe()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('focus', handleWindowFocus)
    window.removeEventListener('blur', handleWindowBlur)
    removeTxListener(newMessageTxListener)
  })

  $: showBlankView = !$isLoadingStore && messages.length === 0 && !isThread
</script>

<div class="flex-col relative" class:h-full={fullHeight}>
  {#if !isThread && messages.length > 0 && selectedDate}
    <div class="selectedDate">
      <JumpToDateSelector {selectedDate} fixed on:jumpToDate={handleJumpToDate} idPrefix={`${uuid}-`} />
    </div>
  {/if}
  <BaseChatScroller
    bind:scroller
    bind:scrollDiv
    bind:contentDiv
    bottomStart={!showBlankView}
    loadingOverlay={$isLoadingStore || !isScrollInitialized}
    onScroll={handleScroll}
    onResize={handleResize}
  >
    {#if showBlankView}
      <BlankView
        icon={chunter.icon.Thread}
        header={chunter.string.NoMessagesInChannel}
        label={readonly ? undefined : chunter.string.SendMessagesInChannel}
      />
    {/if}

    {#if loadMoreAllowed && !isThread}
      <HistoryLoading isLoading={$isLoadingMoreStore} />
    {/if}

    <slot name="header" />

    {#each messages as message, index (message._id)}
      {@const isSelected = message._id === selectedMessageId}
      {@const canGroup = canGroupChatMessages(message, messages[index - 1])}
      {#if separatorIndex === index}
        <ActivityMessagesSeparator bind:element={separatorDiv} label={activity.string.New} />
      {/if}

      {#if !isThread && message.createdOn && $datesStore.includes(message.createdOn)}
        <JumpToDateSelector
          idPrefix={`${uuid}-`}
          visible={selectedDate !== message.createdOn}
          selectedDate={message.createdOn}
          on:jumpToDate={handleJumpToDate}
        />
      {/if}

      <ActivityMessagePresenter
        {doc}
        value={message}
        skipLabel={isThread || isChunterSpace}
        hoverStyles="filledHover"
        attachmentImageSize="x-large"
        type={canGroup ? 'short' : 'default'}
        isHighlighted={isSelected}
        shouldScroll={false}
        {readonly}
        {onReply}
      />
    {/each}

    {#if messages.length > 0}
      <div class="h-4" />
    {/if}

    {#if loadMoreAllowed && $canLoadNextForwardStore}
      <HistoryLoading isLoading={$isLoadingMoreStore} />
    {/if}
    {#if !fixedInput && withInput && !readonly}
      <ChannelInput {object} {readonly} boundary={scrollDiv} {collection} {isThread} {autofocus} />
    {/if}
  </BaseChatScroller>
  {#if !isThread && isLatestMessageButtonVisible}
    <div class="down-button absolute">
      <ModernButton
        label={chunter.string.LatestMessages}
        shape="round"
        size="small"
        kind="primary"
        on:click={handleScrollToLatestMessage}
      />
    </div>
  {/if}
</div>

{#if fixedInput && withInput && !readonly}
  <ChannelInput {object} {readonly} boundary={scrollDiv} {collection} {isThread} {autofocus} />
{/if}

{#if readonly}
  <div class="h-6" />
{/if}

<style lang="scss">
  .selectedDate {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    background: transparent;
  }

  .down-button {
    width: 100%;
    display: flex;
    justify-content: center;
    bottom: 0.5rem;
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
