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

export interface LiveKitSessionsUsageData {
  day: string
  bandwidth: number
  minutes: number
}

export interface LiveKitEgressUsageData {
  day: string
  minutes: number
}

export interface LiveKitUsageData {
  sessions: LiveKitSessionsUsageData[]
  egress: LiveKitEgressUsageData[]
}

export interface LiveKitSessionData {
  workspace: string
  room: string
  sessionId: string
  sessionStart: string
  sessionEnd: string
  bandwidth: number
  minutes: number
}

export interface LiveKitEgressData {
  workspace: string
  room: string
  egressId: string
  egressStart: string
  egressEnd: string
  duration: number
}

export interface BillingDB {
  getLiveKitStats: (ctx: MeasureContext, workspace: WorkspaceUuid, start: Date, end: Date) => Promise<LiveKitUsageData>
  listLiveKitSessions: (ctx: MeasureContext, workspace: WorkspaceUuid) => Promise<LiveKitSessionData[] | null>
  listLiveKitEgress: (ctx: MeasureContext, workspace: WorkspaceUuid) => Promise<LiveKitEgressData[] | null>
  setLiveKitSessions: (ctx: MeasureContext, data: LiveKitSessionData[]) => Promise<void>
  setLiveKitEgress: (ctx: MeasureContext, data: LiveKitEgressData[]) => Promise<void>
}
