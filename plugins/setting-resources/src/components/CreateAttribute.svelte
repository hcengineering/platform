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
  import core, {
    AnyAttribute,
    Class,
    Data,
    Doc,
    generateId,
    IndexKind,
    PropertyType,
    Ref,
    Type
  } from '@hcengineering/core'
  import { Asset, getEmbeddedLabel } from '@hcengineering/platform'
  import presentation, { getClient } from '@hcengineering/presentation'
  import {
    AnyComponent,
    Component,
    DropdownLabelsIntl,
    ModernEditbox,
    Label,
    Modal,
    ButtonIcon,
    IconDelete,
    IconCopy,
    showPopup
  } from '@hcengineering/ui'
  import { DropdownIntlItem } from '@hcengineering/ui/src/types'
  import setting from '../plugin'
  import view from '@hcengineering/view'
  import { clearSettingsStore } from '../store'
  import { IconPicker } from '@hcengineering/view-resources'

  export let _id: Ref<Class<Type<PropertyType>>> | undefined = undefined
  export let _class: Ref<Class<Doc>>
  export let isCard: boolean = false

  let name: string
  let icon: Asset | undefined
  let type: Type<PropertyType> | undefined
  let index: IndexKind | undefined
  let defaultValue: any | undefined
  let is: AnyComponent | undefined
  const client = getClient()
  const hierarchy = client.getHierarchy()

  async function save (): Promise<void> {
    if (type === undefined) return

    const data: Data<AnyAttribute> = {
      attributeOf: _class,
      name: 'custom' + generateId(),
      label: getEmbeddedLabel(name),
      icon,
      isCustom: true,
      type,
      defaultValue
    }
    if (index !== undefined) {
      data.index = index
    }
    await client.createDoc(core.class.Attribute, core.space.Model, data)
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
  export let selectedType: Ref<Class<Type<PropertyType>>> | undefined = undefined

  $: selectType(selectedType)

  function selectType (type: Ref<Class<Type<PropertyType>>> | undefined): void {
    if (type === undefined) return
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
    index = e.detail?.index
    defaultValue = e.detail?.defaultValue
  }

  function setIcon (): void {
    showPopup(IconPicker, { icon, showEmoji: false, showColor: false }, 'top', async (res) => {
      if (res !== undefined) {
        icon = res.icon
      }
    })
  }
</script>

<Modal
  label={setting.string.CreatingAttribute}
  type={'type-aside'}
  okLabel={presentation.string.Create}
  okAction={save}
  canSave={!(type === undefined || name === undefined || name.trim().length === 0)}
  onCancel={() => {
    clearSettingsStore()
  }}
>
  <svelte:fragment slot="actions">
    <ButtonIcon icon={IconDelete} size={'small'} kind={'tertiary'} />
    <ButtonIcon icon={IconCopy} size={'small'} kind={'tertiary'} />
  </svelte:fragment>
  <div class="hulyModal-content__titleGroup">
    <div class="hulyChip-item font-medium-12">
      <Label label={setting.string.Custom} />
    </div>
    <div class="flex items-center">
      <ButtonIcon
        icon={icon ?? setting.icon.Enums}
        size={'medium'}
        iconSize={'large'}
        kind={'tertiary'}
        on:click={setIcon}
      />
      <ModernEditbox bind:value={name} label={core.string.Name} size={'large'} kind={'ghost'} autoFocus />
    </div>
  </div>
  <div class="hulyModal-content__settingsSet">
    <div class="hulyModal-content__settingsSet-line">
      <span class="label">
        <Label label={setting.string.Type} />
      </span>
      <DropdownLabelsIntl
        label={setting.string.Type}
        {items}
        size={'large'}
        width="8rem"
        bind:selected={selectedType}
        on:selected={handleSelection}
      />
    </div>
    {#if is}
      <Component
        {is}
        props={{
          type,
          defaultValue,
          isCard,
          kind: 'regular',
          size: 'large'
        }}
        on:change={handleChange}
      />
    {/if}
  </div>
</Modal>
