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

export class LoggedDB implements BillingDB {
  constructor (
    private readonly ctx: MeasureContext,
    private readonly db: BillingDB
  ) {}

  async getLiveKitStats (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    start: Date,
    end: Date
  ): Promise<LiveKitUsageData> {
    return await ctx.with('db.getLiveKitUsage', {}, () => this.db.getLiveKitStats(this.ctx, workspace, start, end))
  }

  async listLiveKitSessions (ctx: MeasureContext, workspace: WorkspaceUuid): Promise<LiveKitSessionData[] | null> {
    return await ctx.with('db.listLiveKitSessions', {}, () => this.db.listLiveKitSessions(this.ctx, workspace))
  }

  async listLiveKitEgress (ctx: MeasureContext, workspace: WorkspaceUuid): Promise<LiveKitEgressData[] | null> {
    return await ctx.with('db.listLiveKitEgress', {}, () => this.db.listLiveKitEgress(this.ctx, workspace))
  }

  async setLiveKitSessions (ctx: MeasureContext, data: LiveKitSessionData[]): Promise<void> {
    await ctx.with('db.setLiveKitSessions', {}, () => this.db.setLiveKitSessions(this.ctx, data))
  }

  async setLiveKitEgress (ctx: MeasureContext, data: LiveKitEgressData[]): Promise<void> {
    await ctx.with('db.setLiveKitEgress', {}, () => this.db.setLiveKitEgress(this.ctx, data))
  }
}
