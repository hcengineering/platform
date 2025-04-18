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
  import { Scroller } from '@hcengineering/ui'
  import cardPlugin, { MasterTag, Card, CardSpace } from '@hcengineering/card'
  import { createLabelsQuery, createQuery, getClient } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/communication-types'
  import { createEventDispatcher } from 'svelte'
  import { SavedView } from '@hcengineering/workbench-resources'
  import { getCurrentAccount, SortingOrder, Ref } from '@hcengineering/core'

  import { type NavigatorConfig } from './types'
  import NavigatorSpace from './NavigatorSpace.svelte'
  import NavigatorHierarchy from './NavigatorHierarchy.svelte'

  export let config: NavigatorConfig
  export let applicationId: string
  export let selectedType: Ref<MasterTag> | undefined = undefined
  export let selectedCard: Ref<Card> | undefined = undefined

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const typesQuery = createQuery()
  const spacesQuery = createQuery()
  const labelsQuery = createLabelsQuery()

  let types: MasterTag[] = []
  let labels: Label[] = []
  let spaces: CardSpace[] = []

  const allDescendants = new Set(config.types.flatMap((it) => hierarchy.getDescendants(it)))
  const showAllTypes = config.types.includes(cardPlugin.class.Card)

  $: cardOptions = config.cardOptions

  $: typesQuery.query(
    cardPlugin.class.MasterTag,
    {
      ...(showAllTypes ? { extends: cardPlugin.class.Card } : { _id: { $in: config.types } })
    },
    (result) => {
      types = result.filter((it) => it.removed !== true)
    }
  )

  $: if (cardOptions.enabled && (cardOptions.labelFilter?.length ?? 0) > 0 && types.length > 0) {
    labelsQuery.query(
      {
        label: cardOptions.labelFilter,
        ...(showAllTypes ? {} : { cardType: Array.from(allDescendants) })
      },
      (res) => {
        labels = res
      }
    )
  } else {
    labelsQuery.unsubscribe()
    labels = []
  }

  const spaceClasses = hierarchy.getDescendants(cardPlugin.class.CardSpace).filter((it) => !hierarchy.isMixin(it))

  $: if (config.groupBySpace && spaceClasses.length > 0) {
    spacesQuery.query<CardSpace>(
      spaceClasses.length === 1 ? spaceClasses[0] : cardPlugin.class.CardSpace,
      {
        ...(spaceClasses.length === 1 ? {} : { _class: { $in: spaceClasses } }),
        members: getCurrentAccount().uuid,
        archived: false
      },
      (result) => {
        spaces = result
      },
      { sort: { name: SortingOrder.Ascending } }
    )
  } else {
    spacesQuery.unsubscribe()
    spaces = []
  }

  function selectType (event: CustomEvent<MasterTag>): void {
    selectedType = event.detail._id
    selectedCard = undefined

    dispatch('selectType', event.detail)
  }

  function selectCard (event: CustomEvent<Card>): void {
    selectedCard = event.detail._id
    selectedType = undefined

    dispatch('selectCard', event.detail)
  }
</script>

<Scroller shrink>
  <div class="navigator">
    {#if config.savedViews}
      <SavedView alias={applicationId} />
    {/if}
    {#if config.groupBySpace}
      {#each spaces as space (space._id)}
        <NavigatorSpace
          {space}
          {types}
          {config}
          {selectedType}
          {selectedCard}
          {labels}
          on:selectType={selectType}
          on:selectCard={selectCard}
        />
      {/each}
    {:else}
      <NavigatorHierarchy
        {types}
        {config}
        {selectedType}
        {selectedCard}
        {labels}
        on:selectType={selectType}
        on:selectCard={selectCard}
      />
    {/if}
  </div>
</Scroller>

<style lang="scss">
  .navigator {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 1rem 0.5rem;
  }
</style>
