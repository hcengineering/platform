<!--
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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
  import contact, { Employee, PersonAccount } from '@hcengineering/contact'
  import core, { Class, Doc, Ref, Space, getCurrentAccount, setCurrentAccount } from '@hcengineering/core'
  import login from '@hcengineering/login'
  import notification, { notificationId } from '@hcengineering/notification'
  import { BrowserNotificatator, NotificationClientImpl } from '@hcengineering/notification-resources'
  import { IntlString, broadcastEvent, getMetadata, getResource } from '@hcengineering/platform'
  import { ActionContext, createQuery, getClient } from '@hcengineering/presentation'
  import setting from '@hcengineering/setting'
  import support, { SupportStatus } from '@hcengineering/support'
  import {
    AnyComponent,
    Button,
    CompAndProps,
    Component,
    Label,
    Location,
    PanelInstance,
    Popup,
    PopupAlignment,
    PopupPosAlignment,
    PopupResult,
    ResolvedLocation,
    TooltipInstance,
    areLocationsEqual,
    closePanel,
    closePopup,
    closeTooltip,
    deviceOptionsStore as deviceInfo,
    getCurrentLocation,
    getLocation,
    location,
    locationStorageKeyId,
    navigate,
    openPanel,
    popupstore,
    resizeObserver,
    resolvedLocationStore,
    setResolvedLocation,
    showPopup,
    Separator,
    defineSeparators,
    workbenchSeparators
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import {
    ActionHandler,
    ListSelectionProvider,
    NavLink,
    migrateViewOpttions,
    updateFocus
  } from '@hcengineering/view-resources'
  import type { Application, NavigatorModel, SpecialNavModel, ViewConfiguration } from '@hcengineering/workbench'
  import { getContext, onDestroy, onMount, tick } from 'svelte'
  import { subscribeMobile } from '../mobile'
  import workbench from '../plugin'
  import { buildNavModel, signOut, workspacesStore } from '../utils'
  import AccountPopup from './AccountPopup.svelte'
  import AppItem from './AppItem.svelte'
  import AppSwitcher from './AppSwitcher.svelte'
  import Applications from './Applications.svelte'
  import Logo from './Logo.svelte'
  import NavFooter from './NavFooter.svelte'
  import NavHeader from './NavHeader.svelte'
  import Navigator from './Navigator.svelte'
  import SelectWorkspaceMenu from './SelectWorkspaceMenu.svelte'
  import SpaceView from './SpaceView.svelte'
  import IconSettings from './icons/Settings.svelte'
  import TopMenu from './icons/TopMenu.svelte'

  let contentPanel: HTMLElement

  const { setTheme } = getContext('theme') as any

  let currentAppAlias: string | undefined
  let currentSpace: Ref<Space> | undefined
  let currentSpecial: string | undefined
  let currentQuery: Record<string, string | null> | undefined
  let specialComponent: SpecialNavModel | undefined
  let asideId: string | undefined
  let currentFragment: string | undefined = ''

  let currentApplication: Application | undefined
  let navigatorModel: NavigatorModel | undefined
  let currentView: ViewConfiguration | undefined
  let createItemDialog: AnyComponent | undefined
  let createItemLabel: IntlString | undefined

  migrateViewOpttions()

  const excludedApps = getMetadata(workbench.metadata.ExcludedApplications) ?? []

  const client = getClient()

  let apps: Application[] | Promise<Application[]> = client
    .findAll(workbench.class.Application, { hidden: false, _id: { $nin: excludedApps } })
    .then((res) => (apps = res))

  let panelInstance: PanelInstance
  let popupInstance: Popup

  let visibileNav: boolean = getMetadata(workbench.metadata.NavigationExpandedDefault) ?? true
  async function toggleNav (): Promise<void> {
    visibileNav = !visibileNav
    closeTooltip()
    if (currentApplication && navigatorModel && navigator) {
      await tick()
      panelInstance.fitPopupInstance()
      popupInstance.fitPopupInstance()
    }
  }

  onMount(() => {
    getResource(login.function.GetWorkspaces).then(async (f) => {
      const workspaces = await f()
      $workspacesStore = workspaces
    })
  })

  const accountId = (getCurrentAccount() as PersonAccount)._id

  let account: PersonAccount | undefined
  const accountQ = createQuery()
  accountQ.query(
    contact.class.PersonAccount,
    {
      _id: accountId
    },
    (res) => {
      if (res.length > 0) {
        account = res[0]
        setCurrentAccount(account)
      }
    },
    { limit: 1 }
  )

  let employee: Employee | undefined
  const employeeQ = createQuery()

  $: employeeQ.query(
    contact.mixin.Employee,
    {
      _id: account?.person as Ref<Employee>
    },
    (res) => {
      employee = res[0]
    },
    { limit: 1 }
  )

  let hasNotification = false
  const noficicationClient = NotificationClientImpl.getClient()
  noficicationClient.docUpdates.subscribe((res) => {
    hasNotification = res.some((p) => !p.hidden && p.txes.some((p) => p.isNew))
  })

  const workspaceId = $location.path[1]

  onDestroy(
    location.subscribe(async (loc) => {
      if (workspaceId !== $location.path[1]) {
        // Switch of workspace
        return
      }
      closeTooltip()
      closePopup()

      await syncLoc(loc)
      await updateWindowTitle(loc)
      checkOnHide()
    })
  )

  async function updateWindowTitle (loc: Location) {
    const ws = loc.path[1]
    const docTitle = await getWindowTitle(loc)
    if (docTitle !== undefined && docTitle !== '') {
      document.title = ws == null ? docTitle : `${docTitle} - ${ws}`
    } else {
      const title = getMetadata(workbench.metadata.PlatformTitle) ?? 'Platform'
      document.title = ws == null ? title : `${ws} - ${title}`
    }
    broadcastEvent(workbench.event.NotifyTitle, document.title)
  }
  async function getWindowTitle (loc: Location) {
    if (loc.fragment == null) return
    const hierarchy = client.getHierarchy()
    const [, _id, _class] = decodeURIComponent(loc.fragment).split('|')
    if (_class == null) return

    const mixin = hierarchy.classHierarchyMixin(_class as Ref<Class<Doc>>, view.mixin.ObjectTitle)
    if (mixin === undefined) return
    const titleProvider = await getResource(mixin.titleProvider)
    try {
      return await titleProvider(client, _id as Ref<Doc>)
    } catch (err: any) {
      console.error(err)
    }
  }

  async function resolveShortLink (loc: Location): Promise<ResolvedLocation | undefined> {
    let locationResolver = currentApplication?.locationResolver
    if (loc.path[2] !== undefined && loc.path[2].trim().length > 0) {
      if (apps instanceof Promise) {
        apps = await apps
      }
      const app = apps.find((p) => p.alias === loc.path[2])
      if (app?.locationResolver) {
        locationResolver = app?.locationResolver
      }
    }
    if (locationResolver) {
      const resolver = await getResource(locationResolver)
      return await resolver?.(loc)
    }
  }

  function mergeLoc (loc: Location, resolved: ResolvedLocation): Location {
    const resolvedApp = resolved.loc.path[2]
    const resolvedSpace = resolved.loc.path[3]
    const resolvedSpecial = resolved.loc.path[4]
    if (resolvedApp === undefined) {
      const isSameApp = currentAppAlias === loc.path[2]
      loc.path[2] = (currentAppAlias as string) ?? resolved.defaultLocation.path[2]
      loc.path[3] = currentSpace ?? (currentSpecial as string) ?? resolved.defaultLocation.path[3]
      if (loc.path[3] !== undefined && isSameApp) {
        // setting space special/aside only if it belongs to the same app
        if (loc.path[3] === resolved.defaultLocation.path[3]) {
          loc.path[4] = resolved.defaultLocation.path[4]
        } else {
          loc.path[4] = (currentSpace && currentSpecial) ?? (asideId as string)
        }
      } else {
        loc.path.length = 4
      }
    } else {
      loc.path[2] = resolvedApp
      if (resolvedSpace === undefined) {
        loc.path[3] = currentSpace ?? (currentSpecial as string) ?? resolved.defaultLocation.path[3]
        loc.path[4] = (currentSpecial as string) ?? resolved.defaultLocation.path[4]
      } else {
        loc.path[3] = resolvedSpace
        loc.path[4] = resolvedSpecial ?? currentSpecial ?? (asideId as string) ?? resolved.defaultLocation.path[4]
      }
    }
    for (let index = 0; index < loc.path.length; index++) {
      const path = loc.path[index]
      if (path === undefined) {
        loc.path.length = index
        break
      }
    }
    loc.query = resolved.loc.query ?? loc.query ?? currentQuery ?? resolved.defaultLocation.query
    loc.fragment = resolved.loc.fragment ?? loc.fragment ?? resolved.defaultLocation.fragment
    return loc
  }

  async function syncLoc (loc: Location): Promise<void> {
    const originalLoc = JSON.stringify(loc)
    // resolve short links
    let resolvedLoc: ResolvedLocation | undefined
    if (loc.path.length > 3 && getSpecialComponent(loc.path[3]) === undefined) {
      resolvedLoc = await resolveShortLink(loc)
    }

    if (resolvedLoc && !areLocationsEqual(loc, resolvedLoc.loc)) {
      loc = mergeLoc(loc, resolvedLoc)
    }
    setResolvedLocation(loc)
    const app = loc.path[2]
    let space = loc.path[3] as Ref<Space>
    let special = loc.path[4]
    const fragment = loc.fragment
    let navigateDone = false
    if (app === undefined) {
      const last = localStorage.getItem(`${locationStorageKeyId}_${loc.path[1]}`)
      if (last != null) {
        const lastValue = JSON.parse(last)
        navigateDone = navigate(lastValue)
        if (navigateDone) {
          return
        }
      }
      if (app === undefined && !navigateDone) {
        const appShort = getMetadata(workbench.metadata.DefaultApplication) as Ref<Application>
        if (appShort == null) return
        const spaceRef = getMetadata(workbench.metadata.DefaultSpace) as Ref<Space>
        const specialRef = getMetadata(workbench.metadata.DefaultSpecial) as Ref<Space>
        const loc = getCurrentLocation()
        // Be sure URI is not yet changed
        if (loc.path[2] === undefined && loc.path[0] === 'workbench') {
          loc.path[2] = appShort
          let len = 3
          if (spaceRef !== undefined && specialRef !== undefined) {
            const spaceObj = await client.findOne(core.class.Space, { _id: spaceRef })
            if (spaceObj !== undefined) {
              loc.path[3] = spaceRef
              loc.path[4] = specialRef
              len = 5
            }
          }
          loc.path.length = len
          if (navigate(loc)) {
            return
          }
        }
      }
    }

    if (currentAppAlias !== app) {
      clear(1)
      currentAppAlias = app
      currentApplication = await client.findOne(workbench.class.Application, { alias: app })
      navigatorModel = await buildNavModel(client, currentApplication)
    }

    if (
      space === undefined &&
      ((navigatorModel?.spaces?.length ?? 0) > 0 || (navigatorModel?.specials?.length ?? 0) > 0)
    ) {
      const last = localStorage.getItem(`${locationStorageKeyId}_${app}`)
      if (last !== null) {
        const newLocation: Location = JSON.parse(last)
        if (newLocation.path[3] != null) {
          space = loc.path[3] = newLocation.path[3] as Ref<Space>
          special = loc.path[4] = newLocation.path[4]
          if (loc.path[4] == null) {
            loc.path.length = 4
          } else {
            loc.path.length = 5
          }
          if (fragment === undefined) {
            navigate(loc)
            return
          }
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
      localStorage.setItem(`${locationStorageKeyId}_${app}`, originalLoc)
    }
    currentQuery = loc.query
    if (fragment !== currentFragment) {
      currentFragment = fragment
      if (fragment !== undefined && fragment.trim().length > 0) {
        setOpenPanelFocus(fragment)
      } else {
        closePanel()
      }
    }
  }

  async function setOpenPanelFocus (fragment: string): Promise<void> {
    const props = decodeURIComponent(fragment).split('|')

    if (props.length >= 3) {
      const doc = await client.findOne(props[2] as Ref<Class<Doc>>, { _id: props[1] as Ref<Doc> })
      if (doc !== undefined) {
        const provider = ListSelectionProvider.Find(doc._id)
        updateFocus({
          provider,
          focus: doc
        })
        openPanel(
          props[0] as AnyComponent,
          props[1],
          props[2],
          (props[3] ?? undefined) as PopupAlignment,
          (props[4] ?? undefined) as AnyComponent
        )
      } else {
        closePanel(false)
      }
    } else {
      closePanel(false)
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
    const loc = getLocation()
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
    } else if (navigatorModel?.aside !== undefined || currentApplication?.aside !== undefined) {
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
  let asideWidth: number
  let componentWidth: number

  let navFloat: boolean = !($deviceInfo.docWidth < 1024)
  $: if ($deviceInfo.docWidth <= 1024 && !navFloat) {
    visibileNav = false
    navFloat = true
  } else if ($deviceInfo.docWidth > 1024 && navFloat) {
    if (getMetadata(workbench.metadata.NavigationExpandedDefault) === undefined) {
      navFloat = false
      visibileNav = true
    }
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
  let popupSpacePosition: PopupPosAlignment
  $: popupSpacePosition = appsMini ? 'logo-mini' : appsDirection === 'horizontal' ? 'logo-portrait' : 'logo'

  onMount(() => subscribeMobile(setTheme))

  async function checkIsHeaderHidden (currentApplication: Application | undefined) {
    return (
      currentApplication?.checkIsHeaderHidden && (await (await getResource(currentApplication.checkIsHeaderHidden))())
    )
  }

  async function checkIsHeaderDisabled (currentApplication: Application | undefined) {
    return (
      currentApplication?.checkIsHeaderDisabled &&
      (await (
        await getResource(currentApplication.checkIsHeaderDisabled)
      )())
    )
  }

  function getApps (apps: Application[] | Promise<Application[]>): Application[] {
    if (apps instanceof Promise) {
      return []
    } else {
      return apps
    }
  }

  function checkInbox (popups: CompAndProps[]) {
    if (inboxPopup !== undefined) {
      const exists = popups.find((p) => p.id === inboxPopup?.id)
      if (!exists) {
        inboxPopup = undefined
      }
    }
  }

  let supportStatus: SupportStatus | undefined = undefined
  function handleSupportStatusChanged (status: SupportStatus) {
    supportStatus = status
  }

  const supportClient = getResource(support.function.GetSupport).then((res) =>
    res((status) => handleSupportStatusChanged(status))
  )
  onDestroy(async () => {
    await supportClient?.then((support) => support.destroy())
  })

  let supportWidgetLoading = false
  async function handleToggleSupportWidget (): Promise<void> {
    const timer = setTimeout(() => {
      supportWidgetLoading = true
    }, 100)

    const support = await supportClient
    await support.toggleWidget()

    clearTimeout(timer)
    supportWidgetLoading = false
  }

  $: checkInbox($popupstore)

  let inboxPopup: PopupResult | undefined = undefined
  let lastLoc: Location | undefined = undefined

  defineSeparators('workbench', workbenchSeparators)
</script>

{#if employee?.active === true || accountId === core.account.System}
  <ActionHandler />
  <svg class="svg-mask">
    <clipPath id="notify-normal">
      <path d="M12,14c0-3.3,2.7-6,6-6c0.7,0,1.4,0.1,2,0.4V0H0v20h18C14.7,20,12,17.3,12,14z" />
      <path d="M18,20h2v-0.4C19.4,19.9,18.7,20,18,20z" />
    </clipPath>
    <clipPath id="notify-small">
      <path d="M10.5,12.2c0-2.9,2.4-5.2,5.2-5.2c0.6,0,1.2,0.1,1.8,0.3V0H0v17.5h15.8C12.9,17.5,10.5,15.1,10.5,12.2z" />
      <path d="M15.8,17.5h1.8v-0.4C17,17.4,16.4,17.5,15.8,17.5z" />
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
    <div class="antiPanel-application {appsDirection}" class:lastDivider={!visibileNav}>
      <div
        class="hamburger-container clear-mins"
        class:portrait={appsDirection === 'horizontal'}
        class:landscape={appsDirection === 'vertical'}
      >
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="logo-container clear-mins"
          class:mini={appsMini}
          on:click={() => {
            showPopup(SelectWorkspaceMenu, {}, popupSpacePosition)
          }}
        >
          <Logo mini={appsMini} workspace={$resolvedLocationStore.path[1]} />
        </div>
        <div class="topmenu-container clear-mins flex-no-shrink" class:mini={appsMini}>
          <AppItem
            icon={TopMenu}
            label={visibileNav ? workbench.string.HideMenu : workbench.string.ShowMenu}
            selected={!visibileNav}
            size={appsMini ? 'small' : 'medium'}
            on:click={toggleNav}
          />
        </div>
        <!-- <ActivityStatus status="active" /> -->
        <NavLink app={notificationId} shrink={0}>
          <AppItem
            icon={notification.icon.Inbox}
            label={notification.string.Inbox}
            selected={currentAppAlias === notificationId || inboxPopup !== undefined}
            on:click={(e) => {
              if (e.metaKey || e.ctrlKey) return
              if (currentAppAlias === notificationId && lastLoc !== undefined) {
                e.preventDefault()
                e.stopPropagation()
                navigate(lastLoc)
                lastLoc = undefined
              } else {
                lastLoc = $location
              }
            }}
            notify={hasNotification}
          />
        </NavLink>
        <Applications apps={getApps(apps)} active={currentApplication?._id} direction={appsDirection} />
      </div>
      <div class="info-box {appsDirection}" class:vertical-mobile={appsDirection === 'vertical'} class:mini={appsMini}>
        <AppItem
          icon={IconSettings}
          label={setting.string.Settings}
          size={appsMini ? 'small' : 'large'}
          on:click={() => showPopup(AppSwitcher, { apps: getApps(apps) }, popupPosition)}
        />
        {#await supportClient then client}
          {#if client}
            <AppItem
              icon={support.icon.Support}
              label={support.string.ContactUs}
              size={appsMini ? 'small' : 'large'}
              notify={supportStatus?.hasUnreadMessages}
              selected={supportStatus?.visible}
              loading={supportWidgetLoading}
              on:click={() => handleToggleSupportWidget()}
            />
          {/if}
        {/await}
        <div class="flex-center" class:mt-3={appsDirection === 'vertical'} class:ml-2={appsDirection === 'horizontal'}>
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            id="profile-button"
            class="cursor-pointer"
            on:click|stopPropagation={() => showPopup(AccountPopup, {}, popupPosition)}
          >
            <Component is={contact.component.Avatar} props={{ avatar: employee?.avatar, size: 'small' }} />
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
        <div class="antiPanel-navigator {appsDirection === 'horizontal' ? 'portrait' : 'landscape'}">
          {#if currentApplication}
            <NavHeader label={currentApplication.label} />
            {#if currentApplication.navHeaderComponent}
              {#await checkIsHeaderHidden(currentApplication) then isHidden}
                {#if !isHidden}
                  {#await checkIsHeaderDisabled(currentApplication) then disabled}
                    <Component
                      is={currentApplication.navHeaderComponent}
                      props={{
                        currentSpace,
                        currentSpecial,
                        currentFragment,
                        disabled
                      }}
                      shrink
                    />
                  {/await}
                {/if}
              {/await}
            {/if}
          {/if}
          <Navigator
            {currentSpace}
            {currentSpecial}
            {currentFragment}
            model={navigatorModel}
            {currentApplication}
            on:open={checkOnHide}
          />
          <NavFooter>
            {#if currentApplication.navFooterComponent}
              <Component is={currentApplication.navFooterComponent} props={{ currentSpace }} />
            {/if}
          </NavFooter>
        </div>
        <Separator name={'workbench'} index={0} color={'var(--theme-navpanel-border)'} />
      {/if}
      <div
        class="antiPanel-component antiComponent"
        bind:this={contentPanel}
        use:resizeObserver={() => {
          componentWidth = contentPanel.clientWidth
        }}
      >
        {#if currentApplication && currentApplication.component}
          <Component is={currentApplication.component} props={{ currentSpace, visibileNav }} />
        {:else if specialComponent}
          <Component
            is={specialComponent.component}
            props={{ model: navigatorModel, ...specialComponent.componentProps, currentSpace, visibileNav }}
            on:action={(e) => {
              if (e?.detail) {
                const loc = getCurrentLocation()
                loc.query = { ...loc.query, ...e.detail }
                navigate(loc)
              }
            }}
          />
        {:else if currentView?.component !== undefined}
          <Component is={currentView.component} props={{ ...currentView.componentProps, currentView, visibileNav }} />
        {:else}
          <SpaceView {currentSpace} {currentView} {createItemDialog} {createItemLabel} />
        {/if}
      </div>
      {#if asideId && currentSpace}
        {@const asideComponent = navigatorModel?.aside ?? currentApplication?.aside}
        {#if asideComponent !== undefined}
          <Separator name={'workbench'} index={1} />
          <div
            class="antiPanel-component antiComponent aside"
            use:resizeObserver={(element) => {
              asideWidth = element.clientWidth
            }}
            bind:this={aside}
          >
            <Component is={asideComponent} props={{ currentSpace, _id: asideId }} on:close={closeAside} />
          </div>
        {/if}
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
  <Popup bind:this={popupInstance} {contentPanel}>
    <svelte:fragment slot="popup-header">
      <ActionContext context={{ mode: 'popup' }} />
    </svelte:fragment>
  </Popup>
  <BrowserNotificatator />
{:else if employee}
  <div class="flex-col-center justify-center h-full flex-grow">
    <h1><Label label={workbench.string.AccountDisabled} /></h1>
    <Label label={workbench.string.AccountDisabledDescr} />
    <Button label={setting.string.Signout} kind={'link'} size={'small'} on:click={() => signOut()} />
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
    align-items: center;

    &.portrait {
      margin-left: 1rem;

      .logo-container {
        margin-right: 0.5rem;
      }
      .topmenu-container {
        margin-right: 0.5rem;
      }
    }
    &.landscape {
      flex-direction: column;
      margin-top: 1.25rem;

      .logo-container {
        margin-bottom: 0.25rem;
      }
      .topmenu-container {
        margin-bottom: 1rem;
      }
    }

    .logo-container,
    .topmenu-container,
    .spacer {
      flex-shrink: 0;
    }
    .spacer {
      width: 0.25rem;
      height: 0.25rem;
    }
    .logo-container.mini,
    .topmenu-container.mini {
      position: fixed;
      top: 4px;
    }
    .logo-container.mini {
      left: 4px;
      width: 1.5rem;
      height: 1.5rem;
    }
    .topmenu-container.mini {
      left: calc(1.5rem + 8px);
    }
  }

  .info-box {
    display: flex;
    align-items: center;

    &.vertical {
      flex-direction: column;
      margin-bottom: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid var(--theme-navpanel-divider);

      &-mobile {
        margin-bottom: 1rem;
      }
      &:not(.mini) > *:not(:last-child) {
        margin-bottom: 0.75rem;
      }
      &.mini > *:not(:last-child) {
        margin-bottom: 0.25rem;
      }
    }
    &.horizontal {
      margin-right: 1rem;
      padding-left: 1rem;
      border-left: 1px solid var(--theme-navpanel-divider);

      &:not(.mini) > *:not(:last-child) {
        margin-right: 0.75rem;
      }
      &.mini > *:not(:last-child) {
        margin-right: 0.25rem;
      }
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
    background-color: var(--theme-divider-color);
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
