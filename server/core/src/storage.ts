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

import type { Client as MinioClient } from 'minio'
import core, {
  AttachedDoc,
  Class,
  Doc,
  DocumentQuery,
  Domain,
  DOMAIN_MODEL,
  DOMAIN_TX,
  FindOptions,
  FindResult,
  Hierarchy,
  MeasureContext,
  ModelDb,
  Ref,
  ServerStorage,
  Storage,
  Tx,
  TxBulkWrite,
  TxCollectionCUD,
  TxCUD,
  TxFactory,
  TxResult
} from '@anticrm/core'
import { FullTextIndex } from './fulltext'
import { Triggers } from './triggers'
import type { FullTextAdapter, FullTextAdapterFactory } from './types'

/**
 * @public
 */
export interface DbAdapter extends Storage {
  /**
   * Method called after hierarchy is ready to use.
   */
  init: (model: Tx[]) => Promise<void>
  close: () => Promise<void>
}

/**
 * @public
 */
export interface TxAdapter extends DbAdapter {
  getModel: () => Promise<Tx[]>
}

/**
 * @public
 */
export type DbAdapterFactory = (hierarchy: Hierarchy, url: string, db: string, modelDb: ModelDb) => Promise<DbAdapter>

/**
 * @public
 */
export interface DbAdapterConfiguration {
  factory: DbAdapterFactory
  url: string
}

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

  constructor (
    private readonly domains: Record<string, string>,
    private readonly defaultAdapter: string,
    private readonly adapters: Map<string, DbAdapter>,
    private readonly hierarchy: Hierarchy,
    private readonly triggers: Triggers,
    private readonly fulltextAdapter: FullTextAdapter,
    private readonly storageAdapter: MinioClient | undefined,
    private readonly modelDb: ModelDb,
    private readonly workspace: string,
    options?: ServerStorageOptions
  ) {
    this.fulltext = new FullTextIndex(hierarchy, fulltextAdapter, this, options?.skipUpdateAttached ?? false)
  }

  async close (): Promise<void> {
    for (const o of this.adapters.values()) {
      await o.close()
    }
    await this.fulltextAdapter.close()
  }

  private getAdapter (domain: Domain): DbAdapter {
    const name = this.domains[domain] ?? this.defaultAdapter
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
      return await this.getAdapter(domain).tx(txCUD)
    } else {
      if (this.hierarchy.isDerived(tx._class, core.class.TxBulkWrite)) {
        const bulkWrite = tx as TxBulkWrite
        for (const tx of bulkWrite.txes) {
          await this.tx(ctx, tx)
        }
      } else {
        throw new Error('not implemented (routeTx)')
      }
      return {}
    }
  }

  async processCollection (ctx: MeasureContext, tx: Tx): Promise<Tx[]> {
    if (tx._class === core.class.TxCollectionCUD) {
      const colTx = tx as TxCollectionCUD<Doc, AttachedDoc>
      const _id = colTx.objectId
      const _class = colTx.objectClass
      let attachedTo: Doc | undefined

      // Skip model operations
      if (this.hierarchy.getDomain(_class) === DOMAIN_MODEL) {
        // We could not update increments for model classes
        return []
      }

      const isCreateTx = colTx.tx._class === core.class.TxCreateDoc
      if (isCreateTx || colTx.tx._class === core.class.TxRemoveDoc) {
        attachedTo = (await this.findAll(ctx, _class, { _id }, { limit: 1 }))[0]
        if (attachedTo !== undefined) {
          const txFactory = new TxFactory(tx.modifiedBy)
          const baseClass = this.hierarchy.getBaseClass(_class)
          if (baseClass !== _class) {
            // Mixin opeeration is required.
            return [txFactory.createTxMixin(_id, attachedTo._class, attachedTo.space, _class, {
              $inc: { [colTx.collection]: isCreateTx ? 1 : -1 }
            })]
          } else {
            return [
              txFactory.createTxUpdateDoc(_class, attachedTo.space, _id, {
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

  async tx (ctx: MeasureContext, tx: Tx): Promise<[TxResult, Tx[]]> {
    // store tx
    const _class = txClass(tx)
    const objClass = txObjectClass(tx)
    return await ctx.with('tx', { _class, objClass }, async (ctx) => {
      if (tx.objectSpace !== core.space.DerivedTx) {
        await ctx.with('domain-tx', { _class, objClass }, async () => await this.getAdapter(DOMAIN_TX).tx(tx))
      }

      if (tx.objectSpace === core.space.Model) {
        // maintain hiearachy and triggers
        this.hierarchy.tx(tx)
        await this.triggers.tx(tx)
        await this.modelDb.tx(tx)
      }

      const fAll = (mctx: MeasureContext) => <T extends Doc>(
        clazz: Ref<Class<T>>,
        query: DocumentQuery<T>,
        options?: FindOptions<T>
      ): Promise<FindResult<T>> => this.findAll(mctx, clazz, query, options)

      const triggerFx = new Effects()
      let derived: Tx[] = []
      let result: TxResult = {}
      // store object
      result = await ctx.with('route-tx', { _class, objClass }, (ctx) => this.routeTx(ctx, tx))
      // invoke triggers and store derived objects
      derived = [
        ...(await ctx.with('process-collection', { _class }, () => this.processCollection(ctx, tx))),
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
export async function createServerStorage (conf: DbConfiguration, options?: ServerStorageOptions): Promise<ServerStorage> {
  const hierarchy = new Hierarchy()
  const triggers = new Triggers()
  const adapters = new Map<string, DbAdapter>()
  const modelDb = new ModelDb(hierarchy)

  for (const key in conf.adapters) {
    const adapterConf = conf.adapters[key]
    adapters.set(key, await adapterConf.factory(hierarchy, adapterConf.url, conf.workspace, modelDb))
  }

  const txAdapter = adapters.get(conf.domains[DOMAIN_TX]) as TxAdapter
  if (txAdapter === undefined) {
    console.log('no txadapter found')
  }

  const model = await txAdapter.getModel()

  for (const tx of model) {
    hierarchy.tx(tx)
    await triggers.tx(tx)
  }

  for (const tx of model) {
    await modelDb.tx(tx)
  }

  for (const [, adapter] of adapters) {
    await adapter.init(model)
  }

  const fulltextAdapter = await conf.fulltextAdapter.factory(conf.fulltextAdapter.url, conf.workspace)
  const storageAdapter = conf.storageFactory?.()

  return new TServerStorage(conf.domains, conf.defaultAdapter, adapters, hierarchy, triggers, fulltextAdapter, storageAdapter, modelDb, conf.workspace, options)
}
