//
// Copyright © 2026 TraceX SAS.
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

/* eslint-disable @typescript-eslint/unbound-method */
import card from '@hcengineering/card'
import {
  DOMAIN_BENCHMARK,
  DOMAIN_BLOB,
  DOMAIN_MODEL,
  DOMAIN_TRANSIENT,
  DOMAIN_TX,
  Hierarchy,
  ModelDb,
  systemAccountUuid,
  type Branding,
  type Class,
  type Doc,
  type MeasureContext,
  type Ref,
  type Tx,
  type WorkspaceIds
} from '@hcengineering/core'
import {
  ApplyTxMiddleware,
  BroadcastMiddleware,
  ConfigurationMiddleware,
  ContextNameMiddleware,
  DBAdapterInitMiddleware,
  DBAdapterMiddleware,
  DomainFindMiddleware,
  DomainTxMiddleware,
  FindSecurityMiddleware,
  FullTextMiddleware,
  GuestPermissionsMiddleware,
  GuestPersonMiddleware,
  IdentityMiddleware,
  LiveQueryMiddleware,
  LookupMiddleware,
  LowLevelMiddleware,
  MarkDerivedEntryMiddleware,
  ModelMiddleware,
  ModifiedMiddleware,
  IdentifierMiddleware,
  NormalizeTxMiddleware,
  ObjectAccessMarkerMiddleware,
  ObjectProjectionMiddleware,
  ObjectSecurityMiddleware,
  PluginConfigurationMiddleware,
  PrivateMiddleware,
  QueryJoinMiddleware,
  QueueMiddleware,
  RankMiddleware,
  SpacePermissionsMiddleware,
  SpaceSecurityMiddleware,
  VersioningMiddleware,
  TriggersMiddleware,
  TxMiddleware,
  TxOrderingMiddleware,
  UserStatusMiddleware,
  TransientMiddleware
} from '@hcengineering/middleware'
import {
  createBenchmarkAdapter,
  createInMemoryAdapter,
  createNullAdapter,
  createPipeline,
  type BroadcastOps,
  type DbAdapterFactory,
  type DbConfiguration,
  type Middleware,
  type MiddlewareCreator,
  type Pipeline,
  type PipelineContext,
  type PipelineFactory,
  type PlatformQueue,
  type StorageAdapter,
  type WorkspaceDestroyAdapter
} from '@hcengineering/server-core'
import { generateToken } from '@hcengineering/server-token'
import { createStorageDataAdapter } from './blobStorage'

import { RatingMiddleware } from '@hcengineering/server-rating'

/**
 * @public
 */

export function getTxAdapterFactory (
  metrics: MeasureContext,
  dbUrl: string,
  workspace: WorkspaceIds,
  branding: Branding | null,
  opt: {
    disableTriggers?: boolean
    usePassedCtx?: boolean

    externalStorage: StorageAdapter
  },
  extensions?: Partial<DbConfiguration>
): DbAdapterFactory {
  const conf = getConfig(metrics, dbUrl, metrics, opt, extensions)
  const adapterName = conf.domains[DOMAIN_TX] ?? conf.defaultAdapter
  const adapter = conf.adapters[adapterName]
  return adapter.factory
}

function addMessagesToFullText (fulltext: MiddlewareCreator): MiddlewareCreator {
  return async (ctx: MeasureContext, context: PipelineContext, next?: Middleware) => {
    const result: FullTextMiddleware = (await fulltext(ctx, context, next)) as FullTextMiddleware
    result.addExtraFind = (baseClass, childClasses) => {
      if (context.hierarchy.isDerived(baseClass, card.class.Card)) {
        // Using Card as base class because messages are the same for any card subclass
        childClasses.add(`${card.class.Card}%message` as Ref<Class<Doc>>)
      }
    }
    return result
  }
}

/**
 * @public
 */

export function createServerPipeline (
  metrics: MeasureContext,
  dbUrl: string,
  model: Tx[],
  opt: {
    fulltextUrl?: string
    disableTriggers?: boolean
    usePassedCtx?: boolean
    adapterSecurity?: boolean

    externalStorage: StorageAdapter

    queue?: PlatformQueue

    extraLogging?: boolean // If passed, will log every request/etc.
    pipelineContextVars?: Record<string, any>
  },
  extensions?: Partial<DbConfiguration>
): PipelineFactory {
  return (ctx, workspace, broadcast, branding) => {
    const metricsCtx = opt.usePassedCtx === true ? ctx : metrics
    const wsMetrics = metricsCtx.newChild('🧲 session', {}, { span: false })
    const conf = getConfig(metrics, dbUrl, wsMetrics, opt, extensions)

    const middlewares: MiddlewareCreator[] = [
      LookupMiddleware.create,
      NormalizeTxMiddleware.create,
      IdentityMiddleware.create,
      ModifiedMiddleware.create,
      RankMiddleware.create,
      FindSecurityMiddleware.create,
      ObjectProjectionMiddleware.create,
      PluginConfigurationMiddleware.create,
      PrivateMiddleware.create,
      (ctx: MeasureContext, context: PipelineContext, next?: Middleware) =>
        SpaceSecurityMiddleware.create(opt.adapterSecurity ?? false, ctx, context, next),
      ObjectSecurityMiddleware.create, // Object-level access policies for user requests
      SpacePermissionsMiddleware.create,
      GuestPermissionsMiddleware.create,
      GuestPersonMiddleware.create, // Limit person listing for guests
      ConfigurationMiddleware.create,
      ContextNameMiddleware.create,
      MarkDerivedEntryMiddleware.create,
      UserStatusMiddleware.create,
      ApplyTxMiddleware.create, // Extract apply
      ObjectAccessMarkerMiddleware.create, // Mark documents of restricted objects, sees derived txes too
      VersioningMiddleware.create,
      IdentifierMiddleware.create, // After ApplyTx to ensure that it pass
      RatingMiddleware.create, // Rating editing restrictions
      TransientMiddleware.create,
      TxMiddleware.create, // Store tx into transaction domain
      ...(opt.disableTriggers === true ? [] : [TriggersMiddleware.create]),
      ...(opt.fulltextUrl !== undefined
        ? [
            addMessagesToFullText(
              FullTextMiddleware.create(
                opt.fulltextUrl,
                generateToken(systemAccountUuid, workspace.uuid, { service: 'transactor' })
              )
            )
          ]
        : []),
      LowLevelMiddleware.create,
      TxOrderingMiddleware.create(),
      QueryJoinMiddleware.create,
      LiveQueryMiddleware.create,
      DomainFindMiddleware.create,
      DomainTxMiddleware.create,
      ...(opt.queue !== undefined ? [QueueMiddleware.create(opt.queue)] : []),
      DBAdapterInitMiddleware.create,
      ModelMiddleware.create(model),
      DBAdapterMiddleware.create(conf), // Configure DB adapters
      BroadcastMiddleware.create(broadcast)
    ]

    const hierarchy = new Hierarchy()
    const modelDb = new ModelDb(hierarchy)
    const contextVars = opt.pipelineContextVars ?? {}
    const context: PipelineContext = {
      workspace,
      branding,
      modelDb,
      hierarchy,
      queue: opt.queue,
      storageAdapter: opt.externalStorage,
      contextVars,
      // Seed from the boot last-tx cache so a restart with no data change reconnects clients
      // as Reconnected instead of Refresh (see pods/server loadLastTxCache).
      lastTx: (contextVars.lastTxCache as Map<string, Ref<Tx>> | undefined)?.get(workspace.uuid)
    }
    return createPipeline(ctx, middlewares, context)
  }
}

/**
 * @public
 */

export function createBackupPipeline (
  metrics: MeasureContext,
  dbUrl: string,
  systemTx: Tx[],
  opt: {
    usePassedCtx?: boolean
    adapterSecurity?: boolean

    externalStorage: StorageAdapter
  }
): PipelineFactory {
  return (ctx, workspace, broadcast, branding) => {
    const metricsCtx = opt.usePassedCtx === true ? ctx : metrics
    const wsMetrics = metricsCtx.newChild('🧲 backup', {}, { span: false })
    const conf = getConfig(metrics, dbUrl, wsMetrics, {
      ...opt,
      disableTriggers: true
    })

    const middlewares: MiddlewareCreator[] = [
      LowLevelMiddleware.create,
      ContextNameMiddleware.create,
      // ConnectionMgrMiddleware.create,
      DomainFindMiddleware.create,
      DBAdapterInitMiddleware.create,
      ModelMiddleware.create(systemTx),
      DBAdapterMiddleware.create(conf)
    ]

    const hierarchy = new Hierarchy()
    const modelDb = new ModelDb(hierarchy)
    const context: PipelineContext = {
      workspace,
      branding,
      modelDb,
      hierarchy,
      storageAdapter: opt.externalStorage,
      contextVars: {}
    }
    return createPipeline(ctx, middlewares, context)
  }
}

export function createEmptyBroadcastOps (): BroadcastOps {
  return {
    broadcast: (): void => {},
    broadcastSessions: (): void => {}
  }
}

export async function getServerPipeline (
  ctx: MeasureContext,
  model: Tx[],
  dbUrl: string,
  wsUrl: WorkspaceIds,
  storageAdapter: StorageAdapter,
  opt?: {
    queue?: PlatformQueue
    disableTriggers?: boolean
  }
): Promise<Pipeline> {
  const pipelineFactory = createServerPipeline(ctx, dbUrl, model, {
    externalStorage: storageAdapter,
    usePassedCtx: true,
    disableTriggers: opt?.disableTriggers ?? false,
    adapterSecurity: isAdapterSecurity(dbUrl),
    queue: opt?.queue
  })

  return await pipelineFactory(ctx, wsUrl, createEmptyBroadcastOps(), null)
}

const txAdapterFactories: Record<string, DbAdapterFactory> = {}
const adapterFactories: Record<string, DbAdapterFactory> = {}
const destroyFactories: Record<string, (url: string) => WorkspaceDestroyAdapter> = {}
const adapterSecurityState = new Set<string>()

export function isAdapterSecurity (name: string): boolean {
  for (const it of adapterSecurityState) {
    if (name.startsWith(it)) {
      return true
    }
  }
  return false
}
export function setAdapterSecurity (name: string, state: boolean): void {
  if (state) {
    adapterSecurityState.add(name)
  } else {
    adapterSecurityState.delete(name)
  }
}

export function registerTxAdapterFactory (name: string, factory: DbAdapterFactory, useAsDefault: boolean = true): void {
  txAdapterFactories[name] = factory
  if (useAsDefault) {
    txAdapterFactories[''] = factory
  }
}

export function registerAdapterFactory (name: string, factory: DbAdapterFactory, useAsDefault: boolean = true): void {
  adapterFactories[name] = factory
  if (useAsDefault) {
    adapterFactories[''] = factory
  }
}

export function registerDestroyFactory (
  name: string,
  factory: (url: string) => WorkspaceDestroyAdapter,
  useAsDefault: boolean = true
): void {
  destroyFactories[name] = factory
  if (useAsDefault) {
    destroyFactories[''] = factory
  }
}

function matchTxAdapterFactory (dbUrl: string): DbAdapterFactory {
  for (const [k, v] of Object.entries(txAdapterFactories)) {
    if (k !== '' && dbUrl.startsWith(k)) {
      return v
    }
  }
  return txAdapterFactories['']
}

function matchAdapterFactory (dbUrl: string): DbAdapterFactory {
  for (const [k, v] of Object.entries(adapterFactories)) {
    if (k !== '' && dbUrl.startsWith(k)) {
      return v
    }
  }
  return adapterFactories['']
}

// Optional boot-time last-tx loader per backend (SQL specifics stay in the backend package).
// Unregistered backends -> matchLastTxLoader returns undefined; the caller skips the cache and
// clients fall back to Refresh, which is safe.
export type LastTxLoader = (ctx: MeasureContext, dbUrl: string, cache: Map<string, Ref<Tx>>) => Promise<void>
const lastTxLoaders: Record<string, LastTxLoader> = {}

export function registerLastTxLoader (name: string, loader: LastTxLoader): void {
  lastTxLoaders[name] = loader
}

export function matchLastTxLoader (dbUrl: string): LastTxLoader | undefined {
  for (const [k, v] of Object.entries(lastTxLoaders)) {
    if (k !== '' && dbUrl.startsWith(k)) {
      return v
    }
  }
  return undefined
}

export function getWorkspaceDestroyAdapter (dbUrl: string): WorkspaceDestroyAdapter {
  for (const [k, v] of Object.entries(destroyFactories)) {
    if (dbUrl.startsWith(k)) {
      return v(dbUrl)
    }
  }
  return destroyFactories[''](dbUrl)
}

export function getConfig (
  metrics: MeasureContext,
  dbUrl: string,
  ctx: MeasureContext,
  opt: {
    disableTriggers?: boolean
    usePassedCtx?: boolean

    externalStorage: StorageAdapter
  },
  extensions?: Partial<DbConfiguration>
): DbConfiguration {
  const metricsCtx = opt.usePassedCtx === true ? ctx : metrics
  const wsMetrics = metricsCtx.newChild('🧲 session', {}, { span: false })
  const conf: DbConfiguration = {
    domains: {
      [DOMAIN_TX]: 'Tx',
      [DOMAIN_TRANSIENT]: 'InMemory',
      [DOMAIN_BLOB]: 'StorageData',
      [DOMAIN_MODEL]: 'Null',
      [DOMAIN_BENCHMARK]: 'Benchmark',
      ...extensions?.domains
    },
    metrics: wsMetrics,
    defaultAdapter: extensions?.defaultAdapter ?? 'Main',
    adapters: {
      Tx: {
        factory: matchTxAdapterFactory(dbUrl),
        url: dbUrl
      },
      Main: {
        factory: matchAdapterFactory(dbUrl),
        url: dbUrl
      },
      Null: {
        factory: createNullAdapter,
        url: ''
      },
      InMemory: {
        factory: createInMemoryAdapter,
        url: ''
      },
      StorageData: {
        factory: createStorageDataAdapter,
        url: ''
      },
      Benchmark: {
        factory: createBenchmarkAdapter,
        url: ''
      },
      ...extensions?.adapters
    },
    serviceAdapters: extensions?.serviceAdapters ?? {}
  }
  return conf
}
