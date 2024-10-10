//
// Copyright © 2024 Hardcore Engineering Inc.
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
//
import { derived, get, writable } from 'svelte/store'
import core, { type Class, concatLink, type Doc, getCurrentAccount, type Ref } from '@hcengineering/core'
import { type Application, workbenchId, type WorkbenchTab } from '@hcengineering/workbench'
import {
  location as locationStore,
  locationToUrl,
  parseLocation,
  type Location,
  navigate,
  getCurrentLocation,
  languageStore,
  type AnyComponent
} from '@hcengineering/ui'
import presentation, { getClient } from '@hcengineering/presentation'
import view from '@hcengineering/view'
import { type Asset, type IntlString, getMetadata, getResource, translate } from '@hcengineering/platform'
import { parseLinkId } from '@hcengineering/view-resources'
import { notificationId } from '@hcengineering/notification'

import { workspaceStore } from './utils'
import workbench from './plugin'

export const tabIdStore = writable<Ref<WorkbenchTab> | undefined>()
export const tabsStore = writable<WorkbenchTab[]>([])
export const currentTabStore = derived([tabIdStore, tabsStore], ([tabId, tabs]) => {
  return tabs.find((tab) => tab._id === tabId)
})

workspaceStore.subscribe((workspace) => {
  tabIdStore.set(getTabFromLocalStorage(workspace ?? ''))
})

locationStore.subscribe(() => {
  void syncTabLoc()
})

tabIdStore.subscribe(saveTabToLocalStorage)

async function syncTabLoc (): Promise<void> {
  const loc = getCurrentLocation()
  const workspace = get(workspaceStore)
  if (workspace == null || workspace === '') return
  const tab = get(currentTabStore)
  if (tab == null) return
  const tabId = tab._id
  if (tabId == null || tab._id !== tabId) return
  const tabLoc = getTabLocation(tab)
  const tabWs = tabLoc.path[1]
  if (workspace !== tabWs) {
    return
  }
  if (loc.path[2] === '' || loc.path[2] == null) return
  const data = await getTabDataByLocation(loc)
  const name = data.name ?? (await translate(data.label, {}, get(languageStore)))

  if (tab.name !== undefined && name !== tab.name && tab.isPinned) {
    const me = getCurrentAccount()
    const _id = await getClient().createDoc(workbench.class.WorkbenchTab, core.space.Workspace, {
      location: locationToUrl(loc),
      name,
      attachedTo: me._id,
      isPinned: false
    })
    selectTab(_id)
  } else {
    await getClient().update(tab, { location: locationToUrl(loc), name })
  }
}
export function syncWorkbenchTab (): void {
  const workspace = get(workspaceStore)
  tabIdStore.set(getTabFromLocalStorage(workspace ?? ''))
}

function getTabIdLocalStorageKey (workspace: string): string | undefined {
  const me = getCurrentAccount()
  if (me == null || workspace === '') return undefined
  return `workbench.${workspace}.${me.person}.tab`
}

function getTabFromLocalStorage (workspace: string): Ref<WorkbenchTab> | undefined {
  const localStorageKey = getTabIdLocalStorageKey(workspace)
  if (localStorageKey === undefined) return undefined

  const tab = window.localStorage.getItem(localStorageKey)
  if (tab == null || tab === '') return undefined

  return tab as Ref<WorkbenchTab>
}

function saveTabToLocalStorage (_id: Ref<WorkbenchTab> | undefined): void {
  const workspace = get(workspaceStore)
  if (workspace == null || workspace === '') return

  const localStorageKey = getTabIdLocalStorageKey(workspace)
  if (localStorageKey === undefined) return
  window.localStorage.setItem(localStorageKey, _id ?? '')
}

export function selectTab (_id: Ref<WorkbenchTab>): void {
  tabIdStore.set(_id)
}

export function getTabLocation (tab: Pick<WorkbenchTab, 'location'>): Location {
  const base = `${window.location.protocol}//${window.location.host}`
  const front = getMetadata(presentation.metadata.FrontUrl) ?? base
  const url = new URL(concatLink(front, tab.location))

  return parseLocation(url)
}

export async function closeTab (tab: WorkbenchTab): Promise<void> {
  const tabs = get(tabsStore)
  const index = tabs.findIndex((t) => t._id === tab._id)
  if (index === -1) return

  tabsStore.update((tabs) => tabs.filter((t) => t._id !== tab._id))
  if (get(tabIdStore) === tab._id) {
    const newTab = tabs[index - 1] ?? tabs[index + 1]
    tabIdStore.set(newTab?._id)
    if (newTab !== undefined) {
      navigate(getTabLocation(newTab))
    }
  }

  const client = getClient()
  await client.remove(tab)
}

export async function createTab (): Promise<void> {
  const loc = getCurrentLocation()
  const client = getClient()
  const me = getCurrentAccount()
  const defaultUrl = `${workbenchId}/${loc.path[1]}/${notificationId}`
  const tab = await client.createDoc(workbench.class.WorkbenchTab, core.space.Workspace, {
    attachedTo: me._id,
    location: defaultUrl,
    isPinned: false
  })

  selectTab(tab)
  navigate(getTabLocation({ location: defaultUrl }))
}

export function canCloseTab (tab: WorkbenchTab): boolean {
  const tabs = get(tabsStore)
  return tabs.length > 1 && tabs.some((t) => t._id === tab._id)
}

export async function pinTab (tab: WorkbenchTab): Promise<void> {
  const client = getClient()
  await client.update(tab, { isPinned: true })
}

export async function unpinTab (tab: WorkbenchTab): Promise<void> {
  const client = getClient()
  await client.update(tab, { isPinned: false })
}

export async function getTabDataByLocation (loc: Location): Promise<{
  name?: string
  label: IntlString
  icon?: Asset
  iconComponent?: AnyComponent
  iconProps?: Record<string, any>
}> {
  const client = getClient()
  const appAlias = loc.path[2]
  const application = client.getModel().findAllSync<Application>(workbench.class.Application, { alias: appAlias })[0]

  let name: string | undefined
  let label: IntlString | undefined
  let icon: Asset | undefined
  let iconComponent: AnyComponent | undefined
  let iconProps: Record<string, any> | undefined

  if (application?.locationDataResolver != null) {
    const resolver = await getResource(application.locationDataResolver)
    const data = await resolver(loc)
    name = data.name
    label = data.nameIntl ?? application.label ?? workbench.string.Tab
    iconComponent = data.iconComponent
    icon = data.icon ?? application.icon
    iconProps = data.iconProps
  } else {
    const special = loc.path[3]
    const specialLabel = application?.navigatorModel?.specials?.find((s) => s.id === special)?.label
    const resolvedLoc = await getResolvedLocation(loc, application)
    name = await getDefaultTabName(resolvedLoc)
    label = specialLabel ?? application?.label ?? workbench.string.Tab
    icon = application?.icon
  }

  return { name, label, icon, iconComponent, iconProps }
}

async function getResolvedLocation (loc: Location, app?: Application): Promise<Location> {
  if (app?.locationResolver === undefined) return loc

  const resolver = await getResource(app.locationResolver)
  return (await resolver(loc))?.loc ?? loc
}

async function getDefaultTabName (loc: Location): Promise<string | undefined> {
  if (loc.fragment == null) return
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const [, id, _class] = decodeURIComponent(loc.fragment).split('|')
  if (_class == null) return

  const mixin = hierarchy.classHierarchyMixin(_class as Ref<Class<Doc>>, view.mixin.ObjectTitle)
  if (mixin === undefined) return
  const titleProvider = await getResource(mixin.titleProvider)
  try {
    const linkProviders = client.getModel().findAllSync(view.mixin.LinkIdProvider, {})
    const _id = await parseLinkId(linkProviders, id, _class as Ref<Class<Doc>>)
    return await titleProvider(client, _id)
  } catch (err: any) {
    console.error(err)
  }
}
