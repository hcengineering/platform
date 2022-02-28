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
  import contact, { Employee, EmployeeAccount } from '@anticrm/contact'
  import core, { Client, getCurrentAccount, Ref, Space } from '@anticrm/core'
  import { Avatar, createQuery, setClient } from '@anticrm/presentation'
  import {
    AnyComponent,
    closePanel,
    closePopup,
    closeTooltip,
    Component,
    getCurrentLocation,
    location,
    navigate,
    PanelInstance,
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
  import TopMenu from './icons/TopMenu.svelte'
  import NavHeader from './NavHeader.svelte'
  import Navigator from './Navigator.svelte'
  import SpaceView from './SpaceView.svelte'
  import notification, { NotificationStatus } from '@anticrm/notification'
  import { NotificationClientImpl } from '@anticrm/notification-resources'

  export let client: Client

  setClient(client)
  NotificationClientImpl.getClient()

  let currentApp: Ref<Application> | undefined
  let currentSpace: Ref<Space> | undefined
  let currentSpecial: string | undefined
  let specialComponent: AnyComponent | undefined

  let currentApplication: Application | undefined
  let currentView: ViewConfiguration | undefined
  let createItemDialog: AnyComponent | undefined
  let navigatorModel: NavigatorModel | undefined

  onDestroy(
    location.subscribe(async (loc) => {
      closeTooltip()
      closePopup()
      if (currentApp !== loc.path[1]) {
        currentApp = loc.path[1] as Ref<Application>
        currentApplication = await client.findOne(workbench.class.Application, { _id: currentApp })
        navigatorModel = currentApplication?.navigatorModel
      }
      const currentFolder = loc.path[2] as Ref<Space>

      if (currentSpecial !== currentFolder) {
        specialComponent = getSpecialComponent(currentFolder)
        if (specialComponent !== undefined) {
          currentSpecial = currentFolder
          return
        }
      }

      updateSpace(currentFolder)
    })
  )

  async function updateSpace (spaceId?: Ref<Space>): Promise<void> {
    if (spaceId === currentSpace) {
      return
    }
    if (spaceId === undefined) {
      return
    }
    const space = await client.findOne(core.class.Space, { _id: spaceId })
    if (space) {
      currentSpace = spaceId
      currentSpecial = undefined

      const spaceClass = client.getHierarchy().getClass(space._class) // (await client.findAll(core.class.Class, { _id: space._class }))[0]
      const view = client.getHierarchy().as(spaceClass, workbench.mixin.SpaceView)
      currentView = view.view
      createItemDialog = currentView.createItemDialog

      const loc = getCurrentLocation()
      loc.path[2] = spaceId
      loc.path.length = 3
      navigate(loc)
    } else {
      currentView = undefined
      createItemDialog = undefined
    }
  }
  $: updateSpace(currentSpace)

  function selectSpecial (id: string): void {
    specialComponent = getSpecialComponent(id)
    if (specialComponent !== undefined) {
      currentSpecial = id
      currentSpace = undefined
      const loc = getCurrentLocation()
      loc.path[2] = id
      loc.path.length = 3
      navigate(loc)
    }
  }

  function selectArchive (): void {
    currentSpace = undefined
    currentSpecial = undefined
    const loc = getCurrentLocation()
    loc.path[2] = 'archive'
    loc.path.length = 3
    navigate(loc)
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
  $: accountQ.query(
    contact.class.EmployeeAccount,
    {
      _id: getCurrentAccount()._id as Ref<EmployeeAccount>
    },
    (res) => {
      account = res[0]
    },
    { limit: 1 }
  )

  $: account &&
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

  let isNavigate: boolean = false
  $: isNavigate = !!navigatorModel

  function navigateApp (app: Application): void {
    if (currentApp === app._id) {
      // Nothing to do.
      return
    }
    currentApp = app._id
    currentApplication = app
    navigatorModel = currentApplication?.navigatorModel
    visibileNav = true

    currentSpace = undefined
    specialComponent = undefined
    currentSpecial = undefined
    currentView = undefined
    createItemDialog = undefined

    const loc = getCurrentLocation()
    loc.path[1] = app._id
    loc.path.length = 2
    navigate(loc)
  }

  let hasNotification = false
  const notificationQuery = createQuery()

  $: notificationQuery.query(
    notification.class.Notification,
    {
      attachedTo: (getCurrentAccount() as EmployeeAccount).employee,
      status: NotificationStatus.New
    },
    (res) => {
      hasNotification = res.length > 0
    },
    {
      limit: 1
    }
  )
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
  <div class="workbench-container">
    <div class="antiPanel-application" on:click={toggleNav}>
      <div class="flex-col">
        <ActivityStatus status="active" />
        <AppItem
          icon={TopMenu}
          label={visibileNav ? workbench.string.HideMenu : workbench.string.ShowMenu}
          selected={!visibileNav}
          action={toggleNav}
          notify={false}
        />
      </div>
      <Applications
        {apps}
        active={currentApp}
        on:active={(evt) => {
          navigateApp(evt.detail)
        }}
      />
      <div class="flex-row" style="margin-bottom: 2rem;">
        <AppItem
          icon={notification.icon.Notifications}
          label={notification.string.Notifications}
          selected={false}
          action={async () => {
            showPopup(notification.component.NotificationsPopup, {}, 'account')
          }}
          notify={hasNotification}
        />
        <div class="flex-center">
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
    </div>
    {#if currentApplication && navigatorModel && navigator && visibileNav}
      <div class="antiPanel-navigator filled indent">
        {#if currentApplication}
          <NavHeader label={currentApplication.label} />
        {/if}
        <Navigator
          {currentSpace}
          {currentSpecial}
          model={navigatorModel}
          on:special={(evt) => selectSpecial(evt.detail)}
          on:space={(evt) => updateSpace(evt.detail)}
          on:archive={(evt) => selectArchive()}
        />
      </div>
    {/if}
    <div class="antiPanel-component indent antiComponent" class:filled={isNavigate}>
      {#if currentApplication && currentApplication.component}
        <Component is={currentApplication.component} />
      {:else if specialComponent}
        <Component is={specialComponent} props={{ model: navigatorModel }} />
      {:else}
        <SpaceView {currentSpace} {currentView} {createItemDialog} />
      {/if}
    </div>
    <!-- <div class="aside"><Chat thread/></div> -->
  </div>
  <PanelInstance />
  <Popup />
  <TooltipInstance />
{:else}
  No client
{/if}

<style lang="scss">
  .workbench-container {
    display: flex;
    height: 100%;
    padding-bottom: 1.25rem;
  }
</style>
