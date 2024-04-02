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
  type Class,
  DOMAIN_DOC_INDEX_STATE,
  DOMAIN_TX,
  type Doc,
  Hierarchy,
  type IndexingUpdateEvent,
  type MeasureContext,
  ModelDb,
  type Ref,
  type ServerStorage,
  type TxWorkspaceEvent,
  WorkspaceEvent,
  type WorkspaceId,
  generateId
} from '@hcengineering/core'
import { type DbAdapter, type TxAdapter } from '../adapter'
import { type DbConfiguration } from '../configuration'
import { createContentAdapter } from '../content'
import { FullTextIndex } from '../fulltext'
import { FullTextIndexPipeline } from '../indexer'
import { createServiceAdaptersManager } from '../service'
import { type StorageAdapter } from '../storage'
import { Triggers } from '../triggers'
import { type ServerStorageOptions } from '../types'
import { TServerStorage } from './storage'

/**
 * @public
 */
export async function createServerStorage (
  ctx: MeasureContext,
  conf: DbConfiguration,
  options: ServerStorageOptions
): Promise<ServerStorage> {
  const hierarchy = new Hierarchy()
  const triggers = new Triggers(hierarchy)
  const adapters = new Map<string, DbAdapter>()
  const modelDb = new ModelDb(hierarchy)

  const storageAdapter = conf.storageFactory?.()

  for (const key in conf.adapters) {
    const adapterConf = conf.adapters[key]
    adapters.set(
      key,
      await adapterConf.factory(ctx, hierarchy, adapterConf.url, conf.workspace, modelDb, storageAdapter)
    )
  }

  const txAdapter = adapters.get(conf.domains[DOMAIN_TX]) as TxAdapter

  const model = await ctx.with('get model', {}, async (ctx) => {
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
    return model
  })

  for (const [adn, adapter] of adapters) {
    await ctx.with('init-adapter', { name: adn }, async (ctx) => {
      await adapter.init(model)
    })
  }

  const fulltextAdapter = await ctx.with(
    'create full text adapter',
    {},
    async (ctx) =>
      await conf.fulltextAdapter.factory(
        conf.fulltextAdapter.url,
        conf.workspace,
        conf.metrics.newChild('🗒️ fulltext', {})
      )
  )

  const metrics = conf.metrics.newChild('📔 server-storage', {})

  const contentAdapter = await ctx.with(
    'create content adapter',
    {},
    async (ctx) =>
      await createContentAdapter(
        conf.contentAdapters,
        conf.defaultContentAdapter,
        conf.workspace,
        metrics.newChild('content', {})
      )
  )

  const defaultAdapter = adapters.get(conf.defaultAdapter)
  if (defaultAdapter === undefined) {
    throw new Error(`No Adapter for ${DOMAIN_DOC_INDEX_STATE}`)
  }

  const serviceAdaptersManager = await createServiceAdaptersManager(
    conf.serviceAdapters,
    conf.metrics.newChild('🔌 service adapters', {})
  )

  const indexFactory = (storage: ServerStorage): FullTextIndex => {
    if (storageAdapter === undefined) {
      throw new Error('No storage adapter')
    }
    const stages = conf.fulltextAdapter.stages(fulltextAdapter, storage, storageAdapter, contentAdapter)

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
    serviceAdaptersManager,
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
export function createNullStorageFactory (): StorageAdapter {
  return {
    initialize: async (ctx, workspaceId) => {},
    exists: async (ctx, workspaceId: WorkspaceId) => {
      return false
    },
    make: async (ctx, workspaceId: WorkspaceId) => {},
    remove: async (ctx, workspaceId: WorkspaceId, objectNames: string[]) => {},
    delete: async (ctx, workspaceId: WorkspaceId) => {},
    list: async (ctx, workspaceId: WorkspaceId, prefix?: string) => [],
    stat: async (ctx, workspaceId: WorkspaceId, objectName: string) => ({}) as any,
    get: async (ctx, workspaceId: WorkspaceId, objectName: string) => ({}) as any,
    put: async (ctx, workspaceId: WorkspaceId, objectName: string, stream: any, contentType: string, size?: number) =>
      ({}) as any,
    read: async (ctx, workspaceId: WorkspaceId, name: string) => ({}) as any,
    partial: async (ctx, workspaceId: WorkspaceId, objectName: string, offset: number, length?: number) => ({}) as any
  }
}

export { AggregatorStorageAdapter, buildStorage } from './aggregator'
