<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Card } from '@hcengineering/card'
  import { type Message, MessageID, Window, NotificationContext } from '@hcengineering/communication-types'
  import { createMessagesQuery, getCommunicationClient } from '@hcengineering/presentation'
  import { MessagesGroup as MessagesGroupPresenter } from '@hcengineering/ui-next'
  import { Scroller } from '@hcengineering/ui'
  import { getCurrentAccount, Markup, SortingOrder } from '@hcengineering/core'
  import { tick } from 'svelte'
  import { markupToMarkdown } from '@hcengineering/text-markdown'
  import { markupToJSON } from '@hcengineering/text'

  import ReverseScroller from './internal/ReverseScroller.svelte'
  import { createMessagesObserver, getGroupDay, groupMessagesByDay, MessagesGroup, toDisplayMessages } from '../ui'
  import { replyToThread, toggleReaction } from '../actions'
  import ChatLoadingFiller from './ChatLoadingFiller.svelte'

  export let card: Card | undefined = undefined
  export let context: NotificationContext | undefined = undefined
  export let bottomStart: boolean = true
  export let footerHeight: number | undefined = undefined
  export let showDates: boolean = true

  const me = getCurrentAccount()
  const communicationClient = getCommunicationClient()
  const query = createMessagesQuery()

  const loadPageThreshold = 200
  const scrollToNewThreshold = 50

  const initialLastView = context?.lastView
  const initialLastUpdate = context?.lastUpdate

  let contentDiv: HTMLDivElement | null | undefined = undefined
  let scrollDiv: HTMLDivElement | null | undefined = undefined
  let scroller: Scroller | undefined | null = undefined

  let separatorDiv: HTMLDivElement | null | undefined = undefined

  let messages: Message[] = []
  let groups: MessagesGroup[] = []
  let window: Window<Message> | undefined = undefined
  let isLoading = true
  let messagesCount = 0

  let isScrollInitialized = false
  let isPageLoading = false
  let shouldScrollToNew = true
  let restore: { scrollTop: number, scrollHeight: number } | undefined = undefined

  $: if (card != null) {
    const limit = 50
    const unread = initialLastView != null && initialLastUpdate != null && initialLastUpdate > initialLastView
    const order = unread ? SortingOrder.Ascending : SortingOrder.Descending
    query.query(
      {
        card: card._id,
        withReplies: true,
        withFiles: true,
        withReactions: true,
        order,
        limit,
        created:
          unread && initialLastView != null
            ? {
                greaterOrEqual: initialLastView
              }
            : undefined
      },
      (res: Window<Message>) => {
        window = res
        messages = order === SortingOrder.Ascending ? res.getResult() : res.getResult().reverse()
        if (messages.length < limit && res.hasNextPage()) {
          void window.loadNextPage()
        } else if (messages.length < limit && res.hasPrevPage()) {
          void window.loadPrevPage()
        }
        groups = groupMessagesByDay(messages)
        isLoading = messages.length < limit && (res.hasNextPage() || res.hasPrevPage())
        void onUpdate(messages)
      }
    )
  } else {
    isLoading = true
    window = undefined
    groups = []
    query.unsubscribe()
  }

  function updateShouldScrollToNew (): void {
    if (scrollDiv != null && contentDiv != null) {
      const { scrollTop } = scrollDiv

      shouldScrollToNew = Math.abs(scrollTop) < scrollToNewThreshold
    }
  }

  function shouldLoadPrevPage (): boolean {
    if (scrollDiv == null) return false
    const { scrollHeight, scrollTop, clientHeight } = scrollDiv

    return scrollHeight + Math.ceil(scrollTop - clientHeight) <= loadPageThreshold
  }

  function shouldLoadNextPage (): boolean {
    if (scrollDiv == null) return false

    return Math.abs(scrollDiv.scrollTop) <= loadPageThreshold
  }

  function loadMore (): void {
    if (window === undefined) return

    if (shouldLoadPrevPage() && window.hasPrevPage()) {
      void loadPrevPage()
    } else if (shouldLoadNextPage() && window.hasNextPage()) {
      void loadNextPage()
    }
  }

  async function loadPrevPage (): Promise<void> {
    if (window === undefined || isPageLoading || scrollDiv == null) return
    if ((restore?.scrollTop ?? 0) !== 0) return

    try {
      isPageLoading = true
      shouldScrollToNew = false
      await window.loadPrevPage()
      restore = {
        scrollTop: scrollDiv?.scrollTop ?? 0,
        scrollHeight: 0
      }
    } finally {
      isPageLoading = false
    }
  }

  async function loadNextPage (): Promise<void> {
    if (window === undefined || isPageLoading || scrollDiv == null) return

    if ((restore?.scrollHeight ?? 0) !== 0) return

    try {
      isPageLoading = true
      shouldScrollToNew = false
      await window.loadNextPage()
      restore = {
        scrollTop: 0,
        scrollHeight: scrollDiv?.scrollHeight ?? 0
      }
    } finally {
      isPageLoading = false
    }
  }

  function scrollToBottom (): void {
    if (scrollDiv != null) {
      scrollDiv.scroll({ top: 0, behavior: 'instant' })
    }
  }

  function restoreScroll (): void {
    if (scrollDiv == null || scroller == null || restore == null) return
    if (restore.scrollTop !== 0) {
      scroller.scroll(restore.scrollTop)
    }
    if (restore.scrollHeight !== 0) {
      const delta = restore.scrollHeight - scrollDiv.scrollHeight
      scroller.scroll(delta)
    }
    restore = undefined
  }

  function handleScroll (): void {
    loadMore()
    updateShouldScrollToNew()
  }

  async function onUpdate (res: Message[]): Promise<void> {
    if (messagesCount === res.length) return
    const prevCount = messagesCount
    messagesCount = res.length

    if (prevCount > messagesCount) return
    await tick()

    restoreScroll()

    if (shouldScrollToNew && prevCount > 0) {
      scrollToBottom()
    }
  }

  let newLastView: Date | undefined = context?.lastView
  let separatorDate: Date | undefined = undefined
  let readMessagesTimer: any | undefined = undefined

  function readMessage (date: Date): void {
    if (readMessagesTimer != null) {
      clearTimeout(readMessagesTimer)
      readMessagesTimer = undefined
    }
    readMessagesTimer = setTimeout(async () => {
      if (context == null) return
      if (context.lastView && context.lastView > date) return
      await communicationClient.updateNotificationContext(context.id, date)
    }, 500)
  }

  $: if (contentDiv != null && isScrollInitialized && context != null) {
    createMessagesObserver(contentDiv, (messageDiv) => {
      if (!isScrollInitialized) return
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

  async function handleClickReaction (event: CustomEvent<{ emoji: string, id: MessageID }>): Promise<void> {
    if (window === undefined || card === undefined) return
    const message = messages.find((it) => it.id === event.detail.id)
    if (message === undefined) return
    await toggleReaction(communicationClient, card._id, message, event.detail.emoji)
  }

  async function handleUpdateMessage (event: CustomEvent<{ id: MessageID, text: Markup }>): Promise<void> {
    if (window === undefined || card === undefined) return
    const { id, text } = event.detail
    const markdown = markupToMarkdown(markupToJSON(text))
    await communicationClient.updateMessage(card._id, id, markdown)
  }

  async function handleReply (event: CustomEvent<{ id: MessageID }>): Promise<void> {
    if (window === undefined || card === undefined) return
    const { id } = event.detail
    const message = messages.find((it) => it.id === id)
    if (message === undefined) return
    await replyToThread(card._id, message)
  }

  $: void initializeScroll(isLoading, separatorDiv)

  async function initializeScroll (isLoading: boolean, separatorDiv?: HTMLDivElement | null): Promise<void> {
    if (isLoading || isScrollInitialized) return

    const separatorIndex = initialLastView
      ? messages.findIndex(({ created, creator }) => !me.socialIds.includes(creator) && created > initialLastView)
      : -1

    if (separatorIndex === -1) {
      isScrollInitialized = true
      separatorDate = undefined
      return
    }

    separatorDate = messages[separatorIndex].created
    if (separatorDiv != null) {
      await tick() // Wait for the DOM to update
      separatorDiv.scrollIntoView({ behavior: 'instant', block: 'start' })
      // Compensate date selector
      scroller?.scrollBy(-100)
      isScrollInitialized = true
      updateShouldScrollToNew()
    }
  }
</script>

<ReverseScroller
  bind:scrollDiv
  bind:scroller
  bind:contentDiv
  isLoading={card != null && (isLoading || !isScrollInitialized)}
  {bottomStart}
  onScroll={handleScroll}
>
  {#if window !== undefined && window.hasPrevPage()}
    <ChatLoadingFiller />
  {/if}
  {#each groups as group (group.day.toString())}
    {@const messages = toDisplayMessages(group.messages)}
    {@const withSeparator = separatorDate != null && getGroupDay(separatorDate) === group.day}
    {#if withSeparator}
      <MessagesGroupPresenter
        bind:separatorDiv
        date={group.day}
        {messages}
        {showDates}
        {separatorDate}
        on:reaction={handleClickReaction}
        on:update={handleUpdateMessage}
        on:reply={handleReply}
      />
    {:else}
      <MessagesGroupPresenter
        date={group.day}
        {messages}
        {showDates}
        on:reaction={handleClickReaction}
        on:update={handleUpdateMessage}
        on:reply={handleReply}
      />
    {/if}
  {/each}
  {#if window !== undefined && window.hasNextPage()}
    <ChatLoadingFiller />
  {/if}

  {#if footerHeight != null && footerHeight > 0}
    <div class="filler" style:height={`${footerHeight}px`} />
  {/if}
</ReverseScroller>

<style lang="scss">
  .filler {
    display: flex;
    width: 100%;
  }
</style>
