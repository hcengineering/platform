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
  generateId,
  MeasureContext,
  Ref,
  Space,
  toWorkspaceString,
  Tx,
  TxFactory,
  WorkspaceId
} from '@hcengineering/core'
import { readRequest, Response, serialize, UNAUTHORIZED, unknownError } from '@hcengineering/platform'
import type { Pipeline, SessionContext } from '@hcengineering/server-core'
import { decodeToken, Token } from '@hcengineering/server-token'
import { createServer, IncomingMessage } from 'http'
import WebSocket, { RawData, WebSocketServer } from 'ws'
import { BroadcastCall, PipelineFactory, Session } from './types'

let LOGGING_ENABLED = true

export function disableLogging (): void {
  LOGGING_ENABLED = false
}

function timeoutPromise (time: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, time)
  })
}

interface Workspace {
  id: string
  pipeline: Promise<Pipeline>
  sessions: [Session, WebSocket][]
  upgrade: boolean
  closing?: Promise<void>
}

class SessionManager {
  private readonly workspaces = new Map<string, Workspace>()

  constructor (readonly sessionFactory: (token: Token, pipeline: Pipeline, broadcast: BroadcastCall) => Session) {}

  createSession (token: Token, pipeline: Pipeline): Session {
    return this.sessionFactory(token, pipeline, this.broadcast.bind(this))
  }

  upgradeId: string | undefined

  async addSession (
    ctx: MeasureContext,
    ws: WebSocket,
    token: Token,
    pipelineFactory: PipelineFactory,
    productId: string,
    sessionId?: string
  ): Promise<Session> {
    const wsString = toWorkspaceString(token.workspace, '@')

    let workspace = this.workspaces.get(wsString)
    await workspace?.closing
    workspace = this.workspaces.get(wsString)

    if (workspace === undefined) {
      workspace = this.createWorkspace(ctx, pipelineFactory, token)
    }

    if (token.extra?.model === 'upgrade') {
      if (LOGGING_ENABLED) console.log('reloading workspace', JSON.stringify(token))
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
      if (LOGGING_ENABLED) console.log('no sessions for workspace', wsString)
      // Re-create pipeline.
      workspace.pipeline = pipelineFactory(ctx, token.workspace, true, (tx) =>
        this.broadcastAll(workspace as Workspace, tx)
      )

      const pipeline = await workspace.pipeline
      const session = this.createSession(token, pipeline)
      workspace.sessions.push([session, ws])
      return session
    }

    if (workspace.upgrade && sessionId !== this.upgradeId) {
      ws.close()
      throw new Error('Upgrade in progress....')
    }

    const pipeline = await workspace.pipeline

    if (sessionId !== undefined) {
      // try restore session
      const existingSession = workspace.sessions.find((it) => it[0].sessionId === sessionId)
      if (existingSession !== undefined) {
        if (LOGGING_ENABLED) {
          console.log(
            'found existing session',
            token.email,
            existingSession[0].sessionId,
            existingSession[0].sessionInstanceId
          )
        }
        // Update websocket
        clearTimeout(existingSession[0].closeTimeout)
        existingSession[0].closeTimeout = undefined
        existingSession[1] = ws
        return existingSession[0]
      }
    }

    const session = this.createSession(token, pipeline)
    session.sessionId = sessionId
    session.sessionInstanceId = generateId()
    workspace.sessions.push([session, ws])
    await this.setStatus(ctx, session, true)
    return session
  }

  broadcastAll (workspace: Workspace, tx: Tx[]): void {
    for (const _tx of tx) {
      const msg = serialize({ result: _tx })
      for (const session of workspace.sessions) {
        session[1].send(msg)
      }
    }
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
    ws: WebSocket,
    workspaceId: WorkspaceId,
    code: number,
    reason: string
  ): Promise<void> {
    if (LOGGING_ENABLED) console.log(`closing websocket, code: ${code}, reason: ${reason}`)
    const wsid = toWorkspaceString(workspaceId)
    const workspace = this.workspaces.get(wsid)
    if (workspace === undefined) {
      if (LOGGING_ENABLED) console.error(new Error('internal: cannot find sessions'))
      return
    }
    const index = workspace.sessions.findIndex((p) => p[1] === ws)
    if (index !== -1) {
      const session = workspace.sessions[index]
      workspace.sessions.splice(index, 1)
      session[1].close()
      const user = session[0].getUser()
      const another = workspace.sessions.findIndex((p) => p[0].getUser() === user)
      if (another === -1) {
        await this.setStatus(ctx, session[0], false)
      }
      if (workspace.sessions.length === 0) {
        const wsUID = workspace.id
        if (LOGGING_ENABLED) console.log('no sessions for workspace', wsid, wsUID)

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
            if (LOGGING_ENABLED) console.error(err)
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

    const closeS = async (s: Session, webSocket: WebSocket): Promise<void> => {
      clearTimeout(s.closeTimeout)
      s.workspaceClosed = true
      if (reason === 'upgrade') {
        // await for message to go to client.
        await new Promise((resolve) => {
          // Override message handler, to wait for upgrading response from clients.
          webSocket.on('close', () => {
            resolve(null)
          })
          webSocket.send(
            serialize({
              result: {
                _class: core.class.TxModelUpgrade
              }
            })
          )
          setTimeout(resolve, 1000)
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
    if (LOGGING_ENABLED) console.log(`server broadcasting to ${workspace.sessions.length} clients...`)
    const msg = serialize(resp)
    for (const session of workspace.sessions) {
      if (session[0] !== from) {
        if (target === undefined) {
          session[1].send(msg)
        } else if (target.includes(session[0].getUser())) {
          session[1].send(msg)
        }
      }
    }
  }
}

async function handleRequest<S extends Session> (
  ctx: MeasureContext,
  service: S,
  ws: WebSocket,
  msg: string,
  workspace: string
): Promise<void> {
  const request = readRequest(msg)
  if (request.id === -1 && request.method === 'hello') {
    if (LOGGING_ENABLED) console.timeLog(workspace, 'hello happen', service.getUser())
    ws.send(serialize({ id: -1, result: 'hello' }))
    return
  }
  if (request.id === -1 && request.method === '#upgrade') {
    ws.close(0, 'upgrade')
    return
  }
  const userCtx = ctx.newChild(service.getUser(), { userId: service.getUser() }) as SessionContext
  userCtx.sessionId = service.sessionInstanceId ?? ''
  const f = (service as any)[request.method]
  let timeout: any
  let hangTimeout: any
  try {
    const params = [userCtx, ...request.params]

    const st = Date.now()
    timeout = setTimeout(() => {
      if (LOGGING_ENABLED) console.timeLog(workspace, 'long request found', service.getUser(), request, params)
    }, 4000)

    hangTimeout = setTimeout(() => {
      if (LOGGING_ENABLED) {
        console.timeLog(workspace, 'request hang found, 30sec', workspace, service.getUser(), request, params)
      }
    }, 30000)

    let result = await f.apply(service, params)
    clearTimeout(timeout)
    clearTimeout(hangTimeout)
    const resp: Response<any> = { id: request.id, result }

    const diff = Date.now() - st
    if (diff > 5000 && LOGGING_ENABLED) {
      console.timeLog(
        timeout,
        'very long request found',
        workspace,
        service.getUser(),
        request,
        params,
        Array.isArray(result) ? result.length : '0',
        diff
      )
    }
    const toSend = serialize(resp)
    // Clear for gc to make work
    resp.result = undefined
    result = undefined
    ws.send(toSend)
  } catch (err: any) {
    if (LOGGING_ENABLED) console.error(err)
    clearTimeout(timeout)
    clearTimeout(hangTimeout)
    const resp: Response<any> = {
      id: request.id,
      error: unknownError(err)
    }
    ws.send(serialize(resp))
  }
}

/**
 * @public
 * @param sessionFactory -
 * @param port -
 * @param host -
 */
export function start (
  ctx: MeasureContext,
  pipelineFactory: PipelineFactory,
  sessionFactory: (token: Token, pipeline: Pipeline, broadcast: BroadcastCall) => Session,
  port: number,
  productId: string,
  host?: string
): () => Promise<void> {
  if (LOGGING_ENABLED) console.log(`starting server on port ${port} ...`)

  const sessions = new SessionManager(sessionFactory)

  const wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: {
      zlibDeflateOptions: {
        // See zlib defaults.
        chunkSize: 10 * 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      }
    }
  })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  wss.on('connection', async (ws: WebSocket, request: any, token: Token, sessionId?: string) => {
    let buffer: string[] | undefined = []

    ws.on('message', (msg: string) => {
      buffer?.push(msg)
    })
    const session = await sessions.addSession(ctx, ws, token, pipelineFactory, productId, sessionId)
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    ws.on('message', (msg: RawData) => {
      let msgStr = ''
      if (typeof msg === 'string') {
        msgStr = msg
      } else if (msg instanceof Buffer) {
        msgStr = msg.toString()
      } else if (Array.isArray(msg)) {
        msgStr = Buffer.concat(msg).toString()
      }
      void handleRequest(ctx, session, ws, msgStr, token.workspace.name)
    })
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    ws.on('close', (code: number, reason: Buffer) => {
      if (session.workspaceClosed ?? false) {
        return
      }
      // remove session after 1seconds, give a time to reconnect.
      if (code === 1000) {
        if (LOGGING_ENABLED) console.log(`client "${token.email}" closed normally`)
        void sessions.close(ctx, ws, token.workspace, code, reason.toString())
      } else {
        if (LOGGING_ENABLED) {
          console.log(`client "${token.email}" closed abnormally, waiting reconnect`, code, reason.toString())
        }
        session.closeTimeout = setTimeout(() => {
          if (LOGGING_ENABLED) console.log(`client "${token.email}" force closed`)
          void sessions.close(ctx, ws, token.workspace, code, reason.toString())
        }, 10000)
      }
    })
    const b = buffer
    buffer = undefined
    for (const msg of b) {
      await handleRequest(ctx, session, ws, msg, token.workspace.name)
    }
  })

  const server = createServer()
  server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    const url = new URL('http://localhost' + (request.url ?? ''))
    const token = url.pathname.substring(1)

    try {
      const payload = decodeToken(token ?? '')
      const sessionId = url.searchParams.get('sessionId')
      if (LOGGING_ENABLED) console.log('client connected with payload', payload, sessionId)

      if (payload.workspace.productId !== productId) {
        throw new Error('Invalid workspace product')
      }

      wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request, payload, sessionId))
    } catch (err) {
      if (LOGGING_ENABLED) console.error('invalid token', err)
      wss.handleUpgrade(request, socket, head, (ws) => {
        const resp: Response<any> = {
          id: -1,
          error: UNAUTHORIZED,
          result: 'hello'
        }
        ws.send(serialize(resp))
        ws.onmessage = (msg) => {
          const resp: Response<any> = {
            error: UNAUTHORIZED
          }
          ws.send(serialize(resp))
        }
      })
    }
  })

  server.listen(port, host)
  return async () => {
    server.close()
    await sessions.closeWorkspaces(ctx)
  }
}
