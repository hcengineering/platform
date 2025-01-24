import core, {
  Hierarchy,
  ModelDb,
  systemAccountUuid,
  TxOperations,
  versionToString,
  systemAccount,
  type Branding,
  type Client,
  type Data,
  type MeasureContext,
  type Tx,
  type Version,
  type WorkspaceIds,
  type WorkspaceInfoWithStatus
} from '@hcengineering/core'
import { consoleModelLogger, type MigrateOperation, type ModelLogger } from '@hcengineering/model'
import { getTransactorEndpoint } from '@hcengineering/server-client'
import { SessionDataImpl, wrapPipeline, type Pipeline, type StorageAdapter } from '@hcengineering/server-core'
import { getServerPipeline, getTxAdapterFactory, sharedPipelineContextVars } from '@hcengineering/server-pipeline'
import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import { generateToken } from '@hcengineering/server-token'
import { initializeWorkspace, initModel, prepareTools, updateModel, upgradeModel } from '@hcengineering/server-tool'
import { type AccountClient } from '@hcengineering/account-client'

/**
 * @public
 */
export async function createWorkspace (
  ctx: MeasureContext,
  version: Data<Version>,
  branding: Branding | null,
  workspaceInfo: WorkspaceInfoWithStatus,
  txes: Tx[],
  migrationOperation: [string, MigrateOperation][],
  accountClient: AccountClient,
  handleWsEvent?: (
    event: 'ping' | 'create-started' | 'progress' | 'create-done',
    version: Data<Version>,
    progress: number,
    message?: string
  ) => Promise<void>,
  external: boolean = false
): Promise<void> {
  const childLogger = ctx.newChild('createWorkspace', {}, { workspace: workspaceInfo.uuid })
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
    const wsIds: WorkspaceIds = {
      uuid: workspaceInfo.uuid,
      url: workspaceInfo.url,
      dataId: workspaceInfo.dataId
    }

    const wsId = workspaceInfo.uuid

    await handleWsEvent?.('create-started', version, 10)

    const { dbUrl } = prepareTools([])
    const hierarchy = new Hierarchy()
    const modelDb = new ModelDb(hierarchy)

    const storageConfig = storageConfigFromEnv()
    const storageAdapter = buildStorageFromConfig(storageConfig)

    const pipeline = await getServerPipeline(ctx, txes, dbUrl, wsIds, storageAdapter)

    try {
      const txFactory = getTxAdapterFactory(ctx, dbUrl, wsIds, null, {
        externalStorage: storageAdapter,
        usePassedCtx: true
      })
      const txAdapter = await txFactory(ctx, sharedPipelineContextVars, hierarchy, dbUrl, wsIds, modelDb, storageAdapter)
      await childLogger.withLog('init-workspace', {}, (ctx) =>
        initModel(ctx, wsId, txes, txAdapter, storageAdapter, ctxModellogger, async (value) => {})
      )

      const client = new TxOperations(wrapPipeline(ctx, pipeline, wsIds), core.account.ConfigUser)

      await updateModel(ctx, wsId, migrationOperation, client, pipeline, ctxModellogger, async (value) => {
        await handleWsEvent?.('progress', version, 10 + Math.round((Math.min(value, 100) / 100) * 10))
      })

      ctx.info('Starting init script if any')
      await initializeWorkspace(ctx, branding, wsIds, storageAdapter, client, ctxModellogger, async (value) => {
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
        accountClient,
        ctxModellogger,
        async (event, version, value) => {
          ctx.info('upgrade workspace', { event, value })
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
  accountClient: AccountClient,
  ws: WorkspaceInfoWithStatus,
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
        uuid: ws.uuid,
        url: ws.url ?? '',
        dataId: ws.dataId
      },
      storageAdapter
    )
    if (pipeline === undefined || storageAdapter === undefined) {
      return
    }

    const wsUrl: WorkspaceIds = {
      uuid: ws.uuid,
      url: ws.url ?? '',
      dataId: ws.dataId
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
      accountClient,
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
  ws: WorkspaceInfoWithStatus,
  pipeline: Pipeline,
  connection: Client,
  storageAdapter: StorageAdapter,
  accountClient: AccountClient,
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
    workspace: ws.uuid
  })
  const wsIds: WorkspaceIds = {
    uuid: ws.uuid,
    url: ws.url ?? '',
    dataId: ws.dataId
  }

  const token = generateToken(systemAccountUuid, wsIds.uuid, { service: 'workspace' })
  let progress = 0

  const updateProgressHandle = setInterval(() => {
    void handleWsEvent?.('progress', version, progress)
  }, 5000)

  try {
    const contextData = new SessionDataImpl(
      systemAccount,
      'backup',
      true,
      undefined,
      wsIds,
      null,
      true,
      undefined,
      undefined,
      pipeline.context.modelDb,
      new Map()
    )
    ctx.contextData = contextData
    await handleWsEvent?.('upgrade-started', version, 0)

    await upgradeModel(
      ctx,
      await getTransactorEndpoint(token, external ? 'external' : 'internal'),
      wsIds,
      txes,
      pipeline,
      connection,
      storageAdapter,
      accountClient,
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
