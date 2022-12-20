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
  import contact, { Employee, EmployeeAccount, formatName } from '@hcengineering/contact'
  import { AccountRole, getCurrentAccount } from '@hcengineering/core'
  import login from '@hcengineering/login'
  import { setMetadata } from '@hcengineering/platform'
  import { Avatar, createQuery } from '@hcengineering/presentation'
  import setting, { settingId, SettingsCategory } from '@hcengineering/setting'
  import { Action, fetchMetadataLocalStorage } from '@hcengineering/ui'
  import {
    closePanel,
    closePopup,
    getCurrentLocation,
    navigate,
    setMetadataLocalStorage,
    showPopup,
    Menu,
    locationToUrl
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import HelpAndSupport from './HelpAndSupport.svelte'
  import workbench from '../plugin'
  import SelectWorkspaceMenu from './SelectWorkspaceMenu.svelte'

  let items: SettingsCategory[] = []

  const settingsQuery = createQuery()
  settingsQuery.query(
    setting.class.SettingsCategory,
    {},
    (res) => {
      items = account.role > AccountRole.User ? res : res.filter((p) => p.secured === false)
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
    loc.path[2] = settingId
    loc.path[3] = sp.name
    loc.path.length = 4
    navigate(loc)
  }

  function signOut (): void {
    const tokens = fetchMetadataLocalStorage(login.metadata.LoginTokens)
    if (tokens !== null) {
      const loc = getCurrentLocation()
      delete tokens[loc.path[1]]
      setMetadataLocalStorage(login.metadata.LoginTokens, tokens)
    }
    setMetadata(login.metadata.LoginToken, null)
    setMetadataLocalStorage(login.metadata.LoginEndpoint, null)
    setMetadataLocalStorage(login.metadata.LoginEmail, null)
    navigate({ path: [login.component.LoginApp] })
  }

  function inviteWorkspace (): void {
    showPopup(login.component.InviteLink, {})
  }

  function helpAndSupport (): void {
    showPopup(HelpAndSupport, {}, 'help-center')
  }

  function filterItems (items: SettingsCategory[], keys: string[]): SettingsCategory[] {
    return items.filter(
      (p) => p._id !== setting.ids.Profile && p._id !== setting.ids.Password && keys.includes(p.group ?? '')
    )
  }

  function editProfile (items: SettingsCategory[]): void {
    const profile = items.find((p) => p._id === setting.ids.Profile)
    if (profile === undefined) return
    selectCategory(profile)
  }

  function getURLCategory (sp: SettingsCategory): string {
    const loc = getCurrentLocation()
    loc.path[2] = settingId
    loc.path[3] = sp.name
    loc.path.length = 4
    return locationToUrl(loc)
  }

  const getMenu = (items: SettingsCategory[], keys: string[]): Action[] => {
    const actions: Action[] = filterItems(items, keys).map((i) => {
      return {
        icon: i.icon,
        label: i.label,
        action: async () => selectCategory(i),
        link: getURLCategory(i),
        inline: true,
        group: i.group
      }
    })
    return actions
  }

  let actions: Action[] = []
  $: {
    actions = []
    const subActions: Action[] = getMenu(items, ['settings', 'settings-editor'])
    actions.push({
      icon: view.icon.Setting,
      label: setting.string.Settings,
      action: async () => {},
      component: Menu,
      props: { actions: subActions }
    })
    actions.push(
      ...getMenu(items, ['main']),
      {
        icon: setting.icon.SelectWorkspace,
        label: setting.string.SelectWorkspace,
        action: async () => {},
        component: SelectWorkspaceMenu,
        group: 'end'
      },
      {
        icon: login.icon.InviteWorkspace,
        label: setting.string.InviteWorkspace,
        action: async () => inviteWorkspace(),
        group: 'end'
      },
      {
        icon: setting.icon.Support,
        label: workbench.string.HelpAndSupport,
        action: async () => helpAndSupport(),
        group: 'end'
      },
      {
        icon: setting.icon.Signout,
        label: setting.string.Signout,
        action: async () => signOut(),
        group: 'end'
      }
    )
  }
  let menu: Menu
</script>

<svelte:component this={Menu} bind:this={menu} {actions} on:close>
  <svelte:fragment slot="header">
    <div class="p-1 ml-2 overflow-label fs-bold caption-color">{getCurrentLocation().path[1]}</div>
    <div
      class="ap-menuHeader mb-2"
      on:mousemove={() => {
        menu.clearFocus()
      }}
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
  </svelte:fragment>
</svelte:component>
