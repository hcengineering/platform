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

import { Analytics } from '@hcengineering/analytics'
import core, {
  BaseWorkspaceInfo,
  DOMAIN_TX,
  getWorkspaceId,
  Hierarchy,
  isActiveMode,
  ModelDb,
  SortingOrder,
  systemAccountEmail,
  type BackupStatus,
  type Branding,
  type MeasureContext,
  type Tx,
  type WorkspaceIdWithUrl
} from '@hcengineering/core'
import { listAccountWorkspaces, updateBackupInfo } from '@hcengineering/server-client'
import {
  wrapPipeline,
  type DbConfiguration,
  type Pipeline,
  type PipelineFactory,
  type StorageAdapter
} from '@hcengineering/server-core'
import { generateToken } from '@hcengineering/server-token'
import { backup, restore } from '.'
import { createStorageBackupStorage } from './storage'
export interface BackupConfig {
  AccountsURL: string
  Token: string

  Interval: number // Timeout in seconds

  CoolDown: number // Cooldown in seconds
  Timeout: number // Timeout in seconds
  BucketName: string
  SkipWorkspaces: string
}

class BackupWorker {
  downloadLimit: number = 100
  constructor (
    readonly storageAdapter: StorageAdapter,
    readonly config: BackupConfig,
    readonly pipelineFactory: PipelineFactory,
    readonly workspaceStorageAdapter: StorageAdapter,
    readonly getConfig: (
      ctx: MeasureContext,
      workspace: WorkspaceIdWithUrl,
      branding: Branding | null,
      externalStorage: StorageAdapter
    ) => DbConfiguration,
    readonly region: string,
    readonly freshWorkspace: boolean = false,
    readonly clean: boolean = false,
    readonly skipDomains: string[] = []
  ) {}

  canceled = false
  async close (): Promise<void> {
    this.canceled = true
  }

  printStats (
    ctx: MeasureContext,
    stats: { failedWorkspaces: BaseWorkspaceInfo[], processed: number, skipped: number }
  ): void {
    ctx.warn(
      `****************************************
      backup statistics:`,
      {
        processed: stats.processed,
        notChanges: stats.skipped,
        failed: stats.failedWorkspaces.length
      }
    )
  }

  async schedule (ctx: MeasureContext): Promise<void> {
    console.log('schedule backup with interval', this.config.Interval, 'seconds')
    while (!this.canceled) {
      try {
        const res = await this.backup(ctx, this.config.CoolDown * 1000)
        this.printStats(ctx, res)
      } catch (err: any) {
        Analytics.handleError(err)
        ctx.error('error retry in cool down/5', { cooldown: this.config.CoolDown, error: err })
        await new Promise<void>((resolve) => setTimeout(resolve, (this.config.CoolDown / 5) * 1000))
        continue
      }
      console.log('cool down', this.config.CoolDown, 'seconds')
      await new Promise<void>((resolve) => setTimeout(resolve, this.config.CoolDown * 1000))
    }
  }

  async backup (
    ctx: MeasureContext,
    recheckTimeout: number
  ): Promise<{ failedWorkspaces: BaseWorkspaceInfo[], processed: number, skipped: number }> {
    const workspacesIgnore = new Set(this.config.SkipWorkspaces.split(';'))
    ctx.info('skipped workspaces', { workspacesIgnore })
    let skipped = 0
    const allWorkspaces = await listAccountWorkspaces(this.config.Token, this.region)
    const workspaces = allWorkspaces.filter((it) => {
      if (!isActiveMode(it.mode)) {
        // We should backup only active workspaces
        skipped++
        return false
      }

      const lastBackup = it.backupInfo?.lastBackup ?? 0
      if ((Date.now() - lastBackup) / 1000 < this.config.Interval) {
        // No backup required, interval not elapsed
        skipped++
        return false
      }

      if (it.lastVisit == null) {
        skipped++
        return false
      }

      const lastVisitSec = Math.floor((Date.now() - it.lastVisit) / 1000)
      if (lastVisitSec > this.config.Interval) {
        // No backup required, interval not elapsed
        skipped++
        return false
      }
      return !workspacesIgnore.has(it.workspace)
    })
    workspaces.sort((a, b) => {
      return (b.backupInfo?.backupSize ?? 0) - (a.backupInfo?.backupSize ?? 0)
    })

    ctx.info('Preparing for BACKUP', {
      total: workspaces.length,
      skipped,
      workspaces: workspaces.map((it) => it.workspace)
    })

    return await this.doBackup(ctx, workspaces, recheckTimeout)
  }

  async doBackup (
    rootCtx: MeasureContext,
    workspaces: BaseWorkspaceInfo[],
    recheckTimeout: number,
    notify?: (progress: number) => Promise<void>
  ): Promise<{ failedWorkspaces: BaseWorkspaceInfo[], processed: number, skipped: number }> {
    let index = 0

    const failedWorkspaces: BaseWorkspaceInfo[] = []
    let processed = 0
    const startTime = Date.now()
    for (const ws of workspaces) {
      if (this.canceled || Date.now() - startTime > recheckTimeout) {
        return { failedWorkspaces, processed, skipped: workspaces.length - processed }
      }
      index++
      const st = Date.now()
      rootCtx.warn('\n\nBACKUP WORKSPACE ', {
        workspace: ws.workspace,
        index,
        total: workspaces.length
      })
      const ctx = rootCtx.newChild(ws.workspace, { workspace: ws.workspace })
      let pipeline: Pipeline | undefined
      try {
        const storage = await createStorageBackupStorage(
          ctx,
          this.storageAdapter,
          getWorkspaceId(this.config.BucketName),
          ws.workspace
        )
        const wsUrl: WorkspaceIdWithUrl = {
          name: ws.workspace,
          uuid: ws.uuid,
          workspaceName: ws.workspaceName ?? '',
          workspaceUrl: ws.workspaceUrl ?? ''
        }
        const result = await ctx.with('backup', { workspace: ws.workspace }, (ctx) =>
          backup(ctx, '', getWorkspaceId(ws.workspace), storage, {
            skipDomains: this.skipDomains,
            force: true,
            freshBackup: this.freshWorkspace,
            clean: this.clean,
            timeout: this.config.Timeout * 1000,
            connectTimeout: 5 * 60 * 1000, // 5 minutes to,
            blobDownloadLimit: this.downloadLimit,
            skipBlobContentTypes: [],
            storageAdapter: this.workspaceStorageAdapter,
            getLastTx: async (): Promise<Tx | undefined> => {
              const config = this.getConfig(ctx, wsUrl, null, this.workspaceStorageAdapter)
              const adapterConf = config.adapters[config.domains[DOMAIN_TX]]
              const hierarchy = new Hierarchy()
              const modelDb = new ModelDb(hierarchy)
              const txAdapter = await adapterConf.factory(
                ctx,
                hierarchy,
                adapterConf.url,
                wsUrl,
                modelDb,
                this.workspaceStorageAdapter
              )
              try {
                await txAdapter.init?.(ctx)

                return (
                  await txAdapter.rawFindAll<Tx>(
                    DOMAIN_TX,
                    { objectSpace: { $ne: core.space.Model } },
                    { limit: 1, sort: { modifiedOn: SortingOrder.Descending } }
                  )
                ).shift()
              } finally {
                await txAdapter.close()
              }
            },
            getConnection: async () => {
              if (pipeline === undefined) {
                pipeline = await this.pipelineFactory(ctx, wsUrl, true, () => {}, null)
              }
              return wrapPipeline(ctx, pipeline, wsUrl)
            },
            progress: (progress) => {
              return notify?.(progress) ?? Promise.resolve()
            }
          })
        )

        if (result.result) {
          const backupInfo: BackupStatus = {
            backups: (ws.backupInfo?.backups ?? 0) + 1,
            lastBackup: Date.now(),
            backupSize: Math.round((result.backupSize * 100) / (1024 * 1024)) / 100,
            dataSize: Math.round((result.dataSize * 100) / (1024 * 1024)) / 100,
            blobsSize: Math.round((result.blobsSize * 100) / (1024 * 1024)) / 100
          }
          rootCtx.warn('BACKUP STATS', {
            workspace: ws.workspace,
            workspaceUrl: ws.workspaceUrl,
            workspaceName: ws.workspaceName,
            index,
            ...backupInfo,
            time: Math.round((Date.now() - st) / 1000),
            total: workspaces.length
          })
          // We need to report update for stats to account service
          processed += 1

          const token = generateToken(systemAccountEmail, { name: ws.workspace }, { service: 'backup' })
          await updateBackupInfo(token, backupInfo)
        }
      } catch (err: any) {
        rootCtx.error('\n\nFAILED to BACKUP', { workspace: ws.workspace, err })
        failedWorkspaces.push(ws)
      } finally {
        if (pipeline !== undefined) {
          await pipeline.close()
        }
      }
    }
    return { failedWorkspaces, processed, skipped: workspaces.length - processed }
  }
}

export function backupService (
  ctx: MeasureContext,
  storage: StorageAdapter,
  config: BackupConfig,
  pipelineFactory: PipelineFactory,
  workspaceStorageAdapter: StorageAdapter,
  getConfig: (
    ctx: MeasureContext,
    workspace: WorkspaceIdWithUrl,
    branding: Branding | null,
    externalStorage: StorageAdapter
  ) => DbConfiguration,
  region: string,
  recheck?: boolean
): () => void {
  const backupWorker = new BackupWorker(storage, config, pipelineFactory, workspaceStorageAdapter, getConfig, region)

  const shutdown = (): void => {
    void backupWorker.close()
  }

  void backupWorker.schedule(ctx)
  return shutdown
}

export async function doBackupWorkspace (
  ctx: MeasureContext,
  workspace: BaseWorkspaceInfo,
  storage: StorageAdapter,
  config: BackupConfig,
  pipelineFactory: PipelineFactory,
  workspaceStorageAdapter: StorageAdapter,
  getConfig: (
    ctx: MeasureContext,
    workspace: WorkspaceIdWithUrl,
    branding: Branding | null,
    externalStorage: StorageAdapter
  ) => DbConfiguration,
  region: string,
  freshWorkspace: boolean,
  clean: boolean,
  downloadLimit: number,
  skipDomains: string[],
  notify?: (progress: number) => Promise<void>
): Promise<boolean> {
  const backupWorker = new BackupWorker(
    storage,
    config,
    pipelineFactory,
    workspaceStorageAdapter,
    getConfig,
    region,
    freshWorkspace,
    clean,
    skipDomains
  )
  backupWorker.downloadLimit = downloadLimit
  const { processed } = await backupWorker.doBackup(ctx, [workspace], Number.MAX_VALUE, notify)
  await backupWorker.close()
  return processed === 1
}

export async function doRestoreWorkspace (
  rootCtx: MeasureContext,
  ws: BaseWorkspaceInfo,
  backupAdapter: StorageAdapter,
  bucketName: string,
  pipelineFactory: PipelineFactory,
  workspaceStorageAdapter: StorageAdapter,
  skipDomains: string[],
  cleanIndexState: boolean,
  notify?: (progress: number) => Promise<void>
): Promise<boolean> {
  rootCtx.warn('\nRESTORE WORKSPACE ', {
    workspace: ws.workspace
  })
  const ctx = rootCtx.newChild(ws.workspace, { workspace: ws.workspace })
  let pipeline: Pipeline | undefined
  try {
    const storage = await createStorageBackupStorage(ctx, backupAdapter, getWorkspaceId(bucketName), ws.workspace)
    const wsUrl: WorkspaceIdWithUrl = {
      name: ws.workspace,
      uuid: ws.uuid,
      workspaceName: ws.workspaceName ?? '',
      workspaceUrl: ws.workspaceUrl ?? ''
    }
    const result: boolean = await ctx.with('restore', { workspace: ws.workspace }, (ctx) =>
      restore(ctx, '', getWorkspaceId(ws.workspace), storage, {
        date: -1,
        skip: new Set(skipDomains),
        recheck: true,
        storageAdapter: workspaceStorageAdapter,
        cleanIndexState,
        getConnection: async () => {
          if (pipeline === undefined) {
            pipeline = await pipelineFactory(ctx, wsUrl, true, () => {}, null)
          }
          return wrapPipeline(ctx, pipeline, wsUrl)
        },
        progress: (progress) => {
          return notify?.(progress) ?? Promise.resolve()
        }
      })
    )
    return result
  } catch (err: any) {
    rootCtx.error('\n\nFAILED to RESTORE', { workspace: ws.workspace, err })
    return false
  } finally {
    if (pipeline !== undefined) {
      await pipeline.close()
    }
  }
}
