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

import { BaseWorkspaceInfo, Data, RateLimiter, Tx, Version, type MeasureContext } from '@hcengineering/core'
import { MigrateOperation, ModelLogger } from '@hcengineering/model'
import { FileModelLogger } from '@hcengineering/server-tool'
import { Db, MongoClient } from 'mongodb'
import path from 'path'
import { listWorkspacesRaw, updateWorkspace, upgradeWorkspace, Workspace, WorkspaceInfo } from './operations'

export type UpgradeErrorHandler = (workspace: BaseWorkspaceInfo, error: any) => Promise<void>

export interface UpgradeOptions {
  errorHandler: (workspace: BaseWorkspaceInfo, error: any) => Promise<void>
  force: boolean
  console: boolean
  logs: string
  parallel: number
}

export class UpgradeWorker {
  constructor (
    readonly db: Db,
    readonly client: MongoClient,
    readonly version: Data<Version>,
    readonly txes: Tx[],
    readonly migrationOperation: [string, MigrateOperation][],
    readonly productId: string
  ) {}

  canceled = false

  st: number = Date.now()
  workspaces: BaseWorkspaceInfo[] = []
  toProcess: number = 0

  async close (): Promise<void> {
    this.canceled = true
  }

  private async _upgradeWorkspace (ctx: MeasureContext, ws: WorkspaceInfo, opt: UpgradeOptions): Promise<void> {
    if (ws.disabled === true) {
      return
    }
    const t = Date.now()

    const ctxModelLogger: ModelLogger = {
      log (msg: string, data: any): void {
        void ctx.info(msg, data)
      },
      error (msg: string, data: any): void {
        void ctx.error(msg, data)
      }
    }

    const logger = opt.console ? ctxModelLogger : new FileModelLogger(path.join(opt.logs, `${ws.workspace}.log`))

    const avgTime = (Date.now() - this.st) / (this.workspaces.length - this.toProcess + 1)
    await ctx.info('----------------------------------------------------------\n---UPGRADING----', {
      pending: this.toProcess,
      eta: Math.floor(avgTime * this.toProcess),
      workspace: ws.workspace
    })
    this.toProcess--
    try {
      await upgradeWorkspace(
        ctx,
        this.version,
        this.txes,
        this.migrationOperation,
        this.productId,
        this.db,
        ws.workspaceUrl ?? ws.workspace,
        logger,
        opt.force
      )
      await ctx.info('---done---------', {
        pending: this.toProcess,
        time: Date.now() - t,
        workspace: ws.workspace
      })
    } catch (err: any) {
      await opt.errorHandler(ws, err)

      logger.log('error', err)

      if (!opt.console) {
        await ctx.error('error', err)
      }

      await ctx.info('---failed---------', {
        pending: this.toProcess,
        time: Date.now() - t,
        workspace: ws.workspace
      })
    } finally {
      if (!opt.console) {
        ;(logger as FileModelLogger).close()
      }
    }
  }

  async upgradeAll (ctx: MeasureContext, opt: UpgradeOptions): Promise<void> {
    const workspaces = await listWorkspacesRaw(this.db, this.productId)
    workspaces.sort((a, b) => b.lastVisit - a.lastVisit)

    // We need to update workspaces with missing workspaceUrl
    for (const ws of workspaces) {
      if (ws.workspaceUrl == null) {
        const upd: Partial<Workspace> = {
          workspaceUrl: ws.workspace
        }
        if (ws.workspaceName == null) {
          upd.workspaceName = ws.workspace
        }
        await updateWorkspace(this.db, this.productId, ws, upd)
      }
    }

    const withError: string[] = []
    this.toProcess = workspaces.length
    this.st = Date.now()

    if (opt.parallel !== 0) {
      const parallel = opt.parallel
      const rateLimit = new RateLimiter(parallel)
      await ctx.info('parallel upgrade', { parallel })
      await Promise.all(
        workspaces.map((it) =>
          rateLimit.add(async () => {
            await ctx.with('do-upgrade', {}, async () => {
              await this._upgradeWorkspace(ctx, it, opt)
            })
          })
        )
      )
      await ctx.info('Upgrade done')
    } else {
      await ctx.info('UPGRADE write logs at:', { logs: opt.logs })
      for (const ws of workspaces) {
        await this._upgradeWorkspace(ctx, ws, opt)
      }
      if (withError.length > 0) {
        await ctx.info('Failed workspaces', withError)
      }
    }
  }
}
