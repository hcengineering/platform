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
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { NavItem } from '@hcengineering/ui'
  import { showMenu, NavLink } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import card from '../plugin'

  export let classes: Ref<Class<Doc>>[] = []
  export let _class: Ref<Class<Doc>> | undefined
  export let level: number = 0

  const client = getClient()
  const dispatch = createEventDispatcher()
  let descendants = new Map<Ref<Class<Doc>>, Ref<Class<Doc>>[]>()

  function getDescendants (_class: Ref<Class<Doc>>): Ref<Class<Doc>>[] {
    const hierarchy = client.getHierarchy()
    const result: Ref<Class<Doc>>[] = []
    const desc = hierarchy.getDescendants(_class)
    for (const clazz of desc) {
      const cls = hierarchy.getClass(clazz)
      if (cls.extends === _class) {
        result.push(clazz)
      }
    }
    return result
  }

  function fillDescendants (classes: Ref<Class<Doc>>[]): void {
    for (const cl of classes) {
      descendants.set(cl, getDescendants(cl))
    }
    descendants = descendants
  }

  const query = createQuery()
  query.query(card.class.MasterTag, {}, () => {
    fillDescendants(classes)
  })

  $: fillDescendants(classes)
</script>

{#each classes as cl}
  {@const clazz = client.getHierarchy().getClass(cl)}
  <NavLink space={cl}>
    <NavItem
      _id={clazz._id}
      label={clazz.label}
      isFold
      empty
      {level}
      selected={cl === _class}
      on:click={() => {
        dispatch('select', cl)
      }}
      on:contextmenu={(evt) => {
        showMenu(evt, { object: clazz })
      }}
    />
  </NavLink>
  {#if (descendants.get(cl)?.length ?? 0) > 0}
    <svelte:self classes={descendants.get(cl) ?? []} {_class} level={level + 1} on:select />
  {/if}
{/each}
