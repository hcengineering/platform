import { IntlString } from '@anticrm/platform'
import { getCurrentLocation, locationToUrl } from '@anticrm/ui'
import { writable } from 'svelte/store'

export type ViewOptions = Record<string, any>

export const viewOptionsStore = writable<ViewOptions>({})

export function isToggleType (viewOption: ViewOptionModel): viewOption is ToggleViewOption {
  return viewOption.type === 'toggle'
}

export function isDropdownType (viewOption: ViewOptionModel): viewOption is DropdownViewOption {
  return viewOption.type === 'dropdown'
}

function makeViewOptionsKey (prefix: string): string {
  const loc = getCurrentLocation()
  loc.fragment = undefined
  loc.query = undefined
  return `viewOptions:${prefix}:${locationToUrl(loc)}`
}

export function setViewOptions (prefix: string, options: ViewOptions): void {
  const key = makeViewOptionsKey(prefix)
  localStorage.setItem(key, JSON.stringify(options))
}

export function getViewOptions (prefix: string): ViewOptions | null {
  const key = makeViewOptionsKey(prefix)
  const options = localStorage.getItem(key)
  if (options === null) return null
  return JSON.parse(options)
}

export interface ViewOption {
  type: string
  key: string
  defaultValue: any
  label: IntlString
  group?: string
  hidden?: (viewOptions: ViewOptions) => boolean
}

export interface ToggleViewOption extends ViewOption {
  type: 'toggle'
  defaultValue: boolean
}

export interface DropdownViewOption extends ViewOption {
  type: 'dropdown'
  defaultValue: string
  values: Array<{ label: IntlString, id: string, hidden?: (viewOptions: ViewOptions) => boolean }>
}

export type ViewOptionModel = ToggleViewOption | DropdownViewOption
