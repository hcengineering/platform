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
  import { Ref } from '@hcengineering/core'

  import type { NavigatorConfig } from '../../types'
  import NavigatorHierarchy from './NavigatorHierarchy.svelte'
  import NavigatorCards from './NavigatorCards.svelte'
  import { sortNavigatorTypes } from '../../utils'

  export let types: MasterTag[] = []
  export let level: number = 0
  export let config: NavigatorConfig
  export let applicationId: string
  export let space: CardSpace | undefined = undefined
  export let selectedType: Ref<MasterTag> | undefined = undefined
  export let selectedCard: Ref<Card> | undefined = undefined
  export let selectedSpecial: string | undefined = undefined

  $: sortedTypes = sortNavigatorTypes(types, config)
</script>

{#if config.variant === 'types'}
  <NavigatorHierarchy types={sortedTypes} {level} {space} {config} {selectedType} on:selectType on:selectCard />
{/if}

{#if config.variant === 'cards'}
  <NavigatorCards
    types={sortedTypes}
    {space}
    {config}
    {selectedType}
    {selectedCard}
    {selectedSpecial}
    {applicationId}
    on:selectType
    on:selectCard
    on:favorites
  />
{/if}
