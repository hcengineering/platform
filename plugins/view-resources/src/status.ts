//
// Copyright © 2023 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import core, {
  AggregateValue,
  AggregateValueData,
  AnyAttribute,
  Class,
  Doc,
  DocManager,
  FindOptions,
  Ref,
  SortingOrder,
  SortingRules,
  Space,
  Status,
  StatusManager,
  StatusValue,
  WithLookup
} from '@hcengineering/core'
import { get, Writable, writable } from 'svelte/store'

// Issue status live query
export const statusStore = writable<StatusManager>(new StatusManager([]))

/**
 * @public
 */
export function getStatusManager (docs: Doc[]): StatusManager {
  return new StatusManager(docs)
}

/**
 * @public
 */
export function getStatusStore (): Writable<DocManager> {
  return statusStore
}

/**
 * @public
 */
export function getStatusFindOptions (): FindOptions<Status> {
  return {
    lookup: {
      category: core.class.StatusCategory
    },
    sort: {
      rank: SortingOrder.Ascending
    }
  }
}

/**
 * @public
 */
export const getStatusClass = (): Ref<Class<Doc>> => core.class.Status

/**
 * @public
 */
export function statusCategorize (mgr: DocManager, attr: AnyAttribute, target: Array<Ref<Doc>>): Array<Ref<Doc>> {
  for (const sid of [...target]) {
    const s = mgr.getIdMap().get(sid) as WithLookup<Status>
    if (s !== undefined) {
      let statuses = mgr.getDocs() as Array<WithLookup<Status>>
      statuses = statuses.filter(
        (it) =>
          it.ofAttribute === attr._id &&
          it.name.toLowerCase().trim() === s.name.toLowerCase().trim() &&
          it._id !== s._id
      )
      target.push(...statuses.map((it) => it._id))
    }
  }
  return target.filter((it, idx, arr) => arr.indexOf(it) === idx)
}

/**
 * @public
 */
export function statusUpdateCustomSorting<T extends Doc> (
  finalOptions: FindOptions<T>,
  attr: AnyAttribute,
  mgr: DocManager
): void {
  const attrSort = finalOptions.sort?.[attr.name]
  if (attrSort !== undefined && typeof attrSort !== 'object') {
    // Fill custom sorting.
    let statuses = mgr.getDocs() as Array<WithLookup<Status>>
    statuses = statuses.filter((it) => it.ofAttribute === attr._id)
    statuses.sort((a, b) => {
      let ret = 0
      if (a.category !== undefined && b.category !== undefined) {
        ret = (a.$lookup?.category?.order ?? 0) - (b.$lookup?.category?.order ?? 0)
      }
      if (ret === 0) {
        if (a.name.toLowerCase().trim() === b.name.toLowerCase().trim()) {
          return 0
        }
        ret = a.rank.localeCompare(b.rank)
      }
      return ret
    })
    if (finalOptions.sort === undefined) {
      finalOptions.sort = {}
    }

    const rules: SortingRules<any> = {
      order: attrSort,
      cases: statuses.map((it, idx) => ({ query: it._id, index: idx })),
      default: statuses.length + 1
    }
    ;(finalOptions.sort as any)[attr.name] = rules
  }
}

/**
 * @public
 */
export function GroupByStatusCategories (categories: any[]): AggregateValue[] {
  const mgr = get(statusStore)

  const existingCategories: AggregateValue[] = []
  const statusMap = new Map<string, AggregateValue>()

  const usedSpaces = new Set<Ref<Space>>()
  const statusesList: Array<WithLookup<Status>> = []
  for (const v of categories) {
    const status = mgr.getIdMap().get(v)
    if (status !== undefined) {
      statusesList.push(status)
      usedSpaces.add(status.space)
    }
  }

  for (const status of statusesList) {
    if (status !== undefined) {
      let fst = statusMap.get(status.name.toLowerCase().trim())
      if (fst === undefined) {
        const statuses = mgr
          .getDocs()
          .filter(
            (it) =>
              it.ofAttribute === status.ofAttribute &&
              it.name.toLowerCase().trim() === status.name.toLowerCase().trim() &&
              (categories.includes(it._id) || usedSpaces.has(it.space))
          )
          .sort((a, b) => a.rank.localeCompare(b.rank))
          .map((it) => new AggregateValueData(it.name, it._id, it.space, it.rank, it.category))
        fst = new StatusValue(status.name, status.color, statuses)
        statusMap.set(status.name.toLowerCase().trim(), fst)
        existingCategories.push(fst)
      }
    }
  }
  return existingCategories
}

/**
 * @public
 */
export function GroupStatusValues (val: Status[], targets: Set<any>): Doc[] {
  const values = val
  const result: Doc[] = []
  const unique = [...new Set(val.map((v) => v.name.trim().toLocaleLowerCase()))]
  unique.forEach((label, i) => {
    let exists = false
    values.forEach((state) => {
      if (state.name.trim().toLocaleLowerCase() === label) {
        if (!exists) {
          result[i] = state
          exists = targets.has(state?._id)
        }
      }
    })
  })
  return result
}

/**
 * @public
 */
export function HasStatusValue (value: Doc | undefined | null, values: any[]): boolean {
  const mgr = get(statusStore)
  const statusSet = new Set(
    mgr
      .filter((it) => it.name.trim().toLocaleLowerCase() === (value as Status)?.name?.trim()?.toLocaleLowerCase())
      .map((it) => it._id)
  )
  return values.some((it) => statusSet.has(it))
}
