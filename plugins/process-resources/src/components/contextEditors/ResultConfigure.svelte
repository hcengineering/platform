<!--
//
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
  import core, { Class, PropertyType, Ref, Type } from '@hcengineering/core'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { State } from '@hcengineering/process'
  import { clearSettingsStore } from '@hcengineering/setting-resources'
  import setting from '@hcengineering/setting-resources/src/plugin'
  import {
    AnyComponent,
    ButtonBase,
    Component,
    DropdownIntlItem,
    DropdownLabelsIntl,
    Label,
    Modal
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import plugin from '../../plugin'

  export let state: State

  let type: Type<any> | undefined | null = state.resultType
  let is: AnyComponent | undefined
  const client = getClient()
  const hierarchy = client.getHierarchy()

  async function save (): Promise<void> {
    if (type === undefined) return

    await client.update(state, { resultType: type })
    clearSettingsStore()
  }

  async function onDelete (): Promise<void> {
    await client.update(state, { resultType: null })
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
  }
</script>

<Modal
  label={plugin.string.Result}
  type={'type-aside'}
  okLabel={presentation.string.Save}
  okAction={save}
  canSave={!(type === undefined)}
  onCancel={() => {
    clearSettingsStore()
  }}
>
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
          isCard: true,
          kind: 'regular',
          size: 'large'
        }}
        on:change={handleChange}
      />
    {/if}
  </div>

  <div slot="buttons">
    <ButtonBase
      type={'type-button'}
      kind={'negative'}
      size={'large'}
      label={plugin.string.NoResultRequired}
      on:click={onDelete}
    />
  </div>
</Modal>
