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
import {
  type BrandingMap,
  systemAccountEmail,
  type BaseWorkspaceInfo,
  type Data,
  type MeasureContext,
  type Tx,
  type Version,
  getBranding,
  getWorkspaceId
} from '@hcengineering/core'
import { type MigrateOperation, type ModelLogger } from '@hcengineering/model'
import {
  getPendingWorkspace,
  updateWorkspaceInfo,
  workerHandshake,
  withRetryUntilTimeout
} from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import { FileModelLogger } from '@hcengineering/server-tool'
import path from 'path'

import { upgradeWorkspace, createWorkspace } from './ws-operations'

export interface WorkspaceOptions {
  errorHandler: (workspace: BaseWorkspaceInfo, error: any) => Promise<void>
  force: boolean
  console: boolean
  logs: string

  ignore?: string
  waitTimeout: number
}

export class WorkspaceWorker {
  runningTasks: number = 0
  resolveBusy: (() => void) | null = null

  constructor (
    readonly version: Data<Version>,
    readonly txes: Tx[],
    readonly migrationOperation: [string, MigrateOperation][],
    readonly region: string,
    readonly limit: number,
    readonly operation: 'create' | 'upgrade' | 'all',
    readonly brandings: BrandingMap
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

  async start (ctx: MeasureContext, opt: WorkspaceOptions): Promise<void> {
    this.defaultWakeup = () => {
      ctx.info("I'm busy", { version: this.version, region: this.region })
    }
    this.wakeup = this.defaultWakeup
    const token = generateToken(systemAccountEmail, { name: '-' }, { service: 'workspace' })
    await workerHandshake(token, this.region, this.version, this.operation)

    while (true) {
      await this.waitForAvailableThread()

      const workspace = await ctx.with('get-pending-workspace', {}, async (ctx) => {
        try {
          return await getPendingWorkspace(token, this.region, this.version, this.operation)
        } catch (err) {
          ctx.error('Error getting pending workspace:', { err })
        }
      })
      if (workspace === undefined) {
        await this.doSleep(ctx, opt)
      } else {
        void this.exec(async () => {
          await this.doWorkspaceOperation(
            ctx.newChild('workspaceOperation', {
              workspace: workspace.workspace,
              workspaceName: workspace.workspaceName
            }),
            workspace,
            opt
          )
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

  private async _createWorkspace (ctx: MeasureContext, ws: BaseWorkspaceInfo, opt: WorkspaceOptions): Promise<void> {
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

    ctx.info('---CREATING----', {
      workspace: ws.workspace,
      version: this.version,
      region: this.region
    })

    try {
      const branding = getBranding(this.brandings, ws.branding)
      const wsId = getWorkspaceId(ws.workspace)
      const token = generateToken(systemAccountEmail, wsId, { service: 'workspace' })
      const handleWsEventWithRetry = (
        event: 'ping' | 'create-started' | 'progress' | 'create-done',
        version: Data<Version>,
        progress: number,
        message?: string
      ): Promise<void> => {
        return withRetryUntilTimeout(
          () => updateWorkspaceInfo(token, ws.workspace, event, version, progress, message),
          5000
        )()
      }

      if (ws.mode !== 'creating' || (ws.progress ?? 0) < 30) {
        await createWorkspace(
          ctx,
          this.version,
          branding,
          ws,
          this.txes,
          this.migrationOperation,
          handleWsEventWithRetry
        )
      } else {
        // The previous attempth failed during init script and we cannot really retry it.
        // But it should not be a blocker though. We can just warn user about that if we want.
        // So we don't clear the previous error message if any
        await handleWsEventWithRetry?.('create-done', this.version, ws.progress ?? 0)
      }

      ctx.info('---CREATE-DONE---------', {
        workspace: ws.workspace,
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
        workspace: ws.workspace,
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

  private async _upgradeWorkspace (ctx: MeasureContext, ws: BaseWorkspaceInfo, opt: WorkspaceOptions): Promise<void> {
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

    ctx.info('---UPGRADING----', {
      workspace: ws.workspace,
      version: this.version,
      region: this.region
    })

    try {
      const wsId = getWorkspaceId(ws.workspace)
      const token = generateToken(systemAccountEmail, wsId, { service: 'workspace' })
      const handleWsEventWithRetry = (
        event: 'upgrade-started' | 'progress' | 'upgrade-done' | 'ping',
        version: Data<Version>,
        progress: number,
        message?: string
      ): Promise<void> => {
        return withRetryUntilTimeout(
          () => updateWorkspaceInfo(token, ws.workspace, event, version, progress, message),
          5000
        )()
      }

      await upgradeWorkspace(
        ctx,
        this.version,
        this.txes,
        this.migrationOperation,
        ws,
        logger,
        handleWsEventWithRetry,
        opt.force
      )
      ctx.info('---UPGRADE-DONE---------', {
        workspace: ws.workspace,
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

      ctx.error('---UPGRADE-FAILED---------', {
        workspace: ws.workspace,
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

  private async doWorkspaceOperation (
    ctx: MeasureContext,
    workspace: BaseWorkspaceInfo,
    opt: WorkspaceOptions
  ): Promise<void> {
    switch (workspace.mode ?? 'active') {
      case 'creating':
      case 'pending-creation':
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
      case 'deleting':
        // Seems we failed to delete, so let's restore deletion.
        // TODO: move from account
        break
      default:
        ctx.error('Unknown workspace mode', { workspace: workspace.workspace, mode: workspace.mode })
    }
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
