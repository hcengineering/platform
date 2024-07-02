//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  ClassifierKind,
  DOMAIN_MODEL,
  DOMAIN_TRANSIENT,
  DOMAIN_TX,
  TxFactory,
  TxProcessor,
  cutObjectArray,
  toFindResult,
  type Branding,
  type Account,
  type AttachedDoc,
  type Class,
  type Client,
  type Collection,
  type Doc,
  type DocumentQuery,
  type DocumentUpdate,
  type Domain,
  type FindOptions,
  type FindResult,
  type Hierarchy,
  type LoadModelResponse,
  type MeasureContext,
  type Mixin,
  type ModelDb,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type SessionOperationContext,
  type StorageIterator,
  type Timestamp,
  type Tx,
  type TxApplyIf,
  type TxCUD,
  type TxCollectionCUD,
  type TxRemoveDoc,
  type TxResult,
  type TxUpdateDoc,
  type WorkspaceIdWithUrl
} from '@hcengineering/core'
import { getResource, type Metadata } from '@hcengineering/platform'
import { LiveQuery as LQ } from '@hcengineering/query'
import crypto from 'node:crypto'
import { type DbAdapter, type DomainHelper } from '../adapter'
import { type FullTextIndex } from '../fulltext'
import { DummyDbAdapter } from '../mem'
import serverCore from '../plugin'
import { type ServiceAdaptersManager } from '../service'
import { type StorageAdapter } from '../storage'
import { type Triggers } from '../triggers'
import type {
  FullTextAdapter,
  ObjectDDParticipant,
  ServerStorage,
  ServerStorageOptions,
  SessionContext,
  TriggerControl
} from '../types'
import { SessionContextImpl, createBroadcastEvent } from '../utils'

export class TServerStorage implements ServerStorage {
  private readonly fulltext: FullTextIndex
  hierarchy: Hierarchy

  scopes = new Map<string, Promise<any>>()

  hashes!: string[]

  triggerData = new Map<Metadata<any>, any>()

  liveQuery: LQ
  branding: Branding | null

  domainInfo = new Map<
  Domain,
  {
    exists: boolean
    checkPromise: Promise<boolean>
    lastCheck: number
  }
  >()

  emptyAdapter = new DummyDbAdapter()

  constructor (
    private readonly _domains: Record<string, string>,
    private readonly defaultAdapter: string,
    private readonly adapters: Map<string, DbAdapter>,
    hierarchy: Hierarchy,
    private readonly triggers: Triggers,
    private readonly fulltextAdapter: FullTextAdapter,
    readonly storageAdapter: StorageAdapter,
    private readonly serviceAdaptersManager: ServiceAdaptersManager,
    readonly modelDb: ModelDb,
    readonly workspaceId: WorkspaceIdWithUrl,
    readonly indexFactory: (storage: ServerStorage) => FullTextIndex,
    readonly options: ServerStorageOptions,
    readonly metrics: MeasureContext,
    readonly model: Tx[],
    readonly domainHelper: DomainHelper
  ) {
    this.liveQuery = new LQ(this.newCastClient(hierarchy, modelDb, metrics))
    this.hierarchy = hierarchy
    this.fulltext = indexFactory(this)
    this.branding = options.branding

    this.setModel(model)
  }

  private newCastClient (hierarchy: Hierarchy, modelDb: ModelDb, metrics: MeasureContext): Client {
    return {
      getHierarchy (): Hierarchy {
        return hierarchy
      },
      getModel (): ModelDb {
        return modelDb
      },
      close: async () => {},
      findAll: async (_class, query, options) => {
        return await metrics.with('query', {}, async (ctx) => {
          const results = await this.findAll(ctx, _class, query, options)
          return toFindResult(
            results.map((v) => {
              return this.hierarchy.updateLookupMixin(_class, v, options)
            }),
            results.total
          )
        })
      },
      findOne: async (_class, query, options) => {
        return (
          await metrics.with('query', {}, async (ctx) => {
            const results = await this.findAll(ctx, _class, query, { ...options, limit: 1 })
            return toFindResult(
              results.map((v) => {
                return this.hierarchy.updateLookupMixin(_class, v, options)
              }),
              results.total
            )
          })
        )[0]
      },
      tx: async (tx) => {
        return {}
      },
      searchFulltext: async (query: SearchQuery, options: SearchOptions) => {
        return await metrics.with('query', {}, async (ctx) => await this.searchFulltext(ctx, query, options))
      }
    }
  }

  async close (): Promise<void> {
    await this.fulltext.close()
    for (const [domain, info] of this.domainInfo.entries()) {
      if (info.checkPromise !== undefined) {
        console.log('wait for check domain', domain)
        // We need to be sure we wait for check to be complete
        await info.checkPromise
      }
    }
    for (const o of this.adapters.values()) {
      await o.close()
    }
    await this.fulltextAdapter.close()
    await this.serviceAdaptersManager.close()
  }

  private getAdapter (domain: Domain, requireExists: boolean): DbAdapter {
    const name = this._domains[domain] ?? this.defaultAdapter
    const adapter = this.adapters.get(name)
    if (adapter === undefined) {
      throw new Error('adapter not provided: ' + name)
    }

    const helper = adapter.helper?.()
    if (helper !== undefined) {
      let info = this.domainInfo.get(domain)
      if (info == null || Date.now() - info.lastCheck > 5 * 60 * 1000) {
        // Re-check every 5 minutes
        const exists = helper.exists(domain)
        // We will create necessary indexes if required, and not touch collection if not required.
        info = {
          exists,
          lastCheck: Date.now(),
          checkPromise: this.domainHelper.checkDomain(this.metrics, domain, requireExists, helper)
        }
        this.domainInfo.set(domain, info)
      }
      if (!info.exists && !requireExists) {
        return this.emptyAdapter
      }
      // If we require it exists, it will be exists
      info.exists = true
    }

    return adapter
  }

  private async routeTx (ctx: MeasureContext, removedDocs: Map<Ref<Doc>, Doc>, ...txes: Tx[]): Promise<TxResult[]> {
    let part: TxCUD<Doc>[] = []
    let lastDomain: Domain | undefined
    const result: TxResult[] = []
    const processPart = async (): Promise<void> => {
      if (part.length > 0) {
        // Find all deleted documents

        const adapter = this.getAdapter(lastDomain as Domain, true)
        const toDelete = part.filter((it) => it._class === core.class.TxRemoveDoc).map((it) => it.objectId)

        if (toDelete.length > 0) {
          const toDeleteDocs = await ctx.with(
            'adapter-load',
            { domain: lastDomain },
            async () => await adapter.load(ctx, lastDomain as Domain, toDelete)
          )

          for (const ddoc of toDeleteDocs) {
            removedDocs.set(ddoc._id, ddoc)
          }
        }

        const r = await ctx.with('adapter-tx', { domain: lastDomain }, async (ctx) => await adapter.tx(ctx, ...part))

        // Update server live queries.
        await this.liveQuery.tx(...part)
        if (Array.isArray(r)) {
          result.push(...r)
        } else {
          result.push(r)
        }
        part = []
      }
    }
    for (const tx of txes) {
      const txCUD = TxProcessor.extractTx(tx) as TxCUD<Doc>
      if (!this.hierarchy.isDerived(txCUD._class, core.class.TxCUD)) {
        // Skip unsupported tx
        ctx.error('Unsupported transaction', tx)
        continue
      }
      const domain = this.hierarchy.getDomain(txCUD.objectClass)
      if (part.length > 0) {
        if (lastDomain !== domain) {
          await processPart()
        }
        lastDomain = domain
        part.push(txCUD)
      } else {
        lastDomain = domain
        part.push(txCUD)
      }
    }
    await processPart()
    return result
  }

  private async getCollectionUpdateTx<D extends Doc>(
    _id: Ref<D>,
    _class: Ref<Class<D>>,
    modifiedBy: Ref<Account>,
    modifiedOn: number,
    attachedTo: D,
    update: DocumentUpdate<D>
  ): Promise<Tx> {
    const txFactory = new TxFactory(modifiedBy, true)
    const baseClass = this.hierarchy.getBaseClass(_class)
    if (baseClass !== _class) {
      // Mixin operation is required.
      const tx = txFactory.createTxMixin(_id, attachedTo._class, attachedTo.space, _class, update)
      tx.modifiedOn = modifiedOn

      return tx
    } else {
      const tx = txFactory.createTxUpdateDoc(_class, attachedTo.space, _id, update)
      tx.modifiedOn = modifiedOn

      return tx
    }
  }

  private async updateCollection (ctx: MeasureContext, tx: Tx, findAll: ServerStorage['findAll']): Promise<Tx[]> {
    if (tx._class !== core.class.TxCollectionCUD) {
      return []
    }

    const colTx = tx as TxCollectionCUD<Doc, AttachedDoc>
    const _id = colTx.objectId
    const _class = colTx.objectClass
    const { operations } = colTx.tx as TxUpdateDoc<AttachedDoc>

    if (
      colTx.tx._class !== core.class.TxUpdateDoc ||
      this.hierarchy.getDomain(_class) === DOMAIN_MODEL // We could not update increments for model classes
    ) {
      return []
    }

    if (operations?.attachedTo === undefined || operations.attachedTo === _id) {
      return []
    }

    const oldAttachedTo = (await findAll(ctx, _class, { _id }, { limit: 1 }))[0]
    let oldTx: Tx | null = null
    if (oldAttachedTo !== undefined) {
      const attr = this.hierarchy.findAttribute(oldAttachedTo._class, colTx.collection)

      if (attr !== undefined) {
        oldTx = await this.getCollectionUpdateTx(_id, _class, tx.modifiedBy, colTx.modifiedOn, oldAttachedTo, {
          $inc: { [colTx.collection]: -1 }
        })
      }
    }

    const newAttachedToClass = operations.attachedToClass ?? _class
    const newAttachedToCollection = operations.collection ?? colTx.collection
    const newAttachedTo = (await findAll(ctx, newAttachedToClass, { _id: operations.attachedTo }, { limit: 1 }))[0]
    let newTx: Tx | null = null
    const newAttr = this.hierarchy.findAttribute(newAttachedToClass, newAttachedToCollection)
    if (newAttachedTo !== undefined && newAttr !== undefined) {
      newTx = await this.getCollectionUpdateTx(
        newAttachedTo._id,
        newAttachedTo._class,
        tx.modifiedBy,
        colTx.modifiedOn,
        newAttachedTo,
        { $inc: { [newAttachedToCollection]: 1 } }
      )
    }

    return [...(oldTx !== null ? [oldTx] : []), ...(newTx !== null ? [newTx] : [])]
  }

  private async processCollection (
    ctx: MeasureContext,
    txes: Tx[],
    findAll: ServerStorage['findAll'],
    removedMap: Map<Ref<Doc>, Doc>
  ): Promise<Tx[]> {
    const result: Tx[] = []
    for (const tx of txes) {
      if (tx._class === core.class.TxCollectionCUD) {
        const colTx = tx as TxCollectionCUD<Doc, AttachedDoc>
        const _id = colTx.objectId
        const _class = colTx.objectClass

        // Skip model operations
        if (this.hierarchy.getDomain(_class) === DOMAIN_MODEL) {
          // We could not update increments for model classes
          continue
        }

        const isCreateTx = colTx.tx._class === core.class.TxCreateDoc
        const isDeleteTx = colTx.tx._class === core.class.TxRemoveDoc
        const isUpdateTx = colTx.tx._class === core.class.TxUpdateDoc
        if (isUpdateTx) {
          result.push(...(await this.updateCollection(ctx, tx, findAll)))
        }

        if ((isCreateTx || isDeleteTx) && !removedMap.has(_id)) {
          const attachedTo = (await findAll(ctx, _class, { _id }, { limit: 1 }))[0]
          if (attachedTo !== undefined) {
            result.push(
              await this.getCollectionUpdateTx(_id, _class, tx.modifiedBy, colTx.modifiedOn, attachedTo, {
                $inc: { [colTx.collection]: isCreateTx ? 1 : -1 }
              })
            )
          }
        }
      }
    }
    return result
  }

  private addModelTx (tx: Tx): void {
    this.model.push(tx)
    const h = crypto.createHash('sha1')
    h.update(this.hashes[this.hashes.length - 1])
    h.update(JSON.stringify(tx))
    this.hashes.push(h.digest('hex'))
  }

  private setModel (model: Tx[]): void {
    let prev = ''
    this.hashes = model.map((it) => {
      const h = crypto.createHash('sha1')
      h.update(prev)
      h.update(JSON.stringify(it))
      prev = h.digest('hex')
      return prev
    })
  }

  async loadModel (lastModelTx: Timestamp, hash?: string): Promise<Tx[] | LoadModelResponse> {
    if (hash !== undefined) {
      const pos = this.hashes.indexOf(hash)
      if (pos >= 0) {
        return {
          full: false,
          hash: this.hashes[this.hashes.length - 1],
          transactions: this.model.slice(pos + 1)
        }
      }
      return {
        full: true,
        hash: this.hashes[this.hashes.length - 1],
        transactions: [...this.model]
      }
    }
    return this.model.filter((it) => it.modifiedOn > lastModelTx)
  }

  async findAll<T extends Doc>(
    ctx: MeasureContext,
    clazz: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T> & {
      domain?: Domain // Allow to find for Doc's in specified domain only.
      prefix?: string
    }
  ): Promise<FindResult<T>> {
    const p = options?.prefix ?? 'client'
    const domain = options?.domain ?? this.hierarchy.getDomain(clazz)
    if (query?.$search !== undefined) {
      return await ctx.with(p + '-fulltext-find-all', {}, (ctx) => this.fulltext.findAll(ctx, clazz, query, options))
    }
    const st = Date.now()
    const result = await ctx.with(
      p + '-find-all',
      { _class: clazz },
      (ctx) => {
        return this.getAdapter(domain, false).findAll(ctx, clazz, query, options)
      },
      { clazz, query, options }
    )
    if (Date.now() - st > 1000) {
      ctx.error('FindAll', { time: Date.now() - st, clazz, query: cutObjectArray(query), options })
    }
    return result
  }

  async searchFulltext (ctx: MeasureContext, query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    return await ctx.with('full-text-search', {}, (ctx) => {
      return this.fulltext.searchFulltext(ctx, query, options)
    })
  }

  private getParentClass (_class: Ref<Class<Doc>>): Ref<Class<Doc>> {
    const baseDomain = this.hierarchy.getDomain(_class)
    const ancestors = this.hierarchy.getAncestors(_class)
    let result: Ref<Class<Doc>> = _class
    for (const ancestor of ancestors) {
      try {
        const domain = this.hierarchy.getClass(ancestor).domain
        if (domain === baseDomain) {
          result = ancestor
        }
      } catch {}
    }
    return result
  }

  private getMixins (_class: Ref<Class<Doc>>, object: Doc): Array<Ref<Mixin<Doc>>> {
    const parentClass = this.getParentClass(_class)
    const descendants = this.hierarchy.getDescendants(parentClass)
    return descendants.filter(
      (m) => this.hierarchy.getClass(m).kind === ClassifierKind.MIXIN && this.hierarchy.hasMixin(object, m)
    )
  }

  private async processRemove (
    ctx: MeasureContext,
    txes: Tx[],
    findAll: ServerStorage['findAll'],
    removedMap: Map<Ref<Doc>, Doc>
  ): Promise<Tx[]> {
    const result: Tx[] = []

    for (const tx of txes) {
      const actualTx = TxProcessor.extractTx(tx)
      if (!this.hierarchy.isDerived(actualTx._class, core.class.TxRemoveDoc)) {
        continue
      }
      const rtx = actualTx as TxRemoveDoc<Doc>
      const object = removedMap.get(rtx.objectId)
      if (object === undefined) {
        continue
      }
      result.push(...(await this.deleteClassCollections(ctx, object._class, rtx.objectId, findAll, removedMap)))
      const mixins = this.getMixins(object._class, object)
      for (const mixin of mixins) {
        result.push(
          ...(await this.deleteClassCollections(ctx, mixin, rtx.objectId, findAll, removedMap, object._class))
        )
      }

      result.push(...(await this.deleteRelatedDocuments(ctx, object, findAll, removedMap)))
    }
    return result
  }

  private async deleteClassCollections (
    ctx: MeasureContext,
    _class: Ref<Class<Doc>>,
    objectId: Ref<Doc>,
    findAll: ServerStorage['findAll'],
    removedMap: Map<Ref<Doc>, Doc>,
    to?: Ref<Class<Doc>>
  ): Promise<Tx[]> {
    const attributes = this.hierarchy.getAllAttributes(_class, to)
    const result: Tx[] = []
    for (const attribute of attributes) {
      if (this.hierarchy.isDerived(attribute[1].type._class, core.class.Collection)) {
        const collection = attribute[1].type as Collection<AttachedDoc>
        const allAttached = await findAll(ctx, collection.of, { attachedTo: objectId })
        for (const attached of allAttached) {
          result.push(...this.deleteObject(ctx, attached, removedMap))
        }
      }
    }
    return result
  }

  private deleteObject (ctx: MeasureContext, object: Doc, removedMap: Map<Ref<Doc>, Doc>): Tx[] {
    const result: Tx[] = []
    const factory = new TxFactory(object.modifiedBy, true)
    if (this.hierarchy.isDerived(object._class, core.class.AttachedDoc)) {
      const adoc = object as AttachedDoc
      const nestedTx = factory.createTxRemoveDoc(adoc._class, adoc.space, adoc._id)
      const tx = factory.createTxCollectionCUD(
        adoc.attachedToClass,
        adoc.attachedTo,
        adoc.space,
        adoc.collection,
        nestedTx
      )
      removedMap.set(adoc._id, adoc)
      result.push(tx)
    } else {
      result.push(factory.createTxRemoveDoc(object._class, object.space, object._id))
      removedMap.set(object._id, object)
    }
    return result
  }

  private async deleteRelatedDocuments (
    ctx: MeasureContext,
    object: Doc,
    findAll: ServerStorage['findAll'],
    removedMap: Map<Ref<Doc>, Doc>
  ): Promise<Tx[]> {
    const result: Tx[] = []
    const objectClass = this.hierarchy.getClass(object._class)
    if (this.hierarchy.hasMixin(objectClass, serverCore.mixin.ObjectDDParticipant)) {
      const removeParticipand: ObjectDDParticipant = this.hierarchy.as(
        objectClass,
        serverCore.mixin.ObjectDDParticipant
      )
      const collector = await getResource(removeParticipand.collectDocs)
      const docs = await collector(object, this.hierarchy, async (_class, query, options) => {
        return await findAll(ctx, _class, query, options)
      })
      for (const d of docs) {
        result.push(...this.deleteObject(ctx, d, removedMap))
      }
    }
    return result
  }

  private async processMove (ctx: MeasureContext, txes: Tx[], findAll: ServerStorage['findAll']): Promise<Tx[]> {
    const result: Tx[] = []
    for (const tx of txes) {
      const actualTx = TxProcessor.extractTx(tx)
      if (!this.hierarchy.isDerived(actualTx._class, core.class.TxUpdateDoc)) {
        continue
      }
      const rtx = actualTx as TxUpdateDoc<Doc>
      if (rtx.operations.space === undefined || rtx.operations.space === rtx.objectSpace) {
        continue
      }
      const factory = new TxFactory(tx.modifiedBy, true)
      for (const [, attribute] of this.hierarchy.getAllAttributes(rtx.objectClass)) {
        if (!this.hierarchy.isDerived(attribute.type._class, core.class.Collection)) {
          continue
        }
        const collection = attribute.type as Collection<AttachedDoc>
        const allAttached = await findAll(ctx, collection.of, { attachedTo: rtx.objectId, space: rtx.objectSpace })
        const allTx = allAttached.map(({ _class, space, _id }) =>
          factory.createTxUpdateDoc(_class, space, _id, { space: rtx.operations.space })
        )
        result.push(...allTx)
      }
    }
    return result
  }

  private async broadcastCtx (derived: SessionOperationContext['derived']): Promise<void> {
    const toSendTarget = new Map<string, Tx[]>()

    const getTxes = (key: string): Tx[] => {
      let txes = toSendTarget.get(key)
      if (txes === undefined) {
        txes = []
        toSendTarget.set(key, txes)
      }
      return txes
    }

    // Put current user as send target
    for (const txd of derived) {
      if (txd.target === undefined) {
        getTxes('') // Be sure we have empty one

        // Also add to all other targeted sends
        for (const v of toSendTarget.values()) {
          v.push(...txd.derived)
        }
      } else {
        for (const t of txd.target) {
          getTxes(t).push(...txd.derived)
        }
      }
    }

    const sendWithPart = async (
      derived: Tx[],
      target: string | undefined,
      exclude: string[] | undefined
    ): Promise<void> => {
      const classes = new Set<Ref<Class<Doc>>>()
      for (const dtx of derived) {
        if (this.hierarchy.isDerived(dtx._class, core.class.TxCUD)) {
          classes.add((dtx as TxCUD<Doc>).objectClass)
        }
        const etx = TxProcessor.extractTx(dtx)
        if (this.hierarchy.isDerived(etx._class, core.class.TxCUD)) {
          classes.add((etx as TxCUD<Doc>).objectClass)
        }
      }
      console.log('Broadcasting compact bulk', derived.length)
      const bevent = createBroadcastEvent(Array.from(classes))
      this.options.broadcast([bevent], target, exclude)
    }

    const handleSend = async (derived: Tx[], target?: string, exclude?: string[]): Promise<void> => {
      if (derived.length === 0) {
        return
      }

      if (derived.length > 10000) {
        await sendWithPart(derived, target, exclude)
      } else {
        // Let's send after our response will go out
        console.log('Broadcasting', derived.length, derived.length)
        this.options.broadcast(derived, target, exclude)
      }
    }

    const toSendAll = toSendTarget.get('') ?? []
    toSendTarget.delete('')

    // Then send targeted and all other
    for (const [k, v] of toSendTarget.entries()) {
      void handleSend(v, k)
    }
    // Send all other except us.
    void handleSend(toSendAll, undefined, Array.from(toSendTarget.keys()))
  }

  private async processDerived (
    ctx: SessionOperationContext,
    txes: Tx[],
    findAll: ServerStorage['findAll'],
    removedMap: Map<Ref<Doc>, Doc>
  ): Promise<Tx[]> {
    const fAll =
      (mctx: MeasureContext) =>
      <T extends Doc>(
          clazz: Ref<Class<T>>,
          query: DocumentQuery<T>,
          options?: FindOptions<T>
        ): Promise<FindResult<T>> =>
          findAll(mctx, clazz, query, options)

    const removed = await ctx.with('process-remove', {}, (ctx) =>
      this.processRemove(ctx.ctx, txes, findAll, removedMap)
    )
    const collections = await ctx.with('process-collection', {}, (ctx) =>
      this.processCollection(ctx.ctx, txes, findAll, removedMap)
    )
    const moves = await ctx.with('process-move', {}, (ctx) => this.processMove(ctx.ctx, txes, findAll))

    const triggerControl: Omit<TriggerControl, 'txFactory' | 'ctx' | 'result'> = {
      operationContext: ctx,
      removedMap,
      workspace: this.workspaceId,
      branding: this.options.branding,
      storageAdapter: this.storageAdapter,
      serviceAdaptersManager: this.serviceAdaptersManager,
      findAll: fAll(ctx.ctx),
      findAllCtx: findAll,
      modelDb: this.modelDb,
      hierarchy: this.hierarchy,
      apply: async (tx, broadcast, target) => {
        return await this.apply(ctx, tx, broadcast, target)
      },
      applyCtx: async (ctx, tx, broadcast, target) => {
        return await this.apply(ctx, tx, broadcast, target)
      },
      // Will create a live query if missing and return values immediately if already asked.
      queryFind: async (_class, query, options) => {
        return await this.liveQuery.queryFind(_class, query, options)
      }
    }
    const triggers = await ctx.with('process-triggers', {}, async (ctx) => {
      const result: Tx[] = []
      const { transactions, performAsync } = await this.triggers.apply(ctx, txes, {
        ...triggerControl,
        ctx: ctx.ctx,
        findAll: fAll(ctx.ctx),
        result
      })
      result.push(...transactions)

      if (performAsync !== undefined) {
        const asyncTriggerProcessor = async (): Promise<void> => {
          await ctx.with('process-async-triggers', {}, async (ctx) => {
            const sctx = ctx as SessionContext
            const applyCtx: SessionContextImpl = new SessionContextImpl(
              ctx.ctx,
              sctx.userEmail,
              sctx.sessionId,
              sctx.admin,
              [],
              this.workspaceId,
              this.options.branding
            )
            const result = await performAsync(applyCtx)
            // We need to broadcast changes
            await this.broadcastCtx([{ derived: result }, ...applyCtx.derived])
          })
        }
        setTimeout(() => {
          void asyncTriggerProcessor()
        })
      }

      return result
    })

    const derived = [...removed, ...collections, ...moves, ...triggers]

    return await this.processDerivedTxes(derived, ctx, findAll, removedMap)
  }

  private async processDerivedTxes (
    derived: Tx[],
    ctx: SessionOperationContext,
    findAll: ServerStorage['findAll'],
    removedMap: Map<Ref<Doc>, Doc>
  ): Promise<Tx[]> {
    derived.sort((a, b) => a.modifiedOn - b.modifiedOn)

    await ctx.with('derived-route-tx', {}, (ctx) => this.routeTx(ctx.ctx, removedMap, ...derived))

    const nestedTxes: Tx[] = []
    if (derived.length > 0) {
      nestedTxes.push(...(await this.processDerived(ctx, derived, findAll, removedMap)))
    }

    const res = [...derived, ...nestedTxes]

    return res
  }

  /**
   * Verify if apply if is possible to apply.
   */
  async verifyApplyIf (
    ctx: MeasureContext,
    applyIf: TxApplyIf,
    findAll: ServerStorage['findAll']
  ): Promise<{
      onEnd: () => void
      passed: boolean
    }> {
    // Wait for synchronized.
    ;(await this.scopes.get(applyIf.scope)) ?? Promise.resolve()
    let onEnd = (): void => {}
    // Put sync code
    this.scopes.set(
      applyIf.scope,
      new Promise((resolve) => {
        onEnd = () => {
          this.scopes.delete(applyIf.scope)
          resolve(null)
        }
      })
    )
    let passed = true
    for (const { _class, query } of applyIf.match) {
      const res = await findAll(ctx, _class, query, { limit: 1 })
      if (res.length === 0) {
        passed = false
        break
      }
    }
    if (passed) {
      for (const { _class, query } of applyIf.notMatch) {
        const res = await findAll(ctx, _class, query, { limit: 1 })
        if (res.length > 0) {
          passed = false
          break
        }
      }
    }
    return { passed, onEnd }
  }

  async apply (ctx: SessionOperationContext, txes: Tx[], broadcast: boolean, target?: string[]): Promise<TxResult> {
    return await this.processTxes(ctx, txes, broadcast, target)
  }

  fillTxes (txes: Tx[], txToStore: Tx[], modelTx: Tx[], txToProcess: Tx[], applyTxes: Tx[]): void {
    for (const tx of txes) {
      if (!this.hierarchy.isDerived(tx._class, core.class.TxApplyIf)) {
        if (tx.space !== core.space.DerivedTx) {
          if (this.hierarchy.isDerived(tx._class, core.class.TxCUD)) {
            if (this.hierarchy.findDomain((tx as TxCUD<Doc>).objectClass) !== DOMAIN_TRANSIENT) {
              txToStore.push(tx)
            }
          } else {
            txToStore.push(tx)
          }
        }
        if (tx.objectSpace === core.space.Model) {
          modelTx.push(tx)
        }
        txToProcess.push(tx)
      } else {
        applyTxes.push(tx)
      }
    }
  }

  async processTxes (
    ctx: SessionOperationContext,
    txes: Tx[],
    broadcast: boolean,
    target?: string[]
  ): Promise<TxResult> {
    // store tx
    const _findAll: ServerStorage['findAll'] = async <T extends Doc>(
      ctx: MeasureContext,
      clazz: Ref<Class<T>>,
      query: DocumentQuery<T>,
      options?: FindOptions<T>
    ): Promise<FindResult<T>> => {
      return await this.findAll(ctx, clazz, query, { ...options, prefix: 'server' })
    }
    const txToStore: Tx[] = []
    const modelTx: Tx[] = []
    const applyTxes: Tx[] = []
    const txToProcess: Tx[] = []
    const removedMap = new Map<Ref<Doc>, Doc>()
    const onEnds: (() => void)[] = []
    const result: TxResult[] = []
    const derived: Tx[] = [...txes].filter((it) => it._class !== core.class.TxApplyIf)

    try {
      this.fillTxes(txes, txToStore, modelTx, txToProcess, applyTxes)
      for (const tx of applyTxes) {
        const applyIf = tx as TxApplyIf
        // Wait for scope promise if found
        const passed = await this.verifyApplyIf(ctx.ctx, applyIf, _findAll)
        onEnds.push(passed.onEnd)
        if (passed.passed) {
          result.push({
            derived: [],
            success: true
          })
          this.fillTxes(applyIf.txes, txToStore, modelTx, txToProcess, applyTxes)
          derived.push(...applyIf.txes)
        } else {
          result.push({
            derived: [],
            success: false
          })
        }
      }
      for (const tx of modelTx) {
        this.addModelTx(tx)

        // maintain hierarchy and triggers
        this.hierarchy.tx(tx)
        await this.triggers.tx(tx)
        await this.modelDb.tx(tx)
      }
      await ctx.with('domain-tx', {}, async (ctx) => await this.getAdapter(DOMAIN_TX, true).tx(ctx.ctx, ...txToStore))
      result.push(...(await ctx.with('apply', {}, (ctx) => this.routeTx(ctx.ctx, removedMap, ...txToProcess))))

      // invoke triggers and store derived objects
      derived.push(...(await this.processDerived(ctx, txToProcess, _findAll, removedMap)))

      // index object
      await ctx.with('fulltext-tx', {}, async (ctx) => {
        await this.fulltext.tx(ctx.ctx, [...txToProcess, ...derived])
      })
    } catch (err: any) {
      ctx.ctx.error('error process tx', { error: err })
      Analytics.handleError(err)
      throw err
    } finally {
      onEnds.forEach((p) => {
        p()
      })
    }
    if (derived.length > 0 && broadcast) {
      ctx.derived.push({ derived, target })
    }
    return result[0]
  }

  async tx (ctx: SessionOperationContext, tx: Tx): Promise<TxResult> {
    return await ctx.with('client-tx', { _class: tx._class }, async (ctx) => {
      return await this.processTxes(ctx, [tx], true)
    })
  }

  find (ctx: MeasureContext, domain: Domain, recheck?: boolean): StorageIterator {
    return this.getAdapter(domain, false).find(ctx, domain, recheck)
  }

  async load (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return await this.getAdapter(domain, false).load(ctx, domain, docs)
  }

  async upload (ctx: MeasureContext, domain: Domain, docs: Doc[]): Promise<void> {
    await this.getAdapter(domain, true).upload(ctx, domain, docs)
  }

  async clean (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    await this.getAdapter(domain, true).clean(ctx, domain, docs)
  }
}
