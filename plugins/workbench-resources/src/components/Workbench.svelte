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
  import { Analytics } from '@hcengineering/analytics'
  import contact, { getCurrentEmployee } from '@hcengineering/contact'
  import { personByIdStore } from '@hcengineering/contact-resources'
  import core, {
    AccountRole,
    Class,
    Doc,
    getCurrentAccount,
    hasAccountRole,
    Ref,
    SortingOrder,
    Space
  } from '@hcengineering/core'
  import login, { loginId } from '@hcengineering/login'
  import notification, { DocNotifyContext, InboxNotification, notificationId } from '@hcengineering/notification'
  import { BrowserNotificatator, InboxNotificationsClientImpl } from '@hcengineering/notification-resources'
  import { broadcastEvent, getMetadata, getResource, IntlString, translate } from '@hcengineering/platform'
  import {
    ActionContext,
    ComponentExtensions,
    createQuery,
    getClient,
    isAdminUser,
    reduceCalls
  } from '@hcengineering/presentation'
  import setting from '@hcengineering/setting'
  import support, { supportLink, SupportStatus } from '@hcengineering/support'
  import {
    AnyComponent,
    areLocationsEqual,
    Button,
    closePanel,
    closePopup,
    closeTooltip,
    CompAndProps,
    Component,
    defineSeparators,
    deviceOptionsStore as deviceInfo,
    Dock,
    getCurrentLocation,
    getLocation,
    IconSettings,
    Label,
    languageStore,
    Location,
    location,
    locationStorageKeyId,
    locationToUrl,
    mainSeparators,
    navigate,
    showPanel,
    PanelInstance,
    Popup,
    PopupAlignment,
    PopupPosAlignment,
    PopupResult,
    popupstore,
    pushRootBarComponent,
    ResolvedLocation,
    resolvedLocationStore,
    Separator,
    setResolvedLocation,
    showPopup,
    TooltipInstance,
    workbenchSeparators,
    resizeObserver
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import {
    accessDeniedStore,
    ActionHandler,
    ListSelectionProvider,
    migrateViewOpttions,
    NavLink,
    parseLinkId,
    updateFocus
  } from '@hcengineering/view-resources'
  import type {
    Application,
    NavigatorModel,
    SpecialNavModel,
    ViewConfiguration,
    WorkbenchTab
  } from '@hcengineering/workbench'
  import { getContext, onDestroy, onMount, tick } from 'svelte'
  import { subscribeMobile } from '../mobile'
  import workbench from '../plugin'
  import { buildNavModel, logOut, workspacesStore } from '../utils'
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
  import TopMenu from './icons/TopMenu.svelte'
  import WidgetsBar from './sidebar/Sidebar.svelte'
  import { sidebarStore, SidebarVariant, syncSidebarState } from '../sidebar'
  import {
    getTabDataByLocation,
    getTabLocation,
    prevTabIdStore,
    selectTab,
    syncWorkbenchTab,
    tabIdStore,
    tabsStore
  } from '../workbench'
  import { get } from 'svelte/store'

  const HIDE_NAVIGATOR = 720
  const FLOAT_ASIDE = 1024 // lg
  let contentPanel: HTMLElement

  const { setTheme } = getContext<{ setTheme: (theme: string) => void }>('theme')

  let currentAppAlias: string | undefined
  let currentSpace: Ref<Space> | undefined
  let currentSpecial: string | undefined
  let currentQuery: Record<string, string | null> | undefined
  let specialComponent: SpecialNavModel | undefined
  let currentFragment: string | undefined = ''

  let currentApplication: Application | undefined
  let navigatorModel: NavigatorModel | undefined
  let currentView: ViewConfiguration | undefined
  let createItemDialog: AnyComponent | undefined
  let createItemLabel: IntlString | undefined

  const account = getCurrentAccount()
  const me = getCurrentEmployee()
  $: person = $personByIdStore.get(me)

  migrateViewOpttions()

  const excludedApps = getMetadata(workbench.metadata.ExcludedApplications) ?? []

  const client = getClient()

  const apps: Application[] = client
    .getModel()
    .findAllSync<Application>(workbench.class.Application, { hidden: false, _id: { $nin: excludedApps } })

  let panelInstance: PanelInstance
  let popupInstance: Popup

  const linkProviders = client.getModel().findAllSync(view.mixin.LinkIdProvider, {})

  const mobileAdaptive = $deviceInfo.isMobile && $deviceInfo.minWidth
  const defaultNavigator = !(getMetadata(workbench.metadata.NavigationExpandedDefault) ?? true)
  const savedNavigator = localStorage.getItem('hiddenNavigator')
  let hiddenNavigator: boolean = savedNavigator !== null ? savedNavigator === 'true' : defaultNavigator
  let hiddenAside: boolean = true
  $deviceInfo.navigator.visible = !hiddenNavigator

  async function toggleNav (): Promise<void> {
    $deviceInfo.navigator.visible = !$deviceInfo.navigator.visible
    if (!$deviceInfo.navigator.float) {
      hiddenNavigator = !$deviceInfo.navigator.visible
      localStorage.setItem('hiddenNavigator', `${hiddenNavigator}`)
    }
    closeTooltip()
    if (currentApplication && navigatorModel) {
      await tick()
      panelInstance.fitPopupInstance()
      popupInstance.fitPopupInstance()
    }
  }

  let tabs: WorkbenchTab[] = []
  let areTabsLoaded = false

  const query = createQuery()
  $: query.query(
    workbench.class.WorkbenchTab,
    { attachedTo: { $in: account.socialIds } },
    (res) => {
      tabs = res
      tabsStore.set(tabs)
      if (!areTabsLoaded) {
        void initCurrentTab(tabs)
        areTabsLoaded = true
      }
    },
    {
      sort: {
        isPinned: SortingOrder.Descending,
        createdOn: SortingOrder.Ascending
      }
    }
  )

  async function initCurrentTab (tabs: WorkbenchTab[]): Promise<void> {
    const tab = tabs.find((t) => t._id === $tabIdStore)
    const loc = getCurrentLocation()
    const tabLoc = tab ? getTabLocation(tab) : undefined
    const isLocEqual = tabLoc ? areLocationsEqual(loc, tabLoc) : false
    if (!isLocEqual) {
      const url = locationToUrl(loc)
      const data = await getTabDataByLocation(loc)
      const name = data.name ?? (await translate(data.label, {}, get(languageStore)))
      const tabByName = get(tabsStore).find((t) => {
        if (t.location === url) return true
        if (t.name !== name) return false

        const tabLoc = getTabLocation(t)

        return tabLoc.path[2] === loc.path[2] && tabLoc.path[3] === loc.path[3]
      })
      if (tabByName !== undefined) {
        selectTab(tabByName._id)
        prevTabIdStore.set(tabByName._id)
      } else {
        const tabToReplace = tabs.findLast((t) => !t.isPinned)
        if (tabToReplace !== undefined) {
          const op = client.apply(undefined, undefined, true)
          await op.update(tabToReplace, {
            location: url
          })
          await op.commit()
          selectTab(tabToReplace._id)
          prevTabIdStore.set(tabToReplace._id)
        } else {
          console.log('Creating new tab on init')
          const _id = await client.createDoc(workbench.class.WorkbenchTab, core.space.Workspace, {
            attachedTo: account.primarySocialId,
            location: url,
            isPinned: false
          })
          selectTab(_id)
          prevTabIdStore.set(_id)
        }
      }
    }
  }

  onMount(() => {
    pushRootBarComponent('right', view.component.SearchSelector)
    pushRootBarComponent('left', workbench.component.WorkbenchTabs, 30)
    void getResource(login.function.GetWorkspaces).then(async (getWorkspaceFn) => {
      $workspacesStore = await getWorkspaceFn()
      await updateWindowTitle(getLocation())
    })
    syncSidebarState()
    syncWorkbenchTab()
  })

  const workspaceId = $location.path[1]
  const inboxClient = InboxNotificationsClientImpl.createClient()
  const inboxNotificationsByContextStore = inboxClient.inboxNotificationsByContext

  let hasNotificationsFn: ((data: Map<Ref<DocNotifyContext>, InboxNotification[]>) => Promise<boolean>) | undefined =
    undefined
  let hasInboxNotifications = false

  void getResource(notification.function.HasInboxNotifications).then((f) => {
    hasNotificationsFn = f
  })

  $: void hasNotificationsFn?.($inboxNotificationsByContextStore).then((res) => {
    hasInboxNotifications = res
  })

  const doSyncLoc = reduceCalls(async (loc: Location): Promise<void> => {
    if (workspaceId !== $location.path[1]) {
      tabs = []
      // Switch of workspace
      return
    }
    closeTooltip()
    closePopup()

    await syncLoc(loc)
    await updateWindowTitle(loc)
    checkOnHide()
  })

  onDestroy(
    location.subscribe((loc) => {
      void doSyncLoc(loc)
    })
  )

  let windowWorkspaceName = ''

  async function updateWindowTitle (loc: Location): Promise<void> {
    let wsUrl = loc.path[1]
    const ws = $workspacesStore.find((it) => it.url === wsUrl)
    if (ws !== undefined) {
      wsUrl = ws?.name ?? ws.url
      windowWorkspaceName = wsUrl
    }
    const docTitle = await getWindowTitle(loc)
    if (docTitle !== undefined && docTitle !== '') {
      document.title = wsUrl == null ? docTitle : `${docTitle} - ${wsUrl}`
    } else {
      const title = getMetadata(workbench.metadata.PlatformTitle) ?? 'Platform'
      document.title = wsUrl == null ? title : `${wsUrl} - ${title}`
    }
    void broadcastEvent(workbench.event.NotifyTitle, document.title)
  }

  async function getWindowTitle (loc: Location): Promise<string | undefined> {
    if (loc.fragment == null) return
    const hierarchy = client.getHierarchy()
    const [, id, _class] = decodeURIComponent(loc.fragment).split('|')
    if (_class == null) return

    const mixin = hierarchy.classHierarchyMixin(_class as Ref<Class<Doc>>, view.mixin.ObjectTitle)
    if (mixin === undefined) return
    const titleProvider = await getResource(mixin.titleProvider)
    try {
      const _id = await parseLinkId(linkProviders, id, _class as Ref<Class<Doc>>)
      return await titleProvider(client, _id)
    } catch (err: any) {
      Analytics.handleError(err)
      console.error(err)
    }
  }

  async function resolveShortLink (loc: Location): Promise<ResolvedLocation | undefined> {
    let locationResolver = currentApplication?.locationResolver
    if (loc.path[2] != null && loc.path[2].trim().length > 0) {
      const app = apps.find((p) => p.alias === loc.path[2])
      if (app?.locationResolver) {
        locationResolver = app?.locationResolver
      }
    }
    if (locationResolver) {
      const resolver = await getResource(locationResolver)
      return await resolver(loc)
    }
  }

  function mergeLoc (loc: Location, resolved: ResolvedLocation): Location {
    const resolvedApp = resolved.loc.path[2]
    const resolvedSpace = resolved.loc.path[3]
    const resolvedSpecial = resolved.loc.path[4]
    if (resolvedApp === undefined) {
      if (currentAppAlias === undefined) {
        loc.path = [loc.path[0], loc.path[1], ...resolved.defaultLocation.path.splice(2)]
      } else {
        const isSameApp = currentAppAlias === loc.path[2]
        loc.path[2] = currentAppAlias ?? resolved.defaultLocation.path[2]
        loc.path[3] = currentSpace ?? currentSpecial ?? resolved.defaultLocation.path[3]
        if (loc.path[3] !== undefined && isSameApp) {
          // setting space special/aside only if it belongs to the same app
          if (currentSpace && currentSpecial) {
            loc.path[4] = currentSpecial
          } else if (loc.path[3] === resolved.defaultLocation.path[3]) {
            loc.path[4] = resolved.defaultLocation.path[4]
          }
        } else {
          loc.path.length = 4
        }
      }
    } else {
      loc.path[2] = resolvedApp
      if (resolvedSpace === undefined) {
        loc.path[3] = currentSpace ?? (currentSpecial as string) ?? resolved.defaultLocation.path[3]
        loc.path[4] = (currentSpecial as string) ?? resolved.defaultLocation.path[4]
      } else {
        loc.path[3] = resolvedSpace
        if (resolvedSpecial) {
          loc.path[4] = resolvedSpecial
        } else if (currentSpace && currentSpecial) {
          loc.path[4] = currentSpecial
        } else {
          loc.path[4] = resolved.defaultLocation.path[4]
        }
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
    accessDeniedStore.set(false)
    const originalLoc = JSON.stringify(loc)
    if ($tabIdStore !== $prevTabIdStore) {
      if ($prevTabIdStore) {
        const prevTab = tabs.find((t) => t._id === $prevTabIdStore)
        const prevTabLoc = prevTab ? getTabLocation(prevTab) : undefined
        if (prevTabLoc === undefined || prevTabLoc.path[2] !== loc.path[2]) {
          clear(1)
        }
      }
      prevTabIdStore.set($tabIdStore)
    }
    if (loc.path.length > 3 && getSpecialComponent(loc.path[3]) === undefined) {
      // resolve short links
      const resolvedLoc = await resolveShortLink(loc)
      if (resolvedLoc !== undefined && !areLocationsEqual(loc, resolvedLoc.loc)) {
        loc = mergeLoc(loc, resolvedLoc)
      }
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
            const spaceObj = await client.findOne<Space>(core.class.Space, { _id: spaceRef })
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
      currentApplication = await client.findOne<Application>(workbench.class.Application, { alias: app })
      currentAppAlias = currentApplication?.alias
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
      if (fragment != null && fragment.trim().length > 0) {
        await setOpenPanelFocus(fragment)
      } else {
        closePanel()
      }
    }
  }

  async function setOpenPanelFocus (fragment: string): Promise<void> {
    const props = decodeURIComponent(fragment).split('|')

    if (props.length >= 3) {
      const _class = props[2] as Ref<Class<Doc>>
      const _id = await parseLinkId(linkProviders, props[1], _class)
      const doc = await client.findOne<Doc>(_class, { _id })
      panelDoc = { _class, _id }

      if (doc !== undefined) {
        const provider = ListSelectionProvider.Find(doc._id)
        updateFocus({
          provider,
          focus: doc
        })
        showPanel(
          props[0] as AnyComponent,
          _id,
          _class,
          (props[3] ?? undefined) as PopupAlignment,
          (props[4] ?? undefined) as AnyComponent,
          false
        )
      } else {
        accessDeniedStore.set(true)
        closePanel(false)
      }
    } else {
      closePanel(false)
    }
  }
  let panelDoc: undefined | { _id: Ref<Doc>, _class: Ref<Class<Doc>> } = undefined
  const panelQuery = createQuery()

  $: if (panelDoc !== undefined) {
    panelQuery.query(panelDoc._class, { _id: panelDoc._id }, (r) => {
      if (r.length === 0) {
        closePanel(false)
        panelDoc = undefined
      }
    })
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
        if (currentSpace !== undefined) {
          specialComponent = undefined
        }
    }
  }

  async function updateSpace (spaceId?: Ref<Space>): Promise<void> {
    if (spaceId === currentSpace) return
    clear(2)
    currentSpace = spaceId
    if (spaceId === undefined) return
    const space = await client.findOne<Space>(core.class.Space, { _id: spaceId })
    if (space === undefined) return
    const spaceClass = client.getHierarchy().getClass(space._class)
    const view = client.getHierarchy().as(spaceClass, workbench.mixin.SpaceView)
    currentView = view.view
    createItemDialog = currentView?.createItemDialog
    createItemLabel = currentView?.createItemLabel
  }

  function setSpaceSpecial (spaceSpecial: string | undefined): void {
    if (currentSpecial !== undefined && spaceSpecial === currentSpecial) return
    clear(3)
    if (spaceSpecial === undefined) return
    specialComponent = getSpecialComponent(spaceSpecial)
    if (specialComponent !== undefined) {
      currentSpecial = spaceSpecial
    }
  }

  function getSpecialComponent (id: string): SpecialNavModel | undefined {
    const sp = navigatorModel?.specials?.find((x) => x.id === id)
    if (sp !== undefined) {
      if (sp.accessLevel !== undefined && !hasAccountRole(account, sp.accessLevel)) {
        return undefined
      }
      return sp
    }
    for (const s of navigatorModel?.spaces ?? []) {
      const sp = s.specials?.find((x) => x.id === id)
      if (sp !== undefined) {
        return sp
      }
    }
  }

  let cover: HTMLElement
  let workbenchWidth: number = $deviceInfo.docWidth

  $deviceInfo.navigator.float = workbenchWidth <= HIDE_NAVIGATOR
  const checkWorkbenchWidth = (): void => {
    if (workbenchWidth <= HIDE_NAVIGATOR && !$deviceInfo.navigator.float) {
      $deviceInfo.navigator.visible = false
      $deviceInfo.navigator.float = true
    } else if (workbenchWidth > HIDE_NAVIGATOR && $deviceInfo.navigator.float) {
      $deviceInfo.navigator.float = false
      $deviceInfo.navigator.visible = !hiddenNavigator
    }
  }
  checkWorkbenchWidth()
  $: if ($deviceInfo.docWidth <= FLOAT_ASIDE && !$sidebarStore.float) {
    hiddenAside = $sidebarStore.variant === SidebarVariant.MINI
    $sidebarStore.float = true
  } else if ($deviceInfo.docWidth > FLOAT_ASIDE && $sidebarStore.float) {
    $sidebarStore.float = false
    $sidebarStore.variant = hiddenAside ? SidebarVariant.MINI : SidebarVariant.EXPANDED
  }
  const checkOnHide = (): void => {
    if ($deviceInfo.navigator.visible && $deviceInfo.navigator.float) $deviceInfo.navigator.visible = false
  }
  let oldNavVisible: boolean = $deviceInfo.navigator.visible
  let oldASideVisible: boolean = $sidebarStore.variant !== SidebarVariant.MINI
  $: if (
    oldNavVisible !== $deviceInfo.navigator.visible ||
    oldASideVisible !== ($sidebarStore.variant !== SidebarVariant.MINI)
  ) {
    if (mobileAdaptive && $deviceInfo.navigator.float) {
      if ($deviceInfo.navigator.visible && $sidebarStore.variant !== SidebarVariant.MINI) {
        if (oldNavVisible) $deviceInfo.navigator.visible = false
        else $sidebarStore.variant = SidebarVariant.MINI
      }
    }
    oldNavVisible = $deviceInfo.navigator.visible
    oldASideVisible = $sidebarStore.variant !== SidebarVariant.MINI
  }
  $: if (
    $sidebarStore.float &&
    $sidebarStore.variant !== SidebarVariant.MINI &&
    $sidebarStore.widget === undefined &&
    $sidebarStore.widgetsState.size > 0
  ) {
    $sidebarStore.widget = Array.from($sidebarStore.widgetsState.keys())[0]
  }
  location.subscribe(() => {
    if (mobileAdaptive && $sidebarStore.variant !== SidebarVariant.MINI) $sidebarStore.variant = SidebarVariant.MINI
  })
  $: $deviceInfo.navigator.direction = $deviceInfo.isMobile && $deviceInfo.isPortrait ? 'horizontal' : 'vertical'
  let appsMini: boolean
  $: appsMini =
    $deviceInfo.isMobile &&
    (($deviceInfo.isPortrait && $deviceInfo.docWidth <= 480) ||
      (!$deviceInfo.isPortrait && $deviceInfo.docHeight <= 480))
  let popupPosition: PopupPosAlignment
  $: popupPosition =
    $deviceInfo.navigator.direction === 'horizontal'
      ? 'account-portrait'
      : $deviceInfo.navigator.direction === 'vertical' && $deviceInfo.isMobile
        ? 'account-mobile'
        : 'account'
  let popupSpacePosition: PopupPosAlignment
  $: popupSpacePosition = appsMini
    ? 'logo-mini'
    : $deviceInfo.navigator.direction === 'horizontal'
      ? 'logo-portrait'
      : 'logo'

  onMount(() => {
    subscribeMobile(setTheme)
  })

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

  const supportClient = getResource(support.function.GetSupport).then(
    async (res) =>
      await res((status) => {
        handleSupportStatusChanged(status)
      })
  )
  onDestroy(async () => {
    await supportClient?.then((support) => {
      support?.destroy()
    })
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
  defineSeparators('main', mainSeparators)

  $: mainNavigator = currentApplication && navigatorModel && $deviceInfo.navigator.visible
  $: elementPanel = $deviceInfo.replacedPanel ?? contentPanel

  $: deactivated =
    person && client.getHierarchy().hasMixin(person, contact.mixin.Employee)
      ? !client.getHierarchy().as(person, contact.mixin.Employee).active
      : false
</script>

{#if person && deactivated && !isAdminUser()}
  <div class="flex-col-center justify-center h-full flex-grow">
    <h1><Label label={workbench.string.AccountDisabled} /></h1>
    <Label label={workbench.string.AccountDisabledDescr} />
    <Button
      label={setting.string.Signout}
      kind={'link'}
      size={'small'}
      on:click={() => {
        void logOut().then(() => {
          navigate({ path: [loginId] })
        })
      }}
    />
  </div>
{:else if person || account.role === AccountRole.Owner || isAdminUser()}
  <ActionHandler {currentSpace} />
  <svg class="svg-mask">
    <clipPath id="notify-normal">
      <path d="M12,14c0-3.3,2.7-6,6-6c0.7,0,1.4,0.1,2,0.4V0H0v20h18C14.7,20,12,17.3,12,14z" />
      <path d="M18,20h2v-0.4C19.4,19.9,18.7,20,18,20z" />
    </clipPath>
    <clipPath id="notify-small">
      <path d="M10.5,12.2c0-2.9,2.4-5.2,5.2-5.2c0.6,0,1.2,0.1,1.8,0.3V0H0v17.5h15.8C12.9,17.5,10.5,15.1,10.5,12.2z" />
      <path d="M15.8,17.5h1.8v-0.4C17,17.4,16.4,17.5,15.8,17.5z" />
    </clipPath>
  </svg>
  <div class="workbench-container apps-{$deviceInfo.navigator.direction}">
    <div
      class="antiPanel-application {$deviceInfo.navigator.direction} no-print"
      class:lastDivider={!$deviceInfo.navigator.visible}
    >
      <div
        class="hamburger-container clear-mins"
        class:portrait={$deviceInfo.navigator.direction === 'horizontal'}
        class:landscape={$deviceInfo.navigator.direction === 'vertical'}
      >
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="logo-container clear-mins"
          class:mini={appsMini}
          on:click={() => {
            showPopup(SelectWorkspaceMenu, {}, popupSpacePosition)
          }}
        >
          <Logo mini={appsMini} workspace={windowWorkspaceName ?? $resolvedLocationStore.path[1]} />
        </div>
        <div class="topmenu-container clear-mins flex-no-shrink" class:mini={appsMini}>
          <AppItem
            icon={TopMenu}
            label={$deviceInfo.navigator.visible ? workbench.string.HideMenu : workbench.string.ShowMenu}
            selected={!$deviceInfo.navigator.visible}
            size={appsMini ? 'small' : 'medium'}
            on:click={toggleNav}
          />
        </div>
        <!-- <ActivityStatus status="active" /> -->
        <NavLink
          app={notificationId}
          shrink={0}
          disabled={!$deviceInfo.navigator.visible && $deviceInfo.navigator.float && currentAppAlias === notificationId}
        >
          <AppItem
            icon={notification.icon.Notifications}
            label={notification.string.Inbox}
            selected={currentAppAlias === notificationId || inboxPopup !== undefined}
            navigator={(currentAppAlias === notificationId || inboxPopup !== undefined) &&
              $deviceInfo.navigator.visible}
            on:click={(e) => {
              if (e.metaKey || e.ctrlKey) return
              if (!$deviceInfo.navigator.visible && $deviceInfo.navigator.float && currentAppAlias === notificationId) {
                toggleNav()
              } else if (currentAppAlias === notificationId && lastLoc !== undefined) {
                e.preventDefault()
                e.stopPropagation()
                navigate(lastLoc)
                lastLoc = undefined
              } else {
                lastLoc = $location
              }
            }}
            notify={hasInboxNotifications}
          />
        </NavLink>
        <Applications
          {apps}
          active={currentApplication?._id}
          direction={$deviceInfo.navigator.direction}
          on:toggleNav={toggleNav}
        />
      </div>
      <div
        class="info-box {$deviceInfo.navigator.direction}"
        class:vertical-mobile={$deviceInfo.navigator.direction === 'vertical'}
        class:mini={appsMini}
      >
        <AppItem
          icon={IconSettings}
          label={setting.string.Settings}
          size={appsMini ? 'small' : 'large'}
          on:click={() => showPopup(AppSwitcher, { apps }, popupPosition)}
        />
        <a href={supportLink} target="_blank" rel="noopener noreferrer">
          <AppItem
            icon={support.icon.Support}
            label={support.string.ContactUs}
            size={appsMini ? 'small' : 'large'}
            notify={supportStatus?.hasUnreadMessages}
            selected={supportStatus?.visible}
            loading={supportWidgetLoading}
          />
        </a>
        <!-- {#await supportClient then client}
          {#if client}
            <AppItem
              icon={support.icon.Support}
              label={support.string.ContactUs}
              size={appsMini ? 'small' : 'large'}
              notify={supportStatus?.hasUnreadMessages}
              selected={supportStatus?.visible}
              loading={supportWidgetLoading}
              on:click={async () => {
                await handleToggleSupportWidget()
              }}
            />
          {/if}
        {/await} -->
        <div
          class="flex-center"
          class:mt-3={$deviceInfo.navigator.direction === 'vertical'}
          class:ml-2={$deviceInfo.navigator.direction === 'horizontal'}
        >
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div
            id="profile-button"
            class="cursor-pointer"
            on:click|stopPropagation={() => showPopup(AccountPopup, {}, popupPosition)}
          >
            <Component
              is={contact.component.Avatar}
              props={{ person, name: person?.name, size: 'small', showStatus: true }}
            />
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
    <div class="flex-row-center w-full h-full">
      <div
        class="workbench-container inner"
        class:rounded={$sidebarStore.variant === SidebarVariant.EXPANDED}
        use:resizeObserver={(element) => {
          workbenchWidth = element.clientWidth
          checkWorkbenchWidth()
        }}
      >
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        {#if $deviceInfo.navigator.float && $deviceInfo.navigator.visible}
          <div class="cover shown" on:click={() => ($deviceInfo.navigator.visible = false)} />
        {/if}
        {#if mainNavigator}
          <div
            class="antiPanel-navigator no-print {$deviceInfo.navigator.direction === 'horizontal'
              ? 'portrait'
              : 'landscape'} border-left"
            class:fly={$deviceInfo.navigator.float}
          >
            <div class="antiPanel-wrap__content hulyNavPanel-container">
              {#if currentApplication}
                <NavHeader label={currentApplication.label} />
                {#if currentApplication.navHeaderComponent}
                  <Component
                    is={currentApplication.navHeaderComponent}
                    props={{
                      currentSpace,
                      currentSpecial,
                      currentFragment
                    }}
                    shrink
                  />
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
                {#if currentApplication && currentApplication.navFooterComponent}
                  <Component is={currentApplication.navFooterComponent} props={{ currentSpace }} />
                {/if}
              </NavFooter>
            </div>
            {#if !($deviceInfo.isMobile && $deviceInfo.isPortrait && $deviceInfo.minWidth)}
              <Separator
                name={'workbench'}
                float={$deviceInfo.navigator.float ? 'navigator' : true}
                index={0}
                color={'var(--theme-navpanel-border)'}
              />
            {/if}
          </div>
          <Separator
            name={'workbench'}
            float={$deviceInfo.navigator.float}
            index={0}
            color={'transparent'}
            separatorSize={0}
            short
          />
        {/if}
        <div
          bind:this={contentPanel}
          class={navigatorModel === undefined ? 'hulyPanels-container' : 'hulyComponent overflow-hidden'}
          class:straighteningCorners={$sidebarStore.float &&
            $sidebarStore.variant === SidebarVariant.EXPANDED &&
            !(mobileAdaptive && $deviceInfo.isPortrait)}
          data-id={'contentPanel'}
        >
          {#if currentApplication && currentApplication.component}
            <Component
              is={currentApplication.component}
              props={{
                currentSpace,
                workbenchWidth
              }}
            />
          {:else if specialComponent}
            <Component
              is={specialComponent.component}
              props={{
                model: navigatorModel,
                ...specialComponent.componentProps,
                currentSpace,
                space: currentSpace,
                navigationModel: specialComponent?.navigationModel,
                workbenchWidth,
                queryOptions: specialComponent?.queryOptions
              }}
              on:action={(e) => {
                if (e?.detail) {
                  const loc = getCurrentLocation()
                  loc.query = { ...loc.query, ...e.detail }
                  navigate(loc)
                }
              }}
            />
          {:else if currentView?.component !== undefined}
            <Component
              is={currentView.component}
              props={{ ...currentView.componentProps, currentView, workbenchWidth }}
            />
          {:else if $accessDeniedStore}
            <div class="flex-center h-full">
              <h2><Label label={workbench.string.AccessDenied} /></h2>
            </div>
          {:else}
            <SpaceView {currentSpace} {currentView} {createItemDialog} {createItemLabel} />
          {/if}
        </div>
      </div>
      {#if $sidebarStore.variant === SidebarVariant.EXPANDED && !$sidebarStore.float}
        <Separator name={'main'} index={0} color={'transparent'} separatorSize={0} short />
      {/if}
      <WidgetsBar />
    </div>
  </div>
  <Dock />
  <div bind:this={cover} class="cover" />
  <TooltipInstance />
  <PanelInstance bind:this={panelInstance} contentPanel={elementPanel}>
    <svelte:fragment slot="panel-header">
      <ActionContext context={{ mode: 'panel' }} />
    </svelte:fragment>
  </PanelInstance>
  <Popup bind:this={popupInstance} contentPanel={elementPanel}>
    <svelte:fragment slot="popup-header">
      <ActionContext context={{ mode: 'popup' }} />
    </svelte:fragment>
  </Popup>
  <div class="hidden max-w-0 max-h-0">
    <ComponentExtensions extension={workbench.extensions.WorkbenchExtensions} />
  </div>
  <BrowserNotificatator />
{/if}

<style lang="scss">
  .workbench-container {
    position: relative;
    display: flex;
    min-width: 0;
    min-height: 0;
    width: 100%;
    height: 100%;
    background-color: var(--theme-panel-color);
    touch-action: none;

    &.apps-horizontal {
      flex-direction: column-reverse;
    }
    &.inner {
      background-color: var(--theme-navpanel-color);

      .straighteningCorners {
        border-radius: var(--medium-BorderRadius) 0 0 var(--medium-BorderRadius);
      }
      &.rounded {
        border-radius: 0 var(--medium-BorderRadius) var(--medium-BorderRadius) 0;
      }
    }
    &:not(.inner)::after {
      position: absolute;
      content: '';
      inset: 0;
      border: 1px solid var(--theme-divider-color);
      border-radius: var(--medium-BorderRadius);
      pointer-events: none;
    }
    .antiPanel-application.horizontal {
      border-radius: 0 0 var(--medium-BorderRadius) var(--medium-BorderRadius);
      border-top: none;
    }
    .antiPanel-application:not(.horizontal) {
      border-radius: var(--medium-BorderRadius) 0 0 var(--medium-BorderRadius);
      border-right: none;
    }
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
      width: 1.75rem;
      height: 1.75rem;
    }
    .topmenu-container.mini {
      left: calc(1.75rem + 8px);
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

  @media print {
    .workbench-container:has(~ .panel-instance) {
      display: none;
    }
  }
</style>
