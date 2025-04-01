//
// Copyright © 2024 Hardcore Engineering Inc.
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
  type Account,
  type AttachedDoc,
  type Class,
  ClassifierKind,
  type Collection,
  DOMAIN_MODEL,
  type Doc,
  type DocumentUpdate,
  type LowLevelStorage,
  type MeasureContext,
  type Mixin,
  type Ref,
  type SessionData,
  type Tx,
  TxCUD,
  TxFactory,
  type TxRemoveDoc,
  type TxUpdateDoc,
  addOperation,
  toFindResult,
  withContext
} from '@hcengineering/core'
import { PlatformError, getResource, unknownError } from '@hcengineering/platform'
import type {
  Middleware,
  ObjectDDParticipant,
  PipelineContext,
  ServerFindOptions,
  ServiceAdaptersManager,
  StorageAdapter,
  TriggerControl,
  TxMiddlewareResult
} from '@hcengineering/server-core'
import serverCore, { BaseMiddleware, SessionDataImpl, SessionFindAll, Triggers } from '@hcengineering/server-core'
import { filterBroadcastOnly } from './utils'

/**
 * @public
 */
export class TriggersMiddleware extends BaseMiddleware implements Middleware {
  triggers: Triggers
  storageAdapter!: StorageAdapter
  cache = new Map<string, any>()
  intervalId: NodeJS.Timeout

  constructor (context: PipelineContext, next: Middleware | undefined) {
    super(context, next)
    this.triggers = new Triggers(this.context.hierarchy)
    this.intervalId = setInterval(
      () => {
        this.cache.clear()
      },
      30 * 60 * 1000
    )
  }

  async close (): Promise<void> {
    clearInterval(this.intervalId)
  }

  static async create (ctx: MeasureContext, context: PipelineContext, next?: Middleware): Promise<Middleware> {
    // we need to init triggers from model first.
    const triggers = new TriggersMiddleware(context, next)
    await triggers.init(ctx)
    return triggers
  }

  async init (ctx: MeasureContext): Promise<void> {
    if (this.context.storageAdapter == null) {
      throw new PlatformError(unknownError('Storage adapter should be specified'))
    }
    if (this.context.lowLevelStorage == null) {
      throw new PlatformError(unknownError('Low level storage should be specified'))
    }
    this.storageAdapter = this.context.storageAdapter
    this.triggers.init(this.context.modelDb)
  }

  async tx (ctx: MeasureContext, tx: Tx[]): Promise<TxMiddlewareResult> {
    await this.triggers.tx(tx)
    const result = await this.provideTx(ctx, tx)

    const ftx = filterBroadcastOnly(tx, this.context.hierarchy)
    if (ftx.length > 0) {
      await this.processDerived(ctx, ftx)
    }
    return result
  }

  private async processDerived (ctx: MeasureContext<SessionData>, txes: Tx[]): Promise<void> {
    const findAll: SessionFindAll = async (ctx, _class, query, options) => {
      const _ctx: MeasureContext = (options as ServerFindOptions<Doc>)?.ctx ?? ctx
      delete (options as ServerFindOptions<Doc>)?.ctx
      if (_ctx.contextData !== undefined) {
        _ctx.contextData.isTriggerCtx = true
      }

      // Use live query
      const results = await this.findAll(_ctx, _class, query, options)
      return toFindResult(
        results.map((v) => {
          return this.context.hierarchy.updateLookupMixin(_class, v, options)
        }),
        results.total
      )
    }

    const removed = await ctx.with('process-remove', {}, (ctx) => this.processRemove(ctx, txes, findAll))
    const collections = await ctx.with('process-collection', {}, (ctx) => this.processCollection(ctx, txes, findAll))
    const moves = await ctx.with('process-move', {}, (ctx) => this.processMove(ctx, txes, findAll))

    const triggerControl: Omit<TriggerControl, 'txFactory' | 'ctx' | 'txes'> = {
      removedMap: ctx.contextData.removedMap,
      workspace: this.context.workspace,
      lowLevel: this.context.lowLevelStorage as LowLevelStorage,
      branding: this.context.branding,
      storageAdapter: this.storageAdapter,
      serviceAdaptersManager: this.context.serviceAdapterManager as ServiceAdaptersManager,
      findAll,
      contextCache: ctx.contextData.contextCache,
      modelDb: this.context.modelDb,
      hierarchy: this.context.hierarchy,
      cache: this.cache,
      apply: async (ctx, tx, needResult) => {
        if (needResult === true) {
          return (await this.context.derived?.tx(ctx, tx)) ?? {}
        }
        return {}
      },
      // Will create a live query if missing and return values immediately if already asked.
      queryFind: (ctx: MeasureContext, _class, query, options) => {
        const domain = this.context.hierarchy.findDomain(_class)
        return ctx.with('query-find', { domain }, (ctx) => {
          const { ctx: octx, ...pureOptions } = (options as ServerFindOptions<Doc>) ?? {}
          return addOperation(
            ctx,
            'query-find',
            { domain, _class, query: query as any, options: pureOptions as any },
            () =>
              // We sure ctx is required to be passed
              this.context.liveQuery?.queryFind(_class, query) ??
              this.provideFindAll(ctx, _class, query, { ...options })
          )
        })
      }
    }

    const triggers = await this.processSyncTriggers(ctx, txes, triggerControl, findAll)

    const derived = [...removed, ...collections, ...moves, ...triggers]

    if (derived.length > 0) {
      await this.processDerivedTxes(ctx, derived)
    }

    const performSync = (ctx as MeasureContext<SessionDataImpl>).contextData.isAsyncContext ?? false

    if (performSync) {
      await this.processAsyncTriggers(ctx, triggerControl, findAll, txes, triggers)
    } else {
      ctx.contextData.asyncRequests = [
        ...(ctx.contextData.asyncRequests ?? []),
        async () => {
          // In case of async context, we execute both async and sync triggers as sync
          await this.processAsyncTriggers(ctx, triggerControl, findAll, txes, triggers)
        }
      ]
    }
  }

  @withContext('process-sync-triggers')
  processSyncTriggers (
    ctx: MeasureContext<SessionData>,
    txes: Tx[],
    triggerControl: Omit<TriggerControl, 'txFactory' | 'ctx' | 'txes'>,
    findAll: SessionFindAll
  ): Promise<Tx[]> {
    return this.triggers.apply(
      ctx,
      txes,
      {
        ...triggerControl,
        ctx,
        findAll,
        txes: [...txes]
      },
      'sync'
    )
  }

  @withContext('process-async-triggers')
  async processAsyncTriggers (
    ctx: MeasureContext<SessionData>,
    triggerControl: Omit<TriggerControl, 'txFactory' | 'ctx' | 'txes'>,
    findAll: Middleware['findAll'],
    txes: Tx[], // original txes
    syncResult: Tx[] // sync result txes
  ): Promise<void> {
    const sctx = ctx.contextData
    const asyncContextData: SessionDataImpl = new SessionDataImpl(
      sctx.userEmail,
      sctx.sessionId,
      sctx.admin,
      { txes: [], targets: {} },
      this.context.workspace,
      this.context.branding,
      true,
      sctx.removedMap,
      sctx.contextCache,
      this.context.modelDb
    )
    ctx.contextData = asyncContextData
    const aresult = await this.triggers.apply(
      ctx,
      txes,
      {
        ...triggerControl,
        ctx,
        findAll,
        txes: [...txes, ...syncResult]
      },
      'async'
    )

    if (aresult.length > 0) {
      await ctx.with('process-async-result', {}, async (ctx) => {
        await this.processDerivedTxes(ctx, aresult)
        // We need to send all to recipients
        await this.context.head?.handleBroadcast(ctx)
      })
    }
  }

  private async processDerivedTxes (ctx: MeasureContext<SessionData>, derived: Tx[]): Promise<void> {
    if (derived.length > 0) {
      derived.sort((a, b) => a.modifiedOn - b.modifiedOn)
      await this.context.derived?.tx(ctx, derived)
      // We need to perform broadcast here
    }
  }

  private getCollectionUpdateTx<D extends Doc>(
    _id: Ref<D>,
    _class: Ref<Class<D>>,
    modifiedBy: Ref<Account>,
    modifiedOn: number,
    attachedTo: Pick<Doc, '_class' | 'space'>,
    update: DocumentUpdate<D>
  ): Tx {
    const txFactory = new TxFactory(modifiedBy, true)
    const baseClass = this.context.hierarchy.getBaseClass(_class)
    if (baseClass !== _class) {
      // Mixin operation is required.
      const tx = txFactory.createTxMixin<Doc, Doc>(_id, attachedTo._class, attachedTo.space, _class, update)
      tx.modifiedOn = modifiedOn

      return tx
    } else {
      const tx = txFactory.createTxUpdateDoc(_class, attachedTo.space, _id, update)
      tx.modifiedOn = modifiedOn

      return tx
    }
  }

  private async processRemove (ctx: MeasureContext<SessionData>, txes: Tx[], findAll: SessionFindAll): Promise<Tx[]> {
    const result: Tx[] = []

    for (const tx of txes) {
      if (!this.context.hierarchy.isDerived(tx._class, core.class.TxRemoveDoc)) {
        continue
      }
      const rtx = tx as TxRemoveDoc<Doc>
      const object = ctx.contextData.removedMap.get(rtx.objectId)
      if (object === undefined) {
        continue
      }
      result.push(...(await this.deleteClassCollections(ctx, object._class, rtx.objectId, findAll)))
      const _class = this.context.hierarchy.findClass(object._class)
      if (_class !== undefined) {
        const mixins = this.getMixins(object._class, object)
        for (const mixin of mixins) {
          result.push(...(await this.deleteClassCollections(ctx, mixin, rtx.objectId, findAll, object._class)))
        }

        result.push(...(await this.deleteRelatedDocuments(ctx, object, findAll)))
      }

      result.push(...(await this.deleteRelatedDocuments(ctx, object, findAll)))
    }
    return result
  }

  private async deleteClassCollections (
    ctx: MeasureContext<SessionData>,
    _class: Ref<Class<Doc>>,
    objectId: Ref<Doc>,
    findAll: SessionFindAll,
    to?: Ref<Class<Doc>>
  ): Promise<Tx[]> {
    const attributes = this.context.hierarchy.getAllAttributes(_class, to)
    const result: Tx[] = []
    for (const attribute of attributes) {
      if (this.context.hierarchy.isDerived(attribute[1].type._class, core.class.Collection)) {
        const collection = attribute[1].type as Collection<AttachedDoc>
        const allAttached = await findAll(ctx, collection.of, { attachedTo: objectId })
        for (const attached of allAttached) {
          result.push(...this.deleteObject(ctx, attached, ctx.contextData.removedMap))
        }
      }
    }
    return result
  }

  private async updateCollection (
    ctx: MeasureContext,
    colTx: TxUpdateDoc<AttachedDoc>,
    findAll: SessionFindAll
  ): Promise<Tx[]> {
    if (colTx.attachedTo === undefined || colTx.attachedToClass === undefined || colTx.collection === undefined) {
      return []
    }

    const _id = colTx.attachedTo
    const _class = colTx.attachedToClass
    const { operations } = colTx

    if (
      this.context.hierarchy.getDomain(_class) === DOMAIN_MODEL // We could not update increments for model classes
    ) {
      return []
    }

    if (operations?.attachedTo === undefined || operations.attachedTo === _id) {
      return []
    }

    const oldAttachedTo = (await findAll(ctx, _class, { _id }, { limit: 1 }))[0]
    let oldTx: Tx | null = null
    if (oldAttachedTo !== undefined) {
      const attr = this.context.hierarchy.findAttribute(oldAttachedTo._class, colTx.collection)

      if (attr !== undefined) {
        oldTx = this.getCollectionUpdateTx(_id, _class, colTx.modifiedBy, colTx.modifiedOn, oldAttachedTo, {
          $inc: { [colTx.collection]: -1 }
        })
      }
    }

    const newAttachedToClass = operations.attachedToClass ?? _class
    const newAttachedToCollection = operations.collection ?? colTx.collection
    const newAttachedTo = (await findAll(ctx, newAttachedToClass, { _id: operations.attachedTo }, { limit: 1 }))[0]
    let newTx: Tx | null = null
    const newAttr = this.context.hierarchy.findAttribute(newAttachedToClass, newAttachedToCollection)
    if (newAttachedTo !== undefined && newAttr !== undefined) {
      newTx = this.getCollectionUpdateTx(
        newAttachedTo._id,
        newAttachedTo._class,
        colTx.modifiedBy,
        colTx.modifiedOn,
        newAttachedTo,
        { $inc: { [newAttachedToCollection]: 1 } }
      )
    }

    return [...(oldTx !== null ? [oldTx] : []), ...(newTx !== null ? [newTx] : [])]
  }

  private async processCollection (
    ctx: MeasureContext<SessionData>,
    txes: Tx[],
    findAll: SessionFindAll
  ): Promise<Tx[]> {
    const result: Tx[] = []
    for (const tx of txes) {
      const colTx = tx as TxCUD<AttachedDoc>
      if (colTx.attachedTo !== undefined && colTx.attachedToClass !== undefined && colTx.collection !== undefined) {
        const _id = colTx.attachedTo
        const _class = colTx.attachedToClass

        // Skip model operations
        if (this.context.hierarchy.getDomain(_class) === DOMAIN_MODEL) {
          // We could not update increments for model classes
          continue
        }

        const isCreateTx = colTx._class === core.class.TxCreateDoc
        const isDeleteTx = colTx._class === core.class.TxRemoveDoc
        const isUpdateTx = colTx._class === core.class.TxUpdateDoc
        if (isUpdateTx) {
          result.push(...(await this.updateCollection(ctx, colTx as TxUpdateDoc<AttachedDoc>, findAll)))
        }

        if ((isCreateTx || isDeleteTx) && !ctx.contextData.removedMap.has(_id)) {
          // TODO: Why we need attachedTo to be found? It uses attachedTo._class, attachedTo.space only inside
          // We found case for Todos, we could attach a collection with
          const attachedTo = (await findAll(ctx, _class, { _id }, { limit: 1 }))[0]
          if (attachedTo !== undefined) {
            result.push(
              this.getCollectionUpdateTx(
                _id,
                _class,
                tx.modifiedBy,
                colTx.modifiedOn,
                attachedTo, // { _class: colTx.objectClass, space: colTx.objectSpace },
                {
                  $inc: { [colTx.collection]: isCreateTx ? 1 : -1 }
                }
              )
            )
          }
        }
      }
    }
    return result
  }

  private getParentClass (_class: Ref<Class<Doc>>): Ref<Class<Doc>> {
    const baseDomain = this.context.hierarchy.getDomain(_class)
    const ancestors = this.context.hierarchy.getAncestors(_class)
    let result: Ref<Class<Doc>> = _class
    for (const ancestor of ancestors) {
      try {
        const domain = this.context.hierarchy.getClass(ancestor).domain
        if (domain === baseDomain) {
          result = ancestor
        }
      } catch {}
    }
    return result
  }

  private getMixins (_class: Ref<Class<Doc>>, object: Doc): Array<Ref<Mixin<Doc>>> {
    const parentClass = this.getParentClass(_class)
    const descendants = this.context.hierarchy.getDescendants(parentClass)
    return descendants.filter(
      (m) =>
        this.context.hierarchy.getClass(m).kind === ClassifierKind.MIXIN && this.context.hierarchy.hasMixin(object, m)
    )
  }

  private deleteObject (ctx: MeasureContext, object: Doc, removedMap: Map<Ref<Doc>, Doc>): Tx[] {
    const result: Tx[] = []
    const factory = new TxFactory(object.modifiedBy, true)
    if (this.context.hierarchy.isDerived(object._class, core.class.AttachedDoc)) {
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
    ctx: MeasureContext<SessionData>,
    object: Doc,
    findAll: SessionFindAll
  ): Promise<Tx[]> {
    const result: Tx[] = []
    const objectClass = this.context.hierarchy.getClass(object._class)
    if (this.context.hierarchy.hasMixin(objectClass, serverCore.mixin.ObjectDDParticipant)) {
      const removeParticipand: ObjectDDParticipant = this.context.hierarchy.as(
        objectClass,
        serverCore.mixin.ObjectDDParticipant
      )
      const collector = await getResource(removeParticipand.collectDocs)
      const docs = await collector(object, this.context.hierarchy, (_class, query, options) => {
        return findAll(ctx, _class, query, options)
      })
      for (const d of docs) {
        result.push(...this.deleteObject(ctx, d, ctx.contextData.removedMap))
      }
    }
    return result
  }

  private async processMove (ctx: MeasureContext, txes: Tx[], findAll: SessionFindAll): Promise<Tx[]> {
    const result: Tx[] = []
    for (const tx of txes) {
      if (!this.context.hierarchy.isDerived(tx._class, core.class.TxUpdateDoc)) {
        continue
      }
      const rtx = tx as TxUpdateDoc<Doc>
      if (rtx.operations.space === undefined || rtx.operations.space === rtx.objectSpace) {
        continue
      }
      const factory = new TxFactory(tx.modifiedBy, true)
      for (const [, attribute] of this.context.hierarchy.getAllAttributes(rtx.objectClass)) {
        if (!this.context.hierarchy.isDerived(attribute.type._class, core.class.Collection)) {
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
}
