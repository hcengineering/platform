/* eslint-disable @typescript-eslint/unbound-method */
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
  type MeasureContext,
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
  IdentityMiddleware,
  LiveQueryMiddleware,
  LookupMiddleware,
  LowLevelMiddleware,
  MarkDerivedEntryMiddleware,
  ModelMiddleware,
  ModifiedMiddleware,
  PluginConfigurationMiddleware,
  PrivateMiddleware,
  QueryJoinMiddleware,
  QueueMiddleware,
  SpacePermissionsMiddleware,
  SpaceSecurityMiddleware,
  TriggersMiddleware,
  TxMiddleware,
  UserStatusMiddleware,
  GuestPermissionsMiddleware
} from '@hcengineering/middleware'
import {
  createBenchmarkAdapter,
  createInMemoryAdapter,
  createNullAdapter,
  createPipeline,
  type BroadcastOps,
  type CommunicationApiFactory,
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
import { CommunicationMiddleware } from './communication'

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
    communicationApiFactory?: CommunicationApiFactory
  },
  extensions?: Partial<DbConfiguration>
): PipelineFactory {
  return (ctx, workspace, broadcast, branding) => {
    const metricsCtx = opt.usePassedCtx === true ? ctx : metrics
    const wsMetrics = metricsCtx.newChild('🧲 session', {}, { span: false })
    const conf = getConfig(metrics, dbUrl, wsMetrics, opt, extensions)

    const middlewares: MiddlewareCreator[] = [
      LookupMiddleware.create,
      IdentityMiddleware.create,
      ModifiedMiddleware.create,
      FindSecurityMiddleware.create,
      PluginConfigurationMiddleware.create,
      PrivateMiddleware.create,
      (ctx: MeasureContext, context: PipelineContext, next?: Middleware) =>
        SpaceSecurityMiddleware.create(opt.adapterSecurity ?? false, ctx, context, next),
      SpacePermissionsMiddleware.create,
      GuestPermissionsMiddleware.create,
      ConfigurationMiddleware.create,
      ContextNameMiddleware.create,
      MarkDerivedEntryMiddleware.create,
      ...(opt.communicationApiFactory !== undefined
        ? [CommunicationMiddleware.create(opt.communicationApiFactory)]
        : []),
      UserStatusMiddleware.create,
      ApplyTxMiddleware.create, // Extract apply
      TxMiddleware.create, // Store tx into transaction domain
      ...(opt.disableTriggers === true ? [] : [TriggersMiddleware.create]),
      ...(opt.fulltextUrl !== undefined
        ? [
            FullTextMiddleware.create(
              opt.fulltextUrl,
              generateToken(systemAccountUuid, workspace.uuid, { service: 'transactor' })
            )
          ]
        : []),
      LowLevelMiddleware.create,
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
    const context: PipelineContext = {
      workspace,
      branding,
      modelDb,
      hierarchy,
      queue: opt.queue,
      storageAdapter: opt.externalStorage,
      contextVars: opt.pipelineContextVars ?? {}
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
    communicationApiFactory?: CommunicationApiFactory
  }
): Promise<Pipeline> {
  const pipelineFactory = createServerPipeline(ctx, dbUrl, model, {
    externalStorage: storageAdapter,
    usePassedCtx: true,
    disableTriggers: opt?.disableTriggers ?? false,
    adapterSecurity: isAdapterSecurity(dbUrl),
    queue: opt?.queue,
    communicationApiFactory: opt?.communicationApiFactory
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
