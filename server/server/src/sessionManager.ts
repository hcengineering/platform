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
import { type ServerApi as CommunicationApi } from '@hcengineering/communication-sdk-types'
import core, {
  AccountRole,
  cutObjectArray,
  Data,
  generateId,
  isArchivingMode,
  isMigrationMode,
  isRestoringMode,
  isWorkspaceCreating,
  pickPrimarySocialId,
  platformNow,
  platformNowDiff,
  SocialIdType,
  systemAccountUuid,
  TxFactory,
  Version,
  versionToString,
  withContext,
  WorkspaceEvent,
  type AccountUuid,
  type Branding,
  type BrandingMap,
  type MeasureContext,
  type PersonId,
  type Tx,
  type TxWorkspaceEvent,
  type WorkspaceDataId,
  type WorkspaceInfoWithStatus,
  type WorkspaceUuid
} from '@hcengineering/core'
import { unknownError, type Status } from '@hcengineering/platform'
import {
  SlidingWindowRateLimitter,
  type HelloRequest,
  type HelloResponse,
  type RateLimitInfo,
  type Request,
  type Response
} from '@hcengineering/rpc'
import {
  CommunicationApiFactory,
  LOGGING_ENABLED,
  pingConst,
  Pipeline,
  PipelineFactory,
  QueueTopic,
  QueueUserMessage,
  SessionManager,
  userEvents,
  workspaceEvents,
  type AddSessionResponse,
  type ClientSessionCtx,
  type ConnectionSocket,
  type GetWorkspaceResponse,
  type PlatformQueue,
  type PlatformQueueProducer,
  type QueueWorkspaceMessage,
  type Session,
  type UserStatistics,
  type WorkspaceStatistics
} from '@hcengineering/server-core'
import { generateToken, type Token } from '@hcengineering/server-token'
import { Workspace, type PipelinePair } from './workspace'

import { WorkspaceIds } from '@hcengineering/core'
import { ClientSession } from './client'
import { sendResponse } from './utils'

const ticksPerSecond = 20
const workspaceSoftShutdownTicks = 15 * ticksPerSecond

const guestAccount = 'b6996120-416f-49cd-841e-e4a5d2e49c9b'

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

  modelVersion = process.env.MODEL_VERSION ?? ''
  serverVersion = process.env.VERSION ?? ''

  workspaceProducer: PlatformQueueProducer<QueueWorkspaceMessage>
  usersProducer: PlatformQueueProducer<QueueUserMessage>

  now: number = Date.now()

  ticksContext: MeasureContext
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
    readonly pipelineFactory: PipelineFactory,
    readonly communicationApiFactory: CommunicationApiFactory
  ) {
    if (this.doHandleTick) {
      this.checkInterval = setInterval(() => {
        this.handleTick()
      }, 1000 / ticksPerSecond)
    }
    this.workspaceProducer = this.queue.getProducer(ctx.newChild('queue', {}), QueueTopic.Workspace)
    this.usersProducer = this.queue.getProducer(ctx.newChild('queue', {}), QueueTopic.Users)

    this.ticksContext = ctx.newChild('ticks', {})
  }

  scheduleMaintenance (timeMinutes: number): void {
    this.timeMinutes = timeMinutes

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
      this.doBroadcast(ws, [event])
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
        timeMinutes: this.timeMinutes
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

  private handleWorkspaceTick (): void {
    for (const [wsId, workspace] of this.workspaces.entries()) {
      if (this.ticks % (60 * ticksPerSecond) === workspace.tickHash) {
        try {
          // update account lastVisit every minute per every workspace.∏
          let connected: boolean = false
          for (const val of workspace.sessions.values()) {
            if (val.session.getUser() !== systemAccountUuid) {
              connected = true
              break
            }
          }
          void this.getWorkspaceInfo(this.ticksContext, workspace.token, connected).catch(() => {
            // Ignore
          })
        } catch (err: any) {
          // Ignore
        }
      }

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
      if (workspace.sessions.size === 0 && workspace.closing === undefined && workspace.workspaceInitCompleted) {
        workspace.softShutdown--
        if (workspace.softShutdown <= 0) {
          this.ctx.warn('closing workspace, no users', {
            workspace: workspace.wsId.url,
            wsId,
            upgrade: workspace.upgrade
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

        let timeout = 60000
        if (s.session.getUser() === systemAccountUuid) {
          timeout = timeout * 10
        }
        if (lastRequestDiff > timeout) {
          this.ctx.warn('session hang, closing...', { wsId, user: s.session.getUser() })

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
          if (sec > 0 && sec % 30 === 0) {
            this.ctx.warn('request hang found', {
              sec,
              wsId,
              total: s.session.requests.size,
              user: s.session.getUser(),
              ...cutObjectArray(r.params)
            })
          }
        }
      }
    }
  }

  createSession (token: Token, workspace: WorkspaceIds, info: LoginInfoWithWorkspaces): Session {
    let primarySocialId: PersonId
    let role: AccountRole = info.workspaces[workspace.uuid]?.role ?? AccountRole.User
    switch (info.account) {
      case systemAccountUuid:
        primarySocialId = core.account.System
        role = AccountRole.Owner
        break
      case guestAccount:
        primarySocialId = '' as PersonId
        role = AccountRole.DocGuest
        break
      default:
        primarySocialId = pickPrimarySocialId(info.socialIds)._id
    }

    return new ClientSession(
      token,
      workspace,
      {
        uuid: info.account,
        socialIds: info.socialIds.map((it) => it._id),
        primarySocialId,
        fullSocialIds: info.socialIds,
        role
      },
      info,
      token.extra?.mode === 'backup'
    )
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

    const branding = null

    if (workspace === undefined) {
      ctx.warn('open workspace', {
        account: token.account,
        workspace: workspaceUuid,
        ...token.extra
      })

      workspace = this.createWorkspace(ctx.parent ?? ctx, ctx, token, workspaceInfo.url, workspaceInfo.dataId, branding)
      await this.workspaceProducer.send(workspaceUuid, [workspaceEvents.open()])
    }

    if (token.extra?.model === 'upgrade') {
      if (workspace.upgrade) {
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
      if (workspace.upgrade) {
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
        account = await this.getLoginWithWorkspaceInfo(ctx, rawToken)
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
        const workspaceInfo = await this.getWorkspaceInfo(ctx, rawToken, false)
        if (workspaceInfo === undefined) {
          return { error: new Error('Workspace not found or not available'), terminate: true }
        }
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
          progress: workspaceInfo.processingProgress
        }
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

      const session = this.createSession(token, workspace.wsId, account)

      session.sessionId = sessionId !== undefined && (sessionId ?? '').trim().length > 0 ? sessionId : generateId()
      session.sessionInstanceId = generateId()
      const tickHash = this.tickCounter % ticksPerSecond

      this.sessions.set(ws.id, { session, socket: ws, tickHash })
      // We need to delete previous session with Id if found.
      this.tickCounter++
      workspace.sessions.set(session.sessionId, { session, socket: ws, tickHash })

      const accountUuid = account.account
      if (accountUuid !== systemAccountUuid && accountUuid !== guestAccount) {
        await this.usersProducer.send(workspace.wsId.uuid, [
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
    workspace.upgrade = true
    // If upgrade client is used.
    // Drop all existing clients
    await this.doCloseAll(workspace, 0, 'upgrade', ws)
  }

  broadcastAll (workspace: WorkspaceUuid, tx: Tx[], target?: string | string[], exclude?: string[]): void {
    const ws = this.workspaces.get(workspace)
    if (ws === undefined) {
      return
    }
    this.doBroadcast(ws, tx, target, exclude)
  }

  doBroadcast (ws: Workspace, tx: Tx[], target?: string | string[], exclude?: string[]): void {
    if (ws.upgrade) {
      return
    }
    if (target !== undefined && !Array.isArray(target)) {
      target = [target]
    }
    const ctx = this.ctx.newChild('📬 broadcast-all', {})
    const sessions = [...ws.sessions.values()].filter((it) => {
      if (it === undefined) {
        return false
      }
      const tt = it.session.getUser()
      return (target === undefined && !(exclude ?? []).includes(tt)) || (target?.includes(tt) ?? false)
    })
    function send (): void {
      for (const session of sessions) {
        try {
          void sendResponse(ctx, session.session, session.socket, { result: tx }).catch((err) => {
            ctx.error('failed to send', err)
          })
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

  broadcastSessions (measure: MeasureContext, workspace: Workspace, sessionIds: string[], result: any): void {
    if (workspace.upgrade) {
      return
    }
    const ctx = measure.newChild('📬 broadcast sessions', {})
    const sessions = [...workspace.sessions.values()].filter((it) => {
      if (it === undefined || it.session.sessionId === '') {
        return false
      }
      return sessionIds.includes(it.session.sessionId)
    })

    function send (): void {
      for (const session of sessions) {
        try {
          void sendResponse(ctx, session.session, session.socket, { result })
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
    from: Session | null,
    workspaceId: WorkspaceUuid,
    resp: Tx[],
    target: string | undefined,
    exclude?: string[]
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
    if (workspace?.upgrade ?? false) {
      return
    }

    const sessions = [...workspace.sessions.values()]
    const ctx = this.ctx.newChild('📭 broadcast', {})
    const send = (): void => {
      for (const sessionRef of sessions) {
        const tt = sessionRef.session.getUser()
        if ((target === undefined && !(exclude ?? []).includes(tt)) || (target?.includes(tt) ?? false)) {
          sessionRef.session.broadcast(ctx, sessionRef.socket, resp)
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

  private createWorkspace (
    ctx: MeasureContext,
    pipelineCtx: MeasureContext,
    token: Token,
    workspaceUrl: string,
    workspaceDataId: WorkspaceDataId | undefined,
    branding: Branding | null
  ): Workspace {
    const upgrade = token.extra?.model === 'upgrade'
    const context = ctx.newChild('🧲 session', {})
    const workspaceIds: WorkspaceIds = {
      uuid: token.workspace,
      dataId: workspaceDataId,
      url: workspaceUrl
    }

    const factory = async (): Promise<PipelinePair> => {
      const communicationApi = await this.communicationApiFactory(
        pipelineCtx,
        workspaceIds,
        (ctx, sessionIds, result) => {
          this.broadcastSessions(ctx, workspace, sessionIds, result)
        }
      )
      const pipeline = await this.pipelineFactory(
        pipelineCtx,
        workspaceIds,
        (ctx, tx, targets, exclude) => {
          this.broadcastAll(workspaceIds.uuid, tx, targets, exclude)
        },
        branding,
        communicationApi
      )
      return { pipeline, communicationApi }
    }
    const workspace: Workspace = new Workspace(
      context,
      generateToken(systemAccountUuid, token.workspace, { service: 'transactor' }),
      factory,
      this.tickCounter % ticksPerSecond,
      workspaceSoftShutdownTicks,
      workspaceIds,
      branding
    )
    workspace.upgrade = upgrade
    this.workspaces.set(token.workspace, workspace)

    return workspace
  }

  private async trySetStatus (
    ctx: MeasureContext,
    pipeline: Pipeline,
    communicationApi: CommunicationApi,
    session: Session,
    online: boolean,
    workspaceId: WorkspaceUuid
  ): Promise<void> {
    const current = this.statusPromises.get(session.getUser())
    if (current !== undefined) {
      await current
    }
    const promise = this.setStatus(ctx, pipeline, communicationApi, session, online, workspaceId)
    this.statusPromises.set(session.getUser(), promise)
    await promise
    this.statusPromises.delete(session.getUser())
  }

  private async setStatus (
    ctx: MeasureContext,
    pipeline: Pipeline,
    communicationApi: CommunicationApi,
    session: Session,
    online: boolean,
    workspaceId: WorkspaceUuid
  ): Promise<void> {
    try {
      const user = session.getUser()
      if (user === undefined) return

      const clientCtx: ClientSessionCtx = {
        requestId: undefined,
        pipeline,
        communicationApi,
        sendResponse: async () => {
          // No response
        },
        ctx,
        socialStringsToUsers: this.getActiveSocialStringsToUsersMap(workspaceId, session),
        sendError: async () => {
          // Assume no error send
        },
        sendPong: () => {}
      }

      const status = (await session.findAllRaw(clientCtx, core.class.UserStatus, { user }, { limit: 1 }))[0]
      const txFactory = new TxFactory(session.getRawAccount().primarySocialId, true)
      if (status === undefined) {
        const tx = txFactory.createTxCreateDoc(core.class.UserStatus, core.space.Space, {
          online,
          user
        })
        await session.tx(clientCtx, tx)
      } else if (status.online !== online) {
        const tx = txFactory.createTxUpdateDoc(status._class, status.space, status._id, {
          online
        })
        await session.tx(clientCtx, tx)
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
        workspace: workspace?.wsId.url,
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
        await this.usersProducer.send(workspaceUuid, [
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
                if (another === -1 && !workspace.upgrade) {
                  void workspace.with(async (pipeline, communicationApi) => {
                    await communicationApi.closeSession(sessionRef.session.sessionId)
                    if (user !== guestAccount && user !== systemAccountUuid) {
                      await this.trySetStatus(
                        workspace.context,
                        pipeline,
                        communicationApi,
                        sessionRef.session,
                        false,
                        workspaceUuid
                      ).catch(() => {})
                    }
                  })
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

  async forceClose (wsId: WorkspaceUuid, ignoreSocket?: ConnectionSocket): Promise<void> {
    const ws = this.workspaces.get(wsId)
    if (ws !== undefined) {
      this.ctx.warn('force-close', { name: ws.wsId.url })
      ws.upgrade = true // We need to similare upgrade to refresh all clients.
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

          await this.workspaceProducer.send(workspace.wsId.uuid, [workspaceEvents.down()])
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

  createOpContext (
    ctx: MeasureContext,
    sendCtx: MeasureContext,
    pipeline: Pipeline,
    communicationApi: CommunicationApi,
    requestId: Request<any>['id'],
    service: Session,
    ws: ConnectionSocket,
    rateLimit: RateLimitInfo | undefined
  ): ClientSessionCtx {
    const st = platformNow()
    return {
      ctx,
      pipeline,
      communicationApi,
      requestId,
      sendResponse: (reqId, msg) =>
        sendResponse(sendCtx, service, ws, {
          id: reqId,
          result: msg,
          time: platformNowDiff(st),
          bfst: this.now,
          queue: service.requests.size,
          rateLimit
        }),
      sendPong: () => {
        ws.sendPong()
      },
      socialStringsToUsers: this.getActiveSocialStringsToUsersMap(service.workspace.uuid),
      sendError: (reqId, msg, error: Status) =>
        sendResponse(sendCtx, service, ws, {
          id: reqId,
          result: msg,
          error,
          time: platformNowDiff(st),
          rateLimit,
          bfst: this.now,
          queue: service.requests.size
        })
    }
  }

  // TODO: cache this map and update when sessions created/closed
  getActiveSocialStringsToUsersMap (workspace: WorkspaceUuid, ...extra: Session[]): Map<PersonId, AccountUuid> {
    const ws = this.workspaces.get(workspace)
    if (ws === undefined) {
      return new Map()
    }
    const res = new Map<PersonId, AccountUuid>()
    for (const s of [...Array.from(ws.sessions.values()).map((it) => it.session), ...extra]) {
      const sessionAccount = s.getUser()
      if (sessionAccount === systemAccountUuid) {
        continue
      }
      const userSocialIds = s.getUserSocialIds()
      for (const id of userSocialIds) {
        res.set(id, sessionAccount)
      }
    }
    return res
  }

  limitter = new SlidingWindowRateLimitter(
    parseInt(process.env.RATE_LIMIT_MAX ?? '250'),
    parseInt(process.env.RATE_LIMIT_WINDOW ?? '30000'),
    () => Date.now()
  )

  async handleRequest<S extends Session>(
    requestCtx: MeasureContext,
    service: S,
    ws: ConnectionSocket,
    request: Request<any>,
    workspaceId: WorkspaceUuid
  ): Promise<void> {
    const userCtx = requestCtx.newChild('📞 client', {
      source: service.token.extra?.service ?? '🤦‍♂️user',
      mode: '🧭 handleRequest'
    })
    const rateLimit = this.limitter.checkRateLimit(service.getUser())
    // If remaining is 0, rate limit is exceeded
    if (rateLimit?.remaining === 0) {
      void ws.send(
        userCtx,
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

    // Calculate total number of clients
    const reqId = generateId()

    const st = Date.now()
    try {
      if (request.time != null) {
        const delta = Date.now() - request.time
        requestCtx.measure('msg-receive-delta', delta)
      }
      const workspace = this.workspaces.get(workspaceId)
      if (workspace === undefined || workspace.closing !== undefined) {
        await ws.send(
          userCtx,
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
        await this.handleHello<S>(request, service, userCtx, workspace, ws, requestCtx)
        return
      }
      if (request.id === -2 && request.method === 'forceClose') {
        // TODO: we chould allow this only for admin or system accounts
        let done = false
        const wsRef = this.workspaces.get(workspaceId)
        if (wsRef?.upgrade ?? false) {
          done = true
          this.ctx.warn('FORCE CLOSE', { workspace: workspaceId })
          // In case of upgrade, we need to force close workspace not in interval handler
          await this.forceClose(workspaceId, ws)
        }
        const forceCloseResponse: Response<any> = {
          id: request.id,
          result: done
        }
        await ws.send(userCtx, forceCloseResponse, service.binaryMode, service.useCompression)
        return
      }

      service.requests.set(reqId, {
        id: reqId,
        params: request,
        start: st
      })
      if (request.id === -1 && request.method === '#upgrade') {
        ws.close()
        return
      }

      const f = (service as any)[request.method]
      try {
        const params = [...request.params]

        if (ws.isBackpressure()) {
          await ws.backpressure(userCtx)
        }

        await workspace.with(async (pipeline, communicationApi) => {
          await userCtx.with('🧨 process', {}, (callTx) =>
            f.apply(service, [
              this.createOpContext(callTx, userCtx, pipeline, communicationApi, request.id, service, ws, rateLimit),
              ...params
            ])
          )
        })
      } catch (err: any) {
        Analytics.handleError(err)
        if (LOGGING_ENABLED) {
          this.ctx.error('error handle request', { error: err, request })
        }
        await ws.send(
          userCtx,
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
      userCtx.end()
      service.requests.delete(reqId)
    }
  }

  async handleRPC<S extends Session>(
    requestCtx: MeasureContext,
    service: S,
    ws: ConnectionSocket,
    operation: (ctx: ClientSessionCtx) => Promise<void>
  ): Promise<RateLimitInfo | undefined> {
    const rateLimitStatus = this.limitter.checkRateLimit(service.getUser())
    // If remaining is 0, rate limit is exceeded
    if (rateLimitStatus?.remaining === 0) {
      return await Promise.resolve(rateLimitStatus)
    }

    const userCtx = requestCtx.newChild('📞 client', {
      source: service.token.extra?.service ?? '🤦‍♂️user',
      mode: '🧭 handleRPC'
    })

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
        await workspace.with(async (pipeline, communicationApi) => {
          const uctx = this.createOpContext(
            userCtx,
            userCtx,
            pipeline,
            communicationApi,
            reqId,
            service,
            ws,
            rateLimitStatus
          )
          await operation(uctx)
        })
      } catch (err: any) {
        Analytics.handleError(err)
        if (LOGGING_ENABLED) {
          this.ctx.error('error handle request', { error: err })
        }
        await ws.send(
          userCtx,
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
      userCtx.end()
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
    ws: ConnectionSocket,
    requestCtx: MeasureContext<any>
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
      await workspace.with(async (pipeline, communicationApi) => {
        const helloResponse: HelloResponse = {
          id: -1,
          result: 'hello',
          binary: service.binaryMode,
          reconnect,
          serverVersion: this.serverVersion,
          lastTx: pipeline.context.lastTx,
          lastHash: pipeline.context.lastHash,
          account,
          useCompression: service.useCompression
        }
        await ws.send(requestCtx, helloResponse, false, false)
      })
      if (account.uuid !== guestAccount && account.uuid !== systemAccountUuid) {
        void workspace.with(async (pipeline, communicationApi) => {
          // We do not need to wait for set-status, just return session to client
          await ctx
            .with('set-status', {}, (ctx) =>
              this.trySetStatus(ctx, pipeline, communicationApi, service, true, service.workspace.uuid)
            )
            .catch(() => {})
        })
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
  pipelineFactory: PipelineFactory,
  communicationApiFactory: CommunicationApiFactory
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
    pipelineFactory,
    communicationApiFactory
  )
}

export interface SessionManagerOptions extends Partial<Timeouts> {
  pipelineFactory: PipelineFactory
  communicationApiFactory: CommunicationApiFactory
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
    opt.pipelineFactory,
    opt.communicationApiFactory
  )
  return sessions
}
