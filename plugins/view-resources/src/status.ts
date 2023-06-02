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
  Attribute,
  Class,
  Client,
  Doc,
  DocumentQuery,
  FindOptions,
  Hierarchy,
  Ref,
  SortingOrder,
  SortingRules,
  Space,
  Status,
  StatusManager,
  StatusValue,
  Tx,
  WithLookup,
  matchQuery
} from '@hcengineering/core'
import { LiveQuery } from '@hcengineering/query'
import { AggregationManager, GrouppingManager } from '@hcengineering/view'
import { get, writable } from 'svelte/store'

// Issue status live query
export const statusStore = writable<StatusManager>(new StatusManager([]))

/**
 * @public
 */
export class StatusAggregationManager implements AggregationManager {
  docs: Doc[] | undefined
  mgr: StatusManager | Promise<StatusManager> | undefined
  query: (() => void) | undefined
  lq: LiveQuery
  lqCallback: () => void

  private constructor (client: Client, lqCallback: () => void) {
    this.lq = new LiveQuery(client)
    this.lqCallback = lqCallback ?? (() => {})
  }

  static create (client: Client, lqCallback: () => void): StatusAggregationManager {
    return new StatusAggregationManager(client, lqCallback)
  }

  private async getManager (): Promise<StatusManager> {
    if (this.mgr !== undefined) {
      if (this.mgr instanceof Promise) {
        this.mgr = await this.mgr
      }
      return this.mgr
    }
    this.mgr = new Promise<StatusManager>((resolve) => {
      this.query = this.lq.query(
        core.class.Status,
        {},
        (res) => {
          const first = this.docs === undefined
          this.docs = res
          this.mgr = new StatusManager(res)
          statusStore.set(this.mgr)
          if (!first) {
            this.lqCallback()
          }
          resolve(this.mgr)
        },
        {
          lookup: {
            category: core.class.StatusCategory
          },
          sort: {
            rank: SortingOrder.Ascending
          }
        }
      )
    })

    return await this.mgr
  }

  close (): void {
    this.query?.()
  }

  async notifyTx (tx: Tx): Promise<void> {
    await this.lq.tx(tx)
  }

  getAttrClass (): Ref<Class<Doc>> {
    return core.class.Status
  }

  async categorize (target: Array<Ref<Doc>>, attr: AnyAttribute): Promise<Array<Ref<Doc>>> {
    const mgr = await this.getManager()
    for (const sid of [...target]) {
      const s = mgr.getIdMap().get(sid as Ref<Status>) as WithLookup<Status>
      if (s !== undefined) {
        let statuses = mgr.getDocs()
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

  async updateLookup (resultDoc: WithLookup<Doc>, attr: Attribute<Doc>): Promise<void> {
    const value = (resultDoc as any)[attr.name]
    const doc = (await this.getManager()).getIdMap().get(value)
    if (doc !== undefined) {
      ;(resultDoc.$lookup as any)[attr.name] = doc
    }
  }

  async updateSorting<T extends Doc>(finalOptions: FindOptions<T>, attr: AnyAttribute): Promise<void> {
    const attrSort = finalOptions.sort?.[attr.name]
    if (attrSort !== undefined && typeof attrSort !== 'object') {
      // Fill custom sorting.
      let statuses = (await this.getManager()).getDocs()
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
}

/**
 * @public
 */
export const grouppingStatusManager: GrouppingManager = {
  groupByCategories: groupByStatusCategories,
  groupValues: groupStatusValues,
  groupValuesWithEmpty: groupStatusValuesWithEmpty,
  hasValue: hasStatusValue
}

/**
 * @public
 */
export function groupByStatusCategories (categories: any[]): AggregateValue[] {
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
export function groupStatusValues (val: Doc[], targets: Set<any>): Doc[] {
  const values = val
  const result: Doc[] = []
  const unique = [...new Set(val.map((v) => (v as Status).name.trim().toLocaleLowerCase()))]
  unique.forEach((label, i) => {
    let exists = false
    values.forEach((value) => {
      if ((value as Status).name.trim().toLocaleLowerCase() === label) {
        if (!exists) {
          result[i] = value
          exists = targets.has(value?._id)
        }
      }
    })
  })
  return result
}

/**
 * @public
 */
export function hasStatusValue (value: Doc | undefined | null, values: any[]): boolean {
  const mgr = get(statusStore)
  const statusSet = new Set(
    mgr
      .filter((it) => it.name.trim().toLocaleLowerCase() === (value as Status)?.name?.trim()?.toLocaleLowerCase())
      .map((it) => it._id)
  )
  return values.some((it) => statusSet.has(it))
}

/**
 * @public
 */
export function groupStatusValuesWithEmpty (
  hierarchy: Hierarchy,
  _class: Ref<Class<Doc>>,
  key: string,
  query: DocumentQuery<Doc> | undefined
): Array<Ref<Doc>> {
  const mgr = get(statusStore)
  const attr = hierarchy.getAttribute(_class, key)
  // We do not need extensions for all status categories.
  let statusList = mgr.filter((it) => {
    return it.ofAttribute === attr._id
  })
  if (query !== undefined) {
    const { [key]: st, space } = query
    const resQuery: DocumentQuery<Doc> = {}
    if (space !== undefined) {
      resQuery.space = space
    }
    if (st !== undefined) {
      resQuery._id = st
    }
    statusList = matchQuery<Doc>(statusList, resQuery, _class, hierarchy) as unknown as Array<WithLookup<Status>>
  }
  return statusList.map((it) => it._id)
}
