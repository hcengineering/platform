import core, {
  AnyAttribute,
  AttachedDoc,
  Class,
  Collection,
  Doc,
  FindResult,
  Hierarchy,
  ObjQueryType,
  Ref
} from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import { createQuery, getClient, LiveQuery } from '@hcengineering/presentation'
import { AnyComponent } from '@hcengineering/ui'
import { Filter, FilterMode, KeyFilter } from '@hcengineering/view'
import { writable } from 'svelte/store'
import view from './plugin'

/**
 * @public
 */
export const filterStore = writable<Filter[]>([])

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
  return { $lt: filter.value[0] }
}

export async function afterResult (filter: Filter): Promise<ObjQueryType<any>> {
  return { $gt: filter.value[0] }
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

export function buildFilterKey (
  hierarchy: Hierarchy,
  _class: Ref<Class<Doc>>,
  key: string,
  attribute: AnyAttribute
): KeyFilter | undefined {
  const isCollection = hierarchy.isDerived(attribute.type._class, core.class.Collection)
  const targetClass = isCollection ? (attribute.type as Collection<AttachedDoc>).of : attribute.type._class
  const clazz = hierarchy.getClass(targetClass)
  const filter = hierarchy.as(clazz, view.mixin.AttributeFilter)

  const attrOf = hierarchy.getClass(attribute.attributeOf)
  if (filter.component === undefined) return undefined
  return {
    _class,
    key: isCollection ? '_id' : key,
    attribute,
    label: attribute.label,
    icon: attribute.icon ?? clazz.icon ?? attrOf.icon ?? view.icon.Setting,
    component: filter.component
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
