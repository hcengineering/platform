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
  import { Scroller } from '@hcengineering/ui'
  import { SortingOrder, Ref } from '@hcengineering/core'
  import { createNotificationContextsQuery, createQuery } from '@hcengineering/presentation'
  import { NotificationContext, Window } from '@hcengineering/communication-types'

  import InboxCard from './InboxCard.svelte'

  export let card: Card | undefined = undefined

  const limit = 20

  let cards: Card[] = []
  let contexts: NotificationContext[] = []

  const cardsQuery = createQuery()
  const query = createNotificationContextsQuery()

  let divScroll: HTMLElement | undefined | null = undefined
  let window: Window<NotificationContext> | undefined = undefined

  query.query(
    {
      notifications: {
        message: true,
        order: SortingOrder.Descending,
        limit: 10
      },
      order: SortingOrder.Descending,
      limit
    },
    (res) => {
      window = res
      contexts = res.getResult().filter((it) => (it.notifications?.length ?? 0) > 0)

      if (contexts.length < limit && window.hasPrevPage()) {
        void window.loadPrevPage()
      }
    }
  )

  $: cardsQuery.query(cardPlugin.class.Card, { _id: { $in: contexts.map((c) => c.card) as Ref<Card>[] } }, (res) => {
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
</script>

<Scroller bind:divScroll shrink onScroll={handleScroll}>
  <div class="inbox-navigation">
    {#each contexts as context (context.id)}
      {@const contextCard = cards.find((c) => c._id === context.card)}
      {#if contextCard}
        <InboxCard {context} card={contextCard} selected={card?._id === contextCard._id} on:select />
      {/if}
    {/each}
  </div>
</Scroller>

<style lang="scss">
  .inbox-navigation {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 8px;
  }
</style>
