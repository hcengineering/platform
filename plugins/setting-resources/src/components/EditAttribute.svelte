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
  import presentation, { getClient } from '@hcengineering/presentation'
  import setting from '../plugin'
  import {
    AnyComponent,
    Component,
    DropdownLabelsIntl,
    ModernEditbox,
    Label,
    themeStore,
    Modal,
    ButtonIcon,
    IconDelete,
    IconCopy
  } from '@hcengineering/ui'
  import { clearSettingsStore } from '../store'
  import { getTypeEditor, getTypes } from '../utils'

  export let attribute: AnyAttribute
  export let exist: boolean
  let name: string
  let type: Type<PropertyType> | undefined = attribute.type
  let index: IndexKind | undefined = attribute.index
  let defaultValue: any | undefined = attribute.defaultValue
  let is: AnyComponent | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  void translate(attribute.label, {}, $themeStore.language).then((p) => (name = p))

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
    clearSettingsStore()
  }

  const items = getTypes(hierarchy).map(({ label, _id }) => ({ label, id: _id }))
  let selectedType: Ref<Class<Type<PropertyType>>> = attribute.type._class

  $: selectedType && selectType(selectedType)

  function selectType (type: Ref<Class<Type<PropertyType>>>): void {
    is = getTypeEditor(hierarchy, type) ?? is
  }
  const handleSelect = (e: any): void => {
    selectType(e.detail)
  }
  const handleChange = (e: any): void => {
    type = e.detail?.type
    index = e.detail?.index
    defaultValue = e.detail?.defaultValue
  }
</script>

<Modal
  label={setting.string.EditAttribute}
  type={'type-aside'}
  okLabel={presentation.string.Save}
  okAction={save}
  canSave={!(name === undefined || name.trim().length === 0)}
  onCancel={() => {
    clearSettingsStore()
  }}
>
  <svelte:fragment slot="actions">
    <ButtonIcon icon={IconDelete} size={'small'} kind={'tertiary'} />
    <ButtonIcon icon={IconCopy} size={'small'} kind={'tertiary'} />
  </svelte:fragment>
  <div class="hulyModal-content__titleGroup">
    {#if attribute.isCustom}
      <div class="hulyChip-item font-medium-12">
        <Label label={setting.string.Custom} />
      </div>
    {/if}
    <ModernEditbox bind:value={name} label={core.string.Name} size={'large'} kind={'ghost'} />
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
        />
      {/if}
    </div>
    {#if is}
      <Component
        {is}
        props={{
          type,
          defaultValue,
          editable: !exist,
          kind: 'regular',
          size: 'large'
        }}
        on:change={handleChange}
      />
    {/if}
  </div>
</Modal>
