<!--
// Copyright © 2025 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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
  import core, { Association } from '@hcengineering/core'
  import { getEmbeddedLabel, translateCB } from '@hcengineering/platform'
  import presentation, { getClient, MessageBox } from '@hcengineering/presentation'
  import {
    Button,
    DropdownIntlItem,
    DropdownLabelsIntl,
    EditBox,
    IconDelete,
    Label,
    Modal,
    showPopup,
    themeStore,
    Toggle
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import setting from '../plugin'
  import { clearSettingsStore } from '../store'

  export let association: Association

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const classA = hierarchy.getClass(association.classA)
  const classB = hierarchy.getClass(association.classB)
  let nameA = association.nameA
  let nameB = association.nameB
  let mode: Association['type'] = association.type
  let description = ''
  let automationOnly = association.automationOnly ?? false

  translateCB(association.description ?? getEmbeddedLabel(''), {}, $themeStore.language, (p) => {
    description = p
  })

  async function save (): Promise<void> {
    await client.diffUpdate(association, {
      nameA,
      nameB,
      type: mode,
      description: description.trim().length > 0 ? getEmbeddedLabel(description.trim()) : undefined,
      automationOnly
    })
    clearSettingsStore()
  }

  const items: DropdownIntlItem[] = [
    {
      id: '1:1',
      label: getEmbeddedLabel('1:1')
    },
    {
      id: '1:N',
      label: getEmbeddedLabel('1:N')
    },
    {
      id: 'N:N',
      label: getEmbeddedLabel('N:N')
    }
  ]

  async function remove (): Promise<void> {
    showPopup(MessageBox, {
      label: view.string.DeleteObject,
      message: view.string.DeleteObjectConfirm,
      params: { count: 1 },
      dangerous: true,
      action: async () => {
        await client.remove(association)
        clearSettingsStore()
      }
    })
  }
</script>

<Modal
  label={core.string.Relation}
  type={'type-aside'}
  okLabel={presentation.string.Save}
  okAction={save}
  canSave={true}
  onCancel={clearSettingsStore}
>
  <svelte:fragment slot="actions">
    <Button icon={IconDelete} kind={'dangerous'} on:click={remove} />
  </svelte:fragment>
  <div class="hulyModal-content__settingsSet">
    <div class="flex-row-center items-stretch flex-gap-4 w-full p-4">
      <div class="flex-col flex-grow min-w-0 flex-gap-2" style:flex="1 1 0">
        <div class="flex-center">A</div>
        <div class="w-full">
          <EditBox bind:value={nameA} placeholder={core.string.Name} kind={'default'} maxWidth="100%" fullSize />
        </div>
        <div class="w-full">
          <Label label={classA.label} />
        </div>
      </div>

      <div class="flex-col flex-no-shrink flex-gap-2">
        <div class="flex-center">
          <Label label={setting.string.Type} />
        </div>
        <div>
          <DropdownLabelsIntl
            selected={mode}
            {items}
            on:selected={(res) => {
              mode = res.detail
            }}
          />
        </div>
        <div />
      </div>

      <div class="flex-col flex-grow min-w-0 flex-gap-2" style:flex="1 1 0">
        <div class="flex-center">B</div>
        <div class="w-full">
          <EditBox bind:value={nameB} placeholder={core.string.Name} kind={'default'} maxWidth="100%" fullSize />
        </div>
        <div class="w-full">
          <Label label={classB.label} />
        </div>
      </div>
    </div>
    <div class="p-4 pt-0">
      <EditBox
        bind:value={description}
        placeholder={core.string.Description}
        kind={'default'}
        format={'text-multiline'}
      />
    </div>
    <div class="px-4 pb-4 flex-between items-center">
      <span class="label">
        <Label label={view.string.AutomationOnly} />
      </span>
      <Toggle bind:on={automationOnly} />
    </div>
  </div>
</Modal>
