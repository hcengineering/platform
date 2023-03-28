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
  Class,
  Client,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  generateId,
  Ref,
  RefTo,
  SortingOrder,
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
  initState: Promise<void> | undefined
  mgr: StatusManager | undefined

  subscribers: Map<string, StatusSubscriber> = new Map()
  private constructor (client: Client, next?: PresentationMiddleware) {
    super(client, next)
  }

  async initialize (): Promise<void> {
    this.initState = new Promise((resolve) => {
      if (statusQuery === undefined) {
        statusQuery = createQuery(true)
        statusQuery.query(
          core.class.Status,
          {},
          (res) => {
            this.mgr = new StatusManager(res)
            statusStore.set(this.mgr)

            this.refreshSubscribers()

            resolve()
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
      }
    })
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
    for (const [k] of Object.entries(query)) {
      try {
        const attr = h.findAttribute(_class, k)
        if (attr?.type._class === core.class.RefTo && h.isDerived((attr.type as RefTo<Doc>).to, core.class.Status)) {
          // Ok we have status field for query.
          s.attributes.push(attr._id)
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
    return await this.provideFindAll(_class, query, options)
  }

  async tx (tx: Tx): Promise<TxResult> {
    return await this.provideTx(tx)
  }
}
