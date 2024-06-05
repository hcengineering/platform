<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Class, ClassifierKind, Doc, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { NavItem } from '@hcengineering/ui'
  import { showMenu } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import settings from '../plugin'

  export let classes: Ref<Class<Doc>>[] = ['contact:class:Contact' as Ref<Class<Doc>>]
  export let _class: Ref<Class<Doc>> | undefined
  export let ofClass: Ref<Class<Doc>> | undefined
  export let level: number = 0

  const client = getClient()
  const dispatch = createEventDispatcher()

  function getDescendants (_class: Ref<Class<Doc>>): Ref<Class<Doc>>[] {
    const hierarchy = client.getHierarchy()
    const result: Ref<Class<Doc>>[] = []
    const desc = hierarchy.getDescendants(_class)
    const vars = [ClassifierKind.MIXIN]
    if (ofClass === undefined) {
      vars.push(ClassifierKind.CLASS)
    }
    for (const clazz of desc) {
      const cls = hierarchy.getClass(clazz)
      if (
        cls.extends === _class &&
        !cls.hidden &&
        vars.includes(cls.kind) &&
        cls.label !== undefined &&
        (!hierarchy.hasMixin(cls, settings.mixin.Editable) || hierarchy.as(cls, settings.mixin.Editable).value)
      ) {
        result.push(clazz)
      }
    }
    return result
  }
</script>

{#each classes as cl}
  {@const clazz = client.getHierarchy().getClass(cl)}
  {@const desc = getDescendants(cl)}
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
  {#if desc.length}
    <svelte:self classes={desc} {_class} level={level + 1} on:select />
  {/if}
{/each}
