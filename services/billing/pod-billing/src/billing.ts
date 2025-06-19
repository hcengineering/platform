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

export async function handleListLiveKitSessions (
  ctx: MeasureContext,
  db: BillingDB,
  storageConfigs: StorageConfig[],
  req: Request,
  res: Response
): Promise<void> {
  const { workspace } = req.params
  res.status(200).json(await db.listLiveKitSessions(ctx, workspace))
}

export async function handleListLiveKitEgress (
  ctx: MeasureContext,
  db: BillingDB,
  storageConfigs: StorageConfig[],
  req: Request,
  res: Response
): Promise<void> {
  const { workspace } = req.params
  res.status(200).json(await db.listLiveKitEgress(ctx, workspace))
}

export async function handleSetLiveKitSessions (
  ctx: MeasureContext,
  db: BillingDB,
  storageConfigs: StorageConfig[],
  req: Request,
  res: Response
): Promise<void> {
  const { workspace } = req.params
  const data = await req.body as LiveKitSessionData[]
  await db.setLiveKitSessions(ctx, workspace, data)
  res.status(204)
}

export async function handleSetLiveKitEgress (
  ctx: MeasureContext,
  db: BillingDB,
  storageConfigs: StorageConfig[],
  req: Request,
  res: Response
): Promise<void> {
  const { workspace } = req.params
  const data = await req.body as LiveKitEgressData[]
  await db.setLiveKitEgress(ctx, workspace, data)
  res.status(204)
}

export async function handleGetStats (
  ctx: MeasureContext,
  db: BillingDB,
  storageConfigs: StorageConfig[],
  req: Request,
  res: Response
): Promise<void> {
  const { workspace } = req.params
  const liveKitStats = await db.getLiveKitStats(ctx, workspace)
  const datalakeStats = await collectDatalakeStats(ctx, workspace as WorkspaceUuid, storageConfigs)
  res.status(200).json({ liveKitStats, datalakeStats })
}

export async function handleGetLiveKitStats (
  ctx: MeasureContext,
  db: BillingDB,
  storageConfigs: StorageConfig[],
  req: Request,
  res: Response
): Promise<void> {
  const { workspace } = req.params
  res.status(200).json(await db.getLiveKitStats(ctx, workspace))
}

export async function handleGetDatalakeStats (
  ctx: MeasureContext,
  db: BillingDB,
  storageConfigs: StorageConfig[],
  req: Request,
  res: Response
): Promise<void> {
  const { workspace } = req.params
  res.status(200).json(await collectDatalakeStats(ctx, workspace as WorkspaceUuid, storageConfigs))
}

async function collectDatalakeStats (ctx: MeasureContext, workspace: WorkspaceUuid, storageConfigs: StorageConfig[]): Promise<WorkspaceStats> {
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

/*
export async function handleLiveKitEgress(request: IRequest, env: Env): Promise<Response> {
  const workspace = request.params.workspace
  const data = await request.json<LiveKitEgressData>()

  await withPostgres(env, async (db) => {
    await db.createLiveKitEgressData(workspace, data)
  })

  return new Response(null, { status: 204 })
}
*/
