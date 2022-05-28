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
  import { Class, ClassifierKind, Doc, Ref } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { Label } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  export let classes: Ref<Class<Doc>>[] = ['contact:class:Contact' as Ref<Class<Doc>>]
  export let _class: Ref<Class<Doc>> | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  function getDescendants (_class: Ref<Class<Doc>>): Ref<Class<Doc>>[] {
    const result: Ref<Class<Doc>>[] = []
    const desc = hierarchy.getDescendants(_class)
    for (const clazz of desc) {
      const cls = hierarchy.getClass(clazz)
      if (
        cls.extends === _class &&
        !cls.hidden &&
        [ClassifierKind.CLASS, ClassifierKind.MIXIN].includes(cls.kind) &&
        cls.label !== undefined
      ) {
        result.push(clazz)
      }
    }
    return result
  }
</script>

{#each classes as cl}
  {@const clazz = hierarchy.getClass(cl)}
  {@const desc = getDescendants(cl)}
  <div
    class="ac-column__list-item"
    class:selected={cl === _class}
    on:click={() => {
      dispatch('select', cl)
    }}
  >
    <Label label={clazz.label} />
  </div>
  {#if desc.length}
    <div class="ml-2 mt-3 mb-3">
      <svelte:self classes={desc} {_class} on:select />
    </div>
  {/if}
{/each}
