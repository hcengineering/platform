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
  Status,
  StatusManager,
  Tx,
  TxResult
} from '@hcengineering/core'
import { writable } from 'svelte/store'
import { BasePresentationMiddleware, PresentationMiddleware } from './pipeline'
import { createQuery, LiveQuery } from './utils'

let statusQuery: LiveQuery
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

  subscribers: Map<string, StatusSubscriber> = new Map()
  private constructor (client: Client, next?: PresentationMiddleware) {
    super(client, next)
  }

  async getManager (): Promise<StatusManager> {
    if (this.mgr !== undefined) {
      if (this.mgr instanceof Promise) {
        this.mgr = await this.mgr
      }
      return this.mgr
    }
    if (statusQuery === undefined) {
      statusQuery = createQuery(true)
    }
    this.mgr = new Promise<StatusManager>((resolve) =>
      statusQuery.query(
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
    )

    return await this.mgr
  }

  private refreshSubscribers (): void {
    for (const s of this.subscribers.values()) {
      // TODO: Do something more smart and track if used status field is changed.
      s.refresh()
    }
  }

  subscribe<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options: FindOptions<T> | undefined,
    refresh: () => void
  ): () => void {
    const ret = this.provideSubscribe(_class, query, options, refresh)
    const h = this.client.getHierarchy()

    const id = generateId()
    const s: StatusSubscriber<T> = {
      _class,
      query,
      refresh,
      options,
      attributes: []
    }
    const allAttrs = h.getAllAttributes(_class)
    for (const attr of allAttrs.values()) {
      try {
        if (attr?.type._class === core.class.RefTo && h.isDerived((attr.type as RefTo<Doc>).to, core.class.Status)) {
          // Ok we have status field for query.
          if ((query as any)[attr.name] !== undefined || (options?.lookup as any)?.[attr.name] !== undefined) {
            s.attributes.push(attr._id)
          }
        }
      } catch (err: any) {
        console.error(err)
      }
    }
    if (s.attributes.length > 0) {
      this.subscribers.set(id, s)
      return () => {
        ret()
        this.subscribers.delete(id)
      }
    }
    return ret
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
    for (const attr of allAttrs.values()) {
      try {
        if (attr.type._class === core.class.RefTo && h.isDerived((attr.type as RefTo<Doc>).to, core.class.Status)) {
          const mgr = await this.getManager()
          let target: Array<Ref<Status>> = []
          statusFields.push(attr)
          const v = (query as any)[attr.name]

          if (v !== undefined) {
            // Only add filter if we have filer inside.
            if (v?.$in !== undefined) {
              target.push(...v.$in)
            } else {
              target.push(v)
            }

            // Find all similar name statues for same attribute name.
            for (const sid of [...target]) {
              const s = mgr.byId.get(sid)
              if (s !== undefined) {
                const statuses = mgr.statuses.filter(
                  (it) => it.ofAttribute === s.ofAttribute && it.name === s.name && it._id !== s._id
                )
                if (statuses !== undefined) {
                  statuses.sort((a, b) => a.rank.localeCompare(b.rank))
                  target.push(...statuses.map((it) => it._id))
                }
              }
            }
            target = target.filter((it, idx, arr) => arr.indexOf(it) === idx)

            // Update query
            ;(query as any)[attr.name] = { $in: target }

            if (options?.lookup !== undefined) {
              // Remove lookups by status field
              if ((options.lookup as any)[attr.name] !== undefined) {
                const { [attr.name]: _, ...newLookup } = options.lookup as any
                options.lookup = newLookup
              }
            }
          }
        }
      } catch (err: any) {
        console.error(err)
      }
    }

    const result = await this.provideFindAll(_class, query, options)
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

  async tx (tx: Tx): Promise<TxResult> {
    return await this.provideTx(tx)
  }
}
