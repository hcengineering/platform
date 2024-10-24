/* eslint-disable @typescript-eslint/unbound-method */
import {
  DOMAIN_BENCHMARK,
  DOMAIN_BLOB,
  DOMAIN_FULLTEXT_BLOB,
  DOMAIN_MODEL,
  DOMAIN_TRANSIENT,
  DOMAIN_TX,
  Hierarchy,
  ModelDb,
  type Branding,
  type MeasureContext,
  type Tx,
  type WorkspaceIdWithUrl
} from '@hcengineering/core'
import { createElasticAdapter, createElasticBackupDataAdapter } from '@hcengineering/elastic'
import {
  ApplyTxMiddleware,
  BroadcastMiddleware,
  ConfigurationMiddleware,
  ConnectionMgrMiddleware,
  ContextNameMiddleware,
  DBAdapterInitMiddleware,
  DBAdapterMiddleware,
  DomainFindMiddleware,
  DomainTxMiddleware,
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
import { createMongoAdapter, createMongoTxAdapter } from '@hcengineering/mongo'
import { createPostgresAdapter, createPostgresTxAdapter } from '@hcengineering/postgres'
import {
  createBenchmarkAdapter,
  createInMemoryAdapter,
  createNullAdapter,
  createPipeline,
  DummyDbAdapter,
  DummyFullTextAdapter,
  type DbAdapterFactory,
  type DbConfiguration,
  type Middleware,
  type MiddlewareCreator,
  type Pipeline,
  type PipelineContext,
  type PipelineFactory,
  type StorageAdapter,
  type StorageConfiguration
} from '@hcengineering/server-core'
import {
  createRekoniAdapter,
  createYDocAdapter,
  FullTextMiddleware,
  type FulltextDBConfiguration
} from '@hcengineering/server-indexer'
import { buildStorageFromConfig, createStorageDataAdapter, storageConfigFromEnv } from '@hcengineering/server-storage'
import { createIndexStages } from './indexing'

/**
 * @public
 */

export function getTxAdapterFactory (
  metrics: MeasureContext,
  dbUrl: string,
  workspace: WorkspaceIdWithUrl,
  branding: Branding | null,
  opt: {
    fullTextUrl: string
    rekoniUrl: string
    indexProcessing: number // 1000
    indexParallel: number // 2
    disableTriggers?: boolean
    usePassedCtx?: boolean

    externalStorage: StorageAdapter
  },
  extensions?: Partial<DbConfiguration>
): DbAdapterFactory {
  const conf = getConfig(metrics, dbUrl, workspace, branding, metrics, opt, extensions)
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
    fullTextUrl: string
    rekoniUrl: string
    indexProcessing: number // 1000
    indexParallel: number // 2
    disableTriggers?: boolean
    usePassedCtx?: boolean
    adapterSecurity?: boolean

    externalStorage: StorageAdapter
  },
  extensions?: Partial<DbConfiguration> & Partial<FulltextDBConfiguration>
): PipelineFactory {
  return (ctx, workspace, upgrade, broadcast, branding) => {
    const metricsCtx = opt.usePassedCtx === true ? ctx : metrics
    const wsMetrics = metricsCtx.newChild('🧲 session', {})
    const conf = getConfig(metrics, dbUrl, workspace, branding, wsMetrics, opt, extensions)

    const middlewares: MiddlewareCreator[] = [
      LookupMiddleware.create,
      ModifiedMiddleware.create,
      PrivateMiddleware.create,
      NotificationsMiddleware.create,
      (ctx: MeasureContext, context: PipelineContext, next?: Middleware) =>
        SpaceSecurityMiddleware.create(opt.adapterSecurity ?? false, ctx, context, next),
      SpacePermissionsMiddleware.create,
      ConfigurationMiddleware.create,
      LowLevelMiddleware.create,
      ContextNameMiddleware.create,
      ConnectionMgrMiddleware.create,
      MarkDerivedEntryMiddleware.create,
      ApplyTxMiddleware.create, // Extract apply
      TxMiddleware.create, // Store tx into transaction domain
      ...(opt.disableTriggers === true ? [] : [TriggersMiddleware.create]),
      FullTextMiddleware.create(conf, upgrade),
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
    const conf = getConfig(
      metrics,
      dbUrl,
      workspace,
      branding,
      wsMetrics,
      {
        ...opt,
        fullTextUrl: '',
        indexParallel: 0,
        indexProcessing: 0,
        rekoniUrl: '',
        disableTriggers: true
      },
      {
        adapters: {
          FullTextBlob: {
            factory: async () => new DummyDbAdapter(),
            url: ''
          }
        },
        fulltextAdapter: {
          factory: async () => new DummyFullTextAdapter(),
          stages: () => [],
          url: ''
        }
      }
    )

    const middlewares: MiddlewareCreator[] = [
      LowLevelMiddleware.create,
      ContextNameMiddleware.create,
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
  wsUrl: WorkspaceIdWithUrl
): Promise<{
    pipeline: Pipeline
    storageAdapter: StorageAdapter
  }> {
  const storageConfig: StorageConfiguration = storageConfigFromEnv()

  const storageAdapter = buildStorageFromConfig(storageConfig)

  const pipelineFactory = createServerPipeline(
    ctx,
    dbUrl,
    model,
    {
      externalStorage: storageAdapter,
      fullTextUrl: 'http://localhost:9200',
      indexParallel: 0,
      indexProcessing: 0,
      rekoniUrl: '',
      usePassedCtx: true,
      disableTriggers: false
    },
    {
      fulltextAdapter: {
        factory: async () => new DummyFullTextAdapter(),
        url: '',
        stages: (adapter, storage, storageAdapter, contentAdapter) =>
          createIndexStages(
            ctx.newChild('stages', {}),
            wsUrl,
            null,
            adapter,
            storage,
            storageAdapter,
            contentAdapter,
            0,
            0
          )
      }
    }
  )

  try {
    return {
      pipeline: await pipelineFactory(ctx, wsUrl, true, () => {}, null),
      storageAdapter
    }
  } catch (err: any) {
    await storageAdapter.close()
    throw err
  }
}

export function getConfig (
  metrics: MeasureContext,
  dbUrl: string,
  workspace: WorkspaceIdWithUrl,
  branding: Branding | null,
  ctx: MeasureContext,
  opt: {
    fullTextUrl: string
    rekoniUrl: string
    indexProcessing: number // 1000
    indexParallel: number // 2
    disableTriggers?: boolean
    usePassedCtx?: boolean

    externalStorage: StorageAdapter
  },
  extensions?: Partial<DbConfiguration & FulltextDBConfiguration>
): DbConfiguration {
  const metricsCtx = opt.usePassedCtx === true ? ctx : metrics
  const wsMetrics = metricsCtx.newChild('🧲 session', {})
  const conf: DbConfiguration & FulltextDBConfiguration = {
    domains: {
      [DOMAIN_TX]: 'Tx',
      [DOMAIN_TRANSIENT]: 'InMemory',
      [DOMAIN_BLOB]: 'StorageData',
      [DOMAIN_FULLTEXT_BLOB]: 'FullTextBlob',
      [DOMAIN_MODEL]: 'Null',
      [DOMAIN_BENCHMARK]: 'Benchmark',
      ...extensions?.domains
    },
    metrics: wsMetrics,
    defaultAdapter: extensions?.defaultAdapter ?? 'Main',
    adapters: {
      Tx: {
        factory: dbUrl.startsWith('postgresql') ? createPostgresTxAdapter : createMongoTxAdapter,
        url: dbUrl
      },
      Main: {
        factory: dbUrl.startsWith('postgresql') ? createPostgresAdapter : createMongoAdapter,
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
      FullTextBlob: {
        factory: createElasticBackupDataAdapter,
        url: opt.fullTextUrl
      },
      Benchmark: {
        factory: createBenchmarkAdapter,
        url: ''
      },
      ...extensions?.adapters
    },
    fulltextAdapter: extensions?.fulltextAdapter ?? {
      factory: createElasticAdapter,
      url: opt.fullTextUrl,
      stages: (adapter, storage, storageAdapter, contentAdapter) =>
        createIndexStages(
          wsMetrics.newChild('stages', {}),
          workspace,
          branding,
          adapter,
          storage,
          storageAdapter,
          contentAdapter,
          opt.indexParallel,
          opt.indexProcessing
        )
    },
    serviceAdapters: extensions?.serviceAdapters ?? {},
    contentAdapters: {
      Rekoni: {
        factory: createRekoniAdapter,
        contentType: '*',
        url: opt.rekoniUrl
      },
      YDoc: {
        factory: createYDocAdapter,
        contentType: 'application/ydoc',
        url: ''
      },
      ...extensions?.contentAdapters
    },
    defaultContentAdapter: extensions?.defaultContentAdapter ?? 'Rekoni'
  }
  return conf
}
