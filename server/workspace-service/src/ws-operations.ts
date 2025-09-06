import { type AccountClient } from '@hcengineering/account-client'
import core, {
  Hierarchy,
  ModelDb,
  systemAccount,
  systemAccountUuid,
  TxOperations,
  versionToString,
  type Branding,
  type Client,
  type Data,
  type MeasureContext,
  type Tx,
  type Version,
  type WorkspaceIds,
  type WorkspaceInfoWithStatus
} from '@hcengineering/core'
import { consoleModelLogger, type MigrateMode, type MigrateOperation, type ModelLogger } from '@hcengineering/model'
import { getTransactorEndpoint } from '@hcengineering/server-client'
import {
  SessionDataImpl,
  wrapPipeline,
  type Pipeline,
  type PlatformQueueProducer,
  type QueueWorkspaceMessage,
  type StorageAdapter
} from '@hcengineering/server-core'
import { getServerPipeline, getTxAdapterFactory } from '@hcengineering/server-pipeline'
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
  workspaceInfo: WorkspaceInfoWithStatus,
  txes: Tx[],
  migrationOperation: [string, MigrateOperation][],
  accountClient: AccountClient,
  queue: PlatformQueueProducer<QueueWorkspaceMessage>,
  handleWsEvent?: (
    event: 'ping' | 'create-started' | 'progress' | 'create-done',
    version: Data<Version>,
    progress: number,
    message?: string
  ) => Promise<void>,
  external: boolean = false
): Promise<void> {
  const childLogger = ctx.newChild('createWorkspace', ctx.getParams())
  const ctxModellogger: ModelLogger = {
    log: (msg, data) => {
      childLogger.info(msg, data)
    },
    error: (msg, data) => {
      childLogger.error(msg, data)
    }
  }

  const createPingHandle = setInterval(() => {
    handleWsEvent?.('ping', version, 0).catch((err: any) => {
      ctx.error('Error while updating progress', { origErr: err })
    })
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

    const pipeline = await getServerPipeline(ctx, txes, dbUrl, wsIds, storageAdapter, { queue: queue.getQueue() })

    try {
      const txFactory = getTxAdapterFactory(ctx, dbUrl, wsIds, null, {
        externalStorage: storageAdapter,
        usePassedCtx: true
      })
      const txAdapter = await txFactory(ctx, hierarchy, dbUrl, wsIds, modelDb, storageAdapter)
      await childLogger.with(
        'init-workspace',
        {},
        (ctx) => initModel(ctx, wsId, txes, txAdapter, storageAdapter, ctxModellogger, async (value) => {}),
        { workspace: wsId },
        { log: true }
      )

      const client = new TxOperations(wrapPipeline(ctx, pipeline, wsIds), core.account.ConfigUser)

      await updateModel(
        childLogger,
        wsId,
        migrationOperation,
        client,
        pipeline,
        ctxModellogger,
        async (value) => {
          await handleWsEvent?.('progress', version, 10 + Math.round((Math.min(value, 100) / 100) * 10))
        },
        'create'
      )

      ctx.info('Starting init script if any')
      const creatorUuid = workspaceInfo.createdBy

      if (creatorUuid != null) {
        const personInfo = await accountClient.getPersonInfo(creatorUuid)

        if (personInfo?.socialIds.length > 0) {
          await initializeWorkspace(
            childLogger,
            branding,
            wsIds,
            personInfo,
            storageAdapter,
            client,
            ctxModellogger,
            async (value) => {
              ctx.info('Init script progress', { value })
              await handleWsEvent?.('progress', version, 20 + Math.round((Math.min(value, 100) / 100) * 60))
            }
          )
        } else {
          ctx.warn('No person info or verified social ids found for workspace creator. Skipping init script.')
        }
      } else {
        ctx.warn('No workspace creator found. Skipping init script.')
      }

      await upgradeWorkspaceWith(
        childLogger,
        version,
        txes,
        migrationOperation,
        workspaceInfo,
        pipeline,
        client,
        storageAdapter,
        accountClient,
        queue,
        ctxModellogger,
        async (event, version, value) => {
          ctx.info('upgrade workspace', { event, value })
          await handleWsEvent?.('progress', version, 80 + Math.round((Math.min(value, 100) / 100) * 20))
        },
        false,
        'disable',
        external,
        'create'
      )

      await handleWsEvent?.('create-done', version, 100, '')
    } catch (err: any) {
      void handleWsEvent?.('ping', version, 0, `Create failed: ${err.message}`)
      throw err
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
  queue: PlatformQueueProducer<QueueWorkspaceMessage>,
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
      storageAdapter,
      {
        queue: queue.getQueue()
      }
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
      queue,
      logger,
      handleWsEvent,
      forceUpdate,
      forceIndexes ? 'perform' : 'skip',
      external,
      'upgrade'
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
  queue: PlatformQueueProducer<QueueWorkspaceMessage>,
  logger: ModelLogger = consoleModelLogger,
  handleWsEvent?: (
    event: 'upgrade-started' | 'progress' | 'upgrade-done' | 'ping',
    version: Data<Version>,
    progress: number,
    message?: string
  ) => Promise<void>,
  forceUpdate: boolean = true,
  updateIndexes: 'perform' | 'skip' | 'disable' = 'skip',
  external: boolean = false,
  mode: MigrateMode = 'create'
): Promise<void> {
  const versionStr = versionToString(version)
  const workspaceVersion = {
    major: ws.versionMajor,
    minor: ws.versionMinor,
    patch: ws.versionPatch
  }

  if (!forceUpdate && versionStr === versionToString(workspaceVersion)) {
    return
  }

  ctx.info('upgrading', {
    force: forceUpdate,
    currentVersion: versionToString(workspaceVersion),
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
    handleWsEvent?.('progress', version, progress).catch((err: any) => {
      ctx.error('Error while updating progress', { origErr: err })
    })
  }, 5000)

  try {
    const contextData = new SessionDataImpl(
      systemAccount,
      'backup',
      true,
      undefined,
      wsIds,
      true,
      undefined,
      undefined,
      pipeline.context.modelDb,
      new Map(),
      'workspace'
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
      queue,
      migrationOperation,
      logger,
      async (value) => {
        progress = value
      },
      updateIndexes,
      mode
    )

    await handleWsEvent?.('upgrade-done', version, 100, '')
  } catch (err: any) {
    ctx.error('upgrade-failed', { message: err.message })
    void handleWsEvent?.('ping', version, 0, `Upgrade failed: ${err.message}`)
    throw err
  } finally {
    clearInterval(updateProgressHandle)
  }
}
