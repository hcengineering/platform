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

import type { Request, Response } from 'express'
import { MeasureContext, systemAccountUuid, WorkspaceUuid } from '@hcengineering/core'
import {
  LiveKitSessionData,
  BillingDB,
  LiveKitEgressData,
  LiveKitSessionCursor,
  BillingPeriod,
  LiveKitEgressCursor
} from './types'
import { generateToken } from '@hcengineering/server-token'
import { StorageConfig } from '@hcengineering/server-core'
import { createDatalakeClient, DatalakeConfig, WorkspaceStats } from '@hcengineering/datalake'
import { validate as uuidValidate } from 'uuid'

export async function handleListLiveKitSessions (
  ctx: MeasureContext,
  db: BillingDB,
  storageConfigs: StorageConfig[],
  req: Request,
  res: Response
): Promise<void> {
  const workspace = getWorkspaceUuid(req)
  const period = parsePeriodParameters(req)
  const cursor = parseLiveKitSessionsCursorParameters(req)

  if (req.query.sortBy === 'minutes') {
    res.status(200).json(await db.listLiveKitSessionsByMinutes(ctx, workspace, period, cursor))
  } else if (req.query.sortBy === 'bandwidth') {
    res.status(200).json(await db.listLiveKitSessionsByBandwidth(ctx, workspace, period, cursor))
  } else {
    res.status(200).json(await db.listLiveKitSessions(ctx, workspace, period, cursor))
  }
}

export async function handleListLiveKitEgress (
  ctx: MeasureContext,
  db: BillingDB,
  storageConfigs: StorageConfig[],
  req: Request,
  res: Response
): Promise<void> {
  const workspace = getWorkspaceUuid(req)
  const period = parsePeriodParameters(req)
  const cursor = parseLiveKitEgressCursorParameters(req)

  if (req.query.sortBy === 'duration') {
    res.status(200).json(await db.listLiveKitEgressByDuration(ctx, workspace, period, cursor))
  } else {
    res.status(200).json(await db.listLiveKitEgress(ctx, workspace, period, cursor))
  }
}

export async function handleSetLiveKitSessions (
  ctx: MeasureContext,
  db: BillingDB,
  storageConfigs: StorageConfig[],
  req: Request,
  res: Response
): Promise<void> {
  const data = (await req.body) as LiveKitSessionData[]
  await db.setLiveKitSessions(ctx, data)
  res.status(204).send()
}

export async function handleSetLiveKitEgress (
  ctx: MeasureContext,
  db: BillingDB,
  storageConfigs: StorageConfig[],
  req: Request,
  res: Response
): Promise<void> {
  const data = (await req.body) as LiveKitEgressData[]
  await db.setLiveKitEgress(ctx, data)
  res.status(204).send()
}

export async function handleGetStats (
  ctx: MeasureContext,
  db: BillingDB,
  storageConfigs: StorageConfig[],
  req: Request,
  res: Response
): Promise<void> {
  const workspace = getWorkspaceUuid(req)
  const period = parsePeriodParameters(req)
  const liveKitStats = await db.getLiveKitStats(ctx, workspace, period)
  const datalakeStats = await collectDatalakeStats(ctx, workspace, storageConfigs)
  res.status(200).json({ liveKitStats, datalakeStats })
}

export async function handleGetLiveKitStats (
  ctx: MeasureContext,
  db: BillingDB,
  storageConfigs: StorageConfig[],
  req: Request,
  res: Response
): Promise<void> {
  const workspace = getWorkspaceUuid(req)
  const period = parsePeriodParameters(req)
  res.status(200).json(await db.getLiveKitStats(ctx, workspace, period))
}

export async function handleGetDatalakeStats (
  ctx: MeasureContext,
  db: BillingDB,
  storageConfigs: StorageConfig[],
  req: Request,
  res: Response
): Promise<void> {
  const workspace = getWorkspaceUuid(req)
  res.status(200).json(await collectDatalakeStats(ctx, workspace, storageConfigs))
}

async function collectDatalakeStats (
  ctx: MeasureContext,
  workspace: WorkspaceUuid,
  storageConfigs: StorageConfig[]
): Promise<WorkspaceStats> {
  const result = {
    count: 0,
    size: 0
  }

  const token = generateToken(systemAccountUuid, undefined, { service: 'billing' })
  const client = createDatalakeClient(storageConfigs[0] as DatalakeConfig, token)

  for (const storageConfig of storageConfigs) {
    if (storageConfig.kind !== 'datalake') {
      continue
    }
    const storageStats = await client.getWorkspaceStats(ctx, workspace)
    result.count += storageStats.count
    result.size += storageStats.size
  }

  return result
}

function getWorkspaceUuid (req: Request): WorkspaceUuid {
  const { workspace } = req.params
  if (uuidValidate(workspace)) {
    return workspace as WorkspaceUuid
  }
  throw new Error('Unknown workspace')
}

function parseLiveKitSessionsCursorParameters (req: Request): LiveKitSessionCursor {
  return {
    limit: req.query.limit !== undefined ? parseInt(req.query.limit as string) : 100,
    sessionId: req.query.cursorSessionId as string,
    sessionStart: typeof req.query.cursorSessionStart === 'string' ? new Date(Date.parse(req.query.cursorSessionStart)) : undefined,
    minutes: req.query.cursorMinutes !== undefined ? parseInt(req.query.cursorMinutes as string) : undefined,
    bandwidth: req.query.cursorBandwidth !== undefined ? parseInt(req.query.cursorBandwidth as string) : undefined
  }
}

function parseLiveKitEgressCursorParameters (req: Request): LiveKitEgressCursor {
  return {
    limit: req.query.limit !== undefined ? parseInt(req.query.limit as string) : 100,
    egressId: req.query.cursorEgressId as string,
    egressStart: typeof req.query.cursorEgressStart === 'string' ? new Date(Date.parse(req.query.cursorEgressStart)) : undefined,
    duration: req.query.cursorDuration !== undefined ? parseInt(req.query.cursorDuration as string) : undefined
  }
}

function parsePeriodParameters (req: Request): BillingPeriod {
  let start: Date
  if (typeof req.query.fromDate === 'string') {
    start = new Date(Date.parse(req.query.fromDate))
  } else {
    start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  }

  let end: Date
  if (typeof req.query.toDate === 'string') {
    end = new Date(Date.parse(req.query.toDate))
  } else {
    end = new Date(Date.now())
  }

  return { start, end }
}
