<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import login from '@hcengineering/login'
  import presentation, { createQuery, getClient } from '@hcengineering/presentation'
  import setting, { InviteSettings } from '@hcengineering/setting'
  import { Button, EditBox, MiniToggle } from '@hcengineering/ui'

  const client = getClient()
  let expTime: number = 48
  let mask: string
  let limit: number = -1
  let noLimit: boolean = true
  let existingInviteSettings: InviteSettings[]
  const query = createQuery()

  $: query.query(setting.class.InviteSettings, {}, (set) => {
    existingInviteSettings = set
    if (existingInviteSettings !== undefined && existingInviteSettings.length > 0) {
      expTime = existingInviteSettings[0].expirationTime
      mask = existingInviteSettings[0].emailMask
      limit = existingInviteSettings[0].limit
    }
  })

  async function setInviteSettings () {
    const newSettings = {
      expirationTime: expTime,
      emailMask: mask,
      limit,
      enabled: true
    }
    if (existingInviteSettings.length === 0) {
      await client.createDoc(setting.class.InviteSettings, setting.space.Setting, newSettings)
    } else {
      await client.updateDoc(
        setting.class.InviteSettings,
        setting.space.Setting,
        existingInviteSettings[0]._id,
        newSettings
      )
    }
  }
</script>

<div class="form">
  <div class="mt-2">
    <EditBox label={login.string.LinkValidHours} format={'number'} bind:value={expTime} />
  </div>
  <div class="mt-2">
    <EditBox label={login.string.EmailMask} bind:value={mask} />
  </div>
  <div class="mt-2">
    <MiniToggle bind:on={noLimit} label={login.string.NoLimit} on:change={() => noLimit && (limit = -1)} />
  </div>
  {#if !noLimit}
    <div class="mt-2">
      <EditBox label={login.string.InviteLimit} format={'number'} bind:value={limit} />
    </div>
  {/if}
  <div class="mt-2">
    <Button label={presentation.string.Save} size={'medium'} kind={'accented'} on:click={() => setInviteSettings()} />
  </div>
</div>

<style lang="scss">
  .form {
    padding: 1.5rem;
  }
</style>
