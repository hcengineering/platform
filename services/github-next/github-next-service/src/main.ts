//
// Copyright © 2026 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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

import { getClient as getAccountClient } from '@hcengineering/account-client'
import { Analytics } from '@hcengineering/analytics'
import { configureAnalytics, createOpenTelemetryMetricsContext, SplitLogger } from '@hcengineering/analytics-service'
import core, {
  newMetrics,
  systemAccountUuid,
  type Class,
  type Doc,
  type MeasureContext,
  type PersonId,
  type Ref,
  type Tx,
  type TxCUD,
  type TxDomainEvent,
  type TxWorkspaceEvent,
  type WorkspaceUuid
} from '@hcengineering/core'
import githubNext, {
  githubNextIntegrationKind,
  type GithubNextCapabilities,
  type GithubNextIntegrationData
} from '@hcengineering/github-next'
import { getPlatformQueue } from '@hcengineering/kafka'
import { setMetadata } from '@hcengineering/platform'
import { initStatisticsContext, QueueTopic, type ConsumerHandle, type PlatformQueue } from '@hcengineering/server-core'
import serverToken, { generateToken } from '@hcengineering/server-token'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { join } from 'node:path'
import config from './config'
import {
  isGithubNextOutboundRelevantTx,
  listGithubRepositories,
  syncGithubNextDiscussions,
  syncGithubNextPullRequests,
  syncGithubNextOutboundDiscussions,
  syncGithubNextOutboundIssues,
  syncGithubNextOutboundPullRequests,
  syncGithubNextWorkspace,
  validateGithubToken
} from './index'
import { prepare } from './init'

const defaultCapabilities: GithubNextCapabilities = {
  issues: true,
  discussions: false,
  pullRequests: false
}

prepare()

configureAnalytics(config.ServiceID, process.env.VERSION ?? '0.7.0')
Analytics.setTag('application', config.ServiceID)
const ctx = initStatisticsContext(config.ServiceID, {
  factory: () =>
    createOpenTelemetryMetricsContext(
      config.ServiceID,
      {},
      {},
      newMetrics(),
      new SplitLogger(config.ServiceID, {
        root: join(process.cwd(), 'logs'),
        enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
      })
    )
})

interface GithubNextAuthorizationState {
  token: string
  socialId: PersonId
  workspaceUuid: WorkspaceUuid
}

interface GithubAccessTokenResponse {
  access_token?: string
  error?: string
  error_description?: string
}

function jsonResponse (res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  })
  res.end(JSON.stringify(payload))
}

function textResponse (res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  })
  res.end(message)
}

async function readJson<T> (req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T
}

function parseState (state: string): GithubNextAuthorizationState {
  return JSON.parse(Buffer.from(state, 'base64').toString('utf8')) as GithubNextAuthorizationState
}

async function requestGithubAccessToken (code: string): Promise<string> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: config.ClientID,
      client_secret: config.ClientSecret,
      code,
      redirect_uri: `${config.PublicURL}/api/v1/oauth/callback`
    }).toString()
  })

  const payload = (await response.json()) as GithubAccessTokenResponse
  if (!response.ok || payload.error != null || payload.access_token == null) {
    throw new Error(payload.error_description ?? payload.error ?? `GitHub OAuth failed with ${response.status}`)
  }

  return payload.access_token
}

async function saveGithubNextToken (state: GithubNextAuthorizationState, token: string): Promise<void> {
  const accountClient = getAccountClient(config.AccountsURL, state.token)
  const serviceClient = getAccountClient(
    config.AccountsURL,
    generateToken(systemAccountUuid, state.workspaceUuid, { service: 'github-next' })
  )
  const user = await validateGithubToken(token)
  const key = {
    socialId: state.socialId,
    kind: githubNextIntegrationKind,
    workspaceUuid: state.workspaceUuid
  }
  const existing = await accountClient.getIntegration(key)
  const data: GithubNextIntegrationData = {
    ...((existing?.data ?? {}) as Partial<GithubNextIntegrationData>),
    accountLogin: user.login,
    accountType: user.type,
    repositories: (existing?.data as Partial<GithubNextIntegrationData> | undefined)?.repositories ?? [],
    capabilities:
      (existing?.data as Partial<GithubNextIntegrationData> | undefined)?.capabilities ?? defaultCapabilities
  }

  if (existing == null) {
    await accountClient.createIntegration({ ...key, data })
  } else {
    await accountClient.updateIntegration({ ...existing, data })
  }

  const secretKey = { ...key, key: 'token' }
  const existingSecret = await serviceClient.getIntegrationSecret(secretKey)
  if (existingSecret == null) {
    await accountClient.addIntegrationSecret({ ...secretKey, secret: token })
  } else {
    await accountClient.updateIntegrationSecret({ ...existingSecret, secret: token })
  }
}

async function handleRepositories (req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readJson<{
    token: string
    socialId: PersonId
    workspaceUuid: WorkspaceUuid
  }>(req)
  const accountClient = getAccountClient(config.AccountsURL, body.token)
  const serviceClient = getAccountClient(
    config.AccountsURL,
    generateToken(systemAccountUuid, body.workspaceUuid, { service: 'github-next' })
  )
  const key = {
    socialId: body.socialId,
    kind: githubNextIntegrationKind,
    workspaceUuid: body.workspaceUuid
  }

  const integration = await accountClient.getIntegration(key)
  if (integration == null) {
    throw new Error('GitHub Next integration is not authorized.')
  }

  const secret = await serviceClient.getIntegrationSecret({ ...key, key: 'token' })
  if (secret == null) {
    throw new Error('GitHub Next token is not available. Authorize GitHub first.')
  }

  const [user, repositories] = await Promise.all([
    validateGithubToken(secret.secret),
    listGithubRepositories(secret.secret)
  ])
  const data: GithubNextIntegrationData = {
    ...((integration.data ?? {}) as Partial<GithubNextIntegrationData>),
    accountLogin: user.login,
    accountType: user.type,
    repositories: (integration.data as Partial<GithubNextIntegrationData> | undefined)?.repositories ?? [],
    capabilities:
      (integration.data as Partial<GithubNextIntegrationData> | undefined)?.capabilities ?? defaultCapabilities
  }
  await accountClient.updateIntegration({ ...integration, data })

  jsonResponse(res, 200, { user, repositories })
}

async function handleSync (req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readJson<{
    token: string
    socialId: PersonId
    workspaceUuid: WorkspaceUuid
  }>(req)
  const accountClient = getAccountClient(config.AccountsURL, body.token)
  const integration = await accountClient.getIntegration({
    socialId: body.socialId,
    kind: githubNextIntegrationKind,
    workspaceUuid: body.workspaceUuid
  })
  if (integration == null) {
    throw new Error('GitHub Next integration is not authorized.')
  }

  jsonResponse(res, 200, {})
  scheduleTick()
  enqueueOutboundWorkspace(body.workspaceUuid, 'manual-sync')
}

function startHttpServer (): { close: () => void } {
  const server = createServer((req, res) => {
    void (async () => {
      if (req.method === 'OPTIONS') {
        jsonResponse(res, 200, {})
        return
      }

      const requestUrl = new URL(req.url ?? '/', config.PublicURL)
      if (req.method === 'GET' && requestUrl.pathname === '/api/v1/oauth/callback') {
        const code = requestUrl.searchParams.get('code')
        const state = requestUrl.searchParams.get('state')
        if (code == null || state == null) {
          textResponse(res, 400, 'Missing GitHub OAuth code or state.')
          return
        }
        const parsedState = parseState(state)
        await saveGithubNextToken(parsedState, await requestGithubAccessToken(code))
        textResponse(
          res,
          200,
          '<html><body>GitHub authorization completed.<script>window.close()</script></body></html>'
        )
        scheduleTick()
        enqueueOutboundWorkspace(parsedState.workspaceUuid, 'oauth')
        return
      }

      if (req.method === 'POST' && requestUrl.pathname === '/api/v1/repositories') {
        await handleRepositories(req, res)
        return
      }

      if (req.method === 'POST' && requestUrl.pathname === '/api/v1/sync') {
        await handleSync(req, res)
        return
      }

      jsonResponse(res, 404, { error: 'Not found' })
    })().catch((err) => {
      ctx.error('request failed', { err })
      jsonResponse(res, 500, { error: err instanceof Error ? err.message : String(err) })
    })
  })

  server.listen(config.Port, () => {
    ctx.info(`[${config.ServiceID}] HTTP API listening on ${config.Port}`)
  })

  return {
    close: () => {
      server.close()
    }
  }
}

function uniqueWorkspaces (workspaces: Array<WorkspaceUuid | null | undefined>): WorkspaceUuid[] {
  return [...new Set(workspaces.filter((workspace): workspace is WorkspaceUuid => workspace != null))]
}

async function getGithubNextWorkspaces (): Promise<WorkspaceUuid[]> {
  const token = generateToken(systemAccountUuid, undefined, { service: 'github-next' })
  const accountClient = getAccountClient(config.AccountsURL, token)
  const integrations = await accountClient.listIntegrations({
    kind: githubNextIntegrationKind
  })

  return uniqueWorkspaces(integrations.map((integration) => integration.workspaceUuid))
}

async function syncInboundWorkspace (ctx: MeasureContext, workspaceUuid: WorkspaceUuid): Promise<void> {
  if (!config.SyncInbound) return

  inboundWorkspaces.add(workspaceUuid)
  try {
    const issuesResult = await syncGithubNextWorkspace(ctx, config.AccountsURL, workspaceUuid)
    ctx.info(
      `[${config.ServiceID}] inbound issues ${workspaceUuid}: integrations=${issuesResult.integrations}, ` +
        `repositories=${issuesResult.repositories}, issues=${issuesResult.issuesSeen}, created=${issuesResult.created}, ` +
        `updated=${issuesResult.updated}, skipped=${issuesResult.skipped}`
    )

    const discussionsResult = await syncGithubNextDiscussions(ctx, config.AccountsURL, workspaceUuid)
    ctx.info(
      `[${config.ServiceID}] inbound discussions ${workspaceUuid}: integrations=${discussionsResult.integrations}, ` +
        `repositories=${discussionsResult.repositories}, discussions=${discussionsResult.discussionsSeen}, ` +
        `created=${discussionsResult.created}, updated=${discussionsResult.updated}, skipped=${discussionsResult.skipped}`
    )

    const pullRequestsResult = await syncGithubNextPullRequests(ctx, config.AccountsURL, workspaceUuid)
    ctx.info(
      `[${config.ServiceID}] inbound pull requests ${workspaceUuid}: integrations=${pullRequestsResult.integrations}, ` +
        `repositories=${pullRequestsResult.repositories}, pullRequests=${pullRequestsResult.pullRequestsSeen}, ` +
        `created=${pullRequestsResult.created}, updated=${pullRequestsResult.updated}, skipped=${pullRequestsResult.skipped}`
    )
  } finally {
    inboundWorkspaces.delete(workspaceUuid)
  }
}

async function syncOutboundWorkspace (ctx: MeasureContext, workspaceUuid: WorkspaceUuid): Promise<void> {
  if (!config.SyncOutbound) return

  const outboundIssuesResult = await syncGithubNextOutboundIssues(ctx, config.AccountsURL, workspaceUuid)
  ctx.info(
    `[${config.ServiceID}] outbound issues ${workspaceUuid}: integrations=${outboundIssuesResult.integrations}, ` +
      `repositories=${outboundIssuesResult.repositories}, issues=${outboundIssuesResult.issuesSeen}, ` +
      `updated=${outboundIssuesResult.updated}, skipped=${outboundIssuesResult.skipped}`
  )

  const outboundDiscussionsResult = await syncGithubNextOutboundDiscussions(ctx, config.AccountsURL, workspaceUuid)
  ctx.info(
    `[${config.ServiceID}] outbound discussions ${workspaceUuid}: integrations=${outboundDiscussionsResult.integrations}, ` +
      `repositories=${outboundDiscussionsResult.repositories}, discussions=${outboundDiscussionsResult.discussionsSeen}, ` +
      `updated=${outboundDiscussionsResult.updated}, skipped=${outboundDiscussionsResult.skipped}`
  )

  const outboundPullRequestsResult = await syncGithubNextOutboundPullRequests(ctx, config.AccountsURL, workspaceUuid)
  ctx.info(
    `[${config.ServiceID}] outbound pull requests ${workspaceUuid}: integrations=${outboundPullRequestsResult.integrations}, ` +
      `repositories=${outboundPullRequestsResult.repositories}, pullRequests=${outboundPullRequestsResult.pullRequestsSeen}, ` +
      `updated=${outboundPullRequestsResult.updated}, skipped=${outboundPullRequestsResult.skipped}`
  )
}

let running = false
let outboundRunning = false
let stopped = false
let outboundTimer: NodeJS.Timeout | undefined
const inboundWorkspaces = new Set<WorkspaceUuid>()
const outboundWorkspaces = new Set<WorkspaceUuid>()
const delayedOutboundWorkspaces = new Set<WorkspaceUuid>()

function scheduleTick (): void {
  setTimeout(() => {
    void tick()
  }, 0)
}

async function tick (): Promise<void> {
  if (running || stopped) return

  running = true

  try {
    const workspaces = await getGithubNextWorkspaces()
    ctx.info(`[${config.ServiceID}] discovered ${workspaces.length} workspace(s)`)

    for (const workspaceUuid of workspaces) {
      try {
        await ctx.with('sync-inbound-workspace', { workspace: workspaceUuid }, async (ctx) => {
          await syncInboundWorkspace(ctx, workspaceUuid)
        })
      } catch (err) {
        ctx.error('workspace inbound sync failed', { workspace: workspaceUuid, err })
      }
    }
  } catch (err) {
    ctx.error('sync iteration failed', { err })
  } finally {
    running = false
  }
}

function enqueueOutboundWorkspace (workspaceUuid: WorkspaceUuid, reason: string): void {
  if (stopped || !config.SyncOutbound) return

  outboundWorkspaces.add(workspaceUuid)
  if (outboundTimer !== undefined) return

  outboundTimer = setTimeout(() => {
    outboundTimer = undefined
    void drainOutboundQueue(reason)
  }, config.OutboundDebounceMs)
}

function isTxCUD (tx: Tx): tx is TxCUD<Doc> {
  return (
    tx._class === core.class.TxCreateDoc || tx._class === core.class.TxUpdateDoc || tx._class === core.class.TxRemoveDoc
  )
}

function isTxDomainEvent (tx: Tx): tx is TxDomainEvent {
  return tx._class === core.class.TxDomainEvent
}

function isTxWorkspaceEvent (tx: Tx): tx is TxWorkspaceEvent {
  return tx._class === core.class.TxWorkspaceEvent
}

function isIgnoredGithubNextInternalClass (objectClass: Ref<Class<Doc>>): boolean {
  return (
    objectClass === githubNext.class.GithubNextObjectSyncState || objectClass === githubNext.class.GithubNextRepository
  )
}

function isSystemTx (tx: Tx): boolean {
  return tx.modifiedBy === core.account.System
}

function getOutboundTxSkipReason (tx: Tx | undefined, workspace: WorkspaceUuid | undefined): string | undefined {
  if (tx === undefined) return 'missing-tx'
  if (workspace === undefined) return 'missing-workspace'
  if (isTxWorkspaceEvent(tx)) return 'workspace-event'
  if (isSystemTx(tx)) return 'system-tx'
  if (isTxDomainEvent(tx)) return `domain-${tx.domain}`
  if (!isTxCUD(tx)) return `not-cud-${tx._class}`
  if (isIgnoredGithubNextInternalClass(tx.objectClass)) return `internal-${tx.objectClass}`
  return undefined
}

async function drainOutboundQueue (reason: string): Promise<void> {
  if (outboundRunning || stopped) return

  outboundRunning = true

  try {
    while (outboundWorkspaces.size > 0) {
      if (stopped) break

      const workspaceUuid = outboundWorkspaces.values().next().value
      if (workspaceUuid === undefined) break
      outboundWorkspaces.delete(workspaceUuid)
      if (inboundWorkspaces.has(workspaceUuid)) {
        if (!delayedOutboundWorkspaces.has(workspaceUuid)) {
          delayedOutboundWorkspaces.add(workspaceUuid)
          ctx.info(`[${config.ServiceID}] outbound queue delayed ${workspaceUuid}: inbound sync is running`)
        }
        outboundWorkspaces.add(workspaceUuid)
        break
      }
      delayedOutboundWorkspaces.delete(workspaceUuid)

      try {
        ctx.info('outbound queue sync', { workspace: workspaceUuid, reason })
        await ctx.with('sync-outbound-workspace', { workspace: workspaceUuid }, async (ctx) => {
          await syncOutboundWorkspace(ctx, workspaceUuid)
        })
      } catch (err) {
        ctx.error('workspace outbound sync failed', { workspace: workspaceUuid, err })
      }
    }
  } finally {
    outboundRunning = false
    if (outboundWorkspaces.size > 0 && !stopped) {
      const nextWorkspace = outboundWorkspaces.values().next().value
      if (nextWorkspace !== undefined) enqueueOutboundWorkspace(nextWorkspace, 'drain')
    }
  }
}

async function enqueueAllOutboundWorkspaces (reason: string): Promise<void> {
  if (!config.SyncOutbound) return

  const workspaces = await getGithubNextWorkspaces()
  for (const workspaceUuid of workspaces) {
    enqueueOutboundWorkspace(workspaceUuid, reason)
  }
}

function startOutboundQueueConsumer (ctx: MeasureContext): { close: () => Promise<void> } {
  if (!config.SyncOutbound) {
    return {
      close: async () => {}
    }
  }

  try {
    const queue: PlatformQueue = getPlatformQueue(config.ServiceID, config.QueueRegion)
    const consumer: ConsumerHandle = queue.createConsumer<Tx>(
      ctx,
      QueueTopic.Tx,
      queue.getClientId(),
      async (ctx, msg) => {
        const tx = (msg as any).value as Tx | undefined
        const workspace = (msg as any).workspace as WorkspaceUuid | undefined
        const skipReason = getOutboundTxSkipReason(tx, workspace)
        if (skipReason === undefined && tx !== undefined && workspace !== undefined) {
          const relevant = await isGithubNextOutboundRelevantTx(config.AccountsURL, workspace, tx)
          if (!relevant) {
            ctx.info(`[${config.ServiceID}] outbound tx ignored`, {
              workspace,
              reason: 'unmatched-github-next',
              txClass: tx._class,
              objectClass: isTxCUD(tx) ? tx.objectClass : undefined,
              objectId: isTxCUD(tx) ? tx.objectId : undefined,
              domain: isTxDomainEvent(tx) ? tx.domain : undefined,
              modifiedBy: tx.modifiedBy
            })
            return
          }

          ctx.info(`[${config.ServiceID}] outbound tx accepted`, {
            workspace,
            txClass: tx._class,
            objectClass: isTxCUD(tx) ? tx.objectClass : undefined,
            objectId: isTxCUD(tx) ? tx.objectId : undefined,
            domain: isTxDomainEvent(tx) ? tx.domain : undefined,
            modifiedBy: tx.modifiedBy
          })
          enqueueOutboundWorkspace(workspace, 'tx')
        } else {
          ctx.info(`[${config.ServiceID}] outbound tx ignored`, {
            workspace,
            reason: skipReason,
            txClass: tx?._class,
            objectClass: tx !== undefined && isTxCUD(tx) ? tx.objectClass : undefined,
            objectId: tx !== undefined && isTxCUD(tx) ? tx.objectId : undefined,
            domain: tx !== undefined && isTxDomainEvent(tx) ? tx.domain : undefined,
            modifiedBy: tx?.modifiedBy
          })
        }
      },
      {
        fromBegining: false
      }
    )

    ctx.info(`[${config.ServiceID}] outbound queue consumer started`)

    return {
      close: async () => {
        await consumer.close()
        await queue.shutdown()
      }
    }
  } catch (err) {
    ctx.error('failed to start outbound queue consumer', { err })
    return {
      close: async () => {}
    }
  }
}

async function main (): Promise<void> {
  setMetadata(serverToken.metadata.Secret, config.Secret)
  setMetadata(serverToken.metadata.Service, config.ServiceID)

  const httpServer = startHttpServer()
  const outboundConsumer = startOutboundQueueConsumer(ctx)
  await tick()
  await enqueueAllOutboundWorkspaces('startup')

  const timer = setInterval(() => {
    void tick()
  }, config.PollIntervalMs)

  const shutdown = (): void => {
    stopped = true
    if (outboundTimer !== undefined) clearTimeout(outboundTimer)
    clearInterval(timer)
    httpServer.close()
    void outboundConsumer.close().finally(() => {
      process.exit(0)
    })
  }

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
  process.on('uncaughtException', (error: Error) => {
    ctx.error('Uncaught exception', { error })
  })
  process.on('unhandledRejection', (error: unknown) => {
    ctx.error('Unhandled rejection', { error })
  })
}

void main().catch((err) => {
  ctx.error('fatal error', { err })
  process.exit(1)
})
