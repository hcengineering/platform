//
// Copyright © 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
import { getClient as getAccountClient } from '@hcengineering/account-client'
import {
  getBranding,
  isArchivingMode,
  isMigrationMode,
  isRestoringMode,
  systemAccountUuid,
  type BrandingMap,
  type Data,
  type MeasureContext,
  type Tx,
  type Version,
  type WorkspaceInfoWithStatus,
  type WorkspaceUpdateEvent,
  type WorkspaceUuid
} from '@hcengineering/core'
import { type MigrateOperation, type ModelLogger } from '@hcengineering/model'
import {
  getTransactorEndpoint,
  withRetryConnUntilSuccess,
  withRetryConnUntilTimeout
} from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import { FileModelLogger, prepareTools } from '@hcengineering/server-tool'
import path from 'path'

import { Analytics } from '@hcengineering/analytics'
import {
  createMongoAdapter,
  createMongoDestroyAdapter,
  createMongoTxAdapter,
  shutdownMongo
} from '@hcengineering/mongo'
import {
  createPostgreeDestroyAdapter,
  createPostgresAdapter,
  createPostgresTxAdapter,
  shutdownPostgres
} from '@hcengineering/postgres'
import { doBackupWorkspace, doRestoreWorkspace } from '@hcengineering/server-backup'
import type { PipelineFactory, StorageAdapter } from '@hcengineering/server-core'
import {
  createBackupPipeline,
  getConfig,
  getWorkspaceDestroyAdapter,
  registerAdapterFactory,
  registerDestroyFactory,
  registerServerPlugins,
  registerStringLoaders,
  registerTxAdapterFactory,
  setAdapterSecurity,
  sharedPipelineContextVars
} from '@hcengineering/server-pipeline'
import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import { createWorkspace, upgradeWorkspace } from './ws-operations'

export interface WorkspaceOptions {
  errorHandler: (workspace: WorkspaceInfoWithStatus, error: any) => Promise<void>
  force: boolean
  console: boolean
  logs: string

  ignore?: string
  waitTimeout: number

  backup?: {
    backupStorage: StorageAdapter
    bucketName: string
  }
}

// Register close on process exit.
process.on('exit', () => {
  shutdownPostgres(sharedPipelineContextVars).catch((err) => {
    console.error(err)
  })
  shutdownMongo(sharedPipelineContextVars).catch((err) => {
    console.error(err)
  })
})

export type WorkspaceOperation = 'create' | 'upgrade' | 'all' | 'all+backup'

export class WorkspaceWorker {
  runningTasks: number = 0
  resolveBusy: (() => void) | null = null

  constructor (
    readonly version: Data<Version>,
    readonly txes: Tx[],
    readonly migrationOperation: [string, MigrateOperation][],
    readonly region: string,
    readonly limit: number,
    readonly operation: WorkspaceOperation,
    readonly brandings: BrandingMap,
    readonly fulltextUrl: string | undefined,
    readonly accountsUrl: string
  ) {}

  hasAvailableThread (): boolean {
    return this.runningTasks < this.limit
  }

  async waitForAvailableThread (): Promise<void> {
    if (this.hasAvailableThread()) {
      return
    }

    await new Promise<void>((resolve) => {
      this.resolveBusy = resolve
    })
  }

  // Note: not gonna use it for now
  wakeup: () => void = () => {}
  defaultWakeup: () => void = () => {}

  async start (ctx: MeasureContext, opt: WorkspaceOptions, isCanceled: () => boolean): Promise<void> {
    this.defaultWakeup = () => {
      ctx.info("I'm busy", { version: this.version, region: this.region })
    }
    this.wakeup = this.defaultWakeup
    const token = generateToken(systemAccountUuid, undefined, { service: 'workspace' })

    ctx.info('Sending a handshake to the account service...')
    const accountClient = getAccountClient(this.accountsUrl, token)

    while (true) {
      try {
        await withRetryConnUntilSuccess(accountClient.workerHandshake.bind(accountClient))(
          this.region,
          this.version,
          this.operation
        )
        break
      } catch (err: any) {
        ctx.error('error', { err })
      }
    }

    ctx.info('Successfully connected to the account service')

    registerTxAdapterFactory('mongodb', createMongoTxAdapter)
    registerAdapterFactory('mongodb', createMongoAdapter)
    registerDestroyFactory('mongodb', createMongoDestroyAdapter)

    registerTxAdapterFactory('postgresql', createPostgresTxAdapter, true)
    registerAdapterFactory('postgresql', createPostgresAdapter, true)
    registerDestroyFactory('postgresql', createPostgreeDestroyAdapter, true)
    setAdapterSecurity('postgresql', true)

    registerServerPlugins()
    registerStringLoaders()

    while (!isCanceled()) {
      await this.waitForAvailableThread()

      const workspace = await ctx.with('get-pending-workspace', {}, async (ctx) => {
        try {
          return await accountClient.getPendingWorkspace(this.region, this.version, this.operation)
        } catch (err) {
          ctx.error('Error getting pending workspace:', { err })
        }
      })
      if (workspace == null) {
        await this.doSleep(ctx, opt)
      } else {
        void this.exec(async () => {
          await this.doWorkspaceOperation(
            ctx.newChild('workspaceOperation', {
              workspace: workspace.uuid,
              workspaceName: workspace.name
            }),
            workspace,
            opt
          ).catch((err) => {
            Analytics.handleError(err)
            ctx.error('error', { err })
          })
        })
      }
    }
  }

  async exec (op: () => Promise<void>): Promise<void> {
    this.runningTasks++

    await op().finally(() => {
      this.runningTasks--

      if (this.resolveBusy !== null) {
        this.resolveBusy()
        this.resolveBusy = null
      }
    })
  }

  private async _createWorkspace (
    ctx: MeasureContext,
    ws: WorkspaceInfoWithStatus,
    opt: WorkspaceOptions
  ): Promise<void> {
    const t = Date.now()

    const ctxModelLogger: ModelLogger = {
      log (msg: string, data: any): void {
        ctx.info(msg, data)
      },
      error (msg: string, data: any): void {
        ctx.error(msg, data)
      }
    }

    const logger = opt.console ? ctxModelLogger : new FileModelLogger(path.join(opt.logs, `${ws.uuid}.log`))

    ctx.info('---CREATING----', {
      workspace: ws.uuid,
      version: this.version,
      region: this.region
    })

    try {
      const branding = getBranding(this.brandings, ws.branding)
      const wsId = ws.uuid
      const token = generateToken(systemAccountUuid, wsId, { service: 'workspace' })
      const accountClient = getAccountClient(this.accountsUrl, token)
      const handleWsEventWithRetry = (
        event: 'ping' | 'create-started' | 'progress' | 'create-done',
        version: Data<Version>,
        progress: number,
        message?: string
      ): Promise<void> => {
        return withRetryConnUntilTimeout(
          () => accountClient.updateWorkspaceInfo(ws.uuid, event, version, progress, message),
          5000
        )()
      }

      if (ws.mode !== 'creating' || (ws.processingProgress ?? 0) < 30) {
        await createWorkspace(
          ctx,
          this.version,
          branding,
          ws,
          this.txes,
          this.migrationOperation,
          accountClient,
          handleWsEventWithRetry
        )
      } else {
        // The previous attempth failed during init script and we cannot really retry it.
        // But it should not be a blocker though. We can just warn user about that if we want.
        // So we don't clear the previous error message if any
        await handleWsEventWithRetry?.('create-done', this.version, ws.processingProgress ?? 0)
      }

      ctx.info('---CREATE-DONE---------', {
        workspace: ws.uuid,
        version: this.version,
        region: this.region,
        time: Date.now() - t
      })
    } catch (err: any) {
      await opt.errorHandler(ws, err)

      logger.log('error', err)

      if (!opt.console) {
        ctx.error('error', { err })
      }

      ctx.error('---CREATE-FAILED---------', {
        workspace: ws.uuid,
        version: this.version,
        region: this.region,
        time: Date.now() - t
      })
    } finally {
      if (!opt.console) {
        ;(logger as FileModelLogger).close()
      }
    }
  }

  private async _upgradeWorkspace (
    ctx: MeasureContext,
    ws: WorkspaceInfoWithStatus,
    opt: WorkspaceOptions
  ): Promise<void> {
    if (
      ws.isDisabled === true ||
      isArchivingMode(ws.mode) ||
      isMigrationMode(ws.mode) ||
      isRestoringMode(ws.mode) ||
      (opt.ignore ?? '').includes(ws.uuid)
    ) {
      return
    }
    const t = Date.now()

    const ctxModelLogger: ModelLogger = {
      log (msg: string, data: any): void {
        ctx.info(msg, data)
      },
      error (msg: string, data: any): void {
        ctx.error(msg, data)
      }
    }

    const workspaceVersion = {
      major: ws.versionMajor,
      minor: ws.versionMinor,
      patch: ws.versionPatch
    }
    const logger = opt.console ? ctxModelLogger : new FileModelLogger(path.join(opt.logs, `${ws.uuid}.log`))

    ctx.info('---UPGRADING----', {
      workspace: ws.uuid,
      workspaceVersion,
      requestedVersion: this.version,
      region: this.region
    })

    try {
      const token = generateToken(systemAccountUuid, ws.uuid, { service: 'workspace' })
      const accountClient = getAccountClient(this.accountsUrl, token)
      const handleWsEventWithRetry = (
        event: 'upgrade-started' | 'progress' | 'upgrade-done' | 'ping',
        version: Data<Version>,
        progress: number,
        message?: string
      ): Promise<void> => {
        return withRetryConnUntilTimeout(
          () =>
            getAccountClient(this.accountsUrl, token).updateWorkspaceInfo(ws.uuid, event, version, progress, message),
          5000
        )()
      }

      await upgradeWorkspace(
        ctx,
        this.version,
        this.txes,
        this.migrationOperation,
        accountClient,
        ws,
        logger,
        handleWsEventWithRetry,
        opt.force
      )
      ctx.info('---UPGRADE-DONE---------', {
        workspace: ws.uuid,
        oldWorkspaceVersion: workspaceVersion,
        requestedVersion: this.version,
        region: this.region,
        time: Date.now() - t
      })
    } catch (err: any) {
      await opt.errorHandler(ws, err)

      logger.log('error', err)

      if (!opt.console) {
        ctx.error('error', { err })
      }

      ctx.error('---UPGRADE-FAILED---------', {
        workspace: ws.uuid,
        oldWorkspaceVersion: workspaceVersion,
        requestedVersion: this.version,
        region: this.region,
        time: Date.now() - t
      })
    } finally {
      if (!opt.console) {
        ;(logger as FileModelLogger).close()
      }
    }
  }

  /**
   * If onlyDrop is true, will drop workspace from database, overwize remove only indexes and do full reindex.
   */
  async doCleanup (ctx: MeasureContext, workspace: WorkspaceInfoWithStatus, onlyDrop: boolean): Promise<void> {
    const { dbUrl } = prepareTools([])
    const adapter = getWorkspaceDestroyAdapter(dbUrl)
    await adapter.deleteWorkspace(ctx, sharedPipelineContextVars, workspace.uuid, workspace.dataId)

    await this.doReindexFulltext(ctx, workspace, onlyDrop)
  }

  private async doReindexFulltext (
    ctx: MeasureContext,
    workspace: WorkspaceInfoWithStatus,
    onlyDrop: boolean
  ): Promise<void> {
    if (this.fulltextUrl !== undefined) {
      const token = generateToken(systemAccountUuid, workspace.uuid, { service: 'workspace' })

      try {
        const res = await fetch(this.fulltextUrl + '/api/v1/reindex', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token, onlyDrop })
        })
        if (!res.ok) {
          throw new Error(`HTTP Error ${res.status} ${res.statusText}`)
        }
      } catch (err: any) {
        ctx.error('failed to reset index', { err })
      }
    }
  }

  async sendTransactorMaitenance (token: string, ws: WorkspaceUuid): Promise<void> {
    try {
      let serverEndpoint = await getTransactorEndpoint(token)
      serverEndpoint = serverEndpoint.replaceAll('wss://', 'https://').replace('ws://', 'http://')
      console.log('sending event', serverEndpoint, ws)
      await fetch(serverEndpoint + `/api/v1/manage?token=${token}&operation=force-close`, {
        method: 'PUT'
      })
    } catch (err: any) {
      console.log(err)
      // Ignore
    }
  }

  private async doWorkspaceOperation (
    ctx: MeasureContext,
    workspace: WorkspaceInfoWithStatus,
    opt: WorkspaceOptions
  ): Promise<void> {
    const token = generateToken(systemAccountUuid, workspace.uuid, { service: 'workspace' })

    const sendEvent = (event: WorkspaceUpdateEvent, progress: number): Promise<void> =>
      withRetryConnUntilSuccess(() =>
        getAccountClient(this.accountsUrl, token).updateWorkspaceInfo(
          workspace.uuid,
          event,
          this.version,
          progress,
          `${event} done`
        )
      )()

    switch (workspace.mode ?? 'active') {
      case 'pending-creation':
      case 'creating':
        // We need to either start workspace creation
        // or see if we need to restart it
        await this._createWorkspace(ctx, workspace, opt)
        break
      case 'upgrading':
      case 'active':
        // It seem version upgrade is required, or upgrade is not finished on previoous iteration.
        // It's safe to upgrade the workspace again as the procedure allows re-trying.
        await this._upgradeWorkspace(ctx, workspace, opt)
        break
      case 'archiving-pending-backup':
      case 'archiving-backup': {
        await sendEvent('archiving-backup-started', 0)

        await this.sendTransactorMaitenance(token, workspace.uuid)
        if (await this.doBackup(ctx, workspace, opt, true)) {
          await sendEvent('archiving-backup-done', 100)
        }
        break
      }
      case 'archiving-pending-clean':
      case 'archiving-clean': {
        // We should remove DB, not storages.
        await sendEvent('archiving-clean-started', 0)
        try {
          await this.doCleanup(ctx, workspace, false)
        } catch (err: any) {
          Analytics.handleError(err)
          return
        }
        await sendEvent('archiving-clean-done', 100)
        break
      }
      case 'pending-deletion':
      case 'deleting': {
        // We should remove DB, not storages.
        await sendEvent('delete-started', 0)
        await this.sendTransactorMaitenance(token, workspace.uuid)
        try {
          await this.doCleanup(ctx, workspace, true)
        } catch (err: any) {
          Analytics.handleError(err)
          return
        }
        await sendEvent('delete-done', 100)
        break
      }

      case 'migration-pending-backup':
      case 'migration-backup':
        await sendEvent('migrate-backup-started', 0)
        await this.sendTransactorMaitenance(token, workspace.uuid)
        if (await this.doBackup(ctx, workspace, opt, false)) {
          await sendEvent('migrate-backup-done', 100)
        }
        break
      case 'migration-pending-clean':
      case 'migration-clean': {
        // We should remove DB, not storages.
        await sendEvent('migrate-clean-started', 0)
        await this.sendTransactorMaitenance(token, workspace.uuid)
        try {
          await this.doCleanup(ctx, workspace, false)
        } catch (err: any) {
          Analytics.handleError(err)
          return
        }
        await sendEvent('migrate-clean-done', 0)
        break
      }
      case 'pending-restore':
      case 'restoring':
        await sendEvent('restore-started', 0)
        if (await this.doRestore(ctx, workspace, opt)) {
          // We should reindex fulltext
          await this.doReindexFulltext(ctx, workspace, false)
          await sendEvent('restore-done', 100)
        }
        break
      default:
        ctx.error('Unknown workspace mode', { workspace: workspace.uuid, wsUrl: workspace.url, mode: workspace.mode })
    }
  }

  private async doBackup (
    ctx: MeasureContext,
    workspace: WorkspaceInfoWithStatus,
    opt: WorkspaceOptions,
    archive: boolean
  ): Promise<boolean> {
    if (opt.backup === undefined) {
      return false
    }
    const { dbUrl } = prepareTools([])

    const workspaceStorageConfig = storageConfigFromEnv()
    const workspaceStorageAdapter = buildStorageFromConfig(workspaceStorageConfig)

    const pipelineFactory: PipelineFactory = createBackupPipeline(ctx, dbUrl, this.txes, {
      externalStorage: workspaceStorageAdapter,
      usePassedCtx: true
    })

    // A token to access account service
    const token = generateToken(systemAccountUuid, undefined, { service: 'workspace' })

    const handleWsEventWithRetry = (
      event: 'ping' | 'progress',
      version: Data<Version>,
      progress: number,
      message?: string
    ): Promise<void> => {
      return withRetryConnUntilTimeout(
        () =>
          getAccountClient(this.accountsUrl, token).updateWorkspaceInfo(
            workspace.uuid,
            event,
            version,
            progress,
            message
          ),
        5000
      )()
    }
    let progress = 0

    const notifyInt = setInterval(() => {
      void handleWsEventWithRetry('ping', this.version, progress, '')
    }, 5000)

    try {
      const result: boolean = await doBackupWorkspace(
        ctx,
        workspace,
        opt.backup.backupStorage,
        {
          Token: token,
          BucketName: opt.backup.bucketName,
          CoolDown: 0,
          Timeout: 0,
          SkipWorkspaces: '',
          AccountsURL: '',
          Interval: 0,
          Parallel: 1
        },
        pipelineFactory,
        workspaceStorageAdapter,
        (ctx, workspace, branding, externalStorage) => {
          return getConfig(ctx, dbUrl, ctx, {
            externalStorage,
            disableTriggers: true
          })
        },
        this.region,
        50000,
        ['blob'],
        sharedPipelineContextVars,
        (_p: number) => {
          if (progress !== Math.round(_p)) {
            progress = Math.round(_p)
            return handleWsEventWithRetry('progress', this.version, progress, '')
          }
          return Promise.resolve()
        }
      )
      if (result) {
        ctx.info('backup completed')
        return true
      }
    } finally {
      clearInterval(notifyInt)
      await workspaceStorageAdapter.close()
    }
    return false
  }

  private async doRestore (
    ctx: MeasureContext,
    workspace: WorkspaceInfoWithStatus,
    opt: WorkspaceOptions
  ): Promise<boolean> {
    if (opt.backup === undefined) {
      return false
    }
    const { dbUrl } = prepareTools([])

    const workspaceStorageConfig = storageConfigFromEnv()
    const workspaceStorageAdapter = buildStorageFromConfig(workspaceStorageConfig)

    const pipelineFactory: PipelineFactory = createBackupPipeline(ctx, dbUrl, this.txes, {
      externalStorage: workspaceStorageAdapter,
      usePassedCtx: true
    })

    // A token to access account service
    const token = generateToken(systemAccountUuid, undefined, { service: 'workspace' })

    const handleWsEventWithRetry = (
      event: 'ping' | 'progress',
      version: Data<Version>,
      progress: number,
      message?: string
    ): Promise<void> => {
      return withRetryConnUntilTimeout(
        () =>
          getAccountClient(this.accountsUrl, token).updateWorkspaceInfo(
            workspace.uuid,
            event,
            version,
            progress,
            message
          ),
        5000
      )()
    }
    let progress = 0

    const notifyInt = setInterval(() => {
      void handleWsEventWithRetry('ping', this.version, progress, '')
    }, 5000)

    try {
      const result: boolean = await doRestoreWorkspace(
        ctx,
        {
          uuid: workspace.uuid,
          url: workspace.url
        },
        opt.backup.backupStorage,
        opt.backup.bucketName,
        pipelineFactory,
        workspaceStorageAdapter,
        ['blob'],
        true,
        (_p: number) => {
          if (progress !== Math.round(_p)) {
            progress = Math.round(_p)
            return handleWsEventWithRetry('progress', this.version, progress, '')
          }
          return Promise.resolve()
        }
      )
      if (result) {
        ctx.info('restore completed')
        return true
      }
    } finally {
      clearInterval(notifyInt)
      await workspaceStorageAdapter.close()
    }
    return false
  }

  private async doSleep (ctx: MeasureContext, opt: WorkspaceOptions): Promise<void> {
    await new Promise<void>((resolve) => {
      const wakeup: () => void = () => {
        resolve()
        this.wakeup = this.defaultWakeup
      }
      // sleep for 5 seconds for the next operation, or until a wakeup event
      const sleepHandle = setTimeout(wakeup, opt.waitTimeout)

      this.wakeup = () => {
        clearTimeout(sleepHandle)
        wakeup()
      }
    })
  }
}
