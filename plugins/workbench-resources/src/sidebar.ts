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
import { type Widget, type WidgetTab } from '@hcengineering/workbench'
import { getCurrentAccount, type Ref } from '@hcengineering/core'
import { get, writable } from 'svelte/store'
import { getCurrentLocation } from '@hcengineering/ui'
import { getResource } from '@hcengineering/platform'

import { workspaceStore } from './utils'

export enum SidebarVariant {
  MINI = 'mini',
  EXPANDED = 'expanded'
}

export interface WidgetState {
  _id: Ref<Widget>
  data?: Record<string, any>
  tabs: WidgetTab[]
  tab?: string
  closedByUser?: boolean
}

export interface SidebarState {
  variant: SidebarVariant
  widgetsState: Map<Ref<Widget>, WidgetState>
  widget?: Ref<Widget>
}

export const defaultSidebarState: SidebarState = {
  variant: SidebarVariant.MINI,
  widgetsState: new Map()
}

export const sidebarStore = writable<SidebarState>(defaultSidebarState)

workspaceStore.subscribe((workspace) => {
  sidebarStore.set(getSidebarStateFromLocalStorage(workspace ?? ''))
})

sidebarStore.subscribe(setSidebarStateToLocalStorage)

export function syncSidebarState (): void {
  const workspace = get(workspaceStore)
  sidebarStore.set(getSidebarStateFromLocalStorage(workspace ?? ''))
}
function getSideBarLocalStorageKey (workspace: string): string | undefined {
  const me = getCurrentAccount()
  if (me == null || workspace === '') return undefined
  return `workbench.${workspace}.${me.person}.sidebar.state.`
}

function getSidebarStateFromLocalStorage (workspace: string): SidebarState {
  const sidebarStateLocalStorageKey = getSideBarLocalStorageKey(workspace)
  if (sidebarStateLocalStorageKey === undefined) return defaultSidebarState
  const state = window.localStorage.getItem(sidebarStateLocalStorageKey)

  if (state == null || state === '') return defaultSidebarState

  try {
    const parsed = JSON.parse(state)

    return {
      ...defaultSidebarState,
      ...parsed,
      widgetsState: new Map(Object.entries(parsed.widgetsState ?? {}))
    }
  } catch (e) {
    console.error(e)
    setSidebarStateToLocalStorage(defaultSidebarState)
    return defaultSidebarState
  }
}

function setSidebarStateToLocalStorage (state: SidebarState): void {
  const workspace = get(workspaceStore)
  if (workspace == null || workspace === '') return

  const sidebarStateLocalStorageKey = getSideBarLocalStorageKey(workspace)
  if (sidebarStateLocalStorageKey === undefined) return
  window.localStorage.setItem(
    sidebarStateLocalStorageKey,
    JSON.stringify({ ...state, widgetsState: Object.fromEntries(state.widgetsState.entries()) })
  )
}

export function openWidget (widget: Widget, data?: Record<string, any>, active = true): void {
  const state = get(sidebarStore)
  const { widgetsState } = state
  const widgetState = widgetsState.get(widget._id)

  widgetsState.set(widget._id, {
    _id: widget._id,
    data: data ?? widgetState?.data,
    tab: widgetState?.tab,
    tabs: widgetState?.tabs ?? []
  })

  sidebarStore.set({
    ...state,
    widgetsState,
    variant: SidebarVariant.EXPANDED,
    widget: active ? widget._id : state.widget
  })
}

export function closeWidget (widget: Ref<Widget>): void {
  const state = get(sidebarStore)
  const { widgetsState } = state

  if (!widgetsState.has(widget) && state.widget !== widget && state.variant === SidebarVariant.MINI) {
    return
  }

  widgetsState.delete(widget)

  if (state.widget === widget) {
    sidebarStore.set({
      ...state,
      widgetsState,
      variant: SidebarVariant.MINI,
      widget: undefined
    })
  } else {
    sidebarStore.set({
      ...state,
      widgetsState
    })
  }
}

export async function closeWidgetTab (widget: Widget, tab: string): Promise<void> {
  const state = get(sidebarStore)
  const { widgetsState } = state
  const widgetState = widgetsState.get(widget._id)

  if (widgetState === undefined) return

  const tabs = widgetState.tabs
  const newTabs = tabs.filter((it) => it.id !== tab)
  const closedTab = tabs.find((it) => it.id === tab)

  if (widget.onTabClose !== undefined && closedTab !== undefined) {
    const fn = await getResource(widget.onTabClose)
    void fn(closedTab)
  }

  if (newTabs.length === 0) {
    if (widget.closeIfNoTabs === true) {
      widgetsState.delete(widget._id)
      sidebarStore.set({ ...state, widgetsState, variant: SidebarVariant.MINI })
    } else {
      widgetsState.set(widget._id, { ...widgetState, tabs: [], tab: undefined })
      sidebarStore.set({ ...state, widgetsState })
    }
    return
  }

  const shouldReplace = widgetState.tab === tab

  if (!shouldReplace) {
    widgetsState.set(widget._id, { ...widgetState, tabs: newTabs })
  } else {
    const index = tabs.findIndex((it) => it.id === widgetState.tab)
    const newTab = index === -1 ? newTabs[0] : tabs[index + 1] ?? tabs[index - 1] ?? newTabs[0]

    widgetsState.set(widget._id, { ...widgetState, tabs: newTabs, tab: newTab.id })
  }

  sidebarStore.set({
    ...state,
    ...widgetsState
  })
}

export function openWidgetTab (widget: Ref<Widget>, tab: string): void {
  const state = get(sidebarStore)
  const { widgetsState } = state
  const widgetState = widgetsState.get(widget)

  if (widgetState === undefined) return

  const newTab = widgetState.tabs.find((it) => it.id === tab)
  if (newTab === undefined) return

  widgetsState.set(widget, { ...widgetState, tab })
  sidebarStore.set({
    ...state,
    widgetsState
  })
}

export function createWidgetTab (widget: Widget, tab: WidgetTab, newTab = false): void {
  openWidget(widget)
  const state = get(sidebarStore)
  const { widgetsState } = state
  const widgetState = widgetsState.get(widget._id)
  const currentTabs = widgetState?.tabs ?? []
  const opened = currentTabs.some(({ id }) => id === tab.id) ?? false

  let newTabs: WidgetTab[]

  if (opened) {
    newTabs = currentTabs.map((it) => (it.id === tab.id ? { ...tab, isPinned: it.isPinned } : it))
  } else if (newTab || currentTabs.length === 0) {
    newTabs = [...currentTabs, tab]
  } else {
    const current =
      currentTabs.find(({ id }) => id === widgetState?.tab) ?? currentTabs.find(({ isPinned }) => isPinned === false)
    const shouldReplace = current !== undefined && current.isPinned !== true

    newTabs = shouldReplace ? currentTabs.map((it) => (it.id === current?.id ? tab : it)) : [...currentTabs, tab]
  }

  widgetsState.set(widget._id, {
    _id: widget._id,
    tabs: newTabs,
    tab: tab.id
  })

  sidebarStore.set({
    ...state,
    widgetsState
  })
}

export function pinWidgetTab (widget: Widget, tabId: string): void {
  const state = get(sidebarStore)
  const { widgetsState } = state
  const widgetState = widgetsState.get(widget._id)

  if (widgetState === undefined) return

  const tabs = widgetState.tabs
    .map((it) => (it.id === tabId ? { ...it, isPinned: true, allowedPath: undefined } : it))
    .sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned === true ? -1 : 1))

  widgetsState.set(widget._id, { ...widgetState, tabs })

  sidebarStore.set({
    ...state,
    widgetsState
  })
}

export function unpinWidgetTab (widget: Widget, tabId: string): void {
  const state = get(sidebarStore)
  const { widgetsState } = state
  const widgetState = widgetsState.get(widget._id)

  if (widgetState === undefined) return
  const tab = widgetState.tabs.find((it) => it.id === tabId)

  if (tab?.allowedPath !== undefined) {
    const loc = getCurrentLocation()
    const path = loc.path.join('/')
    if (!path.startsWith(tab.allowedPath)) {
      void closeWidgetTab(widget, tabId)
    }
  }

  const tabs = widgetState.tabs
    .map((it) => (it.id === tabId ? { ...it, isPinned: false } : it))
    .sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned === true ? -1 : 1))

  widgetsState.set(widget._id, { ...widgetState, tabs })

  sidebarStore.set({
    ...state,
    widgetsState
  })
}

function isDescendant (parent: HTMLElement, child: HTMLElement): boolean {
  let node = child.parentNode
  while (node != null) {
    if (node === parent) {
      return true
    }
    node = node.parentNode
  }
  return false
}

export function isElementFromSidebar (element: HTMLElement): boolean {
  const sidebarElement = document.getElementById('sidebar')
  if (sidebarElement == null) {
    return false
  }

  return isDescendant(sidebarElement, element)
}

export function minimizeSidebar (closedByUser = false): void {
  const state = get(sidebarStore)
  const { widget, widgetsState } = state
  const widgetState = widget == null ? undefined : widgetsState.get(widget)

  if (widget !== undefined && widgetState !== undefined && closedByUser) {
    widgetsState.set(widget, { ...widgetState, closedByUser })
  }

  sidebarStore.set({ ...state, ...widgetsState, widget: undefined, variant: SidebarVariant.MINI })
}
