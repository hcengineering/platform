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

import core, {
  TxFactory,
  WorkspaceEvent,
  generateId,
  toWorkspaceString,
  type MeasureContext,
  type Ref,
  type Space,
  type Tx,
  type TxWorkspaceEvent,
  type WorkspaceId
} from '@hcengineering/core'
import { unknownError } from '@hcengineering/platform'
import { readRequest, type HelloRequest, type HelloResponse, type Request, type Response } from '@hcengineering/rpc'
import type { Pipeline, SessionContext } from '@hcengineering/server-core'
import { type Token } from '@hcengineering/server-token'

import {
  LOGGING_ENABLED,
  type BroadcastCall,
  type ConnectionSocket,
  type PipelineFactory,
  type ServerFactory,
  type Session,
  type SessionManager,
  type Workspace
} from './types'

interface WorkspaceLoginInfo {
  workspaceName?: string // A company name
  workspace: string
}

function timeoutPromise (time: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, time)
  })
}

/**
 * @public
 */
export interface Timeouts {
  // Timeout preferences
  pingTimeout: number // Default 1 second
  shutdownWarmTimeout: number // Default 1 minute
  reconnectTimeout: number // Default 3 seconds
}

class TSessionManager implements SessionManager {
  readonly workspaces = new Map<string, Workspace>()
  checkInterval: any

  sessions = new Map<string, { session: Session, socket: ConnectionSocket }>()
  reconnectIds = new Set<string>()

  maintenanceTimer: any
  timeMinutes = 0

  constructor (
    readonly ctx: MeasureContext,
    readonly sessionFactory: (token: Token, pipeline: Pipeline, broadcast: BroadcastCall) => Session,
    readonly timeouts: Timeouts
  ) {
    this.checkInterval = setInterval(() => {
      this.handleInterval()
    }, timeouts.pingTimeout)
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

  handleInterval (): void {
    for (const h of this.workspaces.entries()) {
      for (const s of h[1].sessions) {
        if (this.ticks % (5 * 60) === 0) {
          s[1].session.mins5.find = s[1].session.current.find
          s[1].session.mins5.tx = s[1].session.current.tx

          s[1].session.current = { find: 0, tx: 0 }
        }
        const now = Date.now()
        const diff = now - s[1].session.lastRequest
        if (diff > 60000) {
          console.log('session hang, closing...', h[0], s[1].session.getUser())
          void this.close(s[1].socket, h[1].workspaceId, 1001, 'CLIENT_HANGOUT')
          continue
        }
        if (diff > 20000 && this.ticks % 10 === 0) {
          void s[1].socket.send(
            h[1].context,
            { result: 'ping' },
            s[1].session.binaryResponseMode,
            s[1].session.useCompression
          )
        }

        for (const r of s[1].session.requests.values()) {
          if (now - r.start > 30000) {
            console.log(h[0], 'request hang found, 30sec', h[0], s[1].session.getUser(), r.params)
          }
        }
      }
    }
    this.ticks++
  }

  createSession (token: Token, pipeline: Pipeline): Session {
    return this.sessionFactory(token, pipeline, this.broadcast.bind(this))
  }

  async getWorkspaceInfo (
    accounts: string,
    token: string
  ): Promise<{
      workspace: string
      workspaceUrl?: string | null
      workspaceName?: string
    }> {
    const userInfo = await (
      await fetch(accounts, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          method: 'getWorkspaceInfo',
          params: [true]
        })
      })
    ).json()

    return userInfo.result as WorkspaceLoginInfo
  }

  async addSession (
    baseCtx: MeasureContext,
    ws: ConnectionSocket,
    token: Token,
    rawToken: string,
    pipelineFactory: PipelineFactory,
    productId: string,
    sessionId: string | undefined,
    accountsUrl: string
  ): Promise<
    { session: Session, context: MeasureContext, workspaceName: string } | { upgrade: true } | { error: any }
    > {
    return await baseCtx.with('📲 add-session', {}, async (ctx) => {
      const wsString = toWorkspaceString(token.workspace, '@')

      let workspaceInfo =
        accountsUrl !== '' ? await this.getWorkspaceInfo(accountsUrl, rawToken) : this.wsFromToken(token)
      if (workspaceInfo === undefined && token.extra?.admin !== 'true') {
        // No access to workspace for token.
        return { error: new Error(`No access to workspace for token ${token.email} ${token.workspace.name}`) }
      } else {
        workspaceInfo = this.wsFromToken(token)
      }

      let workspace = this.workspaces.get(wsString)
      await workspace?.closing
      workspace = this.workspaces.get(wsString)
      if (sessionId !== undefined && workspace?.sessions?.has(sessionId) === true) {
        const helloResponse: HelloResponse = {
          id: -1,
          result: 'hello',
          binary: false,
          reconnect: false,
          alreadyConnected: true
        }
        await ws.send(ctx, helloResponse, false, false)
        return { error: new Error('Session already exists') }
      }
      const workspaceName = workspaceInfo.workspaceName ?? workspaceInfo.workspaceUrl ?? workspaceInfo.workspace

      if (workspace === undefined) {
        workspace = this.createWorkspace(
          baseCtx,
          pipelineFactory,
          token,
          workspaceInfo.workspaceUrl ?? workspaceInfo.workspace,
          workspaceName
        )
      }

      let pipeline: Pipeline
      if (token.extra?.model === 'upgrade') {
        if (workspace.upgrade) {
          pipeline = await ctx.with('💤 wait ' + workspaceName, {}, async () => await (workspace as Workspace).pipeline)
        } else {
          pipeline = await this.createUpgradeSession(
            token,
            sessionId,
            ctx,
            wsString,
            workspace,
            pipelineFactory,
            ws,
            workspaceInfo.workspaceUrl ?? workspaceInfo.workspace,
            workspaceName
          )
        }
      } else {
        if (workspace.upgrade) {
          return { upgrade: true }
        }
        pipeline = await ctx.with('💤 wait ' + workspaceName, {}, async () => await (workspace as Workspace).pipeline)
      }

      const session = this.createSession(token, pipeline)

      session.sessionId = sessionId !== undefined && (sessionId ?? '').trim().length > 0 ? sessionId : generateId()
      session.sessionInstanceId = generateId()
      this.sessions.set(ws.id, { session, socket: ws })
      // We need to delete previous session with Id if found.
      workspace.sessions.set(session.sessionId, { session, socket: ws })
      await ctx.with('set-status', {}, () => this.setStatus(ctx, session, true))

      if (this.timeMinutes > 0) {
        void ws.send(
          ctx,
          { result: this.createMaintenanceWarning() },
          session.binaryResponseMode,
          session.useCompression
        )
      }
      return { session, context: workspace.context, workspaceName }
    })
  }

  private wsFromToken (token: Token): {
    workspace: string
    workspaceUrl?: string | null
    workspaceName?: string
  } {
    return {
      workspace: token.workspace.name,
      workspaceUrl: token.workspace.name,
      workspaceName: token.workspace.name
    }
  }

  private async createUpgradeSession (
    token: Token,
    sessionId: string | undefined,
    ctx: MeasureContext,
    wsString: string,
    workspace: Workspace,
    pipelineFactory: PipelineFactory,
    ws: ConnectionSocket,
    workspaceUrl: string,
    workspaceName: string
  ): Promise<Pipeline> {
    if (LOGGING_ENABLED) {
      console.log(workspaceName, 'reloading workspace', JSON.stringify(token))
    }
    // If upgrade client is used.
    // Drop all existing clients
    await this.closeAll(wsString, workspace, 0, 'upgrade')
    // Wipe workspace and update values.
    workspace.workspaceName = workspaceName
    if (!workspace.upgrade) {
      // This is previous workspace, intended to be closed.
      workspace.id = generateId()
      workspace.sessions = new Map()
      workspace.upgrade = token.extra?.model === 'upgrade'
    }
    // Re-create pipeline.
    workspace.pipeline = pipelineFactory(
      ctx,
      { ...token.workspace, workspaceUrl, workspaceName },
      true,
      (tx, targets) => {
        this.broadcastAll(workspace, tx, targets)
      }
    )
    return await workspace.pipeline
  }

  broadcastAll (workspace: Workspace, tx: Tx[], targets?: string[]): void {
    if (workspace.upgrade) {
      return
    }
    const ctx = this.ctx.newChild('📬 broadcast-all', {})
    const sessions = [...workspace.sessions.values()]
    function send (): void {
      for (const session of sessions.splice(0, 1)) {
        if (targets !== undefined && !targets.includes(session.session.getUser())) continue
        for (const _tx of tx) {
          void session.socket.send(
            ctx,
            { result: _tx },
            session.session.binaryResponseMode,
            session.session.useCompression
          )
        }
      }
      if (sessions.length > 0) {
        setImmediate(send)
      } else {
        ctx.end()
      }
    }
    send()
  }

  private createWorkspace (
    ctx: MeasureContext,
    pipelineFactory: PipelineFactory,
    token: Token,
    workspaceUrl: string,
    workspaceName: string
  ): Workspace {
    const upgrade = token.extra?.model === 'upgrade'
    const context = ctx.newChild('🧲 session', {})
    const workspace: Workspace = {
      context,
      id: generateId(),
      pipeline: pipelineFactory(
        context,
        { ...token.workspace, workspaceUrl, workspaceName },
        upgrade,
        (tx, targets) => {
          this.broadcastAll(workspace, tx, targets)
        }
      ),
      sessions: new Map(),
      upgrade,
      workspaceId: token.workspace,
      workspaceName
    }
    if (LOGGING_ENABLED) console.time(workspaceName)
    if (LOGGING_ENABLED) console.timeLog(workspaceName, 'Creating Workspace:', workspace.id)
    this.workspaces.set(toWorkspaceString(token.workspace), workspace)
    return workspace
  }

  private async setStatus (ctx: MeasureContext, session: Session, online: boolean): Promise<void> {
    try {
      const user = (
        await session.pipeline().modelDb.findAll(
          core.class.Account,
          {
            email: session.getUser()
          },
          { limit: 1 }
        )
      )[0]
      if (user === undefined) return
      const status = (await session.findAll(ctx, core.class.UserStatus, { user: user._id }, { limit: 1 }))[0]
      const txFactory = new TxFactory(user._id, true)
      if (status === undefined) {
        const tx = txFactory.createTxCreateDoc(core.class.UserStatus, user._id as string as Ref<Space>, {
          online,
          user: user._id
        })
        await session.tx(ctx, tx)
      } else if (status.online !== online) {
        const tx = txFactory.createTxUpdateDoc(status._class, status.space, status._id, {
          online
        })
        await session.tx(ctx, tx)
      }
    } catch {}
  }

  async close (ws: ConnectionSocket, workspaceId: WorkspaceId, code: number, reason: string): Promise<void> {
    // if (LOGGING_ENABLED) console.log(workspaceId.name, `closing websocket, code: ${code}, reason: ${reason}`)
    const wsid = toWorkspaceString(workspaceId)
    const workspace = this.workspaces.get(wsid)
    if (workspace === undefined) {
      if (LOGGING_ENABLED) console.error(new Error('internal: cannot find sessions'))
      return
    }
    const sessionRef = this.sessions.get(ws.id)
    if (sessionRef !== undefined) {
      this.sessions.delete(ws.id)
      workspace.sessions.delete(sessionRef.session.sessionId)
      this.reconnectIds.add(sessionRef.session.sessionId)

      setTimeout(() => {
        this.reconnectIds.delete(sessionRef.session.sessionId)
      }, this.timeouts.reconnectTimeout)
      try {
        sessionRef.socket.close()
      } catch (err) {
        // Ignore if closed
      }
      const user = sessionRef.session.getUser()
      const another = Array.from(workspace.sessions.values()).findIndex((p) => p.session.getUser() === user)
      if (another === -1) {
        await this.setStatus(workspace.context, sessionRef.session, false)
      }
      if (!workspace.upgrade) {
        // Wait some time for new client to appear before closing workspace.
        if (workspace.sessions.size === 0) {
          setTimeout(() => {
            void this.performWorkspaceCloseCheck(workspace, workspaceId, wsid)
          }, this.timeouts.shutdownWarmTimeout)
        }
      } else {
        await this.performWorkspaceCloseCheck(workspace, workspaceId, wsid)
      }
    }
  }

  async closeAll (wsId: string, workspace: Workspace, code: number, reason: 'upgrade' | 'shutdown'): Promise<void> {
    if (LOGGING_ENABLED) console.timeLog(wsId, `closing workspace ${workspace.id}, code: ${code}, reason: ${reason}`)

    const sessions = Array.from(workspace.sessions)
    workspace.sessions = new Map()

    const closeS = async (s: Session, webSocket: ConnectionSocket): Promise<void> => {
      s.workspaceClosed = true
      if (reason === 'upgrade') {
        // Override message handler, to wait for upgrading response from clients.
        await this.sendUpgrade(workspace.context, webSocket, s.binaryResponseMode)
      }
      webSocket.close()
      await this.setStatus(workspace.context, s, false)
    }

    if (LOGGING_ENABLED) console.timeLog(wsId, workspace.id, 'Clients disconnected. Closing Workspace...')
    await Promise.all(sessions.map((s) => closeS(s[1].session, s[1].socket)))

    const closePipeline = async (): Promise<void> => {
      try {
        if (LOGGING_ENABLED) console.timeLog(wsId, 'closing pipeline')
        await (await workspace.pipeline).close()
        if (LOGGING_ENABLED) console.timeLog(wsId, 'closing pipeline done')
      } catch (err: any) {
        console.error(err)
      }
    }
    await Promise.race([closePipeline(), timeoutPromise(15000)])
    if (LOGGING_ENABLED) console.timeLog(wsId, 'Workspace closed...')
    console.timeEnd(wsId)
  }

  private async sendUpgrade (ctx: MeasureContext, webSocket: ConnectionSocket, binary: boolean): Promise<void> {
    await webSocket.send(
      ctx,
      {
        result: {
          _class: core.class.TxModelUpgrade
        }
      },
      binary,
      false
    )
  }

  async closeWorkspaces (ctx: MeasureContext): Promise<void> {
    if (this.checkInterval !== undefined) {
      clearInterval(this.checkInterval)
    }
    for (const w of this.workspaces) {
      await this.closeAll(w[0], w[1], 1, 'shutdown')
    }
  }

  private async performWorkspaceCloseCheck (
    workspace: Workspace,
    workspaceId: WorkspaceId,
    wsid: string
  ): Promise<void> {
    if (workspace.sessions.size === 0) {
      const wsUID = workspace.id
      if (LOGGING_ENABLED) {
        console.log(workspaceId.name, 'no sessions for workspace', wsid, wsUID)
      }

      const waitAndClose = async (workspace: Workspace): Promise<void> => {
        try {
          const pl = await workspace.pipeline
          await Promise.race([pl, timeoutPromise(60000)])
          await Promise.race([pl.close(), timeoutPromise(60000)])

          if (this.workspaces.get(wsid)?.id === wsUID) {
            this.workspaces.delete(wsid)
          }
          workspace.context.end()
          if (LOGGING_ENABLED) {
            console.timeLog(workspaceId.name, 'Closed workspace', wsUID)
          }
        } catch (err: any) {
          this.workspaces.delete(wsid)
          if (LOGGING_ENABLED) {
            console.error(workspaceId.name, err)
          }
        }
      }
      workspace.closing = waitAndClose(workspace)
      await workspace.closing
    }
  }

  broadcast (from: Session | null, workspaceId: WorkspaceId, resp: Response<any>, target?: string[]): void {
    const workspace = this.workspaces.get(toWorkspaceString(workspaceId))
    if (workspace === undefined) {
      console.error(new Error('internal: cannot find sessions'))
      return
    }
    if (workspace?.upgrade ?? false) {
      return
    }
    if (LOGGING_ENABLED) console.log(workspaceId.name, `server broadcasting to ${workspace.sessions.size} clients...`)

    const sessions = [...workspace.sessions.values()]
    const ctx = this.ctx.newChild('📭 broadcast', {})
    function send (): void {
      for (const sessionRef of sessions.splice(0, 1)) {
        if (sessionRef.session.sessionId !== from?.sessionId) {
          if (target === undefined) {
            void sessionRef.socket.send(
              ctx,
              resp,
              sessionRef.session.binaryResponseMode,
              sessionRef.session.useCompression
            )
          } else if (target.includes(sessionRef.session.getUser())) {
            void sessionRef.socket.send(
              ctx,
              resp,
              sessionRef.session.binaryResponseMode,
              sessionRef.session.useCompression
            )
          }
        }
      }
      if (sessions.length > 0) {
        setImmediate(send)
      } else {
        ctx.end()
      }
    }
    send()
  }

  async handleRequest<S extends Session>(
    requestCtx: MeasureContext,
    service: S,
    ws: ConnectionSocket,
    msg: any,
    workspace: string
  ): Promise<void> {
    const userCtx = requestCtx.newChild('📞 client', {
      workspace: '🧲 ' + workspace
    }) as SessionContext
    userCtx.sessionId = service.sessionInstanceId ?? ''

    // Calculate total number of clients
    const reqId = generateId()

    const st = Date.now()
    try {
      await userCtx.with('🧭 handleRequest', {}, async (ctx) => {
        const request = await ctx.with('📥 read', {}, async () => readRequest(msg, false))
        if (request.id === -1 && request.method === 'hello') {
          const hello = request as HelloRequest
          service.binaryResponseMode = hello.binary ?? false
          service.useCompression = hello.compression ?? false
          service.useBroadcast = hello.broadcast ?? false

          if (LOGGING_ENABLED) {
            console.timeLog(
              workspace,
              'hello happen',
              service.getUser(),
              'binary:',
              service.binaryResponseMode,
              'compression:',
              service.useCompression,
              'workspace users:',
              this.workspaces.get(workspace)?.sessions?.size,
              'total users:',
              this.sessions.size
            )
          }
          const helloResponse: HelloResponse = {
            id: -1,
            result: 'hello',
            binary: service.binaryResponseMode,
            reconnect: this.reconnectIds.has(service.sessionId)
          }
          await ws.send(ctx, helloResponse, false, false)
          return
        }
        if (request.method === 'measure' || request.method === 'measure-done') {
          await this.handleMeasure<S>(service, request, ctx, ws)
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

          const result =
            service.measureCtx?.ctx !== undefined
              ? await f.apply(service, [service.measureCtx?.ctx, ...params])
              : await ctx.with('🧨 process', {}, async (callTx) => f.apply(service, [callTx, ...params]))

          const resp: Response<any> = { id: request.id, result }

          await handleSend(
            ctx,
            ws,
            resp,
            this.sessions.size < 100 ? 10000 : 1001,
            service.binaryResponseMode,
            service.useCompression
          )
        } catch (err: any) {
          if (LOGGING_ENABLED) console.error(err)
          const resp: Response<any> = {
            id: request.id,
            error: unknownError(err),
            result: JSON.parse(JSON.stringify(err?.stack))
          }
          await ws.send(ctx, resp, service.binaryResponseMode, service.useCompression)
        }
      })
    } finally {
      userCtx.end()
      service.requests.delete(reqId)
    }
  }

  private async handleMeasure<S extends Session>(
    service: S,
    request: Request<any[]>,
    ctx: MeasureContext,
    ws: ConnectionSocket
  ): Promise<void> {
    let serverTime = 0
    if (request.method === 'measure') {
      service.measureCtx = { ctx: ctx.newChild('📶 ' + request.params[0], {}), time: Date.now() }
    } else {
      if (service.measureCtx !== undefined) {
        serverTime = Date.now() - service.measureCtx.time
        service.measureCtx.ctx.end(serverTime)
      }
    }
    try {
      const resp: Response<any> = { id: request.id, result: request.method === 'measure' ? 'started' : serverTime }

      await handleSend(
        ctx,
        ws,
        resp,
        this.sessions.size < 100 ? 10000 : 1001,
        service.binaryResponseMode,
        service.useCompression
      )
    } catch (err: any) {
      if (LOGGING_ENABLED) console.error(err)
      const resp: Response<any> = {
        id: request.id,
        error: unknownError(err),
        result: JSON.parse(JSON.stringify(err?.stack))
      }
      await ws.send(ctx, resp, service.binaryResponseMode, service.useCompression)
    }
  }
}

async function handleSend (
  ctx: MeasureContext,
  ws: ConnectionSocket,
  msg: Response<any>,
  chunkLimit: number,
  useBinary: boolean,
  useCompression: boolean
): Promise<void> {
  // ws.send(msg)
  if (Array.isArray(msg.result) && chunkLimit > 0 && msg.result.length > chunkLimit) {
    // Split and send by chunks
    const data = [...msg.result]

    let cid = 1
    while (data.length > 0) {
      const chunk = data.splice(0, chunkLimit)
      if (chunk !== undefined) {
        await ws.send(
          ctx,
          { ...msg, result: chunk, chunk: { index: cid, final: data.length === 0 } },
          useBinary,
          useCompression
        )
      }
      cid++
    }
  } else {
    await ws.send(ctx, msg, useBinary, useCompression)
  }
}

/**
 * @public
 */
export function start (
  ctx: MeasureContext,
  opt: {
    port: number
    pipelineFactory: PipelineFactory
    sessionFactory: (token: Token, pipeline: Pipeline, broadcast: BroadcastCall) => Session
    productId: string
    serverFactory: ServerFactory
    enableCompression?: boolean
    accountsUrl: string
  } & Partial<Timeouts>
): () => Promise<void> {
  const sessions = new TSessionManager(ctx, opt.sessionFactory, {
    pingTimeout: opt.pingTimeout ?? 1000,
    shutdownWarmTimeout: opt.shutdownWarmTimeout ?? 60 * 1000,
    reconnectTimeout: 3000
  })
  return opt.serverFactory(
    sessions,
    (rctx, service, ws, msg, workspace) => sessions.handleRequest(rctx, service, ws, msg, workspace),
    ctx,
    opt.pipelineFactory,
    opt.port,
    opt.productId,
    opt.enableCompression ?? true,
    opt.accountsUrl
  )
}
