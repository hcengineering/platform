// Copyright © 2025 Hardcore Engineering Inc.
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

import { get, writable } from 'svelte/store'
import { getCurrentAccount } from '@hcengineering/core'
import { location } from '@hcengineering/ui'

export interface ViewSetting {
  id: string
  on: boolean
}

export const hideUserNamesSettingId = 'view-settings.hide-user-names'

export const viewSettingsStore = writable<ViewSetting[]>([])

export function isViewSettingEnabled (settings: ViewSetting[], id: string): boolean {
  const index = settings.findIndex((it) => it.id === id)
  if (index === -1) return false
  return settings[index].on
}

export function updateViewSetting (id: string, on: boolean): void {
  const settings = get(viewSettingsStore)
  const index = settings.findIndex((it) => it.id === id)
  if (index === -1) {
    viewSettingsStore.set([...settings, { id, on }])
  } else {
    viewSettingsStore.set(settings.map((it) => (it.id === id ? { ...it, on } : it)))
  }
}

let prevWorkspace: string | undefined

location.subscribe((loc) => {
  const workspace = loc.path[1]
  if (prevWorkspace !== workspace) {
    initViewSettings()
    prevWorkspace = workspace
  }
})

viewSettingsStore.subscribe((settings) => {
  const key = geLocalStorageKey()
  if (key === undefined) return
  localStorage.setItem(key, JSON.stringify(settings))
})

function geLocalStorageKey (): string | undefined {
  const me = getCurrentAccount()
  const loc = get(location)
  const workspace = loc.path[1] ?? ''
  if (me == null || workspace === '') return undefined
  return `${workspace}.${me.uuid}.chat.view-settings.v1`
}

function initViewSettings (): void {
  const key = geLocalStorageKey()
  if (key === undefined) return

  const stored = localStorage.getItem(key)

  if (stored == null) {
    viewSettingsStore.set([])
    return
  }

  try {
    const data = JSON.parse(stored)
    Array.isArray(data) ? viewSettingsStore.set(data as ViewSetting[]) : viewSettingsStore.set([])
  } catch (e) {
    console.error(e)
    viewSettingsStore.set([])
  }
}
