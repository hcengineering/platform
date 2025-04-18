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
  import card, { MasterTag, Card } from '@hcengineering/card'
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/communication-types'

  import NavigatorCards from './NavigatorCards.svelte'
  import type { NavigatorConfig } from './types'
  import NavigatorType from './NavigatorType.svelte'

  export let types: MasterTag[] = []
  export let labels: Label[] = []
  export let level: number = 0
  export let config: NavigatorConfig
  export let selectedType: Ref<MasterTag> | undefined = undefined
  export let selectedCard: Ref<Card> | undefined = undefined

  const client = getClient()

  let descendants = new Map<Ref<Class<Doc>>, MasterTag[]>()

  function getDescendants (_class: Ref<MasterTag>): MasterTag[] {
    const hierarchy = client.getHierarchy()
    const result: MasterTag[] = []
    const desc = hierarchy.getDescendants(_class)
    for (const clazz of desc) {
      const cls = hierarchy.getClass(clazz)
      if (cls.extends === _class && cls._class === card.class.MasterTag) {
        result.push(cls)
      }
    }
    return result.sort((a, b) => a.label.localeCompare(b.label))
  }

  function fillDescendants (classes: MasterTag[]): void {
    for (const cl of classes) {
      descendants.set(cl._id, getDescendants(cl._id))
    }
    descendants = descendants
  }

  $: fillDescendants(types)

  let sortedTypes: MasterTag[] = []
  $: sortedTypes = types.sort((a, b) => a.label.localeCompare(b.label))
</script>

{#if config.maxDepth === undefined || config.maxDepth > 0}
  {#each sortedTypes as type (type._id)}
    <NavigatorType
      {type}
      {labels}
      {level}
      {config}
      {selectedType}
      {selectedCard}
      {descendants}
      on:selectType
      on:selectCard
      on:empty
    />
  {/each}
{:else if config.cardOptions.enabled}
  <NavigatorCards {types} {config} {labels} isLeaf {selectedCard} on:selectCard />
{/if}
