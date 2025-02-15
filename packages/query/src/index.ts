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

import { Analytics } from '@hcengineering/analytics'
import core, {
  Association,
  BulkUpdateEvent,
  Class,
  Client,
  DOMAIN_MODEL,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  Hierarchy,
  IndexingUpdateEvent,
  Lookup,
  LookupData,
  Mixin,
  ModelDb,
  Ref,
  Relation,
  ReverseLookups,
  SearchOptions,
  SearchQuery,
  SearchResult,
  SortingQuery,
  Space,
  Tx,
  TxCreateDoc,
  TxMixin,
  TxProcessor,
  TxRemoveDoc,
  TxResult,
  TxUpdateDoc,
  TxWorkspaceEvent,
  WithLookup,
  WithTx,
  WorkspaceEvent,
  checkMixinKey,
  clone,
  findProperty,
  generateId,
  getObjectValue,
  matchQuery,
  reduceCalls,
  shouldShowArchived,
  toFindResult
} from '@hcengineering/core'
import { PlatformError } from '@hcengineering/platform'
import { deepEqual } from 'fast-equals'
import { Refs } from './refs'
import { ResultArray } from './results'
import { Callback, Query, type QueryId } from './types'

const CACHE_SIZE = 125

/**
 * @public
 */
export class LiveQuery implements WithTx, Client {
  private readonly client: Client
  private readonly queries = new Map<Ref<Class<Doc>>, Map<QueryId, Query>>()
  private readonly queue = new Map<QueryId, Query & { lastUsed: number }>()
  private queryCounter: number = 0
  private closed: boolean = false

  private readonly queriesToUpdate = new Map<number, Query>()

  private readonly refs = new Refs(() => this.getHierarchy())

  constructor (client: Client) {
    this.client = client
  }

  public isClosed (): boolean {
    return this.closed
  }

  async close (): Promise<void> {
    this.closed = true
    await this.client.close()
  }

  getHierarchy (): Hierarchy {
    return this.client.getHierarchy()
  }

  getModel (): ModelDb {
    return this.client.getModel()
  }

  // Perform refresh of content since connection established.
  async refreshConnect (clean: boolean): Promise<void> {
    for (const q of [...this.queue.values()]) {
      if (!this.removeFromQueue(q)) {
        try {
          if (clean) {
            this.cleanQuery(q)
          }
          // No need to refresh, since it will be on next for
        } catch (err: any) {
          if (err instanceof PlatformError) {
            if (err.message === 'connection closed') {
              continue
            }
          }
          Analytics.handleError(err)
          console.error(err)
        }
      } else {
        // No callbacks, let's remove it on conenct
        this.removeQueue(q)
      }
    }
    for (const v of this.queries.values()) {
      for (const q of v.values()) {
        try {
          if (clean) {
            this.cleanQuery(q)
          }
          void this.refresh(q)
        } catch (err: any) {
          if (err instanceof PlatformError) {
            if (err.message === 'connection closed') {
              continue
            }
          }
          Analytics.handleError(err)
          console.error(err)
        }
      }
    }
  }

  private cleanQuery (q: Query): void {
    q.callbacks.forEach((callback) => {
      callback(toFindResult([], 0))
    })
    q.result = new ResultArray([], this.getHierarchy())
    q.total = -1
  }

  private match (q: Query, doc: Doc, skipLookup = false): boolean {
    if (this.getHierarchy().isMixin(q._class)) {
      if (this.getHierarchy().hasMixin(doc, q._class)) {
        doc = this.getHierarchy().as(doc, q._class)
      } else {
        return false
      }
    }
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
      if (skipLookup && key.startsWith('$lookup')) continue
      const value = (query as any)[key]
      const result = findProperty([doc], key, value)
      if (result.length === 0) {
        return false
      }
    }
    return true
  }

  private createDumpQuery<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Query {
    const q = this.createQuery(_class, query, undefined, options)
    this.queue.set(q.id, { ...q, lastUsed: Date.now() })
    if (!(q.result instanceof Promise)) {
      q.result.clean()
    }
    return q
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    if (this.client.getHierarchy().getDomain(_class) === DOMAIN_MODEL) {
      return await this.client.findAll(_class, query, options)
    }
    const opt = { ...(options ?? {}) }
    if (opt.projection !== undefined) {
      opt.projection = {
        ...opt.projection,
        _class: 1,
        space: 1,
        modifiedOn: 1
      }
    }

    // Perform one document queries if applicable.
    const d = this.refs.findFromDocs(_class, query, opt)
    if (d !== null) {
      return d
    }

    const q = this.findQuery(_class, query, opt) ?? this.createDumpQuery(_class, query, opt)
    if (q.result instanceof Promise) {
      q.result = await q.result
    }
    if (this.removeFromQueue(q, false)) {
      this.queue.set(q.id, { ...q, lastUsed: Date.now() })
      q.result.clean()
    }
    return toFindResult(q.result.getClone(), q.total)
  }

  searchFulltext (query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    return this.client.searchFulltext(query, options)
  }

  async findOne<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<WithLookup<T> | undefined> {
    if (this.client.getHierarchy().getDomain(_class) === DOMAIN_MODEL) {
      return await this.client.findOne(_class, query, options)
    }
    if (options?.projection !== undefined) {
      options.projection = {
        ...options.projection,
        _class: 1,
        space: 1,
        modifiedOn: 1
      }
    }

    if (options === undefined) {
      options = {}
    }
    options.limit = 1

    const d = this.refs.findFromDocs(_class, query, options)
    if (d !== null) {
      return d[0]
    }

    const q = this.findQuery(_class, query, options) ?? this.createDumpQuery(_class, query, options)
    if (q.result instanceof Promise) {
      q.result = await q.result
    }
    if (this.removeFromQueue(q, false)) {
      this.queue.set(q.id, { ...q, lastUsed: Date.now() })
      q.result.clean()
    }
    return q.result.getClone<WithLookup<T>>().shift()
  }

  private optionsCompare (opt1?: FindOptions<Doc>, opt2?: FindOptions<Doc>): boolean {
    const { ctx: _1, ..._opt1 } = (opt1 ?? {}) as any
    const { ctx: _2, ..._opt2 } = (opt2 ?? {}) as any
    return deepEqual(_opt1, _opt2)
  }

  private queryCompare (q1: DocumentQuery<Doc>, q2: DocumentQuery<Doc>): boolean {
    if (Object.keys(q1).length !== Object.keys(q2).length) {
      return false
    }
    return deepEqual(q1, q2)
  }

  private findQuery<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Query | undefined {
    const queries = this.getQueueMap(_class)
    if (queries === undefined) return

    for (const q of queries.values()) {
      if (!this.queryCompare(query, q.query) || !this.optionsCompare(options, q.options)) continue
      return q
    }
  }

  private removeFromQueue (q: Query, update = true): boolean {
    if (q.callbacks.size === 0) {
      const removed = this.queue.delete(q.id)
      if (removed) {
        if (update) {
          if (!(q.result instanceof Promise)) {
            this.refs.updateDocuments(q, q.result.getDocs(), true)
          }
        }
        return true
      }
    }
    return false
  }

  private pushCallback (
    q: Query,
    callback: {
      callback: (result: Doc[]) => void
      callbackId: string
    }
  ): void {
    q.callbacks.set(callback.callbackId, callback.callback)
    setTimeout(async () => {
      if (q !== undefined) {
        if (q.result instanceof Promise) {
          q.result = await q.result
        }
        callback.callback(toFindResult(q.result.getResult(callback.callbackId), q.total))
      }
    }, 0)
  }

  private getQuery<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    callback: {
      callback: (result: Doc[]) => void
      callbackId: string
    },
    options?: FindOptions<T>
  ): Query | undefined {
    const current = this.findQuery(_class, query, options)
    if (current !== undefined) {
      this.removeFromQueue(current, false)
      this.pushCallback(current, callback)

      return current
    }
  }

  private getQueueMap (_class: Ref<Class<Doc>>): Map<QueryId, Query> {
    let cq = this.queries.get(_class)
    if (cq === undefined) {
      cq = new Map()
      this.queries.set(_class, cq)
    }
    return cq
  }

  private createQuery<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    callback: { callback: (result: FindResult<T>) => void, callbackId: string } | undefined,
    options?: FindOptions<T>
  ): Query {
    const _query: DocumentQuery<T> = clone(query)
    const localResult = this.refs.findFromDocs(_class, query, options)
    const result = localResult != null ? Promise.resolve(localResult) : this.client.findAll(_class, query, options)
    const q: Query = {
      id: ++this.queryCounter,
      _class,
      query: _query,
      result: result.then((docs) => new ResultArray(docs, this.getHierarchy())),
      total: 0,
      options: options as FindOptions<Doc>,
      callbacks: new Map(),
      refresh: reduceCalls(() => this.doRefresh(q)),
      refreshId: 0
    }
    if (callback !== undefined) {
      q.callbacks.set(callback.callbackId, callback.callback as unknown as Callback)
    }
    this.getQueueMap(_class).set(q.id, q)
    result
      .then(async (result) => {
        q.total = result.total
        await this.callback(q)
      })
      .catch((err: any) => {
        Analytics.handleError(err)
        console.log('failed to update Live Query: ', err)
      })

    if (this.queue.size > CACHE_SIZE) {
      this.remove()
    }
    return q
  }

  private remove (): void {
    const used = Array.from(this.queue.values()).sort((a, b) => a.lastUsed - b.lastUsed)
    for (let i = 0; i < CACHE_SIZE / 10; i++) {
      const q = used.shift()
      if (q === undefined) return
      this.removeQueue(q)
    }
  }

  removeQueue (q: Query): void {
    const queries = this.getQueueMap(q._class)
    const removed = queries.delete(q.id)
    this.queue.delete(q.id)
    if (removed) {
      if (!(q.result instanceof Promise)) {
        this.refs.updateDocuments(q, q.result.getDocs(), true)
      }
    }
  }

  query<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    callback: (result: FindResult<T>) => void,
    options?: FindOptions<T>
  ): () => void {
    if (options?.projection !== undefined) {
      options.projection = {
        ...options.projection,
        _class: 1,
        space: 1,
        modifiedOn: 1
      }
    }
    const callbackId = generateId()
    const q =
      this.getQuery(_class, query, { callback: callback as (result: Doc[]) => void, callbackId }, options) ??
      this.createQuery(_class, query, { callback, callbackId }, options)

    return () => {
      q.callbacks.delete(callbackId)
      if (q.callbacks.size === 0) {
        if (!(q.result instanceof Promise)) {
          q.result.clean()
        }
        this.queue.set(q.id, { ...q, lastUsed: Date.now() })
      }
    }
  }

  async queryFind<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    if (options?.projection !== undefined) {
      options.projection = {
        ...options.projection,
        _class: 1,
        space: 1,
        modifiedOn: 1
      }
    }
    const current = this.findQuery(_class, query, options)
    if (current === undefined) {
      const q = this.createQuery(
        _class,
        query,
        undefined, // No need of callback
        options
      )
      if (q.result instanceof Promise) {
        q.result = await q.result
      }
      return toFindResult(q.result.getClone(), q.total)
    }
    if (current.result instanceof Promise) {
      current.result = await current.result
    }
    return toFindResult(current.result.getClone(), current.total)
  }

  private async checkSearch (q: Query, _id: Ref<Doc>): Promise<boolean> {
    const match = await this.client.findOne(q._class, { $search: q.query.$search, _id }, q.options)
    if (q.result instanceof Promise) {
      q.result = await q.result
    }
    if (match === undefined) {
      if (q.options?.limit === q.result.length) {
        await this.refresh(q)
        return true
      } else {
        const doc = q.result.delete(_id)
        if (doc !== undefined) {
          this.refs.updateDocuments(q, [doc], true)
          if (q.options?.total === true) {
            q.total--
          }
        }
      }
    } else {
      const doc = q.result.findDoc(_id)
      if (doc !== undefined) {
        q.result.updateDoc(match, false)
        this.refs.updateDocuments(q, [match])
      }
    }
    return false
  }

  private async getDocFromCache (
    docCache: Map<string, Doc>,
    _id: Ref<Doc>,
    _class: Ref<Class<Doc>>,
    space: Ref<Space>,
    q: Query
  ): Promise<Doc | undefined> {
    const options: any = {}
    if (q.options?.associations !== undefined) {
      options.associations = q.options?.associations
    }
    if (q.options?.lookup !== undefined) {
      options.lookup = q.options?.lookup
    }
    const showArchived = shouldShowArchived(q.query, q.options)

    options.showArchived = showArchived
    const docIdKey = _id + JSON.stringify(options ?? {}) + q._class

    const current = docCache.get(docIdKey) ?? (await this.client.findOne<Doc>(q._class, { _id, space }, options))
    if (current !== undefined) {
      docCache.set(docIdKey, current)
    } else {
      docCache.delete(docIdKey)
    }
    return current
  }

  private asMixin (doc: Doc, mixin: Ref<Mixin<Doc>>): Doc {
    if (this.getHierarchy().isMixin(mixin)) {
      return this.getHierarchy().as(doc, mixin)
    }
    return doc
  }

  private async getCurrentDoc (
    q: Query,
    _id: Ref<Doc>,
    space: Ref<Space>,
    docCache: Map<string, Doc>
  ): Promise<boolean> {
    let current = await this.getDocFromCache(docCache, _id, q._class, space, q)
    if (q.result instanceof Promise) {
      q.result = await q.result
    }

    const pos = q.result.findDoc(_id)
    if (current !== undefined) {
      current = this.asMixin(current, q._class)
    }
    if (current !== undefined && this.match(q, current)) {
      q.result.updateDoc(current, false)
      this.refs.updateDocuments(q, [current])
    } else {
      if (q.options?.limit === q.result.length) {
        await this.refresh(q)
        return true
      } else if (pos !== undefined) {
        q.result.delete(_id)
        this.refs.updateDocuments(q, [pos], true)
        if (q.options?.total === true) {
          q.total--
        }
      }
    }
    return false
  }

  private async __updateMixinDoc (q: Query, updatedDoc: WithLookup<Doc>, tx: TxMixin<Doc, Doc>): Promise<void> {
    updatedDoc = TxProcessor.updateMixin4Doc(updatedDoc, tx)

    const ops = {
      ...tx.attributes,
      modifiedBy: tx.modifiedBy,
      modifiedOn: tx.modifiedOn
    }
    await this.__updateLookup(q, updatedDoc, ops)
  }

  private checkUpdatedDocMatch (q: Query, result: ResultArray, updatedDoc: WithLookup<Doc>): boolean {
    if (!this.match(q, updatedDoc)) {
      if (q.options?.limit === result.length) {
        void this.refresh(q)
        return true
      } else {
        result.delete(updatedDoc._id)
        this.refs.updateDocuments(q, [updatedDoc], true)
        if (q.options?.total === true) {
          q.total--
        }
      }
    } else {
      result.updateDoc(updatedDoc, false)
      this.refs.updateDocuments(q, [updatedDoc])
    }
    return false
  }

  protected async txMixin (tx: TxMixin<Doc, Doc>, docCache: Map<string, Doc>): Promise<TxResult> {
    const hierarchy = this.client.getHierarchy()

    for (const queries of this.queries.entries()) {
      const isTx = hierarchy.isDerived(queries[0], core.class.Tx)

      for (const q of queries[1].values()) {
        if (isTx) {
          // handle add since Txes are immutable
          if (this.match(q, tx, q.options?.lookup !== undefined)) {
            await this.handleDocAdd(q, tx, true, docCache)
          }
          await this.handleDocAddLookup(q, tx)
          continue
        }
        if (q.result instanceof Promise) {
          q.result = await q.result
        }
        let updatedDoc = q.result.findDoc(tx.objectId)
        if (updatedDoc !== undefined) {
          // If query contains search we must check use fulltext
          if (q.query.$search != null && q.query.$search.length > 0) {
            const searchRefresh = await this.checkSearch(q, tx.objectId)
            if (searchRefresh) {
              continue
            }
          } else {
            if (updatedDoc.modifiedOn < tx.modifiedOn) {
              await this.__updateMixinDoc(q, updatedDoc, tx)
              updatedDoc = this.asMixin(updatedDoc, q._class)
              const updateRefresh = this.checkUpdatedDocMatch(q, q.result, updatedDoc)
              if (updateRefresh) {
                continue
              }
            } else {
              const currentRefresh = await this.getCurrentDoc(q, updatedDoc._id, updatedDoc.space, docCache)
              if (currentRefresh) {
                continue
              }
            }
          }
          await this.sort(q, tx)
          const udoc = q.result.findDoc(tx.objectId)
          await this.updatedDocCallback(q, q.result, udoc)
        } else if (queries[0] === tx.mixin) {
          // Mixin potentially added to object we doesn't have in out results
          const doc = await this.client.findOne(q._class, { ...q.query, _id: tx.objectId }, q.options)
          if (doc !== undefined) {
            if (this.match(q, doc, q.options?.lookup !== undefined)) {
              await this.handleDocAdd(q, doc, false, docCache)
            }
            await this.handleDocAddLookup(q, doc)
          }
        }
        await this.handleDocUpdateLookup(q, tx)
        await this.handleDocUpdateRelation(q, tx)
      }
    }
    return {}
  }

  async txUpdateDoc (tx: TxUpdateDoc<Doc>, docCache: Map<string, Doc>): Promise<TxResult> {
    for (const queries of this.queries.entries()) {
      const isTx = this.client.getHierarchy().isDerived(queries[0], core.class.Tx)
      for (const q of queries[1].values()) {
        if (isTx) {
          // handle add since Txes are immutable
          // await this.handleDocAdd(q, tx, true, docCache)
          if (this.match(q, tx, q.options?.lookup !== undefined)) {
            await this.handleDocAdd(q, tx, true, docCache)
          }
          await this.handleDocAddLookup(q, tx)
          continue
        }
        await this.handleDocUpdate(q, tx, docCache)
      }
    }
    return {}
  }

  private async handleDocUpdate (q: Query, tx: TxUpdateDoc<Doc>, docCache: Map<string, Doc>): Promise<void> {
    if (q.result instanceof Promise) {
      q.result = await q.result
    }
    const updatedDoc = q.result.findDoc(tx.objectId)
    if (updatedDoc !== undefined) {
      // If query contains search we must check use fulltext
      if (q.query.$search != null && q.query.$search.length > 0) {
        const searchRefresh = await this.checkSearch(q, tx.objectId)
        if (searchRefresh) return
      } else {
        if (updatedDoc.modifiedOn < tx.modifiedOn) {
          await this.__updateDoc(q, updatedDoc, tx)
          const updateRefresh = this.checkUpdatedDocMatch(q, q.result, updatedDoc)
          if (updateRefresh) {
            return
          }
        } else {
          const currentRefresh = await this.getCurrentDoc(q, updatedDoc._id, updatedDoc.space, docCache)
          if (currentRefresh) {
            return
          }
        }
      }
      await this.sort(q, tx)
      const udoc = q.result.findDoc(tx.objectId)
      await this.updatedDocCallback(q, q.result, udoc)
    } else if (this.matchQuerySync(q, tx) && (await this.matchQuery(q, tx, docCache))) {
      await this.sort(q, tx)
      const udoc = q.result.findDoc(tx.objectId)
      await this.updatedDocCallback(q, q.result, udoc)
    } else if (
      this.client.getHierarchy().isDerived(tx.objectClass, q._class) &&
      q.options?.total === true &&
      q.options.limit === q.result.length
    ) {
      // we can make object is not matching criteria, but it can be in not limited results, total can be changed
      await this.refresh(q)
      return
    }
    await this.handleDocUpdateLookup(q, tx)
    await this.handleDocUpdateRelation(q, tx)
  }

  private isPossibleAssociationTx (tx: TxUpdateDoc<Doc> | TxMixin<Doc, Doc>, association: Association): boolean {
    const h = this.getHierarchy()
    const byClass =
      h.isDerived(tx.objectClass, association.classA) ||
      h.isDerived(tx.objectClass, association.classB) ||
      h.isDerived(association.classA, tx.objectClass) ||
      h.isDerived(association.classB, tx.objectClass)
    if (byClass) {
      return true
    }
    if (tx._class === core.class.TxMixin) {
      const mixinTx = tx as TxMixin<Doc, Doc>
      return h.isDerived(mixinTx.mixin, association.classA) || h.isDerived(mixinTx.mixin, association.classB)
    }
    return false
  }

  private async handleDocUpdateRelation (q: Query, tx: TxUpdateDoc<Doc> | TxMixin<Doc, Doc>): Promise<void> {
    if (q.options?.associations === undefined) return
    for (const assoc of q.options.associations) {
      const association = this.getModel().findObject(assoc[0])
      if (association === undefined) continue
      if (this.isPossibleAssociationTx(tx, association)) {
        if (q.result instanceof Promise) {
          q.result = await q.result
        }
        const docs = q.result.getDocs()
        for (const doc of docs) {
          const docToUpdate = doc.$associations?.[association._id].find((it) => it._id === tx.objectId)
          if (docToUpdate !== undefined) {
            if (tx._class === core.class.TxMixin) {
              TxProcessor.updateMixin4Doc(docToUpdate, tx as TxMixin<Doc, Doc>)
            } else {
              TxProcessor.updateDoc2Doc(docToUpdate, tx as TxUpdateDoc<Doc>)
            }
            q.result.updateDoc(doc, false)
            this.queriesToUpdate.set(q.id, q)
          }
        }
      }
    }
  }

  private async handleDocUpdateLookup (q: Query, tx: TxUpdateDoc<Doc> | TxMixin<Doc, Doc>): Promise<void> {
    if (q.options?.lookup === undefined) return
    const lookup = q.options.lookup
    if (q.result instanceof Promise) {
      q.result = await q.result
    }
    let needCallback = false
    needCallback = await this.processLookupUpdateDoc(q.result, lookup, tx)

    if (needCallback) {
      if (q.options?.sort !== undefined) {
        q.result.sort(q._class, q.options.sort, this.getHierarchy(), this.client.getModel())
      }
      await this.callback(q, true)
    }
  }

  private async processLookupUpdateDoc (
    docs: ResultArray,
    lookup: Lookup<Doc>,
    tx: TxUpdateDoc<Doc> | TxMixin<Doc, Doc>
  ): Promise<boolean> {
    let needCallback = false
    const lookupWays = this.getLookupWays(lookup, tx.objectClass)
    for (const lookupWay of lookupWays) {
      const [objWay, key, reverseLookupKey] = lookupWay
      for (const resDoc of docs.getDocs()) {
        const obj = getObjectValue(objWay, resDoc)
        if (obj === undefined) continue
        const value = getObjectValue('$lookup.' + key, obj)
        if (Array.isArray(value)) {
          let index = value.findIndex((p) => p._id === tx.objectId)
          if (this.client.getHierarchy().isDerived(tx.objectClass, core.class.AttachedDoc)) {
            if (reverseLookupKey !== undefined) {
              const reverseLookupValue = (
                tx._class === core.class.TxMixin
                  ? ((tx as TxMixin<Doc, Doc>).attributes as any)
                  : ((tx as TxUpdateDoc<Doc>).operations as any)
              )[reverseLookupKey]
              if (index !== -1 && reverseLookupValue !== undefined && reverseLookupValue !== obj._id) {
                value.splice(index, 1)
                index = -1
                needCallback = true
                docs.updateDoc(resDoc, false)
              } else if (index === -1 && reverseLookupValue === obj._id) {
                const doc = await this.findOne(tx.objectClass, { _id: tx.objectId })
                if (doc !== undefined) {
                  value.push(doc)
                  index = value.length - 1
                }
                needCallback = true
                docs.updateDoc(resDoc, false)
              }
            }
          }
          if (index !== -1) {
            if (tx._class === core.class.TxMixin) {
              TxProcessor.updateMixin4Doc(value[index], tx as TxMixin<Doc, Doc>)
            } else {
              TxProcessor.updateDoc2Doc(value[index], tx as TxUpdateDoc<Doc>)
            }
            needCallback = true
            docs.updateDoc(resDoc, false)
          }
        } else {
          if (obj[key] === tx.objectId) {
            if (obj.$lookup[key] !== undefined) {
              if (tx._class === core.class.TxMixin) {
                TxProcessor.updateMixin4Doc(obj.$lookup[key], tx as TxMixin<Doc, Doc>)
              } else {
                TxProcessor.updateDoc2Doc(obj.$lookup[key], tx as TxUpdateDoc<Doc>)
              }
              needCallback = true
              docs.updateDoc(resDoc, false)
            }
          }
        }
      }
    }
    return needCallback
  }

  private async refresh (q: Query): Promise<void> {
    this.queriesToUpdate.delete(q.id)
    await q.refresh()
  }

  private async doRefresh (q: Query): Promise<void> {
    const qid = ++q.refreshId
    const res = await this.client.findAll(q._class, q.query, q.options)
    if (q.refreshId === qid && (!deepEqual(res, q.result) || (res.total !== q.total && q.options?.total === true))) {
      q.result = new ResultArray(res, this.getHierarchy())
      q.total = res.total
      await this.callback(q)
    }
  }

  private matchQuerySync (q: Query, tx: TxUpdateDoc<Doc>): boolean {
    const clazz = this.getHierarchy().isMixin(q._class) ? this.getHierarchy().getBaseClass(q._class) : q._class
    if (!this.client.getHierarchy().isDerived(tx.objectClass, clazz)) {
      return false
    }
    return true
  }

  // Check if query is partially matched.
  private async matchQuery (q: Query, tx: TxUpdateDoc<Doc>, docCache: Map<string, Doc>): Promise<boolean> {
    const doc: Doc = {
      _id: tx.objectId,
      _class: tx.objectClass,
      modifiedBy: tx.modifiedBy,
      modifiedOn: tx.modifiedOn,
      space: tx.objectSpace
    }

    // we cannot handle $inc correctly, let's skip it
    const { $inc, ...ops } = tx.operations

    const emptyOps = Object.keys(ops).length === 0
    let matched = emptyOps
    if (!emptyOps) {
      const virtualTx = {
        ...tx,
        operations: ops
      }

      TxProcessor.updateDoc2Doc(doc, virtualTx)

      for (const key in q.query) {
        const value = (q.query as any)[key]
        const tkey = checkMixinKey(key, q._class, this.client.getHierarchy())
        if ((doc as any)[tkey] === undefined) continue
        const res = findProperty([doc], tkey, value)
        if (res.length === 0) {
          return false
        } else {
          matched = true
        }
      }
    }

    if (matched) {
      const realDoc = await this.getDocFromCache(docCache, doc._id, Hierarchy.mixinOrClass(doc), doc.space, q)

      if (realDoc == null) return false

      if (this.getHierarchy().isMixin(q._class)) {
        if (!this.getHierarchy().hasMixin(realDoc, q._class)) {
          return false
        }
      }
      const res = matchQuery([realDoc], q.query, q._class, this.client.getHierarchy())
      if (res.length === 1) {
        if (q.result instanceof Promise) {
          q.result = await q.result
        }
        const doc = res[0]
        const pos = q.result.findDoc(doc._id)
        if (pos !== undefined) {
          q.result.updateDoc(doc)
          this.refs.updateDocuments(q, [doc])
        } else {
          q.result.push(doc)
          if (q.options?.total === true) {
            q.total++
          }
        }
        return true
      }
    }
    return false
  }

  private async getLookupValue<T extends Doc>(
    _class: Ref<Class<T>>,
    doc: T,
    lookup: Lookup<T>,
    result: LookupData<T>
  ): Promise<void> {
    for (const key in lookup) {
      if (key === '_id') {
        await this.getReverseLookupValue(doc, lookup, result)
        continue
      }
      const value = (lookup as any)[key]
      const tkey = checkMixinKey(key, _class, this.client.getHierarchy())
      if (Array.isArray(value)) {
        const [_class, nested] = value
        ;(result as any)[key] = await this.findOne(_class, { _id: getObjectValue(tkey, doc) })
        const nestedResult = {}
        const parent = (result as any)[key]
        if (parent !== undefined) {
          await this.getLookupValue(_class, parent, nested, nestedResult)
          Object.assign(parent, {
            $lookup: nestedResult
          })
        }
      } else {
        ;(result as any)[key] = await this.findOne(value, { _id: getObjectValue(tkey, doc) })
      }
    }
  }

  private async getReverseLookupValue<T extends Doc>(
    doc: T,
    lookup: ReverseLookups,
    result: LookupData<T>
  ): Promise<void> {
    for (const key in lookup._id) {
      if ((doc as any)[key] === undefined || (doc as any)[key] === 0) {
        continue
      }

      const value = lookup._id[key]

      let _class: Ref<Class<Doc>>
      let attr = 'attachedTo'

      if (Array.isArray(value)) {
        _class = value[0]
        attr = value[1]
      } else {
        _class = value
      }
      ;(result as any)[key] = await this.findAll(_class, { [attr]: doc._id })
    }
  }

  private async lookup<T extends Doc>(_class: Ref<Class<T>>, doc: T, lookup: Lookup<T>): Promise<void> {
    const result: LookupData<Doc> = {}
    await this.getLookupValue(_class, doc, lookup, result)
    ;(doc as WithLookup<Doc>).$lookup = result
  }

  protected async txCreateDoc (tx: TxCreateDoc<Doc>, docCache: Map<string, Doc>): Promise<TxResult> {
    const docTx = TxProcessor.createDoc2Doc(tx)
    for (const queries of this.queries.entries()) {
      const doc = this.client.getHierarchy().isDerived(queries[0], core.class.Tx) ? tx : docTx
      for (const q of queries[1].values()) {
        // await this.handleDocAdd(q, doc, true, docCache)
        if (this.match(q, doc, q.options?.lookup !== undefined)) {
          await this.handleDocAdd(q, doc, true, docCache)
        }

        await this.handleDocAddLookup(q, doc)
        await this.handleDocAddRelation(q, doc)
      }
    }
    return {}
  }

  private async handleDocAdd (q: Query, doc: Doc, handleLookup = true, docCache: Map<string, Doc>): Promise<void> {
    let needPush = true
    if (q.result instanceof Promise) {
      q.result = await q.result
    }
    if (q.options?.lookup !== undefined && handleLookup) {
      await this.lookup(q._class, doc, q.options.lookup)
      const matched = this.match(q, doc)
      if (!matched) needPush = false
    }
    if (needPush) {
      // We could already have document inside results, if query is created during processing of document create transaction and not yet handled on client.
      const pos = q.result.findDoc(doc._id)
      if (pos !== undefined) {
        // No need to update, document already in results.
        needPush = false
      }
    }
    if (needPush) {
      // If query contains search we must check use fulltext
      if (q.query.$search != null && q.query.$search.length > 0) {
        const match = await this.client.findOne(q._class, { $search: q.query.$search, _id: doc._id }, q.options)
        if (match === undefined) return
      }

      q.result.push(doc)
      if (q.options?.total === true) {
        q.total++
      }

      if (q.options?.sort !== undefined) {
        q.result.sort(q._class, q.options.sort, this.getHierarchy(), this.client.getModel())
      }

      if (q.options?.limit !== undefined && q.result.length > q.options.limit) {
        if (q.result.pop()?._id !== doc._id || q.options?.total === true) {
          await this.callback(q, true)
        }
      } else {
        await this.callback(q, true)
      }
    }
  }

  private async callback (q: Query, bulkUpdate = false): Promise<void> {
    if (q.result instanceof Promise) {
      q.result = await q.result
    }

    const result = q.result

    this.refs.updateDocuments(q, result.getDocs())

    if (bulkUpdate) {
      this.queriesToUpdate.set(q.id, q)
    } else {
      this.queriesToUpdate.delete(q.id)
      for (const [id, callback] of q.callbacks.entries()) {
        callback(toFindResult(result.getResult(id), q.total))
      }
    }
  }

  private async handleDocAddRelation (q: Query, doc: Doc): Promise<void> {
    if (q.options?.associations === undefined) return
    if (doc._class !== core.class.Relation) return
    const relation = doc as Relation
    const assoc = q.options.associations.find((p) => p[0] === relation.association)
    if (assoc !== undefined) {
      if (q.result instanceof Promise) {
        q.result = await q.result
      }
      const direct = assoc[1] === 1
      const res = q.result.findDoc(direct ? relation.docA : relation.docB)
      if (res === undefined) return
      const association = this.getModel().findObject(assoc[0])
      if (association === undefined) return
      const docToPush = await this.findOne(!direct ? association.classB : association.classA, {
        _id: direct ? relation.docB : relation.docA
      })
      if (docToPush === undefined) return
      const arr = res?.$associations?.[relation.association] ?? []
      arr.push(docToPush)
      if (res?.$associations === undefined) {
        res.$associations = {}
      }
      res.$associations[relation.association] = arr
      q.result.updateDoc(res, false)
      this.queriesToUpdate.set(q.id, q)
    }
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
        q.result.sort(q._class, q.options.sort, this.getHierarchy(), this.client.getModel())
      }
      await this.callback(q, true)
    }
  }

  private proccesLookupAddDoc (docs: ResultArray, lookup: Lookup<Doc>, doc: Doc): boolean {
    let needCallback = false
    const lookupWays = this.getLookupWays(lookup, doc._class)
    for (const lookupWay of lookupWays) {
      const [objWay, key, reverseLookupKey] = lookupWay
      for (const resDoc of docs.getDocs()) {
        const obj = getObjectValue(objWay, resDoc)
        if (obj === undefined) continue
        let value = getObjectValue('$lookup.' + key, obj)
        const reverseCheck = reverseLookupKey !== undefined && (doc as any)[reverseLookupKey] === obj._id
        if (value == null && reverseCheck) {
          value = []
          obj.$lookup[key] = value
          needCallback = true
          docs.updateDoc(resDoc, false)
        }
        if (Array.isArray(value)) {
          if (this.client.getHierarchy().isDerived(doc._class, core.class.AttachedDoc) && reverseCheck) {
            const idx = (value as Doc[]).findIndex((p) => p._id === doc._id)
            if (idx === -1) {
              value.push(doc)
            } else {
              value[idx] = doc
            }
            needCallback = true
            docs.updateDoc(resDoc, false)
          }
        } else {
          if (obj[key] === doc._id) {
            obj.$lookup[key] = doc
            needCallback = true
            docs.updateDoc(resDoc, false)
          }
        }
      }
    }
    return needCallback
  }

  protected async txRemoveDoc (tx: TxRemoveDoc<Doc>, docCache: Map<string, Doc>): Promise<TxResult> {
    for (const queries of this.queries.entries()) {
      const isTx = this.client.getHierarchy().isDerived(queries[0], core.class.Tx)
      for (const q of queries[1].values()) {
        if (isTx) {
          // handle add since Txes are immutable
          // await this.handleDocAdd(q, tx, true, docCache)
          if (this.match(q, tx, q.options?.lookup !== undefined)) {
            await this.handleDocAdd(q, tx, true, docCache)
          }

          await this.handleDocAddLookup(q, tx)
          continue
        }
        await this.handleDocRemove(q, tx)
      }
    }
    return {}
  }

  private async handleDocRemove (q: Query, tx: TxRemoveDoc<Doc>): Promise<void> {
    const h = this.client.getHierarchy()
    if (q.result instanceof Promise) {
      q.result = await q.result
    }
    const index = q.result.getDocs().find((p) => p._id === tx.objectId && h.isDerived(p._class, tx.objectClass))
    if (index !== undefined) {
      if (
        q.options?.limit !== undefined &&
        q.options.limit === q.result.length &&
        h.isDerived(q._class, tx.objectClass)
      ) {
        await this.refresh(q)
        return
      }
      q.result.delete(index._id)
      this.refs.updateDocuments(q, [index], true)

      if (q.options?.total === true) {
        q.total--
      }
      await this.callback(q, true)
    }
    await this.handleDocRemoveLookup(q, tx)
    await this.handleDocRemoveRelation(q, tx)
  }

  private async handleDocRemoveRelation (q: Query, tx: TxRemoveDoc<Doc>): Promise<void> {
    if (q.options?.associations === undefined) return
    if (tx.objectClass !== core.class.Relation) return
    await this.refresh(q)
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
      for (const doc of docs.getDocs()) {
        const obj = getObjectValue(objWay, doc)
        if (obj === undefined) continue
        const value = getObjectValue('$lookup.' + key, obj)
        if (value === undefined) continue
        if (Array.isArray(value)) {
          const index = value.findIndex((p) => p._id === tx.objectId)
          if (index !== -1) {
            value.splice(index, 1)
            needCallback = true
            docs.updateDoc(doc, false)
          }
        } else {
          if (value._id === tx.objectId) {
            obj.$lookup[key] = undefined
            needCallback = true
            docs.updateDoc(doc, false)
          }
        }
      }
    }
    if (needCallback) {
      if (q.options?.sort !== undefined) {
        q.result.sort(q._class, q.options.sort, this.getHierarchy(), this.client.getModel())
      }
      await this.callback(q, true)
    }
  }

  private getLookupWays (
    lookup: Lookup<Doc>,
    _class: Ref<Class<Doc>>,
    parent: string = ''
  ): [string, string, string?][] {
    const result: [string, string, string?][] = []
    const hierarchy = this.client.getHierarchy()
    if (lookup._id !== undefined) {
      for (const key in lookup._id) {
        const value = (lookup._id as any)[key]
        const [valueClass, reverseLookupKey] = Array.isArray(value) ? value : [value, 'attachedTo']
        const clazz = hierarchy.isMixin(valueClass) ? hierarchy.getBaseClass(valueClass) : valueClass
        if (hierarchy.isDerived(_class, clazz)) {
          result.push([parent, key, reverseLookupKey])
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

  async _tx (tx: Tx, docCache: Map<string, Doc>): Promise<TxResult> {
    switch (tx._class) {
      case core.class.TxCreateDoc:
        return await this.txCreateDoc(tx as TxCreateDoc<Doc>, docCache)
      case core.class.TxUpdateDoc:
        return await this.txUpdateDoc(tx as TxUpdateDoc<Doc>, docCache)
      case core.class.TxRemoveDoc:
        return await this.txRemoveDoc(tx as TxRemoveDoc<Doc>, docCache)
      case core.class.TxMixin:
        return await this.txMixin(tx as TxMixin<Doc, Doc>, docCache)
      case core.class.TxApplyIf:
        return await Promise.resolve([])
    }
    return {}
  }

  async tx (...txes: Tx[]): Promise<TxResult[]> {
    const result: TxResult[] = []
    const docCache = new Map<string, Doc>()
    for (const tx of txes) {
      if (tx._class === core.class.TxWorkspaceEvent) {
        const evt = tx as TxWorkspaceEvent
        await this.checkUpdateEvents(evt)
        await this.changePrivateHandler(evt)
      }
      result.push(await this._tx(tx, docCache))
    }

    if (this.queriesToUpdate.size > 0) {
      const copy = new Map(this.queriesToUpdate)
      this.queriesToUpdate.clear()

      for (const q of copy.values()) {
        if (q.result instanceof Promise) {
          q.result = await q.result
        }
        const qr = q.result
        for (const [id, callback] of q.callbacks.entries()) {
          callback(toFindResult(qr.getResult(id), q.total))
        }
      }
    }
    return result
  }

  private async checkUpdateEvents (evt: TxWorkspaceEvent, trigger = true): Promise<void> {
    const h = this.client.getHierarchy()
    function hasClass (q: Query, classes: Ref<Class<Doc>>[]): boolean {
      return classes.includes(q._class) || classes.some((it) => h.isDerived(q._class, it) || h.isDerived(it, q._class))
    }
    if (evt.event === WorkspaceEvent.IndexingUpdate) {
      const indexingParam = evt.params as IndexingUpdateEvent
      for (const q of [...this.queue.values()]) {
        if (hasClass(q, indexingParam._class) && q.query.$search !== undefined) {
          if (!this.removeFromQueue(q)) {
            try {
              await this.refresh(q)
            } catch (err: any) {
              Analytics.handleError(err)
              console.error(err)
            }
          } else {
            this.removeQueue(q)
          }
        }
      }
      for (const v of this.queries.values()) {
        for (const q of v.values()) {
          if (hasClass(q, indexingParam._class) && q.query.$search !== undefined) {
            try {
              await this.refresh(q)
            } catch (err: any) {
              Analytics.handleError(err)
              console.error(err)
            }
          }
        }
      }
    }
    if (evt.event === WorkspaceEvent.BulkUpdate) {
      const params = evt.params as BulkUpdateEvent
      for (const q of [...this.queue.values()]) {
        if (hasClass(q, params._class)) {
          if (!this.removeFromQueue(q)) {
            try {
              await this.refresh(q)
            } catch (err: any) {
              Analytics.handleError(err)
              console.error(err)
            }
          }
        }
      }
      for (const v of this.queries.values()) {
        for (const q of v.values()) {
          if (hasClass(q, params._class)) {
            try {
              await this.refresh(q)
            } catch (err: any) {
              Analytics.handleError(err)
              console.error(err)
            }
          }
        }
      }
    }
  }

  private async changePrivateHandler (evt: TxWorkspaceEvent): Promise<void> {
    if (evt.event === WorkspaceEvent.SecurityChange) {
      for (const q of [...this.queue.values()]) {
        if (typeof q.query.space !== 'string' || q.query.space === evt.objectSpace) {
          if (!this.removeFromQueue(q)) {
            try {
              await this.refresh(q)
            } catch (err: any) {
              Analytics.handleError(err)
              console.error(err)
            }
          }
        }
      }
      for (const v of this.queries.values()) {
        for (const q of v.values()) {
          if (typeof q.query.space !== 'string' || q.query.space === evt.objectSpace) {
            try {
              await this.refresh(q)
            } catch (err: any) {
              Analytics.handleError(err)
              console.error(err)
            }
          }
        }
      }
    }
  }

  private async __updateLookup (q: Query, updatedDoc: WithLookup<Doc>, ops: any): Promise<void> {
    for (const key in ops) {
      if (!key.startsWith('$')) {
        if (q.options !== undefined) {
          const lookup = (q.options.lookup as any)?.[key]
          if (lookup !== undefined) {
            const lookupClass = getLookupClass(lookup)
            const nestedLookup = getNestedLookup(lookup)
            if (Array.isArray(ops[key])) {
              ;(updatedDoc.$lookup as any)[key] = await this.findAll(
                lookupClass,
                { _id: { $in: ops[key] } },
                { lookup: nestedLookup }
              )
            } else {
              ;(updatedDoc.$lookup as any)[key] = await this.findOne(
                lookupClass,
                { _id: ops[key] },
                { lookup: nestedLookup }
              )
            }
          }
        }
      } else {
        if (key === '$push') {
          const pops = ops[key] ?? {}
          for (const pkey of Object.keys(pops)) {
            if (q.options !== undefined) {
              const lookup = (q.options.lookup as any)?.[pkey]
              if (lookup !== undefined) {
                const lookupClass = getLookupClass(lookup)
                const nestedLookup = getNestedLookup(lookup)
                const pp = updatedDoc.$lookup as any
                if (pp[pkey] === undefined) {
                  pp[pkey] = []
                }
                if (Array.isArray(pops[pkey])) {
                  const pushData = await this.findAll(
                    lookupClass,
                    { _id: { $in: pops[pkey] } },
                    { lookup: nestedLookup }
                  )
                  pp[pkey].push(...pushData)
                } else {
                  const d = await this.findOne(lookupClass, { _id: pops[pkey] }, { lookup: nestedLookup })
                  if (d !== undefined) {
                    pp[pkey].push(d)
                  }
                }
              }
            }
          }
        } else if (key === '$pull') {
          const pops = ops[key] ?? {}
          for (const pkey of Object.keys(pops)) {
            if (q.options !== undefined) {
              const lookup = (q.options.lookup as any)?.[pkey]
              if (lookup !== undefined) {
                const pid = pops[pkey]
                const pp = updatedDoc.$lookup as any
                if (pp[pkey] === undefined) {
                  pp[pkey] = []
                }
                if (Array.isArray(pid)) {
                  pp[pkey] = pp[pkey].filter((it: Doc) => !pid.includes(it._id))
                } else {
                  pp[pkey] = pp[pkey].filter((it: Doc) => it._id !== pid)
                }
              }
            }
          }
        }
      }
    }
  }

  private async __updateDoc (q: Query, updatedDoc: WithLookup<Doc>, tx: TxUpdateDoc<Doc>): Promise<void> {
    TxProcessor.updateDoc2Doc(updatedDoc, tx)

    const ops = {
      ...tx.operations,
      modifiedBy: tx.modifiedBy,
      modifiedOn: tx.modifiedOn
    }
    await this.__updateLookup(q, updatedDoc, ops)
  }

  private async sort (q: Query, tx: TxUpdateDoc<Doc> | TxMixin<Doc, Doc>): Promise<void> {
    const sort = q.options?.sort
    if (sort === undefined) return
    let needSort = sort.modifiedBy !== undefined || sort.modifiedOn !== undefined
    if (!needSort) needSort = this.checkNeedSort(sort, tx)

    if (needSort) {
      if (q.result instanceof Promise) {
        q.result = await q.result
      }
      q.result.sort(q._class, sort, this.getHierarchy(), this.client.getModel())
    }
  }

  private checkNeedSort (sort: SortingQuery<Doc>, tx: TxUpdateDoc<Doc> | TxMixin<Doc, Doc>): boolean {
    const ops =
      tx._class === core.class.TxMixin
        ? (tx as TxMixin<Doc, Doc>).attributes
        : ((tx as TxUpdateDoc<Doc>).operations as any)
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

  private async updatedDocCallback (q: Query, res: ResultArray, updatedDoc: Doc | undefined): Promise<void> {
    if (q.options?.limit !== undefined && res.length > q.options.limit) {
      if (updatedDoc === undefined) {
        await this.refresh(q)
        return
      }
      if (res.getDocs()[q.options?.limit]._id === updatedDoc._id) {
        await this.refresh(q)
        return
      }
      if (res.pop()?._id !== updatedDoc._id) {
        await this.callback(q, true)
      }
    } else {
      await this.callback(q, true)
    }
  }
}

function getNestedLookup (lookup: Ref<Class<Doc>> | [Ref<Class<Doc>>, Lookup<Doc>]): Lookup<Doc> | undefined {
  return Array.isArray(lookup) ? lookup[1] : undefined
}

function getLookupClass (lookup: Ref<Class<Doc>> | [Ref<Class<Doc>>, Lookup<Doc>]): Ref<Class<Doc>> {
  return Array.isArray(lookup) ? lookup[0] : lookup
}
