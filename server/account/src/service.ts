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
import {
  Workspace,
  WorkspaceInfo,
  listWorkspacesRaw,
  updateWorkspace,
  upgradeWorkspace,
  clearWorkspaceProductId
} from './operations'
import { Analytics } from '@hcengineering/analytics'

export type UpgradeErrorHandler = (workspace: BaseWorkspaceInfo, error: any) => Promise<void>

export interface UpgradeOptions {
  errorHandler: (workspace: BaseWorkspaceInfo, error: any) => Promise<void>
  force: boolean
  console: boolean
  logs: string
  parallel: number

  ignore?: string
}

export class UpgradeWorker {
  constructor (
    readonly db: Db,
    readonly client: MongoClient,
    readonly version: Data<Version>,
    readonly txes: Tx[],
    readonly migrationOperation: [string, MigrateOperation][]
  ) {}

  canceled = false

  st: number = Date.now()
  total: number = 0
  toProcess: number = 0
  eta: number = 0

  updateResponseStatistics (response: any): void {
    response.upgrade = {
      toProcess: this.toProcess,
      total: this.total,
      elapsed: Date.now() - this.st,
      eta: this.eta
    }
  }

  async close (): Promise<void> {
    this.canceled = true
  }

  private async _upgradeWorkspace (ctx: MeasureContext, ws: WorkspaceInfo, opt: UpgradeOptions): Promise<void> {
    if (ws.disabled === true || (opt.ignore ?? '').includes(ws.workspace)) {
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

    const logger = opt.console ? ctxModelLogger : new FileModelLogger(path.join(opt.logs, `${ws.workspace}.log`))

    const avgTime = (Date.now() - this.st) / (this.total - this.toProcess + 1)
    this.eta = Math.floor(avgTime * this.toProcess)
    ctx.info('----------------------------------------------------------\n---UPGRADING----', {
      pending: this.toProcess,
      eta: this.eta,
      workspace: ws.workspace
    })
    this.toProcess--
    try {
      const version = await upgradeWorkspace(
        ctx,
        this.version,
        this.txes,
        this.migrationOperation,
        this.db,
        ws.workspaceUrl ?? ws.workspace,
        logger,
        opt.force
      )
      ctx.info('---done---------', {
        pending: this.toProcess,
        time: Date.now() - t,
        workspace: ws.workspace,
        version
      })
    } catch (err: any) {
      await opt.errorHandler(ws, err)

      logger.log('error', err)

      if (!opt.console) {
        ctx.error('error', { err })
      }

      ctx.info('---failed---------', {
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
    const workspaces = await ctx.with('retrieve-workspaces', {}, async (ctx) => await listWorkspacesRaw(this.db))
    workspaces.sort((a, b) => b.lastVisit - a.lastVisit)

    for (const ws of workspaces) {
      // We need to update workspaces with missing workspaceUrl
      if (ws.workspaceUrl == null) {
        const upd: Partial<Workspace> = {
          workspaceUrl: ws.workspace
        }
        if (ws.workspaceName == null) {
          upd.workspaceName = ws.workspace
        }
        await updateWorkspace(this.db, ws, upd)
      }
      // We need to drop productId from workspace
      if ((ws as any).productId !== undefined) {
        await clearWorkspaceProductId(this.db, ws)
      }
    }

    const withError: string[] = []
    this.toProcess = workspaces.length
    this.st = Date.now()
    this.total = workspaces.length

    if (opt.parallel > 1) {
      const parallel = opt.parallel
      const rateLimit = new RateLimiter(parallel)
      ctx.info('parallel upgrade', { parallel })

      for (const it of workspaces) {
        await rateLimit.add(async () => {
          try {
            await ctx.with('do-upgrade', {}, async (ctx) => {
              await this._upgradeWorkspace(ctx, it, opt)
            })
          } catch (err: any) {
            ctx.error('Failed to update', { err })
            Analytics.handleError(err)
          }
        })
      }
      await rateLimit.waitProcessing()
      ctx.info('Upgrade done')
    } else {
      ctx.info('UPGRADE write logs at:', { logs: opt.logs })
      for (const ws of workspaces) {
        try {
          await this._upgradeWorkspace(ctx, ws, opt)
        } catch (err: any) {
          ctx.error('Failed to update', { err })
          Analytics.handleError(err)
        }
      }
      if (withError.length > 0) {
        ctx.info('Failed workspaces', withError)
      }
    }
  }
}
