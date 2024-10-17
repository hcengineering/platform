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

import core, {
  BaseWorkspaceInfo,
  DOMAIN_TX,
  getWorkspaceId,
  Hierarchy,
  ModelDb,
  SortingOrder,
  systemAccountEmail,
  type BackupClient,
  type BackupStatus,
  type Branding,
  type Client,
  type MeasureContext,
  type Tx,
  type WorkspaceIdWithUrl
} from '@hcengineering/core'
import { PlatformError, unknownError } from '@hcengineering/platform'
import { listAccountWorkspaces, updateBackupInfo } from '@hcengineering/server-client'
import {
  BackupClientOps,
  SessionDataImpl,
  type DbConfiguration,
  type Pipeline,
  type PipelineFactory,
  type StorageAdapter
} from '@hcengineering/server-core'
import { generateToken } from '@hcengineering/server-token'
import { backup } from '.'
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
    ) => DbConfiguration
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
        backuped: stats.processed,
        notChanges: stats.skipped,
        failed: stats.failedWorkspaces.length
      }
    )
  }

  async schedule (ctx: MeasureContext): Promise<void> {
    console.log('schedule backup with interval', this.config.Interval, 'seconds')
    while (!this.canceled) {
      const res = await this.backup(ctx)
      this.printStats(ctx, res)
      console.log('cool down', this.config.CoolDown, 'seconds')
      await new Promise<void>((resolve) => setTimeout(resolve, this.config.CoolDown * 1000))
    }
  }

  async backup (
    ctx: MeasureContext
  ): Promise<{ failedWorkspaces: BaseWorkspaceInfo[], processed: number, skipped: number }> {
    const workspacesIgnore = new Set(this.config.SkipWorkspaces.split(';'))
    ctx.info('skipped workspaces', { workspacesIgnore })
    let skipped = 0
    const workspaces = (await listAccountWorkspaces(this.config.Token)).filter((it) => {
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

    return await this.doBackup(ctx, workspaces)
  }

  async doBackup (
    rootCtx: MeasureContext,
    workspaces: BaseWorkspaceInfo[]
  ): Promise<{ failedWorkspaces: BaseWorkspaceInfo[], processed: number, skipped: number }> {
    let index = 0

    const failedWorkspaces: BaseWorkspaceInfo[] = []
    let processed = 0
    for (const ws of workspaces) {
      if (this.canceled) {
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
          workspaceName: ws.workspaceName ?? '',
          workspaceUrl: ws.workspaceUrl ?? ''
        }
        const result = await ctx.with('backup', { workspace: ws.workspace }, (ctx) =>
          backup(ctx, '', getWorkspaceId(ws.workspace), storage, {
            skipDomains: [],
            force: true,
            recheck: false,
            timeout: this.config.Timeout * 1000,
            connectTimeout: 5 * 60 * 1000, // 5 minutes to,
            blobDownloadLimit: 100,
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
                await txAdapter.init?.()

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
              return this.wrapPipeline(ctx, pipeline, wsUrl)
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

  wrapPipeline (ctx: MeasureContext, pipeline: Pipeline, wsUrl: WorkspaceIdWithUrl): Client & BackupClient {
    const contextData = new SessionDataImpl(
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
    ctx.contextData = contextData
    if (pipeline.context.lowLevelStorage === undefined) {
      throw new PlatformError(unknownError('Low level storage is not available'))
    }
    const backupOps = new BackupClientOps(pipeline.context.lowLevelStorage)

    return {
      findAll: async (_class, query, options) => {
        return await pipeline.findAll(ctx, _class, query, options)
      },
      findOne: async (_class, query, options) => {
        return (await pipeline.findAll(ctx, _class, query, { ...options, limit: 1 })).shift()
      },
      clean: async (domain, docs) => {
        await backupOps.clean(ctx, domain, docs)
      },
      close: async () => {},
      closeChunk: async (idx) => {
        await backupOps.closeChunk(ctx, idx)
      },
      getHierarchy: () => {
        return pipeline.context.hierarchy
      },
      getModel: () => {
        return pipeline.context.modelDb
      },
      loadChunk: async (domain, idx, recheck) => {
        return await backupOps.loadChunk(ctx, domain, idx, recheck)
      },
      loadDocs: async (domain, docs) => {
        return await backupOps.loadDocs(ctx, domain, docs)
      },
      upload: async (domain, docs) => {
        await backupOps.upload(ctx, domain, docs)
      },
      searchFulltext: async (query, options) => {
        return {
          docs: [],
          total: 0
        }
      },
      sendForceClose: async () => {},
      tx: async (tx) => {
        return {}
      },
      notify: (...tx) => {}
    }
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
  ) => DbConfiguration
): () => void {
  const backupWorker = new BackupWorker(storage, config, pipelineFactory, workspaceStorageAdapter, getConfig)

  const shutdown = (): void => {
    void backupWorker.close()
  }

  void backupWorker.schedule(ctx)
  return shutdown
}
