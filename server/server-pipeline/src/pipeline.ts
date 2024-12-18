/* eslint-disable @typescript-eslint/unbound-method */
import {
  DOMAIN_BENCHMARK,
  DOMAIN_BLOB,
  DOMAIN_MODEL,
  DOMAIN_TRANSIENT,
  DOMAIN_TX,
  Hierarchy,
  ModelDb,
  systemAccountEmail,
  type Branding,
  type MeasureContext,
  type Tx,
  type WorkspaceIdWithUrl
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
  FullTextMiddleware,
  LiveQueryMiddleware,
  LookupMiddleware,
  LowLevelMiddleware,
  MarkDerivedEntryMiddleware,
  ModelMiddleware,
  ModifiedMiddleware,
  NotificationsMiddleware,
  PrivateMiddleware,
  QueryJoinMiddleware,
  SpacePermissionsMiddleware,
  SpaceSecurityMiddleware,
  TriggersMiddleware,
  TxMiddleware
} from '@hcengineering/middleware'
import {
  createBenchmarkAdapter,
  createInMemoryAdapter,
  createNullAdapter,
  createPipeline,
  type DbAdapterFactory,
  type DbConfiguration,
  type Middleware,
  type MiddlewareCreator,
  type Pipeline,
  type PipelineContext,
  type PipelineFactory,
  type StorageAdapter,
  type WorkspaceDestroyAdapter
} from '@hcengineering/server-core'
import { generateToken } from '@hcengineering/server-token'
import { createStorageDataAdapter } from './blobStorage'
/**
 * @public
 */

export function getTxAdapterFactory (
  metrics: MeasureContext,
  dbUrl: string,
  workspace: WorkspaceIdWithUrl,
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
  },
  extensions?: Partial<DbConfiguration>
): PipelineFactory {
  return (ctx, workspace, upgrade, broadcast, branding) => {
    const metricsCtx = opt.usePassedCtx === true ? ctx : metrics
    const wsMetrics = metricsCtx.newChild('🧲 session', {})
    const conf = getConfig(metrics, dbUrl, wsMetrics, opt, extensions)

    const middlewares: MiddlewareCreator[] = [
      LookupMiddleware.create,
      ModifiedMiddleware.create,
      PrivateMiddleware.create,
      NotificationsMiddleware.create,
      (ctx: MeasureContext, context: PipelineContext, next?: Middleware) =>
        SpaceSecurityMiddleware.create(opt.adapterSecurity ?? false, ctx, context, next),
      SpacePermissionsMiddleware.create,
      ConfigurationMiddleware.create,
      ContextNameMiddleware.create,
      MarkDerivedEntryMiddleware.create,
      ApplyTxMiddleware.create, // Extract apply
      TxMiddleware.create, // Store tx into transaction domain
      ...(opt.disableTriggers === true ? [] : [TriggersMiddleware.create]),
      ...(opt.fulltextUrl !== undefined
        ? [FullTextMiddleware.create(opt.fulltextUrl, generateToken(systemAccountEmail, workspace))]
        : []),
      LowLevelMiddleware.create,
      QueryJoinMiddleware.create,
      LiveQueryMiddleware.create,
      DomainFindMiddleware.create,
      DomainTxMiddleware.create,
      DBAdapterInitMiddleware.create,
      ModelMiddleware.create(model),
      DBAdapterMiddleware.create(conf), // Configure DB adapters
      BroadcastMiddleware.create(broadcast)
    ]

    const hierarchy = new Hierarchy()
    const modelDb = new ModelDb(hierarchy)
    const context: PipelineContext = {
      workspace,
      branding,
      modelDb,
      hierarchy,
      storageAdapter: opt.externalStorage
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
  return (ctx, workspace, upgrade, broadcast, branding) => {
    const metricsCtx = opt.usePassedCtx === true ? ctx : metrics
    const wsMetrics = metricsCtx.newChild('🧲 backup', {})
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
      storageAdapter: opt.externalStorage
    }
    return createPipeline(ctx, middlewares, context)
  }
}

export async function getServerPipeline (
  ctx: MeasureContext,
  model: Tx[],
  dbUrl: string,
  wsUrl: WorkspaceIdWithUrl,
  storageAdapter: StorageAdapter,
  opt?: {
    disableTriggers?: boolean
  }
): Promise<Pipeline> {
  const pipelineFactory = createServerPipeline(ctx, dbUrl, model, {
    externalStorage: storageAdapter,
    usePassedCtx: true,
    disableTriggers: opt?.disableTriggers ?? false
  })

  return await pipelineFactory(ctx, wsUrl, true, () => {}, null)
}

const txAdapterFactories: Record<string, DbAdapterFactory> = {}
const adapterFactories: Record<string, DbAdapterFactory> = {}
const destroyFactories: Record<string, (url: string) => WorkspaceDestroyAdapter> = {}

export function registerTxAdapterFactry (name: string, factory: DbAdapterFactory, useAsDefault: boolean = true): void {
  txAdapterFactories[name] = factory
  if (useAsDefault) {
    txAdapterFactories[''] = factory
  }
}

export function registerAdapterFactry (name: string, factory: DbAdapterFactory, useAsDefault: boolean = true): void {
  adapterFactories[name] = factory
  if (useAsDefault) {
    adapterFactories[''] = factory
  }
}

export function registerDestroyFactry (
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
    if (dbUrl.startsWith(k)) {
      return v
    }
  }
  return txAdapterFactories['']
}

function matchAdapterFactory (dbUrl: string): DbAdapterFactory {
  for (const [k, v] of Object.entries(adapterFactories)) {
    if (dbUrl.startsWith(k)) {
      return v
    }
  }
  return adapterFactories['']
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
  const wsMetrics = metricsCtx.newChild('🧲 session', {})
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
