import core, { Class, Doc, Ref, SortingOrder, Space, StatusManager } from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import { createQuery, getAttributePresenterClass, getClient, LiveQuery } from '@hcengineering/presentation'
import { getCurrentLocation, locationToUrl } from '@hcengineering/ui'
import {
  DropdownViewOption,
  ToggleViewOption,
  Viewlet,
  ViewletDescriptor,
  ViewOptionModel,
  ViewOptions,
  ViewOptionsModel
} from '@hcengineering/view'
import { get, writable } from 'svelte/store'
import view from './plugin'
import { groupByCategory } from './utils'

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

export function setViewOptions (viewlet: Viewlet, options: ViewOptions): void {
  const key = makeViewOptionsKey(viewlet)
  localStorage.setItem(key, JSON.stringify(options))
  setStore(key, options)
}

function setStore (key: string, options: ViewOptions): void {
  const map = get(viewOptionStore)
  map.set(key, options)
  viewOptionStore.set(map)
}

function _getViewOptions (viewlet: Viewlet, viewOptionStore: Map<string, ViewOptions>): ViewOptions | null {
  const key = makeViewOptionsKey(viewlet)
  const store = viewOptionStore.get(key)
  if (store !== undefined) {
    return store
  }
  const options = localStorage.getItem(key)
  if (options === null) return null
  const res = JSON.parse(options)
  setStore(key, res)
  return res
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

export function getViewOptions (
  viewlet: Viewlet | undefined,
  viewOptionStore: Map<string, ViewOptions>,
  defaults = defaulOptions
): ViewOptions {
  if (viewlet === undefined) {
    return { ...defaults }
  }
  const res = _getViewOptions(viewlet, viewOptionStore)
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

export async function showEmptyGroups (
  _class: Ref<Class<Doc>>,
  space: Ref<Space> | undefined,
  key: string,
  onUpdate: () => void,
  queryId: Ref<Doc>,
  mgr: StatusManager,
  viewletDescriptorId?: Ref<ViewletDescriptor>
): Promise<any[] | undefined> {
  const client = getClient()
  const hierarchy = client.getHierarchy()
  if (key === noCategory) return
  const attr = hierarchy.getAttribute(_class, key)
  if (attr === undefined) return
  const { attrClass } = getAttributePresenterClass(hierarchy, attr)
  const attributeClass = hierarchy.getClass(attrClass)

  if (hierarchy.isDerived(attrClass, core.class.Status)) {
    // We do not need extensions for all status categories.
    const statuses = mgr.statuses.filter((it) => it.ofAttribute === attr._id).map((it) => it._id)
    return await groupByCategory(client, _class, key, statuses, mgr)
  }

  const mixin = hierarchy.as(attributeClass, view.mixin.AllValuesFunc)
  if (mixin.func !== undefined) {
    const f = await getResource(mixin.func)
    const res = await f(space, onUpdate, queryId)
    if (res !== undefined) {
      return await groupByCategory(client, _class, key, res, mgr, viewletDescriptorId)
    }
  }
}

export const CategoryQuery = {
  queries: new Map<string, LiveQuery>(),
  results: new Map<string, any[]>(),

  getLiveQuery (index: string): LiveQuery {
    const current = CategoryQuery.queries.get(index)
    if (current !== undefined) return current
    const query = createQuery(true)
    this.queries.set(index, query)
    return query
  },
  remove (index: string): void {
    const lq = this.queries.get(index)
    lq?.unsubscribe()
    this.queries.delete(index)
    this.results.delete(index)
  }
}

export const viewOptionStore = writable(new Map<string, ViewOptions>())
