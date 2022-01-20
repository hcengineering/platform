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
  import { Client, getCurrentAccount, Ref, Space } from '@anticrm/core'
  import core from '@anticrm/core'
  import { Avatar, createQuery, setClient } from '@anticrm/presentation'
  import {
    AnyComponent,
    AnySvelteComponent,
    closeTooltip,
    Component,
    location,
    Popup,
    showPopup,
    TooltipInstance
  } from '@anticrm/ui'
  import type { Application, NavigatorModel, ViewConfiguration } from '@anticrm/workbench'
  import { onDestroy } from 'svelte'
  import workbench from '../plugin'
  import AccountPopup from './AccountPopup.svelte'
  import ActivityStatus from './ActivityStatus.svelte'
  import AppItem from './AppItem.svelte'
  import Applications from './Applications.svelte'
  import Archive from './Archive.svelte'
  import TopMenu from './icons/TopMenu.svelte'
  import NavHeader from './NavHeader.svelte'
  import Navigator from './Navigator.svelte'
  import SpaceView from './SpaceView.svelte'
  import contact, { Employee, EmployeeAccount } from '@anticrm/contact'

  export let client: Client

  setClient(client)

  let currentApp: Ref<Application> | undefined
  let currentApplication: Application | undefined
  let currentSpace: Ref<Space> | undefined
  let ownSpecialComponent: AnySvelteComponent | undefined
  let specialComponent: AnyComponent | undefined
  let currentView: ViewConfiguration | undefined
  let createItemDialog: AnyComponent | undefined
  let navigatorModel: NavigatorModel | undefined

  onDestroy(
    location.subscribe(async (loc) => {
      currentApp = loc.path[1] as Ref<Application>
      currentApplication = await client.findOne(workbench.class.Application, { _id: currentApp })
      navigatorModel = currentApplication?.navigatorModel
      const currentFolder = loc.path[2] as Ref<Space>
      ownSpecialComponent = getOwnSpecialComponent(currentFolder)

      if (ownSpecialComponent !== undefined) {
        return
      }

      specialComponent = getSpecialComponent(currentFolder)

      if (specialComponent !== undefined) {
        return
      }

      const space = await client.findOne(core.class.Space, { _id: currentFolder })
      currentSpace = currentFolder
      if (space) {
        const spaceClass = client.getHierarchy().getClass(space._class) // (await client.findAll(core.class.Class, { _id: space._class }))[0]
        const view = client.getHierarchy().as(spaceClass, workbench.mixin.SpaceView)
        currentView = view.view
        createItemDialog = currentView.createItemDialog
      } else {
        currentView = undefined
        createItemDialog = undefined
      }
    })
  )

  function getOwnSpecialComponent (id: string): AnySvelteComponent | undefined {
    if (id === 'archive') {
      return Archive
    }
  }

  function getSpecialComponent (id: string): AnyComponent | undefined {
    const special = navigatorModel?.specials?.find((x) => x.id === id)
    return special?.component
  }

  let apps: Application[] = []

  const query = createQuery()
  $: query.query(workbench.class.Application, { hidden: false }, (result) => {
    apps = result
  })

  let visibileNav: boolean = true
  const toggleNav = async () => {
    visibileNav = !visibileNav
    closeTooltip()
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
</script>

{#if client}
  <svg class="svg-mask">
    <clipPath id="notify-normal">
      <path
        d="M0,0v52.5h52.5V0H0z M34,23.2c-3.2,0-5.8-2.6-5.8-5.8c0-3.2,2.6-5.8,5.8-5.8c3.2,0,5.8,2.6,5.8,5.8 C39.8,20.7,37.2,23.2,34,23.2z"
      />
    </clipPath>
    <clipPath id="notify-small">
      <path d="M0,0v45h45V0H0z M29.5,20c-2.8,0-5-2.2-5-5s2.2-5,5-5s5,2.2,5,5S32.3,20,29.5,20z" />
    </clipPath>
  </svg>
  <div class="container">
    <div class="panel-app" on:click={toggleNav}>
      <div class="flex-col">
        <ActivityStatus status="active" />
        <AppItem
          icon={TopMenu}
          label={visibileNav ? workbench.string.HideMenu : workbench.string.ShowMenu}
          selected={!visibileNav}
          action={toggleNav}
        />
      </div>
      <Applications {apps} active={currentApp} />
      <div class="flex-center" style="min-height: 6.25rem;">
        <div
          class="cursor-pointer"
          on:click|stopPropagation={(el) => {
            showPopup(AccountPopup, {}, 'account')
          }}
        >
          {#if employee}
            <Avatar avatar={employee.avatar} size={'medium'} />
          {/if}
        </div>
      </div>
    </div>
    {#if currentApplication && navigatorModel && navigator && visibileNav}
      <div class="panel-navigator">
        {#if currentApplication}
          <NavHeader label={currentApplication.label} />
        {/if}
        <Navigator model={navigatorModel} />
      </div>    
    {/if}
    <div class="panel-component">
      {#if currentApplication && currentApplication.component}
        <Component is={currentApplication.component} />
      {/if}

      {#if ownSpecialComponent}
        <svelte:component this={ownSpecialComponent} model={navigatorModel} />
      {:else if specialComponent}
        <Component is={specialComponent} />
      {:else}
        <SpaceView {currentSpace} {currentView} {createItemDialog} />
      {/if}
    </div>
    <!-- <div class="aside"><Chat thread/></div> -->
  </div>
  <Popup />
  <TooltipInstance />
{:else}
  No client
{/if}

<style lang="scss">
  .container {
    display: flex;
    height: 100%;
    padding-bottom: 1.25rem;

    .panel-app {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      min-width: 5rem;
      width: 5rem;
      height: 100%;
      border-radius: 1.25rem;
    }
    .panel-navigator {
      display: flex;
      flex-direction: column;
      margin-right: 1rem;
      min-width: 18rem;
      width: 18rem;
      height: 100%;
      border-radius: 1.25rem;
      background-color: var(--theme-bg-color);
    }
    .panel-component {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      margin-right: 1rem;
      height: 100%;
      border-radius: 1.25rem;
      background-color: var(--theme-bg-color);
      overflow: hidden;
    }
  }
</style>
