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
  import core, { Association } from '@hcengineering/core'
  import { getEmbeddedLabel, IntlString } from '@hcengineering/platform'
  import presentation, { getClient, MessageBox } from '@hcengineering/presentation'
  import { Button, DropdownIntlItem, EditBox, IconDelete, Label, Modal, showPopup } from '@hcengineering/ui'
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

  async function save (): Promise<void> {
    await client.diffUpdate(association, {
      nameA,
      nameB
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

  const label = items.find((item) => item.id === association?.type)?.label ?? ('' as IntlString)

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
    <div class="flex flex-gap-4">
      <div class="flex-col p-4 flex-gap-2">
        <div class="flex-col-center">A</div>
        <div>
          <EditBox bind:value={nameA} placeholder={core.string.Name} kind={'default'} />
        </div>
        <div>
          <Label label={classA.label} />
        </div>
      </div>
      <div class="flex-col p-4 flex-gap-2">
        <span class="label">
          <Label label={setting.string.Type} />
        </span>
        <Label {label} />
      </div>
      <div class="flex-col p-4 flex-gap-2">
        <div class="flex-col-center">B</div>
        <div>
          <EditBox bind:value={nameB} placeholder={core.string.Name} kind={'default'} />
        </div>
        <div>
          <Label label={classB.label} />
        </div>
      </div>
    </div>
  </div>
</Modal>
