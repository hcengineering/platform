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
  DOMAIN_MODEL,
  DOMAIN_TX,
  FindOptions,
  FindResult,
  Hierarchy,
  MeasureContext,
  Mixin,
  ModelDb,
  Ref,
  ServerStorage,
  StorageIterator,
  Tx,
  TxBulkWrite,
  TxCollectionCUD,
  TxCreateDoc,
  TxCUD,
  TxFactory,
  TxMixin,
  TxProcessor,
  TxRemoveDoc,
  TxResult,
  TxUpdateDoc
} from '@anticrm/core'
import { getResource } from '@anticrm/platform'
import type { Client as MinioClient } from 'minio'
import { DbAdapter, DbAdapterConfiguration, TxAdapter } from './adapter'
import { FullTextIndex } from './fulltext'
import serverCore from './plugin'
import { Triggers } from './triggers'
import type { FullTextAdapter, FullTextAdapterFactory, ObjectDDParticipant } from './types'
import { extractTx } from './utils'

/**
 * @public
 */
export interface DbConfiguration {
  adapters: Record<string, DbAdapterConfiguration>
  domains: Record<string, string>
  defaultAdapter: string
  workspace: string
  fulltextAdapter: {
    factory: FullTextAdapterFactory
    url: string
  }
  storageFactory?: () => MinioClient
}

class TServerStorage implements ServerStorage {
  private readonly fulltext: FullTextIndex
  hierarchy: Hierarchy

  constructor (
    private readonly _domains: Record<string, string>,
    private readonly defaultAdapter: string,
    private readonly adapters: Map<string, DbAdapter>,
    hierarchy: Hierarchy,
    private readonly triggers: Triggers,
    private readonly fulltextAdapter: FullTextAdapter,
    readonly storageAdapter: MinioClient | undefined,
    readonly modelDb: ModelDb,
    private readonly workspace: string,
    options?: ServerStorageOptions
  ) {
    this.hierarchy = hierarchy
    this.fulltext = new FullTextIndex(hierarchy, fulltextAdapter, this, options?.skipUpdateAttached ?? false)
  }

  async close (): Promise<void> {
    for (const o of this.adapters.values()) {
      await o.close()
    }
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

  private async routeTx (ctx: MeasureContext, tx: Tx): Promise<TxResult> {
    if (this.hierarchy.isDerived(tx._class, core.class.TxCUD)) {
      const txCUD = tx as TxCUD<Doc>
      const domain = this.hierarchy.getDomain(txCUD.objectClass)
      const adapter = this.getAdapter(domain)
      const res = await adapter.tx(txCUD)
      return res
    } else {
      if (this.hierarchy.isDerived(tx._class, core.class.TxBulkWrite)) {
        const bulkWrite = tx as TxBulkWrite
        for (const tx of bulkWrite.txes) {
          await this.tx(ctx, tx)
        }
      } else {
        throw new Error('not implemented (routeTx)')
      }
      return [{}, false]
    }
  }

  private async getCollectionUpdateTx<D extends Doc>(
    _id: Ref<D>,
    _class: Ref<Class<D>>,
    modifiedBy: Ref<Account>,
    modifiedOn: number,
    attachedTo: D,
    update: DocumentUpdate<D>
  ): Promise<Tx> {
    const txFactory = new TxFactory(modifiedBy)
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

  private async updateCollection (ctx: MeasureContext, tx: Tx): Promise<Tx[]> {
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

    const oldAttachedTo = (await this.findAll(ctx, _class, { _id }, { limit: 1 }))[0]
    let oldTx: Tx | null = null
    if (oldAttachedTo !== undefined) {
      oldTx = await this.getCollectionUpdateTx(_id, _class, tx.modifiedBy, colTx.modifiedOn, oldAttachedTo, {
        $inc: { [colTx.collection]: -1 }
      })
    }

    const newAttachedToClass = operations.attachedToClass ?? _class
    const newAttachedToCollection = operations.collection ?? colTx.collection
    const newAttachedTo = (await this.findAll(ctx, newAttachedToClass, { _id: operations.attachedTo }, { limit: 1 }))[0]
    let newTx: Tx | null = null
    if (newAttachedTo !== undefined) {
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

  async processCollection (ctx: MeasureContext, tx: Tx): Promise<Tx[]> {
    if (tx._class === core.class.TxCollectionCUD) {
      const colTx = tx as TxCollectionCUD<Doc, AttachedDoc>
      const _id = colTx.objectId
      const _class = colTx.objectClass

      // Skip model operations
      if (this.hierarchy.getDomain(_class) === DOMAIN_MODEL) {
        // We could not update increments for model classes
        return []
      }

      const isCreateTx = colTx.tx._class === core.class.TxCreateDoc
      const isDeleteTx = colTx.tx._class === core.class.TxRemoveDoc
      const isUpdateTx = colTx.tx._class === core.class.TxUpdateDoc

      if (isCreateTx || isDeleteTx || isUpdateTx) {
        if (isUpdateTx) {
          return await this.updateCollection(ctx, tx)
        } else {
          const attachedTo = (await this.findAll(ctx, _class, { _id }, { limit: 1 }))[0]
          if (attachedTo !== undefined) {
            return [
              await this.getCollectionUpdateTx(_id, _class, tx.modifiedBy, colTx.modifiedOn, attachedTo, {
                $inc: { [colTx.collection]: isCreateTx ? 1 : -1 }
              })
            ]
          }
        }
      }
    }
    return []
  }

  async findAll<T extends Doc>(
    ctx: MeasureContext,
    clazz: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return await ctx.with('find-all', {}, (ctx) => {
      const domain = this.hierarchy.getDomain(clazz)
      if (query.$search !== undefined) {
        return ctx.with('full-text-find-all', {}, (ctx) => this.fulltext.findAll(ctx, clazz, query, options))
      }
      return ctx.with('db-find-all', { _class: clazz, domain }, () =>
        this.getAdapter(domain).findAll(clazz, query, options)
      )
    })
  }

  getParentClass (_class: Ref<Class<Doc>>): Ref<Class<Doc>> {
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

  getMixins (_class: Ref<Class<Doc>>, object: Doc): Array<Ref<Mixin<Doc>>> {
    const parentClass = this.getParentClass(_class)
    const descendants = this.hierarchy.getDescendants(parentClass)
    return descendants.filter(
      (m) => this.hierarchy.getClass(m).kind === ClassifierKind.MIXIN && this.hierarchy.hasMixin(object, m)
    )
  }

  async buildRemovedDoc (ctx: MeasureContext, tx: TxRemoveDoc<Doc>): Promise<Doc | undefined> {
    const txes = await this.findAll(ctx, core.class.TxCUD, { objectId: tx.objectId }, { sort: { modifiedOn: 1 } })
    let doc: Doc
    let createTx = txes.find((tx) => tx._class === core.class.TxCreateDoc)
    if (createTx === undefined) {
      const collectionTxes = txes.filter((tx) => tx._class === core.class.TxCollectionCUD) as TxCollectionCUD<
      Doc,
      AttachedDoc
      >[]
      createTx = collectionTxes.find((p) => p.tx._class === core.class.TxCreateDoc)
    }
    if (createTx === undefined) return
    doc = TxProcessor.createDoc2Doc(createTx as TxCreateDoc<Doc>)
    for (const tx of txes) {
      if (tx._class === core.class.TxUpdateDoc) {
        doc = TxProcessor.updateDoc2Doc(doc, tx as TxUpdateDoc<Doc>)
      } else if (tx._class === core.class.TxMixin) {
        const mixinTx = tx as TxMixin<Doc, Doc>
        doc = TxProcessor.updateMixin4Doc(doc, mixinTx.mixin, mixinTx.attributes)
      }
    }

    return doc
  }

  async processRemove (ctx: MeasureContext, tx: Tx): Promise<Tx[]> {
    const actualTx = extractTx(tx)
    if (!this.hierarchy.isDerived(actualTx._class, core.class.TxRemoveDoc)) return []
    const rtx = actualTx as TxRemoveDoc<Doc>
    const result: Tx[] = []
    const object = await this.buildRemovedDoc(ctx, rtx)
    if (object === undefined) return []
    result.push(...(await this.deleteClassCollections(ctx, object._class, rtx.objectId)))
    const mixins = this.getMixins(object._class, object)
    for (const mixin of mixins) {
      result.push(...(await this.deleteClassCollections(ctx, mixin, rtx.objectId)))
    }
    result.push(...(await this.deleteRelatedDocuments(ctx, object)))
    return result
  }

  async deleteClassCollections (ctx: MeasureContext, _class: Ref<Class<Doc>>, objectId: Ref<Doc>): Promise<Tx[]> {
    const attributes = this.hierarchy.getAllAttributes(_class)
    const result: Tx[] = []
    for (const attribute of attributes) {
      if (this.hierarchy.isDerived(attribute[1].type._class, core.class.Collection)) {
        const collection = attribute[1].type as Collection<AttachedDoc>
        const allAttached = await this.findAll(ctx, collection.of, { attachedTo: objectId })
        for (const attached of allAttached) {
          result.push(...(await this.deleteObject(ctx, attached)))
        }
      }
    }
    return result
  }

  async deleteObject (ctx: MeasureContext, object: Doc): Promise<Tx[]> {
    const result: Tx[] = []
    const factory = new TxFactory(core.account.System)
    if (this.hierarchy.isDerived(object._class, core.class.AttachedDoc)) {
      const adoc = object as AttachedDoc
      const nestedTx = factory.createTxRemoveDoc(object._class, object.space, adoc._id) as TxRemoveDoc<AttachedDoc>
      const tx = factory.createTxCollectionCUD(
        adoc.attachedToClass,
        adoc.attachedTo,
        object.space,
        adoc.collection,
        nestedTx
      )
      result.push(tx)
    } else {
      result.push(factory.createTxRemoveDoc(object._class, object.space, object._id))
    }
    result.push(...(await this.deleteClassCollections(ctx, object._class, object._id)))
    const mixins = this.getMixins(object._class, object)
    for (const mixin of mixins) {
      result.push(...(await this.deleteClassCollections(ctx, mixin, object._id)))
    }
    result.push(...(await this.deleteRelatedDocuments(ctx, object)))
    return result
  }

  async deleteRelatedDocuments (ctx: MeasureContext, object: Doc): Promise<Tx[]> {
    const result: Tx[] = []
    const objectClass = this.hierarchy.getClass(object._class)
    if (this.hierarchy.hasMixin(objectClass, serverCore.mixin.ObjectDDParticipant)) {
      const removeParticipand: ObjectDDParticipant = this.hierarchy.as(
        objectClass,
        serverCore.mixin.ObjectDDParticipant
      )
      const collector = await getResource(removeParticipand.collectDocs)
      const docs = await collector(object, this.hierarchy, async (_class, query, options) => {
        return await this.findAll(ctx, _class, query, options)
      })
      for (const d of docs) {
        result.push(...(await this.deleteObject(ctx, d)))
      }
    }
    return result
  }

  async processMove (ctx: MeasureContext, tx: Tx): Promise<Tx[]> {
    const actualTx = extractTx(tx)
    if (!this.hierarchy.isDerived(actualTx._class, core.class.TxUpdateDoc)) return []
    const rtx = actualTx as TxUpdateDoc<Doc>
    if (rtx.operations.space === undefined || rtx.operations.space === rtx.objectSpace) return []
    const result: Tx[] = []
    const factory = new TxFactory(core.account.System)
    for (const [, attribute] of this.hierarchy.getAllAttributes(rtx.objectClass)) {
      if (!this.hierarchy.isDerived(attribute.type._class, core.class.Collection)) continue
      const collection = attribute.type as Collection<AttachedDoc>
      const allAttached = await this.findAll(ctx, collection.of, { attachedTo: rtx.objectId, space: rtx.objectSpace })
      const allTx = allAttached.map(({ _class, space, _id }) =>
        factory.createTxUpdateDoc(_class, space, _id, { space: rtx.operations.space })
      )
      result.push(...allTx)
    }
    return result
  }

  async tx (ctx: MeasureContext, tx: Tx): Promise<[TxResult, Tx[]]> {
    // store tx
    const _class = txClass(tx)
    const objClass = txObjectClass(tx)
    return await ctx.with('tx', { _class, objClass }, async (ctx) => {
      if (tx.space !== core.space.DerivedTx) {
        await ctx.with('domain-tx', { _class, objClass }, async () => await this.getAdapter(DOMAIN_TX).tx(tx))
      }

      if (tx.objectSpace === core.space.Model) {
        // maintain hiearachy and triggers
        this.hierarchy.tx(tx)
        await this.triggers.tx(tx)
        await this.modelDb.tx(tx)
      }

      const fAll =
        (mctx: MeasureContext) =>
        <T extends Doc>(
            clazz: Ref<Class<T>>,
            query: DocumentQuery<T>,
            options?: FindOptions<T>
          ): Promise<FindResult<T>> =>
            this.findAll(mctx, clazz, query, options)

      const triggerFx = new Effects()
      let derived: Tx[] = []
      // store object
      const result = await ctx.with('route-tx', { _class, objClass }, (ctx) => this.routeTx(ctx, tx))
      // invoke triggers and store derived objects
      derived = [
        ...(await ctx.with('process-collection', { _class }, () => this.processCollection(ctx, tx))),
        ...(await ctx.with('process-remove', { _class }, () => this.processRemove(ctx, tx))),
        ...(await ctx.with('process-move', { _class }, () => this.processMove(ctx, tx))),
        ...(await ctx.with('process-triggers', {}, (ctx) =>
          this.triggers.apply(tx.modifiedBy, tx, {
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
            hierarchy: this.hierarchy
          })
        ))
      ]

      for (const tx of derived) {
        await ctx.with('derived-route-tx', { _class: txClass(tx) }, (ctx) => this.routeTx(ctx, tx))
      }

      // index object
      await ctx.with('fulltext', { _class, objClass }, (ctx) => this.fulltext.tx(ctx, tx))
      // index derived objects
      for (const tx of derived) {
        await ctx.with('derived-fulltext', { _class: txClass(tx) }, (ctx) => this.fulltext.tx(ctx, tx))
      }

      for (const fx of triggerFx.effects) {
        await fx()
      }

      return [result, derived]
    })
  }

  find (domain: Domain): StorageIterator {
    return this.getAdapter(domain).find(domain)
  }

  async load (domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return await this.getAdapter(domain).load(domain, docs)
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

function txObjectClass (tx: Tx): string {
  return tx._class === core.class.TxCollectionCUD
    ? (tx as TxCollectionCUD<Doc, AttachedDoc>).tx.objectClass
    : (tx as TxCUD<Doc>).objectClass
}

function txClass (tx: Tx): string {
  return tx._class === core.class.TxCollectionCUD ? (tx as TxCollectionCUD<Doc, AttachedDoc>).tx._class : tx._class
}

/**
 * @public
 */
export interface ServerStorageOptions {
  // If defined, will skip update of attached documents on document update.
  skipUpdateAttached?: boolean
}
/**
 * @public
 */
export async function createServerStorage (
  conf: DbConfiguration,
  options?: ServerStorageOptions
): Promise<ServerStorage> {
  const hierarchy = new Hierarchy()
  const triggers = new Triggers()
  const adapters = new Map<string, DbAdapter>()
  const modelDb = new ModelDb(hierarchy)
  const storageAdapter = conf.storageFactory?.()

  for (const key in conf.adapters) {
    const adapterConf = conf.adapters[key]
    adapters.set(key, await adapterConf.factory(hierarchy, adapterConf.url, conf.workspace, modelDb, storageAdapter))
  }

  const txAdapter = adapters.get(conf.domains[DOMAIN_TX]) as TxAdapter
  if (txAdapter === undefined) {
    console.log('no txadapter found')
  }

  const model = await txAdapter.getModel()

  for (const tx of model) {
    try {
      hierarchy.tx(tx)
      await triggers.tx(tx)
    } catch (err: any) {
      console.error('failed to apply model transaction, skipping', JSON.stringify(tx), err)
    }
  }

  for (const tx of model) {
    try {
      await modelDb.tx(tx)
    } catch (err: any) {
      console.error('failed to apply model transaction, skipping', JSON.stringify(tx), err)
    }
  }

  for (const [, adapter] of adapters) {
    await adapter.init(model)
  }

  const fulltextAdapter = await conf.fulltextAdapter.factory(conf.fulltextAdapter.url, conf.workspace)

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
    options
  )
}
