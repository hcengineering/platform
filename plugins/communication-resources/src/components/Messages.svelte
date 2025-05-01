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
  import { FindMessagesParams, type Message, NotificationContext, Window } from '@hcengineering/communication-types'
  import { createMessagesQuery, getCommunicationClient } from '@hcengineering/presentation'
  import { getCurrentAccount, SortingOrder } from '@hcengineering/core'
  import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte'
  import { MessagesGroup as MessagesGroupPresenter, MessagesLoading } from '@hcengineering/ui-next'
  import { MessagesNavigationAnchors } from '@hcengineering/communication'

  import { createMessagesObserver, getGroupDay, groupMessagesByDay, MessagesGroup } from '../messages'

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

  const loadPageThreshold = 200
  const scrollToNewThreshold = 50

  const initialLastView = context?.lastView
  const initialLastUpdate = context?.lastUpdate

  let separatorDiv: HTMLDivElement | null | undefined = undefined

  let messages: Message[] = []
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

  const limit = 10
  const unread = initialLastView != null && initialLastUpdate != null && initialLastUpdate > initialLastView
  let queryDef = getBaseQuery()

  $: reinit(position)

  $: query.query(queryDef, (res: Window<Message>) => {
    window = res
    messages = queryDef.order === SortingOrder.Ascending ? res.getResult() : res.getResult().reverse()

    if (messages.length < limit && res.hasNextPage()) {
      void window.loadNextPage()
    } else if (messages.length < limit && res.hasPrevPage()) {
      void window.loadPrevPage()
    }

    groups = groupMessagesByDay(messages)
    isLoading = messages.length < limit && (res.hasNextPage() || res.hasPrevPage())
    void onUpdate(messages)
  })

  const mo = new MutationObserver(() => {
    if (!isScrollInitialized) return

    if (atBottom) {
      scrollToBottom()
    }
  })

  $: if (contentDiv != null) {
    mo.observe(contentDiv, {
      childList: true,
      subtree: true,
      characterData: true
    })
  }

  function reinit (position: MessagesNavigationAnchors): void {
    if (prevPosition === position) {
      return
    }
    prevPosition = position
    if (position === MessagesNavigationAnchors.ConversationStart && window && !window.hasPrevPage()) {
      if (shouldScrollToStart) {
        contentDiv?.scrollIntoView({ behavior: 'instant', block: 'start' })
      }
    } else if (position === MessagesNavigationAnchors.LatestMessages && window && !window.hasNextPage()) {
      scrollToBottom()
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

  function getBaseQuery (): FindMessagesParams {
    if (position === MessagesNavigationAnchors.ConversationStart) {
      return {
        card: card._id,
        replies: true,
        files: true,
        reactions: true,
        order: SortingOrder.Ascending,
        limit
      }
    }
    const order = unread ? SortingOrder.Ascending : SortingOrder.Descending
    return {
      card: card._id,
      replies: true,
      files: true,
      reactions: true,
      order,
      limit,
      created:
        unread && initialLastView != null
          ? {
              greaterOrEqual: initialLastView
            }
          : undefined
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

    const bottomOffset = getBottomOffset()
    shouldScrollToNew = bottomOffset <= scrollToNewThreshold
    atBottom = bottomOffset < 10
  }

  function shouldLoadPrevPage (): boolean {
    const topOffset = getTopOffset()

    return topOffset > -1 && topOffset <= loadPageThreshold
  }

  function shouldLoadNextPage (): boolean {
    return getBottomOffset() <= loadPageThreshold
  }

  function loadMore (): void {
    if (window === undefined || !isScrollInitialized) return

    if (shouldLoadPrevPage() && window.hasPrevPage()) {
      void loadPrevPage()
    } else if (shouldLoadNextPage() && window.hasNextPage()) {
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

  function scrollToBottom (): void {
    scrollDiv.scroll({ top: scrollDiv.scrollHeight, behavior: 'instant' })
  }

  function restoreScroll (): void {
    if (restore == null) return
    const newScrollHeight = scrollDiv.scrollHeight
    scrollDiv.scrollTop = newScrollHeight - restore.scrollHeight + scrollDiv.scrollTop
    restore = undefined
  }

  function checkPositionOnScroll (): void {
    const topOffset = getTopOffset()
    const bottomOffset = getBottomOffset()

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

  function handleScroll (): void {
    updateShouldScrollToNew()
    loadMore()
    checkPositionOnScroll()
  }

  async function onUpdate (res: Message[]): Promise<void> {
    if (messagesCount === res.length) return
    const prevCount = messagesCount
    messagesCount = res.length

    if (prevCount > messagesCount) return
    await tick()

    restoreScroll()

    if (shouldScrollToNew && prevCount > 0 && isScrollInitialized) {
      scrollToBottom()
    }
  }

  let newLastView: Date | undefined = context?.lastView
  let separatorDate: Date | undefined = undefined
  let readMessagesTimer: any | undefined = undefined
  let unsubscribeObserver: (() => void) | undefined = undefined

  function readMessage (date: Date): void {
    if (readMessagesTimer != null) {
      clearTimeout(readMessagesTimer)
      readMessagesTimer = undefined
    }
    readMessagesTimer = setTimeout(() => {
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
      const id = messageDiv.id
      const message = messages.find((it) => it.id === id)
      if (message === undefined) return
      const shouldRead = newLastView == null || message.created > newLastView

      if (shouldRead) {
        newLastView = message.created
        readMessage(message.created)
      }
    })
  }

  async function handleReply (event: CustomEvent<Message>): Promise<void> {
    // const message = event.detail
    // await replyToThread(message, card)
    // TODO: implement reply
    alert('Sorry, replying is not implemented yet.')
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
      return
    }
    if (isLoadingBefore) return

    const separatorIndex =
      initialLastView !== undefined
        ? messages.findIndex(({ created, creator }) => !me.socialIds.includes(creator) && created > initialLastView)
        : -1

    if (separatorIndex === -1) {
      await tick() // Wait for the DOM to update
      scrollToBottom()
      shouldScrollToNew = true
      atBottom = true
      isScrollInitialized = true
      separatorDate = undefined
      dispatch('loaded')
      return
    }

    separatorDate = messages[separatorIndex].created
    if (separatorDiv != null) {
      await tick() // Wait for the DOM to update
      scrollToWithOffset(scrollDiv, separatorDiv, 80)
      isScrollInitialized = true
      updateShouldScrollToNew()
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
    scrollDiv.addEventListener('scroll', handleScroll)
  })
</script>

{#if window !== undefined && window.hasPrevPage()}
  <MessagesLoading />
{/if}
{#each groups as group (group.day.toString())}
  {@const withSeparator = separatorDate != null && getGroupDay(separatorDate) === group.day}
  {#if withSeparator}
    <MessagesGroupPresenter
      bind:separatorDiv
      {card}
      date={group.day}
      messages={group.messages}
      {readonly}
      {separatorDate}
      on:reply={handleReply}
    />
  {:else}
    <MessagesGroupPresenter {card} date={group.day} messages={group.messages} {readonly} on:reply={handleReply} />
  {/if}
{/each}
{#if window !== undefined && window.hasNextPage()}
  <MessagesLoading />
{/if}
