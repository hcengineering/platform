import core, {
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
import { SessionDataImpl, wrapPipeline, type Pipeline, type StorageAdapter } from '@hcengineering/server-core'
import { getServerPipeline, getTxAdapterFactory, sharedPipelineContextVars } from '@hcengineering/server-pipeline'
import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import { generateToken } from '@hcengineering/server-token'
import { initializeWorkspace, initModel, prepareTools, updateModel, upgradeModel } from '@hcengineering/server-tool'

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
  ) => Promise<void>,
  external: boolean = false
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
      uuid: workspaceInfo.uuid,
      workspaceName: workspaceInfo.workspaceName ?? '',
      workspaceUrl: workspaceInfo.workspaceUrl ?? ''
    }

    const wsId = {
      name: workspaceInfo.workspace,
      uuid: workspaceInfo.uuid
    }

    await handleWsEvent?.('create-started', version, 10)

    const { dbUrl } = prepareTools([])
    const hierarchy = new Hierarchy()
    const modelDb = new ModelDb(hierarchy)

    const storageConfig = storageConfigFromEnv()
    const storageAdapter = buildStorageFromConfig(storageConfig)

    const pipeline = await getServerPipeline(ctx, txes, dbUrl, wsUrl, storageAdapter)

    try {
      const txFactory = getTxAdapterFactory(ctx, dbUrl, wsUrl, null, {
        externalStorage: storageAdapter,
        usePassedCtx: true
      })
      const txAdapter = await txFactory(ctx, sharedPipelineContextVars, hierarchy, dbUrl, wsId, modelDb, storageAdapter)
      await childLogger.withLog('init-workspace', {}, (ctx) =>
        initModel(ctx, wsId, txes, txAdapter, storageAdapter, ctxModellogger, async (value) => {})
      )

      const client = new TxOperations(wrapPipeline(ctx, pipeline, wsUrl), core.account.ConfigUser)

      await updateModel(ctx, wsId, migrationOperation, client, pipeline, ctxModellogger, async (value) => {
        await handleWsEvent?.('progress', version, 10 + Math.round((Math.min(value, 100) / 100) * 10))
      })

      ctx.info('Starting init script if any')
      await initializeWorkspace(ctx, branding, wsUrl, storageAdapter, client, ctxModellogger, async (value) => {
        ctx.info('Init script progress', { value })
        await handleWsEvent?.('progress', version, 20 + Math.round((Math.min(value, 100) / 100) * 60))
      })

      await upgradeWorkspaceWith(
        ctx,
        version,
        txes,
        migrationOperation,
        workspaceInfo,
        pipeline,
        client,
        storageAdapter,
        ctxModellogger,
        async (event, version, value) => {
          ctx.info('Init script progress', { event, value })
          await handleWsEvent?.('progress', version, 80 + Math.round((Math.min(value, 100) / 100) * 20))
        },
        false,
        'disable',
        external
      )

      await handleWsEvent?.('create-done', version, 100, '')
    } catch (err: any) {
      await handleWsEvent?.('ping', version, 0, `Create failed: ${err.message}`)
    } finally {
      await pipeline.close()
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
  const { dbUrl } = prepareTools([])
  let pipeline: Pipeline | undefined

  const storageConfig = storageConfigFromEnv()
  const storageAdapter = buildStorageFromConfig(storageConfig)
  try {
    pipeline = await getServerPipeline(
      ctx,
      txes,
      dbUrl,
      {
        name: ws.workspace,
        uuid: ws.uuid,
        workspaceName: ws.workspaceName ?? '',
        workspaceUrl: ws.workspaceUrl ?? ''
      },
      storageAdapter
    )
    if (pipeline === undefined || storageAdapter === undefined) {
      return
    }

    const wsUrl: WorkspaceIdWithUrl = {
      name: ws.workspace,
      workspaceName: ws.workspaceName ?? '',
      workspaceUrl: ws.workspaceUrl ?? ''
    }

    await upgradeWorkspaceWith(
      ctx,
      version,
      txes,
      migrationOperation,
      ws,
      pipeline,
      wrapPipeline(ctx, pipeline, wsUrl),
      storageAdapter,
      logger,
      handleWsEvent,
      forceUpdate,
      forceIndexes ? 'perform' : 'skip',
      external
    )
  } finally {
    await pipeline?.close()
    await storageAdapter?.close()
  }
}

/**
 * @public
 */
export async function upgradeWorkspaceWith (
  ctx: MeasureContext,
  version: Data<Version>,
  txes: Tx[],
  migrationOperation: [string, MigrateOperation][],
  ws: BaseWorkspaceInfo,
  pipeline: Pipeline,
  connection: Client,
  storageAdapter: StorageAdapter,
  logger: ModelLogger = consoleModelLogger,
  handleWsEvent?: (
    event: 'upgrade-started' | 'progress' | 'upgrade-done' | 'ping',
    version: Data<Version>,
    progress: number,
    message?: string
  ) => Promise<void>,
  forceUpdate: boolean = true,
  updateIndexes: 'perform' | 'skip' | 'disable' = 'skip',
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

  const wsUrl: WorkspaceIdWithUrl = {
    name: ws.workspace,
    workspaceName: ws.workspaceName ?? '',
    workspaceUrl: ws.workspaceUrl ?? ''
  }
  try {
    const contextData = new SessionDataImpl(
      systemAccountEmail,
      'backup',
      true,
      undefined,
      wsUrl,
      null,
      true,
      undefined,
      undefined,
      pipeline.context.modelDb
    )
    ctx.contextData = contextData
    await handleWsEvent?.('upgrade-started', version, 0)

    await upgradeModel(
      ctx,
      await getTransactorEndpoint(token, external ? 'external' : 'internal'),
      wsId,
      txes,
      pipeline,
      connection,
      storageAdapter,
      migrationOperation,
      logger,
      async (value) => {
        progress = value
      },
      updateIndexes
    )

    await handleWsEvent?.('upgrade-done', version, 100, '')
  } catch (err: any) {
    ctx.error('upgrade-failed', { message: err.message })
    await handleWsEvent?.('ping', version, 0, `Upgrade failed: ${err.message}`)
    throw err
  } finally {
    clearInterval(updateProgressHandle)
  }
}
