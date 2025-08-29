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

export interface HomeSetting {
  id: string
  on: boolean
}

export const compactSettingId = 'home-settings.compact'
export const comfortableSettingId = 'home-settings.comfortable'
export const comfortableSettingId2 = 'home-settings.comfortable2'

const defaultValues = {
  [compactSettingId]: false,
  [comfortableSettingId]: true,
  [comfortableSettingId2]: false
} as const

export const homeViewSettings = [compactSettingId, comfortableSettingId, comfortableSettingId2]

export const homeSettingsStore = writable<HomeSetting[]>([])

export function isHomeSettingEnabled (settings: HomeSetting[], id: string): boolean {
  const index = settings.findIndex((it) => it.id === id)
  if (index === -1) return (defaultValues as any)[id] ?? false
  return settings[index].on
}

export function updateHomeSetting (id: string, on: boolean): void {
  const settings = get(homeSettingsStore)
  const index = settings.findIndex((it) => it.id === id)
  if (index === -1) {
    homeSettingsStore.set([...settings, { id, on }])
  } else {
    homeSettingsStore.set(settings.map((it) => (it.id === id ? { ...it, on } : it)))
  }
}

let prevWorkspace: string | undefined

location.subscribe((loc) => {
  const workspace = loc.path[1]
  if (prevWorkspace !== workspace) {
    initHomeSettings()
    prevWorkspace = workspace
  }
})

homeSettingsStore.subscribe((settings) => {
  const key = geLocalStorageKey()
  if (key === undefined) return
  localStorage.setItem(key, JSON.stringify(settings))
})

function geLocalStorageKey (): string | undefined {
  const me = getCurrentAccount()
  const loc = get(location)
  const workspace = loc.path[1] ?? ''
  if (me == null || workspace === '') return undefined
  return `${workspace}.${me.uuid}.home.settings.v1`
}

function initHomeSettings (): void {
  const key = geLocalStorageKey()
  if (key === undefined) return

  const stored = localStorage.getItem(key)

  if (stored == null) {
    homeSettingsStore.set([])
    return
  }

  try {
    const data = JSON.parse(stored)
    Array.isArray(data) ? homeSettingsStore.set(data as HomeSetting[]) : homeSettingsStore.set([])
  } catch (e) {
    console.error(e)
    homeSettingsStore.set([])
  }
}
