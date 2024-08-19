/* eslint-disable @typescript-eslint/unbound-method */
import {
  type Branding,
  DOMAIN_BENCHMARK,
  DOMAIN_BLOB,
  DOMAIN_FULLTEXT_BLOB,
  DOMAIN_MODEL,
  DOMAIN_TRANSIENT,
  DOMAIN_TX,
  type WorkspaceIdWithUrl,
  type MeasureContext
} from '@hcengineering/core'
import { createElasticAdapter, createElasticBackupDataAdapter } from '@hcengineering/elastic'
import {
  ConfigurationMiddleware,
  LookupMiddleware,
  ModifiedMiddleware,
  PrivateMiddleware,
  QueryJoinMiddleware,
  SpacePermissionsMiddleware,
  SpaceSecurityMiddleware
} from '@hcengineering/middleware'
import { createPostgresAdapter, createPostgresTxAdapter } from '@hcengineering/postgres'
import { createMongoAdapter, createMongoTxAdapter } from '@hcengineering/mongo'
import {
  createNullAdapter,
  createRekoniAdapter,
  createStorageDataAdapter,
  createYDocAdapter
} from '@hcengineering/server'
import {
  createBenchmarkAdapter,
  createInMemoryAdapter,
  createPipeline,
  type DbAdapterFactory,
  type DbConfiguration,
  type MiddlewareCreator,
  type PipelineFactory,
  type StorageAdapter
} from '@hcengineering/server-core'
import { createIndexStages } from './indexing'

/**
 * @public
 */

export function getTxAdapterFactory (
  metrics: MeasureContext,
  dbUrls: string,
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
  const conf = getConfig(metrics, dbUrls, workspace, branding, metrics, opt, extensions)
  const adapterName = conf.domains[DOMAIN_TX] ?? conf.defaultAdapter
  const adapter = conf.adapters[adapterName]
  return adapter.factory
}

/**
 * @public
 */

export function createServerPipeline (
  metrics: MeasureContext,
  dbUrls: string,
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
): PipelineFactory {
  const middlewares: MiddlewareCreator[] = [
    LookupMiddleware.create,
    ModifiedMiddleware.create,
    PrivateMiddleware.create,
    SpaceSecurityMiddleware.create,
    SpacePermissionsMiddleware.create,
    ConfigurationMiddleware.create,
    QueryJoinMiddleware.create
  ]
  return (ctx, workspace, upgrade, broadcast, branding) => {
    const conf = getConfig(metrics, dbUrls, workspace, branding, ctx, opt, extensions)
    return createPipeline(ctx, conf, middlewares, upgrade, broadcast, branding, opt.disableTriggers)
  }
}

function getConfig (
  metrics: MeasureContext,
  dbUrls: string,
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
  extensions?: Partial<DbConfiguration>
): DbConfiguration {
  const metricsCtx = opt.usePassedCtx === true ? ctx : metrics
  const wsMetrics = metricsCtx.newChild('🧲 session', {})
  const [dbUrl, mongoUrl] = dbUrls.split(';')
  const conf: DbConfiguration = {
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
        factory: mongoUrl !== undefined ? createPostgresTxAdapter : createMongoTxAdapter,
        url: dbUrl
      },
      Main: {
        factory: mongoUrl !== undefined ? createPostgresAdapter : createMongoAdapter,
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
        url: mongoUrl ?? dbUrl
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
    defaultContentAdapter: extensions?.defaultContentAdapter ?? 'Rekoni',
    storageFactory: opt.externalStorage,
    workspace
  }
  return conf
}
