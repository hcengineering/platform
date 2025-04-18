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
  import view from '@hcengineering/view'
  import { IconWithEmoji } from '@hcengineering/ui'
  import { Label } from '@hcengineering/communication-types'
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { createEventDispatcher } from 'svelte'
  import { Card, MasterTag } from '@hcengineering/card'
  import { Section } from '@hcengineering/ui-next'

  import NavigatorCards from './NavigatorCards.svelte'
  import type { NavigatorConfig } from './types'
  import NavigatorHierarchy from './NavigatorHierarchy.svelte'

  export let type: MasterTag
  export let labels: Label[] = []
  export let level: number = 0
  export let config: NavigatorConfig
  export let selectedType: Ref<MasterTag> | undefined = undefined
  export let selectedCard: Ref<Card> | undefined = undefined
  export let descendants = new Map<Ref<Class<Doc>>, MasterTag[]>()

  const dispatch = createEventDispatcher()

  let cardsTotal: number = 0
  $: cardOptions = config.cardOptions
  $: isLeaf =
    (descendants.get(type._id)?.length ?? 0) === 0 || (config.maxDepth !== undefined && level + 1 >= config.maxDepth)

  let childEmptyMap = new Map<Ref<MasterTag>, boolean>()

  function handleChildEmpty (event: CustomEvent<{ typeId: Ref<MasterTag>, empty: boolean }>): void {
    const { typeId, empty } = event.detail
    childEmptyMap.set(typeId, empty)
    childEmptyMap = childEmptyMap
  }

  $: hasChildTypes = childEmptyMap.size > 0 && (descendants.get(type._id) ?? []).some((child) => childEmptyMap.get(child._id) !== true)
  $: empty = cardsTotal === 0 && !hasChildTypes

  $: dispatch('empty', { typeId: type._id, empty })

  $: hideEmpty = cardOptions.enabled && cardOptions.hideEmptyTypes
</script>

{#if !empty || !hideEmpty}
  <Section
    id={type._id}
    title={type.label}
    {level}
    selected={selectedType === type._id}
    icon={type.icon === view.ids.IconWithEmoji ? IconWithEmoji : type.icon}
    iconProps={type.icon === view.ids.IconWithEmoji ? { icon: type.color } : {}}
    {empty}
    on:click={() => {
      dispatch('selectType', type)
    }}
  >
    {#if cardOptions.enabled}
      <NavigatorCards
        {labels}
        level={level + 1}
        types={[type]}
        {isLeaf}
        {config}
        {selectedCard}
        bind:total={cardsTotal}
        on:selectCard
      />
    {/if}
    {#if !isLeaf}
      <NavigatorHierarchy
        types={descendants.get(type._id) ?? []}
        level={level + 1}
        {selectedType}
        {selectedCard}
        {config}
        {labels}
        on:empty={handleChildEmpty}
        on:selectType
        on:selectCard
      />
    {/if}
  </Section>
{/if}
