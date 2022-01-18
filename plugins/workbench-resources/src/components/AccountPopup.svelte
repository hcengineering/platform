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
  import { getCurrentLocation, Label, navigate, setMetadataLocalStorage } from '@anticrm/ui'
  import { Avatar, createQuery, getClient } from '@anticrm/presentation'
  import workbench, { Application, SpecialNavModel } from '@anticrm/workbench'
  import setting from '@anticrm/setting'
  import login from '@anticrm/login'
  import { getCurrentAccount, Ref } from '@anticrm/core'
  import contact, { Employee, EmployeeAccount, formatName } from '@anticrm/contact'

  const client = getClient()
  async function getItems(): Promise<SpecialNavModel[] | undefined> {
    const app = await client.findOne(workbench.class.Application, { _id: setting.ids.SettingApp as Ref<Application> })
    return app?.navigatorModel?.specials
  }

  let account: EmployeeAccount | undefined
  let employee: Employee | undefined
  const accountQ = createQuery()
  const employeeQ = createQuery()
  $: accountQ.query(contact.class.EmployeeAccount, {
    _id: getCurrentAccount()._id as Ref<EmployeeAccount>
  }, (res) => {
    account = res[0]
  }, { limit: 1 })

  $: account && employeeQ.query(contact.class.Employee, {
    _id: account.employee
  }, (res) => {
    employee = res[0]
  }, { limit: 1 })


  function selectSpecial (sp: SpecialNavModel): void {
    const loc = getCurrentLocation()
    loc.path[1] = setting.ids.SettingApp
    loc.path[2] = sp.id
    loc.path.length = 3
    navigate(loc)
  }

  function signOut (): void {
    setMetadataLocalStorage(login.metadata.LoginToken, null)
    setMetadataLocalStorage(login.metadata.LoginEndpoint, null)
    setMetadataLocalStorage(login.metadata.LoginEmail, null)
    navigate({ path: [login.component.LoginApp] })
  }

  function filterItems (items: SpecialNavModel[]): SpecialNavModel[] {
    return items?.filter((p) => p.id !== 'profile' && p.id !== 'password')
  }

  function editProfile (items: SpecialNavModel[] | undefined): void {
    const profile = items?.find((p) => p.id === 'profile')
    if (profile === undefined) return
    selectSpecial(profile)
  }
</script>

<div class="account-popup">
  <div class="popup-bg" />
  {#await getItems() then items}
    <div class="flex-row-center header item" on:click={() => { editProfile(items) }}>
        {#if employee}
          <Avatar avatar={employee.avatar} size={'medium'} />
        {/if}
      <div class="ml-2 flex-col">
          {#if account}
            <div class="overflow-label fs-bold caption-color">{formatName(account.name)}</div>
            <div class="overflow-label small-text content-dark-color">{account.email}</div>
          {/if}
      </div>
    </div>
    <div class="content">
      {#if items}
        {#each filterItems(items) as item }
          <div class="item" on:click={() => selectSpecial(item)}><Label label={item.label} /></div>
        {/each}
      {/if}
      <div class="item" on:click={signOut}><Label label={'Sign out'} /></div>
    </div>
  {/await}
</div>

<style lang="scss">
  .account-popup {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 16rem;
    min-width: 16rem;
    max-width: 16rem;
    border-radius: 1.25rem;

    .header {
      flex-shrink: 0;
      margin: 0.5rem;
      margin-bottom: 0.25rem;
    }

    .content {
      flex-shrink: 0;
      flex-grow: 1;
      margin: 0 .5rem 1rem;
      height: fit-content;
    }
    .item {
      padding: .5rem;
      color: var(--theme-content-accent-color);
      border-radius: .5rem;
      cursor: pointer;

      &:hover {
        color: var(--theme-caption-color);
        background-color: var(--theme-button-bg-focused);
      }
    }

    .popup-bg {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: var(--theme-card-bg);
      border-radius: 1.25rem;
      backdrop-filter: blur(15px);
      box-shadow: var(--theme-card-shadow);
      z-index: -1;
    }
  }
</style>
