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
  import { getEventPositionElement, Icon, IconAdd, Label, showPopup } from '@hcengineering/ui'
  import { ContextMenu } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import settings from '../plugin'

  export let classes: Ref<Class<Doc>>[] = ['contact:class:Contact' as Ref<Class<Doc>>]
  export let _class: Ref<Class<Doc>> | undefined
  export let ofClass: Ref<Class<Doc>> | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  function getDescendants (_class: Ref<Class<Doc>>): Ref<Class<Doc>>[] {
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
  function showContextMenu (evt: MouseEvent, clazz: Class<Doc>): void {
    showPopup(ContextMenu, { object: clazz }, getEventPositionElement(evt))
  }
</script>

{#each classes as cl}
  {@const clazz = hierarchy.getClass(cl)}
  {@const desc = getDescendants(cl)}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="ac-column__list-item"
    class:ac-column__list-selected={cl === _class}
    on:click={() => {
      dispatch('select', cl)
    }}
    on:contextmenu|preventDefault|stopPropagation={(evt) => showContextMenu(evt, clazz)}
  >
    <div class="flex gap-2">
      {#if clazz.icon}
        <div class="mr-2 flex">
          <Icon icon={clazz.icon} size={'medium'} />
          {#if clazz.kind === ClassifierKind.MIXIN && hierarchy.hasMixin(clazz, settings.mixin.UserMixin)}
            <Icon icon={IconAdd} size={'x-small'} fill={'var(--theme-dark-color)'} />
          {/if}
        </div>
      {/if}
      <span class="overflow-label caption-color"><Label label={clazz.label} /></span>
    </div>
  </div>
  {#if desc.length}
    <div class="ml-8 mt-3 mb-3">
      <svelte:self classes={desc} {_class} on:select />
    </div>
  {/if}
{/each}
