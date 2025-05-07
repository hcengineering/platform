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
  import { Card, CardSpace, MasterTag } from '@hcengineering/card'
  import { Ref, SortingOrder } from '@hcengineering/core'
  import { createLabelsQuery, createNotificationContextsQuery, createQuery, getClient } from '@hcengineering/presentation'
  import uiNext, { Button, ButtonVariant, NavItem } from '@hcengineering/ui-next'
  import { createEventDispatcher } from 'svelte'
  import { Label, NotificationContext } from '@hcengineering/communication-types'

  import type { CardsNavigatorConfig } from '../../types'
  import cardPlugin from '../../plugin'
  import NavigatorType from './NavigatorType.svelte'

  export let type: MasterTag
  export let config: CardsNavigatorConfig
  export let space: CardSpace | undefined = undefined
  export let selectedType: Ref<MasterTag> | undefined = undefined
  export let selectedCard: Ref<Card> | undefined = undefined

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const cardsQuery = createQuery()
  const labelsQuery = createLabelsQuery()
  const notificationContextsQuery = createNotificationContextsQuery()

  let cards: Card[] = []
  let sortedCards: Card[] = []
  let total = -1
  let contextByCard = new Map<Ref<Card>, NotificationContext>()
  let labels: Label[] = []
  let isLabelsLoaded = false
  let isLoading: boolean = true

  let sort: 'alphabetical' | 'recent' | undefined
   $:sort = config.specialSorting?.[type._id] ?? config.defaultSorting ?? 'alphabetical'

  let limit = config.limit

  $: if ((config.labelFilter?.length ?? 0) > 0) {
    labelsQuery.query(
      {
        label: config.labelFilter,
        cardType: hierarchy.getDescendants(type._id),
        limit: Math.max(limit, 100)
      },
      (res) => {
        labels = res
        isLabelsLoaded = true
      }
    )
  } else {
    labelsQuery.unsubscribe()
    labels = []
    isLabelsLoaded = true
  }

  $: ids = (config.labelFilter?.length ?? 0) > 0 ? labels.map((it) => it.card) : undefined

  $: if (isLabelsLoaded) {
    cardsQuery.query<Card>(
      type._id,
      {
        ...(ids === undefined ? {} : { _id: { $in: ids as Ref<Card>[] } }),
        ...(space !== undefined ? { space: space._id } : {})
      },
      (res) => {
        cards = res
        total = res.total
        isLoading = false
      },
      { total: true, limit, sort: sort === 'alphabetical' ? { title: SortingOrder.Ascending } : { modifiedOn: SortingOrder.Descending } }
    )
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
        contextByCard = new Map(res.getResult().map((it) => [it.card, it]))
      }
    )
  } else {
    notificationContextsQuery.unsubscribe()
    contextByCard = new Map()
  }

  $: empty = total === 0

  $: sortedCards = sortCards(cards, contextByCard)

  function sortCards (cards: Card[], contextByCard: Map<Ref<Card>, NotificationContext>): Card[] {
    const sort = config.specialSorting?.[type._id] ?? config.defaultSorting ?? 'alphabetical'
    if (sort === 'alphabetical') {
      return cards.sort((a, b) => a.title.localeCompare(b.title))
    } else if (sort === 'recent') {
      return cards.sort((card1, card2) => {
        const context1 = contextByCard.get(card1._id)
        const context2 = contextByCard.get(card2._id)
        const lastUpdate1 = context1?.lastUpdate.getTime() ?? 0
        const lastUpdate2 = context2?.lastUpdate.getTime() ?? 0

        return lastUpdate2 - lastUpdate1
      })
    }

    return cards
  }
</script>

{#if !isLoading}
  {#if !empty || config.hideEmpty !== true || config.fixedTypes?.includes(type._id)}
    <NavigatorType {type} {config} {space} {selectedType} {empty} bold on:selectType on:selectCard>
      {#each sortedCards as card (card._id)}
        {@const clazz = hierarchy.getClass(card._class)}
        {@const context = contextByCard.get(card._id)}
        <NavItem
          label={card.title}
          icon={clazz.icon ?? cardPlugin.icon.Card}
          selected={selectedCard === card._id}
          paddingLeft="1.75rem"
          notify={context && context.lastUpdate.getTime() > context.lastView.getTime()}
          notificationsCount={context?.notifications?.length ?? 0}
          on:click={(e) => {
            e.stopPropagation()
            e.preventDefault()
            dispatch('selectCard', card)
          }}
        />
      {/each}

      {#if total > cards.length}
        <div class="all-button">
          <Button
            labelIntl={uiNext.string.All}
            labelParams={{ count: total }}
            variant={ButtonVariant.Ghost}
            on:click={() => {
              limit += config.limit
            }}
          />
        </div>
      {/if}
    </NavigatorType>
  {/if}
{/if}

<style lang="scss">
  .all-button {
    margin-left: 1.75rem;
  }
</style>
