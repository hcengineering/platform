//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import {
  Ref, Class, Doc, Tx, DocumentQuery, TxCreateDoc, TxRemoveDoc, Client,
  FindOptions, TxUpdateDoc, _getOperator, TxProcessor, resultSort, SortingQuery,
  FindResult, Hierarchy, Refs, WithLookup, LookupData
} from '@anticrm/core'

/**
 * @internal
 */
export interface _Query {
  _class: Ref<Class<Doc>>
  query: DocumentQuery<Doc>
  result: Doc[] | Promise<Doc[]>
  options?: FindOptions<Doc>
  callback: (result: FindResult<Doc>) => void
}

/**
 * @public
 */
export class LiveQuery extends TxProcessor implements Client {
  private readonly client: Client
  private readonly queries: _Query[] = []

  constructor (client: Client) {
    super()
    this.client = client
  }

  getHierarchy (): Hierarchy {
    return this.client.getHierarchy()
  }

  private match (q: _Query, doc: Doc): boolean {
    if (!this.getHierarchy().isDerived(doc._class, q._class)) {
      return false
    }
    for (const key in q.query) {
      const value = (q.query as any)[key]
      if ((doc as any)[key] !== value) {
        return false
      }
    }
    return true
  }

  async findAll<T extends Doc>(_class: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T>): Promise<FindResult<T>> {
    return await this.client.findAll(_class, query, options)
  }

  query<T extends Doc>(_class: Ref<Class<T>>, query: DocumentQuery<T>, callback: (result: T[]) => void, options?: FindOptions<T>): () => void {
    const result = this.client.findAll(_class, query, options)
    const q: _Query = {
      _class,
      query,
      result,
      options,
      callback: callback as (result: Doc[]) => void
    }
    this.queries.push(q)
    result
      .then((result) => {
        q.callback(result)
      })
      .catch((err) => {
        console.log('failed to update Live Query: ', err)
      })

    return () => {
      this.queries.splice(this.queries.indexOf(q), 1)
    }
  }

  async txUpdateDoc (tx: TxUpdateDoc<Doc>): Promise<void> {
    for (const q of this.queries) {
      if (q.result instanceof Promise) {
        q.result = await q.result
      }
      const updatedDoc = q.result.find(p => p._id === tx.objectId)
      if (updatedDoc !== undefined) {
        await this.__updateDoc(updatedDoc, tx)
        this.sort(q, tx)
        await this.callback(updatedDoc, q)
      }
    }
  }

  private async lookup (doc: Doc, lookup: Refs<Doc>): Promise<void> {
    const result: LookupData<Doc> = {}
    for (const key in lookup) {
      const _class = (lookup as any)[key] as Ref<Class<Doc>>
      const _id = (doc as any)[key] as Ref<Doc>
      (result as any)[key] = (await this.client.findAll(_class, { _id }))[0]
    }
    (doc as WithLookup<Doc>).$lookup = result
  }

  async txCreateDoc (tx: TxCreateDoc<Doc>): Promise<void> {
    for (const q of this.queries) {
      const doc = TxProcessor.createDoc2Doc(tx)
      if (this.match(q, doc)) {
        if (q.result instanceof Promise) {
          q.result = await q.result
        }

        if (q.options?.lookup !== undefined) await this.lookup(doc, q.options.lookup)

        q.result.push(doc)

        if (q.options?.sort !== undefined) resultSort(q.result, q.options?.sort)

        if (q.options?.limit !== undefined && q.result.length > q.options.limit) {
          if (q.result.pop()?._id !== doc._id) {
            q.callback(q.result)
          }
        } else {
          q.callback(q.result)
        }
      }
    }
  }

  async txRemoveDoc (tx: TxRemoveDoc<Doc>): Promise<void> {
    for (const q of this.queries) {
      if (q.result instanceof Promise) {
        q.result = await q.result
      }
      const index = q.result.findIndex(p => p._id === tx.objectId)
      if (index > -1) {
        q.result.splice(index, 1)
        q.callback(q.result)
      }
    }
  }

  async tx (tx: Tx): Promise<void> {
    await this.client.tx(tx)
    await super.tx(tx)
  }

  async __updateDoc (updatedDoc: Doc, tx: TxUpdateDoc<Doc>): Promise<void> {
    const ops = tx.operations as any
    for (const key in ops) {
      if (key.startsWith('$')) {
        const operator = _getOperator(key)
        operator(updatedDoc, ops[key])
      } else {
        (updatedDoc as any)[key] = ops[key]
      }
    }
    updatedDoc.modifiedBy = tx.modifiedBy
    updatedDoc.modifiedOn = tx.modifiedOn
  }

  private sort (q: _Query, tx: TxUpdateDoc<Doc>): void {
    const sort = q.options?.sort
    if (sort === undefined) return
    let needSort = sort.modifiedBy !== undefined || sort.modifiedOn !== undefined
    if (!needSort) needSort = this.checkNeedSort(sort, tx)

    if (needSort) resultSort(q.result as Doc[], sort)
  }

  private checkNeedSort (sort: SortingQuery<Doc>, tx: TxUpdateDoc<Doc>): boolean {
    const ops = tx.operations as any
    for (const key in ops) {
      if (key.startsWith('$')) {
        for (const opKey in ops[key]) {
          if (opKey in sort) return true
        }
      } else {
        if (key in sort) return true
      }
    }
    return false
  }

  private async callback (updatedDoc: Doc, q: _Query): Promise<void> {
    q.result = q.result as Doc[]

    if (q.options?.limit !== undefined && q.result.length > q.options.limit) {
      if (q.result[q.options?.limit]._id === updatedDoc._id) {
        const res = await this.findAll(q._class, q.query, q.options)
        q.result = res
        q.callback(res)
        return
      }
      if (q.result.pop()?._id !== updatedDoc._id) q.callback(q.result)
    } else {
      q.callback(q.result)
    }
  }
}
