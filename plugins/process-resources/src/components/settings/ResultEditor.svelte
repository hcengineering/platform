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
  import core, { Class, Doc, PropertyType, Ref, Type } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Step } from '@hcengineering/process'
  import setting from '@hcengineering/setting-resources/src/plugin'
  import {
    AnyComponent,
    Component,
    DropdownIntlItem,
    DropdownLabelsIntl,
    EditBox,
    Label,
    Toggle
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import { generateContextId } from '../../utils'

  export let step: Step<Doc>

  let type: Type<any> | undefined | null = step.result?.type
  let name: string = step.result?.name ?? ''
  let is: AnyComponent | undefined
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  function update (): void {
    if (type == null) {
      step.result = undefined
    } else {
      step.result = {
        _id: generateContextId(),
        name,
        type
      }
    }
    dispatch('change', step)
  }

  function getTypes (): DropdownIntlItem[] {
    const descendants = hierarchy.getDescendants(core.class.Type)
    const res: DropdownIntlItem[] = []
    for (const descendant of descendants) {
      const _class = hierarchy.getClass(descendant)
      if (_class.label !== undefined && hierarchy.hasMixin(_class, view.mixin.ObjectEditor)) {
        res.push({
          label: _class.label,
          id: _class._id
        })
      }
    }
    return res
  }
  const items = getTypes()
  let selectedType: Ref<Class<Type<PropertyType>>> | undefined = type?._class
  $: selectType(selectedType)
  function selectType (type: Ref<Class<Type<PropertyType>>> | undefined): void {
    if (type == null) return
    const _class = hierarchy.getClass(type)
    const editor = hierarchy.as(_class, view.mixin.ObjectEditor)
    if (editor.editor !== undefined) {
      is = editor.editor
    }
  }
  const handleSelection = (e: { detail: Ref<Class<Type<any>>> }): void => {
    selectType(e.detail)
  }
  const handleChange = (e: any): void => {
    type = e.detail?.type
    update()
  }

  function changeRequired (e: boolean): void {
    if (!e) {
      type = undefined
    } else {
      type = null
    }
    update()
  }
</script>

<div class="grid">
  <Label label={plugin.string.Result} />
  <Toggle
    on={step.result !== undefined}
    on:change={(e) => {
      changeRequired(e.detail)
    }}
  />
  {#if type !== undefined}
    <span class="label">
      <Label label={core.string.Description} />
    </span>
    <EditBox bind:value={name} placeholder={core.string.Description} on:change={handleChange} kind={'default'} />
    <span class="label">
      <Label label={setting.string.Type} />
    </span>
    <DropdownLabelsIntl
      label={setting.string.Type}
      {items}
      size={'large'}
      width={'100%'}
      bind:selected={selectedType}
      on:selected={handleSelection}
    />
    {#if is}
      <Component
        {is}
        props={{
          type,
          width: '100%',
          isCard: true,
          kind: 'regular',
          size: 'large'
        }}
        on:change={handleChange}
      />
    {/if}
  {/if}
</div>

<style lang="scss">
  .grid {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    grid-auto-rows: minmax(2rem, max-content);
    justify-content: start;
    align-items: center;
    row-gap: 0.5rem;
    column-gap: 1rem;
    margin: 0.25rem 2rem 0;
    width: calc(100% - 4rem);
    height: min-content;
  }
</style>
