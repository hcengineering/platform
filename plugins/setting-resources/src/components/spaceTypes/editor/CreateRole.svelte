<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import presentation, { getClient } from '@hcengineering/presentation'
  import { createSpaceTypeRole } from '@hcengineering/setting'
  import { Modal, ModernEditbox } from '@hcengineering/ui'
  import { AttachedData, Role, SpaceType } from '@hcengineering/core'

  import settingRes from '../../../plugin'
  import { clearSettingsStore } from '../../../store'

  const client = getClient()
  export let type: SpaceType

  const roleData: AttachedData<Role> = {
    name: '',
    permissions: []
  }

  async function handleRoleCreated (): Promise<void> {
    const name = roleData.name.trim()
    if (name === '') {
      return
    }

    await createSpaceTypeRole(client, type, roleData)
  }

  $: canSave = roleData.name.trim() !== ''
</script>

<Modal
  label={settingRes.string.Role}
  type="type-aside"
  okAction={handleRoleCreated}
  {canSave}
  okLabel={presentation.string.Create}
  on:changeContent
  onCancel={() => {
    clearSettingsStore()
  }}
>
  <div class="hulyModal-content__titleGroup">
    <ModernEditbox bind:value={roleData.name} label={settingRes.string.RoleName} size="large" kind="ghost" autoFocus />
  </div>
</Modal>
