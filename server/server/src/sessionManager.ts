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

import { getClient as getAccountClient, isWorkspaceLoginInfo } from '@hcengineering/account-client'
import { Analytics } from '@hcengineering/analytics'
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
  systemAccountUuid,
  TxFactory,
  Version,
  versionToString,
  withContext,
  WorkspaceEvent,
  type Account,
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
import { type HelloRequest, type HelloResponse, type Request, type Response } from '@hcengineering/rpc'
import {
  LOGGING_ENABLED,
  pingConst,
  Pipeline,
  PipelineFactory,
  QueueTopic,
  QueueUserMessage,
  ServerFactory,
  SessionManager,
  StorageAdapter,
  userEvents,
  workspaceEvents,
  type AddSessionResponse,
  type ClientSessionCtx,
  type ConnectionSocket,
  type PlatformQueue,
  type PlatformQueueProducer,
  type QueueWorkspaceMessage,
  type Session,
  type Workspace,
  CommunicationApiFactory,
  type SessionFactory
} from '@hcengineering/server-core'
import { generateToken, type Token } from '@hcengineering/server-token'
import { type ServerApi as CommunicationApi } from '@hcengineering/communication-sdk-types'

import { sendResponse } from './utils'
import { WorkspaceIds } from '@hcengineering/core'

const ticksPerSecond = 20
const workspaceSoftShutdownTicks = 15 * ticksPerSecond
const guestAccount = 'b6996120-416f-49cd-841e-e4a5d2e49c9b'

function timeoutPromise (time: number): { promise: Promise<void>, cancelHandle: () => void } {
  let timer: any
  return {
    promise: new Promise((resolve) => {
      timer = setTimeout(resolve, time)
    }),
    cancelHandle: () => {
      clearTimeout(timer)
    }
  }
}

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

  sessions = new Map<string, { session: Session, socket: ConnectionSocket }>()
  reconnectIds = new Set<string>()

  maintenanceTimer: any
  timeMinutes = 0

  modelVersion = process.env.MODEL_VERSION ?? ''
  serverVersion = process.env.VERSION ?? ''

  oldClientErrors: number = 0
  clientErrors: number = 0
  lastClients: string[] = []
  workspaceProducer: PlatformQueueProducer<QueueWorkspaceMessage>
  usersProducer: PlatformQueueProducer<QueueUserMessage>
  constructor (
    readonly ctx: MeasureContext,
    readonly sessionFactory: SessionFactory,
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
    readonly queue: PlatformQueue
  ) {
    if (this.doHandleTick) {
      this.checkInterval = setInterval(() => {
        this.handleTick()
      }, 1000 / ticksPerSecond)
    }
    this.workspaceProducer = this.queue.createProducer(ctx.newChild('queue', {}), QueueTopic.Workspace)
    this.usersProducer = this.queue.createProducer(ctx.newChild('queue', {}), QueueTopic.Users)
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
      this.broadcastAll(ws, [event])
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
          void this.getWorkspaceInfo(workspace.token, connected).catch(() => {
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
        const lastRequestDiff = now - s[1].session.lastRequest

        let timeout = 60000
        if (s[1].session.getUser() === systemAccountUuid) {
          timeout = timeout * 10
        }

        const isCurrentUserTick = this.ticks % ticksPerSecond === s[1].tickHash

        if (isCurrentUserTick) {
          if (lastRequestDiff > timeout) {
            this.ctx.warn('session hang, closing...', { wsId, user: s[1].session.getUser() })

            // Force close workspace if only one client and it hang.
            void this.close(this.ctx, s[1].socket, wsId).catch((err) => {
              this.ctx.error('failed to close', err)
            })
            continue
          }
          if (
            lastRequestDiff + (1 / 10) * lastRequestDiff > this.timeouts.pingTimeout &&
            now - s[1].session.lastPing > this.timeouts.pingTimeout
          ) {
            // We need to check state and close socket if it broken
            // And ping other wize
            s[1].session.lastPing = now
            if (s[1].socket.checkState()) {
              void s[1].socket.send(
                workspace.context,
                { result: pingConst },
                s[1].session.binaryMode,
                s[1].session.useCompression
              )
            }
          }
          for (const r of s[1].session.requests.values()) {
            const sec = Math.round((now - r.start) / 1000)
            if (sec > 0 && sec % 30 === 0) {
              this.ctx.warn('request hang found', {
                sec,
                wsId,
                total: s[1].session.requests.size,
                user: s[1].session.getUser(),
                ...cutObjectArray(r.params)
              })
            }
          }
        }
      }

      // Wait some time for new client to appear before closing workspace.
      if (workspace.sessions.size === 0 && workspace.closing === undefined && workspace.workspaceInitCompleted) {
        workspace.softShutdown--
        if (workspace.softShutdown <= 0) {
          this.ctx.warn('closing workspace, no users', {
            workspace: workspace.workspaceUuid,
            wsId,
            upgrade: workspace.upgrade
          })
          workspace.closing = this.performWorkspaceCloseCheck(workspace, wsId)
        }
      } else {
        workspace.softShutdown = workspaceSoftShutdownTicks
      }

      if (this.clientErrors !== this.oldClientErrors) {
        this.ctx.warn('connection errors during interval', {
          diff: this.clientErrors - this.oldClientErrors,
          errors: this.clientErrors,
          lastClients: this.lastClients
        })
        this.oldClientErrors = this.clientErrors
      }
    }
    this.ticks++
  }

  createSession (token: Token, workspace: Workspace, account: Account): Session {
    return this.sessionFactory(token, workspace, account)
  }

  async getWorkspaceInfo (token: string, updateLastVisit = true): Promise<WorkspaceInfoWithStatus | undefined> {
    try {
      return await getAccountClient(this.accountsUrl, token).getWorkspaceInfo(updateLastVisit)
    } catch (err: any) {
      if (err?.cause?.code === 'ECONNRESET' || err?.cause?.code === 'ECONNREFUSED') {
        return undefined
      }
      throw err
    }
  }

  async getAccount (token: string): Promise<Account | undefined> {
    try {
      const accountClient = getAccountClient(this.accountsUrl, token)
      const loginInfo = await accountClient.getLoginInfoByToken()

      if (!isWorkspaceLoginInfo(loginInfo)) {
        return
      }

      if (loginInfo.account === guestAccount) {
        return {
          uuid: loginInfo.account,
          role: loginInfo.role,
          primarySocialId: '' as PersonId,
          socialIds: [],
          fullSocialIds: []
        }
      }

      if (loginInfo.account === systemAccountUuid) {
        return {
          uuid: loginInfo.account,
          role: loginInfo.role,
          primarySocialId: core.account.System,
          socialIds: [core.account.System],
          fullSocialIds: []
        }
      }

      const socialIds = await accountClient.getSocialIds()

      return {
        uuid: loginInfo.account,
        role: loginInfo.role,
        primarySocialId: pickPrimarySocialId(socialIds)._id,
        socialIds: socialIds.map((si) => si._id),
        fullSocialIds: socialIds
      }
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

  @withContext('📲 add-session')
  async addSession (
    ctx: MeasureContext,
    ws: ConnectionSocket,
    token: Token,
    rawToken: string,
    pipelineFactory: PipelineFactory,
    communicationApiFactory: CommunicationApiFactory,
    sessionId: string | undefined
  ): Promise<AddSessionResponse> {
    const { workspace: workspaceUuid } = token

    let workspaceInfo: WorkspaceInfoWithStatus | undefined
    try {
      workspaceInfo = await this.getWorkspaceInfo(rawToken)
    } catch (err: any) {
      this.updateConnectErrorInfo(token)
      return { error: err }
    }

    if (workspaceInfo === undefined) {
      return { error: new Error('Workspace not found or not available'), terminate: true }
    }

    if (isArchivingMode(workspaceInfo.mode)) {
      // No access to disabled workspaces for regular users
      return { error: new Error('Workspace is archived'), terminate: true, specialError: 'archived' }
    }
    if (isMigrationMode(workspaceInfo.mode)) {
      // No access to disabled workspaces for regular users
      return { error: new Error('Workspace is in region migration'), terminate: true, specialError: 'migration' }
    }
    if (isRestoringMode(workspaceInfo.mode)) {
      // No access to disabled workspaces for regular users
      return { error: new Error('Workspace is in backup restore'), terminate: true, specialError: 'migration' }
    }

    if (workspaceInfo.isDisabled === true && token.account !== systemAccountUuid && token.extra?.admin !== 'true') {
      // No access to disabled workspaces for regular users
      return { error: new Error('Workspace not found or not available'), terminate: true }
    }

    if (isWorkspaceCreating(workspaceInfo.mode) && token.account !== systemAccountUuid) {
      // No access to workspace for token.
      return { error: new Error(`Workspace during creation phase ${token.account} ${token.workspace}`) }
    }

    let account: Account | undefined
    try {
      account = await this.getAccount(rawToken)
    } catch (err: any) {
      this.updateConnectErrorInfo(token)
      return { error: err }
    }

    if (account === undefined) {
      return { error: new Error('Account not found or not available'), terminate: true }
    }

    const wsVersion: Data<Version> = {
      major: workspaceInfo.versionMajor,
      minor: workspaceInfo.versionMinor,
      patch: workspaceInfo.versionPatch
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
        workspace: workspaceInfo.uuid,
        workspaceUrl: workspaceInfo.url,
        account: token.account,
        extra: JSON.stringify(token.extra ?? {})
      })
      // Version mismatch, return upgrading.
      return { upgrade: true, progress: workspaceInfo.mode === 'upgrading' ? workspaceInfo.processingProgress ?? 0 : 0 }
    }

    let workspace = this.workspaces.get(workspaceUuid)
    if (workspace?.closing !== undefined) {
      await workspace?.closing
    }

    workspace = this.workspaces.get(workspaceUuid)

    const oldSession = sessionId !== undefined ? workspace?.sessions?.get(sessionId) : undefined
    if (oldSession !== undefined) {
      // Just close old socket for old session id.
      await this.close(ctx, oldSession.socket, workspaceUuid)
    }

    const workspaceName = workspaceInfo.name ?? workspaceInfo.url ?? workspaceInfo.uuid
    const branding =
      (workspaceInfo.branding !== undefined
        ? Object.values(this.brandingMap).find((b) => b.key === workspaceInfo?.branding)
        : null) ?? null

    if (workspace === undefined) {
      ctx.warn('open workspace', {
        account: token.account,
        workspace: workspaceInfo.uuid,
        wsUrl: workspaceInfo.url,
        ...token.extra
      })

      workspace = this.createWorkspace(
        ctx.parent ?? ctx,
        ctx,
        pipelineFactory,
        communicationApiFactory,
        token,
        workspaceInfo.url ?? workspaceInfo.uuid,
        workspaceName,
        workspaceInfo.uuid,
        workspaceInfo.dataId,
        branding
      )
      await this.workspaceProducer.send(workspaceInfo.uuid, [workspaceEvents.open()])
    }

    let pipeline: Pipeline
    if (token.extra?.model === 'upgrade') {
      if (workspace.upgrade) {
        ctx.warn('reconnect workspace in upgrade', {
          account: token.account,
          workspace: workspaceInfo.uuid,
          wsUrl: workspaceInfo.url
        })
        pipeline = await ctx.with('💤 wait-pipeline', {}, () => (workspace as Workspace).pipeline)
      } else {
        ctx.warn('reconnect workspace in upgrade switch', {
          email: token.account,
          workspace: workspaceInfo.uuid,
          wsUrl: workspaceInfo.url
        })

        // We need to wait in case previous upgrade connection is already closing.
        pipeline = await this.switchToUpgradeSession(
          token,
          sessionId,
          ctx.parent ?? ctx,
          workspaceInfo.uuid,
          workspace,
          pipelineFactory,
          communicationApiFactory,
          ws,
          workspaceInfo.url ?? workspaceInfo.uuid,
          workspaceName
        )
      }
    } else {
      if (workspace.upgrade) {
        ctx.warn('connect during upgrade', {
          account: token.account,
          workspace: workspace.workspaceUuid,
          sessionUsers: Array.from(workspace.sessions.values()).map((it) => it.session.getUser()),
          sessionData: Array.from(workspace.sessions.values()).map((it) => it.socket.data())
        })

        return { upgrade: true }
      }

      try {
        if (workspace.pipeline instanceof Promise) {
          pipeline = await ctx.with('💤 wait-pipeline', {}, () => (workspace as Workspace).pipeline)
          workspace.pipeline = pipeline
        } else {
          pipeline = workspace.pipeline
        }
      } catch (err: any) {
        // Failed to create pipeline, etc
        Analytics.handleError(err)
        this.workspaces.delete(workspaceInfo.uuid)
        throw err
      }
    }

    const session = this.createSession(token, workspace, account)

    session.sessionId = sessionId !== undefined && (sessionId ?? '').trim().length > 0 ? sessionId : generateId()
    session.sessionInstanceId = generateId()
    this.sessions.set(ws.id, { session, socket: ws })
    // We need to delete previous session with Id if found.
    this.tickCounter++
    workspace.sessions.set(session.sessionId, { session, socket: ws, tickHash: this.tickCounter % ticksPerSecond })

    const accountUuid = account.uuid
    await this.usersProducer.send(workspaceInfo.uuid, [
      userEvents.login({
        user: accountUuid,
        sessions: this.countUserSessions(workspace, accountUuid),
        socialIds: account.socialIds
      })
    ])

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
    return { session, context: workspace.context, workspaceId: workspaceInfo.uuid }
  }

  private updateConnectErrorInfo (token: Token): void {
    this.clientErrors++
    if (!this.lastClients.includes(token.account)) {
      this.lastClients = [token.account, ...this.lastClients.slice(0, 9)]
    }
  }

  private async switchToUpgradeSession (
    token: Token,
    sessionId: string | undefined,
    ctx: MeasureContext,
    workspaceUuid: WorkspaceUuid,
    workspace: Workspace,
    pipelineFactory: PipelineFactory,
    communicationApiFactory: CommunicationApiFactory,
    ws: ConnectionSocket,
    workspaceUrl: string,
    workspaceName: string
  ): Promise<Pipeline> {
    if (LOGGING_ENABLED) {
      ctx.info('reloading workspace', { workspaceName, token: JSON.stringify(token) })
    }

    // Mark as upgrade, to prevent any new clients to connect during close
    workspace.upgrade = true
    // If upgrade client is used.
    // Drop all existing clients
    workspace.closing = this.closeAll(workspaceUuid, workspace, 0, 'upgrade')
    await workspace.closing
    workspace.closing = undefined
    // Wipe workspace and update values.
    workspace.workspaceName = workspaceName
    if (!workspace.upgrade) {
      // This is previous workspace, intended to be closed.
      workspace.id = generateId()
      workspace.sessions = new Map()
    }

    const workspaceIds: WorkspaceIds = {
      uuid: workspace.workspaceUuid,
      url: workspace.workspaceUrl,
      dataId: workspace.workspaceDataId
    }
    workspace.communicationApi = await communicationApiFactory(ctx, workspaceIds, (ctx, sessionIds, result) => {
      this.broadcastSessions(ctx, workspace, sessionIds, result)
    })
    // Re-create pipeline.
    workspace.pipeline = pipelineFactory(
      ctx,
      workspaceIds,
      true,
      (ctx, tx, targets, exclude) => {
        this.broadcastAll(workspace, tx, targets, exclude)
      },
      workspace.branding,
      workspace.communicationApi
    )
    return await workspace.pipeline
  }

  broadcastAll (workspace: Workspace, tx: Tx[], target?: string | string[], exclude?: string[]): void {
    if (workspace.upgrade) {
      return
    }
    if (target !== undefined && !Array.isArray(target)) {
      target = [target]
    }
    const ctx = this.ctx.newChild('📬 broadcast-all', {})
    const sessions = [...workspace.sessions.values()].filter((it) => {
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
    pipelineFactory: PipelineFactory,
    communicationApiFactory: CommunicationApiFactory,
    token: Token,
    workspaceUrl: string,
    workspaceName: string,
    workspaceUuid: WorkspaceUuid | undefined,
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
    const communicationApi = communicationApiFactory(pipelineCtx, workspaceIds, (ctx, sessionIds, result) => {
      this.broadcastSessions(ctx, workspace, sessionIds, result)
    })

    const factory = async (): Promise<Pipeline> => {
      return await pipelineFactory(
        pipelineCtx,
        workspaceIds,
        upgrade,
        (ctx, tx, targets, exclude) => {
          this.broadcastAll(workspace, tx, targets, exclude)
        },
        branding,
        await communicationApi
      )
    }
    const workspace: Workspace = {
      context,
      id: generateId(),
      pipeline: factory(),
      communicationApi,
      sessions: new Map(),
      softShutdown: workspaceSoftShutdownTicks,
      upgrade,
      workspaceUuid: token.workspace,
      workspaceName,
      workspaceUrl,
      workspaceDataId,
      branding,
      workspaceInitCompleted: false,
      tickHash: this.tickCounter % ticksPerSecond,
      tickHandlers: new Map(),
      token: generateToken(systemAccountUuid, token.workspace)
    }
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
        workspace: workspace?.workspaceName,
        user: sessionRef.session.getUser(),
        binary: sessionRef.session.binaryMode,
        compression: sessionRef.session.useCompression,
        totalTime: Date.now() - sessionRef.session.createTime,
        workspaceUsers: workspace?.sessions?.size,
        totalUsers: this.sessions.size
      })
      this.sessions.delete(ws.id)

      if (workspace !== undefined) {
        workspace.sessions.delete(sessionRef.session.sessionId)

        const userUuid = sessionRef.session.getUser()
        await this.usersProducer.send(workspace.workspaceUuid, [
          userEvents.logout({
            user: userUuid,
            sessions: this.countUserSessions(workspace, userUuid),
            socialIds: sessionRef.session.getUserSocialIds()
          })
        ])

        const pipeline = workspace.pipeline instanceof Promise ? await workspace.pipeline : workspace.pipeline
        const communicationApi =
          workspace.communicationApi instanceof Promise ? await workspace.communicationApi : workspace.communicationApi

        if (this.doHandleTick) {
          workspace.tickHandlers.set(sessionRef.session.sessionId, {
            ticks: this.timeouts.reconnectTimeout * ticksPerSecond,
            operation: () => {
              this.reconnectIds.delete(sessionRef.session.sessionId)
              const user = sessionRef.session.getUser()
              if (workspace !== undefined) {
                const another = Array.from(workspace.sessions.values()).findIndex((p) => p.session.getUser() === user)
                if (another === -1 && !workspace.upgrade) {
                  void this.trySetStatus(
                    workspace.context,
                    pipeline,
                    communicationApi,
                    sessionRef.session,
                    false,
                    workspace.workspaceUuid
                  ).catch(() => {})
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
      this.ctx.warn('force-close', { name: ws.workspaceName })
      ws.upgrade = true // We need to similare upgrade to refresh all clients.
      ws.closing = this.closeAll(wsId, ws, 99, 'force-close', ignoreSocket)
      this.workspaces.delete(wsId)
      await ws.closing
      ws.closing = undefined
    } else {
      this.ctx.warn('force-close-unknown', { wsId })
    }
  }

  async closeAll (
    wsId: WorkspaceUuid,
    workspace: Workspace,
    code: number,
    reason: 'upgrade' | 'shutdown' | 'force-close',
    ignoreSocket?: ConnectionSocket
  ): Promise<void> {
    if (LOGGING_ENABLED) {
      this.ctx.info('closing workspace', {
        workspace: workspace.id,
        wsName: workspace.workspaceName,
        code,
        reason,
        wsId
      })
    }

    const sessions = Array.from(workspace.sessions)
    workspace.sessions = new Map()

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
        wsId,
        workspace: workspace.id,
        wsName: workspace.workspaceName
      })
    }

    sessions
      .filter((it) => it[1].socket.id !== ignoreSocket?.id)
      .forEach((s) => {
        closeS(s[1].session, s[1].socket)
      })

    const closePipeline = async (): Promise<void> => {
      try {
        await this.ctx.with('close-pipeline', {}, async () => {
          await (await workspace.pipeline).close()
        })
      } catch (err: any) {
        Analytics.handleError(err)
        this.ctx.error('close-pipeline-error', { error: err })
      }
    }
    await this.ctx.with('closing', {}, async () => {
      const to = timeoutPromise(120000)
      await Promise.race([closePipeline(), to.promise])
      to.cancelHandle()
    })
    if (LOGGING_ENABLED) {
      this.ctx.warn('Workspace closed...', { workspace: workspace.id, wsId, wsName: workspace.workspaceName })
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
      await this.closeAll(w[0], w[1], 1, 'shutdown')
    }
    await this.workspaceProducer.close()
    await this.usersProducer.close()
  }

  private async performWorkspaceCloseCheck (workspace: Workspace, wsUuid: WorkspaceUuid): Promise<void> {
    const wsUID = workspace.id
    const logParams = { wsUuid, workspace: workspace.id, wsName: workspace.workspaceName }
    if (workspace.sessions.size === 0) {
      if (LOGGING_ENABLED) {
        this.ctx.warn('no sessions for workspace', logParams)
      }
      try {
        if (workspace.sessions.size === 0) {
          const pl = await workspace.pipeline
          let to = timeoutPromise(60000)
          await Promise.race([pl, to.promise])
          to.cancelHandle()
          to = timeoutPromise(60000)
          await Promise.race([pl.close(), to])
          to.cancelHandle()

          if (this.workspaces.get(wsUuid)?.id === wsUID) {
            this.workspaces.delete(wsUuid)
          }
          workspace.context.end()
          if (LOGGING_ENABLED) {
            this.ctx.warn('Closed workspace', logParams)
          }

          await this.workspaceProducer.send(workspace.workspaceUuid, [workspaceEvents.down()])
        }
      } catch (err: any) {
        Analytics.handleError(err)
        this.workspaces.delete(wsUuid)
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
    ws: ConnectionSocket
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
          bfst: Date.now(),
          queue: service.requests.size
        }),
      sendPong: () => {
        ws.sendPong()
      },
      socialStringsToUsers: this.getActiveSocialStringsToUsersMap(service.workspace.workspaceUuid),
      sendError: (reqId, msg, error: Status) =>
        sendResponse(sendCtx, service, ws, {
          id: reqId,
          result: msg,
          error,
          time: platformNowDiff(st),
          bfst: Date.now(),
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

  handleRequest<S extends Session>(
    requestCtx: MeasureContext,
    service: S,
    ws: ConnectionSocket,
    request: Request<any>,
    workspace: WorkspaceUuid
  ): Promise<void> {
    const userCtx = requestCtx.newChild('📞 client', {})

    // Calculate total number of clients
    const reqId = generateId()

    const st = platformNow()
    return userCtx
      .with('🧭 handleRequest', {}, async (ctx) => {
        if (request.time != null) {
          const delta = platformNow() - request.time
          requestCtx.measure('msg-receive-delta', delta)
        }
        if (service.workspace.closing !== undefined) {
          await ws.send(
            ctx,
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
          await this.handleHello<S>(request, service, ctx, workspace, ws, requestCtx)
          return
        }
        if (request.id === -2 && request.method === 'forceClose') {
          // TODO: we chould allow this only for admin or system accounts
          let done = false
          const wsRef = this.workspaces.get(workspace)
          if (wsRef?.upgrade ?? false) {
            done = true
            this.ctx.warn('FORCE CLOSE', { workspace })
            // In case of upgrade, we need to force close workspace not in interval handler
            await this.forceClose(workspace, ws)
          }
          const forceCloseResponse: Response<any> = {
            id: request.id,
            result: done
          }
          await ws.send(ctx, forceCloseResponse, service.binaryMode, service.useCompression)
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

        const pipeline =
          service.workspace.pipeline instanceof Promise ? await service.workspace.pipeline : service.workspace.pipeline
        const communicationApi =
          service.workspace.communicationApi instanceof Promise
            ? await service.workspace.communicationApi
            : service.workspace.communicationApi

        const f = (service as any)[request.method]
        try {
          const params = [...request.params]

          if (ws.isBackpressure()) {
            await ws.backpressure(ctx)
          }

          await ctx.with('🧨 process', {}, (callTx) =>
            f.apply(service, [
              this.createOpContext(callTx, userCtx, pipeline, communicationApi, request.id, service, ws),
              ...params
            ])
          )
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
      })
      .finally(() => {
        userCtx.end()
        service.requests.delete(reqId)
      })
  }

  handleRPC<S extends Session>(
    requestCtx: MeasureContext,
    service: S,
    ws: ConnectionSocket,
    operation: (ctx: ClientSessionCtx) => Promise<void>
  ): Promise<void> {
    const userCtx = requestCtx.newChild('📞 client', {})

    // Calculate total number of clients
    const reqId = generateId()

    const st = Date.now()
    return userCtx
      .with('🧭 handleRPC', {}, async (ctx) => {
        if (service.workspace.closing !== undefined) {
          throw new Error('Workspace is closing')
        }

        service.requests.set(reqId, {
          id: reqId,
          params: {},
          start: st
        })

        const pipeline =
          service.workspace.pipeline instanceof Promise ? await service.workspace.pipeline : service.workspace.pipeline
        const communicationApi =
          service.workspace.communicationApi instanceof Promise
            ? await service.workspace.communicationApi
            : service.workspace.communicationApi
        try {
          const uctx = this.createOpContext(ctx, userCtx, pipeline, communicationApi, reqId, service, ws)
          await operation(uctx)
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
      })
      .finally(() => {
        userCtx.end()
        service.requests.delete(reqId)
      })
  }

  private async handleHello<S extends Session>(
    request: Request<any>,
    service: S,
    ctx: MeasureContext<any>,
    workspace: WorkspaceUuid,
    ws: ConnectionSocket,
    requestCtx: MeasureContext<any>
  ): Promise<void> {
    try {
      const hello = request as HelloRequest
      service.binaryMode = hello.binary ?? false
      service.useCompression = this.enableCompression ? hello.compression ?? false : false

      if (LOGGING_ENABLED) {
        ctx.info('hello happen', {
          workspace,
          user: service.getUser(),
          binary: service.binaryMode,
          compression: service.useCompression,
          timeToHello: Date.now() - service.createTime,
          workspaceUsers: this.workspaces.get(workspace)?.sessions?.size,
          totalUsers: this.sessions.size
        })
      }
      const reconnect = this.reconnectIds.has(service.sessionId)
      if (reconnect) {
        this.reconnectIds.delete(service.sessionId)
      }
      const pipeline =
        service.workspace.pipeline instanceof Promise ? await service.workspace.pipeline : service.workspace.pipeline
      const communicationApi =
        service.workspace.communicationApi instanceof Promise
          ? await service.workspace.communicationApi
          : service.workspace.communicationApi
      const helloResponse: HelloResponse = {
        id: -1,
        result: 'hello',
        binary: service.binaryMode,
        reconnect,
        serverVersion: this.serverVersion,
        lastTx: pipeline.context.lastTx,
        lastHash: pipeline.context.lastHash,
        account: service.getRawAccount(),
        useCompression: service.useCompression
      }
      await ws.send(requestCtx, helloResponse, false, false)

      // We do not need to wait for set-status, just return session to client
      const _workspace = service.workspace
      if (helloResponse.account.role !== AccountRole.DocGuest) {
        void ctx
          .with('set-status', {}, (ctx) =>
            this.trySetStatus(ctx, pipeline, communicationApi, service, true, _workspace.workspaceUuid)
          )
          .catch(() => {})
      }
    } catch (err: any) {
      ctx.error('error', { err })
    }
  }
}

export function createSessionManager (
  ctx: MeasureContext,
  sessionFactory: SessionFactory,
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
  queue: PlatformQueue
): SessionManager {
  return new TSessionManager(
    ctx,
    sessionFactory,
    timeouts,
    brandingMap ?? null,
    profiling,
    accountsUrl,
    enableCompression,
    doHandleTick,
    queue
  )
}

/**
 * @public
 */
export function startSessionManager (
  ctx: MeasureContext,
  opt: {
    port: number
    pipelineFactory: PipelineFactory
    communicationApiFactory: CommunicationApiFactory
    sessionFactory: SessionFactory
    brandingMap: BrandingMap
    serverFactory: ServerFactory
    enableCompression?: boolean
    accountsUrl: string
    externalStorage: StorageAdapter
    profiling?: {
      start: () => void
      stop: () => Promise<string | undefined>
    }
    queue: PlatformQueue
  } & Partial<Timeouts>
): { shutdown: () => Promise<void>, sessionManager: SessionManager } {
  const sessions = createSessionManager(
    ctx,
    opt.sessionFactory,
    opt.brandingMap,
    {
      pingTimeout: opt.pingTimeout ?? 10000,
      reconnectTimeout: 5 // seconds to reconnect
    },
    opt.profiling,
    opt.accountsUrl,
    opt.enableCompression ?? false,
    true,
    opt.queue
  )
  return {
    shutdown: opt.serverFactory(
      sessions,
      (rctx, service, ws, msg, workspace) => {
        void sessions.handleRequest(rctx, service, ws, msg, workspace).catch((err) => {
          ctx.error('failed to handle request', err)
        })
      },
      ctx,
      opt.pipelineFactory,
      opt.communicationApiFactory,
      opt.port,
      opt.accountsUrl,
      opt.externalStorage
    ),
    sessionManager: sessions
  }
}
