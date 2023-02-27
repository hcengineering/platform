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
  import calendar from '@hcengineering/calendar'
  import contact, { Employee, EmployeeAccount } from '@hcengineering/contact'
  import core, { Class, Client, Doc, getCurrentAccount, Ref, setCurrentAccount, Space } from '@hcengineering/core'
  import { getWorkspaces, Workspace } from '@hcengineering/login-resources'
  import notification, { NotificationStatus } from '@hcengineering/notification'
  import { BrowserNotificatator, NotificationClientImpl } from '@hcengineering/notification-resources'
  import { getMetadata, getResource, IntlString } from '@hcengineering/platform'
  import { Avatar, createQuery, setClient } from '@hcengineering/presentation'
  import request, { RequestStatus } from '@hcengineering/request'
  import {
    AnyComponent,
    areLocationsEqual,
    closePopup,
    closeTooltip,
    Component,
    DatePickerPopup,
    deviceOptionsStore as deviceInfo,
    getCurrentLocation,
    Label,
    location,
    Location,
    navigate,
    PanelInstance,
    Popup,
    PopupPosAlignment,
    resizeObserver,
    showPopup,
    TooltipInstance
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { ActionContext, ActionHandler, migrateViewOpttions } from '@hcengineering/view-resources'
  import type { Application, NavigatorModel, SpecialNavModel, ViewConfiguration } from '@hcengineering/workbench'
  import { getContext, onDestroy, onMount, tick } from 'svelte'
  import { subscribeMobile } from '../mobile'
  import workbench from '../plugin'
  import { workspacesStore } from '../utils'
  import AccountPopup from './AccountPopup.svelte'
  import AppItem from './AppItem.svelte'
  import Applications from './Applications.svelte'
  import TopMenu from './icons/TopMenu.svelte'
  import NavHeader from './NavHeader.svelte'
  import Navigator from './Navigator.svelte'
  import SpaceView from './SpaceView.svelte'

  export let client: Client
  let contentPanel: HTMLElement

  const { setTheme } = getContext('theme') as any
  setClient(client)
  NotificationClientImpl.createClient()

  let currentAppAlias: string | undefined
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
  migrateViewOpttions()

  const excludedApps = getMetadata(workbench.metadata.ExcludedApplications) ?? []

  const query = createQuery()
  $: query.query(workbench.class.Application, { hidden: false, _id: { $nin: excludedApps } }, (result) => {
    apps = result
  })

  getWorkspaces().then((ws: Workspace[]) => {
    $workspacesStore = ws
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

  let account = getCurrentAccount() as EmployeeAccount
  const accountQ = createQuery()
  accountQ.query(
    contact.class.EmployeeAccount,
    {
      _id: account._id
    },
    (res) => {
      account = res[0]
      setCurrentAccount(account)
    },
    { limit: 1 }
  )

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
      status: { $nin: [NotificationStatus.Read] }
    },
    (res) => {
      hasNotification = res.length > 0
    }
  )

  let hasRequests = false
  const requestQuery = createQuery()

  $: requestQuery.query(
    request.class.Request,
    {
      requested: account._id,
      status: RequestStatus.Active
    },
    (res) =>
      (hasRequests =
        res.filter(
          (p) =>
            p.requested.filter((a) => a === account._id).length > p.approved.filter((a) => a === account._id).length
        ).length > 0)
  )

  onDestroy(
    location.subscribe(async (loc) => {
      closeTooltip()
      closePopup()

      await syncLoc(loc)
      await updateWindowTitle(loc)
      checkOnHide()
    })
  )

  async function updateWindowTitle (loc: Location) {
    const title = (await getWindowTitle(loc)) ?? getMetadata(workbench.metadata.PlatformTitle) ?? 'Platform'
    const ws = loc.path[1]
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
    const app = loc.path.length > 2 ? loc.path[2] : undefined
    const space = loc.path.length > 3 ? (loc.path[3] as Ref<Space>) : undefined
    const special = loc.path.length > 4 ? loc.path[4] : undefined

    if (currentAppAlias !== app) {
      clear(1)
      currentAppAlias = app
      currentApplication = await client.findOne(workbench.class.Application, { alias: app })
      navigatorModel = currentApplication?.navigatorModel
    }

    // resolve short links
    if (currentApplication?.locationResolver) {
      const resolver = await getResource(currentApplication.locationResolver)
      const resolvedLocation = await resolver?.(loc)
      if (resolvedLocation && !areLocationsEqual(loc, resolvedLocation)) {
        // make sure not to go into infinite loop here
        navigate(resolvedLocation)
        return
      }
    }

    if (space === undefined) {
      const last = localStorage.getItem(`platform_last_loc_${app}`)
      if (last !== null) {
        const newLocation: Location = JSON.parse(last)
        if (newLocation.path[3] != null) {
          loc.path[3] = newLocation.path[3] as Ref<Space>
          loc.path[4] = newLocation.path[4]
          if (loc.path[4] == null) {
            loc.path.length = 4
          } else {
            loc.path.length = 5
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
        currentAppAlias = undefined
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

  function closeAside (): void {
    const loc = getCurrentLocation()
    loc.path.length = 4
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

  let navFloat: boolean = !($deviceInfo.docWidth < 1024)
  $: if ($deviceInfo.docWidth <= 1024 && !navFloat) {
    visibileNav = false
    navFloat = true
  } else if ($deviceInfo.docWidth > 1024 && navFloat) {
    navFloat = false
    visibileNav = true
  }
  const checkOnHide = (): void => {
    if (visibileNav && $deviceInfo.docWidth <= 1024) visibileNav = false
  }
  let appsDirection: 'vertical' | 'horizontal'
  $: appsDirection = $deviceInfo.isMobile && $deviceInfo.isPortrait ? 'horizontal' : 'vertical'
  let appsMini: boolean
  $: appsMini =
    $deviceInfo.isMobile &&
    (($deviceInfo.isPortrait && $deviceInfo.docWidth <= 480) ||
      (!$deviceInfo.isPortrait && $deviceInfo.docHeight <= 480))
  let popupPosition: PopupPosAlignment
  $: popupPosition =
    appsDirection === 'horizontal'
      ? 'account-portrait'
      : appsDirection === 'vertical' && $deviceInfo.isMobile
        ? 'account-mobile'
        : 'account'

  onMount(() => subscribeMobile(setTheme))

  async function checkIsHeaderHidden () {
    return (
      currentApplication?.checkIsHeaderHidden && (await (await getResource(currentApplication.checkIsHeaderHidden))())
    )
  }
</script>

{#if employee?.active === true}
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
  <div class="workbench-container" style:flex-direction={appsDirection === 'horizontal' ? 'column-reverse' : 'row'}>
    <div class="antiPanel-application {appsDirection}">
      <div
        class="hamburger-container"
        class:portrait={appsDirection === 'horizontal' && !appsMini}
        class:landscape={appsDirection === 'vertical' && !appsMini}
        class:mini={appsMini}
      >
        <!-- <ActivityStatus status="active" /> -->
        <AppItem
          icon={TopMenu}
          label={visibileNav ? workbench.string.HideMenu : workbench.string.ShowMenu}
          selected={!visibileNav}
          action={toggleNav}
          mini={appsMini}
          notify={false}
        />
      </div>
      <Applications {apps} active={currentApplication?._id} direction={appsDirection} />
      <div class="info-box {appsDirection}" class:vertical-mobile={appsDirection === 'vertical' && appsMini}>
        <AppItem
          icon={request.icon.Requests}
          label={request.string.Requests}
          selected={false}
          action={async () => {
            showPopup(request.component.RequestsPopup, {}, popupPosition)
          }}
          notify={hasRequests}
        />
        <AppItem
          icon={calendar.icon.Reminder}
          label={calendar.string.Reminders}
          selected={false}
          action={async () => {
            showPopup(calendar.component.RemindersPopup, {}, popupPosition)
          }}
          notify={false}
        />
        <AppItem
          icon={notification.icon.Notifications}
          label={notification.string.Notifications}
          selected={false}
          action={async () => {
            showPopup(notification.component.NotificationsPopup, {}, popupPosition)
          }}
          notify={hasNotification}
        />
        <div class="flex-center" class:mt-2={appsDirection === 'vertical'} class:ml-2={appsDirection === 'horizontal'}>
          <div
            id="profile-button"
            class="cursor-pointer"
            on:click|stopPropagation={() => {
              showPopup(AccountPopup, {}, popupPosition)
            }}
          >
            <Avatar avatar={employee.avatar} size={'medium'} />
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
    <div class="workbench-container">
      {#if currentApplication && navigatorModel && navigator && visibileNav}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        {#if visibileNav && navFloat}<div class="cover shown" on:click={() => (visibileNav = false)} />{/if}
        <div
          class="antiPanel-navigator {appsDirection === 'horizontal' ? 'portrait' : 'landscape'}"
          style="box-shadow: -1px 0px 2px rgba(0, 0, 0, .1)"
        >
          {#if currentApplication}
            <NavHeader label={currentApplication.label} />
            {#if currentApplication.navHeaderComponent}
              {#await checkIsHeaderHidden() then isHidden}
                {#if !isHidden}
                  <Component is={currentApplication.navHeaderComponent} props={{ currentSpace }} shrink />
                {/if}
              {/await}
            {/if}
          {/if}
          <Navigator
            {currentSpace}
            {currentSpecial}
            model={navigatorModel}
            {currentApplication}
            on:open={checkOnHide}
          />
          {#if currentApplication.navFooterComponent}
            <Component is={currentApplication.navFooterComponent} props={{ currentSpace }} />
          {/if}
        </div>
      {/if}
      <div
        class="antiPanel-component antiComponent"
        class:border-left={!$deviceInfo.isPortrait}
        bind:this={contentPanel}
        use:resizeObserver={(element) => {
          componentWidth = element.clientWidth
        }}
      >
        {#if currentApplication && currentApplication.component}
          <Component is={currentApplication.component} props={{ currentSpace, visibileNav }} />
        {:else if specialComponent}
          <Component
            is={specialComponent.component}
            props={{ model: navigatorModel, ...specialComponent.componentProps, currentSpace, visibileNav }}
          />
        {:else if currentView?.component !== undefined}
          <Component is={currentView.component} props={{ ...currentView.componentProps, currentView, visibileNav }} />
        {:else}
          <SpaceView {currentSpace} {currentView} {createItemDialog} {createItemLabel} />
        {/if}
      </div>
      {#if asideId && navigatorModel?.aside !== undefined}
        <div class="splitter" class:hovered={isResizing} on:mousedown={startResize} />
        <div
          class="antiPanel-component antiComponent aside"
          use:resizeObserver={(element) => {
            asideWidth = element.clientWidth
          }}
          bind:this={aside}
        >
          <Component is={navigatorModel.aside} props={{ currentSpace, _id: asideId }} on:close={closeAside} />
        </div>
      {/if}
    </div>
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
  <BrowserNotificatator />
{:else if employee}
  <div class="flex-col-center justify-center h-full flex-grow">
    <h1><Label label={workbench.string.AccountDisabled} /></h1>
    <Label label={workbench.string.AccountDisabledDescr} />
  </div>
{/if}

<style lang="scss">
  .workbench-container {
    display: flex;
    min-width: 0;
    min-height: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
  .hamburger-container {
    display: flex;
    flex-shrink: 0;

    &.portrait {
      margin-left: 0.375rem;
    }
    &.landscape {
      margin-top: 0.25rem;
    }
    &.mini {
      position: absolute;
      top: 4px;
      left: 4px;
    }
  }
  .info-box {
    display: flex;
    align-items: center;

    &.vertical {
      flex-direction: column;
      margin-bottom: 2rem;

      &-mobile {
        margin-bottom: 1rem;
      }
    }
    &.horizontal {
      margin-right: 1rem;
    }
  }

  .cover {
    position: fixed;
    display: none;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 10;

    &.shown {
      display: block;
    }
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
