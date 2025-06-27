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

      const ids = [...groups.keys()]
      if (ids.length === 0) return
      const limiter = new RateLimiter(config.InitLimit)
      const infos = await this.accountClient.getWorkspacesInfo(ids)
      for (const info of infos) {
        const integrations = groups.get(info.uuid) ?? []
        if (await this.checkWorkspace(info, integrations)) {
          await limiter.add(async () => {
            try {
              this.ctx.info('start workspace', { workspace: info.uuid })
              await WorkspaceClient.run(this.ctx, this.accountClient, info.uuid)
            } catch (err) {
              this.ctx.error('Failed to start workspace', { workspace: info.uuid, error: err })
            }
          })
        }
      }
      await limiter.waitProcessing()
    } catch (err: any) {
      this.ctx.error('Failed to start existing integrations', err)
    }
  }

  private async checkWorkspace (info: WorkspaceInfoWithStatus, integrations: Integration[]): Promise<boolean> {
    if (isDeletingMode(info.mode)) {
      if (integrations !== undefined) {
        for (const int of integrations) {
          await this.accountClient.deleteIntegration(int)
        }
      }
      return false
    }
    if (!isActiveMode(info.mode)) {
      this.ctx.info('workspace is not active', { workspaceUuid: info.uuid })
      return false
    }
    return true
  }
}
