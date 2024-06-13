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
  import { AvatarType } from '@hcengineering/contact'
  import { EditableAvatar } from '@hcengineering/contact-resources'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { WorkspaceSetting } from '@hcengineering/setting'
  import { FocusHandler, Label, createFocusManager } from '@hcengineering/ui'
  import setting from '../plugin'

  export let visibleNav: boolean = true

  let workspaceSettings: WorkspaceSetting | undefined = undefined

  const client = getClient()
  client.findOne(setting.class.WorkspaceSetting, {}).then((r) => {
    workspaceSettings = r
  })

  let avatarEditor: EditableAvatar

  async function onAvatarDone (e: any): Promise<void> {
    if (workspaceSettings === undefined) {
      const avatar = await avatarEditor.createAvatar()
      await client.createDoc<WorkspaceSetting>(
        setting.class.WorkspaceSetting,
        setting.space.Setting,
        { icon: avatar.avatar },
        setting.ids.WorkspaceSetting
      )
      return
    }

    const avatar = await avatarEditor.createAvatar()
    if (workspaceSettings.icon != null && workspaceSettings.icon !== avatar.avatar) {
      // Different avatar
      await avatarEditor.removeAvatar(workspaceSettings.icon)
    }
    await client.update(workspaceSettings, {
      icon: avatar.avatar
    })
  }

  const manager = createFocusManager()
</script>

<FocusHandler {manager} />

<div class="hulyComponent p-10 flex ac-body row">
  <EditableAvatar
    person={{
      avatarType: AvatarType.IMAGE,
      avatar: workspaceSettings?.icon
    }}
    size={'x-large'}
    bind:this={avatarEditor}
    on:done={onAvatarDone}
    imageOnly
    lessCrop
  />
  <div class="heading-medium-20 p-4">
    <Label label={getEmbeddedLabel('Workspace Logo')} />
  </div>
</div>

<style lang="scss">
  .row {
    flex-direction: row;
    align-content: center;
  }
</style>
