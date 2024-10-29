/* eslint-disable @typescript-eslint/unbound-method */
import {
  DOMAIN_BENCHMARK,
  DOMAIN_BLOB,
  DOMAIN_FULLTEXT_BLOB,
  DOMAIN_MODEL,
  DOMAIN_TRANSIENT,
  DOMAIN_TX,
  Hierarchy,
  MeasureContext,
  ModelDb,
  type Branding,
  type Tx,
  type WorkspaceIdWithUrl
} from '@hcengineering/core'
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
import { createPostgresAdapter, createPostgresTxAdapter } from '@hcengineering/postgres'
import {
  createBenchmarkAdapter,
  createInMemoryAdapter,
  createNullAdapter,
  createPipeline,
  DbConfiguration,
  // FullTextMiddleware,
  Pipeline,
  type BroadcastFunc,
  type Middleware,
  type MiddlewareCreator,
  type PipelineContext
} from '@hcengineering/server-core'

export async function createaPipeline (
  ctx: MeasureContext,
  dbUrl: string,
  model: Tx[],
  branding: Branding | null,
  workspace: WorkspaceIdWithUrl,
  broadcast: BroadcastFunc
): Promise<Pipeline> {
  const wsMetrics = ctx.newChild('🧲 session', {})
  const conf: DbConfiguration = {
    domains: {
      [DOMAIN_TX]: 'Tx',
      [DOMAIN_TRANSIENT]: 'InMemory',
      [DOMAIN_BLOB]: 'StorageData',
      [DOMAIN_FULLTEXT_BLOB]: 'FullTextBlob',
      [DOMAIN_MODEL]: 'Null',
      [DOMAIN_BENCHMARK]: 'Benchmark'
    },
    metrics: wsMetrics,
    defaultAdapter: 'Main',
    adapters: {
      Tx: {
        factory: createPostgresTxAdapter,
        url: dbUrl
      },
      Main: {
        factory: createPostgresAdapter,
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
      // TODO: Storage Data is not supported yet.
      // StorageData: {
      //   factory: createStorageDataAdapter,
      //   url: mongoUrl ?? dbUrl
      // },
      // TODO: Fix full text search
      // FullTextBlob: {
      //   factory: createElasticBackupDataAdapter,
      //   url: opt.fullTextUrl
      // },
      Benchmark: {
        factory: createBenchmarkAdapter,
        url: ''
      }
    },
    serviceAdapters: {},
    contentAdapters: {},
    defaultContentAdapter: ''
  }

  const middlewares: MiddlewareCreator[] = [
    LookupMiddleware.create,
    ModifiedMiddleware.create,
    PrivateMiddleware.create,
    (ctx: MeasureContext, context: PipelineContext, next?: Middleware) =>
      SpaceSecurityMiddleware.create(false, ctx, context, next),
    SpacePermissionsMiddleware.create,
    ConfigurationMiddleware.create,
    ContextNameMiddleware.create,
    ConnectionMgrMiddleware.create,
    MarkDerivedEntryMiddleware.create,
    ApplyTxMiddleware.create, // Extract apply
    TxMiddleware.create, // Store tx into transaction domain
    TriggersMiddleware.create,
    // TODO: Add Full text state update middleware
    // FullTextMiddleware.create(conf, false), // TODO: Fix Fulltext search
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
    hierarchy
  }
  return await createPipeline(ctx, middlewares, context)
}
