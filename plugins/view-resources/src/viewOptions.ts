import { SortingOrder } from '@hcengineering/core'
import { getCurrentLocation, locationToUrl } from '@hcengineering/ui'
import { DropdownViewOption, ToggleViewOption, Viewlet, ViewOptionModel, ViewOptions } from '@hcengineering/view'

export const noCategory = '#no_category'

export const defaulOptions: ViewOptions = {
  groupBy: noCategory,
  orderBy: ['modifiedBy', SortingOrder.Descending]
}

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

function _setViewOptions (prefix: string, options: ViewOptions): void {
  const key = makeViewOptionsKey(prefix)
  localStorage.setItem(key, JSON.stringify(options))
}

export function setViewOptions (viewlet: Viewlet, options: ViewOptions): void {
  const viewletKey = viewlet?._id + (viewlet?.variant !== undefined ? `-${viewlet.variant}` : '')
  _setViewOptions(viewletKey, options)
}

function _getViewOptions (prefix: string): ViewOptions | null {
  const key = makeViewOptionsKey(prefix)
  const options = localStorage.getItem(key)
  if (options === null) return null
  return JSON.parse(options)
}

export function getViewOptions (viewlet: Viewlet | undefined, defaults = defaulOptions): ViewOptions {
  if (viewlet === undefined) {
    return { ...defaults }
  }
  const viewletKey = viewlet?._id + (viewlet?.variant !== undefined ? `-${viewlet.variant}` : '')
  return _getViewOptions(viewletKey) ?? defaults
}
