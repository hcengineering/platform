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
  import card, { CardSpace, MasterTag } from '@hcengineering/card'
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'

  import type { TypesNavigatorConfig } from '../../types'
  import NavigatorType from './NavigatorType.svelte'

  export let types: MasterTag[] = []
  export let level: number = 0
  export let config: TypesNavigatorConfig
  export let space: CardSpace | undefined = undefined
  export let selectedType: Ref<MasterTag> | undefined = undefined

  const client = getClient()

  let descendants = new Map<Ref<Class<Doc>>, MasterTag[]>()

  function getDescendants (_class: Ref<MasterTag>): MasterTag[] {
    const hierarchy = client.getHierarchy()
    const result: MasterTag[] = []
    const desc = hierarchy.getDescendants(_class)
    for (const clazz of desc) {
      const type = hierarchy.getClass(clazz) as MasterTag
      if (type.extends === _class && type._class === card.class.MasterTag && type.removed !== true) {
        result.push(type)
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
</script>

{#if config.hierarchyDepth === undefined || config.hierarchyDepth > 0}
  {#each types as type (type._id)}
    {@const typeDescendants = descendants.get(type._id) ?? []}
    {@const empty =
      typeDescendants.length === 0 || (config.hierarchyDepth !== undefined && level + 1 >= config.hierarchyDepth)}
    <NavigatorType {type} {level} {config} {space} {selectedType} {empty} on:selectType on:selectCard>
      {#if !empty}
        <svelte:self
          types={typeDescendants}
          level={level + 1}
          {space}
          {selectedType}
          {config}
          on:selectType
          on:selectCard
        />
      {/if}
    </NavigatorType>
  {/each}
{/if}
