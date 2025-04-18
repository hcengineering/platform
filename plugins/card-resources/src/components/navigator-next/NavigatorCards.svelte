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
  import { Ref, SortingOrder } from '@hcengineering/core'
  import cardPlugin, { Card, MasterTag } from '@hcengineering/card'
  import { createNotificationContextsQuery, createQuery, getClient } from '@hcengineering/presentation'
  import { createEventDispatcher } from 'svelte'
  import uiNext, { ButtonVariant, NavItem, Button } from '@hcengineering/ui-next'
  import type { NotificationContext, Label } from '@hcengineering/communication-types'

  import { type NavigatorConfig } from './types'

  export let types: MasterTag[] = []
  export let config: NavigatorConfig
  export let labels: Label[] = []
  export let level: number = 0
  export let isLeaf: boolean = false
  export let total: number = 0
  export let selectedCard: Ref<Card> | undefined = undefined

  const dispatch = createEventDispatcher()

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const cardsQuery = createQuery()
  const notificationContextsQuery = createNotificationContextsQuery()

  $: cardOptions = config.cardOptions

  let cards: Card[] = []
  let contexts: NotificationContext[] = []

  let limit = config.cardOptions.limit ?? 10

  $: ids = (cardOptions.labelFilter?.length ?? 0) > 0 ? labels.map((it) => it.card) : undefined

  $: if (ids === undefined || ids.length > 0) {
    cardsQuery.query<Card>(
      types.length === 1 ? types[0]._id : cardPlugin.class.Card,
      {
        ...(isLeaf ? {} : { _class: { $in: types.map((it) => it._id) } }),
        ...(ids === undefined ? {} : { _id: { $in: ids as Ref<Card>[] } })
      },
      (res) => {
        cards = res
        total = res.total
      },
      { total: true, limit, sort: { title: SortingOrder.Ascending } }
    )
  } else {
    cardsQuery.unsubscribe()
    cards = []
    total = 0
  }

  $: if ((ids?.length ?? 0) > 0 || cards.length > 0) {
    notificationContextsQuery.query(
      {
        card: ids ?? cards.map((it) => it._id),
        notifications: {
          order: SortingOrder.Descending,
          read: false,
          limit: 10
        }
      },
      (res) => {
        contexts = res.getResult()
      }
    )
  } else {
    notificationContextsQuery.unsubscribe()
    contexts = []
  }
</script>

{#each cards as card (card._id)}
  {@const clazz = hierarchy.getClass(card._class)}
  {@const context = contexts.find((c) => c.card === card._id)}
  <NavItem
    label={card.title}
    icon={clazz.icon ?? cardPlugin.icon.Card}
    selected={selectedCard === card._id}
    notificationsCount={context?.notifications?.length ?? 0}
    {level}
    on:click={(e) => {
      e.stopPropagation()
      e.preventDefault()
      dispatch('selectCard', card)
    }}
  />
{/each}

{#if total > cards.length}
  <div class="all-button" style:margin-left={`${2 * level}rem`}>
    <Button
      labelIntl={uiNext.string.All}
      labelParams={{ count: total }}
      variant={ButtonVariant.Ghost}
      on:click={() => {
        limit += cardOptions.limit ?? 10
      }}
    />
  </div>
{/if}
