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
  type EndpointInfo,
  type Account,
  AccountRole,
  type AccountUuid,
  type Branding,
  type BrandingMap,
  cutObjectArray,
  type Data,
  generateId,
  isArchivingMode,
  isMigrationMode,
  isRestoringMode,
  isWorkspaceCreating,
  type MeasureContext,
  type PersonId,
  pickPrimarySocialId,
  platformNow,
  platformNowDiff,
  SocialIdType,
  type SubscribedWorkspaceInfo,
  systemAccountUuid,
  type Tx,
  TxFactory,
  type TxHandler,
  type TxWorkspaceEvent,
  type Version,
  versionToString,
  withContext,
  type WorkspaceDataId,
  WorkspaceEvent,
  type WorkspaceIds,
  type WorkspaceInfoWithStatus,
  type WorkspaceMode,
  type WorkspaceUuid
} from '@hcengineering/core'
import platform, { Severity, Status, unknownError } from '@hcengineering/platform'
import {
  type HelloRequest,
  type HelloResponse,
  type RateLimitInfo,
  type Request,
  type Response,
  SlidingWindowRateLimitter
} from '@hcengineering/rpc'
import {
  type CommunicationApiFactory,
  type ConnectionSocket,
  type EndpointConnectionFactory,
  LOGGING_ENABLED,
  pingConst,
  type PipelineFactory,
  type PlatformQueue,
  type PlatformQueueProducer,
  QueueTopic,
  type QueueUserMessage,
  type QueueWorkspaceMessage,
  userEvents,
  type UserStatistics,
  workspaceEvents,
  type WorkspaceStatistics
} from '@hcengineering/server-core'
import { generateToken, type Token } from '@hcengineering/server-token'
import { type ClientSessionCtx, type Session, type SessionInfoRecord, type SessionManager } from './types'
import { type PipelinePair, type Workspace, WorkspaceImpl, type WorkspacePipelineFactory } from './workspace'

import { ClientSession } from './client'
import { EndpointClient, EndpointWorkspace } from './endpoint'
import { getLastHashInfo, sendResponse } from './utils'

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

interface TickHandler {
  ticks: number
  operation: () => Promise<void>
}

export class TSessionManager implements SessionManager {
  private readonly statusPromises = new Map<string, Promise<void>>()
  readonly workspaces = new Map<WorkspaceUuid, Workspace>()
  checkInterval: any

  sessions = new Map<string, SessionInfoRecord>()

  accountIdToSessions = new Map<AccountUuid, Session[]>()

  accounts = new Map<AccountUuid, Account>()
  socialStringsToUsers = new Map<PersonId, AccountUuid>()

  tickHandlers = new Map<string, TickHandler>()
  reconnectIds = new Set<string>()

  maintenanceTimer: any
  timeMinutes = 0

  modelVersion = process.env.MODEL_VERSION ?? ''
  serverVersion = process.env.VERSION ?? ''

  workspaceProducer: PlatformQueueProducer<QueueWorkspaceMessage>
  usersProducer: PlatformQueueProducer<QueueUserMessage>

  broadcastHandlers: TxHandler[] = []

  now: number = Date.now()

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
    readonly queue: PlatformQueue,
    readonly pipelineFactory: PipelineFactory,
    readonly endpointFactory: EndpointConnectionFactory,
    readonly communicationApiFactory: CommunicationApiFactory,
    readonly region: string,
    readonly endpointName: string,
    readonly _handleTick: boolean
  ) {
    if (this._handleTick) {
      this.checkInterval = setInterval(() => {
        this.handleTick()
      }, 1000 / ticksPerSecond)
    }
    this.workspaceProducer = this.queue.getProducer(ctx.newChild('queue', {}), QueueTopic.Workspace)
    this.usersProducer = this.queue.getProducer(ctx.newChild('queue', {}), QueueTopic.Users)
  }

  addBroadcastHandler (handler: TxHandler): void {
    this.broadcastHandlers.push(handler)
  }

  removeBroadcastHandler (handler: TxHandler): void {
    this.broadcastHandlers = this.broadcastHandlers.filter((it) => it !== handler)
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
    for (const ws of this.workspaces.values()) {
      const event: TxWorkspaceEvent = this.createMaintenanceWarning(ws.wsId.uuid)
      this.doBroadcast(ws, [event])
    }
  }

  private createMaintenanceWarning (workspace: WorkspaceUuid): TxWorkspaceEvent {
    return {
      _id: generateId(),
      _class: core.class.TxWorkspaceEvent,
      _uuid: workspace,
      event: WorkspaceEvent.MaintenanceNotification,
      space: core.space.Workspace,
      objectSpace: core.space.DerivedTx,
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      createdBy: core.account.System,
      params: {
        timeMinutes: this.timeMinutes
      }
    }
  }

  private createWorkspaceEvent<T>(workspace: WorkspaceUuid, event: WorkspaceEvent, params?: T): TxWorkspaceEvent {
    return {
      _uuid: workspace,
      _id: generateId(),
      _class: core.class.TxWorkspaceEvent,
      space: core.space.Workspace,
      objectSpace: core.space.DerivedTx,
      event,
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      createdBy: core.account.System,
      params
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
      if (this.ticks % ((workspace.maintenance ? 5 : 60) * ticksPerSecond) === workspace.tickHash) {
        try {
          // TODO: Rework on Queue update listen???
          void this.getWorkspaceInfo(workspace.token, workspace.checkHasUser())
            .then((info) => {
              if (info !== undefined) {
                const wsVersion: Data<Version> = {
                  major: info.versionMajor,
                  minor: info.versionMinor,
                  patch: info.versionPatch
                }

                const maintenance = this.getMaintenance(info.mode, versionToString(wsVersion))
                if (workspace.maintenance && !maintenance) {
                  workspace.maintenance = false
                  this.ctx.warn('Workspace is back to normal', {
                    workspace: workspace.wsId.url,
                    wsId: workspace.wsId.uuid
                  })
                  // Need to inform clients about workspace back to normal
                  this.broadcastAll(workspace.wsId.uuid, [
                    this.createWorkspaceEvent(workspace.wsId.uuid, WorkspaceEvent.WorkpaceActive)
                  ])
                }
              }
            })
            .catch(() => {
              // Ignore
            })
        } catch (err: any) {
          // Ignore
        }
      }

      for (const s of workspace.sessions) {
        if (this.ticks % (5 * 60 * ticksPerSecond) === workspace.tickHash) {
          s[1].mins5.find = s[1].current.find
          s[1].mins5.tx = s[1].current.tx

          s[1].current = { find: 0, tx: 0 }
        }
      }

      // Wait some time for new client to appear before closing workspace.
      if (workspace.sessions.size === 0) {
        workspace.softShutdown--
        if (workspace.softShutdown <= 0) {
          this.ctx.warn('closing workspace, no users', {
            workspace: workspace.wsId.url,
            wsId
          })
          void this.performWorkspaceCloseCheck(workspace).catch((err) => {
            console.error({ message: 'Failed to perform workspace close check', err })
          })
        }
      } else {
        workspace.softShutdown = workspaceSoftShutdownTicks
      }
    }

    for (const [k, v] of Array.from(this.tickHandlers.entries())) {
      v.ticks--
      if (v.ticks === 0) {
        this.tickHandlers.delete(k)
        try {
          void v.operation().catch((err) => {
            Analytics.handleError(err)
            this.ctx.error('error during tick handler', { error: err })
          })
        } catch (err: any) {
          Analytics.handleError(err)
        }
      }
    }
  }

  private handleSessionTick (now: number): void {
    for (const s of this.sessions.values()) {
      const isCurrentUserTick = this.ticks % ticksPerSecond === s.tickHash

      if (isCurrentUserTick) {
        const lastRequestDiff = now - s.session.lastRequest

        let timeout = 60000
        if (s.session.getUser() === systemAccountUuid) {
          timeout = timeout * 10
        }
        if (lastRequestDiff > timeout) {
          this.ctx.warn('session hang, closing...', { user: s.session.getUser(), sessionId: s.session.sessionId })

          // Force close workspace if only one client and it hang.
          void this.close(this.ctx, s.session).catch((err) => {
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
            void s.socket.send(this.ctx, { result: pingConst }, s.session.binaryMode, s.session.useCompression)
          }
        }
        for (const r of s.session.requests.values()) {
          const sec = Math.round((now - r.start) / 1000)
          if (sec > 0 && sec % 30 === 0) {
            this.ctx.warn('request hang found', {
              sec,
              wsId: r.workspaceId,
              total: s.session.requests.size,
              user: s.session.getUser(),
              ...cutObjectArray(r.params)
            })
          }
        }
      }
    }
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

  async getLoginWithWorkspaceInfo (token: string): Promise<LoginInfoWithWorkspaces | undefined> {
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
      .filter((it) => it.getUser() === accountUuid)
      .reduce<number>((acc) => acc + 1, 0)
  }

  tickCounter = 0

  getMaintenance (mode: WorkspaceMode, version: string): boolean {
    return (
      isWorkspaceCreating(mode) ||
      isMigrationMode(mode) ||
      isRestoringMode(mode) ||
      (this.modelVersion !== '' && this.modelVersion !== version)
    )
  }

  getWorkspace (
    ctx: MeasureContext,
    workspaceUuid: WorkspaceUuid,
    workspaceInfo: LoginInfoWorkspace
  ): { workspace?: Workspace, open?: Promise<void> } {
    if (isArchivingMode(workspaceInfo.mode)) {
      // No access to disabled workspaces for regular users
      return {}
    }
    const wsVersion: Data<Version> = {
      major: workspaceInfo.version.versionMajor,
      minor: workspaceInfo.version.versionMinor,
      patch: workspaceInfo.version.versionPatch
    }

    const maintenance = this.getMaintenance(workspaceInfo.mode, versionToString(wsVersion))

    let workspace = this.workspaces.get(workspaceUuid)
    let open: Promise<void> | undefined

    const branding = null

    if (workspace === undefined) {
      ctx.warn('open workspace', {
        url: workspaceInfo.url,
        workspace: workspaceUuid
      })
      ;({ workspace, open } = this.createWorkspace(
        ctx.parent ?? ctx,
        ctx,
        workspaceUuid,
        workspaceInfo.endpoint,
        workspaceInfo.url,
        workspaceInfo.dataId,
        branding
      ))

      void this.workspaceProducer.send(workspaceUuid, [workspaceEvents.open()]).catch((err) => {
        ctx.warn('failed to send workspace open event', { err })
      })
    }
    workspace.maintenance = maintenance
    if (maintenance) {
      ctx.warn('Workspace in maintenance', {
        version: this.modelVersion,
        workspaceVersion: versionToString(wsVersion),
        workspace: workspaceUuid
      })
    }
    return { workspace, open }
  }

  async registerAccountByUuid (account: AccountUuid, session: Session): Promise<void> {
    const acc = this.accounts.get(account)
    if (acc !== undefined) {
      this.registerAccount(account, acc, session)
      return
    }

    const loginInfo = await this.getLoginWithWorkspaceInfo(generateToken(account, '' as WorkspaceUuid))
    if (loginInfo !== undefined) {
      this.registerAccount(account, createAccountFromInfo(loginInfo), session)
    }
  }

  registerAccount (account: AccountUuid, loginInfo: Account, session: Session): void {
    this.accounts.set(account, loginInfo)
    const existingSessions = this.accountIdToSessions.get(account) ?? []
    if (existingSessions.length === 0) {
      for (const sid of loginInfo.fullSocialIds.values()) {
        this.socialStringsToUsers.set(sid._id, account)
      }
    }
    this.accountIdToSessions.set(account, existingSessions.concat(session))
  }

  unregisterAccount (account: AccountUuid, sessionRef: Session): void {
    const filteredSessions = (this.accountIdToSessions.get(account) ?? []).filter(
      (it) => it.sessionId !== sessionRef.sessionId
    )

    if (filteredSessions.length === 0) {
      // In case no sessions left, remove account from map
      this.accountIdToSessions.delete(account)
      this.accounts.delete(account)

      // Also remove sessionId mapping
      for (const sid of sessionRef.getUserSocialIds()) {
        this.socialStringsToUsers.delete(sid)
      }
    } else {
      this.accountIdToSessions.set(account, filteredSessions)
    }
  }

  @withContext('📲 add-session')
  async addSession (
    ctx: MeasureContext,
    ws: ConnectionSocket,
    token: Token,
    rawToken: string,
    sessionId: string | undefined
  ): Promise<Session> {
    let account: LoginInfoWithWorkspaces | undefined

    try {
      account = (token.account === systemAccountUuid)
        ? {
            account: token.account,
            name: 'System',
            personalWorkspace: core.workspace.Any,
            workspaces: {},
            socialIds: []
          }
        : await this.getLoginWithWorkspaceInfo(rawToken)
    } catch (err: any) {
      ctx.error('failed to get login info', { err })
    }

    if (account === undefined) {
      void ws.send(
        ctx,
        {
          id: -1,
          error: new Status(Severity.ERROR, platform.status.AccountNotFound, {
            account: token.account
          }),
          terminate: true
        },
        false,
        false
      )
      throw new Error('Account not found or not available')
    }

    let targetInfo = account.workspaces[token.workspace]
    let targetWorkspace: WorkspaceUuid | undefined
    if (targetInfo !== undefined) {
      targetWorkspace = token.workspace
    }

    if (targetInfo === undefined && token.workspace != null && token.workspace !== '') {
      // In case of guest or system account
      // We need to get workspace info for system account.
      const workspaceInfo = await this.getWorkspaceInfo(rawToken, false)
      if (workspaceInfo === undefined) {
        ctx.warn('Workspace not found or not available', { token })
      } else {
        targetInfo = this.toLoginInfoWorkspace(workspaceInfo)
        account.workspaces[token.workspace] = targetInfo
      }
    }

    const oldSession = sessionId !== undefined ? this.sessions.get(sessionId) : undefined
    if (oldSession !== undefined) {
      // Just close old socket for old session id.
      await this.close(ctx, oldSession.session)
    }

    // Create sesson for all workspaces, or for selected workspace only
    const accountRef: Account = createAccountFromInfo(account, token.workspace)

    const session = new ClientSession(
      (ctx.parent ?? ctx).newChild('🧲 session', {}),
      token,
      ws,
      targetInfo !== undefined && targetWorkspace !== undefined
        ? new Set([targetWorkspace])
        : new Set(Object.keys(account.workspaces) as WorkspaceUuid[]),
      accountRef,
      account,
      token.extra?.mode === 'backup'
    )

    session.sessionId = sessionId !== undefined && (sessionId ?? '').trim().length > 0 ? sessionId : generateId()

    const tickHash = this.tickCounter % ticksPerSecond

    this.sessions.set(session.sessionId, { session, socket: ws, tickHash })

    this.registerAccount(session.getUser(), accountRef, session)

    this.tickCounter++

    const accountUuid = account.account

    for (const workspaceRef of session.workspaces) {
      const info = account.workspaces[workspaceRef]
      if (info === undefined) {
        continue
      }
      const { workspace, open } = this.getWorkspace(ctx, workspaceRef, info)
      if (workspace !== undefined) {
        if (workspace.maintenance && token.account !== systemAccountUuid) {
          // We need to trigger workspace to be updated, to workspace service to perform upgrade.
          // TODO: Rework on request in QUEUE
          void this.getWorkspaceInfo(workspaceRef, true).catch(() => {
            // Ignore
          })
        }
        await workspace.addSession(session)
        if (open !== undefined) {
          await open
        }

        if (accountUuid !== systemAccountUuid && accountUuid !== guestAccount) {
          await this.usersProducer.send(workspace.wsId.uuid, [
            userEvents.login({
              user: accountUuid,
              sessions: this.countUserSessions(workspace, accountUuid),
              socialIds: account.socialIds.map((it) => it._id)
            })
          ])
        }
      }
    }
    if (this.timeMinutes > 0) {
      void ws
        .send(
          ctx,
          { result: this.createMaintenanceWarning(Object.keys(account.workspaces)[0] as WorkspaceUuid) },
          session.binaryMode,
          session.useCompression
        )
        .catch((err) => {
          ctx.error('failed to send maintenance warning', err)
        })
    }
    return session
  }

  private toLoginInfoWorkspace (workspaceInfo: WorkspaceInfoWithStatus): LoginInfoWorkspace {
    return {
      url: workspaceInfo.url,
      mode: workspaceInfo.mode,
      name: workspaceInfo.name,
      dataId: workspaceInfo.dataId,
      version: {
        versionMajor: workspaceInfo.versionMajor,
        versionMinor: workspaceInfo.versionMinor,
        versionPatch: workspaceInfo.versionPatch
      },
      endpoint: workspaceInfo.endpoint,
      role: AccountRole.Owner,
      progress: workspaceInfo.processingProgress
    }
  }

  async getLastTxHash (
    workspaceId: WorkspaceUuid
  ): Promise<{ lastTx: string | undefined, lastHash: string | undefined }> {
    const ws = this.workspaces.get(workspaceId)
    if (ws !== undefined) {
      return { lastHash: ws.getLastHash(), lastTx: ws.getLastTx() }
    }

    const info = await this.getWorkspaceInfo(workspaceId, false)
    if (info === undefined) {
      return { lastHash: undefined, lastTx: undefined }
    }
    const { workspace } = this.getWorkspace(this.ctx, workspaceId, this.toLoginInfoWorkspace(info))

    if (workspace === undefined) {
      return { lastHash: undefined, lastTx: undefined }
    }
    return await workspace.with(async (pipeline) => {
      return { lastTx: pipeline.context.lastTx, lastHash: pipeline.context.lastHash }
    })
  }

  broadcastAll (
    workspace: WorkspaceUuid,
    tx: Tx[],
    target?: AccountUuid | AccountUuid[],
    exclude?: AccountUuid[]
  ): void {
    const ws = this.workspaces.get(workspace)
    if (ws === undefined) {
      return
    }
    this.doBroadcast(ws, tx, target, exclude)
  }

  doBroadcast (ws: Workspace, tx: Tx[], target?: AccountUuid | AccountUuid[], exclude?: AccountUuid[]): void {
    if (target !== undefined && !Array.isArray(target)) {
      target = [target]
    }
    const ctx = this.ctx.newChild('📬 broadcast-all', {})
    const sessions = [...ws.sessions.values()].filter((it) => {
      if (it === undefined) {
        return false
      }
      const tt = it.getUser()
      return (target === undefined && !(exclude ?? []).includes(tt)) || (target?.includes(tt) ?? false)
    })
    function send (): void {
      for (const session of sessions) {
        try {
          void sendResponse(ctx, session, session.socket, { result: tx }).catch((err) => {
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
    const ctx = measure.newChild('📬 broadcast sessions', {})
    const sessions = [...workspace.sessions.values()].filter((it) => {
      if (it === undefined || it.sessionId === '') {
        return false
      }
      return sessionIds.includes(it.sessionId)
    })

    function send (): void {
      for (const session of sessions) {
        try {
          void sendResponse(ctx, session, session.socket, { result })
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

  broadcast (workspaceId: WorkspaceUuid, resp: Tx[], target: AccountUuid | undefined, exclude?: AccountUuid[]): void {
    if (this.broadcastHandlers.length > 0) {
      for (const handler of this.broadcastHandlers) {
        handler(resp, workspaceId, target, exclude)
      }
    }
    const workspace = this.workspaces.get(workspaceId)
    if (workspace === undefined) {
      this.ctx.error('internal: cannot find sessions', {
        workspaceId,
        target
      })
      return
    }

    const sessions = [...workspace.sessions.values()]
    const ctx = this.ctx.newChild('📭 broadcast', {})
    const send = (): void => {
      for (const sessionRef of sessions) {
        if (sessionRef.subscribedUsers.size > 0) {
          if (target == null || sessionRef.subscribedUsers.has(target)) {
            // Will be handled by session on endpoint.
            sessionRef.broadcast(ctx, sessionRef.socket, resp, target, exclude)
          }
        } else {
          const tt = sessionRef.getUser()
          if ((target === undefined && !(exclude ?? []).includes(tt)) || (target?.includes(tt) ?? false)) {
            sessionRef.broadcast(ctx, sessionRef.socket, resp)
          }
        }
        ctx.end()
      }
    }
    if (sessions.length > 0) {
      // We need to send broadcast after our client response so put it after all IO
      send()
    } else {
      ctx.end()
    }
  }

  // A map of endpoint external url to endpoint client.
  endpointClients = new Map<string, EndpointClient>()

  private createWorkspace (
    ctx: MeasureContext,
    pipelineCtx: MeasureContext,
    uuid: WorkspaceUuid,
    endpoint: EndpointInfo,
    workspaceUrl: string,
    workspaceDataId: WorkspaceDataId | undefined,
    branding: Branding | null
  ): { workspace: Workspace, open?: Promise<void> } {
    const context = ctx.newChild('🧲 session', {})
    const workspaceIds: WorkspaceIds = {
      uuid,
      dataId: workspaceDataId,
      url: workspaceUrl
    }

    let factory: WorkspacePipelineFactory

    let open: Promise<void> | undefined

    if (this.endpointName !== endpoint.internalUrl || this.endpointName !== endpoint.externalUrl) {
      const wsToken = generateToken(systemAccountUuid, uuid)
      const epClient =
        this.endpointClients.get(endpoint.externalUrl) ??
        new EndpointClient(ctx, this.region, endpoint, this.endpointFactory, this)
      this.endpointClients.set(endpoint.externalUrl, epClient)

      open = epClient.addWorkspace(uuid)
      const workspace = new EndpointWorkspace(
        ctx,
        epClient,
        wsToken,
        this.tickCounter % ticksPerSecond,
        workspaceSoftShutdownTicks,
        workspaceIds,
        branding
      )
      this.workspaces.set(uuid, workspace)
      return { workspace, open }
    } else {
      factory = async (): Promise<PipelinePair> => {
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
      const workspace: Workspace = new WorkspaceImpl(
        context,
        generateToken(systemAccountUuid, uuid),
        factory,
        this.tickCounter % ticksPerSecond,
        workspaceSoftShutdownTicks,
        workspaceIds,
        branding
      )
      this.workspaces.set(uuid, workspace)
      workspace.open() // Trigger opening of workspace
      return { workspace, open }
    }
  }

  private async trySetStatus (
    ctx: MeasureContext,
    workspaces: Workspace[],
    session: Session,
    online: boolean
  ): Promise<void> {
    const current = this.statusPromises.get(session.getUser())
    if (current !== undefined) {
      await current
    }
    const promise = this.setStatus(ctx, workspaces, session, online)
    this.statusPromises.set(session.getUser(), promise)
    await promise
    this.statusPromises.delete(session.getUser())
  }

  private async setStatus (
    ctx: MeasureContext,
    workspaces: Workspace[],
    session: Session,
    online: boolean
  ): Promise<void> {
    try {
      const user = session.getUser()
      if (user === undefined) return

      const clientCtx: ClientSessionCtx = {
        workspaces,
        requestId: undefined,
        sendResponse: async () => {
          // No response
        },
        ctx,
        socialStringsToUsers: this.socialStringsToUsers,
        sendError: async () => {
          // Assume no error send
        },
        sendPong: () => {},
        getAccount: (uuid) => {
          const result = this.accounts.get(uuid)
          if (result === undefined) {
            throw new Error('Account not found')
          }
          return result
        }
      }

      const statuses = new Map(
        (await session.findAllRaw(clientCtx, core.class.UserStatus, { user }, {})).map((it) => [it._uuid, it])
      )
      for (const ws of workspaces) {
        const txFactory = new TxFactory(session.getRawAccount().primarySocialId, ws.wsId.uuid, true)
        const status = statuses.get(ws.wsId.uuid)

        if (status === undefined) {
          await session.tx(
            { ...clientCtx, workspaces: [ws] },
            txFactory.createTxCreateDoc(core.class.UserStatus, core.space.Space, { online, user })
          )
        } else if (status.online !== online) {
          await session.tx(
            { ...clientCtx, workspaces: [ws] },
            txFactory.createTxUpdateDoc(status._class, core.space.Space, status._id, {
              online
            })
          )
        }
      }
    } catch (err: any) {
      ctx.error('failed to set status', { err })
      Analytics.handleError(err)
    }
  }

  async close (ctx: MeasureContext, sessionRef: Session): Promise<void> {
    if (sessionRef !== undefined) {
      ctx.info('bye happen', {
        userId: sessionRef.getUser(),
        user: sessionRef.getSocialIds().find((it) => it.type !== SocialIdType.HULY)?.value,
        binary: sessionRef.binaryMode,
        compression: sessionRef.useCompression,
        totalTime: Date.now() - sessionRef.createTime,
        totalUsers: this.sessions.size
      })
      this.sessions.delete(sessionRef.sessionId)
      const account = sessionRef.getUser()

      this.unregisterAccount(account, sessionRef)

      if (sessionRef.subscribedUsers.size > 0) {
        for (const uuid of Array.from(sessionRef.subscribedUsers)) {
          this.unregisterAccount(uuid, sessionRef)
        }
      }

      const workspaces = this.getSessionWorkspaces(sessionRef)

      const userUuid = sessionRef.getUser()
      for (const workspace of workspaces) {
        if (workspace !== undefined) {
          await workspace.removeSession(sessionRef)

          this.tickHandlers.set(sessionRef.sessionId, {
            ticks: this.timeouts.reconnectTimeout * ticksPerSecond,
            operation: async () => {
              if (!this.reconnectIds.delete(sessionRef.sessionId)) {
                // Already reconnected
                return
              }
              for (const u of [account, ...sessionRef.subscribedUsers]) {
                // All other sessions, not for this workspaces.
                const allSessions = (this.accountIdToSessions.get(u) ?? []).filter(
                  (it) => it.sessionId !== sessionRef.sessionId && !it.workspaces.has(workspace.wsId.uuid)
                )
                if (allSessions.length === 0) {
                  // No other sessions for this user
                  if (account !== guestAccount && u !== systemAccountUuid) {
                    await this.trySetStatus(ctx, workspaces, sessionRef, false).catch(() => {})
                  }
                  await this.usersProducer.send(workspace.wsId.uuid, [
                    userEvents.logout({
                      user: u,
                      sessions: this.countUserSessions(workspace, userUuid),
                      socialIds: sessionRef.getUserSocialIds()
                    })
                  ])
                }
              }

              // Need to close all sessions for this user
              for (const ws of workspaces) {
                // TODO: Make handler async?
                await ws.with(async (pipeline, communicationApi) => {
                  await communicationApi.closeSession(sessionRef.sessionId)
                })
              }
            }
          })
        }
      }
      this.reconnectIds.add(sessionRef.sessionId)
    }
    try {
      sessionRef.socket.close()
    } catch (err) {
      // Ignore if closed
    }
  }

  async closeWorkspaces (ctx: MeasureContext): Promise<void> {
    clearInterval(this.checkInterval)
    for (const w of this.workspaces.values()) {
      await w.close(this.ctx)
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
          this.workspaces.delete(uuid)

          await workspace.close(this.ctx)

          workspace.context.end()
          if (LOGGING_ENABLED) {
            this.ctx.warn('Closed workspace', logParams)
          }

          await this.workspaceProducer.send(workspace.wsId.uuid, [workspaceEvents.down()])
        }
      } catch (err: any) {
        Analytics.handleError(err)

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
    workspaces: Workspace[],
    requestId: Request<any>['id'],
    service: Session,
    ws: ConnectionSocket,
    rateLimit: RateLimitInfo | undefined
  ): ClientSessionCtx {
    const st = platformNow()
    return {
      ctx,
      workspaces,
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
      socialStringsToUsers: this.socialStringsToUsers,
      sendError: (reqId, msg, error: Status) =>
        sendResponse(sendCtx, service, ws, {
          id: reqId,
          result: msg,
          error,
          time: platformNowDiff(st),
          rateLimit,
          bfst: this.now,
          queue: service.requests.size
        }),
      getAccount: (uuid) => {
        const result = this.accounts.get(uuid)
        if (result === undefined) {
          throw new Error('Account not found')
        }
        return result
      }
    }
  }

  // TODO: cache this map and update when sessions created/closed
  getActiveSocialStringsToUsersMap (workspaces: WorkspaceUuid[], ...extra: Session[]): Map<PersonId, AccountUuid> {
    const res = new Map<PersonId, AccountUuid>()

    for (const workspace of workspaces) {
      const ws = this.workspaces.get(workspace)
      if (ws === undefined) {
        return new Map()
      }

      for (const s of [...Array.from(ws.sessions.values()).map((it) => it), ...extra]) {
        const sessionAccounts = [s.getUser(), ...s.subscribedUsers]
        for (const sessionAccount of sessionAccounts) {
          if (sessionAccount === systemAccountUuid) {
            continue
          }
          const userSocialIds = s.getUserSocialIds()
          for (const id of userSocialIds) {
            res.set(id, sessionAccount)
          }
        }
      }
    }
    return res
  }

  limitter = new SlidingWindowRateLimitter(
    parseInt(process.env.RATE_LIMIT_MAX ?? '250'),
    parseInt(process.env.RATE_LIMIT_WINDOW ?? '30000'),
    () => Date.now()
  )

  async forceCloseWorkspace (ctx: MeasureContext, workspace: WorkspaceUuid): Promise<void> {
    const wsRef = this.workspaces.get(workspace)
    if (wsRef !== undefined) {
      // Just force pipeline close/open
      await wsRef.close(ctx)
    }
  }

  handleRequest (
    requestCtx: MeasureContext,
    session: Session,
    ws: ConnectionSocket,
    request: Request<any>
  ): Promise<void> {
    const userCtx = requestCtx.newChild('📞 client', {})
    const rateLimit =
      session.getUser() === systemAccountUuid ? undefined : this.limitter.checkRateLimit(session.getUser())
    // If remaining is 0, rate limit is exceeded
    if (rateLimit?.remaining === 0) {
      void ws.send(
        userCtx,
        {
          id: request.id,
          rateLimit,
          error: unknownError('Rate limit')
        },
        session.binaryMode,
        session.useCompression
      )
      return Promise.resolve()
    }

    // Calculate total number of clients
    const reqId = generateId()

    const st = Date.now()
    return userCtx
      .with('🧭 handleRequest', {}, async (ctx) => {
        if (request.time != null) {
          const delta = Date.now() - request.time
          requestCtx.measure('msg-receive-delta', delta)
        }
        if (request.id === -1 && request.method === 'hello') {
          await this.handleHello(request, session, ctx, ws, requestCtx)
          return
        }
        if (
          request.id === -2 &&
          request.method === 'forceClose' &&
          session.getRawAccount().uuid === systemAccountUuid
        ) {
          // TODO: we should allow this only for admin or system accounts
          let done = false
          const wsRef = this.workspaces.get(request.params[0] as WorkspaceUuid)
          if (wsRef !== undefined) {
            done = true
            // Just force pipeline close/open
            void wsRef.close(ctx)
          }
          const forceCloseResponse: Response<any> = {
            id: request.id,
            result: done
          }
          await ws.send(ctx, forceCloseResponse, session.binaryMode, session.useCompression)
          return
        }

        if (
          (request.method === 'subscribe' || request.method === 'unsubscribe') &&
          session.getRawAccount().uuid === systemAccountUuid
        ) {
          const subscription: { accounts?: AccountUuid[], workspaces?: WorkspaceUuid[] } = request.params[0]

          const info = await this.handleSubcribe(ctx, session, subscription, request.method === 'subscribe')

          const resp: Response<any> = {
            id: request.id,
            result: request.method === 'subscribe' ? info : true
          }
          await ws.send(ctx, resp, session.binaryMode, session.useCompression)
          return
        }

        session.requests.set(reqId, {
          id: reqId,
          params: request,
          start: st
        })
        if (request.id === -1 && request.method === '#upgrade') {
          ws.close()
          return
        }

        const f = (session as any)[request.method]
        try {
          const params = [...request.params]

          if (ws.isBackpressure()) {
            await ws.backpressure(ctx)
          }

          const workspaces = this.getSessionWorkspaces(session)

          await ctx.with('🧨 process', {}, (callTx) =>
            f.apply(session, [
              this.createOpContext(callTx, userCtx, workspaces, request.id, session, ws, rateLimit),
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
            session.binaryMode,
            session.useCompression
          )
        }
      })
      .finally(() => {
        userCtx.end()
        session.requests.delete(reqId)
      })
  }

  async handleSubcribe (
    ctx: MeasureContext<any>,
    session: Session,
    subscription: { accounts?: AccountUuid[], workspaces?: WorkspaceUuid[] },
    subscribe: boolean
  ): Promise<SubscribedWorkspaceInfo> {
    const result: SubscribedWorkspaceInfo = {}

    if (subscription.accounts !== undefined) {
      for (const a of subscription.accounts) {
        if (subscribe) {
          // Find some session with this account already pressent
          await this.registerAccountByUuid(a, session)
        } else {
          session.subscribedUsers.delete(a)
          this.unregisterAccount(a, session)
        }
      }
    }

    if (subscription.workspaces !== undefined) {
      for (const ws of subscription.workspaces) {
        let workspace = this.workspaces.get(ws)
        let open: Promise<void> | undefined
        if (workspace === undefined && !subscribe) {
          // No workspace and no need unsubscribe
          continue
        }
        if (workspace === undefined) {
          // Retrieve info about workspace and make it up.
          // Edpoint itself will update last visit.
          const rawToken = generateToken(systemAccountUuid, ws, { service: 'server', mode: 'server' })
          const workspaceInfo = await this.getWorkspaceInfo(rawToken, false)
          if (workspaceInfo === undefined) {
            // No workspace, no need to subscribe
            continue
          }
          ;({ workspace, open } = this.getWorkspace(ctx, ws, this.toLoginInfoWorkspace(workspaceInfo)))

          if (workspace === undefined) {
            continue
          }
          if (open !== undefined) {
            await open
          }
        }
        await workspace.with(async (pipeline, communicationApi) => {
          result[ws] = {
            lastHash: pipeline.context.lastHash,
            lastTx: pipeline.context.lastTx
          }
        })
        // We had workspace
        if (!subscribe) {
          session.workspaces.delete(ws)
          await workspace.removeSession(session)
        } else {
          session.workspaces.add(ws)
          await workspace.addSession(session)
        }
      }
    }
    return result
  }

  private getSessionWorkspaces (session: Session): Workspace[] {
    let workspaces = Array.from(session.workspaces)
      .map((it) => this.workspaces.get(it))
      .filter((it) => it !== undefined) as Workspace[]

    if (session.getRawAccount().uuid !== systemAccountUuid) {
      // Filter all workspaces that are not in maintenance mode
      workspaces = workspaces.filter((it) => !it.maintenance)
    }
    return workspaces
  }

  handleRPC (
    requestCtx: MeasureContext,
    workspaceId: WorkspaceUuid,
    service: Session,
    ws: ConnectionSocket,
    operation: (ctx: ClientSessionCtx, rateLimit: RateLimitInfo | undefined) => Promise<void>
  ): Promise<RateLimitInfo | undefined> {
    const rateLimitStatus = this.limitter.checkRateLimit(service.getUser())
    // If remaining is 0, rate limit is exceeded
    if (rateLimitStatus?.remaining === 0) {
      return Promise.resolve(rateLimitStatus)
    }

    const userCtx = requestCtx.newChild('📞 client', {})

    // Calculate total number of clients
    const reqId = generateId()

    const st = Date.now()
    return userCtx
      .with('🧭 handleRPC', {}, async (ctx) => {
        const workspaces = this.getSessionWorkspaces(service).filter((it) => it.wsId.uuid === workspaceId)

        service.requests.set(reqId, {
          id: reqId,
          params: {},
          start: st
        })

        try {
          // TODO: Select workspaces
          const uctx = this.createOpContext(ctx, userCtx, workspaces, reqId, service, ws, rateLimitStatus)
          await operation(uctx, rateLimitStatus)
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
      })
      .finally(() => {
        userCtx.end()
        service.requests.delete(reqId)
      })
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
      clientsTotal: new Set(Array.from(ws.sessions.values()).map((it) => it.getUser())).size,
      sessionsTotal: ws.sessions.size,
      workspaceName: ws.wsId.url,
      wsId: ws.wsId.uuid,
      sessions: Array.from(ws.sessions.values()).map((it) => this.entryToUserStats(it, it.socket))
    }
  }

  getStatistics (): WorkspaceStatistics[] {
    return Array.from(this.workspaces.values()).map((it) => this.workspaceToWorkspaceStats(it))
  }

  private async handleHello (
    request: Request<any>,
    session: Session,
    ctx: MeasureContext<any>,
    ws: ConnectionSocket,
    requestCtx: MeasureContext<any>
  ): Promise<void> {
    try {
      const hello = request as HelloRequest
      session.binaryMode = hello.binary ?? false
      session.useCompression = this.enableCompression ? hello.compression ?? false : false

      if (LOGGING_ENABLED) {
        ctx.info('hello happen', {
          userId: session.getUser(),
          user: session.getSocialIds().find((it) => it.type !== SocialIdType.HULY)?.value,
          binary: session.binaryMode,
          compression: session.useCompression,
          timeToHello: Date.now() - session.createTime,
          totalUsers: this.sessions.size
        })
      }
      const reconnect = this.reconnectIds.delete(session.sessionId)

      const account = session.getRawAccount()

      const workspaces = this.getSessionWorkspaces(session)

      const helloResponse: HelloResponse = {
        id: -1,
        result: 'hello',
        binary: session.binaryMode,
        reconnect,
        serverVersion: this.serverVersion,
        ...getLastHashInfo(workspaces),
        account,
        useCompression: session.useCompression
      }
      await ws.send(requestCtx, helloResponse, false, false)

      // TODO: Status passwing should not depend on pipeline.
      if (account.uuid !== guestAccount && account.uuid !== systemAccountUuid) {
        // We do not need to wait for set-status, just return session to client
        await ctx.with('set-status', {}, (ctx) => this.trySetStatus(ctx, workspaces, session, true))
      }
    } catch (err: any) {
      ctx.error('error', { err })
    }
  }
}

function createAccountFromInfo (info: LoginInfoWithWorkspaces, targetWs?: WorkspaceUuid): Account {
  let primarySocialId: PersonId
  let role: AccountRole = AccountRole.User
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

  const account: Account = {
    uuid: info.account,
    socialIds: info.socialIds.map((it) => it._id),
    primarySocialId,
    fullSocialIds: new Map(info.socialIds.map((it) => [it._id, it])),
    socialIdsByValue: new Map(info.socialIds.map((it) => [it.value, it])),
    targetWorkspace: targetWs ?? info.personalWorkspace,
    personalWorkspace: info.personalWorkspace,
    role,
    workspaces: {}
  }

  for (const [uuid, wsInfo] of Object.entries(info.workspaces)) {
    account.workspaces[uuid as WorkspaceUuid] = {
      url: wsInfo.url,
      name: wsInfo.name,
      role: wsInfo.role ?? AccountRole.User,
      maintenance: false,
      enabled: uuid === targetWs || targetWs === ''
    }
  }
  return account
}

export function createSessionManager (
  ctx: MeasureContext,
  region: string, // A endpoint region, will be used to perform combined find requests.
  endpointName: string | '#endpoint', // If '#endpoint' special name is used, then will be endpoint only transactor, will not hold local workspaces.
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
  queue: PlatformQueue,
  pipelineFactory: PipelineFactory,
  endpointFactory: EndpointConnectionFactory,
  communicationApiFactory: CommunicationApiFactory,
  handleTick: boolean = true
): SessionManager {
  return new TSessionManager(
    ctx,
    timeouts,
    brandingMap ?? null,
    profiling,
    accountsUrl,
    enableCompression,
    queue,
    pipelineFactory,
    endpointFactory,
    communicationApiFactory,
    region,
    endpointName,
    handleTick
  )
}

export interface SessionManagerOptions extends Partial<Timeouts> {
  pipelineFactory: PipelineFactory
  endpointFactory: EndpointConnectionFactory
  communicationApiFactory: CommunicationApiFactory
  brandingMap: BrandingMap
  enableCompression?: boolean
  accountsUrl: string
  profiling?: {
    start: () => void
    stop: () => Promise<string | undefined>
  }
  queue: PlatformQueue

  region: string
  endpointName: string
}

/**
 * @public
 */
export function startSessionManager (ctx: MeasureContext, opt: SessionManagerOptions): SessionManager {
  const sessions = createSessionManager(
    ctx,
    opt.region,
    opt.endpointName,
    opt.brandingMap,
    {
      pingTimeout: opt.pingTimeout ?? 10000,
      reconnectTimeout: 30 // seconds to reconnect
    },
    opt.profiling,
    opt.accountsUrl,
    opt.enableCompression ?? false,
    opt.queue,
    opt.pipelineFactory,
    opt.endpointFactory,
    opt.communicationApiFactory
  )
  return sessions
}
