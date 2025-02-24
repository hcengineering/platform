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
  import { MasterTag } from '@hcengineering/card'
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { NavItem } from '@hcengineering/ui'
  import { NavLink, showMenu } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import card from '../plugin'

  export let classes: MasterTag[] = []
  export let allClasses: MasterTag[] = []
  export let _class: Ref<Class<Doc>> | undefined
  export let deselect: boolean = false
  export let level: number = 0

  const client = getClient()
  const dispatch = createEventDispatcher()
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
    return result
  }

  function fillDescendants (classes: MasterTag[]): void {
    for (const cl of classes) {
      descendants.set(cl._id, getDescendants(cl._id))
    }
    descendants = descendants
  }

  $: fillDescendants(allClasses)
</script>

{#each classes as clazz}
  <NavLink space={clazz._id}>
    <NavItem
      _id={clazz._id}
      label={clazz.label}
      icon={clazz.icon}
      isFold
      empty
      {level}
      selected={!deselect && clazz._id === _class}
      on:click={() => {
        dispatch('select', clazz._id)
      }}
      on:contextmenu={(evt) => {
        showMenu(evt, { object: clazz })
      }}
    />
  </NavLink>
  {#if (descendants.get(clazz._id)?.length ?? 0) > 0}
    <svelte:self classes={descendants.get(clazz._id) ?? []} {_class} level={level + 1} on:select />
  {/if}
{/each}
