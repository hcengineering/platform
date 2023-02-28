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
import type { Pipeline } from '@hcengineering/server-core'
import { decodeToken, Token } from '@hcengineering/server-token'
import { createServer, IncomingMessage } from 'http'
import WebSocket, { WebSocketServer } from 'ws'
import { BroadcastCall, PipelineFactory, Session } from './types'

let LOGGING_ENABLED = true

export function disableLogging (): void {
  LOGGING_ENABLED = false
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
      workspace = this.createWorkspace(pipelineFactory, token)
    }

    if (token.extra?.model === 'upgrade') {
      console.log('reloading workspace', JSON.stringify(token))
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
      workspace.pipeline = pipelineFactory(token.workspace, true, (tx) => this.broadcastAll(workspace as Workspace, tx))

      const pipeline = await workspace.pipeline
      const session = this.createSession(token, pipeline)
      workspace.sessions.push([session, ws])
      return session
    }

    if (workspace.upgrade) {
      ws.close()
      throw new Error('Upgrade in progress....')
    }

    const pipeline = await workspace.pipeline

    if (sessionId !== undefined) {
      // try restore session
      const existingSession = workspace.sessions.find((it) => it[0].sessionId === sessionId)
      if (existingSession !== undefined) {
        if (LOGGING_ENABLED) console.log('found existing session', existingSession)
        // Update websocket
        clearTimeout(existingSession[0].closeTimeout)
        existingSession[0].closeTimeout = undefined
        existingSession[1] = ws
        return existingSession[0]
      }
    }

    const session = this.createSession(token, pipeline)
    session.sessionId = sessionId
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

  private createWorkspace (pipelineFactory: PipelineFactory, token: Token): Workspace {
    const upgrade = token.extra?.model === 'upgrade'
    const workspace: Workspace = {
      id: generateId(),
      pipeline: pipelineFactory(token.workspace, upgrade, (tx) => this.broadcastAll(workspace, tx)),
      sessions: [],
      upgrade
    }
    console.log('Creating Workspace:', workspace.id)
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
      const status = (await session.findAll(ctx, core.class.UserStatus, { modifiedBy: user._id }, { limit: 1 }))[0]
      const txFactory = new TxFactory(user._id)
      if (status === undefined) {
        const tx = txFactory.createTxCreateDoc(core.class.UserStatus, user._id as string as Ref<Space>, {
          online
        })
        tx.space = core.space.DerivedTx
        await session.tx(ctx, tx)
      } else if (status.online !== online) {
        const tx = txFactory.createTxUpdateDoc(status._class, status.space, status._id, {
          online
        })
        tx.space = core.space.DerivedTx
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
      console.error(new Error('internal: cannot find sessions'))
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
        const workspaceId = workspace.id
        if (LOGGING_ENABLED) console.log('no sessions for workspace', wsid, workspaceId)

        async function waitAndClose (workspace: Workspace): Promise<void> {
          const pipeline = await workspace.pipeline
          await pipeline.close()
        }
        workspace.closing = waitAndClose(workspace).then(() => {
          if (this.workspaces.get(wsid)?.id === workspaceId) {
            this.workspaces.delete(wsid)
          }
          console.log('Closed workspace', workspaceId)
        })
        workspace.closing.catch((err) => {
          this.workspaces.delete(wsid)
          console.error(err)
        })
        await workspace.closing
      }
    }
  }

  async closeAll (ctx: MeasureContext, wsId: string, workspace: Workspace, code: number, reason: string): Promise<void> {
    console.log(`closing workspace ${wsId} - ${workspace.id}, code: ${code}, reason: ${reason}`)

    const sessions = Array.from(workspace.sessions)
    workspace.sessions = []

    const closeS = async (s: Session, webSocket: WebSocket): Promise<void> => {
      clearTimeout(s.closeTimeout)
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
      webSocket.close()
      await this.setStatus(ctx, s, false)
    }

    console.log(workspace.id, 'Clients disconnected. Closing Workspace...')
    await Promise.all(sessions.map((s) => closeS(s[0], s[1])))

    const closePipeline = async (): Promise<void> => {
      try {
        await (await workspace.pipeline).close()
      } catch (err: any) {
        console.error(err)
      }
    }
    await Promise.race([
      closePipeline(),
      new Promise((resolve) => {
        setTimeout(resolve, 15000)
      })
    ])
    console.log(workspace.id, 'Workspace closed...')
  }

  async closeWorkspaces (ctx: MeasureContext): Promise<void> {
    for (const w of this.workspaces) {
      await this.closeAll(ctx, w[0], w[1], 1, 'shutdown')
    }
  }

  broadcast (from: Session | null, workspaceId: WorkspaceId, resp: Response<any>, target?: string): void {
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
        } else if (session[0].getUser() === target) {
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
  msg: string
): Promise<void> {
  const request = readRequest(msg)
  if (request.id === -1 && request.method === 'hello') {
    ws.send(serialize({ id: -1, result: 'hello' }))

    // Push result buffer messages to client.
    for (const r of service.resultBuffer ?? []) {
      ws.send(serialize(r))
    }
    service.resultBuffer = []
    return
  }
  if (request.id === -1 && request.method === '#upgrade') {
    ws.close(0, 'upgrade')
    return
  }
  const f = (service as any)[request.method]
  try {
    const params = [ctx, ...request.params]
    const result = await f.apply(service, params)
    const resp: Response<any> = { id: request.id, result }
    ws.send(serialize(resp), (err) => {
      if (err !== undefined) {
        // It seems we failed to send to client.
        service.resultBuffer = [...(service.resultBuffer ?? []), resp]
      }
    })
  } catch (err: any) {
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
  console.log(`starting server on port ${port} ...`)

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
    ws.on('message', async (msg: string) => await handleRequest(ctx, session, ws, msg))
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    ws.on('close', (code: number, reason: string) => {
      // remove session after 1seconds, give a time to reconnect.
      session.closeTimeout = setTimeout(() => {
        void sessions.close(ctx, ws, token.workspace, code, reason)
      }, 1000)
    })
    const b = buffer
    buffer = undefined
    for (const msg of b) {
      await handleRequest(ctx, session, ws, msg)
    }
  })

  const server = createServer()
  server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    const url = new URL('http://localhost' + (request.url ?? ''))
    const token = url.pathname.substring(1)

    try {
      const payload = decodeToken(token ?? '')
      console.log('client connected with payload', payload)
      const sessionId = url.searchParams.get('sessionId')

      if (payload.workspace.productId !== productId) {
        throw new Error('Invalid workspace product')
      }

      wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request, payload, sessionId))
    } catch (err) {
      console.error('invalid token', err)
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
