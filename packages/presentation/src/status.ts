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
  AnyAttribute,
  Attribute,
  Class,
  Client,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  generateId,
  Hierarchy,
  Ref,
  RefTo,
  SortingOrder,
  SortingRules,
  Status,
  StatusManager,
  Tx,
  TxResult
} from '@hcengineering/core'
import { LiveQuery } from '@hcengineering/query'
import { writable } from 'svelte/store'
import { BasePresentationMiddleware, PresentationMiddleware } from './pipeline'

// Issue status live query
export const statusStore = writable<StatusManager>(new StatusManager([]))

interface StatusSubscriber<T extends Doc = Doc> {
  attributes: Array<Ref<AnyAttribute>>

  _class: Ref<Class<T>>
  query: DocumentQuery<T>
  options?: FindOptions<T>

  refresh: () => void
}

/**
 * @public
 */
export class StatusMiddleware extends BasePresentationMiddleware implements PresentationMiddleware {
  mgr: StatusManager | Promise<StatusManager> | undefined
  status: Status[] | undefined
  statusQuery: (() => void) | undefined
  lq: LiveQuery

  subscribers: Map<string, StatusSubscriber> = new Map()
  private constructor (client: Client, next?: PresentationMiddleware) {
    super(client, next)
    this.lq = new LiveQuery(client)
  }

  async notifyTx (tx: Tx): Promise<void> {
    await this.lq.tx(tx)
    await this.provideNotifyTx(tx)
  }

  async close (): Promise<void> {
    this.statusQuery?.()
    return await this.provideClose()
  }

  async getManager (): Promise<StatusManager> {
    if (this.mgr !== undefined) {
      if (this.mgr instanceof Promise) {
        this.mgr = await this.mgr
      }
      return this.mgr
    }
    this.mgr = new Promise<StatusManager>((resolve) => {
      this.statusQuery = this.lq.query(
        core.class.Status,
        {},
        (res) => {
          const first = this.status === undefined
          this.status = res
          this.mgr = new StatusManager(res)
          statusStore.set(this.mgr)
          if (!first) {
            this.refreshSubscribers()
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

  private refreshSubscribers (): void {
    for (const s of this.subscribers.values()) {
      // TODO: Do something more smart and track if used status field is changed.
      s.refresh()
    }
  }

  async subscribe<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options: FindOptions<T> | undefined,
    refresh: () => void
  ): Promise<{
      unsubscribe: () => void
      query?: DocumentQuery<T>
      options?: FindOptions<T>
    }> {
    const ret = await this.provideSubscribe(_class, query, options, refresh)
    const h = this.client.getHierarchy()

    const id = generateId()
    const s: StatusSubscriber<T> = {
      _class,
      query,
      refresh,
      options,
      attributes: []
    }
    const statusFields: Array<Attribute<Status>> = []
    const allAttrs = h.getAllAttributes(_class)

    const updatedQuery: DocumentQuery<T> = { ...(ret.query ?? query) }
    const finalOptions = { ...(ret.options ?? options ?? {}) }

    await this.updateQueryOptions<T>(allAttrs, h, statusFields, updatedQuery, finalOptions)

    if (statusFields.length > 0) {
      this.subscribers.set(id, s)
      return {
        unsubscribe: () => {
          ret.unsubscribe()
          this.subscribers.delete(id)
        },
        query: updatedQuery,
        options: finalOptions
      }
    }
    return { unsubscribe: (await ret).unsubscribe }
  }

  static create (client: Client, next?: PresentationMiddleware): StatusMiddleware {
    return new StatusMiddleware(client, next)
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T> | undefined
  ): Promise<FindResult<T>> {
    const statusFields: Array<Attribute<Status>> = []
    const h = this.client.getHierarchy()
    const allAttrs = h.getAllAttributes(_class)
    const finalOptions = options ?? {}

    await this.updateQueryOptions<T>(allAttrs, h, statusFields, query, finalOptions)

    const result = await this.provideFindAll(_class, query, finalOptions)
    // We need to add $
    if (statusFields.length > 0) {
      // We need to update $lookup for status fields and provide $status group fields.
      for (const attr of statusFields) {
        for (const r of result) {
          const resultDoc = Hierarchy.toDoc(r)
          if (resultDoc.$lookup === undefined) {
            resultDoc.$lookup = {}
          }

          // TODO: Check for mixin?
          const stateValue = (r as any)[attr.name]
          const status = (await this.getManager()).byId.get(stateValue)
          if (status !== undefined) {
            ;(resultDoc.$lookup as any)[attr.name] = status
          }
        }
      }
    }
    return result
  }

  private categorizeStatus (mgr: StatusManager, attr: AnyAttribute, target: Array<Ref<Status>>): Array<Ref<Status>> {
    for (const sid of [...target]) {
      const s = mgr.byId.get(sid)
      if (s !== undefined) {
        const statuses = mgr.statuses.filter(
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

  private async updateQueryOptions<T extends Doc>(
    allAttrs: Map<string, AnyAttribute>,
    h: Hierarchy,
    statusFields: Array<Attribute<Status>>,
    query: DocumentQuery<T>,
    finalOptions: FindOptions<T>
  ): Promise<void> {
    for (const attr of allAttrs.values()) {
      try {
        if (attr.type._class === core.class.RefTo && h.isDerived((attr.type as RefTo<Doc>).to, core.class.Status)) {
          const mgr = await this.getManager()
          let target: Array<Ref<Status>> = []
          let targetNin: Array<Ref<Status>> = []
          statusFields.push(attr)
          const v = (query as any)[attr.name]

          if (v != null) {
            // Only add filter if we have filer inside.
            if (typeof v === 'string') {
              target.push(v as Ref<Status>)
            } else {
              if (v.$in !== undefined) {
                target.push(...v.$in)
              } else if (v.$nin !== undefined) {
                targetNin.push(...v.$nin)
              } else if (v.$ne !== undefined) {
                targetNin.push(v.$ne)
              }
            }

            // Find all similar name statues for same attribute name.
            target = this.categorizeStatus(mgr, attr, target)
            targetNin = this.categorizeStatus(mgr, attr, targetNin)
            if (target.length > 0 || targetNin.length > 0) {
              ;(query as any)[attr.name] = {}
              if (target.length > 0) {
                ;(query as any)[attr.name].$in = target
              }
              if (targetNin.length > 0) {
                ;(query as any)[attr.name].$nin = targetNin
              }
            }

            if (finalOptions.lookup !== undefined) {
              // Remove lookups by status field
              if ((finalOptions.lookup as any)[attr.name] !== undefined) {
                const { [attr.name]: _, ...newLookup } = finalOptions.lookup as any
                finalOptions.lookup = newLookup
              }
            }
          }

          // Update sorting if defined.
          this.updateCustomSorting<T>(finalOptions, attr, mgr)
        }
      } catch (err: any) {
        console.error(err)
      }
    }
  }

  private updateCustomSorting<T extends Doc>(
    finalOptions: FindOptions<T>,
    attr: AnyAttribute,
    mgr: StatusManager
  ): void {
    const attrSort = finalOptions.sort?.[attr.name]
    if (attrSort !== undefined && typeof attrSort !== 'object') {
      // Fill custom sorting.
      const statuses = mgr.statuses.filter((it) => it.ofAttribute === attr._id)
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

  async tx (tx: Tx): Promise<TxResult> {
    return await this.provideTx(tx)
  }
}
