<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import { Card } from '@hcengineering/card'
  import {
    type Message,
    Notification,
    NotificationContext,
    NotificationType,
    Window
  } from '@hcengineering/communication-types'
  import {
    createMessagesQuery,
    createNotificationsQuery,
    getCommunicationClient,
    type MessageQueryParams
  } from '@hcengineering/presentation'
  import { getCurrentAccount, SortingOrder } from '@hcengineering/core'
  import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte'
  import { MessagesNavigationAnchors } from '@hcengineering/communication'
  import { isAppFocusedStore, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'

  import { createMessagesObserver, getGroupDay, groupMessagesByDay, MessagesGroup } from '../messages'
  import MessagesGroupPresenter from './message/MessagesGroupPresenter.svelte'
  import MessagesLoading from './message/MessagesLoading.svelte'

  export let card: Card
  export let context: NotificationContext | undefined = undefined
  export let readonly = false
  export let isLoadingBefore: boolean = false
  export let shouldScrollToStart: boolean = false
  export let position: MessagesNavigationAnchors = MessagesNavigationAnchors.ConversationStart
  export let scrollDiv: HTMLDivElement
  export let contentDiv: HTMLDivElement

  const dispatch = createEventDispatcher()
  const me = getCurrentAccount()
  const communicationClient = getCommunicationClient()
  const query = createMessagesQuery()
  const notificationsQuery = createNotificationsQuery()

  const scrollToNewThreshold = 50

  let initialLastView = context?.lastView
  let initialLastUpdate = context?.lastUpdate

  let shouldScrollToEnd = false

  let separatorDiv: HTMLDivElement | null | undefined = undefined

  let messages: Message[] = []
  let reactionNotifications: Notification[] = []
  let notifications: Notification[] = []
  let groups: MessagesGroup[] = []
  let window: Window<Message> | undefined = undefined
  let isLoading = true
  let messagesCount = 0

  let isScrollInitialized = false
  let isPageLoading = false
  let shouldScrollToNew = false
  let atBottom = false
  let restore: { scrollHeight: number } | undefined = undefined
  let prevPosition: MessagesNavigationAnchors = position

  let bottomOffset: number = 0
  let topOffset: number = 0

  const limit = $deviceInfo.isMobile ? 25 : 50
  let queryDef = getBaseQuery()

  export function scrollDown (): void {
    shouldScrollToEnd = true
    position = MessagesNavigationAnchors.LatestMessages

    reinit(position, true)
  }

  export function canScrollDown (): boolean {
    return window !== undefined && window.hasNextPage()
  }
  $: if (
    (context?.lastView?.getTime() ?? 0) >= (context?.lastUpdate?.getTime() ?? 0) &&
    (notifications?.length ?? 0) > 0 &&
    atBottom &&
    $isAppFocusedStore
  ) {
    readNotifications(new Date())
  }

  $: reinit(position)

  $: query.query(queryDef, (res: Window<Message>) => {
    window = res
    messages = (queryDef.order === SortingOrder.Ascending ? res.getResult() : res.getResult().reverse()).filter(
      (it) => !it.removed || it.thread != null
    )

    if (messages.length < limit && res.hasNextPage()) {
      void window.loadNextPage()
    } else if (messages.length < limit && res.hasPrevPage()) {
      void window.loadPrevPage()
    }

    groups = groupMessagesByDay(messages)
    isLoading = messages.length < limit && (res.hasNextPage() || res.hasPrevPage())
    void onUpdate(messages)
  })

  $: if (context !== undefined) {
    void notificationsQuery.query(
      {
        context: context.id,
        read: false
      },
      (res) => {
        const result = res.getResult()
        reactionNotifications = result.filter((notification) => notification.type === NotificationType.Reaction)
        notifications = result.filter((notification) => notification.type !== NotificationType.Reaction)
        if (reactionNotifications.length > 0) {
          readViewport($isAppFocusedStore)
        }
      }
    )
  } else {
    notificationsQuery.unsubscribe()
  }

  let ro: ResizeObserver | undefined = undefined
  let prev: number = -1

  function lastGroupObserver (node: HTMLDivElement): { destroy: () => void } {
    ro =
      ro ??
      new ResizeObserver(() => {
        if (!isScrollInitialized) return
        const diff = node.clientHeight - prev
        prev = node.clientHeight
        if (diff < 0 || position !== MessagesNavigationAnchors.LatestMessages) return

        if (atBottom || bottomOffset - diff < 30) {
          dispatch('action', { id: 'hideScrollBar' })
          if (!$isAppFocusedStore) {
            scrollToStartOfNew()
          } else {
            scrollToBottom(true)
          }
        }
      })
    ro.observe(node)

    return {
      destroy () {
        ro?.unobserve(node)
      }
    }
  }

  function reinit (position: MessagesNavigationAnchors, force = false): void {
    if (prevPosition === position && !force) {
      return
    }
    prevPosition = position
    if (position === MessagesNavigationAnchors.ConversationStart && window && !window.hasPrevPage()) {
      if (shouldScrollToStart) {
        contentDiv?.scrollIntoView({ behavior: 'instant', block: 'start' })
      }
    } else if (position === MessagesNavigationAnchors.LatestMessages && window && !window.hasNextPage()) {
      scrollToBottom(true)
    } else {
      queryDef = getBaseQuery()
      window = undefined
      isPageLoading = false
      restore = undefined
      messages = []
      groups = []
      isLoading = true
      isScrollInitialized = false
    }
  }

  function getBaseQuery (): MessageQueryParams {
    if (position === MessagesNavigationAnchors.ConversationStart) {
      return {
        card: card._id,
        replies: true,
        attachments: true,
        reactions: true,
        order: SortingOrder.Ascending,
        limit
      }
    }
    initialLastView = context?.lastView
    initialLastUpdate = context?.lastUpdate
    const unread = initialLastView != null && initialLastUpdate != null && initialLastUpdate > initialLastView
    const order = unread && !shouldScrollToEnd ? SortingOrder.Ascending : SortingOrder.Descending
    return {
      card: card._id,
      replies: true,
      attachments: true,
      reactions: true,
      order,
      limit,
      from: unread && !shouldScrollToEnd && initialLastView != null ? initialLastView : undefined
    }
  }

  function getBottomOffset (): number {
    return Math.max(0, Math.floor(scrollDiv.scrollHeight - scrollDiv.scrollTop - scrollDiv.clientHeight))
  }

  function getTopOffset (): number {
    return Math.floor(scrollDiv.scrollTop - contentDiv.offsetTop)
  }

  function updateShouldScrollToNew (): void {
    if (window === undefined || window.hasNextPage()) {
      shouldScrollToNew = false
      atBottom = false
      return
    }

    shouldScrollToNew = bottomOffset <= scrollToNewThreshold
    atBottom = bottomOffset < 10
  }

  function shouldLoadPrevPage (): boolean {
    return topOffset > -1 && topOffset <= 300
  }

  function shouldLoadNextPage (): boolean {
    return bottomOffset <= 200
  }

  function loadMore (direction: 'up' | 'down'): void {
    if (window === undefined || !isScrollInitialized) return

    if (shouldLoadPrevPage() && window.hasPrevPage() && direction === 'up') {
      void loadPrevPage()
    } else if (shouldLoadNextPage() && window.hasNextPage() && direction === 'down') {
      void loadNextPage()
    }
  }

  async function loadPrevPage (): Promise<void> {
    if (window === undefined || isPageLoading || scrollDiv == null) return

    try {
      isPageLoading = true
      shouldScrollToNew = false
      atBottom = false
      await window.loadPrevPage()
      const topOffset = getTopOffset()
      const shouldRestore = topOffset > -1 && topOffset <= 70
      restore = shouldRestore
        ? {
            scrollHeight: scrollDiv.scrollHeight
          }
        : undefined
    } finally {
      isPageLoading = false
    }
  }

  async function loadNextPage (): Promise<void> {
    if (window === undefined || isPageLoading) return
    if ((restore?.scrollHeight ?? 0) !== 0) return

    try {
      isPageLoading = true
      shouldScrollToNew = false
      atBottom = false
      await window.loadNextPage()
    } finally {
      isPageLoading = false
    }
  }

  function scrollToBottom (forced = false): void {
    if (!$isAppFocusedStore && !forced) return
    scrollDiv.scroll({ top: scrollDiv.scrollHeight, behavior: 'instant' })
  }

  function restoreScroll (): void {
    if (restore == null || !$isAppFocusedStore) return
    dispatch('action', { id: 'hideScrollBar' })
    const newScrollHeight = scrollDiv.scrollHeight
    scrollDiv.scrollTop = newScrollHeight - restore.scrollHeight + scrollDiv.scrollTop
    restore = undefined
  }

  function checkPositionOnScroll (): void {
    if (!isScrollInitialized || isPageLoading) return

    if (position === MessagesNavigationAnchors.ConversationStart && window) {
      if (!window.hasNextPage() && bottomOffset < 400) {
        dispatch('change', MessagesNavigationAnchors.LatestMessages)
      }
      if (!window.hasPrevPage() && topOffset < 400 && topOffset > -1) {
        dispatch('change', MessagesNavigationAnchors.ConversationStart)
      }
    } else if (position === MessagesNavigationAnchors.LatestMessages && window) {
      if (!window.hasPrevPage() && topOffset < 400 && topOffset > -1) {
        dispatch('change', MessagesNavigationAnchors.ConversationStart)
      }
      if (!window.hasNextPage() && bottomOffset < 400) {
        dispatch('change', MessagesNavigationAnchors.LatestMessages)
      }
    }

    if (topOffset < 0 && isScrollInitialized) {
      position = MessagesNavigationAnchors.ConversationStart
    }
  }
  let rafId: any | null = null
  let lastScrollTop: number = 0

  function handleScroll (): void {
    if (rafId !== null) return
    rafId = requestAnimationFrame(() => {
      const top = scrollDiv.scrollTop
      const direction = top > lastScrollTop ? 'down' : 'up'

      lastScrollTop = top
      bottomOffset = getBottomOffset()
      topOffset = getTopOffset()
      updateShouldScrollToNew()
      loadMore(direction)
      checkPositionOnScroll()
      void readAll()
      rafId = null
    })
  }

  $: updateSeparator($isAppFocusedStore, context)
  $: readViewport($isAppFocusedStore)

  function updateSeparator (isAppFocused: boolean, context: NotificationContext | undefined): void {
    if (isAppFocused || context == null || window == null) return
    const separatorIndex = messages.findIndex(
      ({ created, creator }) => !me.socialIds.includes(creator) && created.getTime() > context.lastView.getTime()
    )
    if (separatorIndex === -1) return
    separatorDate = messages[separatorIndex].created
  }

  function readAllReactions (): void {
    if (reactionNotifications.length === 0) return
    for (const notification of reactionNotifications) {
      void communicationClient.updateNotifications(
        notification.contextId,
        {
          id: notification.id
        },
        true
      )
    }
  }
  function readViewport (isAppFocused: boolean): void {
    if (!isAppFocused || context == null || window == null) return

    const containerRect = scrollDiv.getBoundingClientRect()
    const items = Array.from(contentDiv.getElementsByClassName('message')).reverse()

    const visible: Element[] = []

    for (const item of items) {
      const rect = item.getBoundingClientRect()

      const isVisible = rect.top < containerRect.bottom && rect.bottom > containerRect.top

      if (isVisible) {
        visible.push(item)
      }

      if (!isVisible && visible.length > 0) {
        break
      }
    }
    if (visible.length === 0) return

    const message = messages.find((it) => it.id === visible[0].id)
    if (message == null) return

    readNotifications(message.created)

    for (const item of visible) {
      const reaction = reactionNotifications.find((it) => it.messageId === item.id)
      if (reaction != null) {
        void communicationClient.updateNotifications(
          reaction.contextId,
          {
            id: reaction.id
          },
          true
        )
      }
    }
  }

  function scrollToStartOfNew (): void {
    if (!shouldScrollToNew) return
    updateSeparator($isAppFocusedStore, context)
    if (separatorDate == null) {
      scrollToBottom(true)
      return
    }

    const firstNewMessageIndex = messages.findIndex(
      ({ created, creator }) =>
        separatorDate && !me.socialIds.includes(creator) && created.getTime() === separatorDate.getTime()
    )

    if (firstNewMessageIndex === -1) return
    const msg = messages[firstNewMessageIndex]
    if (msg == null) return

    const messagesElement = contentDiv.querySelector(`[id="${msg.id}"]`)
    if (messagesElement == null) return
    const topOffset = messagesElement.getBoundingClientRect().top - 100
    const bottomOffset = getBottomOffset()
    if (topOffset < 0) return

    if (bottomOffset < topOffset) {
      scrollToBottom(true)
    } else {
      scrollDiv.scrollBy({ top: topOffset, behavior: 'instant' })
    }
  }

  async function readAll (): Promise<void> {
    if (window == null || context == null || !isScrollInitialized || window.hasNextPage() || !$isAppFocusedStore) return

    if ((newLastView ?? context.lastView).getTime() >= context.lastUpdate.getTime()) {
      return
    }
    if (bottomOffset < 10) {
      readNotifications(new Date())
    }
  }

  async function onUpdate (res: Message[]): Promise<void> {
    if (messagesCount === res.length) return
    const prevCount = messagesCount
    messagesCount = res.length

    if (prevCount > messagesCount) return
    await tick()

    restoreScroll()

    if (!$isAppFocusedStore) {
      scrollToStartOfNew()
    } else if (shouldScrollToNew && prevCount > 0 && isScrollInitialized) {
      dispatch('action', { id: 'hideScrollBar' })
      scrollToBottom()
    }
  }

  let newLastView: Date | undefined = context?.lastView
  let separatorDate: Date | undefined = undefined
  let readNotificationsTimer: any | undefined = undefined
  let unsubscribeObserver: (() => void) | undefined = undefined

  function readNotifications (date: Date): void {
    if (readNotificationsTimer != null) {
      clearTimeout(readNotificationsTimer)
      readNotificationsTimer = undefined
    }
    readNotificationsTimer = setTimeout(() => {
      if (context == null || context.lastView >= date) return
      void communicationClient.updateNotificationContext(context.id, date)
    }, 500)
  }

  $: initMessageObserver(contentDiv, isScrollInitialized, context)

  function initMessageObserver (
    contentDiv: HTMLDivElement,
    isScrollInitialized: boolean,
    context: NotificationContext | undefined
  ): void {
    if (!isScrollInitialized || context == null) return
    if (unsubscribeObserver != null) return

    unsubscribeObserver = createMessagesObserver(contentDiv, (messageDiv) => {
      if (!$isAppFocusedStore) return
      const id = messageDiv.id
      const message = messages.find((it) => it.id === id)
      if (message === undefined) return
      const shouldRead = newLastView == null || message.created > newLastView
      const reactionsToRead = reactionNotifications.filter((it) => it.messageId === message.id)

      if (shouldRead) {
        newLastView = message.created
        readNotifications(message.created)
      }

      if (reactionsToRead.length > 0) {
        for (const reaction of reactionsToRead) {
          void communicationClient.updateNotifications(
            reaction.contextId,
            {
              id: reaction.id
            },
            true
          )
        }
      }
    })
  }

  $: void initializeScroll(isLoading, isLoadingBefore, separatorDiv)

  function scrollToWithOffset (container: HTMLElement, target: HTMLElement, offset: number): void {
    const containerTop = container.getBoundingClientRect().top
    const targetTop = target.getBoundingClientRect().top
    const currentScroll = container.scrollTop

    const scrollTo = currentScroll + (targetTop - containerTop) - offset

    container.scrollTo({ top: scrollTo, behavior: 'instant' })
  }

  $: if (isScrollInitialized) {
    dispatch('loaded')
  }

  async function initializeScroll (
    isLoading: boolean,
    isLoadingBefore: boolean,
    separatorDiv?: HTMLDivElement | null
  ): Promise<void> {
    if (isLoading || isScrollInitialized) return

    if (position === MessagesNavigationAnchors.ConversationStart) {
      if (shouldScrollToStart) {
        await tick()
        contentDiv.scrollIntoView()
      }
      isScrollInitialized = true
      shouldScrollToNew = false
      updateShouldScrollToNew()
      dispatch('loaded')
      bottomOffset = getBottomOffset()
      topOffset = getTopOffset()
      return
    }
    if (isLoadingBefore) return

    const separatorIndex =
      initialLastView !== undefined
        ? messages.findIndex(
          ({ created, creator }) =>
            initialLastView != null && !me.socialIds.includes(creator) && created > initialLastView
        )
        : -1

    if (separatorIndex === -1 || shouldScrollToEnd) {
      await tick() // Wait for the DOM to update
      shouldScrollToEnd = false
      scrollToBottom(true)
      shouldScrollToNew = true
      atBottom = true
      isScrollInitialized = true
      separatorDate = undefined
      bottomOffset = getBottomOffset()
      topOffset = getTopOffset()
      dispatch('loaded')
      if (shouldScrollToEnd) {
        readAllReactions()
      }
      return
    }

    separatorDate = messages[separatorIndex].created
    if (separatorDiv != null) {
      await tick() // Wait for the DOM to update
      scrollToWithOffset(scrollDiv, separatorDiv, 80)
      setTimeout(() => {
        isScrollInitialized = true
      }, 10)
      updateShouldScrollToNew()
      bottomOffset = getBottomOffset()
      topOffset = getTopOffset()
      dispatch('loaded')
    }
  }

  onDestroy(() => {
    if (unsubscribeObserver != null) {
      unsubscribeObserver()
    }

    scrollDiv.removeEventListener('scroll', handleScroll)
  })

  onMount(() => {
    scrollDiv.addEventListener('scroll', handleScroll, { passive: true })
  })
</script>

{#if window !== undefined && window.hasPrevPage()}
  <MessagesLoading />
{/if}
{#each groups as group, index (group.day.toString())}
  {@const withSeparator = separatorDate != null && getGroupDay(separatorDate) === group.day}
  {@const isLastGroup = index === groups.length - 1}
  {#if withSeparator}
    <MessagesGroupPresenter
      bind:separatorDiv
      {card}
      date={group.day}
      messages={group.messages}
      {readonly}
      {separatorDate}
      customObserver={isLastGroup ? lastGroupObserver : undefined}
    />
  {:else}
    <MessagesGroupPresenter
      {card}
      date={group.day}
      messages={group.messages}
      {readonly}
      customObserver={isLastGroup ? lastGroupObserver : undefined}
    />
  {/if}
{/each}
{#if window !== undefined && window.hasNextPage()}
  <MessagesLoading />
{/if}
