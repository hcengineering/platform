<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import setting from '@anticrm/setting'
  import { Button, EditBox, Icon, Label } from '@anticrm/ui'
  import { changePassword } from '@anticrm/login-resources'

  let oldPassword: string = ''
  let password: string = ''
  let password2: string = ''
  let label = setting.string.Save
  let saved = false

  $: disabled =
    password.length === 0 || oldPassword.length === 0 || oldPassword === password || password !== password2 || saved

  async function save (): Promise<void> {
    label = setting.string.Saving
    saved = true
    try {
      await changePassword(oldPassword, password)
      label = setting.string.Saved
    } catch (e) {
      console.log(e)
      label = setting.string.Save
      saved = false
    }
  }
</script>

<div class="flex-col h-full">
  <div class="flex-row-center header">
    <div class="content-color mr-3"><Icon icon={setting.icon.Password} size={'medium'} /></div>
    <div class="fs-title"><Label label={setting.string.ChangePassword} /></div>
  </div>
  <div class="container flex-row-streach flex-grow">
    <div class="flex-grow flex-col">
      <div class="flex-grow flex-col">
        <div>
          <EditBox
            password
            placeholder={setting.string.EnterCurrentPassword}
            label={setting.string.CurrentPassword}
            maxWidth="20rem"
            bind:value={oldPassword}
          />
        </div>
        <div class="mt-6">
          <EditBox
            password
            placeholder={setting.string.EnterNewPassword}
            label={setting.string.NewPassword}
            maxWidth="20rem"
            bind:value={password}
          />
        </div>
        <div class="mt-6">
          <EditBox
            password
            placeholder={setting.string.RepeatNewPassword}
            label={setting.string.NewPassword}
            maxWidth="20rem"
            bind:value={password2}
          />
        </div>
      </div>

      <div class="flex-row-reverse">
        <Button
          {label}
          {disabled}
          primary
          on:click={() => {
            save()
          }}
        />
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .header {
    padding: 0 1.75rem 0 2.5rem;
    height: 4rem;
    min-height: 4rem;
    border-bottom: 1px solid var(--theme-menu-divider);
  }

  .container {
    padding: 2.5rem;
  }
</style>
