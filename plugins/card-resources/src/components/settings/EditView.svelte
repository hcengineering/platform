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
  import core from '@hcengineering/core'
  import presentation, { getClient, MessageBox } from '@hcengineering/presentation'
  import { Button, EditBox, IconDelete, Label, Modal, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { ObjectBox } from '@hcengineering/view-resources'
  import { clearSettingsStore } from '@hcengineering/setting-resources'
  import card from '@hcengineering/card'
  import setting from '@hcengineering/setting'

  import ViewSettingButton from './ViewSettingButton.svelte'

  export let viewlet: Viewlet

  $: title = viewlet.title
  $: type = viewlet.descriptor

  const client = getClient()

  async function save (): Promise<void> {
    await client.diffUpdate(viewlet, {
      title,
      descriptor: type,
      config: viewletConfig.config
    })
    clearSettingsStore()
  }
  const viewTypes: Ref<ViewletDescriptor>[] = [view.viewlet.Table, view.viewlet.List]

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
</script>

<Modal
  label={card.string.View}
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
    <div class="hulyModal-content__settingsSet-line">
      <span class="label">
        <Label label={view.string.Title} />
      </span>
      <div class="pl-2">
        <EditBox bind:value={title} kind={'default'} />
      </div>
    </div>
    <div class="hulyModal-content__settingsSet-line">
      <span class="label">
        <Label label={setting.string.Type} />
      </span>
      <div class="pl-2">
        <ObjectBox
          _class={view.class.ViewletDescriptor}
          label={card.string.SelectViewType}
          showNavigate={false}
          bind:value={type}
          docQuery={{
            _id: { $in: viewTypes }
          }}
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
            let items = event.detail ?? []
            console.log('items', items)
            items = items.filter((it) => it.type === 'attribute' && it.enabled).map((it) => it.value)

            viewletConfig.config = items
          }}
        />
      </div>
    </div>
  </div>
</Modal>
