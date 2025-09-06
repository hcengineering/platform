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
  import cardPlugin, { Card, CardSpace, FavoriteCard, MasterTag } from '@hcengineering/card'
  import { Ref, WithLookup } from '@hcengineering/core'
  import { createQuery, createNotificationContextsQuery, getClient } from '@hcengineering/presentation'
  import view from '@hcengineering/view'
  import { Label, NotificationContext, NotificationType, SortingOrder } from '@hcengineering/communication-types'
  import { NavGroup } from '@hcengineering/ui'
  import preference from '@hcengineering/preference'
  import { createEventDispatcher } from 'svelte'
  import { labelsStore } from '@hcengineering/communication-resources'

  import type { CardsNavigatorConfig } from '../../types'
  import NavigatorCard from './NavigatorCard.svelte'
  import NavigatorCardsSection from './NavigatorCardsSection.svelte'

  export let types: MasterTag[] = []
  export let config: CardsNavigatorConfig
  export let applicationId: string
  export let space: CardSpace | undefined = undefined
  export let selectedType: Ref<MasterTag> | undefined = undefined
  export let selectedCard: Ref<Card> | undefined = undefined
  export let selectedSpecial: string | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()
  const favoritesQuery = createQuery()
  const contextsQuery = createNotificationContextsQuery()

  let favorites: WithLookup<FavoriteCard>[] = []
  let contexts: NotificationContext[] = []

  let labels: Label[] = []
  $: labels = config.labelFilter ? $labelsStore.filter((it) => (config.labelFilter ?? []).includes(it.labelId)) : []

  $: favoritesQuery.query(
    cardPlugin.class.FavoriteCard,
    { application: applicationId },
    (res) => {
      favorites = res
        .filter((it) => it.$lookup?.attachedTo != null)
        .sort((a, b) => {
          const aTitle = a.$lookup?.attachedTo?.title ?? ''
          const bTitle = b.$lookup?.attachedTo?.title ?? ''
          return aTitle.localeCompare(bTitle)
        })
    },
    {
      lookup: {
        attachedTo: cardPlugin.class.Card
      }
    }
  )

  $: if (favorites.length > 0) {
    contextsQuery.query(
      {
        card: favorites.map((it) => it.attachedTo),
        notifications: {
          read: false,
          type: NotificationType.Message,
          order: SortingOrder.Descending,
          limit: 1,
          total: true
        }
      },
      (res) => {
        contexts = res.getResult()
      }
    )
  } else {
    contexts = []
    contextsQuery.unsubscribe()
  }

  function getCard (favorite: WithLookup<FavoriteCard>): Card | undefined {
    return favorite.$lookup?.attachedTo
  }
</script>

{#if favorites.length > 0}
  {@const active = favorites.some((it) => it.attachedTo === selectedCard)}
  <NavGroup
    _id="favorites"
    categoryName="favorites"
    icon={config.showTypeIcon ? view.icon.Star : undefined}
    label={preference.string.Starred}
    highlighted={active}
    type="selectable-header"
    isFold
    empty={false}
    visible={active}
    selected={selectedSpecial === 'favorites'}
    noDivider
    on:click={(e) => {
      e.stopPropagation()
      e.preventDefault()
      dispatch('favorites')
    }}
  >
    <div class="mt-0-5" />
    {#each favorites as favorite (favorite.attachedTo)}
      {@const card = getCard(favorite)}
      {#if card}
        {@const context = contexts.find((it) => it.cardId === card._id)}
        <NavigatorCard {card} {context} {favorite} {applicationId} {selectedCard} {config} on:selectCard />
      {/if}
    {/each}

    <svelte:fragment slot="visible" let:isOpen>
      {@const visibleItem = favorites.find(({ attachedTo }) => attachedTo === selectedCard)}
      {#if visibleItem !== undefined && !isOpen}
        {@const card = getCard(visibleItem)}
        {#if card}
          {@const context = contexts.find((it) => it.cardId === card._id)}
          <NavigatorCard
            {card}
            {context}
            favorite={visibleItem}
            {applicationId}
            {selectedCard}
            {config}
            on:selectCard
          />
        {/if}
      {/if}
    </svelte:fragment>
  </NavGroup>
{/if}
{#each types as type (type._id)}
  <NavigatorCardsSection
    {type}
    {space}
    {config}
    {selectedType}
    {selectedCard}
    {applicationId}
    labels={labels.filter((it) => hierarchy.isDerived(it.cardType, type._id))}
    {favorites}
    on:selectType
    on:selectCard
  />
{/each}
