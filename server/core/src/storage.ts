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

import core, {
  Account,
  AttachedDoc,
  Class,
  ClassifierKind,
  Collection,
  Doc,
  DocumentQuery,
  DocumentUpdate,
  Domain,
  DOMAIN_DOC_INDEX_STATE,
  DOMAIN_MODEL,
  DOMAIN_TX,
  FindOptions,
  FindResult,
  generateId,
  Hierarchy,
  IndexingUpdateEvent,
  LoadModelResponse,
  MeasureContext,
  Mixin,
  ModelDb,
  Ref,
  ServerStorage,
  StorageIterator,
  Timestamp,
  Tx,
  TxApplyIf,
  TxCollectionCUD,
  TxCUD,
  TxFactory,
  TxProcessor,
  TxRemoveDoc,
  TxResult,
  TxUpdateDoc,
  TxWorkspaceEvent,
  WorkspaceEvent,
  WorkspaceId
} from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import { getResource } from '@hcengineering/platform'
import crypto from 'node:crypto'
import { DbAdapter, DbAdapterConfiguration, TxAdapter } from './adapter'
import { createContentAdapter } from './content'
import { FullTextIndex } from './fulltext'
import { FullTextIndexPipeline } from './indexer'
import { FullTextPipelineStage } from './indexer/types'
import serverCore from './plugin'
import { Triggers } from './triggers'
import type {
  ContentTextAdapter,
  ContentTextAdapterConfiguration,
  FullTextAdapter,
  FullTextAdapterFactory,
  ObjectDDParticipant,
  TriggerControl
} from './types'
import { createFindAll } from './utils'

/**
 * @public
 */

export type FullTextPipelineStageFactory = (
  adapter: FullTextAdapter,
  storage: ServerStorage,
  storageAdapter: MinioService,
  contentAdapter: ContentTextAdapter
) => FullTextPipelineStage[]
/**
 * @public
 */
export interface DbConfiguration {
  adapters: Record<string, DbAdapterConfiguration>
  domains: Record<string, string>
  defaultAdapter: string
  workspace: WorkspaceId
  metrics: MeasureContext
  fulltextAdapter: {
    factory: FullTextAdapterFactory
    url: string
    stages: FullTextPipelineStageFactory
  }
  contentAdapters: Record<string, ContentTextAdapterConfiguration>
  defaultContentAdapter: string
  storageFactory?: () => MinioService
}

class TServerStorage implements ServerStorage {
  private readonly fulltext: FullTextIndex
  hierarchy: Hierarchy

  scopes = new Map<string, Promise<any>>()

  hashes!: string[]

  constructor (
    private readonly _domains: Record<string, string>,
    private readonly defaultAdapter: string,
    private readonly adapters: Map<string, DbAdapter>,
    hierarchy: Hierarchy,
    private readonly triggers: Triggers,
    private readonly fulltextAdapter: FullTextAdapter,
    readonly storageAdapter: MinioService | undefined,
    readonly modelDb: ModelDb,
    private readonly workspace: WorkspaceId,
    readonly indexFactory: (storage: ServerStorage) => FullTextIndex,
    readonly options: ServerStorageOptions,
    metrics: MeasureContext,
    readonly model: Tx[]
  ) {
    this.hierarchy = hierarchy
    this.fulltext = indexFactory(this)

    this.setModel(model)
  }

  async close (): Promise<void> {
    console.timeLog(this.workspace.name, 'closing')
    await this.fulltext.close()
    console.timeLog(this.workspace.name, 'closing adapters')
    for (const o of this.adapters.values()) {
      await o.close()
    }
    console.timeLog(this.workspace.name, 'closing fulltext')
    await this.fulltextAdapter.close()
  }

  private getAdapter (domain: Domain): DbAdapter {
    const name = this._domains[domain] ?? this.defaultAdapter
    const adapter = this.adapters.get(name)
    if (adapter === undefined) {
      throw new Error('adapter not provided: ' + name)
    }
    return adapter
  }

  private async routeTx (ctx: MeasureContext, removedDocs: Map<Ref<Doc>, Doc>, ...txes: Tx[]): Promise<TxResult> {
    let part: TxCUD<Doc>[] = []
    let lastDomain: Domain | undefined
    const result: TxResult[] = []
    const processPart = async (): Promise<void> => {
      if (part.length > 0) {
        // Find all deleted documents

        const adapter = this.getAdapter(lastDomain as Domain)
        const toDelete = part.filter((it) => it._class === core.class.TxRemoveDoc).map((it) => it.objectId)

        const toDeleteDocs = await adapter.load(lastDomain as Domain, toDelete)
        for (const ddoc of toDeleteDocs) {
          removedDocs.set(ddoc._id, ddoc)
        }

        const r = await adapter.tx(...part)
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
        console.error('Unsupported transaction', tx)
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

    if (result.length === 1) {
      return result[0]
    }
    if (result.length === 0) {
      return false
    }
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
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return await ctx.with('find-all', {}, (ctx) => {
      const domain = this.hierarchy.getDomain(clazz)
      if (query?.$search !== undefined) {
        return ctx.with('full-text-find-all', {}, (ctx) => this.fulltext.findAll(ctx, clazz, query, options))
      }
      return ctx.with('db-find-all', { d: domain }, () => this.getAdapter(domain).findAll(clazz, query, options))
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

  private async processDerived (
    ctx: MeasureContext,
    txes: Tx[],
    triggerFx: Effects,
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

    const removed = await ctx.with('process-remove', {}, () => this.processRemove(ctx, txes, findAll, removedMap))
    const collections = await ctx.with('process-collection', {}, () =>
      this.processCollection(ctx, txes, findAll, removedMap)
    )
    const moves = await ctx.with('process-move', {}, () => this.processMove(ctx, txes, findAll))

    const triggerControl: Omit<TriggerControl, 'txFactory'> = {
      removedMap,
      workspace: this.workspace,
      fx: triggerFx.fx,
      fulltextFx: (f) => triggerFx.fx(() => f(this.fulltextAdapter)),
      storageFx: (f) => {
        const adapter = this.storageAdapter
        if (adapter === undefined) {
          return
        }

        triggerFx.fx(() => f(adapter, this.workspace))
      },
      findAll: fAll(ctx),
      modelDb: this.modelDb,
      hierarchy: this.hierarchy,
      apply: async (tx, broadcast) => {
        await this.apply(ctx, tx, broadcast)
      }
    }
    const triggers = await ctx.with('process-triggers', {}, async (ctx) => {
      const result: Tx[] = []
      for (const tx of txes) {
        result.push(...(await this.triggers.apply(tx.modifiedBy, tx, triggerControl)))
      }
      return result
    })

    const derived = [...removed, ...collections, ...moves, ...triggers]

    return await this.processDerivedTxes(derived, ctx, triggerFx, findAll, removedMap)
  }

  private async processDerivedTxes (
    derived: Tx[],
    ctx: MeasureContext,
    triggerFx: Effects,
    findAll: ServerStorage['findAll'],
    removedMap: Map<Ref<Doc>, Doc>
  ): Promise<Tx[]> {
    derived.sort((a, b) => a.modifiedOn - b.modifiedOn)

    await ctx.with('derived-route-tx', {}, (ctx) => this.routeTx(ctx, removedMap, ...derived))

    const nestedTxes: Tx[] = []
    if (derived.length > 0) {
      nestedTxes.push(...(await this.processDerived(ctx, derived, triggerFx, findAll, removedMap)))
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

  async apply (ctx: MeasureContext, txes: Tx[], broadcast: boolean): Promise<Tx[]> {
    const result = await this.processTxes(ctx, txes)
    let derived: Tx[] = []

    derived = result[1]

    if (broadcast) {
      this.options?.broadcast?.(txes)
      this.options?.broadcast?.(derived)
    }

    return [...txes, ...derived]
  }

  fillTxes (txes: Tx[], txToStore: Tx[], modelTx: Tx[], txToProcess: Tx[], applyTxes: Tx[]): void {
    for (const tx of txes) {
      if (!this.hierarchy.isDerived(tx._class, core.class.TxApplyIf)) {
        if (tx.space !== core.space.DerivedTx) {
          txToStore.push(tx)
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

  async processTxes (ctx: MeasureContext, txes: Tx[]): Promise<[TxResult, Tx[]]> {
    // store tx
    const _findAll = createFindAll(this)
    const txToStore: Tx[] = []
    const modelTx: Tx[] = []
    const applyTxes: Tx[] = []
    const txToProcess: Tx[] = []
    const triggerFx = new Effects()
    const removedMap = new Map<Ref<Doc>, Doc>()
    const onEnds: (() => void)[] = []
    let result: TxResult = {}
    let derived: Tx[] = []

    try {
      this.fillTxes(txes, txToStore, modelTx, txToProcess, applyTxes)
      for (const tx of applyTxes) {
        const applyIf = tx as TxApplyIf
        // Wait for scope promise if found
        const passed = await this.verifyApplyIf(ctx, applyIf, _findAll)
        onEnds.push(passed.onEnd)
        if (passed.passed) {
          this.fillTxes(applyIf.txes, txToStore, modelTx, txToProcess, applyTxes)
          derived = [...applyIf.txes]
        }
      }
      for (const tx of modelTx) {
        this.addModelTx(tx)

        // maintain hierarchy and triggers
        this.hierarchy.tx(tx)
        await this.triggers.tx(tx)
        await this.modelDb.tx(tx)
      }
      await ctx.with('domain-tx', {}, async () => await this.getAdapter(DOMAIN_TX).tx(...txToStore))
      result = await ctx.with('apply', {}, (ctx) => this.routeTx(ctx, removedMap, ...txToProcess))

      // invoke triggers and store derived objects
      derived = derived.concat(await this.processDerived(ctx, txToProcess, triggerFx, _findAll, removedMap))

      // index object
      for (const _tx of txToProcess) {
        await ctx.with('fulltext', {}, (ctx) => this.fulltext.tx(ctx, _tx))
      }

      // index derived objects
      for (const tx of derived) {
        await ctx.with('derived-processor', { _class: txClass(tx) }, (ctx) => this.fulltext.tx(ctx, tx))
      }

      for (const fx of triggerFx.effects) {
        await fx()
      }
    } catch (err: any) {
      console.log(err)
      throw err
    } finally {
      onEnds.forEach((p) => p())
    }

    return [result, derived]
  }

  async tx (ctx: MeasureContext, tx: Tx): Promise<[TxResult, Tx[]]> {
    return await this.processTxes(ctx, [tx])
  }

  find (domain: Domain): StorageIterator {
    return this.getAdapter(domain).find(domain)
  }

  async load (domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return await this.getAdapter(domain).load(domain, docs)
  }

  async upload (domain: Domain, docs: Doc[]): Promise<void> {
    await this.getAdapter(domain).upload(domain, docs)
  }

  async clean (domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    await this.getAdapter(domain).clean(domain, docs)
  }
}

type Effect = () => Promise<void>
class Effects {
  private readonly _effects: Effect[] = []

  public fx = (f: Effect): void => {
    this._effects.push(f)
  }

  get effects (): Effect[] {
    return [...this._effects]
  }
}

function txClass (tx: Tx): Ref<Class<Tx>> {
  return tx._class === core.class.TxCollectionCUD ? (tx as TxCollectionCUD<Doc, AttachedDoc>).tx._class : tx._class
}

/**
 * @public
 */
export interface ServerStorageOptions {
  // If defined, will skip update of attached documents on document update.
  skipUpdateAttached?: boolean

  // Indexing is not required to be started for upgrade mode.
  upgrade: boolean

  broadcast?: (tx: Tx[]) => void
}
/**
 * @public
 */
export async function createServerStorage (
  conf: DbConfiguration,
  options: ServerStorageOptions
): Promise<ServerStorage> {
  const hierarchy = new Hierarchy()
  const triggers = new Triggers(hierarchy)
  const adapters = new Map<string, DbAdapter>()
  const modelDb = new ModelDb(hierarchy)

  console.timeLog(conf.workspace.name, 'create server storage')
  const storageAdapter = conf.storageFactory?.()

  for (const key in conf.adapters) {
    const adapterConf = conf.adapters[key]
    adapters.set(key, await adapterConf.factory(hierarchy, adapterConf.url, conf.workspace, modelDb, storageAdapter))
    console.timeLog(conf.workspace.name, 'adapter', key)
  }

  const txAdapter = adapters.get(conf.domains[DOMAIN_TX]) as TxAdapter
  if (txAdapter === undefined) {
    console.log('no txadapter found')
  }

  console.timeLog(conf.workspace.name, 'begin get model')
  const model = await txAdapter.getModel()
  console.timeLog(conf.workspace.name, 'get model')
  for (const tx of model) {
    try {
      hierarchy.tx(tx)
      await triggers.tx(tx)
    } catch (err: any) {
      console.error('failed to apply model transaction, skipping', JSON.stringify(tx), err)
    }
  }
  console.timeLog(conf.workspace.name, 'finish hierarchy')

  for (const tx of model) {
    try {
      await modelDb.tx(tx)
    } catch (err: any) {
      console.error('failed to apply model transaction, skipping', JSON.stringify(tx), err)
    }
  }
  console.timeLog(conf.workspace.name, 'finish local model')

  for (const [adn, adapter] of adapters) {
    await adapter.init(model)
    console.timeLog(conf.workspace.name, 'finish init adapter', adn)
  }

  const fulltextAdapter = await conf.fulltextAdapter.factory(
    conf.fulltextAdapter.url,
    conf.workspace,
    conf.metrics.newChild('fulltext', {})
  )
  console.timeLog(conf.workspace.name, 'finish fulltext adapter')

  const metrics = conf.metrics.newChild('server-storage', {})

  const contentAdapter = await createContentAdapter(
    conf.contentAdapters,
    conf.defaultContentAdapter,
    conf.workspace,
    metrics.newChild('content', {})
  )
  console.timeLog(conf.workspace.name, 'finish content adapter')

  const defaultAdapter = adapters.get(conf.defaultAdapter)
  if (defaultAdapter === undefined) {
    throw new Error(`No Adapter for ${DOMAIN_DOC_INDEX_STATE}`)
  }

  const indexFactory = (storage: ServerStorage): FullTextIndex => {
    if (storageAdapter === undefined) {
      throw new Error('No storage adapter')
    }
    const stages = conf.fulltextAdapter.stages(fulltextAdapter, storage, storageAdapter, contentAdapter)
    console.timeLog(conf.workspace.name, 'finish index pipeline stages')

    const indexer = new FullTextIndexPipeline(
      defaultAdapter,
      stages,
      hierarchy,
      conf.workspace,
      metrics.newChild('fulltext', {}),
      modelDb,
      (classes: Ref<Class<Doc>>[]) => {
        const evt: IndexingUpdateEvent = {
          _class: classes
        }
        const tx: TxWorkspaceEvent = {
          _class: core.class.TxWorkspaceEvent,
          _id: generateId(),
          event: WorkspaceEvent.IndexingUpdate,
          modifiedBy: core.account.System,
          modifiedOn: Date.now(),
          objectSpace: core.space.DerivedTx,
          space: core.space.DerivedTx,
          params: evt
        }
        options.broadcast?.([tx])
      }
    )
    console.timeLog(conf.workspace.name, 'finish create indexer')
    return new FullTextIndex(
      hierarchy,
      fulltextAdapter,
      storage,
      storageAdapter,
      conf.workspace,
      indexer,
      options.upgrade ?? false
    )
  }
  return new TServerStorage(
    conf.domains,
    conf.defaultAdapter,
    adapters,
    hierarchy,
    triggers,
    fulltextAdapter,
    storageAdapter,
    modelDb,
    conf.workspace,
    indexFactory,
    options,
    metrics,
    model
  )
}

/**
 * @public
 */
export function createNullStorageFactory (): MinioService {
  return {
    client: '' as any,
    exists: async (workspaceId: WorkspaceId) => {
      return false
    },
    make: async (workspaceId: WorkspaceId) => {},
    remove: async (workspaceId: WorkspaceId, objectNames: string[]) => {},
    delete: async (workspaceId: WorkspaceId) => {},
    list: async (workspaceId: WorkspaceId, prefix?: string) => [],
    stat: async (workspaceId: WorkspaceId, objectName: string) => ({} as any),
    get: async (workspaceId: WorkspaceId, objectName: string) => ({} as any),
    put: async (workspaceId: WorkspaceId, objectName: string, stream: any, size?: number, qwe?: any) => ({} as any),
    read: async (workspaceId: WorkspaceId, name: string) => ({} as any),
    partial: async (workspaceId: WorkspaceId, objectName: string, offset: number, length?: number) => ({} as any)
  }
}
