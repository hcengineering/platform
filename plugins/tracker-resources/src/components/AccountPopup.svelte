<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { EmployeeAccount, formatName } from '@hcengineering/contact'
  import { Avatar, employeeByIdStore } from '@hcengineering/contact-resources'
  import { getCurrentAccount } from '@hcengineering/core'
  import login, { loginId } from '@hcengineering/login'
  import { setMetadata } from '@hcengineering/platform'
  import presentation, { closeClient } from '@hcengineering/presentation'
  import setting, { SettingsCategory, settingId } from '@hcengineering/setting'
  import {
    Icon,
    Label,
    closePopup,
    fetchMetadataLocalStorage,
    getCurrentResolvedLocation,
    navigate,
    setMetadataLocalStorage
  } from '@hcengineering/ui'

  // const client = getClient()
  async function getItems (): Promise<SettingsCategory[]> {
    return []
  }

  const account = getCurrentAccount() as EmployeeAccount
  $: employee = $employeeByIdStore.get(account.employee)

  function selectCategory (sp: SettingsCategory): void {
    closePopup()
    const loc = getCurrentResolvedLocation()
    loc.path[2] = settingId
    loc.path[3] = sp.name
    loc.path.length = 4
    navigate(loc)
  }

  function signOut (): void {
    const tokens = fetchMetadataLocalStorage(login.metadata.LoginTokens)
    if (tokens !== null) {
      const loc = getCurrentResolvedLocation()
      delete tokens[loc.path[1]]
      setMetadataLocalStorage(login.metadata.LoginTokens, tokens)
    }
    setMetadata(presentation.metadata.Token, null)
    setMetadataLocalStorage(login.metadata.LoginEndpoint, null)
    setMetadataLocalStorage(login.metadata.LoginEmail, null)
    closeClient()
    navigate({ path: [loginId] })
  }

  function selectWorkspace (): void {
    navigate({ path: [loginId, 'selectWorkspace'] })
  }

  function filterItems (items: SettingsCategory[]): SettingsCategory[] {
    return items?.filter((p) => p.name !== 'profile' && p.name !== 'password')
  }

  function editProfile (items: SettingsCategory[] | undefined): void {
    const profile = items?.find((p) => p.name === 'profile')
    if (profile === undefined) return
    selectCategory(profile)
  }
</script>

<div class="antiPopup">
  <div class="ap-space" />
  <div class="ap-scroll">
    <div class="ap-box">
      {#await getItems() then items}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="ap-menuItem flex-row-center"
          on:click={() => {
            editProfile(items)
          }}
        >
          {#if employee}
            <Avatar avatar={employee.avatar} size={'medium'} />
          {/if}
          <div class="ml-2 flex-col">
            {#if account}
              <div class="overflow-label fs-bold caption-color">{formatName(account.name)}</div>
              <div class="overflow-label text-sm content-dark-color">{account.email}</div>
            {/if}
          </div>
        </div>
        {#if items}
          {#each filterItems(items) as item}
            <button class="ap-menuItem" on:click={() => selectCategory(item)}>
              <div class="mr-2">
                <Icon icon={item.icon} size={'small'} />
              </div>
              <Label label={item.label} />
            </button>
          {/each}
        {/if}
        <button class="ap-menuItem" on:click={selectWorkspace}>
          <div class="mr-2">
            <Icon icon={setting.icon.SelectWorkspace} size={'small'} />
          </div>
          <Label label={setting.string.SelectWorkspace} />
        </button>
        <button class="ap-menuItem" on:click={signOut}>
          <div class="mr-2">
            <Icon icon={setting.icon.Signout} size={'small'} />
          </div>
          <Label label={setting.string.Signout} />
        </button>
      {/await}
    </div>
  </div>
  <div class="ap-space" />
</div>
