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
  import contact, { Employee, PersonAccount, formatName } from '@hcengineering/contact'
  import { AccountRole, getCurrentAccount, Ref } from '@hcengineering/core'
  import login from '@hcengineering/login'
  import { createQuery } from '@hcengineering/presentation'
  import setting, { SettingsCategory, settingId } from '@hcengineering/setting'
  import {
    Action,
    Component,
    Menu,
    closePanel,
    closePopup,
    deviceOptionsStore as deviceInfo,
    getCurrentResolvedLocation,
    locationToUrl,
    navigate,
    showPopup
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import workbench from '../plugin'
  import HelpAndSupport from './HelpAndSupport.svelte'
  import { signOut } from '../utils'

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

  const account = getCurrentAccount() as PersonAccount
  let employee: Employee | undefined
  const employeeQ = createQuery()

  employeeQ.query(
    contact.mixin.Employee,
    {
      _id: account.person as Ref<Employee>
    },
    (res) => {
      employee = res[0]
    },
    { limit: 1 }
  )

  function selectCategory (sp?: SettingsCategory): void {
    closePopup()
    closePanel()
    const loc = getCurrentResolvedLocation()
    loc.fragment = undefined
    loc.query = undefined
    loc.path[2] = settingId
    if (sp) {
      loc.path[3] = sp.name
      loc.path.length = 4
    } else {
      loc.path.length = 3
    }
    navigate(loc)
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
    const loc = getCurrentResolvedLocation()
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
    actions.push({
      icon: view.icon.Setting,
      label: setting.string.Settings,
      action: async () => selectCategory()
    })
    actions.push(
      ...getMenu(items, ['main']),
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
  $: addClass = $deviceInfo.isMobile && $deviceInfo.isPortrait ? 'self-end' : undefined
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<svelte:component this={Menu} bind:this={menu} {actions} {addClass} on:close>
  <svelte:fragment slot="header">
    <div
      class="ap-menuItem hoverable flex-row-center withIcon flex-grow"
      on:mousemove={() => {
        menu.clearFocus()
      }}
      on:click={() => {
        editProfile(items)
      }}
    >
      {#if employee}
        <Component
          is={contact.component.Avatar}
          props={{ avatar: employee.avatar, size: 'medium', name: employee.name }}
        />
      {/if}
      <div class="ml-2 flex-col">
        {#if account}
          <div class="overflow-label fs-bold caption-color">
            {employee !== undefined ? formatName(employee.name) : ''}
          </div>
          <div class="overflow-label text-sm content-dark-color">{account.email}</div>
        {/if}
      </div>
    </div>
    <div class="ap-menuItem separator" />
  </svelte:fragment>
</svelte:component>
