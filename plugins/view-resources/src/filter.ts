import { Doc, FindResult, ObjQueryType, Ref } from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import { createQuery, getClient, LiveQuery } from '@hcengineering/presentation'
import { Filter } from '@hcengineering/view'
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
