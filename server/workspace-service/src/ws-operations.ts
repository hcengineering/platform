import core, {
  getWorkspaceId,
  Hierarchy,
  ModelDb,
  systemAccountEmail,
  TxOperations,
  versionToString,
  type BaseWorkspaceInfo,
  type Branding,
  type Client,
  type Data,
  type MeasureContext,
  type Tx,
  type Version,
  type WorkspaceIdWithUrl
} from '@hcengineering/core'
import { consoleModelLogger, type MigrateOperation, type ModelLogger } from '@hcengineering/model'
import { getTransactorEndpoint } from '@hcengineering/server-client'
import {
  DummyFullTextAdapter,
  SessionDataImpl,
  type Pipeline,
  type PipelineFactory,
  type StorageConfiguration
} from '@hcengineering/server-core'
import {
  createIndexStages,
  createServerPipeline,
  getServerPipeline,
  getTxAdapterFactory,
  registerServerPlugins,
  registerStringLoaders
} from '@hcengineering/server-pipeline'
import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import { generateToken } from '@hcengineering/server-token'
import { initializeWorkspace, initModel, prepareTools, updateModel, upgradeModel } from '@hcengineering/server-tool'

function wrapPipeline (ctx: MeasureContext, pipeline: Pipeline, wsUrl: WorkspaceIdWithUrl): Client {
  const sctx = new SessionDataImpl(
    systemAccountEmail,
    'backup',
    true,
    { targets: {}, txes: [] },
    wsUrl,
    null,
    false,
    new Map(),
    new Map(),
    pipeline.context.modelDb
  )

  ctx.contextData = sctx

  return {
    findAll: async (_class, query, options) => {
      return await pipeline.findAll(ctx, _class, query, options)
    },
    findOne: async (_class, query, options) => {
      return (await pipeline.findAll(ctx, _class, query, { ...options, limit: 1 })).shift()
    },
    close: async () => {
      await pipeline.close()
    },
    getHierarchy: () => {
      return pipeline.context.hierarchy
    },
    getModel: () => {
      return pipeline.context.modelDb
    },
    searchFulltext: async (query, options) => {
      return {
        docs: [],
        total: 0
      }
    },
    tx: async (tx) => {
      return await pipeline.tx(ctx, [tx])
    },
    notify: (...tx) => {}
  }
}

/**
 * @public
 */
export async function createWorkspace (
  ctx: MeasureContext,
  version: Data<Version>,
  branding: Branding | null,
  workspaceInfo: BaseWorkspaceInfo,
  txes: Tx[],
  migrationOperation: [string, MigrateOperation][],
  handleWsEvent?: (
    event: 'ping' | 'create-started' | 'progress' | 'create-done',
    version: Data<Version>,
    progress: number,
    message?: string
  ) => Promise<void>
): Promise<void> {
  const childLogger = ctx.newChild('createWorkspace', {}, { workspace: workspaceInfo.workspace })
  const ctxModellogger: ModelLogger = {
    log: (msg, data) => {
      childLogger.info(msg, data)
    },
    error: (msg, data) => {
      childLogger.error(msg, data)
    }
  }

  const createPingHandle = setInterval(() => {
    void handleWsEvent?.('ping', version, 0)
  }, 5000)

  try {
    const wsUrl: WorkspaceIdWithUrl = {
      name: workspaceInfo.workspace,
      workspaceName: workspaceInfo.workspaceName ?? '',
      workspaceUrl: workspaceInfo.workspaceUrl ?? ''
    }

    const wsId = getWorkspaceId(workspaceInfo.workspace)

    await handleWsEvent?.('create-started', version, 10)

    const { mongodbUri, dbUrl } = prepareTools([])
    const dbUrls = dbUrl !== undefined ? `${dbUrl};${mongodbUri}` : mongodbUri
    const hierarchy = new Hierarchy()
    const modelDb = new ModelDb(hierarchy)

    const storageConfig: StorageConfiguration = storageConfigFromEnv()
    const storageAdapter = buildStorageFromConfig(storageConfig, mongodbUri)

    try {
      const txFactory = getTxAdapterFactory(ctx, dbUrls, wsUrl, null, {
        externalStorage: storageAdapter,
        fullTextUrl: 'http://localhost:9200',
        indexParallel: 0,
        indexProcessing: 0,
        rekoniUrl: '',
        usePassedCtx: true
      })
      const txAdapter = await txFactory(ctx, hierarchy, dbUrl ?? mongodbUri, wsId, modelDb, storageAdapter)

      await childLogger.withLog('init-workspace', {}, async (ctx) => {
        const deleteModelFirst = workspaceInfo.mode === 'creating'

        await initModel(
          ctx,
          wsId,
          txes,
          txAdapter,
          storageAdapter,
          ctxModellogger,
          async (value) => {
            await handleWsEvent?.('progress', version, 10 + Math.round((Math.min(value, 100) / 100) * 10))
          },
          deleteModelFirst
        )
      })
      registerServerPlugins()
      registerStringLoaders()
      const factory: PipelineFactory = createServerPipeline(
        ctx,
        dbUrls,
        {
          externalStorage: storageAdapter,
          fullTextUrl: 'http://localhost:9200',
          indexParallel: 0,
          indexProcessing: 0,
          rekoniUrl: '',
          usePassedCtx: true
        },
        {
          fulltextAdapter: {
            factory: async () => new DummyFullTextAdapter(),
            url: '',
            stages: (adapter, storage, storageAdapter, contentAdapter) =>
              createIndexStages(
                ctx.newChild('stages', {}),
                wsUrl,
                branding,
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

      const pipeline = await factory(ctx, wsUrl, true, () => {}, null)
      const client = new TxOperations(wrapPipeline(ctx, pipeline, wsUrl), core.account.System)

      await updateModel(ctx, wsId, migrationOperation, client, pipeline, ctxModellogger, async (value) => {
        await handleWsEvent?.('progress', version, 20 + Math.round((Math.min(value, 100) / 100) * 10))
      })

      await initializeWorkspace(ctx, branding, wsUrl, storageAdapter, client, ctxModellogger, async (value) => {
        await handleWsEvent?.('progress', version, 30 + Math.round((Math.min(value, 100) / 100) * 70))
      })

      await pipeline.close()

      await handleWsEvent?.('create-done', version, 100, '')
    } catch (err: any) {
      await handleWsEvent?.('ping', version, 0, `Create failed: ${err.message}`)
    } finally {
      await storageAdapter.close()
    }
  } finally {
    clearInterval(createPingHandle)
    childLogger.end()
  }
}

/**
 * @public
 */
export async function upgradeWorkspace (
  ctx: MeasureContext,
  version: Data<Version>,
  txes: Tx[],
  migrationOperation: [string, MigrateOperation][],
  ws: BaseWorkspaceInfo,
  logger: ModelLogger = consoleModelLogger,
  handleWsEvent?: (
    event: 'upgrade-started' | 'progress' | 'upgrade-done' | 'ping',
    version: Data<Version>,
    progress: number,
    message?: string
  ) => Promise<void>,
  forceUpdate: boolean = true,
  forceIndexes: boolean = false,
  external: boolean = false
): Promise<void> {
  const versionStr = versionToString(version)

  if (ws?.version !== undefined && !forceUpdate && versionStr === versionToString(ws.version)) {
    return
  }
  ctx.info('upgrading', {
    force: forceUpdate,
    currentVersion: ws?.version !== undefined ? versionToString(ws.version) : '',
    toVersion: versionStr,
    workspace: ws.workspace
  })
  const wsId: WorkspaceIdWithUrl = {
    name: ws.workspace,
    workspaceName: ws.workspaceName ?? '',
    workspaceUrl: ws.workspaceUrl ?? ''
  }

  const token = generateToken(systemAccountEmail, wsId, { service: 'workspace' })
  let progress = 0

  const updateProgressHandle = setInterval(() => {
    void handleWsEvent?.('progress', version, progress)
  }, 5000)

  const { mongodbUri, dbUrl } = prepareTools([])

  const wsUrl: WorkspaceIdWithUrl = {
    name: ws.workspace,
    workspaceName: ws.workspaceName ?? '',
    workspaceUrl: ws.workspaceUrl ?? ''
  }

  const { pipeline, storageAdapter } = await getServerPipeline(ctx, mongodbUri, dbUrl, wsUrl)

  try {
    await handleWsEvent?.('upgrade-started', version, 0)

    await upgradeModel(
      ctx,
      await getTransactorEndpoint(token, external ? 'external' : 'internal'),
      wsId,
      txes,
      pipeline,
      storageAdapter,
      migrationOperation,
      logger,
      false,
      async (value) => {
        progress = value
      },
      forceIndexes
    )

    await handleWsEvent?.('upgrade-done', version, 100, '')
  } catch (err: any) {
    await handleWsEvent?.('ping', version, 0, `Upgrade failed: ${err.message}`)
  } finally {
    await pipeline.close()
    await storageAdapter.close()
    clearInterval(updateProgressHandle)
  }
}
