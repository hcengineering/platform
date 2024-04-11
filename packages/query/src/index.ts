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
  ModelDb,
  Ref,
  ReverseLookups,
  SearchOptions,
  SearchQuery,
  SearchResult,
  SortingQuery,
  Space,
  Timestamp,
  Tx,
  TxCollectionCUD,
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
  findProperty,
  generateId,
  getObjectValue,
  matchQuery,
  resultSort,
  toFindResult
} from '@hcengineering/core'
import { PlatformError } from '@hcengineering/platform'
import { deepEqual } from 'fast-equals'
import { Analytics } from '@hcengineering/analytics'

const CACHE_SIZE = 100

type Callback = (result: FindResult<Doc>) => void

type QueryId = number

interface Query {
  id: QueryId // uniq query identifier.
  _class: Ref<Class<Doc>>
  query: DocumentQuery<Doc>
  result: Doc[] | Promise<Doc[]>
  options?: FindOptions<Doc>
  total: number
  callbacks: Map<string, Callback>

  requested?: Promise<void>
}

interface DocumentRef {
  doc: Doc
  queries: QueryId[]
  lastUsed: Timestamp
}

/**
 * @public
 */
export class LiveQuery implements WithTx, Client {
  private readonly client: Client
  private readonly queries: Map<Ref<Class<Doc>>, Query[]> = new Map<Ref<Class<Doc>>, Query[]>()
  private readonly queue: Query[] = []
  private queryCounter: number = 0
  private closed: boolean = false

  // A map of _class to documents.
  private readonly documentRefs = new Map<string, Map<Ref<Doc>, DocumentRef>>()

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
    for (const q of [...this.queue]) {
      if (!this.removeFromQueue(q)) {
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
    for (const v of this.queries.values()) {
      for (const q of v) {
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
    q.result = []
    q.total = -1
  }

  private match (q: Query, doc: Doc, skipLookup = false): boolean {
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
    const callback: () => void = () => {}
    const callbackId = generateId()
    const q = this.createQuery(_class, query, { callback, callbackId }, options)
    q.callbacks.delete(callbackId)
    if (q.callbacks.size === 0) {
      this.queue.push(q)
    }
    return q
  }

  findFromDocs<T extends Doc>(
    _class: Ref<Class<Doc>>,
    query: DocumentQuery<Doc>,
    options?: FindOptions<T>
  ): FindResult<T> | null {
    const classKey = _class + ':' + JSON.stringify(options?.lookup ?? {})
    if (typeof query._id === 'string') {
      // One document query
      const doc = this.documentRefs.get(classKey)?.get(query._id)?.doc
      if (doc !== undefined) {
        const q = matchQuery([doc], query, _class, this.getHierarchy())
        if (q.length > 0) {
          return toFindResult(this.clone([doc]), 1) as FindResult<T>
        }
      }
    }
    if (
      options?.limit === 1 &&
      options.total !== true &&
      options?.sort === undefined &&
      options?.projection === undefined
    ) {
      const docs = this.documentRefs.get(classKey)
      if (docs !== undefined) {
        const _docs = Array.from(docs.values()).map((it) => it.doc)

        const q = matchQuery(_docs, query, _class, this.getHierarchy())
        if (q.length > 0) {
          return toFindResult(this.clone([q[0]]), 1) as FindResult<T>
        }
      }
    }
    return null
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    if (this.client.getHierarchy().getDomain(_class) === DOMAIN_MODEL) {
      return await this.client.findAll(_class, query, options)
    }
    if (options?.projection !== undefined) {
      options.projection = {
        ...options.projection,
        _class: 1,
        space: 1,
        modifiedOn: 1
      }
    }

    // Perform one document queries if applicable.
    const d = this.findFromDocs(_class, query, options)
    if (d !== null) {
      return d
    }

    const q = this.findQuery(_class, query, options) ?? this.createDumpQuery(_class, query, options)
    if (q.result instanceof Promise) {
      q.result = await q.result
    }
    if (this.removeFromQueue(q, false)) {
      this.queue.push(q)
    }
    return toFindResult(this.clone(q.result), q.total) as FindResult<T>
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

    const d = this.findFromDocs(_class, query, options)
    if (d !== null) {
      return d[0]
    }

    const q = this.findQuery(_class, query, options) ?? this.createDumpQuery(_class, query, options)
    if (q.result instanceof Promise) {
      q.result = await q.result
    }
    if (this.removeFromQueue(q, false)) {
      this.queue.push(q)
    }
    return this.clone(q.result)[0] as WithLookup<T>
  }

  private findQuery<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Query | undefined {
    const queries = this.queries.get(_class)
    if (queries === undefined) return
    for (const q of queries) {
      if (!deepEqual(query, q.query) || !deepEqual(options, q.options)) continue
      return q
    }
  }

  private removeFromQueue (q: Query, update = true): boolean {
    if (q.callbacks.size === 0) {
      const queueIndex = this.queue.indexOf(q)
      if (queueIndex !== -1) {
        this.queue.splice(queueIndex, 1)
        if (update) {
          if (!(q.result instanceof Promise)) {
            this.updateDocuments(q, q.result, true)
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
        callback.callback(toFindResult(this.clone(q.result), q.total))
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

  private createQuery<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    callback: { callback: (result: FindResult<T>) => void, callbackId: string },
    options?: FindOptions<T>
  ): Query {
    const queries = this.queries.get(_class) ?? []
    const localResult = this.findFromDocs(_class, query, options)
    const result = localResult != null ? Promise.resolve(localResult) : this.client.findAll(_class, query, options)
    const q: Query = {
      id: ++this.queryCounter,
      _class,
      query,
      result,
      total: 0,
      options: options as FindOptions<Doc>,
      callbacks: new Map()
    }
    q.callbacks.set(callback.callbackId, callback.callback as unknown as Callback)
    queries.push(q)
    result
      .then(async (result) => {
        q.total = result.total
        await this.callback(q)
      })
      .catch((err: any) => {
        Analytics.handleError(err)
        console.log('failed to update Live Query: ', err)
      })

    this.queries.set(_class, queries)
    while (this.queue.length > CACHE_SIZE) {
      this.remove()
    }
    return q
  }

  private remove (): void {
    const q = this.queue.shift()
    if (q === undefined) return
    const queries = this.queries.get(q._class)
    const pos = queries?.indexOf(q) ?? -1
    if (pos >= 0 && queries !== undefined) {
      queries.splice(pos, 1)
      if (!(q.result instanceof Promise)) {
        this.updateDocuments(q, q.result, true)
      }
    }
    if (queries?.length === 0) {
      this.queries.delete(q._class)
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
        this.queue.push(q)
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
        {
          callback: () => {
            // do nothing
          },
          callbackId: generateId()
        },
        options
      )
      if (q.result instanceof Promise) {
        q.result = await q.result
      }
      return toFindResult(this.clone(q.result), q.total) as FindResult<T>
    }
    if (current.result instanceof Promise) {
      current.result = await current.result
    }
    return toFindResult(this.clone((current?.result as T[]) ?? []), current.total)
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
        const pos = q.result.findIndex((p) => p._id === _id)
        if (pos !== -1) {
          const doc = q.result.splice(pos, 1)
          this.updateDocuments(q, doc, true)
          if (q.options?.total === true) {
            q.total--
          }
        }
      }
    } else {
      const pos = q.result.findIndex((p) => p._id === _id)
      if (pos !== -1) {
        q.result[pos] = match
        this.updateDocuments(q, [match])
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
    const lookup = q.options?.lookup
    const docIdKey = _id + JSON.stringify(lookup ?? {}) + q._class

    const current =
      docCache.get(docIdKey) ??
      (await this.client.findOne<Doc>(q._class, { _id, space }, lookup !== undefined ? { lookup } : undefined))
    if (current !== undefined) {
      docCache.set(docIdKey, current)
    } else {
      docCache.delete(docIdKey)
    }
    return current
  }

  private async getCurrentDoc (
    q: Query,
    _id: Ref<Doc>,
    space: Ref<Space>,
    docCache: Map<string, Doc>
  ): Promise<boolean> {
    const current = await this.getDocFromCache(docCache, _id, q._class, space, q)
    if (q.result instanceof Promise) {
      q.result = await q.result
    }

    const pos = q.result.findIndex((p) => p._id === _id)
    if (current !== undefined && this.match(q, current)) {
      q.result[pos] = current
      this.updateDocuments(q, [current])
    } else {
      if (q.options?.limit === q.result.length) {
        await this.refresh(q)
        return true
      } else if (pos !== -1) {
        const doc = q.result.splice(pos, 1)
        this.updateDocuments(q, doc, true)
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

  private async checkUpdatedDocMatch (q: Query, updatedDoc: WithLookup<Doc>): Promise<boolean> {
    if (q.result instanceof Promise) {
      q.result = await q.result
    }
    const pos = q.result.findIndex((p) => p._id === updatedDoc._id)
    if (!this.match(q, updatedDoc)) {
      if (q.options?.limit === q.result.length) {
        await this.refresh(q)
        return true
      } else {
        const doc = q.result.splice(pos, 1)
        this.updateDocuments(q, doc, true)
        if (q.options?.total === true) {
          q.total--
        }
      }
    } else {
      q.result[pos] = updatedDoc
      this.updateDocuments(q, [updatedDoc])
    }
    return false
  }

  protected async txMixin (tx: TxMixin<Doc, Doc>, docCache: Map<string, Doc>): Promise<TxResult> {
    const hierarchy = this.client.getHierarchy()

    for (const queries of this.queries) {
      const isTx = hierarchy.isDerived(queries[0], core.class.Tx)

      for (const q of queries[1]) {
        if (isTx) {
          // handle add since Txes are immutable
          await this.handleDocAdd(q, tx, true, docCache)
          continue
        }
        if (q.result instanceof Promise) {
          q.result = await q.result
        }
        const pos = q.result.findIndex((p) => p._id === tx.objectId)
        if (pos !== -1) {
          // If query contains search we must check use fulltext
          if (q.query.$search != null && q.query.$search.length > 0) {
            const searchRefresh = await this.checkSearch(q, tx.objectId)
            if (searchRefresh) {
              continue
            }
          } else {
            const updatedDoc = q.result[pos]
            if (updatedDoc.modifiedOn < tx.modifiedOn) {
              await this.__updateMixinDoc(q, updatedDoc, tx)
              const updateRefresh = await this.checkUpdatedDocMatch(q, updatedDoc)
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
          const udoc = q.result.find((p) => p._id === tx.objectId)
          await this.updatedDocCallback(udoc, q)
        } else if (queries[0] === tx.mixin) {
          // Mixin potentially added to object we doesn't have in out results
          const doc = await this.client.findOne(q._class, { ...q.query, _id: tx.objectId }, q.options)
          if (doc !== undefined) {
            await this.handleDocAdd(q, doc, false, docCache)
          }
        }
        await this.handleDocUpdateLookup(q, tx)
      }
    }
    return {}
  }

  protected async txCollectionCUD (
    tx: TxCollectionCUD<Doc, AttachedDoc>,
    docCache: Map<string, Doc>
  ): Promise<TxResult> {
    for (const queries of this.queries) {
      const isTx = this.client.getHierarchy().isDerived(queries[0], core.class.Tx)
      for (const q of queries[1]) {
        if (isTx) {
          // handle add since Txes are immutable
          await this.handleDocAdd(q, tx, true, docCache)
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
          await this.handleDocAdd(q, TxProcessor.createDoc2Doc(d), true, docCache)
        } else if (tx.tx._class === core.class.TxUpdateDoc) {
          await this.handleDocUpdate(q, tx.tx as unknown as TxUpdateDoc<Doc>, docCache)
        } else if (tx.tx._class === core.class.TxRemoveDoc) {
          await this.handleDocRemove(q, tx.tx as unknown as TxRemoveDoc<Doc>)
        }
      }
    }
    return {}
  }

  async txUpdateDoc (tx: TxUpdateDoc<Doc>, docCache: Map<string, Doc>): Promise<TxResult> {
    for (const queries of this.queries) {
      const isTx = this.client.getHierarchy().isDerived(queries[0], core.class.Tx)
      for (const q of queries[1]) {
        if (isTx) {
          // handle add since Txes are immutable
          await this.handleDocAdd(q, tx, true, docCache)
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
    const pos = q.result.findIndex((p) => p._id === tx.objectId)
    if (pos !== -1) {
      // If query contains search we must check use fulltext
      if (q.query.$search != null && q.query.$search.length > 0) {
        const searchRefresh = await this.checkSearch(q, tx.objectId)
        if (searchRefresh) return
      } else {
        const updatedDoc = q.result[pos]
        if (updatedDoc.modifiedOn < tx.modifiedOn) {
          await this.__updateDoc(q, updatedDoc, tx)
          const updateRefresh = await this.checkUpdatedDocMatch(q, updatedDoc)
          if (updateRefresh) return
        } else {
          const currentRefresh = await this.getCurrentDoc(q, updatedDoc._id, updatedDoc.space, docCache)
          if (currentRefresh) return
        }
      }
      await this.sort(q, tx)
      const udoc = q.result.find((p) => p._id === tx.objectId)
      await this.updatedDocCallback(udoc, q)
    } else if (await this.matchQuery(q, tx, docCache)) {
      await this.sort(q, tx)
      const udoc = q.result.find((p) => p._id === tx.objectId)
      await this.updatedDocCallback(udoc, q)
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
        await resultSort(q.result, q.options?.sort, q._class, this.getHierarchy(), this.client.getModel())
      }
      await this.callback(q)
    }
  }

  private async processLookupUpdateDoc (
    docs: Doc[],
    lookup: Lookup<Doc>,
    tx: TxUpdateDoc<Doc> | TxMixin<Doc, Doc>
  ): Promise<boolean> {
    let needCallback = false
    const lookupWays = this.getLookupWays(lookup, tx.objectClass)
    for (const lookupWay of lookupWays) {
      const [objWay, key, reverseLookupKey] = lookupWay
      for (const resDoc of docs) {
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
              } else if (index === -1 && reverseLookupValue === obj._id) {
                const doc = await this.findOne(tx.objectClass, { _id: tx.objectId })
                if (doc !== undefined) {
                  value.push(doc)
                  index = value.length - 1
                }
                needCallback = true
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
            }
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
    return this.getHierarchy().clone(results) as T[]
  }

  private async refresh (q: Query, reRequest: boolean = false): Promise<void> {
    if (q.requested !== undefined && !reRequest) {
      // we already asked for refresh, just wait.
      await q.requested
      return
    }
    if (reRequest && q.requested !== undefined) {
      await q.requested
    }
    q.requested = this.doRefresh(q)
    await q.requested
    q.requested = undefined
  }

  private async doRefresh (q: Query): Promise<void> {
    const res = await this.client.findAll(q._class, q.query, q.options)
    if (!deepEqual(res, q.result) || (res.total !== q.total && q.options?.total === true)) {
      q.result = res
      q.total = res.total
      await this.callback(q)
    }
  }

  // Check if query is partially matched.
  private async matchQuery (q: Query, tx: TxUpdateDoc<Doc>, docCache: Map<string, Doc>): Promise<boolean> {
    const clazz = this.getHierarchy().isMixin(q._class) ? this.getHierarchy().getBaseClass(q._class) : q._class
    if (!this.client.getHierarchy().isDerived(tx.objectClass, clazz)) {
      return false
    }

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
        const pos = q.result.findIndex((el) => el._id === doc._id)
        if (pos !== -1) {
          q.result[pos] = doc
          this.updateDocuments(q, [doc])
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
    for (const queries of this.queries) {
      const doc = this.client.getHierarchy().isDerived(queries[0], core.class.Tx) ? tx : docTx
      for (const q of queries[1]) {
        await this.handleDocAdd(q, doc, true, docCache)
      }
    }
    return {}
  }

  private async handleDocAdd (q: Query, doc: Doc, handleLookup = true, docCache: Map<string, Doc>): Promise<void> {
    if (this.match(q, doc, q.options?.lookup !== undefined)) {
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
        const pos = q.result.findIndex((p) => p._id === doc._id)
        if (pos >= 0) {
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
          await resultSort(q.result, q.options?.sort, q._class, this.getHierarchy(), this.client.getModel())
        }

        if (q.options?.limit !== undefined && q.result.length > q.options.limit) {
          if (q.result.pop()?._id !== doc._id || q.options?.total === true) {
            await this.callback(q)
          }
        } else {
          await this.callback(q)
        }
      }
    }

    await this.handleDocAddLookup(q, doc)
  }

  private async callback (q: Query): Promise<void> {
    if (q.result instanceof Promise) {
      q.result = await q.result
    }

    this.updateDocuments(q, q.result)

    const result = q.result
    Array.from(q.callbacks.values()).forEach((callback) => {
      callback(toFindResult(this.clone(result), q.total))
    })
  }

  private updateDocuments (q: Query, docs: Doc[], clean: boolean = false): void {
    if (q.options?.projection !== undefined) {
      return
    }
    for (const d of docs) {
      const classKey = Hierarchy.mixinOrClass(d) + ':' + JSON.stringify(q.options?.lookup ?? {})
      let docMap = this.documentRefs.get(classKey)
      if (docMap === undefined) {
        if (clean) {
          continue
        }
        docMap = new Map()
        this.documentRefs.set(classKey, docMap)
      }
      const queries = (docMap.get(d._id)?.queries ?? []).filter((it) => it !== q.id)
      if (!clean) {
        queries.push(q.id)
      }
      if (queries.length === 0) {
        docMap.delete(d._id)
      } else {
        const q = docMap.get(d._id)
        if ((q?.lastUsed ?? 0) < d.modifiedOn) {
          docMap.set(d._id, { ...(q ?? {}), doc: d, queries, lastUsed: d.modifiedOn })
        }
      }
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
        await resultSort(q.result, q.options?.sort, q._class, this.getHierarchy(), this.getModel())
      }
      await this.callback(q)
    }
  }

  private proccesLookupAddDoc (docs: Doc[], lookup: Lookup<Doc>, doc: Doc): boolean {
    let needCallback = false
    const lookupWays = this.getLookupWays(lookup, doc._class)
    for (const lookupWay of lookupWays) {
      const [objWay, key, reverseLookupKey] = lookupWay
      for (const resDoc of docs) {
        const obj = getObjectValue(objWay, resDoc)
        if (obj === undefined) continue
        const value = getObjectValue('$lookup.' + key, obj)
        if (Array.isArray(value)) {
          if (this.client.getHierarchy().isDerived(doc._class, core.class.AttachedDoc)) {
            if (reverseLookupKey !== undefined && (doc as any)[reverseLookupKey] === obj._id) {
              if ((value as Doc[]).find((p) => p._id === doc._id) === undefined) {
                value.push(doc)
                needCallback = true
              }
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

  protected async txRemoveDoc (tx: TxRemoveDoc<Doc>, docCache: Map<string, Doc>): Promise<TxResult> {
    for (const queries of this.queries) {
      const isTx = this.client.getHierarchy().isDerived(queries[0], core.class.Tx)
      for (const q of queries[1]) {
        if (isTx) {
          // handle add since Txes are immutable
          await this.handleDocAdd(q, tx, true, docCache)
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
    if (
      q.options?.limit !== undefined &&
      q.options.limit === q.result.length &&
      h.isDerived(q._class, tx.objectClass)
    ) {
      await this.refresh(q)
      return
    }
    const index = q.result.findIndex((p) => p._id === tx.objectId && h.isDerived(p._class, tx.objectClass))
    if (index > -1) {
      const doc = q.result.splice(index, 1)
      this.updateDocuments(q, doc, true)

      if (q.options?.total === true) {
        q.total--
      }
      await this.callback(q)
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
        await resultSort(q.result, q.options?.sort, q._class, this.getHierarchy(), this.getModel())
      }
      await this.callback(q)
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
      case core.class.TxCollectionCUD:
        return await this.txCollectionCUD(tx as TxCollectionCUD<Doc, AttachedDoc>, docCache)
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
        await this.checkUpdateEvents(tx as TxWorkspaceEvent)
        await this.changePrivateHandler(tx as TxWorkspaceEvent)
      }
      result.push(await this._tx(tx, docCache))
    }
    return result
  }

  triggerCounter = 0
  searchTriggerTimer: any

  private async checkUpdateEvents (evt: TxWorkspaceEvent, trigger = true): Promise<void> {
    clearTimeout(this.searchTriggerTimer)

    // We need to add trigger once more, since elastic could have a huge lag with document availability.
    if (trigger || this.triggerCounter > 0) {
      if (trigger) {
        this.triggerCounter = 5 // Schedule 5 refreshes on every 5 seconds.
      }
      setTimeout(() => {
        this.triggerCounter--
        void this.checkUpdateEvents(evt, false)
      }, 5000)
    }

    const h = this.client.getHierarchy()
    function hasClass (q: Query, classes: Ref<Class<Doc>>[]): boolean {
      return classes.includes(q._class) || classes.some((it) => h.isDerived(q._class, it) || h.isDerived(it, q._class))
    }
    if (evt.event === WorkspaceEvent.IndexingUpdate) {
      const indexingParam = evt.params as IndexingUpdateEvent
      for (const q of [...this.queue]) {
        if (hasClass(q, indexingParam._class) && q.query.$search !== undefined) {
          if (!this.removeFromQueue(q)) {
            try {
              await this.refresh(q, true)
            } catch (err: any) {
              Analytics.handleError(err)
              console.error(err)
            }
          }
        }
      }
      for (const v of this.queries.values()) {
        for (const q of v) {
          if (hasClass(q, indexingParam._class) && q.query.$search !== undefined) {
            try {
              await this.refresh(q, true)
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
      for (const q of [...this.queue]) {
        if (hasClass(q, params._class)) {
          if (!this.removeFromQueue(q)) {
            try {
              await this.refresh(q, true)
            } catch (err: any) {
              Analytics.handleError(err)
              console.error(err)
            }
          }
        }
      }
      for (const v of this.queries.values()) {
        for (const q of v) {
          if (hasClass(q, params._class)) {
            try {
              await this.refresh(q, true)
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
      for (const q of [...this.queue]) {
        if (typeof q.query.space !== 'string') {
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
        for (const q of v) {
          if (typeof q.query.space !== 'string') {
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
                    pp[pkey].push()
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

    if (needSort) await resultSort(q.result as Doc[], sort, q._class, this.getHierarchy(), this.client.getModel())
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

  private async updatedDocCallback (updatedDoc: Doc | undefined, q: Query): Promise<void> {
    q.result = q.result as Doc[]

    if (q.options?.limit !== undefined && q.result.length > q.options.limit) {
      if (updatedDoc === undefined) {
        await this.refresh(q)
        return
      }
      if (q.result[q.options?.limit]._id === updatedDoc._id) {
        await this.refresh(q)
        return
      }
      if (q.result.pop()?._id !== updatedDoc._id) {
        await this.callback(q)
      }
    } else {
      await this.callback(q)
    }
  }
}

function getNestedLookup (lookup: Ref<Class<Doc>> | [Ref<Class<Doc>>, Lookup<Doc>]): Lookup<Doc> | undefined {
  return Array.isArray(lookup) ? lookup[1] : undefined
}

function getLookupClass (lookup: Ref<Class<Doc>> | [Ref<Class<Doc>>, Lookup<Doc>]): Ref<Class<Doc>> {
  return Array.isArray(lookup) ? lookup[0] : lookup
}
