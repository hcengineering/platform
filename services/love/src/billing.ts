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

import { concatLink, MeasureContext, systemAccountUuid, WorkspaceUuid } from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import { AccessToken, EgressInfo } from 'livekit-server-sdk'
import config from './config'

interface LiveKitSession {
  sessionId: string
  createdAt: string
  lastActive: string
  bandwidthIn: string
  bandwidthOut: string
  numParticipants: string
  roomName: string
  endedAt?: string
}

const processedSessionsCache = new Map<string, number>()

const createAnalyticsToken = async (): Promise<string> => {
  const at = new AccessToken(config.ApiKey, config.ApiSecret, { ttl: '10m' })
  at.addGrant({ roomList: true })

  return await at.toJwt()
}

function cleanupCache (currentDate: number): void {
  for (const [sessionId, date] of processedSessionsCache) {
    if (date >= currentDate) continue
    processedSessionsCache.delete(sessionId)
  }
}

async function getLiveKitSessions (ctx: MeasureContext, start: string, page: number): Promise<LiveKitSession[]> {
  const token = await createAnalyticsToken()
  const projectId = config.LiveKitProject
  const endpoint = `https://cloud-api.livekit.io/api/project/${projectId}/sessions?start=${start}&page=${page}&limit=100`

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      ctx.error('failed to get sessions list', { status: response.status })
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`)
    }

    return ((await response.json()) as { sessions: LiveKitSession[] }).sessions ?? []
  } catch (error) {
    throw new Error('Failed to get session analytics')
  }
}

export async function updateLiveKitSessions (ctx: MeasureContext): Promise<void> {
  const startDate = new Date()
  startDate.setHours(0, 0, 0, 0)
  startDate.setDate(startDate.getDate() - 1)
  const year = startDate.getFullYear()
  const month = String(startDate.getMonth() + 1).padStart(2, '0')
  const day = String(startDate.getDate()).padStart(2, '0')
  const start = `${year}-${month}-${day}`

  cleanupCache(startDate.getTime())

  let liveKitSessions: LiveKitSession[]
  let page = 0
  do {
    liveKitSessions = await getLiveKitSessions(ctx, start, page)

    for (const session of liveKitSessions) {
      if (processedSessionsCache.has(session.sessionId)) continue
      const sessionStart = Date.parse(session.createdAt)
      const sessionEnd = Date.parse(session.endedAt ?? session.lastActive)

      const workspace = session.roomName.split('_')[0] as WorkspaceUuid
      const endpoint = concatLink(config.BillingUrl, `/api/v1/billing/${workspace}/livekit/session`)
      const token = generateToken(systemAccountUuid, workspace, { service: 'love' })

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: session.sessionId,
            sessionStart: session.createdAt,
            sessionEnd: session.endedAt ?? session.lastActive,
            bandwidth: Math.max(Number(session.bandwidthOut), Number(session.bandwidthIn)),
            minutes: Math.round((sessionEnd - sessionStart) / (1000 * 60)),
            room: session.roomName
          })
        })
        if (!res.ok) {
          throw new Error(await res.text())
        }

        if (session.endedAt !== undefined) {
          processedSessionsCache.set(session.sessionId, sessionStart)
        }
      } catch (err: any) {
        ctx.error('failed to save session billing', { workspace, session, err })
      }
    }
    page++
  } while (liveKitSessions.length > 0)
}

export async function saveLiveKitEgressBilling (ctx: MeasureContext, egress: EgressInfo): Promise<void> {
  if (config.BillingUrl === '') {
    return
  }

  const egressStart = Number(egress.startedAt) / 1000 / 1000
  const egressEnd = Number(egress.endedAt) / 1000 / 1000
  const duration = (egressEnd - egressStart) / 1000

  const workspace = egress.roomName.split('_')[0] as WorkspaceUuid
  const endpoint = concatLink(config.BillingUrl, `/api/v1/billing/${workspace}/livekit/egress`)

  const token = generateToken(systemAccountUuid, workspace, { service: 'love' })

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        room: egress.roomName,
        egressId: egress.egressId,
        egressStart: new Date(egressStart).toISOString(),
        egressEnd: new Date(egressEnd).toISOString(),
        duration
      })
    })
    if (!res.ok) {
      throw new Error(await res.text())
    }
  } catch (err: any) {
    ctx.error('failed to save egress billing', { workspace, egress, err })
    throw new Error('Failed to save egress billing: ' + err)
  }
}
