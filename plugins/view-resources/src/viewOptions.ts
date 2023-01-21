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

function makeViewOptionsKey (viewlet: Viewlet): string {
  const prefix = viewlet?._id + (viewlet?.variant !== undefined ? `-${viewlet.variant}` : '')
  const loc = getCurrentLocation()
  loc.fragment = undefined
  loc.query = undefined
  return `viewOptions:${prefix}:${locationToUrl(loc)}`
}

function _setViewOptions (viewlet: Viewlet, options: ViewOptions): void {
  const key = makeViewOptionsKey(viewlet)
  localStorage.setItem(key, JSON.stringify(options))
}

export function setViewOptions (viewlet: Viewlet, options: ViewOptions): void {
  _setViewOptions(viewlet, options)
}

function _getViewOptions (viewlet: Viewlet): ViewOptions | null {
  const key = makeViewOptionsKey(viewlet)
  const options = localStorage.getItem(key)
  if (options === null) return null
  return JSON.parse(options)
}

export function getViewOptions (viewlet: Viewlet | undefined, defaults = defaulOptions): ViewOptions {
  if (viewlet === undefined) {
    return { ...defaults }
  }
  return _getViewOptions(viewlet) ?? defaults
}
