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
  import core, { Class, generateId, PropertyType, Ref, Space, Type } from '@anticrm/core'
  import presentation, { getClient } from '@anticrm/presentation'
  import { AnyComponent, EditBox, DropdownLabelsIntl, Label, Component, Button } from '@anticrm/ui'
  import { DropdownIntlItem } from '@anticrm/ui/src/types'
  import { createEventDispatcher } from 'svelte'
  import view from '../plugin'
  import { getEmbeddedLabel } from '@anticrm/platform'

  export let _class: Ref<Class<Space>>
  let name: string
  let type: Type<PropertyType> | undefined
  let is: AnyComponent | undefined
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  async function save (): Promise<void> {
    if (type === undefined) return
    await client.createDoc(core.class.Attribute, core.space.Model, {
      attributeOf: _class,
      name: name + generateId(),
      label: getEmbeddedLabel(name),
      isCustom: true,
      type
    })
    dispatch('close')
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
  let selectedType: Ref<Class<Type<PropertyType>>>

  $: selectedType && selectType(selectedType)

  function selectType (type: Ref<Class<Type<PropertyType>>>): void {
    const _class = hierarchy.getClass(type)
    const editor = hierarchy.as(_class, view.mixin.ObjectEditor)
    if (editor.editor !== undefined) {
      is = editor.editor
    }
  }
</script>

<div class="antiPopup w-60 p-4 flex-col">
  <div class="mb-2"><EditBox bind:value={name} placeholder={core.string.Name} maxWidth="13rem" /></div>
  <div class="flex-between mb-2">
    <Label label={view.string.Type} />
    <DropdownLabelsIntl
      label={view.string.Type}
      {items}
      width="8rem"
      bind:selected={selectedType}
      on:selected={(e) => selectType(e.detail)}
    />
  </div>
  {#if is}
    <Component
      {is}
      on:change={(e) => {
        type = e.detail
      }}
    />
  {/if}
  <div class="mt-2">
    <Button
      width="100%"
      disabled={type === undefined || name === undefined || name.trim().length === 0}
      label={presentation.string.Create}
      on:click={() => {
        save()
      }}
    />
  </div>
</div>

<style lang="scss">
</style>
