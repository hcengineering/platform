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
  import core, { AnyAttribute, Class, DocumentUpdate, IndexKind, PropertyType, Ref, Type } from '@hcengineering/core'
  import { getEmbeddedLabel, translate } from '@hcengineering/platform'
  import presentation, { Card, getClient } from '@hcengineering/presentation'
  import setting from '../plugin'
  import {
    AnyComponent,
    Component,
    DropdownIntlItem,
    DropdownLabelsIntl,
    EditBox,
    Label,
    themeStore
  } from '@hcengineering/ui'
  import view from '@hcengineering/view-resources/src/plugin'
  import { createEventDispatcher } from 'svelte'

  export let attribute: AnyAttribute
  export let exist: boolean
  let name: string
  let type: Type<PropertyType> | undefined = attribute.type
  let index: IndexKind | undefined = attribute.index
  let defaultValue: any | undefined = attribute.defaultValue
  let is: AnyComponent | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  translate(attribute.label, {}, $themeStore.language).then((p) => (name = p))

  async function save (): Promise<void> {
    const update: DocumentUpdate<AnyAttribute> = {}
    const newLabel = getEmbeddedLabel(name)
    if (newLabel !== attribute.label) {
      update.label = newLabel
    }
    if (defaultValue !== attribute.defaultValue) {
      update.defaultValue = defaultValue
    }
    if (!exist) {
      if (index !== attribute.index) {
        update.index = index
      }
      if (type !== attribute.type) {
        update.type = type
      }
    }
    await client.updateDoc(attribute._class, attribute.space, attribute._id, update)
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
  let selectedType: Ref<Class<Type<PropertyType>>> = attribute.type._class

  $: selectedType && selectType(selectedType)

  function selectType (type: Ref<Class<Type<PropertyType>>>): void {
    const _class = hierarchy.getClass(type)
    const editor = hierarchy.as(_class, view.mixin.ObjectEditor)
    if (editor.editor !== undefined) {
      is = editor.editor
    }
  }
  const handleSelect = (e: any) => selectType(e.detail)
  const handleChange = (e: any) => {
    type = e.detail?.type
    index = e.detail?.index
    defaultValue = e.detail?.defaultValue
  }
</script>

<Card
  label={setting.string.EditAttribute}
  okLabel={presentation.string.Save}
  okAction={save}
  canSave={!(name === undefined || name.trim().length === 0)}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="mb-2"><EditBox bind:value={name} placeholder={core.string.Name} /></div>
  <div class="flex-col mb-2">
    <div class="flex-row-center flex-grow">
      <Label label={setting.string.Type} />
      <div class="ml-4">
        {#if exist}
          <Label label={attribute.type.label} />
        {:else}
          <DropdownLabelsIntl
            label={setting.string.Type}
            {items}
            width="8rem"
            bind:selected={selectedType}
            on:selected={handleSelect}
          />
        {/if}
      </div>
    </div>
    {#if is}
      <div class="flex mt-4">
        <Component
          {is}
          props={{
            type,
            defaultValue,
            editable: !exist
          }}
          on:change={handleChange}
        />
      </div>
    {/if}
  </div>
</Card>
