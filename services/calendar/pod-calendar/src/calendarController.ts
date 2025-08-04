//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { AccountClient, Integration } from '@hcengineering/account-client'
import {
  MeasureContext,
  RateLimiter,
  WorkspaceInfoWithStatus,
  WorkspaceUuid,
  isActiveMode,
  isDeletingMode
} from '@hcengineering/core'
import config from './config'
import { getIntegrations } from './integrations'
import { WorkspaceClient } from './workspaceClient'

interface WorkspaceStateInfo {
  shouldStart: boolean
  needRecheck: boolean
}

export class CalendarController {
  protected static _instance: CalendarController

  private constructor (
    private readonly ctx: MeasureContext,
    readonly accountClient: AccountClient
  ) {
    CalendarController._instance = this
  }

  static getCalendarController (ctx: MeasureContext, accountClient: AccountClient): CalendarController {
    if (CalendarController._instance !== undefined) {
      return CalendarController._instance
    }
    return new CalendarController(ctx, accountClient)
  }

  async startAll (): Promise<void> {
    try {
      const integrations = await getIntegrations(this.accountClient)
      this.ctx.info('Start integrations', { count: integrations.length })

      const groups = new Map<WorkspaceUuid, Integration[]>()
      for (const int of integrations) {
        if (int.workspaceUuid === null) continue
        const group = groups.get(int.workspaceUuid)
        if (group === undefined) {
          groups.set(int.workspaceUuid, [int])
        } else {
          group.push(int)
          groups.set(int.workspaceUuid, group)
        }
      }
      void this.runAll(groups)
    } catch (err: any) {
      this.ctx.error('Failed to start existing integrations', err)
    }
  }

  private async runAll (groups: Map<WorkspaceUuid, Integration[]>): Promise<void> {
    const ids = [...groups.keys()]
    if (ids.length === 0) return
    const limiter = new RateLimiter(config.InitLimit)
    const infos = await this.accountClient.getWorkspacesInfo(ids)
    const outdatedWorkspaces = new Set<WorkspaceUuid>()
    for (let index = 0; index < infos.length; index++) {
      const info = infos[index]
      const integrations = groups.get(info.uuid) ?? []
      const { shouldStart, needRecheck } = await this.checkWorkspace(info, integrations)

      if (shouldStart) {
        await limiter.add(async () => {
          try {
            this.ctx.info('start workspace', { workspace: info.uuid })
            await WorkspaceClient.run(this.ctx, this.accountClient, info.uuid)
          } catch (err) {
            this.ctx.error('Failed to start workspace', { workspace: info.uuid, error: err })
          }
        })
      }

      if (needRecheck) {
        outdatedWorkspaces.add(info.uuid)
      }

      if (index % 10 === 0) {
        this.ctx.info('starting progress', { value: index + 1, total: infos.length })
      }
    }
    await limiter.waitProcessing()
    this.ctx.info('Started all workspaces', { count: infos.length })

    if (outdatedWorkspaces.size > 0) {
      this.ctx.info('Found outdated workspaces for future recheck', { count: outdatedWorkspaces.size })
      // Schedule recheck for outdated workspaces
      const outdatedGroups = new Map<WorkspaceUuid, Integration[]>()
      for (const workspaceId of outdatedWorkspaces) {
        const integrations = groups.get(workspaceId)
        if (integrations !== undefined) {
          outdatedGroups.set(workspaceId, integrations)
        }
      }
      void this.recheckOutdatedWorkspaces(outdatedGroups)
    }
  }

  private async checkWorkspace (
    info: WorkspaceInfoWithStatus,
    integrations: Integration[]
  ): Promise<WorkspaceStateInfo> {
    if (isDeletingMode(info.mode)) {
      if (integrations !== undefined) {
        for (const int of integrations) {
          await this.accountClient.deleteIntegration(int)
        }
      }
      return { shouldStart: false, needRecheck: false }
    }
    if (!isActiveMode(info.mode)) {
      this.ctx.info('workspace is not active', { workspaceUuid: info.uuid })
      return { shouldStart: false, needRecheck: false }
    }
    const lastVisit = (Date.now() - (info.lastVisit ?? 0)) / (3600 * 24 * 1000) // In days

    if (lastVisit > config.WorkspaceInactivityInterval) {
      this.ctx.info('workspace is outdated, needs recheck', {
        workspaceUuid: info.uuid,
        lastVisitDays: lastVisit.toFixed(1)
      })
      return { shouldStart: false, needRecheck: true }
    }
    return { shouldStart: true, needRecheck: false }
  }

  // TODO: Subscribe to workspace queue istead of using setTimeout
  async recheckOutdatedWorkspaces (outdatedGroups: Map<WorkspaceUuid, Integration[]>): Promise<void> {
    try {
      await new Promise<void>((resolve) => {
        setTimeout(
          () => {
            resolve()
          },
          10 * 60 * 1000
        ) // Wait 10 minutes
      })

      const ids = [...outdatedGroups.keys()]
      const limiter = new RateLimiter(config.InitLimit)
      const infos = await this.accountClient.getWorkspacesInfo(ids)
      const stillOutdatedGroups = new Map<WorkspaceUuid, Integration[]>()

      for (let index = 0; index < infos.length; index++) {
        const info = infos[index]
        const integrations = outdatedGroups.get(info.uuid) ?? []
        const { shouldStart, needRecheck } = await this.checkWorkspace(info, integrations)

        if (shouldStart) {
          await limiter.add(async () => {
            try {
              this.ctx.info('restarting previously outdated workspace', { workspace: info.uuid })
              await WorkspaceClient.run(this.ctx, this.accountClient, info.uuid)
            } catch (err) {
              this.ctx.error('Failed to restart workspace', { workspace: info.uuid, error: err })
            }
          })
        } else if (needRecheck) {
          // Keep this workspace for future recheck
          stillOutdatedGroups.set(info.uuid, integrations)
        }
      }

      await limiter.waitProcessing()

      if (stillOutdatedGroups.size > 0) {
        this.ctx.info('Still outdated workspaces, scheduling next recheck', { count: stillOutdatedGroups.size })
        void this.recheckOutdatedWorkspaces(stillOutdatedGroups)
      }
    } catch (err: any) {
      this.ctx.error('Failed to recheck outdated workspaces', { error: err })
    }
  }
}
