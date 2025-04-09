import {
  type Class,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type Hierarchy,
  type Ref,
  SortingOrder,
  type Space
} from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import { type LiveQuery, createQuery, getAttributePresenterClass, getClient } from '@hcengineering/presentation'
import { locationToUrl, getCurrentResolvedLocation } from '@hcengineering/ui'
import {
  type ViewOptionsOption,
  type ViewQueryOption,
  type DropdownViewOption,
  type Groupping,
  type ToggleViewOption,
  type ViewOptionModel,
  type ViewOptions,
  type Viewlet,
  type ViewletDescriptor
} from '@hcengineering/view'
import { get, writable } from 'svelte/store'
import view from './plugin'
import { groupByCategory } from './utils'

export const noCategory = '#no_category'

export const defaultOptions: ViewOptions = {
  groupBy: [noCategory],
  orderBy: ['modifiedBy', SortingOrder.Descending]
}

export function isToggleType (viewOption: ViewOptionModel): viewOption is ToggleViewOption {
  return viewOption.type === 'toggle'
}

export function isDropdownType (viewOption: ViewOptionModel): viewOption is DropdownViewOption {
  return viewOption.type === 'dropdown'
}

function makeViewOptionsKey (viewlet: Viewlet, variant?: string, ignoreViewletKey = false): string {
  const prefix =
    viewlet.viewOptions?.storageKey !== undefined && !ignoreViewletKey
      ? viewlet.viewOptions.storageKey
      : viewlet._id + (variant !== undefined ? `-${variant}` : '')
  const loc = getCurrentResolvedLocation()
  loc.fragment = undefined
  loc.query = undefined
  return `viewOptions:${prefix}:${locationToUrl(loc)}`
}

export function setViewOptions (viewlet: Viewlet, options: ViewOptions): void {
  const key = makeViewOptionsKey(viewlet, viewlet.variant)
  localStorage.setItem(key, JSON.stringify(options))
  setStore(key, options)
}

function setStore (key: string, options: ViewOptions): void {
  const map = get(viewOptionStore)
  map.set(key, options)
  viewOptionStore.set(map)
}

function _getViewOptions (viewlet: Viewlet, viewOptionStore: Map<string, ViewOptions>): ViewOptions | null {
  const key = makeViewOptionsKey(viewlet, viewlet.variant)
  const store = viewOptionStore.get(key)
  if (store !== undefined) {
    return store
  }
  let options = localStorage.getItem(key)
  if (options === null) {
    const key = makeViewOptionsKey(viewlet, viewlet.variant, true)
    options = localStorage.getItem(key)
    if (options === null) {
      return null
    }
  }
  const res = JSON.parse(options)
  setStore(key, res)
  return res
}

export function getViewOptions (
  viewlet: Viewlet | undefined,
  viewOptionStore: Map<string, ViewOptions>,
  defaults = defaultOptions
): ViewOptions {
  if (viewlet === undefined) {
    return { ...defaults }
  }
  const res = _getViewOptions(viewlet, viewOptionStore)
  if (res !== null) return res
  return defaults
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
    let ind = res.groupBy.findIndex((p) => p === 'state')
    while (ind !== -1) {
      res.groupBy[ind] = 'status'
      ind = res.groupBy.findIndex((p) => p === 'state')
    }
    if (res.orderBy[0] === 'state') {
      res.orderBy[0] = 'status'
    }
    let ind2 = res.groupBy.findIndex((p) => p === 'doneState')
    while (ind2 !== -1) {
      res.groupBy[ind2] = 'status'
      ind2 = res.groupBy.findIndex((p) => p === 'doneState')
    }
    if (res.orderBy[0] === 'doneState') {
      res.orderBy[0] = 'status'
    }
    localStorage.setItem(key, JSON.stringify(res))
  }
}

export function hideArchived (value: any, options: FindOptions<Doc> | undefined): FindOptions<Doc> {
  return typeof value === 'boolean' ? { ...options, showArchived: !value } : options ?? {}
}

export async function showEmptyGroups (
  _class: Ref<Class<Doc>>,
  query: DocumentQuery<Doc> | undefined,
  space: Ref<Space> | undefined,
  key: string,
  onUpdate: () => void,
  queryId: Ref<Doc>,
  viewletDescriptorId?: Ref<ViewletDescriptor>
): Promise<any[] | undefined> {
  const client = getClient()
  const hierarchy = client.getHierarchy()
  if (key === noCategory) return
  const attr = hierarchy.getAttribute(_class, key)
  if (attr === undefined) return
  const { attrClass } = getAttributePresenterClass(hierarchy, attr)
  const attributeClass = hierarchy.getClass(attrClass)

  let groupMixin: Groupping | undefined
  if (hierarchy.hasMixin(attributeClass, view.mixin.Groupping)) {
    groupMixin = hierarchy.as(attributeClass, view.mixin.Groupping)
  } else {
    const _attributeClass = hierarchy.classHierarchyMixin(attrClass, view.mixin.Groupping)
    if (_attributeClass !== undefined) {
      groupMixin = hierarchy.as(_attributeClass, view.mixin.Groupping)
    }
  }
  if (groupMixin?.grouppingManager !== undefined) {
    const grouppingManager = await getResource(groupMixin.grouppingManager)
    const docs = grouppingManager.groupValuesWithEmpty(hierarchy, _class, key, query)
    return await groupByCategory(client, _class, space, key, docs, viewletDescriptorId)
  }

  const allValuesMixin = hierarchy.as(attributeClass, view.mixin.AllValuesFunc)
  if (allValuesMixin.func !== undefined) {
    const f = await getResource(allValuesMixin.func)
    const res = await f(query, onUpdate, queryId, attr)
    if (res !== undefined) {
      return await groupByCategory(client, _class, space, key, res, viewletDescriptorId)
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

export async function getResultOptions<T extends Doc> (
  options: FindOptions<T> | undefined,
  viewOptions: ViewOptionModel[] | undefined,
  viewOptionsStore: ViewOptions | undefined
): Promise<FindOptions<T> | undefined> {
  if (viewOptions === undefined || viewOptionsStore === undefined) {
    return options
  }
  let result: FindOptions<T> = options !== undefined ? { ...options } : {}
  for (const viewOption of viewOptions) {
    if (viewOption.actionTarget !== 'options') continue
    const queryOption = viewOption as ViewOptionsOption
    const f = await getResource(queryOption.action)
    result = f(viewOptionsStore[queryOption.key] ?? queryOption.defaultValue, result) as FindOptions<T>
  }
  return Object.keys(result).length > 0 ? result : undefined
}

export async function getResultQuery (
  hierarchy: Hierarchy,
  query: DocumentQuery<Doc>,
  viewOptions: ViewOptionModel[] | undefined,
  viewOptionsStore: ViewOptions | undefined
): Promise<DocumentQuery<Doc>> {
  if (viewOptions === undefined || viewOptionsStore === undefined) {
    return query
  }
  let result: DocumentQuery<Doc> = hierarchy.clone(query)
  for (const viewOption of viewOptions) {
    if (viewOption.actionTarget !== 'query') continue
    const queryOption = viewOption as ViewQueryOption
    const f = await getResource(queryOption.action)
    const resultP = f(viewOptionsStore[queryOption.key] ?? queryOption.defaultValue, result)
    if (resultP instanceof Promise) {
      result = await resultP
    } else {
      result = resultP
    }
  }
  return result
}
