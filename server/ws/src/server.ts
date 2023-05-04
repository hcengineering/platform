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
  MeasureContext,
  Ref,
  Space,
  Tx,
  TxFactory,
  WorkspaceId,
  generateId,
  toWorkspaceString
} from '@hcengineering/core'
import { Response, readRequest, unknownError } from '@hcengineering/platform'
import type { Pipeline, SessionContext } from '@hcengineering/server-core'
import { Token } from '@hcengineering/server-token'
// import WebSocket, { RawData } from 'ws'

import {
  BroadcastCall,
  ConnectionSocket,
  LOGGING_ENABLED,
  PipelineFactory,
  ServerFactory,
  Session,
  SessionManager
} from './types'

function timeoutPromise (time: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, time)
  })
}

interface Workspace {
  id: string
  pipeline: Promise<Pipeline>
  sessions: [Session, ConnectionSocket][]
  upgrade: boolean
  closing?: Promise<void>
}

class TSessionManager implements SessionManager {
  readonly workspaces = new Map<string, Workspace>()
  checkInterval: any

  constructor (
    readonly ctx: MeasureContext,
    readonly sessionFactory: (token: Token, pipeline: Pipeline, broadcast: BroadcastCall) => Session
  ) {
    this.checkInterval = setInterval(() => this.handleInterval(), 1000)
  }

  handleInterval (): void {
    for (const h of this.workspaces.entries()) {
      for (const s of h[1].sessions) {
        for (const r of s[0].requests.values()) {
          const ed = Date.now()

          if (ed - r.start > 30000) {
            console.log(h[0], 'request hang found, 30sec', h[0], s[0].getUser(), r.params)
          }
        }
      }
    }
  }

  createSession (token: Token, pipeline: Pipeline): Session {
    return this.sessionFactory(token, pipeline, this.broadcast.bind(this))
  }

  upgradeId: string | undefined

  async addSession (
    ctx: MeasureContext,
    ws: ConnectionSocket,
    token: Token,
    pipelineFactory: PipelineFactory,
    productId: string,
    sessionId?: string
  ): Promise<Session> {
    return await ctx.with('add-session', {}, async (ctx) => {
      const wsString = toWorkspaceString(token.workspace, '@')

      let workspace = this.workspaces.get(wsString)
      await workspace?.closing
      workspace = this.workspaces.get(wsString)

      if (workspace === undefined) {
        workspace = this.createWorkspace(ctx, pipelineFactory, token)
      }

      if (token.extra?.model === 'upgrade') {
        return await this.createUpgradeSession(token, sessionId, ctx, wsString, workspace, pipelineFactory, ws)
      }

      if (workspace.upgrade && sessionId !== this.upgradeId) {
        ws.close()
        throw new Error('Upgrade in progress....')
      }

      const pipeline = await ctx.with('pipeline', {}, async () => await (workspace as Workspace).pipeline)

      const session = this.createSession(token, pipeline)
      session.sessionId = sessionId
      session.sessionInstanceId = generateId()
      workspace.sessions.push([session, ws])
      await ctx.with('set-status', {}, () => this.setStatus(ctx, session, true))
      return session
    })
  }

  private async createUpgradeSession (
    token: Token,
    sessionId: string | undefined,
    ctx: MeasureContext,
    wsString: string,
    workspace: Workspace,
    pipelineFactory: PipelineFactory,
    ws: ConnectionSocket
  ): Promise<Session> {
    if (LOGGING_ENABLED) {
      console.log(token.workspace.name, 'reloading workspace', JSON.stringify(token))
    }
    this.upgradeId = sessionId
    // If upgrade client is used.
    // Drop all existing clients
    await this.closeAll(ctx, wsString, workspace, 0, 'upgrade')
    // Wipe workspace and update values.
    if (!workspace.upgrade) {
      // This is previous workspace, intended to be closed.
      workspace.id = generateId()
      workspace.sessions = []
      workspace.upgrade = token.extra?.model === 'upgrade'
    }
    if (LOGGING_ENABLED) {
      console.log(token.workspace.name, 'no sessions for workspace', wsString)
    }
    // Re-create pipeline.
    workspace.pipeline = pipelineFactory(ctx, token.workspace, true, (tx) => this.broadcastAll(workspace, tx))

    const pipeline = await workspace.pipeline
    const session = this.createSession(token, pipeline)
    workspace.sessions.push([session, ws])
    return session
  }

  broadcastAll (workspace: Workspace, tx: Tx[]): void {
    if (workspace?.upgrade ?? false) {
      return
    }
    const ctx = this.ctx.newChild('broadcast-all', {})
    const sessions = [...workspace.sessions]
    function send (): void {
      for (const session of sessions.splice(0, 1)) {
        for (const _tx of tx) {
          void session[1].send(ctx, { result: _tx })
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

  private createWorkspace (ctx: MeasureContext, pipelineFactory: PipelineFactory, token: Token): Workspace {
    const upgrade = token.extra?.model === 'upgrade'
    const workspace: Workspace = {
      id: generateId(),
      pipeline: pipelineFactory(ctx, token.workspace, upgrade, (tx) => this.broadcastAll(workspace, tx)),
      sessions: [],
      upgrade
    }
    if (LOGGING_ENABLED) console.time(token.workspace.name)
    if (LOGGING_ENABLED) console.timeLog(token.workspace.name, 'Creating Workspace:', workspace.id)
    this.workspaces.set(toWorkspaceString(token.workspace), workspace)
    return workspace
  }

  private async setStatus (ctx: MeasureContext, session: Session, online: boolean): Promise<void> {
    try {
      const user = (
        await session.findAll(
          ctx,
          core.class.Account,
          {
            email: session.getUser()
          },
          { limit: 1 }
        )
      )[0]
      if (user === undefined) return
      const status = (await session.findAll(ctx, core.class.UserStatus, { modifiedBy: user._id }, { limit: 1 }))[0]
      const txFactory = new TxFactory(user._id, true)
      if (status === undefined) {
        const tx = txFactory.createTxCreateDoc(core.class.UserStatus, user._id as string as Ref<Space>, {
          online
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

  async close (
    ctx: MeasureContext,
    ws: ConnectionSocket,
    workspaceId: WorkspaceId,
    code: number,
    reason: string
  ): Promise<void> {
    // if (LOGGING_ENABLED) console.log(workspaceId.name, `closing websocket, code: ${code}, reason: ${reason}`)
    const wsid = toWorkspaceString(workspaceId)
    const workspace = this.workspaces.get(wsid)
    if (workspace === undefined) {
      if (LOGGING_ENABLED) console.error(new Error('internal: cannot find sessions'))
      return
    }
    const index = workspace.sessions.findIndex((p) => p[1].id === ws.id)
    if (index !== -1) {
      const session = workspace.sessions[index]
      workspace.sessions.splice(index, 1)
      try {
        session[1].close()
      } catch (err) {
        // Ignore if closed
      }
      const user = session[0].getUser()
      const another = workspace.sessions.findIndex((p) => p[0].getUser() === user)
      if (another === -1) {
        await this.setStatus(ctx, session[0], false)
      }
      if (workspace.sessions.length === 0) {
        const wsUID = workspace.id
        if (LOGGING_ENABLED) console.log(workspaceId.name, 'no sessions for workspace', wsid, wsUID)

        const waitAndClose = async (workspace: Workspace): Promise<void> => {
          try {
            const pl = await workspace.pipeline
            await Promise.race([pl, timeoutPromise(60000)])
            await Promise.race([pl.close(), timeoutPromise(60000)])

            if (this.workspaces.get(wsid)?.id === wsUID) {
              this.workspaces.delete(wsid)
            }
            if (LOGGING_ENABLED) console.timeLog(workspaceId.name, 'Closed workspace', wsUID)
          } catch (err: any) {
            this.workspaces.delete(wsid)
            if (LOGGING_ENABLED) console.error(workspaceId.name, err)
          }
        }
        workspace.closing = waitAndClose(workspace)
        await workspace.closing
      }
    }
  }

  async closeAll (
    ctx: MeasureContext,
    wsId: string,
    workspace: Workspace,
    code: number,
    reason: 'upgrade' | 'shutdown'
  ): Promise<void> {
    if (LOGGING_ENABLED) console.timeLog(wsId, `closing workspace ${workspace.id}, code: ${code}, reason: ${reason}`)

    const sessions = Array.from(workspace.sessions)
    workspace.sessions = []

    const closeS = async (s: Session, webSocket: ConnectionSocket): Promise<void> => {
      s.workspaceClosed = true
      if (reason === 'upgrade') {
        // Override message handler, to wait for upgrading response from clients.
        await webSocket.send(ctx, {
          result: {
            _class: core.class.TxModelUpgrade
          }
        })
      }
      webSocket.close()
      await this.setStatus(ctx, s, false)
    }

    if (LOGGING_ENABLED) console.timeLog(wsId, workspace.id, 'Clients disconnected. Closing Workspace...')
    await Promise.all(sessions.map((s) => closeS(s[0], s[1])))

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

  async closeWorkspaces (ctx: MeasureContext): Promise<void> {
    for (const w of this.workspaces) {
      await this.closeAll(ctx, w[0], w[1], 1, 'shutdown')
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
    if (LOGGING_ENABLED) console.log(workspaceId.name, `server broadcasting to ${workspace.sessions.length} clients...`)

    const sessions = [...workspace.sessions]
    const ctx = this.ctx.newChild('broadcast', {})
    function send (): void {
      for (const session of sessions.splice(0, 1)) {
        if (session[0] !== from) {
          if (target === undefined) {
            void session[1].send(ctx, resp)
          } else if (target.includes(session[0].getUser())) {
            void session[1].send(ctx, resp)
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
}

async function handleSend (
  ctx: MeasureContext,
  ws: ConnectionSocket,
  msg: Response<any>,
  chunkLimit: number
): Promise<void> {
  // ws.send(msg)
  if (Array.isArray(msg.result) && chunkLimit > 0 && msg.result.length > chunkLimit) {
    // Split and send by chunks
    const data = [...msg.result]

    let cid = 1
    while (data.length > 0) {
      const chunk = data.splice(0, chunkLimit)
      if (chunk !== undefined) {
        await ws.send(ctx, { ...msg, result: chunk, chunk: { index: cid, final: data.length === 0 } })
      }
      cid++
    }
  } else {
    await ws.send(ctx, msg)
  }
}

async function handleRequest<S extends Session> (
  rctx: MeasureContext,
  service: S,
  ws: ConnectionSocket,
  msg: string,
  workspace: string,
  chunkLimit: number
): Promise<void> {
  const userCtx = rctx.newChild('client', { workspace }) as SessionContext
  userCtx.sessionId = service.sessionInstanceId ?? ''

  const reqId = generateId()

  const st = Date.now()
  try {
    await userCtx.with('handleRequest', {}, async (ctx) => {
      const request = await ctx.with('read', {}, async () => readRequest(msg))
      if (request.id === -1 && request.method === 'hello') {
        if (LOGGING_ENABLED) console.timeLog(workspace, 'hello happen', service.getUser())
        await ws.send(ctx, { id: -1, result: 'hello' })
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

        const result = await ctx.with('call', {}, async (callTx) => f.apply(service, [callTx, ...params]))

        const resp: Response<any> = { id: request.id, result }

        await handleSend(ctx, ws, resp, chunkLimit)
      } catch (err: any) {
        if (LOGGING_ENABLED) console.error(err)
        const resp: Response<any> = {
          id: request.id,
          error: unknownError(err)
        }
        await ws.send(ctx, resp)
      }
    })
  } finally {
    userCtx.end()
    service.requests.delete(reqId)
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
    chunking: number // 25
  }
): () => Promise<void> {
  const sessions = new TSessionManager(ctx, opt.sessionFactory)
  return opt.serverFactory(
    sessions,
    (rctx, service, ws, msg, workspace) => handleRequest(rctx, service, ws, msg, workspace, opt.chunking),
    ctx,
    opt.pipelineFactory,
    opt.port,
    opt.productId
  )
}
