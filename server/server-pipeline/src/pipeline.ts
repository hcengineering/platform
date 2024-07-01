/* eslint-disable @typescript-eslint/unbound-method */
import {
  DOMAIN_BENCHMARK,
  DOMAIN_BLOB,
  DOMAIN_FULLTEXT_BLOB,
  DOMAIN_MODEL,
  DOMAIN_TRANSIENT,
  DOMAIN_TX,
  type BrandingMap,
  type MeasureContext
} from '@hcengineering/core'
import { createElasticAdapter, createElasticBackupDataAdapter } from '@hcengineering/elastic'
import {
  BlobLookupMiddleware,
  ConfigurationMiddleware,
  LookupMiddleware,
  ModifiedMiddleware,
  PrivateMiddleware,
  QueryJoinMiddleware,
  SpacePermissionsMiddleware,
  SpaceSecurityMiddleware
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
  type DbConfiguration,
  type MiddlewareCreator,
  type StorageAdapter,
  type StorageConfiguration
} from '@hcengineering/server-core'
import { type PipelineFactory, type ServerFactory } from '@hcengineering/server-ws'
import { createIndexStages } from './indexing'

/**
 * @public
 */

export function createServerPipeline (
  metrics: MeasureContext,
  dbUrl: string,
  opt: {
    fullTextUrl: string
    storageConfig: StorageConfiguration
    rekoniUrl: string
    port: number
    productId: string
    brandingMap: BrandingMap
    serverFactory: ServerFactory

    indexProcessing: number // 1000
    indexParallel: number // 2

    externalStorage: StorageAdapter
  },
  extensions?: Partial<DbConfiguration>
): PipelineFactory {
  const middlewares: MiddlewareCreator[] = [
    LookupMiddleware.create,
    BlobLookupMiddleware.create,
    ModifiedMiddleware.create,
    PrivateMiddleware.create,
    SpaceSecurityMiddleware.create,
    SpacePermissionsMiddleware.create,
    ConfigurationMiddleware.create,
    QueryJoinMiddleware.create
  ]
  return (ctx, workspace, upgrade, broadcast, branding) => {
    const wsMetrics = metrics.newChild('🧲 session', {})
    const conf: DbConfiguration = {
      domains: {
        [DOMAIN_TX]: 'MongoTx',
        [DOMAIN_TRANSIENT]: 'InMemory',
        [DOMAIN_BLOB]: 'StorageData',
        [DOMAIN_FULLTEXT_BLOB]: 'FullTextBlob',
        [DOMAIN_MODEL]: 'Null',
        [DOMAIN_BENCHMARK]: 'Benchmark'
      },
      metrics: wsMetrics,
      defaultAdapter: 'Mongo',
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
        }
      },
      fulltextAdapter: {
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
      serviceAdapters: {},
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
        }
      },
      defaultContentAdapter: 'Rekoni',
      storageFactory: opt.externalStorage,
      workspace
    }
    return createPipeline(ctx, conf, middlewares, upgrade, broadcast, branding)
  }
}
