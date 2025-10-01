//
// Copyright © 2022 Hardcore Engineering Inc.
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

import {
  getClient as getAccountClient,
  type LoginInfoWithWorkspaces,
  type LoginInfoWorkspace
} from '@hcengineering/account-client'
import { Analytics } from '@hcengineering/analytics'
import core, {
  type Account,
  AccountRole,
  type AccountUuid,
  type Branding,
  type BrandingMap,
  type Class,
  cutObjectArray,
  type Data,
  type Doc,
  generateId,
  guestAccount,
  isArchivingMode,
  isMigrationMode,
  isRestoringMode,
  isWorkspaceCreating,
  type MeasureContext,
  type PersonId,
  pickPrimarySocialId,
  platformNow,
  platformNowDiff,
  readOnlyGuestAccountUuid,
  type Ref,
  SocialIdType,
  systemAccountUuid,
  type Tx,
  type TxCUD,
  TxFactory,
  TxProcessor,
  type TxWorkspaceEvent,
  type Version,
  versionToString,
  withContext,
  WorkspaceEvent,
  type WorkspaceIds,
  type WorkspaceInfoWithStatus,
  type WorkspaceUuid
} from '@hcengineering/core'
import { type Status, UNAUTHORIZED, unknownError } from '@hcengineering/platform'
import {
  type HelloRequest,
  type HelloResponse,
  type RateLimitInfo,
  type ReqId,
  type Request,
  type Response,
  SlidingWindowRateLimitter
} from '@hcengineering/rpc'
import {
  type AddSessionResponse,
  type ConnectionSocket,
  type ConsumerHandle,
  createBroadcastEvent,
  type GetWorkspaceResponse,
  LOGGING_ENABLED,
  pingConst,
  type PlatformQueue,
  type PlatformQueueProducer,
  QueueTopic,
  type QueueUserMessage,
  QueueWorkspaceEvent,
  type QueueWorkspaceMessage,
  type Session,
  type SessionHealth,
  type SessionManager,
  userEvents,
  type UserStatistics,
  workspaceEvents,
  type WorkspaceService,
  type WorkspaceStatistics
} from '@hcengineering/server-core'
import { generateToken, type Token } from '@hcengineering/server-token'
import { type Workspace, type WorkspaceFactory } from './types'
import { sendResponse } from './utils'

const ticksPerSecond = 20
const workspaceSoftShutdownTicks = 15 * ticksPerSecond

const hangRequestTimeoutSeconds = 30
const hangSessionTimeoutSeconds = 60

/**
 * @public
 */
export interface Timeouts {
  // Timeout preferences
  pingTimeout: number // Default 10 second
  reconnectTimeout: number // Default 3 seconds
}

export class TSessionManager implements SessionManager {
  private readonly statusPromises = new Map<string, Promise<void>>()
  readonly workspaces = new Map<WorkspaceUuid, Workspace>()
  checkInterval: any

  sessions = new Map<string, { session: Session, socket: ConnectionSocket, tickHash: number }>()
  reconnectIds = new Set<string>()

  maintenanceTimer: any
  timeMinutes = 0
  maintenanceMessage?: string

  modelVersion = process.env.MODEL_VERSION ?? ''
  serverVersion = process.env.VERSION ?? ''

  workspaceProducer: PlatformQueueProducer<QueueWorkspaceMessage>
  usersProducer: PlatformQueueProducer<QueueUserMessage>
  workspaceConsumer: ConsumerHandle

  now: number = Date.now()

  ticksContext: MeasureContext

  hungSessionsWarnPercent = parseInt(process.env.HUNG_SESSIONS_WARN_PERCENT ?? '25')
  hungSessionsFailPercent = parseInt(process.env.HUNG_SESSIONS_FAIL_PERCENT ?? '75')
  hungRequestsFailPercent = parseInt(process.env.HUNG_REQUESTS_PERCENT ?? '50')

  constructor (
    readonly ctx: MeasureContext,
    readonly timeouts: Timeouts,
    readonly brandingMap: BrandingMap,
    readonly profiling:
    | {
      start: () => void
      stop: () => Promise<string | undefined>
    }
    | undefined,
    readonly accountsUrl: string,
    readonly enableCompression: boolean,
    readonly doHandleTick: boolean = true,
    readonly queue: PlatformQueue,
    readonly workspaceFactory: WorkspaceFactory
  ) {
    if (this.doHandleTick) {
      this.checkInterval = setInterval(() => {
        this.handleTick()
      }, 1000 / ticksPerSecond)
    }
    this.workspaceProducer = this.queue.getProducer(ctx.newChild('ws-queue', {}, { span: false }), QueueTopic.Workspace)
    this.usersProducer = this.queue.getProducer(ctx.newChild('user-queue', {}, { span: false }), QueueTopic.Users)

    this.workspaceConsumer = this.queue.createConsumer<QueueWorkspaceMessage>(
      ctx.newChild('ws-queue-consume', {}, { span: false }),
      QueueTopic.Workspace,
      generateId(),
      async (ctx, msg) => {
        const m = msg.value
        if (
          m.type === QueueWorkspaceEvent.Upgraded ||
          m.type === QueueWorkspaceEvent.Restored ||
          m.type === QueueWorkspaceEvent.Deleted
        ) {
          // Handle workspace messages
          this.workspaceInfoCache.delete(msg.workspace)
        }
      }
    )

    this.ticksContext = ctx.newChild('ticks', {}, { span: false })
  }

  scheduleMaintenance (timeMinutes: number, message?: string): void {
    this.timeMinutes = timeMinutes
    this.maintenanceMessage = message

    this.sendMaintenanceWarning()

    const nextTime = (): number => (this.timeMinutes > 1 ? 60 * 1000 : this.timeMinutes * 60 * 1000)

    const showMaintenance = (): void => {
      if (this.timeMinutes > 1) {
        this.timeMinutes -= 1
        clearTimeout(this.maintenanceTimer)
        this.maintenanceTimer = setTimeout(showMaintenance, nextTime())
      } else {
        this.timeMinutes = 0
      }

      this.sendMaintenanceWarning()
    }

    clearTimeout(this.maintenanceTimer)
    this.maintenanceTimer = setTimeout(showMaintenance, nextTime())
  }

  private sendMaintenanceWarning (): void {
    if (this.timeMinutes === 0) {
      return
    }
    const event: TxWorkspaceEvent = this.createMaintenanceWarning()
    for (const ws of this.workspaces.values()) {
      this.doBroadcast(this.ctx, ws, [event])
    }
  }

  private createMaintenanceWarning (): TxWorkspaceEvent {
    return {
      _id: generateId(),
      _class: core.class.TxWorkspaceEvent,
      event: WorkspaceEvent.MaintenanceNotification,
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      objectSpace: core.space.DerivedTx,
      space: core.space.DerivedTx,
      createdBy: core.account.System,
      params: {
        timeMinutes: this.timeMinutes,
        message: this.maintenanceMessage
      }
    }
  }

  ticks = 0

  handleTick (): void {
    const now = Date.now()
    this.handleWorkspaceTick()

    this.handleSessionTick(now)
    this.ticks++
  }

  calcWorkspaceStats (sessions: { session: Session }[]): { sys: number, user: number, anonymous: number } {
    let user: number = 0
    let sys: number = 0
    let anonymous: number = 0
    for (const s of sessions) {
      if (s.session.getUser() === systemAccountUuid) {
        sys++
      } else {
        user++
        if (s.session.getUser() === guestAccount || s.session.getUser() === readOnlyGuestAccountUuid) {
          anonymous++
        }
      }
    }
    return { sys, user, anonymous }
  }

  private handleWorkspaceTick (): void {
    this.ctx.measure('sessions', this.sessions.size)

    const { sys, user, anonymous } = this.calcWorkspaceStats(Array.from(this.sessions.values()))

    let userWorkspaces: number = 0
    let sysOnlyWorkspaces: number = 0

    for (const ws of this.workspaces.values()) {
      const { sys, user } = this.calcWorkspaceStats(Array.from(ws.sessions.values()))
      if (user > 0) {
        userWorkspaces++
      } else {
        if (sys > 0) {
          sysOnlyWorkspaces++
        }
      }
    }

    this.ctx.measure('sessions-user', user)
    this.ctx.measure('sessions-system', sys)
    this.ctx.measure('sessions-anonymous', anonymous)

    this.ctx.measure('workspaces', this.workspaces.size)
    this.ctx.measure('workspaces-user', userWorkspaces)
    this.ctx.measure('workspaces-systemonly', sysOnlyWorkspaces)

    if (this.ticks % (60 * ticksPerSecond) === 0) {
      const workspacesToUpdate: WorkspaceUuid[] = []

      for (const [wsId, workspace] of this.workspaces.entries()) {
        // update account lastVisit every minute per every workspace.∏
        for (const val of workspace.sessions.values()) {
          if (val.session.getUser() !== systemAccountUuid) {
            workspacesToUpdate.push(wsId)
            break
          }
        }
      }
      if (workspacesToUpdate.length > 0) {
        void this.updateLastVisit(this.ctx, workspacesToUpdate).catch(() => {
          // Ignore
        })
      }
    }
    for (const [wsId, workspace] of this.workspaces.entries()) {
      for (const [k, v] of Array.from(workspace.tickHandlers.entries())) {
        v.ticks--
        if (v.ticks === 0) {
          workspace.tickHandlers.delete(k)
          try {
            v.operation()
          } catch (err: any) {
            Analytics.handleError(err)
          }
        }
      }

      for (const s of workspace.sessions) {
        if (this.ticks % (5 * 60 * ticksPerSecond) === workspace.tickHash) {
          s[1].session.mins5.find = s[1].session.current.find
          s[1].session.mins5.tx = s[1].session.current.tx

          s[1].session.current = { find: 0, tx: 0 }
        }
      }

      // Wait some time for new client to appear before closing workspace.
      if (
        !workspace.maintenance &&
        workspace.sessions.size === 0 &&
        workspace.closing === undefined &&
        workspace.workspaceInitCompleted
      ) {
        workspace.softShutdown--
        if (workspace.softShutdown <= 0) {
          this.ctx.warn('closing workspace, no users', {
            workspace: workspace.wsId.url,
            wsId,
            upgrade: workspace.maintenance
          })
          workspace.closing = this.performWorkspaceCloseCheck(workspace)
        }
      } else {
        workspace.softShutdown = workspaceSoftShutdownTicks
      }
    }
  }

  private handleSessionTick (now: number): void {
    for (const s of this.sessions.values()) {
      const isCurrentUserTick = this.ticks % ticksPerSecond === s.tickHash

      if (isCurrentUserTick) {
        const wsId = s.session.workspace.uuid
        const lastRequestDiff = now - s.session.lastRequest

        let timeout = hangSessionTimeoutSeconds * 1000
        if (s.session.getUser() === systemAccountUuid) {
          timeout = timeout * 10
        }
        if (lastRequestDiff > timeout) {
          this.ctx.warn('session hang, closing...', {
            wsId,
            user: s.session.getUser()
          })

          // Force close workspace if only one client and it hang.
          void this.close(this.ticksContext, s.socket, wsId).catch((err) => {
            this.ctx.error('failed to close', err)
          })
          continue
        }
        if (
          lastRequestDiff + (1 / 10) * lastRequestDiff > this.timeouts.pingTimeout &&
          now - s.session.lastPing > this.timeouts.pingTimeout
        ) {
          // We need to check state and close socket if it broken
          // And ping other wize
          s.session.lastPing = now
          if (s.socket.checkState()) {
            void s.socket.send(this.ticksContext, { result: pingConst }, s.session.binaryMode, s.session.useCompression)
          }
        }
        for (const r of s.session.requests.values()) {
          const sec = Math.round((now - r.start) / 1000)
          if (sec > 0 && sec % hangRequestTimeoutSeconds === 0) {
            this.ctx.warn('request hang found', {
              sec,
              wsId,
              total: s.session.requests.size,
              user: s.session.getUser(),
              params: cutObjectArray(r.params)
            })
          }
        }
      }
    }
  }

  @withContext('🧭 get-workspace-info')
  async getWorkspaceInfo (
    ctx: MeasureContext,
    token: string,
    updateLastVisit = true
  ): Promise<WorkspaceInfoWithStatus | undefined> {
    try {
      return await getAccountClient(this.accountsUrl, token).getWorkspaceInfo(updateLastVisit)
    } catch (err: any) {
      if (err?.cause?.code === 'ECONNRESET' || err?.cause?.code === 'ECONNREFUSED') {
        return undefined
      }
      throw err
    }
  }

  @withContext('🧭 update-last-visit')
  async updateLastVisit (ctx: MeasureContext, workspaces: WorkspaceUuid[]): Promise<void> {
    try {
      const sysToken = generateToken(systemAccountUuid, undefined, { service: 'transactor' })
      await getAccountClient(this.accountsUrl, sysToken).updateLastVisit(workspaces)
    } catch (err: any) {
      if (err?.cause?.code === 'ECONNRESET' || err?.cause?.code === 'ECONNREFUSED') {
        return undefined
      }
      throw err
    }
  }

  @withContext('🧭 get-login-with-workspace-info')
  async getLoginWithWorkspaceInfo (ctx: MeasureContext, token: string): Promise<LoginInfoWithWorkspaces | undefined> {
    try {
      const accountClient = getAccountClient(this.accountsUrl, token)
      return await accountClient.getLoginWithWorkspaceInfo()
    } catch (err: any) {
      if (err?.cause?.code === 'ECONNRESET' || err?.cause?.code === 'ECONNREFUSED') {
        return undefined
      }
      throw err
    }
  }

  countUserSessions (workspace: Workspace, accountUuid: AccountUuid): number {
    return Array.from(workspace.sessions.values())
      .filter((it) => it.session.getUser() === accountUuid)
      .reduce<number>((acc) => acc + 1, 0)
  }

  checkHealth (): SessionHealth {
    const now = Date.now()

    let totalSessions = 0
    let hungSessions = 0

    for (const [, { session }] of this.sessions) {
      let totalRequests = 0
      let hungRequests = 0

      // Ignore system account sessions
      if (session.getUser() === systemAccountUuid) {
        continue
      }

      totalSessions += 1

      // Check if the session is hung
      const lastRequestDiff = now - session.lastRequest
      if (lastRequestDiff > hangSessionTimeoutSeconds * 1000) {
        hungSessions += 1
        continue
      }

      // Check if requests are hung
      for (const r of session.requests.values()) {
        const sec = Math.round((now - r.start) / 1000)
        if (sec > hangRequestTimeoutSeconds) {
          hungRequests += 1
        }
        totalRequests += 1
      }

      const hungRequestsPercent = totalRequests > 0 ? (100 * hungRequests) / totalRequests : 0
      if (hungRequestsPercent > this.hungRequestsFailPercent) {
        hungSessions += 1
      }
    }

    this.ctx.measure('sessions-hung', hungSessions)

    const hungSessionsPercent = totalSessions > 0 ? (100 * hungSessions) / totalSessions : 0

    if (hungSessionsPercent > this.hungSessionsFailPercent) {
      this.ctx.warn('high hung sessions', { hungSessionsPercent })
      return 'unhealthy'
    }

    if (hungSessionsPercent > this.hungSessionsWarnPercent) {
      this.ctx.warn('high degraded sessions', { hungSessionsPercent })
      return 'degraded'
    }

    return 'healthy'
  }

  tickCounter = 0

  @withContext('🧭 get-workspace')
  async getWorkspace (
    ctx: MeasureContext,
    workspaceUuid: WorkspaceUuid,
    workspaceInfo: LoginInfoWorkspace | undefined,
    token: Token,
    ws: ConnectionSocket
  ): Promise<{ workspace?: Workspace, resp?: GetWorkspaceResponse }> {
    if (workspaceInfo === undefined) {
      return { resp: { error: new Error('Workspace not found or not available'), terminate: true } }
    }

    if (isArchivingMode(workspaceInfo.mode)) {
      // No access to disabled workspaces for regular users
      return { resp: { error: new Error('Workspace is archived'), terminate: true, specialError: 'archived' } }
    }
    if (isMigrationMode(workspaceInfo.mode)) {
      // No access to disabled workspaces for regular users
      return {
        resp: { error: new Error('Workspace is in region migration'), terminate: true, specialError: 'migration' }
      }
    }
    if (isRestoringMode(workspaceInfo.mode)) {
      // No access to disabled workspaces for regular users
      return {
        resp: { error: new Error('Workspace is in backup restore'), terminate: true, specialError: 'migration' }
      }
    }

    if (isWorkspaceCreating(workspaceInfo.mode)) {
      // No access to workspace for token.
      return { resp: { error: new Error(`Workspace during creation phase...${workspaceUuid}`) } }
    }

    const wsVersion: Data<Version> = {
      major: workspaceInfo.version.versionMajor,
      minor: workspaceInfo.version.versionMinor,
      patch: workspaceInfo.version.versionPatch
    }

    if (
      this.modelVersion !== '' &&
      this.modelVersion !== versionToString(wsVersion) &&
      token.extra?.model !== 'upgrade' &&
      token.extra?.mode !== 'backup'
    ) {
      ctx.warn('Model version mismatch', {
        source: token.extra?.service ?? 'user',
        version: this.modelVersion,
        workspaceVersion: versionToString(wsVersion),
        workspace: workspaceUuid
      })
      // Version mismatch, return upgrading.
      return { resp: { upgrade: true, progress: workspaceInfo.mode === 'upgrading' ? workspaceInfo.progress ?? 0 : 0 } }
    }

    let workspace = this.workspaces.get(workspaceUuid)
    if (workspace?.closing !== undefined) {
      await workspace?.closing
    }

    workspace = this.workspaces.get(workspaceUuid)

    const branding =
      (workspaceInfo.branding !== undefined
        ? Object.values(this.brandingMap).find((b) => b.key === workspaceInfo?.branding)
        : null) ?? null

    if (workspace === undefined) {
      ctx.warn('open workspace', {
        account: token.account,
        workspace: workspaceUuid,
        ...token.extra
      })

      workspace = this.createWorkspace(
        ctx.parent ?? ctx,
        ctx,
        workspaceUuid,
        workspaceInfo,
        token.extra?.model === 'upgrade',
        branding
      )
      await this.workspaceProducer.send(ctx, workspaceUuid, [workspaceEvents.open()])
    }

    if (token.extra?.model === 'upgrade') {
      if (workspace.maintenance) {
        ctx.warn('reconnect workspace in upgrade', {
          account: token.account,
          workspace: workspaceUuid,
          wsUrl: workspaceInfo.url
        })
      } else {
        ctx.warn('reconnect workspace in upgrade switch', {
          email: token.account,
          workspace: workspaceUuid,
          wsUrl: workspaceInfo.url
        })

        // We need to wait in case previous upgrade connection is already closing.
        await this.switchToUpgradeSession(token, ctx.parent ?? ctx, workspace, ws)
      }
    } else {
      if (workspace.maintenance || this.maintenanceWorkspaces.has(workspace.wsId.uuid)) {
        ctx.warn('connect during upgrade', {
          account: token.account,
          workspace: workspace.wsId.url,
          sessionUsers: Array.from(workspace.sessions.values()).map((it) => it.session.getUser()),
          sessionData: Array.from(workspace.sessions.values()).map((it) => it.socket.data())
        })

        return { resp: { upgrade: true } }
      }
    }
    return { workspace }
  }

  sysAccount = {
    account: systemAccountUuid,
    name: 'System',
    workspaces: {},
    socialIds: []
  }

  maintenanceWorkspaces = new Set<WorkspaceUuid>()

  workspaceInfoCache = new Map<WorkspaceUuid, WorkspaceInfoWithStatus>()

  async addSession (
    ctx: MeasureContext,
    ws: ConnectionSocket,
    token: Token,
    rawToken: string,
    sessionId: string | undefined
  ): Promise<AddSessionResponse> {
    return await ctx.with('📲 add-session', { source: token.extra?.service ?? '🤦‍♂️user' }, async (ctx) => {
      let account: LoginInfoWithWorkspaces | undefined

      try {
        if (token.account === undefined) {
          return { error: UNAUTHORIZED, terminate: true }
        }
        account =
          token.account === systemAccountUuid ? this.sysAccount : await this.getLoginWithWorkspaceInfo(ctx, rawToken)
      } catch (err: any) {
        return { error: err }
      }

      if (account === undefined) {
        return { error: new Error('Account not found or not available'), terminate: true }
      }

      let wsInfo = account.workspaces[token.workspace]

      if (wsInfo === undefined) {
        // In case of guest or system account
        // We need to get workspace info for system account.
        const workspaceInfo =
          this.workspaceInfoCache.get(token.workspace) ?? (await this.getWorkspaceInfo(ctx, rawToken, false))
        if (workspaceInfo === undefined) {
          return { error: new Error('Workspace not found or not available'), terminate: true }
        }
        this.workspaceInfoCache.set(token.workspace, workspaceInfo)

        wsInfo = {
          url: workspaceInfo.url,
          mode: workspaceInfo.mode,
          dataId: workspaceInfo.dataId,
          version: {
            versionMajor: workspaceInfo.versionMajor,
            versionMinor: workspaceInfo.versionMinor,
            versionPatch: workspaceInfo.versionPatch
          },
          role: AccountRole.Owner,
          endpoint: { externalUrl: '', internalUrl: '', region: workspaceInfo.region ?? '' },
          progress: workspaceInfo.processingProgress,
          branding: workspaceInfo.branding
        }
      } else {
        this.workspaceInfoCache.delete(token.workspace)
      }
      const { workspace, resp } = await this.getWorkspace(ctx.parent ?? ctx, token.workspace, wsInfo, token, ws)
      if (resp !== undefined) {
        return resp
      }

      if (workspace === undefined || account === undefined) {
        // Should not happen
        return { error: new Error('Workspace not found or not available'), terminate: true }
      }

      const oldSession = sessionId !== undefined ? workspace.sessions?.get(sessionId) : undefined
      if (oldSession !== undefined) {
        // Just close old socket for old session id.
        await this.close(ctx, oldSession.socket, workspace.wsId.uuid)
      }

      let primarySocialId: PersonId
      let role: AccountRole = account.workspaces[token.workspace]?.role ?? AccountRole.User
      switch (account.account) {
        case systemAccountUuid:
          primarySocialId = core.account.System
          role = AccountRole.Owner
          break
        case guestAccount:
          primarySocialId = '' as PersonId
          role = AccountRole.DocGuest
          break
        default:
          primarySocialId = pickPrimarySocialId(account.socialIds)._id
      }

      const accountRef: Account = {
        uuid: account.account,
        socialIds: account.socialIds.map((it) => it._id),
        primarySocialId,
        fullSocialIds: account.socialIds,
        role
      }

      const session = await workspace.createSession(
        ctx,
        sessionId !== undefined && (sessionId ?? '').trim().length > 0 ? sessionId : generateId(),
        token,
        accountRef
      )

      session.sessionInstanceId = generateId()
      const tickHash = this.tickCounter % ticksPerSecond

      this.sessions.set(ws.id, { session, socket: ws, tickHash })
      // We need to delete previous session with Id if found.
      this.tickCounter++
      workspace.sessions.set(session.sessionId, { session, socket: ws, tickHash })

      const accountUuid = account.account
      if (accountUuid !== systemAccountUuid && accountUuid !== guestAccount) {
        await this.usersProducer.send(ctx, workspace.wsId.uuid, [
          userEvents.login({
            user: accountUuid,
            sessions: this.countUserSessions(workspace, accountUuid),
            socialIds: account.socialIds.map((it) => it._id)
          })
        ])
      }

      // Mark workspace as init completed and we had at least one client.
      if (!workspace.workspaceInitCompleted) {
        workspace.workspaceInitCompleted = true
      }

      if (this.timeMinutes > 0) {
        void ws
          .send(ctx, { result: this.createMaintenanceWarning() }, session.binaryMode, session.useCompression)
          .catch((err) => {
            ctx.error('failed to send maintenance warning', err)
          })
      }
      return { session, context: workspace.context, workspaceId: workspace.wsId.uuid }
    })
  }

  private async switchToUpgradeSession (
    token: Token,
    ctx: MeasureContext,
    workspace: Workspace,
    ws: ConnectionSocket
  ): Promise<void> {
    if (LOGGING_ENABLED) {
      ctx.info('reloading workspace', { url: workspace.wsId.url, token: JSON.stringify(token) })
    }

    // Mark as upgrade, to prevent any new clients to connect during close
    workspace.maintenance = true
    // If upgrade client is used.
    // Drop all existing clients
    await this.doCloseAll(workspace, 0, 'upgrade', ws)
  }

  broadcastAll (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    tx: Tx[],
    target?: AccountUuid | AccountUuid[],
    exclude?: AccountUuid[]
  ): void {
    const ws = this.workspaces.get(workspace)
    if (ws === undefined) {
      return
    }
    this.doBroadcast(ctx, ws, tx, target, exclude)
  }

  doBroadcast (
    ctx: MeasureContext,
    ws: Workspace,
    tx: Tx[],
    target?: AccountUuid | AccountUuid[],
    exclude?: AccountUuid[]
  ): void {
    if (ws.maintenance) {
      return
    }
    if (target !== undefined && !Array.isArray(target)) {
      target = [target]
    }
    ctx = ctx.newChild('📬 broadcast-all', {})
    const sessions = [...ws.sessions.values()].filter((it) => {
      if (it === undefined) {
        return false
      }
      const tt = it.session.getUser()
      return (target === undefined && !(exclude ?? []).includes(tt)) || (target?.includes(tt) ?? false)
    })
    function send (): void {
      const promises: Promise<void>[] = []
      for (const session of sessions) {
        try {
          promises.push(
            sendResponse(ctx, session.session, session.socket, { result: tx }).catch((err) => {
              ctx.error('failed to send', err)
            })
          )
        } catch (err: any) {
          Analytics.handleError(err)
          ctx.error('error during send', { error: err })
        }
      }
      void Promise.all(promises).finally(() => {
        ctx.end()
      })
    }
    if (sessions.length > 0) {
      // We need to send broadcast after our client response so put it after all IO
      send()
    } else {
      ctx.end()
    }
  }

  broadcastSessions (measure: MeasureContext, sessionIds: Record<string, Tx[]>): void {
    const ctx = measure.newChild('📬 broadcast sessions', {})
    const allSessions = Array.from(this.sessions.values())
    const sessions = Object.entries(sessionIds).map(([sessionId, txes]) => ({
      session: allSessions.find((it) => it.session.sessionId === sessionId),
      txes
    }))

    function send (): void {
      for (const session of sessions) {
        if (session.session === undefined) {
          continue
        }
        try {
          void sendResponse(ctx, session.session.session, session.session.socket, { result: session.txes })
        } catch (err: any) {
          Analytics.handleError(err)
          ctx.error('error during send', { error: err })
        }
      }
      ctx.end()
    }
    if (sessions.length > 0) {
      // We need to send broadcast after our client response so put it after all IO
      send()
    } else {
      ctx.end()
    }
  }

  broadcast (
    ctx: MeasureContext,
    from: Session | null,
    workspaceId: WorkspaceUuid,
    resp: Tx[],
    target: AccountUuid | undefined,
    exclude?: AccountUuid[]
  ): void {
    const workspace = this.workspaces.get(workspaceId)
    if (workspace === undefined) {
      this.ctx.error('internal: cannot find sessions', {
        workspaceId,
        target,
        userId: from?.getUser() ?? '$unknown'
      })
      return
    }
    if (workspace?.maintenance ?? false) {
      return
    }

    const sessions = [...workspace.sessions.values()]
    ctx = ctx.newChild('📭 broadcast', {})
    const send = (): void => {
      for (const sessionRef of sessions) {
        const tt = sessionRef.session.getUser()
        if ((target === undefined && !(exclude ?? []).includes(tt)) || (target?.includes(tt) ?? false)) {
          this.sessionBroadcast(ctx, sessionRef.session, sessionRef.socket, resp)
        }
      }
      ctx.end()
    }
    if (sessions.length > 0) {
      // We need to send broadcast after our client response so put it after all IO
      send()
    } else {
      ctx.end()
    }
  }

  sessionBroadcast (ctx: MeasureContext, session: Session, socket: ConnectionSocket, tx: Tx[]): void {
    if (tx.length > 10000) {
      const classes = new Set<Ref<Class<Doc>>>()
      for (const dtx of tx) {
        if (TxProcessor.isExtendsCUD(dtx._class)) {
          classes.add((dtx as TxCUD<Doc>).objectClass)
          const attachedToClass = (dtx as TxCUD<Doc>).attachedToClass
          if (attachedToClass !== undefined) {
            classes.add(attachedToClass)
          }
        }
      }
      const bevent = createBroadcastEvent(Array.from(classes))
      void socket.send(
        ctx,
        {
          result: [bevent]
        },
        session.binaryMode,
        session.useCompression
      )
    } else {
      void socket.send(ctx, { result: tx }, session.binaryMode, session.useCompression)
    }
  }

  private createWorkspace (
    ctx: MeasureContext,
    pipelineCtx: MeasureContext,
    workspaceUuid: WorkspaceUuid,
    workspaceInfo: LoginInfoWorkspace,
    maitenance: boolean,
    branding: Branding | null
  ): Workspace {
    const context = ctx.newChild('🧲 session', {}, { span: false })
    const workspaceIds: WorkspaceIds = {
      uuid: workspaceUuid,
      dataId: workspaceInfo.dataId,
      url: workspaceInfo.url
    }

    const workspace: Workspace = this.workspaceFactory(context, {
      pipelineCtx,
      broadcast: {
        broadcast: (ctx, tx, targets, exclude) => {
          this.broadcastAll(ctx, workspaceIds.uuid, tx, targets, exclude)
        },
        broadcastSessions: (ctx, sessions) => {
          this.broadcastSessions(ctx, sessions)
        }
      },
      ids: workspaceIds,
      branding,
      version: `${workspaceInfo.version.versionMajor}.${workspaceInfo.version.versionMinor}.${workspaceInfo.version.versionPatch}`,
      region: workspaceInfo.endpoint.region
    })
    workspace.maintenance = maitenance
    workspace.tickHash = this.tickCounter % ticksPerSecond
    workspace.softShutdown = workspaceSoftShutdownTicks

    this.workspaces.set(workspaceUuid, workspace)

    return workspace
  }

  private async trySetStatus (
    ctx: MeasureContext,
    session: Session,
    online: boolean,
    workspaceId: WorkspaceUuid
  ): Promise<void> {
    const current = this.statusPromises.get(session.getUser())
    if (current !== undefined) {
      await current
    }
    const promise = this.setStatus(ctx, session, online, workspaceId)
    this.statusPromises.set(session.getUser(), promise)
    await promise
    this.statusPromises.delete(session.getUser())
  }

  private async setStatus (
    ctx: MeasureContext,
    session: Session,
    online: boolean,
    workspaceId: WorkspaceUuid
  ): Promise<void> {
    try {
      const user = session.getUser()
      const userRawAccount = session.getRawAccount()
      if (user === undefined || userRawAccount.role === AccountRole.ReadOnlyGuest) return

      const workspace = this.workspaces.get(workspaceId)
      if (workspace === undefined) {
        return
      }

      const status = (await workspace.findAll(ctx, session, core.class.UserStatus, { user }, { limit: 1 }))[0]
      const txFactory = new TxFactory(userRawAccount.primarySocialId, true)
      if (status === undefined) {
        const tx = txFactory.createTxCreateDoc(core.class.UserStatus, core.space.Space, {
          online,
          user
        })
        await workspace.tx(ctx, session, tx, async () => {})
      } else if (status.online !== online) {
        const tx = txFactory.createTxUpdateDoc(status._class, status.space, status._id, {
          online
        })
        await workspace.tx(ctx, session, tx, async () => {})
      }
    } catch (err: any) {
      ctx.error('failed to set status', { err })
      Analytics.handleError(err)
    }
  }

  async close (ctx: MeasureContext, ws: ConnectionSocket, workspaceUuid: WorkspaceUuid): Promise<void> {
    const workspace = this.workspaces.get(workspaceUuid)

    const sessionRef = this.sessions.get(ws.id)
    if (sessionRef !== undefined) {
      ctx.info('bye happen', {
        workspaceId: workspace?.wsId.uuid,
        userId: sessionRef.session.getUser(),
        user: sessionRef.session.getSocialIds().find((it) => it.type !== SocialIdType.HULY)?.value,
        binary: sessionRef.session.binaryMode,
        compression: sessionRef.session.useCompression,
        totalTime: this.now - sessionRef.session.createTime,
        workspaceUsers: workspace?.sessions?.size,
        totalUsers: this.sessions.size
      })
      this.sessions.delete(ws.id)

      if (workspace !== undefined) {
        workspace.sessions.delete(sessionRef.session.sessionId)

        const userUuid = sessionRef.session.getUser()
        await this.usersProducer.send(ctx, workspaceUuid, [
          userEvents.logout({
            user: userUuid,
            sessions: this.countUserSessions(workspace, userUuid),
            socialIds: sessionRef.session.getUserSocialIds()
          })
        ])

        if (this.doHandleTick) {
          workspace.tickHandlers.set(sessionRef.session.sessionId, {
            ticks: this.timeouts.reconnectTimeout * ticksPerSecond,
            operation: () => {
              this.reconnectIds.delete(sessionRef.session.sessionId)
              const user = sessionRef.session.getUser()
              if (workspace !== undefined) {
                const another = Array.from(workspace.sessions.values()).findIndex((p) => p.session.getUser() === user)
                if (another === -1 && !workspace.maintenance) {
                  void workspace.closeSession(ctx, sessionRef.session).catch((err) => {
                    ctx.error('failed to close session', err)
                  })
                  if (user !== guestAccount && user !== systemAccountUuid) {
                    void this.trySetStatus(
                      workspace.context.newChild('status', {}),
                      sessionRef.session,
                      false,
                      workspaceUuid
                    ).catch((err) => {
                      ctx.error('failed to set status', err)
                    })
                  }
                }
              }
            }
          })
        }
        this.reconnectIds.add(sessionRef.session.sessionId)
      }
      try {
        sessionRef.socket.close()
      } catch (err) {
        // Ignore if closed
      }
    }
  }

  async forceMaintenance (ctx: MeasureContext, workspaceId: WorkspaceUuid): Promise<void> {
    const workspace = this.workspaces.get(workspaceId)
    this.maintenanceWorkspaces.add(workspaceId)
    if (workspace !== undefined) {
      workspace.maintenance = true
      ctx.info('force-maintenance', { workspaceId })
      await this.doCloseAll(workspace, 99, 'force-close')
    }
  }

  async forceClose (wsId: WorkspaceUuid, ignoreSocket?: ConnectionSocket): Promise<void> {
    const ws = this.workspaces.get(wsId)
    this.maintenanceWorkspaces.delete(wsId)
    this.workspaceInfoCache.delete(wsId)
    if (ws !== undefined) {
      this.ctx.warn('force-close', { name: ws.wsId.url })
      ws.maintenance = true // We need to similare upgrade to refresh all clients.
      ws.closing = this.doCloseAll(ws, 99, 'force-close', ignoreSocket)
      this.workspaces.delete(wsId)
      await ws.closing
      ws.closing = undefined
    } else {
      this.ctx.warn('force-close-unknown', { wsId })
    }
  }

  async doCloseAll (
    workspace: Workspace,
    code: number,
    reason: 'upgrade' | 'shutdown' | 'force-close',
    ignoreSocket?: ConnectionSocket
  ): Promise<void> {
    if (LOGGING_ENABLED) {
      this.ctx.info('closing workspace', {
        url: workspace.wsId.url,
        uuid: workspace.wsId.uuid,
        code,
        reason
      })
    }

    const sessions = Array.from(workspace.sessions)
    workspace.sessions.clear()

    const closeS = (s: Session, webSocket: ConnectionSocket): void => {
      s.workspaceClosed = true
      if (reason === 'upgrade' || reason === 'force-close') {
        // Override message handler, to wait for upgrading response from clients.
        this.sendUpgrade(workspace.context, webSocket, s.binaryMode, s.useCompression)
      }
      webSocket.close()
      this.reconnectIds.delete(s.sessionId)
    }

    if (LOGGING_ENABLED) {
      this.ctx.warn('Clients disconnected. Closing Workspace...', {
        url: workspace.wsId.url,
        uuid: workspace.wsId.uuid
      })
    }

    sessions
      .filter((it) => it[1].socket.id !== ignoreSocket?.id)
      .forEach((s) => {
        closeS(s[1].session, s[1].socket)
      })

    if (reason !== 'upgrade') {
      await workspace.close(this.ctx)
      if (LOGGING_ENABLED) {
        this.ctx.warn('Workspace closed...', { uuid: workspace.wsId.uuid, url: workspace.wsId.url })
      }
    }
  }

  private sendUpgrade (ctx: MeasureContext, webSocket: ConnectionSocket, binary: boolean, compression: boolean): void {
    void webSocket.send(
      ctx,
      {
        result: {
          _class: core.class.TxModelUpgrade
        }
      },
      binary,
      compression
    )
  }

  async closeWorkspaces (ctx: MeasureContext): Promise<void> {
    clearInterval(this.checkInterval)
    for (const w of this.workspaces) {
      await this.doCloseAll(w[1], 1, 'shutdown')
    }
    await this.workspaceProducer.close()
    await this.usersProducer.close()
  }

  private async performWorkspaceCloseCheck (workspace: Workspace): Promise<void> {
    const uuid = workspace.wsId.uuid
    const logParams = { uuid, url: workspace.wsId.url }
    if (workspace.sessions.size === 0) {
      if (LOGGING_ENABLED) {
        this.ctx.warn('no sessions for workspace', logParams)
      }
      try {
        if (workspace.sessions.size === 0) {
          await workspace.close(this.ctx)

          this.workspaces.delete(uuid)
          workspace.context.end()
          if (LOGGING_ENABLED) {
            this.ctx.warn('Closed workspace', logParams)
          }

          await this.workspaceProducer.send(this.ctx, workspace.wsId.uuid, [workspaceEvents.down()])
        }
      } catch (err: any) {
        Analytics.handleError(err)
        this.workspaces.delete(uuid)
        if (LOGGING_ENABLED) {
          this.ctx.error('failed', { ...logParams, error: err })
        }
      }
    } else {
      if (LOGGING_ENABLED) {
        this.ctx.info('few sessions for workspace, close skipped', {
          ...logParams,
          sessions: workspace.sessions.size
        })
      }
    }
  }

  async sendResponse (
    ctx: MeasureContext,
    st: number,
    reqId: ReqId | undefined,
    service: Session,
    ws: ConnectionSocket,
    msg: any,
    rateLimit?: RateLimitInfo,
    error?: Status
  ): Promise<void> {
    await sendResponse(ctx, service, ws, {
      id: reqId,
      result: msg,
      time: platformNowDiff(st),
      bfst: this.now,
      queue: service.requests.size,
      rateLimit
    })
  }

  limitter = new SlidingWindowRateLimitter(
    parseInt(process.env.RATE_LIMIT_MAX ?? '1500'),
    parseInt(process.env.RATE_LIMIT_WINDOW ?? '30000'),
    () => Date.now()
  )

  sysLimitter = new SlidingWindowRateLimitter(
    parseInt(process.env.RATE_LIMIT_MAX ?? '5000'),
    parseInt(process.env.RATE_LIMIT_WINDOW ?? '30000'),
    () => Date.now()
  )

  checkRate (service: Session): RateLimitInfo {
    if (service.getUser() === systemAccountUuid) {
      return this.sysLimitter.checkRateLimit('#sys#' + (service.token.extra?.service ?? '') + service.workspace.uuid)
    }
    return this.limitter.checkRateLimit(service.getUser() + (service.token.extra?.service ?? ''))
  }

  async handleRequest<S extends Session>(
    requestCtx: MeasureContext,
    service: S,
    ws: ConnectionSocket,
    request: Request<any>,
    workspaceId: WorkspaceUuid
  ): Promise<void> {
    // Calculate total number of clients
    const reqId = generateId()
    const source = service.token.extra?.service ?? '🤦‍♂️user'

    const st = Date.now()
    try {
      if (request.time != null) {
        const delta = Date.now() - request.time
        requestCtx.measure('msg-receive-delta', delta)
      }
      const workspace = this.workspaces.get(workspaceId)
      if (workspace === undefined || workspace.closing !== undefined) {
        await ws.send(
          requestCtx,
          {
            id: request.id,
            error: unknownError('Workspace is closing')
          },
          service.binaryMode,
          service.useCompression
        )
        return
      }
      if (request.id === -1 && request.method === 'hello') {
        await requestCtx.with('🧨 handleHello', { source }, (ctx) =>
          this.handleHello<S>(request, service, ctx, workspace, ws)
        )
        return
      }
      if (request.id === -2 && request.method === 'forceClose') {
        // TODO: we chould allow this only for admin or system accounts
        let done = false
        const wsRef = this.workspaces.get(workspaceId)
        if (wsRef?.maintenance ?? false) {
          done = true
          this.ctx.warn('FORCE CLOSE', { workspace: workspaceId })
          // In case of upgrade, we need to force close workspace not in interval handler
          await this.forceClose(workspaceId, ws)
        }
        const forceCloseResponse: Response<any> = {
          id: request.id,
          result: done
        }
        await ws.send(requestCtx, forceCloseResponse, service.binaryMode, service.useCompression)
        return
      }
      let rateLimit: RateLimitInfo | undefined
      if (request.method !== 'ping') {
        rateLimit = this.checkRate(service)
        // If remaining is 0, rate limit is exceeded
        if (rateLimit?.remaining === 0) {
          service.updateLast()
          void ws.send(
            requestCtx,
            {
              id: request.id,
              rateLimit,
              error: unknownError('Rate limit')
            },
            service.binaryMode,
            service.useCompression
          )
          return
        }
      }

      if (request.id === -1 && request.method === '#upgrade') {
        ws.close()
        return
      }
      service.requests.set(reqId, {
        id: reqId,
        params: request,
        start: st
      })

      try {
        if (ws.isBackpressure()) {
          await ws.backpressure(requestCtx)
        }

        const st = platformNow()
        await requestCtx.with(
          '🧨' + request.method,
          { source, mode: 'websocket' },
          async (callTx) => {
            switch (request.method) {
              case 'ping': {
                service.updateLast()
                ws.sendPong()
                break
              }
              case 'loadModel': {
                await this.sendResponse(
                  callTx,
                  st,
                  request.id,
                  service,
                  ws,
                  await workspace.loadModel(callTx, service, request.params[0], request.params[1]),
                  rateLimit
                )
                break
              }
              case 'findAll': {
                const [_class, query, options] = request.params
                await this.sendResponse(
                  callTx,
                  st,
                  request.id,
                  service,
                  ws,
                  await workspace.findAll(callTx, service, _class, query, options),
                  rateLimit
                )
                break
              }
              case 'searchFulltext': {
                const [query, options] = request.params
                await this.sendResponse(
                  callTx,
                  st,
                  request.id,
                  service,
                  ws,
                  await workspace.searchFulltext(callTx, service, query, options),
                  rateLimit
                )
                break
              }
              case 'tx': {
                const [tx] = request.params

                await workspace.tx(callTx, service, tx, async (result) => {
                  await this.sendResponse(callTx, st, request.id, service, ws, result, rateLimit)
                })

                break
              }
              case 'domainRequest': {
                const [domain, params] = request.params
                await workspace.domainRequest(callTx, service, domain, params, async (result) => {
                  await this.sendResponse(callTx, st, request.id, service, ws, result, rateLimit)
                })
                break
              }
              case 'loadChunk': {
                const [chunkId] = request.params
                const loadChunkResult = await workspace.loadChunk(callTx, service, chunkId)
                await this.sendResponse(callTx, st, request.id, service, ws, loadChunkResult, rateLimit)
                break
              }
              case 'closeChunk': {
                const [chunkId] = request.params
                await workspace.closeChunk(callTx, service, chunkId)
                await this.sendResponse(callTx, st, request.id, service, ws, {}, rateLimit)
                break
              }
              case 'getDomainHash': {
                const [domain] = request.params
                const hash = await workspace.getDomainHash(callTx, domain)
                await this.sendResponse(callTx, st, request.id, service, ws, hash, rateLimit)
                break
              }
              case 'loadDocs': {
                const [domain, docs] = request.params
                const loadedDocs = await workspace.loadDocs(callTx, service, domain, docs)
                await this.sendResponse(callTx, st, request.id, service, ws, loadedDocs, rateLimit)
                break
              }
              case 'upload': {
                const [domain, docs] = request.params
                await workspace.upload(callTx, service, domain, docs)
                await this.sendResponse(callTx, st, request.id, service, ws, {}, rateLimit)
                break
              }
              case 'clean': {
                const [domain, docs] = request.params
                await workspace.clean(callTx, service, domain, docs)
                await this.sendResponse(callTx, st, request.id, service, ws, {}, rateLimit)
                break
              }
            }
          },
          {
            user: service.getUser(),
            socialId: service.getRawAccount().primarySocialId,
            workspace: workspace.wsId.uuid
          },
          { meta: request.meta }
        )
      } catch (err: any) {
        Analytics.handleError(err)
        if (LOGGING_ENABLED) {
          this.ctx.error('error handle request', { error: err, request })
        }
        await ws.send(
          requestCtx,
          {
            id: request.id,
            error: unknownError(err),
            result: JSON.parse(JSON.stringify(err?.stack))
          },
          service.binaryMode,
          service.useCompression
        )
      }
    } finally {
      service.requests.delete(reqId)
    }
  }

  async handleRPC<S extends Session>(
    requestCtx: MeasureContext,
    service: S,
    method: string,
    ws: ConnectionSocket,
    operation: (ctx: MeasureContext, workspace: WorkspaceService, rateLimit: RateLimitInfo | undefined) => Promise<void>
  ): Promise<RateLimitInfo | undefined> {
    const rateLimitStatus = this.checkRate(service)
    // If remaining is 0, rate limit is exceeded
    if (rateLimitStatus?.remaining === 0) {
      return await Promise.resolve(rateLimitStatus)
    }

    const source = service.token.extra?.service ?? '🤦‍♂️user'

    // Calculate total number of clients
    const reqId = generateId()

    const st = Date.now()
    try {
      const workspace = this.workspaces.get(service.workspace.uuid)
      if (workspace === undefined || workspace.closing !== undefined) {
        throw new Error('Workspace is closing')
      }

      service.requests.set(reqId, {
        id: reqId,
        params: {},
        start: st
      })

      try {
        await requestCtx.with(
          '🧨 ' + method,
          { source, mode: 'rpc' },
          (callTx) => operation(callTx, workspace, rateLimitStatus),
          {
            user: service.getUser(),
            socialId: service.getRawAccount().primarySocialId,
            workspace: workspace.wsId.uuid
          }
        )
      } catch (err: any) {
        Analytics.handleError(err)
        if (LOGGING_ENABLED) {
          this.ctx.error('error handle request', { error: err })
        }
        await ws.send(
          requestCtx,
          {
            id: reqId,
            error: unknownError(err),
            result: JSON.parse(JSON.stringify(err?.stack))
          },
          service.binaryMode,
          service.useCompression
        )
        throw err
      }
      return undefined
    } finally {
      service.requests.delete(reqId)
    }
  }

  entryToUserStats = (session: Session, socket: ConnectionSocket): UserStatistics => {
    return {
      current: session.current,
      mins5: session.mins5,
      userId: session.getUser(),
      sessionId: socket.id,
      total: session.total,
      data: socket.data
    }
  }

  workspaceToWorkspaceStats = (ws: Workspace): WorkspaceStatistics => {
    return {
      clientsTotal: new Set(Array.from(ws.sessions.values()).map((it) => it.session.getUser())).size,
      sessionsTotal: ws.sessions.size,
      workspaceName: ws.wsId.url,
      wsId: ws.wsId.uuid,
      sessions: Array.from(ws.sessions.values()).map((it) => this.entryToUserStats(it.session, it.socket))
    }
  }

  getStatistics (): WorkspaceStatistics[] {
    return Array.from(this.workspaces.values()).map((it) => this.workspaceToWorkspaceStats(it))
  }

  private async handleHello<S extends Session>(
    request: Request<any>,
    service: S,
    ctx: MeasureContext<any>,
    workspace: Workspace,
    ws: ConnectionSocket
  ): Promise<void> {
    try {
      const hello = request as HelloRequest
      service.binaryMode = hello.binary ?? false
      service.useCompression = this.enableCompression ? hello.compression ?? false : false

      if (LOGGING_ENABLED) {
        ctx.info('hello happen', {
          workspace: workspace.wsId.url,
          workspaceId: workspace.wsId.uuid,
          userId: service.getUser(),
          user: service.getSocialIds().find((it) => it.type !== SocialIdType.HULY)?.value,
          binary: service.binaryMode,
          compression: service.useCompression,
          timeToHello: Date.now() - service.createTime,
          workspaceUsers: workspace.sessions.size,
          totalUsers: this.sessions.size
        })
      }
      const reconnect = this.reconnectIds.has(service.sessionId)
      if (reconnect) {
        this.reconnectIds.delete(service.sessionId)
      }

      const account = service.getRawAccount()
      const { lastTx, lastHash } = await workspace.getLastTxHash(ctx)
      const helloResponse: HelloResponse = {
        id: -1,
        result: 'hello',
        binary: service.binaryMode,
        reconnect,
        serverVersion: this.serverVersion,
        lastTx,
        lastHash,
        account,
        useCompression: service.useCompression
      }
      await ws.send(ctx, helloResponse, false, false)
      if (account.uuid !== guestAccount && account.uuid !== systemAccountUuid) {
        // We do not need to wait for set-status, just return session to client
        await workspace.context
          .with('🧨 status', {}, (ctx) => this.trySetStatus(ctx, service, true, service.workspace.uuid))
          .catch(() => {})
      }
    } catch (err: any) {
      ctx.error('error', { err })
    }
  }
}

export function createSessionManager (
  ctx: MeasureContext,
  brandingMap: BrandingMap,
  timeouts: Timeouts,
  profiling:
  | {
    start: () => void
    stop: () => Promise<string | undefined>
  }
  | undefined,
  accountsUrl: string,
  enableCompression: boolean,
  doHandleTick: boolean = true,
  queue: PlatformQueue,
  workspaceFactory: WorkspaceFactory
): SessionManager {
  return new TSessionManager(
    ctx,
    timeouts,
    brandingMap ?? null,
    profiling,
    accountsUrl,
    enableCompression,
    doHandleTick,
    queue,
    workspaceFactory
  )
}

export interface SessionManagerOptions extends Partial<Timeouts> {
  workspaceFactory: WorkspaceFactory
  brandingMap: BrandingMap
  enableCompression?: boolean
  accountsUrl: string
  profiling?: {
    start: () => void
    stop: () => Promise<string | undefined>
  }
  queue: PlatformQueue
}

/**
 * @public
 */
export function startSessionManager (ctx: MeasureContext, opt: SessionManagerOptions): SessionManager {
  const sessions = createSessionManager(
    ctx,
    opt.brandingMap,
    {
      pingTimeout: opt.pingTimeout ?? 10000,
      reconnectTimeout: 30 // seconds to reconnect
    },
    opt.profiling,
    opt.accountsUrl,
    opt.enableCompression ?? false,
    true,
    opt.queue,
    opt.workspaceFactory
  )
  return sessions
}
