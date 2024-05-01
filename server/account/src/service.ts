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
    readonly migrationOperation: [string, MigrateOperation][],
    readonly productId: string
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
        this.productId,
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
        ctx.error('error', err)
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
}
