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

import core, {
  Ref,
  Class,
  Doc,
  Tx,
  DocumentQuery,
  TxCreateDoc,
  TxRemoveDoc,
  Client,
  FindOptions,
  TxUpdateDoc,
  _getOperator,
  TxProcessor,
  resultSort,
  SortingQuery,
  FindResult,
  Hierarchy,
  Refs,
  WithLookup,
  LookupData,
  TxMixin,
  TxPutBag,
  ModelDb,
  TxBulkWrite,
  TxResult,
  TxCollectionCUD,
  AttachedDoc,
  findProperty
} from '@anticrm/core'

import clone from 'just-clone'

interface Query {
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
  private readonly queries: Query[] = []

  constructor (client: Client) {
    super()
    this.client = client
  }

  async close (): Promise<void> {
    return await this.client.close()
  }

  getHierarchy (): Hierarchy {
    return this.client.getHierarchy()
  }

  getModel (): ModelDb {
    return this.client.getModel()
  }

  private match (q: Query, doc: Doc): boolean {
    if (!this.getHierarchy().isDerived(doc._class, q._class)) {
      return false
    }
    const query = q.query
    for (const key in query) {
      if (key === '_id' && ((query._id as any)?.$like === undefined || query._id === undefined)) continue
      const value = (query as any)[key]
      const result = findProperty([doc], key, value)
      if (result.length === 0) {
        return false
      }
    }
    return true
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return await this.client.findAll(_class, query, options)
  }

  async findOne<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<WithLookup<T> | undefined> {
    return (await this.findAll(_class, query, options))[0]
  }

  query<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    callback: (result: T[]) => void,
    options?: FindOptions<T>
  ): () => void {
    const result = this.client.findAll(_class, query, options)
    const q: Query = {
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

  protected override async txPutBag (tx: TxPutBag<any>): Promise<TxResult> {
    for (const q of this.queries) {
      if (q.result instanceof Promise) {
        q.result = await q.result
      }
      const updatedDoc = q.result.find((p) => p._id === tx.objectId)
      if (updatedDoc !== undefined) {
        const doc = updatedDoc as any
        let bag = doc[tx.bag]
        if (bag === undefined) {
          doc[tx.bag] = bag = {}
        }
        bag[tx.key] = tx.value
        await this.callback(updatedDoc, q)
      }
    }
    return {}
  }

  protected txMixin (tx: TxMixin<Doc, Doc>): Promise<TxResult> {
    throw new Error('Method not implemented.')
  }

  protected async txCollectionCUD (tx: TxCollectionCUD<Doc, AttachedDoc>): Promise<TxResult> {
    for (const q of this.queries) {
      if (this.client.getHierarchy().isDerived(q._class, core.class.Tx)) {
        // handle add since Txes are immutable
        await this.handleDocAdd(q, tx)
        continue
      }

      if (tx.tx._class === core.class.TxCreateDoc) {
        const createTx = tx.tx as TxCreateDoc<AttachedDoc>
        const d: TxCreateDoc<AttachedDoc> = {
          ...createTx,
          attributes: {
            ...createTx.attributes,
            attachedTo: tx.objectId,
            attachedToClass: tx.objectClass,
            collection: tx.collection
          }
        }
        await this.handleDocAdd(q, TxProcessor.createDoc2Doc(d))
      } else if (tx.tx._class === core.class.TxUpdateDoc) {
        await this.handleDocUpdate(q, tx.tx as unknown as TxUpdateDoc<Doc>)
      } else if (tx.tx._class === core.class.TxRemoveDoc) {
        await this.handleDocRemove(q, tx.tx as unknown as TxRemoveDoc<Doc>)
      }
    }
    return {}
  }

  protected async txUpdateDoc (tx: TxUpdateDoc<Doc>): Promise<TxResult> {
    for (const q of this.queries) {
      if (this.client.getHierarchy().isDerived(q._class, core.class.Tx)) {
        // handle add since Txes are immutable
        await this.handleDocAdd(q, tx)
        continue
      }
      await this.handleDocUpdate(q, tx)
    }
    return {}
  }

  private async handleDocUpdate (q: Query, tx: TxUpdateDoc<Doc>): Promise<void> {
    if (q.result instanceof Promise) {
      q.result = await q.result
    }
    const pos = q.result.findIndex((p) => p._id === tx.objectId)
    if (pos !== -1) {
      const updatedDoc = q.result[pos]
      await this.__updateDoc(q, updatedDoc, tx)
      if (!this.match(q, updatedDoc)) {
        q.result.splice(pos, 1)
      } else {
        q.result[pos] = updatedDoc
      }
      this.sort(q, tx)
      await this.callback(updatedDoc, q)
    } else if (this.matchQuery(q, tx)) {
      await this.refresh(q)
    }
  }

  private async refresh (q: Query): Promise<void> {
    const res = await this.client.findAll(q._class, q.query, q.options)
    q.result = res
    q.callback(clone(res))
  }

  // Check if query is partially matched.
  private matchQuery (q: Query, tx: TxUpdateDoc<Doc>): boolean {
    if (!this.client.getHierarchy().isDerived(tx.objectClass, q._class)) {
      return false
    }

    for (const key in q.query) {
      const value = (q.query as any)[key]
      const res = findProperty([tx.operations as unknown as Doc], key, value)
      if (res.length === 1) {
        return true
      }
    }
    return false
  }

  private async lookup (doc: Doc, lookup: Refs<Doc>): Promise<void> {
    const result: LookupData<Doc> = {}
    for (const key in lookup) {
      const _class = (lookup as any)[key] as Ref<Class<Doc>>
      const _id = (doc as any)[key] as Ref<Doc>
      ;(result as any)[key] = (await this.client.findAll(_class, { _id }))[0]
    }
    ;(doc as WithLookup<Doc>).$lookup = result
  }

  protected async txCreateDoc (tx: TxCreateDoc<Doc>): Promise<TxResult> {
    const docTx = TxProcessor.createDoc2Doc(tx)
    for (const q of this.queries) {
      const doc = this.client.getHierarchy().isDerived(q._class, core.class.Tx) ? tx : docTx
      await this.handleDocAdd(q, doc)
    }
    return {}
  }

  private async handleDocAdd (q: Query, doc: Doc): Promise<void> {
    if (this.match(q, doc)) {
      if (q.result instanceof Promise) {
        q.result = await q.result
      }

      if (q.options?.lookup !== undefined) {
        await this.lookup(doc, q.options.lookup)
      }

      q.result.push(doc)

      if (q.options?.sort !== undefined) {
        resultSort(q.result, q.options?.sort)
      }

      if (q.options?.limit !== undefined && q.result.length > q.options.limit) {
        if (q.result.pop()?._id !== doc._id) {
          q.callback(clone(q.result))
        }
      } else {
        q.callback(clone(q.result))
      }
    }
  }

  protected async txRemoveDoc (tx: TxRemoveDoc<Doc>): Promise<TxResult> {
    for (const q of this.queries) {
      if (this.client.getHierarchy().isDerived(q._class, core.class.Tx)) {
        // handle add since Txes are immutable
        await this.handleDocAdd(q, tx)
        continue
      }
      await this.handleDocRemove(q, tx)
    }
    return {}
  }

  private async handleDocRemove (q: Query, tx: TxRemoveDoc<Doc>): Promise<void> {
    if (q.result instanceof Promise) {
      q.result = await q.result
    }
    const index = q.result.findIndex((p) => p._id === tx.objectId)
    if (
      q.options?.limit !== undefined &&
      q.options.limit === q.result.length &&
      this.client.getHierarchy().isDerived(q._class, tx.objectClass)
    ) {
      return await this.refresh(q)
    }
    if (index > -1) {
      q.result.splice(index, 1)
      q.callback(clone(q.result))
    }
  }

  protected override async txBulkWrite (tx: TxBulkWrite): Promise<TxResult> {
    return await super.txBulkWrite(tx)
  }

  async tx (tx: Tx): Promise<TxResult> {
    return await super.tx(tx)
  }

  // why this is separate from txUpdateDoc?
  private async __updateDoc (q: Query, updatedDoc: WithLookup<Doc>, tx: TxUpdateDoc<Doc>): Promise<void> {
    const ops = tx.operations as any
    for (const key in ops) {
      if (key.startsWith('$')) {
        const operator = _getOperator(key)
        operator(updatedDoc, ops[key])
      } else {
        ;(updatedDoc as any)[key] = ops[key]
        if (q.options !== undefined) {
          const lookup = (q.options.lookup as any)?.[key]
          if (lookup !== undefined) {
            ;(updatedDoc.$lookup as any)[key] = await this.client.findOne(lookup, { _id: ops[key] })
          }
        }
      }
    }
    updatedDoc.modifiedBy = tx.modifiedBy
    updatedDoc.modifiedOn = tx.modifiedOn
  }

  private sort (q: Query, tx: TxUpdateDoc<Doc>): void {
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

  private async callback (updatedDoc: Doc, q: Query): Promise<void> {
    q.result = q.result as Doc[]

    if (q.options?.limit !== undefined && q.result.length > q.options.limit) {
      if (q.result[q.options?.limit]._id === updatedDoc._id) {
        return await this.refresh(q)
      }
      if (q.result.pop()?._id !== updatedDoc._id) q.callback(q.result)
    } else {
      q.callback(clone(q.result))
    }
  }
}
