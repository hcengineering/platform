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
  WorkspaceInfo,
  DOMAIN_TX,
  groupByArray,
  Hierarchy,
  isActiveMode,
  ModelDb,
  RateLimiter,
  SortingOrder,
  systemAccountUuid,
  type BackupStatus,
  type Branding,
  type MeasureContext,
  type Tx,
  type WorkspaceIds,
  type WorkspaceInfoWithStatus,
  WorkspaceDataId,
  WorkspaceUuid
} from '@hcengineering/core'
import {
  wrapPipeline,
  type DbConfiguration,
  type Pipeline,
  type PipelineFactory,
  type StorageAdapter
} from '@hcengineering/server-core'
import { getAccountClient } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import { backup, restore } from '.'
import { createStorageBackupStorage } from './storage'
import { clearInterval } from 'node:timers'
export interface BackupConfig {
  AccountsURL: string
  Token: string

  Interval: number // Timeout in seconds

  CoolDown: number // Cooldown in seconds
  Timeout: number // Timeout in seconds
  BucketName: string
  SkipWorkspaces: string

  Parallel: number
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
      workspace: WorkspaceIds,
      branding: Branding | null,
      externalStorage: StorageAdapter
    ) => DbConfiguration,
    readonly region: string,
    readonly contextVars: Record<string, any>,
    readonly skipDomains: string[] = []
  ) {}

  canceled = false
  async close (): Promise<void> {
    this.canceled = true
  }

  printStats (
    ctx: MeasureContext,
    stats: { failedWorkspaces: WorkspaceInfo[], processed: number, skipped: number }
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
        const res = await this.backup(ctx, (this.config.Interval / 4) * 1000)
        this.printStats(ctx, res)
        if (res.skipped === 0) {
          console.log('cool down', this.config.CoolDown, 'seconds')
          await new Promise<void>((resolve) => setTimeout(resolve, this.config.CoolDown * 1000))
        }
      } catch (err: any) {
        Analytics.handleError(err)
        ctx.error('error retry in cool down/5', { cooldown: this.config.CoolDown, error: err })
        await new Promise<void>((resolve) => setTimeout(resolve, (this.config.CoolDown / 5) * 1000))
        continue
      }
    }
  }

  async backup (
    ctx: MeasureContext,
    recheckTimeout: number
  ): Promise<{ failedWorkspaces: WorkspaceInfoWithStatus[], processed: number, skipped: number }> {
    const workspacesIgnore = new Set(this.config.SkipWorkspaces.split(';'))
    ctx.info('skipped workspaces', { workspacesIgnore })
    let skipped = 0
    const now = Date.now()
    const allWorkspaces = await getAccountClient(this.config.Token).listWorkspaces(this.region, 'active')
    let workspaces = allWorkspaces.filter((it) => {
      if (!isActiveMode(it.mode)) {
        // We should backup only active workspaces
        skipped++
        return false
      }

      const createdOn = Math.floor((now - it.createdOn) / 1000)
      if (createdOn <= 2) {
        // Skip if we created is less 2 days
        return false
      }

      const lastBackup = it.backupInfo?.lastBackup ?? 0
      if ((now - lastBackup) / 1000 < this.config.Interval && this.config.Interval !== 0) {
        // No backup required, interval not elapsed
        skipped++
        return false
      }

      if (it.lastVisit == null) {
        skipped++
        return false
      }

      const lastVisitSec = Math.floor((now - it.lastVisit) / 1000)
      if (lastVisitSec > this.config.Interval) {
        // No backup required, interval not elapsed
        skipped++
        return false
      }
      return !workspacesIgnore.has(it.uuid)
    })

    workspaces.sort((a, b) => {
      return (a.backupInfo?.lastBackup ?? 0) - (b.backupInfo?.lastBackup ?? 0)
    })

    // Shift new with existing ones.
    const existingNew = groupByArray(workspaces, (it) => it.backupInfo != null)

    const existing = existingNew.get(true) ?? []
    const newOnes = existingNew.get(false) ?? []
    const mixedBackupSorting: WorkspaceInfoWithStatus[] = []

    while (existing.length > 0 || newOnes.length > 0) {
      const e = existing.shift()
      const n = newOnes.shift()
      if (e != null) {
        mixedBackupSorting.push(e)
      }
      if (n != null) {
        mixedBackupSorting.push(n)
      }
    }

    workspaces = mixedBackupSorting

    ctx.warn('Preparing for BACKUP', {
      total: workspaces.length,
      skipped,
      workspaces: workspaces.map((it) => it.url)
    })

    const part = workspaces.slice(0, 500)
    let idx = 0
    for (const ws of part) {
      ctx.warn('prepare workspace', {
        idx: ++idx,
        workspace: ws.url ?? ws.uuid,
        backupSize: ws.backupInfo?.backupSize ?? 0,
        lastBackupSec: (now - (ws.backupInfo?.lastBackup ?? 0)) / 1000
      })
    }

    let index = 0

    const failedWorkspaces: WorkspaceInfoWithStatus[] = []
    let processed = 0
    const startTime = Date.now()

    const rateLimiter = new RateLimiter(this.config.Parallel)

    const times: number[] = []

    const infoTo = setInterval(() => {
      const avgTime = times.length > 0 ? Math.round(times.reduce((p, c) => p + c, 0) / times.length) / 1000 : 0
      ctx.warn('********** backup info **********', {
        processed,
        toGo: workspaces.length - processed,
        avgTime,
        index,
        Elapsed: (Date.now() - startTime) / 1000,
        ETA: Math.round((workspaces.length - processed) * avgTime)
      })
    }, 10000)

    try {
      for (const ws of workspaces) {
        await rateLimiter.add(async () => {
          try {
            index++
            if (this.canceled || Date.now() - startTime > recheckTimeout) {
              return // If canceled, we should stop
            }
            const st = Date.now()
            const result = await this.doBackup(ctx, ws)
            const totalTime = Date.now() - st
            times.push(totalTime)
            if (!result) {
              failedWorkspaces.push(ws)
              return
            }
            processed++
          } catch (err: any) {
            ctx.error('Backup failed', { err })
          }
        })
      }

      await rateLimiter.waitProcessing()
    } finally {
      clearInterval(infoTo)
    }
    return { failedWorkspaces, processed, skipped: workspaces.length - processed }
  }

  async doBackup (
    rootCtx: MeasureContext,
    ws: WorkspaceInfoWithStatus,
    notify?: (progress: number) => Promise<void>
  ): Promise<boolean> {
    const st = Date.now()
    rootCtx.warn('\n\nBACKUP WORKSPACE ', {
      workspace: ws.uuid,
      url: ws.url
    })
    const ctx = rootCtx.newChild(ws.uuid, { workspace: ws.uuid, url: ws.url })
    const dataId = ws.dataId ?? (ws.uuid as unknown as WorkspaceDataId)
    let pipeline: Pipeline | undefined
    const backupIds = {
      uuid: this.config.BucketName as WorkspaceUuid,
      dataId: this.config.BucketName as WorkspaceDataId,
      url: ''
    }
    try {
      const storage = await createStorageBackupStorage(ctx, this.storageAdapter, backupIds, dataId)
      const wsIds: WorkspaceIds = {
        uuid: ws.uuid,
        dataId: ws.dataId,
        url: ws.url
      }
      const result = await ctx.with('backup', { workspace: ws.uuid, url: ws.url }, (ctx) =>
        backup(ctx, '', wsIds, storage, {
          skipDomains: this.skipDomains,
          force: true,
          timeout: this.config.Timeout * 1000,
          connectTimeout: 5 * 60 * 1000, // 5 minutes to,
          blobDownloadLimit: this.downloadLimit,
          skipBlobContentTypes: [],
          storageAdapter: this.workspaceStorageAdapter,
          getLastTx: async (): Promise<Tx | undefined> => {
            const config = this.getConfig(ctx, wsIds, null, this.workspaceStorageAdapter)
            const adapterConf = config.adapters[config.domains[DOMAIN_TX]]
            const hierarchy = new Hierarchy()
            const modelDb = new ModelDb(hierarchy)
            const txAdapter = await adapterConf.factory(
              ctx,
              this.contextVars,
              hierarchy,
              adapterConf.url,
              wsIds,
              modelDb,
              this.workspaceStorageAdapter
            )
            try {
              await txAdapter.init?.(ctx, this.contextVars)

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
              pipeline = await this.pipelineFactory(ctx, wsIds, true, () => {}, null)
            }
            return wrapPipeline(ctx, pipeline, wsIds)
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
          workspace: ws.uuid,
          workspaceUrl: ws.url,
          workspaceName: ws.name,
          ...backupInfo,
          time: Math.round((Date.now() - st) / 1000)
        })
        // We need to report update for stats to account service
        const token = generateToken(systemAccountUuid, ws.uuid, { service: 'backup' })
        await getAccountClient(token).updateBackupInfo(backupInfo)
      }
    } catch (err: any) {
      rootCtx.error('\n\nFAILED to BACKUP', { workspace: ws.uuid, url: ws.url, err })
      return false
    } finally {
      if (pipeline !== undefined) {
        await pipeline.close()
      }
    }
    return true
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
    workspace: WorkspaceIds,
    branding: Branding | null,
    externalStorage: StorageAdapter
  ) => DbConfiguration,
  region: string,
  contextVars: Record<string, any>,
  recheck?: boolean
): () => void {
  const backupWorker = new BackupWorker(
    storage,
    config,
    pipelineFactory,
    workspaceStorageAdapter,
    getConfig,
    region,
    contextVars
  )

  const shutdown = (): void => {
    void backupWorker.close()
  }

  void backupWorker.schedule(ctx)
  return shutdown
}

export async function doBackupWorkspace (
  ctx: MeasureContext,
  workspace: WorkspaceInfoWithStatus,
  storage: StorageAdapter,
  config: BackupConfig,
  pipelineFactory: PipelineFactory,
  workspaceStorageAdapter: StorageAdapter,
  getConfig: (
    ctx: MeasureContext,
    workspace: WorkspaceIds,
    branding: Branding | null,
    externalStorage: StorageAdapter
  ) => DbConfiguration,
  region: string,
  downloadLimit: number,
  skipDomains: string[],
  contextVars: Record<string, any>,
  notify?: (progress: number) => Promise<void>
): Promise<boolean> {
  const backupWorker = new BackupWorker(
    storage,
    config,
    pipelineFactory,
    workspaceStorageAdapter,
    getConfig,
    region,
    contextVars,
    skipDomains
  )
  backupWorker.downloadLimit = downloadLimit
  const result = await backupWorker.doBackup(ctx, workspace, notify)
  await backupWorker.close()
  return result
}

export async function doRestoreWorkspace (
  rootCtx: MeasureContext,
  wsIds: WorkspaceIds,
  backupAdapter: StorageAdapter,
  bucketName: string,
  pipelineFactory: PipelineFactory,
  workspaceStorageAdapter: StorageAdapter,
  skipDomains: string[],
  cleanIndexState: boolean,
  notify?: (progress: number) => Promise<void>
): Promise<boolean> {
  rootCtx.warn('\nRESTORE WORKSPACE ', {
    workspace: wsIds.uuid
  })
  const ctx = rootCtx.newChild(wsIds.uuid, { workspace: wsIds.uuid })
  let pipeline: Pipeline | undefined
  try {
    const restoreIds = { uuid: bucketName as WorkspaceUuid, dataId: bucketName as WorkspaceDataId, url: '' }
    const storage = await createStorageBackupStorage(ctx, backupAdapter, restoreIds, wsIds.uuid)
    const result: boolean = await ctx.with('restore', { workspace: wsIds.uuid }, (ctx) =>
      restore(ctx, '', wsIds, storage, {
        date: -1,
        skip: new Set(skipDomains),
        recheck: false, // Do not need to recheck
        storageAdapter: workspaceStorageAdapter,
        cleanIndexState,
        getConnection: async () => {
          if (pipeline === undefined) {
            pipeline = await pipelineFactory(ctx, wsIds, true, () => {}, null)
          }
          return wrapPipeline(ctx, pipeline, wsIds)
        },
        progress: (progress) => {
          return notify?.(progress) ?? Promise.resolve()
        }
      })
    )
    return result
  } catch (err: any) {
    rootCtx.error('\n\nFAILED to RESTORE', { workspace: wsIds.uuid, err })
    return false
  } finally {
    if (pipeline !== undefined) {
      await pipeline.close()
    }
  }
}
