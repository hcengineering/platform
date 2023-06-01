import core, {
  AnyAttribute,
  AttachedDoc,
  Class,
  Collection,
  Doc,
  FindResult,
  Hierarchy,
  ObjQueryType,
  Ref,
  RefTo
} from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import { LiveQuery, createQuery, getClient } from '@hcengineering/presentation'
import { AnyComponent, getCurrentResolvedLocation, locationToUrl } from '@hcengineering/ui'
import { Filter, FilterMode, FilteredView, KeyFilter } from '@hcengineering/view'
import { get, writable } from 'svelte/store'
import view from './plugin'

/**
 * @public
 */
export const filterStore = writable<Filter[]>([])

/**
 * @public
 */
export const selectedFilterStore = writable<FilteredView | undefined>()

export function setFilters (filters: Filter[]): void {
  const old = get(filterStore)
  old.forEach((p) => p.onRemove?.())
  filterStore.set(filters)
}

export function removeFilter (i: number): void {
  const old = get(filterStore)
  old[i]?.onRemove?.()
  old.splice(i, 1)
  filterStore.set(old)
}

export function updateFilter (filter: Filter): void {
  const old = get(filterStore)
  const index = old.findIndex((p) => p.index === filter.index)
  if (index === -1) {
    old.push(filter)
  } else {
    old[index] = filter
  }
  filterStore.set(old)
}

export async function arrayAllResult (filter: Filter): Promise<ObjQueryType<any>> {
  return { $all: filter.value.map((p) => p[1]).flat() }
}

export async function arrayAnyResult (filter: Filter): Promise<ObjQueryType<any>> {
  return { $in: filter.value.map((p) => p[1]).flat() }
}

export async function objectInResult (filter: Filter): Promise<ObjQueryType<any>> {
  return { $in: filter.value }
}

export async function objectNinResult (filter: Filter): Promise<ObjQueryType<any>> {
  return { $nin: filter.value }
}

export async function valueInResult (filter: Filter): Promise<ObjQueryType<any>> {
  return { $in: filter.value.map((p) => p[1]).flat() }
}

export async function valueNinResult (filter: Filter): Promise<ObjQueryType<any>> {
  return { $nin: filter.value.map((p) => p[1]).flat() }
}

export async function beforeResult (filter: Filter): Promise<ObjQueryType<any>> {
  const todayStart = new Date(filter.value[0]).setHours(0, 0, 0, 0)
  return { $lte: todayStart }
}

export async function afterResult (filter: Filter): Promise<ObjQueryType<any>> {
  const todayStart = new Date(filter.value[0]).setHours(0, 0, 0, 0)
  return { $gte: todayStart }
}

export async function containsResult (filter: Filter): Promise<ObjQueryType<any>> {
  const [value] = filter.value

  return typeof value === 'string' ? { $like: `%${value}%` } : {}
}

export async function nestedMatchResult (filter: Filter, onUpdate: () => void): Promise<ObjQueryType<any>> {
  if (filter.nested === undefined) return {}
  const result = await getRefs(filter.nested, onUpdate)
  return { $in: result }
}

export async function nestedDontMatchResult (filter: Filter, onUpdate: () => void): Promise<ObjQueryType<any>> {
  if (filter.nested === undefined) return {}
  const result = await getRefs(filter.nested, onUpdate)
  return { $nin: result }
}

export async function dateOutdated (filter: Filter): Promise<ObjQueryType<any>> {
  return { $lt: new Date() }
}

export async function dateToday (filter: Filter): Promise<ObjQueryType<any>> {
  const todayStart = new Date().setHours(0, 0, 0, 0)
  const todayEnd = new Date().setHours(23, 59, 59, 999)
  return { $gte: todayStart, $lte: todayEnd }
}

export async function dateYesterday (filter: Filter): Promise<ObjQueryType<any>> {
  const yesterday = new Date(new Date().setDate(new Date().getDate() - 1))
  const yesterdayStart = new Date(yesterday).setHours(0, 0, 0, 0)
  const yesterdayEnd = new Date(yesterday).setHours(23, 59, 59, 999)
  return { $gte: yesterdayStart, $lte: yesterdayEnd }
}

export async function dateWeek (filter: Filter): Promise<ObjQueryType<any>> {
  const day = new Date().getDay()
  const startDayDiff = day === 0 ? 6 : day - 1
  const endDayDiff = 7 - startDayDiff
  const weekStart = new Date(new Date().setDate(new Date().getDate() - startDayDiff)).setHours(0, 0, 0, 0)
  const weekEnd = new Date(new Date().setDate(new Date().getDate() + endDayDiff)).setHours(23, 59, 59, 999)
  return { $gte: weekStart, $lte: weekEnd }
}

export async function dateNextWeek (filter: Filter): Promise<ObjQueryType<any>> {
  const day = new Date().getDay()
  const startDayDiff = day === 0 ? 6 : day - 1
  const endDayDiff = 7 - startDayDiff
  const weekStart = new Date(new Date().setDate(new Date().getDate() - startDayDiff + 7)).setHours(0, 0, 0, 0)
  const weekEnd = new Date(new Date().setDate(new Date().getDate() + endDayDiff + 7)).setHours(23, 59, 59, 999)
  return { $gte: weekStart, $lte: weekEnd }
}

export async function dateMonth (filter: Filter): Promise<ObjQueryType<any>> {
  const today = new Date()
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const monthStart = new Date(new Date().setDate(1)).setHours(0, 0, 0, 0)
  const monthEnd = lastDayOfMonth.setHours(23, 59, 59, 999)
  return { $gte: monthStart, $lte: monthEnd }
}

export async function dateNextMonth (filter: Filter): Promise<ObjQueryType<any>> {
  const today = new Date()
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0)
  const monthStart = new Date(new Date().setMonth(new Date().getMonth() + 1, 1)).setHours(0, 0, 0, 0)
  const monthEnd = lastDayOfMonth.setHours(23, 59, 59, 999)
  return { $gte: monthStart, $lte: monthEnd }
}

export async function dateNotSpecified (filter: Filter): Promise<ObjQueryType<any>> {
  return { $in: [undefined, null] }
}

export async function dateCustom (filter: Filter): Promise<ObjQueryType<any>> {
  if (filter.value.length === 1) {
    const todayStart = new Date(filter.value[0]).setHours(0, 0, 0, 0)
    const todayEnd = new Date(filter.value[0]).setHours(23, 59, 59, 999)
    return { $gte: todayStart, $lte: todayEnd }
  }
  if (filter.value.length === 2) {
    const todayStart = new Date(filter.value[0]).setHours(0, 0, 0, 0)
    const todayEnd = new Date(filter.value[1]).setHours(23, 59, 59, 999)
    return { $gte: todayStart, $lte: todayEnd }
  }
  return await dateNotSpecified(filter)
}

/**
 * @public
 */
export const FilterQuery = {
  queries: new Map<number, LiveQuery>(),
  results: new Map<number, Array<Ref<Doc>>>(),

  getLiveQuery (index: number): LiveQuery {
    const current = FilterQuery.queries.get(index)
    if (current !== undefined) return current
    const query = createQuery(true)
    this.queries.set(index, query)
    return query
  },
  remove (index: number): void {
    const lq = this.queries.get(index)
    lq?.unsubscribe()
    this.queries.delete(index)
    this.results.delete(index)
  }
}

export async function getRefs (filter: Filter, onUpdate: () => void): Promise<Array<Ref<Doc>>> {
  const lq = FilterQuery.getLiveQuery(filter.index)
  const client = getClient()
  const mode = await client.findOne(view.class.FilterMode, { _id: filter.mode })
  if (mode === undefined) return []
  const result = await getResource(mode.result)
  const newValue = await result(filter, () => {})
  const promise = new Promise<Array<Ref<Doc>>>((resolve, reject) => {
    const refresh = lq.query(
      filter.key._class,
      {
        [filter.key.key]: newValue
      },
      (refs: FindResult<Doc>) => {
        const result = Array.from(new Set(refs.map((p) => p._id)))
        FilterQuery.results.set(filter.index, result)
        resolve(result)
        onUpdate()
      }
    )
    if (!refresh) {
      resolve(FilterQuery.results.get(filter.index) ?? [])
    }
  })
  return await promise
}

function buildRefFilterKey (
  hierarchy: Hierarchy,
  _class: Ref<Class<Doc>>,
  key: string,
  attribute: AnyAttribute
): KeyFilter | undefined {
  const isRef = hierarchy.isDerived(attribute.type._class, core.class.RefTo)
  if (isRef) {
    const targetClass = (attribute.type as RefTo<Doc>).to
    const filter = hierarchy.classHierarchyMixin(targetClass, view.mixin.AttributeFilter)
    if (filter?.component !== undefined) {
      return {
        _class,
        key,
        attribute,
        label: attribute.label,
        component: filter.component,
        group: filter.group
      }
    }
  }
}

export function buildFilterKey (
  hierarchy: Hierarchy,
  _class: Ref<Class<Doc>>,
  key: string,
  attribute: AnyAttribute
): KeyFilter | undefined {
  const ref = buildRefFilterKey(hierarchy, _class, key, attribute)
  if (ref != null) return ref

  const isCollection = hierarchy.isDerived(attribute.type._class, core.class.Collection)
  const targetClass = isCollection ? (attribute.type as Collection<AttachedDoc>).of : attribute.type._class
  const clazz = hierarchy.getClass(targetClass)
  const filter = hierarchy.as(clazz, view.mixin.AttributeFilter)

  if (filter.component === undefined) return undefined
  return {
    _class,
    key: isCollection ? '_id' : key,
    attribute,
    label: attribute.label,
    component: filter.component,
    group: filter.group
  }
}

interface FilterModes {
  modes: Array<Ref<FilterMode>>
  mode: Ref<FilterMode>
}

function getFilterModes (component: AnyComponent): FilterModes | undefined {
  if (component === view.component.ObjectFilter) {
    return {
      modes: [view.filter.FilterObjectIn, view.filter.FilterObjectNin],
      mode: view.filter.FilterObjectIn
    }
  }
  if (component === view.component.ValueFilter) {
    return {
      modes: [view.filter.FilterValueIn, view.filter.FilterValueNin],
      mode: view.filter.FilterValueIn
    }
  }
  if (component === view.component.TimestampFilter) {
    return {
      modes: [view.filter.FilterBefore, view.filter.FilterAfter],
      mode: view.filter.FilterBefore
    }
  }
  if (component === view.component.StringFilter) {
    return {
      modes: [view.filter.FilterContains],
      mode: view.filter.FilterContains
    }
  }
}

export function createFilter (_class: Ref<Class<Doc>>, key: string, value: any[]): Filter | undefined {
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const attribute = hierarchy.getAttribute(_class, key)
  const filterKey = buildFilterKey(hierarchy, _class, key, attribute)
  if (filterKey === undefined) return

  const modes = getFilterModes(filterKey.component)
  if (modes === undefined) return
  return {
    key: filterKey,
    value,
    index: 1,
    modes: modes.modes,
    mode: modes.mode
  }
}

export function getFilterKey (_class: Ref<Class<Doc>> | undefined): string {
  const loc = getCurrentResolvedLocation()
  loc.path.length = 3
  loc.fragment = undefined
  loc.query = undefined
  let res = 'filter' + locationToUrl(loc)
  if (_class !== undefined) {
    res = res + _class
  }
  return res
}

/**
 * Returns a new array where the selected values have been moved to the beginning
 *
 * @export
 * @template T
 * @param {T[]} values
 * @param {(value: T) => boolean} checkIsSelected
 * @returns {readonly T[]}
 */
export function sortFilterValues<T> (values: T[], checkIsSelected: (value: T) => boolean): T[] {
  const selectedValues: T[] = []
  const notSelectedValues: T[] = []

  for (const value of values) {
    if (checkIsSelected(value)) {
      selectedValues.push(value)
    } else {
      notSelectedValues.push(value)
    }
  }

  return [...selectedValues, ...notSelectedValues]
}

/**
 * The number of milliseconds of delay before changing the filter value
 *
 * @type {200}
 */
export const FILTER_DEBOUNCE_MS: 200 = 200
