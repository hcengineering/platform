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

import { MeasureContext, type WorkspaceUuid } from '@hcengineering/core'
import { BillingDB, LiveKitEgressData, LiveKitSessionData, LiveKitUsageData } from '../types'

interface RetryOptions {
  retries: number
  delay?: number
}

async function retry<T> (op: () => Promise<T>, { retries, delay }: RetryOptions): Promise<T> {
  let error: any
  while (retries > 0) {
    retries--
    try {
      return await op()
    } catch (err: any) {
      error = err
      if (retries !== 0 && delay !== undefined && delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw error
}

export class RetryDB implements BillingDB {
  constructor (
    private readonly db: BillingDB,
    private readonly options: RetryOptions
  ) {}

  async getLiveKitStats (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    start: Date,
    end: Date
  ): Promise<LiveKitUsageData> {
    return await retry(() => this.db.getLiveKitStats(ctx, workspace, start, end), this.options)
  }

  async listLiveKitSessions (ctx: MeasureContext, workspace: WorkspaceUuid): Promise<LiveKitSessionData[] | null> {
    return await retry(() => this.db.listLiveKitSessions(ctx, workspace), this.options)
  }

  async listLiveKitEgress (ctx: MeasureContext, workspace: WorkspaceUuid): Promise<LiveKitEgressData[] | null> {
    return await retry(() => this.db.listLiveKitEgress(ctx, workspace), this.options)
  }

  async setLiveKitSessions (ctx: MeasureContext, data: LiveKitSessionData[]): Promise<void> {
    await retry(() => this.db.setLiveKitSessions(ctx, data), this.options)
  }

  async setLiveKitEgress (ctx: MeasureContext, data: LiveKitEgressData[]): Promise<void> {
    await retry(() => this.db.setLiveKitEgress(ctx, data), this.options)
  }
}
