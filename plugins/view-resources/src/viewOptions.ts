import { SortingOrder } from '@hcengineering/core'
import { getCurrentLocation, locationToUrl } from '@hcengineering/ui'
import { DropdownViewOption, ToggleViewOption, ViewOptionModel, ViewOptions } from '@hcengineering/view'
import { writable } from 'svelte/store'

export const noCategory = '#no_category'

export const defaulOptions: ViewOptions = {
  groupBy: noCategory,
  orderBy: ['modifiedBy', SortingOrder.Descending]
}

export const viewOptionsStore = writable<ViewOptions>(defaulOptions)

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
