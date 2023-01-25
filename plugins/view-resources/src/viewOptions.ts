import { SortingOrder } from '@hcengineering/core'
import { getCurrentLocation, locationToUrl } from '@hcengineering/ui'
import {
  DropdownViewOption,
  ToggleViewOption,
  Viewlet,
  ViewOptionModel,
  ViewOptions,
  ViewOptionsModel
} from '@hcengineering/view'

export const noCategory = '#no_category'

export const defaulOptions: ViewOptions = {
  groupBy: [noCategory],
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

function getDefaults (viewOptions: ViewOptionsModel): ViewOptions {
  const res: ViewOptions = {
    groupBy: [viewOptions.groupBy[0]],
    orderBy: viewOptions.orderBy[0]
  }
  for (const opt of viewOptions.other) {
    res[opt.key] = opt.defaultValue
  }
  return res
}

export function getViewOptions (viewlet: Viewlet | undefined, defaults = defaulOptions): ViewOptions {
  if (viewlet === undefined) {
    return { ...defaults }
  }
  const res = _getViewOptions(viewlet)
  if (res !== null) return res
  return viewlet.viewOptions != null ? getDefaults(viewlet.viewOptions) : defaults
}

export function migrateViewOpttions (): void {
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index)
    if (key === null) continue
    if (!key.startsWith('viewOptions:')) continue
    const options = localStorage.getItem(key)
    if (options === null) continue
    const res = JSON.parse(options) as ViewOptions
    if (!Array.isArray(res.groupBy)) {
      res.groupBy = [res.groupBy]
    }
    localStorage.setItem(key, JSON.stringify(res))
  }
}
