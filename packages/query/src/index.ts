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
  AttachedDoc,
  Class,
  Client,
  Doc,
  DocumentQuery,
  FindOptions,
  findProperty,
  FindResult,
  getObjectValue,
  Hierarchy, Lookup,
  LookupData,
  ModelDb, Ref, resultSort, ReverseLookups,
  SortingQuery,
  Tx,
  TxBulkWrite,
  TxCollectionCUD,
  TxCreateDoc,
  TxMixin,
  TxProcessor,
  TxPutBag,
  TxRemoveDoc,
  TxResult,
  TxUpdateDoc,
  WithLookup
} from '@anticrm/core'
import justClone from 'just-clone'

interface Query {
  _class: Ref<Class<Doc>>
  query: DocumentQuery<Doc>
  result: Doc[] | Promise<Doc[]>
  options?: FindOptions<Doc>
  callback: (result: FindResult<Doc>) => void

  rememberTx: boolean
  refreshTxes: Tx[]
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
      // Check if it is not a mixin and not match class
      const mixinClass = Hierarchy.mixinClass(doc)
      if (mixinClass === undefined || !this.getHierarchy().isDerived(mixinClass, q._class)) {
        return false
      }
    }
    const query = q.query
    for (const key in query) {
      if (key === '$search') continue
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
    return await this.client.findOne(_class, query, options)
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
      options: options as FindOptions<Doc>,
      callback: callback as (result: Doc[]) => void,
      rememberTx: false,
      refreshTxes: []
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

  protected override async txMixin (tx: TxMixin<Doc, Doc>): Promise<TxResult> {
    for (const q of this.queries) {
      if (this.client.getHierarchy().isDerived(q._class, core.class.Tx)) {
        // handle add since Txes are immutable
        await this.handleDocAdd(q, tx)
        continue
      }
      if (q.result instanceof Promise) {
        q.result = await q.result
      }
      let updatedDoc = q.result.find((p) => p._id === tx.objectId)
      if (updatedDoc !== undefined) {
        // Create or apply mixin value
        updatedDoc = TxProcessor.updateMixin4Doc(updatedDoc, tx.mixin, tx.attributes)
        await this.callback(updatedDoc, q)
      } else {
        if (this.getHierarchy().isDerived(tx.mixin, q._class)) {
          // Mixin potentially added to object we doesn't have in out results
          await this.refresh(q)
        }
      }
    }
    return {}
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
      return await this.refresh(q)
    }
    await this.handleDocUpdateLookup(q, tx)
  }

  private async handleDocUpdateLookup (q: Query, tx: TxUpdateDoc<Doc>): Promise<void> {
    if (q.options?.lookup === undefined) return
    const lookup = q.options.lookup
    if (q.result instanceof Promise) {
      q.result = await q.result
    }
    let needCallback = false
    needCallback = this.proccesLookupUpdateDoc(q.result, lookup, tx)

    if (needCallback) {
      if (q.options?.sort !== undefined) {
        resultSort(q.result, q.options?.sort)
      }
      q.callback(this.clone(q.result))
    }
  }

  private proccesLookupUpdateDoc (docs: Doc[], lookup: Lookup<Doc>, tx: TxUpdateDoc<Doc>): boolean {
    let needCallback = false
    const lookupWays = this.getLookupWays(lookup, tx.objectClass)
    for (const lookupWay of lookupWays) {
      const [objWay, key] = lookupWay
      for (const resDoc of docs) {
        const obj = getObjectValue(objWay, resDoc)
        if (obj === undefined) continue
        const value = getObjectValue('$lookup.' + key, obj)
        if (Array.isArray(value)) {
          const index = value.findIndex((p) => p._id === tx.objectId)
          if (index !== -1) {
            TxProcessor.updateDoc2Doc(value[index], tx)
            needCallback = true
          }
        } else {
          if (obj[key] === tx.objectId) {
            TxProcessor.updateDoc2Doc(obj.$lookup[key], tx)
            needCallback = true
          }
        }
      }
    }
    return needCallback
  }

  /**
   * Clone document with respect to mixin inner document cloning.
   */
  private clone<T extends Doc>(results: T[]): T[] {
    const result: T[] = []
    const h = this.getHierarchy()
    for (const doc of results) {
      const m = Hierarchy.mixinClass(doc)
      result.push(m !== undefined ? h.as(Hierarchy.toDoc(doc), m) : justClone(doc))
    }
    return result
  }

  private async refresh (q: Query): Promise<void> {
    q.rememberTx = true
    q.refreshTxes = []
    let res = await this.client.findAll(q._class, q.query, q.options)

    while (q.refreshTxes.length > 0) {
      const refs = [...q.refreshTxes]
      q.refreshTxes = []
      const toRefresh = new Set<Ref<Doc>>()
      let needFullRefresh = false
      for (const tx of refs) {
        let otx = tx
        if (tx._class === core.class.TxCollectionCUD) {
          otx = (tx as TxCollectionCUD<Doc, AttachedDoc>).tx
        }
        if (otx._class === core.class.TxCreateDoc) {
          const oid = (otx as TxCreateDoc<Doc>).objectId
          if (res.find(it => it._id === oid) !== undefined) {
            // we have object in our list, let's fetch it from server again and update.
            toRefresh.add(oid)
          } else {
            // We dont't have it in our list, let's check if it match our doc.
            const ndoc = TxProcessor.createDoc2Doc(otx as TxCreateDoc<Doc>)
            if (this.match(q, ndoc)) {
              // Document matching our.
              needFullRefresh = true
            }
          }
        } else if (otx._class === core.class.TxUpdateDoc) {
          const oid = (otx as TxUpdateDoc<Doc>).objectId
          if (res.find(it => it._id === oid) !== undefined) {
            // we have object in our list, let's fetch it from server again and update.
            toRefresh.add(oid)
          }
        } else if (otx._class === core.class.TxRemoveDoc) {
          const oid = (otx as TxRemoveDoc<Doc>).objectId
          if (res.find(it => it._id === oid) !== undefined) {
            // we have object in our list, but shoulld not, lets
            needFullRefresh = true
          }
        }
      }
      const refIds = Array.from(toRefresh.values())
      if (refIds.length > 0) {
        const upd = await this.client.findAll(q._class, { _id: { $in: refIds } }, { ...q.options, limit: refIds.length })
        // update res documents
        for (const u of upd) {
          const idx = res.findIndex(it => it._id === u._id)
          if (idx !== -1) {
            res[idx] = u
          } else {
            needFullRefresh = true
            break
          }
        }
      }
      if (needFullRefresh) {
        res = await this.client.findAll(q._class, q.query, q.options)
      }
    }

    q.result = res
    q.callback(this.clone(res))
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

  private async getLookupValue<T extends Doc> (doc: T, lookup: Lookup<T>, result: LookupData<T>): Promise<void> {
    for (const key in lookup) {
      if (key === '_id') {
        await this.getReverseLookupValue(doc, lookup, result)
        continue
      }
      const value = (lookup as any)[key]
      if (Array.isArray(value)) {
        const [_class, nested] = value
        const objects = await this.findAll(_class, { _id: (doc as any)[key] })
        ;(result as any)[key] = objects[0]
        const nestedResult = {}
        const parent = (result as any)[key]
        await this.getLookupValue(parent, nested, nestedResult)
        Object.assign(parent, {
          $lookup: nestedResult
        })
      } else {
        const objects = await this.findAll(value, { _id: (doc as any)[key] })
        ;(result as any)[key] = objects[0]
      }
    }
  }

  private async getReverseLookupValue<T extends Doc> (doc: T, lookup: ReverseLookups, result: LookupData<T>): Promise<void> {
    for (const key in lookup._id) {
      const value = lookup._id[key]
      const objects = await this.findAll(value, { attachedTo: doc._id })
      ;(result as any)[key] = objects
    }
  }

  private async lookup<T extends Doc> (doc: T, lookup: Lookup<T>): Promise<void> {
    const result: LookupData<Doc> = {}
    await this.getLookupValue(doc, lookup, result)
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
      // We could already have document inside results, if query is created during processing of document create transaction and not yet handled on client.
      const pos = q.result.findIndex((p) => p._id === doc._id)
      if (pos >= 0) {
        // No need to update, document already in results.
        return
      }
      q.result.push(doc)

      if (q.options?.sort !== undefined) {
        resultSort(q.result, q.options?.sort)
      }

      if (q.options?.limit !== undefined && q.result.length > q.options.limit) {
        if (q.result.pop()?._id !== doc._id) {
          q.callback(this.clone(q.result))
        }
      } else {
        q.callback(this.clone(q.result))
      }
    }

    await this.handleDocAddLookup(q, doc)
  }

  private async handleDocAddLookup (q: Query, doc: Doc): Promise<void> {
    if (q.options?.lookup === undefined) return
    const lookup = q.options.lookup
    if (q.result instanceof Promise) {
      q.result = await q.result
    }
    let needCallback = false
    needCallback = this.proccesLookupAddDoc(q.result, lookup, doc)

    if (needCallback) {
      if (q.options?.sort !== undefined) {
        resultSort(q.result, q.options?.sort)
      }
      q.callback(this.clone(q.result))
    }
  }

  private proccesLookupAddDoc (docs: Doc[], lookup: Lookup<Doc>, doc: Doc): boolean {
    let needCallback = false
    const lookupWays = this.getLookupWays(lookup, doc._class)
    for (const lookupWay of lookupWays) {
      const [objWay, key] = lookupWay
      for (const resDoc of docs) {
        const obj = getObjectValue(objWay, resDoc)
        if (obj === undefined) continue
        const value = getObjectValue('$lookup.' + key, obj)
        if (Array.isArray(value)) {
          if (this.client.getHierarchy().isDerived(doc._class, core.class.AttachedDoc)) {
            if ((doc as AttachedDoc).attachedTo === obj._id) {
              value.push(doc)
              needCallback = true
            }
          }
        } else {
          if (obj[key] === doc._id) {
            obj.$lookup[key] = doc
            needCallback = true
          }
        }
      }
    }
    return needCallback
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
    if (
      q.options?.limit !== undefined &&
      q.options.limit === q.result.length &&
      this.client.getHierarchy().isDerived(q._class, tx.objectClass)
    ) {
      return await this.refresh(q)
    }
    const index = q.result.findIndex((p) => p._id === tx.objectId)
    if (index > -1) {
      q.result.splice(index, 1)
      q.callback(this.clone(q.result))
    }
    await this.handleDocRemoveLookup(q, tx)
  }

  private async handleDocRemoveLookup (q: Query, tx: TxRemoveDoc<Doc>): Promise<void> {
    if (q.options?.lookup === undefined) return
    let needCallback = false
    const lookupWays = this.getLookupWays(q.options.lookup, tx.objectClass)
    if (lookupWays.length === 0) return
    if (q.result instanceof Promise) {
      q.result = await q.result
    }
    for (const lookupWay of lookupWays) {
      const [objWay, key] = lookupWay
      const docs = q.result
      for (const doc of docs) {
        const obj = getObjectValue(objWay, doc)
        if (obj === undefined) continue
        const value = getObjectValue('$lookup.' + key, obj)
        if (value === undefined) continue
        if (Array.isArray(value)) {
          const index = value.findIndex((p) => p._id === tx.objectId)
          if (index !== -1) {
            value.splice(index, 1)
            needCallback = true
          }
        } else {
          if (value._id === tx.objectId) {
            obj.$lookup[key] = undefined
            needCallback = true
          }
        }
      }
    }
    if (needCallback) {
      if (q.options?.sort !== undefined) {
        resultSort(q.result, q.options?.sort)
      }
      q.callback(this.clone(q.result))
    }
  }

  private getLookupWays (lookup: Lookup<Doc>, _class: Ref<Class<Doc>>, parent: string = ''): [string, string][] {
    const result: [string, string][] = []
    const hierarchy = this.client.getHierarchy()
    if (lookup._id !== undefined) {
      for (const key in lookup._id) {
        const value = (lookup._id as any)[key]
        const clazz = hierarchy.isMixin(value) ? hierarchy.getBaseClass(value) : value
        if (hierarchy.isDerived(_class, clazz)) {
          result.push([parent, key])
        }
      }
    }
    for (const key in lookup) {
      if (key === '_id') continue
      const value = (lookup as any)[key]
      if (Array.isArray(value)) {
        const clazz = hierarchy.isMixin(value[0]) ? hierarchy.getBaseClass(value[0]) : value[0]
        if (hierarchy.isDerived(_class, clazz)) {
          result.push([parent, key])
        }
        const lookupKey = '$lookup.' + key
        const newParent = parent.length > 0 ? parent + '.' + lookupKey : lookupKey
        const nested = this.getLookupWays(value[1], _class, newParent)
        if (nested.length > 0) {
          result.push(...nested)
        }
      } else {
        const clazz = hierarchy.isMixin(value) ? hierarchy.getBaseClass(value) : value
        if (hierarchy.isDerived(_class, clazz)) {
          result.push([parent, key])
        }
      }
    }
    return result
  }

  protected override async txBulkWrite (tx: TxBulkWrite): Promise<TxResult> {
    return await super.txBulkWrite(tx)
  }

  async tx (tx: Tx): Promise<TxResult> {
    for (const q of this.queries) {
      if (q.rememberTx) {
        q.refreshTxes.push(tx)
      }
    }
    return await super.tx(tx)
  }

  private async __updateDoc (q: Query, updatedDoc: WithLookup<Doc>, tx: TxUpdateDoc<Doc>): Promise<void> {
    TxProcessor.updateDoc2Doc(updatedDoc, tx)

    const ops = tx.operations as any
    for (const key in ops) {
      if (!key.startsWith('$')) {
        if (q.options !== undefined) {
          const lookup = (q.options.lookup as any)?.[key]
          if (lookup !== undefined) {
            ;(updatedDoc.$lookup as any)[key] = await this.client.findOne(lookup, { _id: ops[key] })
          }
        }
      }
    }
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
      q.callback(this.clone(q.result))
    }
  }
}
