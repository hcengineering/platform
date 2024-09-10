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
  type MeasureContext
} from '@hcengineering/core'
import { createElasticAdapter, createElasticBackupDataAdapter } from '@hcengineering/elastic'
import {
  ApplyTxMiddleware,
  BroadcastMiddleware,
  ConfigurationMiddleware,
  ContextNameMiddleware,
  DBAdapterHelperMiddleware,
  DBAdapterMiddleware,
  DomainFindMiddleware,
  DomainTxMiddleware,
  LiveQueryMiddleware,
  LookupMiddleware,
  LowLevelMiddleware,
  MarkDerivedEntryMiddleware,
  ModelMiddleware,
  ModifiedMiddleware,
  PrivateMiddleware,
  QueryJoinMiddleware,
  SpacePermissionsMiddleware,
  SpaceSecurityMiddleware,
  TriggersMiddleware,
  TxMiddleware
} from '@hcengineering/middleware'
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
  FullTextMiddleware,
  type DbConfiguration,
  type MiddlewareCreator,
  type PipelineContext,
  type PipelineFactory,
  type StorageAdapter
} from '@hcengineering/server-core'
import { createIndexStages } from './indexing'

/**
 * @public
 */

export function createServerPipeline (
  metrics: MeasureContext,
  dbUrl: string,
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
  return (ctx, workspace, upgrade, broadcast, branding) => {
    const metricsCtx = opt.usePassedCtx === true ? ctx : metrics
    const wsMetrics = metricsCtx.newChild('🧲 session', {})
    const conf: DbConfiguration = {
      domains: {
        [DOMAIN_TX]: 'MongoTx',
        [DOMAIN_TRANSIENT]: 'InMemory',
        [DOMAIN_BLOB]: 'StorageData',
        [DOMAIN_FULLTEXT_BLOB]: 'FullTextBlob',
        [DOMAIN_MODEL]: 'Null',
        [DOMAIN_BENCHMARK]: 'Benchmark',
        ...extensions?.domains
      },
      metrics: wsMetrics,
      defaultAdapter: extensions?.defaultAdapter ?? 'Mongo',
      adapters: {
        MongoTx: {
          factory: createMongoTxAdapter,
          url: dbUrl
        },
        Mongo: {
          factory: createMongoAdapter,
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
          url: dbUrl
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

    const middlewares: MiddlewareCreator[] = [
      LookupMiddleware.create,
      ModifiedMiddleware.create,
      PrivateMiddleware.create,
      SpaceSecurityMiddleware.create,
      SpacePermissionsMiddleware.create,
      ConfigurationMiddleware.create,
      LowLevelMiddleware.create,
      ContextNameMiddleware.create,
      MarkDerivedEntryMiddleware.create,
      ApplyTxMiddleware.create, // Extract apply
      TxMiddleware.create, // Store tx into transaction domain
      ...(opt.disableTriggers === true ? [] : [TriggersMiddleware.create]),
      FullTextMiddleware.create(conf, upgrade),
      QueryJoinMiddleware.create,
      LiveQueryMiddleware.create,
      DomainFindMiddleware.create,
      DomainTxMiddleware.create,
      DBAdapterHelperMiddleware.create,
      ModelMiddleware.create,
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
