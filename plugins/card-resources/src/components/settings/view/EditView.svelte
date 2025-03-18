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
  import presentation, { getClient, MessageBox } from '@hcengineering/presentation'
  import { Button, IconDelete, Label, Modal, ModernEditbox, showPopup } from '@hcengineering/ui'
  import view, { Viewlet } from '@hcengineering/view'
  import { clearSettingsStore } from '@hcengineering/setting-resources'
  import setting from '@hcengineering/setting'

  import DescriptorBox from './DescriptorBox.svelte'
  import ViewSettingButton from './ViewSettingButton.svelte'
  import card from '../../../plugin'

  export let viewlet: Viewlet

  let title = viewlet.title
  let type = viewlet.descriptor

  const client = getClient()

  async function save (): Promise<void> {
    await client.diffUpdate(viewlet, {
      title,
      descriptor: type,
      config: viewlet.config
    })
    clearSettingsStore()
  }

  async function remove (): Promise<void> {
    showPopup(MessageBox, {
      label: view.string.DeleteObject,
      message: view.string.DeleteObjectConfirm,
      params: { count: 1 },
      dangerous: true,
      action: async () => {
        await client.remove(viewlet)
        clearSettingsStore()
      }
    })
  }
  function onSave (items: any[]): void {
    const enabledAttibutes = items.filter((it) => it.type === 'attribute' && it.enabled).map((it) => it.value)
    viewlet.config = enabledAttibutes
  }
</script>

<Modal
  label={card.string.EditView}
  type={'type-aside'}
  okLabel={presentation.string.Save}
  okAction={save}
  canSave={true}
  onCancel={clearSettingsStore}
>
  <svelte:fragment slot="actions">
    <Button icon={IconDelete} kind={'dangerous'} on:click={remove} />
  </svelte:fragment>
  <div class="hulyModal-content__titleGroup">
    <ModernEditbox bind:value={title} label={view.string.Title} size={'large'} kind={'ghost'}/>
  </div>
  <div class="hulyModal-content__settingsSet">
    <div class="hulyModal-content__settingsSet-line">
      <span class="label">
        <Label label={setting.string.Type} />
      </span>
      <div class="pl-2">
        <DescriptorBox
          label={card.string.SelectViewType}
          bind:value={type}
        />
      </div>
    </div>
    <div class="hulyModal-content__settingsSet-line">
      <span class="label">
        <Label label={setting.string.Settings} />
      </span>
      <div class="pl-2">
        <ViewSettingButton
          {viewlet}
          on:save={(event) => {
            onSave(event.detail ?? [])
          }}
        />
      </div>
    </div>
  </div>
</Modal>
