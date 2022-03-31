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
  import calendar from '@anticrm/calendar'
  import contact, { Employee, EmployeeAccount } from '@anticrm/contact'
  import core, { Client, getCurrentAccount, Ref, Space } from '@anticrm/core'
  import notification, { NotificationStatus } from '@anticrm/notification'
  import { NotificationClientImpl } from '@anticrm/notification-resources'
  import { IntlString } from '@anticrm/platform'
  import { Avatar, createQuery, setClient } from '@anticrm/presentation'
  import {
    AnyComponent, closePopup,
    closeTooltip,
    Component, getCurrentLocation,
    location,
    navigate,
    PanelInstance,
    Popup,
    showPopup,
    TooltipInstance
  } from '@anticrm/ui'
  import type { Application, NavigatorModel, SpecialNavModel, ViewConfiguration } from '@anticrm/workbench'
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
  

  export let client: Client

  setClient(client)
  NotificationClientImpl.getClient()

  let currentApp: Ref<Application> | undefined
  let currentSpace: Ref<Space> | undefined
  let currentSpecial: string | undefined
  let specialComponent: SpecialNavModel | undefined

  let currentApplication: Application | undefined
  let currentView: ViewConfiguration | undefined
  let createItemDialog: AnyComponent | undefined
  let createItemLabel: IntlString | undefined
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
        const newSpecial = getSpecialComponent(currentFolder)
        if (newSpecial !== undefined) {
          specialComponent = newSpecial
          currentSpecial = currentFolder
          currentSpace = undefined
          return
        }
      }

      updateSpace(currentFolder, loc.path[3])
    })
  )

  async function updateSpace (spaceId?: Ref<Space>, spaceSpecial?: string): Promise<void> {
    if (spaceId === currentSpace) {
      // Check if we need update location.
      const loc = getCurrentLocation()
      if (loc.path[3] !== spaceSpecial) {
        if (spaceSpecial !== undefined) {
          loc.path[3] = spaceSpecial
          loc.path.length = 4
        } else {
          loc.path.length = 3
        }
        if (spaceSpecial !== undefined) {
          loc.path[3] = spaceSpecial
          loc.path.length = 4
          specialComponent = getSpecialComponent(spaceSpecial)
          currentSpecial = spaceSpecial
        } else {
          loc.path.length = 3
          spaceSpecial = undefined
          currentSpecial = undefined
        }
        navigate(loc)
      }
      return
    }
    if (spaceId === undefined) {
      return
    }
    const space = await client.findOne(core.class.Space, { _id: spaceId })
    if (space) {
      currentSpace = spaceId
      currentSpecial = undefined
      specialComponent = undefined

      const spaceClass = client.getHierarchy().getClass(space._class) // (await client.findAll(core.class.Class, { _id: space._class }))[0]
      const view = client.getHierarchy().as(spaceClass, workbench.mixin.SpaceView)
      currentView = view.view
      createItemDialog = currentView?.createItemDialog ?? undefined
      createItemLabel = currentView?.createItemLabel ?? undefined

      const loc = getCurrentLocation()
      loc.path[2] = spaceId
      loc.path.length = 3
      if (spaceSpecial !== undefined) {
        loc.path[3] = spaceSpecial
        currentSpecial = spaceSpecial
        loc.path.length = 4
        specialComponent = getSpecialComponent(spaceSpecial)
      }
      navigate(loc)
    } else {
      currentView = undefined
      createItemDialog = undefined
      createItemLabel = undefined
    }
  }

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

  function getSpecialComponent (id: string): SpecialNavModel | undefined {
    const sp = navigatorModel?.specials?.find((x) => x.id === id)
    if (sp !== undefined) {
      return sp
    }
    for (const s of navigatorModel?.spaces ?? []) {
      const sp = s.specials?.find((x) => x.id === id)
      if (sp !== undefined) {
        return sp
      }
    }
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
    createItemLabel = undefined

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
      attachedTo: account.employee,
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
      <path d="M0,0v52.5h52.5V0H0z M34,23.2c-3.2,0-5.8-2.6-5.8-5.8c0-3.2,2.6-5.8,5.8-5.8c3.2,0,5.8,2.6,5.8,5.8 C39.8,20.7,37.2,23.2,34,23.2z" />
    </clipPath>
    <clipPath id="notify-small">
      <path d="M0,0v45h45V0H0z M29.5,20c-2.8,0-5-2.2-5-5s2.2-5,5-5s5,2.2,5,5S32.3,20,29.5,20z" />
    </clipPath>
    <clipPath id="nub-bg">
      <path d="M7.3.6 4.2 4.3C2.9 5.4 1.5 6 0 6v1h18V6c-1.5 0-2.9-.6-4.2-1.7L10.7.6C9.9-.1 8.5-.2 7.5.4c0 .1-.1.1-.2.2z" />
    </clipPath>
    <clipPath id="nub-border">
      <path d="M4.8 5.1 8 1.3s.1 0 .1-.1c.5-.3 1.4-.3 1.9.1L13.1 5l.1.1 1.2.9H18c-1.5 0-2.9-.6-4.2-1.7L10.7.6C9.9-.1 8.5-.2 7.5.4c0 .1-.1.1-.2.2L4.2 4.3C2.9 5.4 1.5 6 0 6h3.6l1.2-.9z" />
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
          icon={calendar.icon.Reminder}
          label={calendar.string.Reminders}
          selected={false}
          action={async () => {
            showPopup(calendar.component.RemindersPopup, {}, 'account')
          }}
          notify={false}
        />
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
          <div id="profile-button"
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
          {#if currentApplication.navHeaderComponent}
            <Component is={currentApplication.navHeaderComponent} props={{ currentSpace }}/>
          {/if}
        {/if}
        <Navigator
          {currentSpace}
          {currentSpecial}
          model={navigatorModel}
          on:special={(evt) => selectSpecial(evt.detail)}
          on:space={(evt) => updateSpace(evt.detail.space, evt.detail.spaceSpecial)}
          on:archive={(evt) => selectArchive()}
        />
        {#if currentApplication.navFooterComponent}
          <Component is={currentApplication.navFooterComponent} props={{ currentSpace }}/>
        {/if}
      </div>
    {/if}
    <div class="antiPanel-component antiComponent border-left">
      {#if currentApplication && currentApplication.component}
        <Component is={currentApplication.component} props={{ currentSpace }}/>
      {:else if specialComponent}
        <Component is={specialComponent.component} props={{ model: navigatorModel, ...specialComponent.componentProps, currentSpace }} />
      {:else}
        <SpaceView {currentSpace} {currentView} {createItemDialog} {createItemLabel} />
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
  }
</style>
