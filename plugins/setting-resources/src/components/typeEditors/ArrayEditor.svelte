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
  import core, { ArrOf, Class, Doc, Ref, Type } from '@hcengineering/core'
  import { ArrOf as createArrOf } from '@hcengineering/model'
  import { getClient } from '@hcengineering/presentation'
  import { AnyComponent, Component, DropdownLabelsIntl, Label } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import setting from '../../plugin'

  export let type: ArrOf<Doc> | undefined
  export let editable: boolean = true

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const descendants = hierarchy.getDescendants(core.class.Type)

  const types: Class<Type<Doc>>[] = descendants
    .map((p) => hierarchy.getClass(p))
    .filter((p) => {
      return (
        hierarchy.hasMixin(p, view.mixin.ArrayEditor) &&
        hierarchy.hasMixin(p, view.mixin.ObjectEditor) &&
        p.label !== undefined
      )
    })

  let refClass: Ref<Doc> | undefined = type !== undefined ? hierarchy.getClass(type.of._class)._id : undefined

  $: selected = types.find((p) => p._id === refClass)

  const handleChange = (e: any) => {
    const type = e.detail?.type
    const res = { type: createArrOf(type) }
    dispatch('change', res)
  }

  function getComponent (selected: Class<Type<Doc>>): AnyComponent {
    const editor = hierarchy.as(selected, view.mixin.ObjectEditor)
    return editor.editor
  }
</script>

<div class="flex-col">
  <div class="flex-row-center flex-grow">
    <Label label={setting.string.Type} />
    <div class="ml-4">
      {#if editable}
        <DropdownLabelsIntl
          label={core.string.Class}
          items={types.map((p) => {
            return { id: p._id, label: p.label }
          })}
          width="8rem"
          bind:selected={refClass}
        />
      {:else if selected}
        <Label label={selected.label} />
      {/if}
    </div>
  </div>
  {#if selected}
    <div class="flex mt-4">
      <Component
        is={getComponent(selected)}
        props={{
          type: type?.of,
          editable
        }}
        on:change={handleChange}
      />
    </div>
  {/if}
</div>
