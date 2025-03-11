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
  import { type Message, Window, MessageID } from '@hcengineering/communication-types'
  import { getCommunicationClient, createMessagesQuery } from '@hcengineering/presentation'
  import { MessagesGroup as MessagesGroupPresenter } from '@hcengineering/ui-next'
  import { personByPersonIdStore } from '@hcengineering/contact-resources'
  import { Scroller } from '@hcengineering/ui'
  import { Markup, SortingOrder } from '@hcengineering/core'
  import { tick } from 'svelte'
  import { markupToMarkdown } from '@hcengineering/text-markdown'
  import { markupToJSON } from '@hcengineering/text'

  import ReverseScroller from './internal/ReverseScroller.svelte'
  import { toDisplayMessages, groupMessagesByDay, MessagesGroup } from '../ui'
  import { replyToThread, toggleReaction } from '../actions'

  export let card: Card | undefined = undefined
  export let bottomStart: boolean = true
  export let footerHeight: number | undefined = undefined
  export let showDates: boolean = true

  const communicationClient = getCommunicationClient()
  const query = createMessagesQuery()

  const loadPageThreshold = 200
  const scrollToNewThreshold = 50

  let contentDiv: HTMLDivElement | null | undefined = undefined
  let scrollDiv: HTMLDivElement | null | undefined = undefined
  let scroller: Scroller | undefined | null = undefined

  let groups: MessagesGroup[] = []
  let window: Window<Message> | undefined = undefined
  let isLoading = true
  let messagesCount = 0

  let isPageLoading = false
  let shouldScrollToNew = true
  let restore: { scrollTop: number, scrollHeight: number } | undefined = undefined

  $: if (card != null) {
    query.query({ card: card._id, order: SortingOrder.Descending, limit: 50 }, (res: Window<Message>) => {
      window = res
      const messages = res.getResult().reverse()
      groups = groupMessagesByDay(messages)
      isLoading = false
      void onUpdate(messages)
    })
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

  // $:if (contentDiv != null) {
  //   createMessagesObserver(contentDiv, () => {})
  // }

  async function handleClickReaction (event: CustomEvent<{ emoji: string, id: MessageID }>): Promise<void> {
    if (window === undefined || card === undefined) return
    const res = window.getResult()
    const message = res.find((it) => it.id === event.detail.id)
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
    const message = window.getResult().find((it) => it.id === id)
    if (message === undefined) return
    await replyToThread(card._id, message)
  }
</script>

<ReverseScroller
  bind:scrollDiv
  bind:scroller
  bind:contentDiv
  isLoading={card != null && isLoading}
  {bottomStart}
  onScroll={handleScroll}
>
  {#if window !== undefined && window.hasPrevPage()}
    <div class="filler" />
  {/if}
  {#each groups as group (group.day)}
    {@const messages = toDisplayMessages(group.messages, $personByPersonIdStore)}
    <MessagesGroupPresenter
      date={group.day}
      {messages}
      {showDates}
      on:reaction={handleClickReaction}
      on:update={handleUpdateMessage}
      on:reply={handleReply}
    />
  {/each}
  {#if window !== undefined && window.hasNextPage()}
    <div class="filler" />
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
