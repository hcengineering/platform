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
  import { Button, EditBox } from '@hcengineering/ui'
  import login from '../../../login-resources/src/plugin'
  import presentation, { getClient, LiveQuery } from '@hcengineering/presentation'
  import setting, { InviteSettings } from '@hcengineering/setting'
  import preference from '../../../preference'
  import { getCurrentAccount } from '@hcengineering/core'

  const client = getClient()
  let expTime: number
  let mask: string
  let limit: number
  let existingInviteSettings: InviteSettings
  const query = new LiveQuery()

  $: query.query(setting.class.InviteSettings, {}, (set) => {
    existingInviteSettings = set
    if (set !== undefined && set.length > 0) {
      expTime = set[0].expirationTime
      mask = set[0].emailMask
      limit = set[0].limit
    }
  })
  const curAcc = getCurrentAccount()
  async function setInviteSettings () {
    const newSettings: InviteSettings = {
      expirationTime: expTime,
      emailMask: mask,
      limit: limit
    }
    if (existingInviteSettings.length === 0) {
      await client.createDoc(
        setting.class.InviteSettings,
        preference.space.Preference,
        newSettings
      )
    } else {
      await client.updateDoc(
        setting.class.InviteSettings,
        preference.space.Preference,
        existingInviteSettings[0]._id,
        newSettings
      )
    }
  }
</script>

<div class="form">
  <div class="mt-2">
    <EditBox
      label={login.string.LinkValidHours}
      format={'number'}
      bind:value={expTime}
    />
  </div>
  <div class="mt-2">
    <EditBox
      label={login.string.EmailMask}
      format={'string'}
      bind:value={mask}
    />
  </div>
  <div class="mt-2">
    <EditBox
      label={login.string.InviteLimit}
      format={'number'}
      bind:value={limit}
    />
  </div>
  <div class="mt-2">
  <Button
    label={presentation.string.Save}
    size={'medium'}
    kind={'primary'}
    on:click={() => setInviteSettings()}
  />
  </div>
</div>

<style lang="scss">
  .form {
      padding: 1.5rem;
  }
</style>
