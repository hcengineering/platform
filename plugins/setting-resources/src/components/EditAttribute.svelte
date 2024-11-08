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
  import { getEmbeddedLabel, getResource, translateCB } from '@hcengineering/platform'
  import presentation, { getClient } from '@hcengineering/presentation'
  import {
    AnyComponent,
    ButtonIcon,
    Component,
    DropdownIntlItem,
    DropdownLabelsIntl,
    IconDelete,
    Label,
    Modal,
    ModernEditbox,
    themeStore
  } from '@hcengineering/ui'
  import view from '@hcengineering/view-resources/src/plugin'
  import setting from '../plugin'
  import { clearSettingsStore } from '../store'

  export let attribute: AnyAttribute
  export let exist: boolean
  export let disabled: boolean = true
  export let noTopIndent: boolean = false

  let name: string
  let type: Type<PropertyType> | undefined = attribute.type
  let index: IndexKind | undefined = attribute.index
  let defaultValue: any | undefined = attribute.defaultValue
  let is: AnyComponent | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  translateCB(attribute.label, {}, $themeStore.language, (p) => {
    name = p
  })

  async function save (): Promise<void> {
    if (disabled) {
      return
    }

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
    clearSettingsStore()
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
  const handleSelect = (e: any) => {
    selectType(e.detail)
  }
  const handleChange = (e: any) => {
    if (disabled) return
    type = e.detail?.type
    index = e.detail?.index
    defaultValue = e.detail?.defaultValue
  }

  async function remove (evt: MouseEvent): Promise<void> {
    const impl = await getResource(view.actionImpl.Delete)
    await impl(attribute, evt, {
      afterDelete: () => {
        clearSettingsStore()
      }
    })
  }

  async function hide (): Promise<void> {
    const value = !attribute.hidden
    attribute.hidden = value
    await client.update(attribute, { hidden: value })
  }
</script>

<Modal
  label={setting.string.EditAttribute}
  type={'type-aside'}
  okLabel={presentation.string.Save}
  okAction={save}
  canSave={!(name === undefined || name.trim().length === 0) && !disabled}
  onCancel={clearSettingsStore}
  {noTopIndent}
>
  <svelte:fragment slot="actions">
    {#if !disabled}
      <ButtonIcon
        icon={attribute.hidden ? view.icon.Eye : view.icon.EyeCrossed}
        size={'small'}
        kind={'tertiary'}
        {disabled}
        on:click={hide}
      />
      {#if attribute.isCustom}
        <ButtonIcon icon={IconDelete} size={'small'} kind={'tertiary'} {disabled} on:click={remove} />
      {/if}
    {/if}
  </svelte:fragment>
  <div class="hulyModal-content__titleGroup">
    {#if attribute.isCustom}
      <div class="hulyChip-item font-medium-12">
        <Label label={setting.string.Custom} />
      </div>
    {/if}
    <ModernEditbox bind:value={name} label={core.string.Name} size={'large'} kind={'ghost'} {disabled} />
  </div>
  <div class="hulyModal-content__settingsSet">
    <div class="hulyModal-content__settingsSet-line">
      <span class="label">
        <Label label={setting.string.Type} />
      </span>
      {#if exist}
        <Label label={attribute.type.label} />
      {:else}
        <DropdownLabelsIntl
          label={setting.string.Type}
          {items}
          size={'large'}
          width="8rem"
          bind:selected={selectedType}
          on:selected={handleSelect}
          {disabled}
        />
      {/if}
    </div>
    {#if is}
      <Component
        {is}
        props={{
          type,
          defaultValue,
          editable: !exist && !disabled,
          kind: 'regular',
          size: 'large'
        }}
        {disabled}
        on:change={handleChange}
      />
    {/if}
  </div>
</Modal>
