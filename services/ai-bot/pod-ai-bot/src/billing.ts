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
import { groupByArray, MeasureContext, systemAccountUuid, WorkspaceUuid } from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import {
  getClient as getBillingClient,
  type BillingClient,
  AiTranscriptData,
  AiTokensData
} from '@hcengineering/billing-client'
import { withRetry } from '@hcengineering/retry'

import config from './config'

interface DeepgramRequest {
  request_id: string
  path: string
  created: string
  response?: {
    details?: {
      usd?: number
      duration?: number
      metadata?: Record<string, any>
      tags?: string[]
    }
    code: number
    completed: string
  }
}

interface DeepgramRequestsResponse {
  page: number
  limit: number
  requests?: DeepgramRequest[]
}

export interface TranscriptData {
  workspace: WorkspaceUuid
  day: string
  requestId: string
  startTime: string
  durationSeconds: number
  usd: number
}

async function fetchDeepgramRequests (
  ctx: MeasureContext,
  start?: Date,
  end?: Date,
  page?: number
): Promise<DeepgramRequestsResponse> {
  const url = new URL(`https://api.deepgram.com/v1/projects/${config.DeepgramProjectId}/requests`)
  if (start != null) {
    url.searchParams.set('start', start.toISOString())
  }
  if (end != null) {
    url.searchParams.set('end', end.toISOString())
  }

  if (page != null) {
    url.searchParams.set('page', page.toString())
  }

  url.searchParams.set('limit', '100')

  const res = await fetch(url, {
    headers: { Authorization: `Token ${config.DeepgramApiKey}` }
  })

  if (!res.ok) {
    const text = await res.text()
    ctx.error('Failed to fetch deepgram requests', { status: res.status, text })
    throw new Error(`Failed to fetch deepgram requests ${res.status}: ${text}`)
  }

  return await res.json()
}

function extractExtra (path: string): Record<string, any> {
  try {
    const query = path.split('?')[1]
    if (query == null) return {}
    const params = new URLSearchParams(query)
    const extras = params.getAll('extra')
    return Object.fromEntries(extras.map((pair) => pair.split(':', 2)).filter(([k, v]) => k != null && v != null))
  } catch {
    return {}
  }
}

function extractWorkspace (req: DeepgramRequest): WorkspaceUuid | undefined {
  const metadata = req.response?.details?.metadata ?? {}
  if (metadata?.workspace != null && metadata.workspace !== '') return metadata.workspace
  const extra = extractExtra(req.path ?? '')
  const ws = extra.workspace

  if (ws == null) return undefined
  if (typeof ws !== 'string') return undefined
  if (ws.trim() === '') return undefined
  return ws as WorkspaceUuid
}

async function fetchLastData (ctx: MeasureContext, billingClient: BillingClient): Promise<AiTranscriptData | undefined> {
  try {
    return await billingClient.getAiTranscriptLastData()
  } catch (e: any) {
    if (e.name === 'NetworkError') {
      throw e
    }

    return undefined
  }
}

export async function updateDeepgramBilling (ctx: MeasureContext): Promise<void> {
  if (config.DeepgramApiKey === '' || config.DeepgramProjectId === '' || config.DeepgramTag === '') return
  ctx.info('Starting deepgram billing update')

  const token = generateToken(systemAccountUuid, undefined, { service: 'ai-bot' })
  const billingClient = getBillingClient(config.BillingUrl, token)

  const lastData = await withRetry(() => fetchLastData(ctx, billingClient))
  ctx.info('Last deepgram request', lastData)

  const start = lastData != null ? new Date(lastData.lastStartTime) : undefined
  const end = new Date()
  let page = 0

  const data: TranscriptData[] = []

  while (true) {
    const res = await withRetry(() => fetchDeepgramRequests(ctx, start, end, page))
    const requests = res.requests ?? []

    for (const req of requests) {
      if (lastData != null && lastData.lastRequestId === req.request_id) continue

      const tags = req.response?.details?.tags ?? []
      if (!tags.includes(config.DeepgramTag)) continue
      const workspace = extractWorkspace(req)
      if (workspace == null) continue

      const endTime = req.response?.completed
      const durationSeconds = req.response?.details?.duration
      const usd = req.response?.details?.usd

      if (endTime == null || durationSeconds == null || usd == null) {
        continue
      }

      const day = new Date(req.created)
      day.setHours(0, 0, 0, 0)

      data.push({
        workspace,
        day: day.toISOString(),
        requestId: req.request_id,
        startTime: req.created,
        durationSeconds,
        usd
      })
    }

    if (requests.length < res.limit) break

    page++
  }

  const groupped = groupByArray(data, (it) => `${it.workspace}:${it.day}`)
  const requestData: AiTranscriptData[] = []

  for (const [, values] of groupped.entries()) {
    if (values.length === 0) continue

    const last = values.reduce((a, b) => (new Date(a.startTime).getTime() > new Date(b.startTime).getTime() ? a : b))

    const totalDurationSeconds = values.reduce((sum, it) => sum + (it.durationSeconds ?? 0), 0)
    const totalUsd = values.reduce((sum, it) => sum + (it.usd ?? 0), 0)

    const req: AiTranscriptData = {
      workspace: values[0].workspace,
      day: values[0].day,
      lastRequestId: last.requestId,
      lastStartTime: last.startTime,
      durationSeconds: totalDurationSeconds,
      usd: totalUsd
    }
    requestData.push(req)
  }

  if (requestData.length > 0) {
    await billingClient.postAiTranscriptData(requestData)
  }

  ctx.info('Finished deepgram billing update')
}

export async function pushTokensData (ctx: MeasureContext, data: AiTokensData[]): Promise<void> {
  if (config.BillingUrl === '') return
  try {
    const token = generateToken(systemAccountUuid, undefined, { service: 'ai-bot' })
    const billingClient = getBillingClient(config.BillingUrl, token)
    await billingClient.postAiTokensData(data)
  } catch (e) {
    ctx.error('Failed to push tokens data', { e })
  }
}
