<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import core, { Class, Client, Doc, getCurrentAccount, Ref, Space } from '@anticrm/core'
  import notification, { NotificationStatus } from '@anticrm/notification'
  import { NotificationClientImpl } from '@anticrm/notification-resources'
  import { getMetadata, getResource, IntlString } from '@anticrm/platform'
  import { Avatar, createQuery, setClient } from '@anticrm/presentation'
  import {
    AnyComponent,
    closePopup,
    closeTooltip,
    Component,
    DatePickerPopup,
    fetchMetadataLocalStorage,
    getCurrentLocation,
    location,
    Location,
    navigate,
    PanelInstance,
    Popup,
    showPopup,
    TooltipInstance
  } from '@anticrm/ui'
  import login from '@anticrm/login'
  import view from '@anticrm/view'
  import { ActionContext, ActionHandler } from '@anticrm/view-resources'
  import type { Application, NavigatorModel, SpecialNavModel, ViewConfiguration } from '@anticrm/workbench'
  import { onDestroy, tick } from 'svelte'
  import { doNavigate } from '../utils'
  import workbench from '../plugin'
  import AccountPopup from './AccountPopup.svelte'
  import AppItem from './AppItem.svelte'
  import Applications from './Applications.svelte'
  import TopMenu from './icons/TopMenu.svelte'
  import NavHeader from './NavHeader.svelte'
  import Navigator from './Navigator.svelte'
  import SpaceView from './SpaceView.svelte'

  export let client: Client
  let contentPanel: HTMLElement

  setClient(client)
  NotificationClientImpl.getClient()

  let currentApp: Ref<Application> | undefined
  let currentSpace: Ref<Space> | undefined
  let currentSpecial: string | undefined
  let specialComponent: SpecialNavModel | undefined
  let asideId: string | undefined

  let currentApplication: Application | undefined
  let navigatorModel: NavigatorModel | undefined
  let currentView: ViewConfiguration | undefined
  let createItemDialog: AnyComponent | undefined
  let createItemLabel: IntlString | undefined

  let apps: Application[] = []

  const excludedApps = getMetadata(workbench.metadata.ExcludedApplications) ?? []

  const query = createQuery()
  $: query.query(workbench.class.Application, { hidden: false, _id: { $nin: excludedApps } }, (result) => {
    apps = result
  })

  let panelInstance: PanelInstance

  let visibileNav: boolean = true
  async function toggleNav (): Promise<void> {
    visibileNav = !visibileNav
    closeTooltip()
    if (currentApplication && navigatorModel && navigator) {
      await tick()
      panelInstance.fitPopupInstance()
    }
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

  onDestroy(
    location.subscribe(async (loc) => {
      closeTooltip()
      closePopup()

      await syncLoc(loc)
      await updateWindowTitle(loc)
    })
  )

  async function updateWindowTitle (loc: Location) {
    const title = (await getWindowTitle(loc)) ?? getMetadata(workbench.metadata.PlatformTitle) ?? 'Platform'
    const ws = fetchMetadataLocalStorage(login.metadata.CurrentWorkspace)
    document.title = ws == null ? title : `${ws} - ${title}`
  }
  async function getWindowTitle (loc: Location) {
    if (loc.fragment == null) return
    const hierarchy = client.getHierarchy()
    const [, _id, _class] = decodeURIComponent(loc.fragment).split('|')
    if (_class == null) return

    const clazz = hierarchy.getClass(_class as Ref<Class<Doc>>)
    if (!hierarchy.hasMixin(clazz, view.mixin.ObjectTitle)) return

    const mixin = hierarchy.as(clazz, view.mixin.ObjectTitle)
    const titleProvider = await getResource(mixin.titleProvider)
    try {
      return await titleProvider(client, _id as Ref<Doc>)
    } catch (err: any) {
      console.error(err)
    }
  }

  async function syncLoc (loc: Location): Promise<void> {
    const app = loc.path.length > 1 ? (loc.path[1] as Ref<Application>) : undefined
    const space = loc.path.length > 2 ? (loc.path[2] as Ref<Space>) : undefined
    const special = loc.path.length > 3 ? loc.path[3] : undefined

    if (currentApp !== app) {
      clear(1)
      currentApp = app
      currentApplication = await client.findOne(workbench.class.Application, { _id: currentApp })
      navigatorModel = currentApplication?.navigatorModel
    }

    if (space === undefined) {
      const last = localStorage.getItem(`platform_last_loc_${app}`)
      if (last !== null) {
        const newLocation: Location = JSON.parse(last)
        if (newLocation.path[2] != null) {
          loc.path[2] = newLocation.path[2] as Ref<Space>
          loc.path[3] = newLocation.path[3]
          if (loc.path[3] == null) {
            loc.path.length = 3
          } else {
            loc.path.length = 4
          }
          navigate(loc)
          return
        }
      }
    }

    if (currentSpecial === undefined || currentSpecial !== space) {
      const newSpecial = space !== undefined ? getSpecialComponent(space) : undefined
      if (newSpecial !== undefined) {
        clear(2)
        specialComponent = newSpecial
        currentSpecial = space
      } else {
        await updateSpace(space)
        setSpaceSpecial(special)
      }
    }
    if (app !== undefined) {
      localStorage.setItem(`platform_last_loc_${app}`, JSON.stringify(loc))
    }
  }

  function clear (level: number): void {
    switch (level) {
      case 1:
        currentApp = undefined
        currentApplication = undefined
        navigatorModel = undefined
      // eslint-disable-next-line no-fallthrough
      case 2:
        currentSpace = undefined
        currentSpecial = undefined
        currentView = undefined
        createItemDialog = undefined
        createItemLabel = undefined
        specialComponent = undefined
      // eslint-disable-next-line no-fallthrough
      case 3:
        asideId = undefined
        if (currentSpace !== undefined) {
          specialComponent = undefined
        }
    }
  }

  function navigateApp (app: Application): void {
    if (currentApp === app._id) {
      // Nothing to do.
      return
    }
    visibileNav = true

    doNavigate([], undefined, {
      mode: 'app',
      application: app._id
    })
  }

  function selectSpecial (id: string): void {
    if (currentSpecial === id) return

    doNavigate([], undefined, {
      mode: 'special',
      special: id
    })
    checkOnHide()
  }

  function selectSpace (spaceId?: Ref<Space>, spaceSpecial?: string): void {
    doNavigate([], undefined, {
      mode: 'space',
      space: spaceId,
      spaceSpecial: spaceSpecial
    })
    checkOnHide()
  }

  function closeAside (): void {
    const loc = getCurrentLocation()
    loc.path.length = 3
    checkOnHide()
    navigate(loc)
  }

  async function updateSpace (spaceId?: Ref<Space>): Promise<void> {
    if (spaceId === currentSpace) return
    clear(2)
    if (spaceId === undefined) return
    const space = await client.findOne(core.class.Space, { _id: spaceId })
    if (space === undefined) return
    currentSpace = spaceId
    const spaceClass = client.getHierarchy().getClass(space._class)
    const view = client.getHierarchy().as(spaceClass, workbench.mixin.SpaceView)
    currentView = view.view
    createItemDialog = currentView?.createItemDialog
    createItemLabel = currentView?.createItemLabel
  }

  function setSpaceSpecial (spaceSpecial: string | undefined): void {
    if (currentSpecial !== undefined && spaceSpecial === currentSpecial) return
    if (asideId !== undefined && spaceSpecial === asideId) return
    clear(3)
    if (spaceSpecial === undefined) return
    specialComponent = getSpecialComponent(spaceSpecial)
    if (specialComponent !== undefined) {
      currentSpecial = spaceSpecial
    } else if (navigatorModel?.aside !== undefined) {
      asideId = spaceSpecial
    }
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

  let aside: HTMLElement
  let cover: HTMLElement
  let isResizing: boolean = false
  let asideWidth: number
  let componentWidth: number
  let dX: number
  let oldX: number

  const resizing = (event: MouseEvent): void => {
    if (isResizing && aside) {
      const X = event.clientX - dX
      const newWidth = asideWidth + oldX - X
      if (newWidth > 320 && componentWidth - (oldX - X) > 320) {
        aside.style.width = aside.style.maxWidth = aside.style.minWidth = newWidth + 'px'
        oldX = X
      }
    }
  }
  const endResize = (event: MouseEvent): void => {
    const el: HTMLElement = event.currentTarget as HTMLElement
    if (el && isResizing) document.removeEventListener('mousemove', resizing)
    document.removeEventListener('mouseup', endResize)
    cover.style.display = 'none'
    isResizing = false
  }
  const startResize = (event: MouseEvent): void => {
    const el: HTMLElement = event.currentTarget as HTMLElement
    if (el && !isResizing) {
      oldX = el.getBoundingClientRect().y
      dX = event.clientX - oldX
      document.addEventListener('mouseup', endResize)
      document.addEventListener('mousemove', resizing)
      cover.style.display = 'block'
      isResizing = true
    }
  }

  let navFloat: boolean = !(window.innerWidth < 1024)
  const windowResize = (): void => {
    if (window.innerWidth < 1024 && !navFloat) {
      visibileNav = false
      navFloat = true
    } else if (window.innerWidth >= 1024 && navFloat) {
      navFloat = false
      visibileNav = true
    }
  }
  const checkOnHide = (): void => {
    if (visibileNav && navFloat) visibileNav = false
  }
  windowResize()
</script>

<svelte:window on:resize={windowResize} />
{#if client}
  <ActionHandler />
  <svg class="svg-mask">
    <clipPath id="notify-normal">
      <path
        d="M0,0v52.5h52.5V0H0z M34,23.2c-3.2,0-5.8-2.6-5.8-5.8c0-3.2,2.6-5.8,5.8-5.8c3.2,0,5.8,2.6,5.8,5.8 C39.8,20.7,37.2,23.2,34,23.2z"
      />
    </clipPath>
    <clipPath id="notify-small">
      <path d="M0,0v45h45V0H0z M29.5,20c-2.8,0-5-2.2-5-5s2.2-5,5-5s5,2.2,5,5S32.3,20,29.5,20z" />
    </clipPath>
    <clipPath id="nub-bg">
      <path
        d="M7.3.6 4.2 4.3C2.9 5.4 1.5 6 0 6v1h18V6c-1.5 0-2.9-.6-4.2-1.7L10.7.6C9.9-.1 8.5-.2 7.5.4c0 .1-.1.1-.2.2z"
      />
    </clipPath>
    <clipPath id="nub-border">
      <path
        d="M4.8 5.1 8 1.3s.1 0 .1-.1c.5-.3 1.4-.3 1.9.1L13.1 5l.1.1 1.2.9H18c-1.5 0-2.9-.6-4.2-1.7L10.7.6C9.9-.1 8.5-.2 7.5.4c0 .1-.1.1-.2.2L4.2 4.3C2.9 5.4 1.5 6 0 6h3.6l1.2-.9z"
      />
    </clipPath>
  </svg>
  <div class="workbench-container">
    <div class="antiPanel-application">
      <div class="flex-col flex-no-shrink mt-1">
        <!-- <ActivityStatus status="active" /> -->
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
        <div class="flex-center mt-2">
          <div
            id="profile-button"
            class="cursor-pointer"
            on:click|stopPropagation={() => {
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
    <ActionContext
      context={{
        mode: 'workbench',
        application: currentApplication?._id
      }}
    />
    {#if currentApplication && navigatorModel && navigator && visibileNav}
      <div class="antiPanel-navigator" class:float={navFloat} style="box-shadow: -1px 0px 2px rgba(0, 0, 0, .1)">
        {#if currentApplication}
          <NavHeader label={currentApplication.label} />
          {#if currentApplication.navHeaderComponent}
            <Component is={currentApplication.navHeaderComponent} props={{ currentSpace }} shrink />
          {/if}
        {/if}
        <Navigator
          {currentSpace}
          {currentSpecial}
          model={navigatorModel}
          on:special={(evt) => selectSpecial(evt.detail)}
          on:space={(evt) => selectSpace(evt.detail.space, evt.detail.spaceSpecial)}
          on:open={checkOnHide}
        />
        {#if currentApplication.navFooterComponent}
          <Component is={currentApplication.navFooterComponent} props={{ currentSpace }} />
        {/if}
      </div>
    {/if}
    <div
      class="antiPanel-component antiComponent border-left"
      bind:this={contentPanel}
      bind:clientWidth={componentWidth}
    >
      {#if currentApplication && currentApplication.component}
        <Component is={currentApplication.component} props={{ currentSpace }} />
      {:else if specialComponent}
        <Component
          is={specialComponent.component}
          props={{ model: navigatorModel, ...specialComponent.componentProps, currentSpace }}
        />
      {:else if currentView?.component !== undefined}
        <Component is={currentView.component} props={{ ...currentView.componentProps, currentView }} />
      {:else}
        <SpaceView {currentSpace} {currentView} {createItemDialog} {createItemLabel} />
      {/if}
    </div>
    {#if asideId && navigatorModel?.aside !== undefined}
      <div class="splitter" class:hovered={isResizing} on:mousedown={startResize} />
      <div class="antiPanel-component antiComponent aside" bind:clientWidth={asideWidth} bind:this={aside}>
        <Component is={navigatorModel.aside} props={{ currentSpace, _id: asideId }} on:close={closeAside} />
      </div>
    {/if}
  </div>
  <div bind:this={cover} class="cover" />
  <TooltipInstance />
  <PanelInstance bind:this={panelInstance} {contentPanel}>
    <svelte:fragment slot="panel-header">
      <ActionContext context={{ mode: 'panel' }} />
    </svelte:fragment>
  </PanelInstance>
  <Popup>
    <svelte:fragment slot="popup-header">
      <ActionContext context={{ mode: 'popup' }} />
    </svelte:fragment>
  </Popup>
  <DatePickerPopup />
{:else}
  No client
{/if}

<style lang="scss">
  .workbench-container {
    // position: relative;
    display: flex;
    height: 100%;
  }

  .cover {
    position: fixed;
    display: none;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 10;
  }
  .splitter {
    position: relative;
    width: 1px;
    min-width: 1px;
    max-width: 1px;
    height: 100%;
    background-color: var(--divider-color);
    transition: background-color 0.15s ease-in-out;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 0.5rem;
      height: 100%;
      border-left: 2px solid transparent;
      cursor: col-resize;
      z-index: 1;
      transition: border-color 0.15s ease-in-out;
    }
    &:hover,
    &.hovered {
      transition-duration: 0;
      background-color: var(--primary-bg-color);
      &::before {
        transition-duration: 0;
        border-left: 2px solid var(--primary-bg-color);
      }
    }
  }
</style>
