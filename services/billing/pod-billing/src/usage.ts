//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { type AccountClient, type Subscription, getClient } from '@hcengineering/account-client'
import {
  type MeasureContext,
  type UsageStatus,
  type WorkspaceUuid,
  RateLimiter,
  isArchivingMode,
  isDeletingMode,
  systemAccountUuid
} from '@hcengineering/core'
import { type StorageConfig } from '@hcengineering/server-core'
import { generateToken } from '@hcengineering/server-token'

import { collectDatalakeStats } from './billing'
import { type Config } from './config'
import { type BillingDB } from './types'

export class UsageWorker {
  private canceled: boolean = false
  private promise: Promise<void> = Promise.resolve()

  constructor (
    private readonly db: BillingDB,
    private readonly storageConfigs: StorageConfig[],
    private readonly config: Config
  ) {}

  async close (): Promise<void> {
    this.canceled = true
    await this.promise
  }

  async schedule (ctx: MeasureContext): Promise<void> {
    ctx.info('schedule usage update with interval', { interval: this.config.UsageUpdateInterval })

    this.promise = this.run(ctx)
  }

  private async run (ctx: MeasureContext): Promise<void> {
    while (!this.canceled) {
      try {
        await this.recheckWorkspaces(ctx)
      } catch (err: any) {
        ctx.error('failed to recheck workspaces', { error: err })
      }

      if (!this.canceled) {
        await new Promise((resolve) => setTimeout(resolve, this.config.UsageUpdateInterval * 1000))
      }
    }
  }

  async recheckWorkspaces (ctx: MeasureContext): Promise<void> {
    const now = Date.now()
    const account = getAccountClient(this.config.AccountsUrl, undefined)
    const workspaces = await account.listWorkspaces(undefined)

    ctx.info('rechecking workspaces', { count: workspaces.length })

    const limiter = new RateLimiter(10)
    for (const workspace of workspaces) {
      if (this.canceled) {
        throw new Error('Workspace recheck canceled')
      }

      if (isArchivingMode(workspace.mode) || isDeletingMode(workspace.mode)) {
        continue
      }

      const updateTime = workspace.usageInfo?.updateTime ?? 0
      if ((now - updateTime) / 1000 < this.config.UsageUpdateInterval) {
        continue
      }

      await limiter.add(async () => {
        try {
          await ctx.with(
            'update workspace usage statistics',
            {},
            async (ctx) => {
              await this.updateWorkspaceUsageStatistics(ctx, now, workspace.uuid)
            },
            { workspace: workspace.uuid }
          )
        } catch (err: any) {
          ctx.error('failed to update usage statistics for workspace', { workspace: workspace.uuid, err })
        }
      })
    }
  }

  async updateWorkspaceUsageStatistics (ctx: MeasureContext, now: number, workspace: WorkspaceUuid): Promise<void> {
    const account = getAccountClient(this.config.AccountsUrl, workspace)

    const subscriptions = await account.getSubscriptions(workspace)
    const subscription = subscriptions.find((p) => p.status === 'active' && p.type === 'tier')

    const periodStart = getPeriodStartDate(subscription)
    const periodEnd = new Date(now)

    const liveKitUsage = await ctx.with(
      'get livekit usage',
      {},
      (ctx) => {
        return this.db.getLiveKitStats(ctx, workspace, periodStart, periodEnd)
      },
      { workspace }
    )
    const storageUsage = await ctx.with(
      'get storage usage',
      {},
      (ctx) => {
        return collectDatalakeStats(ctx, workspace, this.storageConfigs)
      },
      { workspace }
    )

    const livekitTrafficBytes = liveKitUsage.sessions.reduce((acc, session) => acc + session.bandwidth, 0)
    const storageBytes = storageUsage.size

    const usage: UsageStatus = {
      usage: { livekitTrafficBytes, storageBytes },
      startTime: periodStart.getTime(),
      updateTime: periodEnd.getTime()
    }

    await account.updateUsageInfo(usage)
  }
}

function getPeriodStartDate (subscription: Subscription | undefined): Date {
  if (subscription?.periodStart !== undefined) {
    return new Date(subscription.periodStart)
  }

  // For users without subscription, use past 30 days (start of day)
  const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  date.setHours(0, 0, 0, 0)
  return date
}

function getAccountClient (accountsUrl: string, workspace: WorkspaceUuid | undefined): AccountClient {
  const token = generateToken(systemAccountUuid, workspace, { service: 'billing', admin: 'true' })
  return getClient(accountsUrl, token)
}
