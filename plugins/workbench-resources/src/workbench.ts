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
import core, { concatLink, getCurrentAccount, type Ref } from '@hcengineering/core'
import workbench, { type WorkbenchTab } from '@hcengineering/workbench'
import {
  location as locationStore,
  locationToUrl,
  parseLocation,
  type Location,
  navigate,
  getCurrentLocation
} from '@hcengineering/ui'
import presentation, { getClient } from '@hcengineering/presentation'
import { getMetadata } from '@hcengineering/platform'

import { workspaceStore } from './utils'

export const tabIdStore = writable<Ref<WorkbenchTab> | undefined>()
export const tabsStore = writable<WorkbenchTab[]>([])
export const currentTabStore = derived([tabIdStore, tabsStore], ([tabId, tabs]) => {
  return tabs.find((tab) => tab._id === tabId)
})

workspaceStore.subscribe((workspace) => {
  tabIdStore.set(getTabFromLocalStorage(workspace ?? ''))
})

locationStore.subscribe((loc) => {
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

  void getClient().update(tab, { location: locationToUrl(loc) })
})

tabIdStore.subscribe(saveTabToLocalStorage)

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

export function getTabLocation (tab: WorkbenchTab): Location {
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
  const tab = await client.createDoc(workbench.class.WorkbenchTab, core.space.Workspace, {
    attachedTo: me._id,
    location: locationToUrl(loc),
    isPinned: false
  })

  selectTab(tab)
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
