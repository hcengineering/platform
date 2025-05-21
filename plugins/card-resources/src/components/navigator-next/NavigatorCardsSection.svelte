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
  import { Card, CardSpace, FavoriteCard, MasterTag } from '@hcengineering/card'
  import { Ref, SortingOrder, WithLookup } from '@hcengineering/core'
  import {
    createLabelsQuery,
    createNotificationContextsQuery,
    createQuery,
    getClient
  } from '@hcengineering/presentation'
  import { Label, NotificationContext, NotificationType } from '@hcengineering/communication-types'
  import { Button } from '@hcengineering/ui'

  import type { CardsNavigatorConfig } from '../../types'
  import cardPlugin from '../../plugin'
  import NavigatorType from './NavigatorType.svelte'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import NavigatorCard from './NavigatorCard.svelte'

  export let type: MasterTag
  export let config: CardsNavigatorConfig
  export let applicationId: string
  export let favorites: FavoriteCard[]
  export let space: CardSpace | undefined = undefined
  export let selectedType: Ref<MasterTag> | undefined = undefined
  export let selectedCard: Ref<Card> | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const cardsQuery = createQuery()
  const labelsQuery = createLabelsQuery()
  const notificationContextsQuery = createNotificationContextsQuery()

  let cards: WithLookup<Card>[] = []
  let sortedCards: WithLookup<Card>[] = []
  let contextByCard = new Map<Ref<Card>, NotificationContext>()
  let labels: Label[] = []
  let isLabelsLoaded = false
  let isLoading: boolean = true
  let hasMore = false

  let sort: 'alphabetical' | 'recent' | undefined
  $: sort = config.specialSorting?.[type._id] ?? config.defaultSorting ?? 'alphabetical'

  let limit = config.limit

  $: if ((config.labelFilter?.length ?? 0) > 0) {
    labelsQuery.query(
      {
        label: config.labelFilter,
        cardType: hierarchy.getDescendants(type._id),
        limit: Math.max(limit, 1000)
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
        const cardsResult = res
        hasMore = res.length === limit + 1
        if (hasMore) {
          cardsResult.pop()
        }
        cards = cardsResult
        isLoading = false
      },
      {
        limit: limit + 1,
        sort: sort === 'alphabetical' ? { title: SortingOrder.Ascending } : { modifiedOn: SortingOrder.Descending },
        lookup: {
          parent: cardPlugin.class.Card
        }
      }
    )
  }

  $: if ((ids?.length ?? 0) > 0 || cards.length > 0) {
    notificationContextsQuery.query(
      {
        card: ids ?? cards.map((it) => it._id),
        notifications: {
          type: NotificationType.Message,
          order: SortingOrder.Descending,
          read: false,
          limit: 10
        }
      },
      (res) => {
        contextByCard = new Map(res.getResult().map((it) => [it.card as Ref<Card>, it]))
      }
    )
  } else {
    notificationContextsQuery.unsubscribe()
    contextByCard = new Map()
  }

  $: filteredCards = filterCards(cards, favorites)
  $: sortedCards = sortCards(filteredCards, contextByCard)
  $: empty = sortedCards.length === 0

  function filterCards (cards: Card[], favorites: FavoriteCard[]): Card[] {
    return cards.filter((it) => !favorites.some((fav) => fav.attachedTo === it._id))
  }

  function sortCards (cards: Card[], contextByCard: Map<Ref<Card>, NotificationContext>): Card[] {
    const sort = config.specialSorting?.[type._id] ?? config.defaultSorting ?? 'alphabetical'
    if (sort === 'alphabetical') {
      return cards.sort((a, b) => a.title.localeCompare(b.title))
    } else if (sort === 'recent') {
      return cards.sort((card1, card2) => {
        const context1 = contextByCard.get(card1._id)
        const context2 = contextByCard.get(card2._id)
        const lastUpdate1 = context1?.lastUpdate.getTime()
        const lastUpdate2 = context2?.lastUpdate.getTime()

        if (lastUpdate1 == null && lastUpdate2 == null) return card2.modifiedOn - card1.modifiedOn
        if (lastUpdate1 == null) return 1
        if (lastUpdate2 == null) return -1

        return lastUpdate2 - lastUpdate1
      })
    }

    return cards
  }
</script>

{#if !isLoading}
  {#if !empty || config.hideEmpty !== true || config.fixedTypes?.includes(type._id)}
    <NavigatorType
      {type}
      {config}
      {space}
      {selectedType}
      {empty}
      active={sortedCards.some((it) => it._id === selectedCard)}
      on:selectType
      on:selectCard
    >
      {#each sortedCards as card (card._id)}
        {@const context = contextByCard.get(card._id)}
        {@const favorite = favorites.find((fav) => fav.attachedTo === card._id)}
        <NavigatorCard type={type._id} {card} {context} {favorite} {applicationId} {selectedCard} on:selectCard />
      {/each}

      <svelte:fragment slot="visible" let:isOpen>
        {@const visibleItem = sortedCards.find(({ _id }) => _id === selectedCard)}
        {#if visibleItem !== undefined && !isOpen}
          {@const context = contextByCard.get(visibleItem._id)}
          {@const favorite = favorites.find((fav) => fav.attachedTo === visibleItem._id)}
          <NavigatorCard card={visibleItem} {context} {favorite} {applicationId} {selectedCard} on:selectCard />
        {/if}
      </svelte:fragment>

      {#if hasMore}
        <div class="all-button">
          <Button
            label={getEmbeddedLabel('More')}
            kind={'ghost'}
            on:click={(e) => {
              e.stopPropagation()
              e.preventDefault()
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
