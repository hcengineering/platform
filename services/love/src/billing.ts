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

// Example:
//  {
//    "roomId": "RM_ROOM_ID",
//    "roomName": "w-room-name",
//    "numParticipants": 2,
//    "bandwidth": "1000",
//    "connectionMinutes": "120",
//    "startTime": "2025-01-01T12:00:00Z",
//    "endTime": "2025-01-01T13:00:00Z",
//    "participants": [ ... ]
//  }
interface LiveKitSession {
  roomId: string
  roomName: string
  startTime: string
  endTime: string
  bandwidth: string
  connectionMinutes: string
}

async function getLiveKitSession (ctx: MeasureContext, sessionId: string): Promise<LiveKitSession> {
  const token = await createAnalyticsToken()
  const endpoint = `https://cloud-api.livekit.io/api/project/${config.LiveKitProject}/sessions/${sessionId}?v=2`
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      ctx.error('failed to get session analytics', { session: sessionId, status: response.status })
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`)
    }

    return (await response.json()) as LiveKitSession
  } catch (error) {
    throw new Error('Failed to get session analytics')
  }
}

const createAnalyticsToken = async (): Promise<string> => {
  const at = new AccessToken(config.ApiKey, config.ApiSecret, { ttl: '10m' })
  at.addGrant({ roomList: true })

  return await at.toJwt()
}

export async function saveLiveKitSessionBilling (ctx: MeasureContext, sessionId: string): Promise<void> {
  if (config.BillingUrl === '' || config.LiveKitProject === '') {
    return
  }

  const session = await getLiveKitSession(ctx, sessionId)
  const workspace = session.roomName.split('_')[0] as WorkspaceUuid
  const endpoint = concatLink(config.BillingUrl, `/api/v1/billing/${workspace}/livekit/session`)

  const token = generateToken(systemAccountUuid, workspace)

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId,
        sessionStart: session.startTime,
        sessionEnd: session.endTime,
        bandwidth: Number(session.bandwidth),
        minutes: Number(session.connectionMinutes),
        room: session.roomName
      })
    })
    if (!res.ok) {
      throw new Error(await res.text())
    }
  } catch (err: any) {
    ctx.error('failed to save session billing', { workspace, session, err })
    throw new Error('Failed to save session billing: ' + err)
  }
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

  const token = generateToken(systemAccountUuid, workspace)

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
