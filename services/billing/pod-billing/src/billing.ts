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
import { LiveKitSessionData, BillingDB, LiveKitEgressData } from './types'
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
  res.status(200).json(await db.listLiveKitSessions(ctx, workspace))
}

export async function handleListLiveKitEgress (
  ctx: MeasureContext,
  db: BillingDB,
  storageConfigs: StorageConfig[],
  req: Request,
  res: Response
): Promise<void> {
  const workspace = getWorkspaceUuid(req)
  res.status(200).json(await db.listLiveKitEgress(ctx, workspace))
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
  const { fromDate, toDate } = parseDateParameters(req)
  const liveKitStats = await db.getLiveKitStats(ctx, workspace, fromDate, toDate)
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
  const { fromDate, toDate } = parseDateParameters(req)
  res.status(200).json(await db.getLiveKitStats(ctx, workspace, fromDate, toDate))
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

function parseDateParameters (req: Request): { fromDate: Date, toDate: Date } {
  let fromDate: Date
  if (typeof req.query.fromDate === 'string') {
    fromDate = new Date(Date.parse(req.query.fromDate))
  } else {
    fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  }

  let toDate: Date
  if (typeof req.query.toDate === 'string') {
    toDate = new Date(Date.parse(req.query.toDate))
  } else {
    toDate = new Date(Date.now())
  }

  return { fromDate, toDate }
}
