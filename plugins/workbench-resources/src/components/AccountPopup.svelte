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
  import contact, { Employee, EmployeeAccount, formatName } from '@anticrm/contact'
  import { getCurrentAccount } from '@anticrm/core'
  import login from '@anticrm/login'
  import { Avatar, createQuery } from '@anticrm/presentation'
  import setting, { settingId, SettingsCategory } from '@anticrm/setting'
  import {
    closePanel,
    closePopup,
    getCurrentLocation,
    Icon,
    Label,
    navigate,
    setMetadataLocalStorage,
    showPopup
  } from '@anticrm/ui'

  let items: SettingsCategory[] = []

  const settingsQuery = createQuery()
  settingsQuery.query(
    setting.class.SettingsCategory,
    {},
    (res) => {
      items = account.owner ? res : res.filter((p) => p.secured === false)
    },
    { sort: { order: 1 } }
  )

  const account = getCurrentAccount() as EmployeeAccount
  let employee: Employee | undefined
  const employeeQ = createQuery()

  employeeQ.query(
    contact.class.Employee,
    {
      _id: account.employee
    },
    (res) => {
      employee = res[0]
    },
    { limit: 1 }
  )

  function selectCategory (sp: SettingsCategory): void {
    closePopup()
    closePanel()
    const loc = getCurrentLocation()
    loc.path[1] = settingId
    loc.path[2] = sp.name
    loc.path.length = 3
    navigate(loc)
  }

  function signOut (): void {
    setMetadataLocalStorage(login.metadata.LoginToken, null)
    setMetadataLocalStorage(login.metadata.LoginEndpoint, null)
    setMetadataLocalStorage(login.metadata.LoginEmail, null)
    setMetadataLocalStorage(login.metadata.CurrentWorkspace, null)
    navigate({ path: [login.component.LoginApp] })
  }

  function selectWorkspace (): void {
    navigate({ path: [login.component.LoginApp, 'selectWorkspace'] })
  }

  function inviteWorkspace (): void {
    showPopup(login.component.InviteLink, {})
  }

  function filterItems (items: SettingsCategory[]): SettingsCategory[] {
    return items.filter((p) => p._id !== setting.ids.Profile && p._id !== setting.ids.Password)
  }

  function editProfile (items: SettingsCategory[]): void {
    const profile = items.find((p) => p._id === setting.ids.Profile)
    if (profile === undefined) return
    selectCategory(profile)
  }
</script>

<div class="selectPopup autoHeight">
  <div class="scroll">
    <div class="box">
      <div
        class="menu-item high flex-row-center"
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
      {#each filterItems(items) as item}
        <button class="menu-item" on:click={() => selectCategory(item)}>
          <div class="mr-2">
            <Icon icon={item.icon} size={'small'} />
          </div>
          <Label label={item.label} />
        </button>
      {/each}
      <button class="menu-item" on:click={selectWorkspace}>
        <div class="icon mr-3">
          <Icon icon={setting.icon.SelectWorkspace} size={'small'} />
        </div>
        <Label label={setting.string.SelectWorkspace} />
      </button>
      <button class="menu-item" on:click={inviteWorkspace}>
        <div class="icon mr-3">
          <Icon icon={login.icon.InviteWorkspace} size={'small'} />
        </div>
        <Label label={setting.string.InviteWorkspace} />
      </button>
      <button class="menu-item" on:click={signOut}>
        <div class="icon mr-3">
          <Icon icon={setting.icon.Signout} size={'small'} />
        </div>
        <Label label={setting.string.Signout} />
      </button>
    </div>
  </div>
</div>
