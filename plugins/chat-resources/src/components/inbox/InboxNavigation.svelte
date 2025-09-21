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
  import cardPlugin, { Card } from '@hcengineering/card'
  import { Label, ListView, Loading, Scroller } from '@hcengineering/ui'
  import { SortingOrder } from '@hcengineering/core'
  import { createNotificationContextsQuery, createQuery, getCommunicationClient } from '@hcengineering/presentation'
  import { NotificationContext, Window } from '@hcengineering/communication-types'
  import { createEventDispatcher } from 'svelte'

  import InboxCard from './InboxCard.svelte'
  import chat from '../../plugin'

  export let card: Card | undefined = undefined

  const dispatch = createEventDispatcher()
  const limit = 20

  let cards: Card[] = []
  let contexts: NotificationContext[] = []

  const communicationClient = getCommunicationClient()
  const cardsQuery = createQuery()
  const query = createNotificationContextsQuery()

  let divScroll: HTMLElement | undefined | null = undefined
  let contentDiv: HTMLElement | undefined | null = undefined
  let window: Window<NotificationContext> | undefined = undefined

  let list: ListView
  let listSelection = 0

  let isLoading = true

  query.query(
    {
      notifications: {
        message: true,
        order: SortingOrder.Descending,
        limit: 3
      },
      order: SortingOrder.Descending,
      limit
    },
    (res) => {
      window = res
      contexts = res.getResult().filter((it) => (it.notifications?.length ?? 0) > 0)
      isLoading = false

      if (contexts.length < limit && window.hasPrevPage()) {
        void window.loadPrevPage()
      }
    }
  )

  $: cardsQuery.query(cardPlugin.class.Card, { _id: { $in: contexts.map((c) => c.cardId) } }, (res) => {
    cards = res
  })

  function handleScroll (): void {
    if (divScroll != null && window != null && window.hasPrevPage()) {
      const isAtBottom = divScroll.scrollTop + divScroll.clientHeight >= divScroll.scrollHeight - 10
      if (isAtBottom) {
        void window.loadPrevPage()
      }
    }
  }

  async function onKeydown (key: KeyboardEvent): Promise<void> {
    if (key.code === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      list.select(listSelection - 1)
    }
    if (key.code === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      list.select(listSelection + 1)
    }
    if (key.code === 'Backspace') {
      key.preventDefault()
      key.stopPropagation()
      const context = contexts[listSelection]
      if (context != null) {
        await communicationClient.removeNotificationContext(context.id)
      }
    }
    if (key.code === 'Enter') {
      key.preventDefault()
      key.stopPropagation()
      const context = contexts[listSelection]
      const card = cards.find((c) => c._id === context.cardId)
      if (card && context) {
        dispatch('select', { context, card })
      }
    }
  }

  $: if (contentDiv != null) {
    contentDiv.focus()
  }

  function getContextKey (index: number): string {
    const contextId = contexts[index].id
    return contextId ?? index.toString()
  }
</script>

{#if contexts.length > 0}
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <Scroller bind:divScroll padding="0" shrink onScroll={handleScroll}>
    <div class="inbox-list" bind:this={contentDiv} tabindex="0" on:keydown={onKeydown}>
      <ListView
        bind:this={list}
        bind:selection={listSelection}
        count={contexts.length}
        items={contexts}
        highlightIndex={contexts.findIndex((it) => it.cardId === card?._id)}
        noScroll
        kind="full-size"
        colorsSchema="lumia"
        lazy={true}
        getKey={getContextKey}
      >
        <svelte:fragment slot="item" let:item={itemIndex}>
          {@const context = contexts[itemIndex]}
          {@const contextCard = cards.find((c) => c._id === context.cardId)}
          {#if context && contextCard}
            <InboxCard
              {context}
              card={contextCard}
              on:select={(e) => {
                dispatch('select', e.detail)
                listSelection = itemIndex
              }}
            />
          {/if}
        </svelte:fragment>
      </ListView>
    </div>
  </Scroller>
{:else if isLoading}
  <div class="placeholder">
    <Loading />
  </div>
{:else}
  <div class="placeholder">
    <div class="placeholder__header">
      <Label label={chat.string.InboxIsClear} />
    </div>
    <span class="mb-4">
      <Label label={chat.string.YouDontHaveAnyNewMessages} />
    </span>
  </div>
{/if}

<style lang="scss">
  .inbox-list {
    display: flex;
    flex-direction: column;
    width: 100%;

    &:focus {
      outline: 0;
    }

    :global(.list-item) {
      border-radius: 0;
    }
  }

  .placeholder {
    display: flex;
    align-self: center;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    height: inherit;
    width: 100%;
    gap: 0.5rem;

    &__header {
      font-weight: 600;
    }
  }
</style>
