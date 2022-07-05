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

import core, { MeasureContext, Ref, Space, TxFactory } from '@anticrm/core'
import { readRequest, Response, serialize, UNAUTHORIZED, unknownError } from '@anticrm/platform'
import type { Pipeline } from '@anticrm/server-core'
import { decodeToken, Token } from '@anticrm/server-token'
import { createServer, IncomingMessage } from 'http'
import WebSocket, { Server } from 'ws'
import { BroadcastCall, Session } from './types'

let LOGGING_ENABLED = true

export function disableLogging (): void {
  LOGGING_ENABLED = false
}

interface Workspace {
  pipeline: Pipeline
  sessions: [Session, WebSocket][]
  upgrade: boolean
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
    pipelineFactory: (ws: string) => Promise<Pipeline>
  ): Promise<Session> {
    const workspace = this.workspaces.get(token.workspace)
    if (workspace === undefined) {
      return await this.createWorkspace(ctx, pipelineFactory, token, ws)
    } else {
      if (token.extra?.model === 'upgrade') {
        console.log('reloading workspace', JSON.stringify(token))
        // If upgrade client is used.
        // Drop all existing clients
        if (workspace.sessions.length > 0) {
          for (const s of workspace.sessions) {
            s[1].send(
              serialize({
                result: {
                  _class: core.class.TxModelUpgrade
                }
              })
            )
            await this.close(ctx, s[1], token.workspace, 0, 'upgrade')
          }
        }
        return await this.createWorkspace(ctx, pipelineFactory, token, ws)
      }

      if (workspace.upgrade) {
        ws.close()
        throw new Error('Upgrade in progress....')
      }

      const session = this.createSession(token, workspace.pipeline)
      workspace.sessions.push([session, ws])
      await this.setStatus(ctx, session, true)
      return session
    }
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

  private async createWorkspace (
    ctx: MeasureContext,
    pipelineFactory: (ws: string) => Promise<Pipeline>,
    token: Token,
    ws: WebSocket
  ): Promise<Session> {
    const pipeline = await pipelineFactory(token.workspace)
    const session = this.createSession(token, pipeline)
    const workspace: Workspace = {
      pipeline,
      sessions: [[session, ws]],
      upgrade: token.extra?.model === 'upgrade'
    }
    this.workspaces.set(token.workspace, workspace)
    await this.setStatus(ctx, session, true)
    return session
  }

  async close (ctx: MeasureContext, ws: WebSocket, workspaceId: string, code: number, reason: string): Promise<void> {
    if (LOGGING_ENABLED) console.log(`closing websocket, code: ${code}, reason: ${reason}`)
    const workspace = this.workspaces.get(workspaceId)
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
        if (LOGGING_ENABLED) console.log('no sessions for workspace', workspaceId)
        this.workspaces.delete(workspaceId)
        await workspace.pipeline.close().catch((err) => console.error(err))
      }
    }
  }

  broadcast (from: Session | null, workspaceId: string, resp: Response<any>, target?: string): void {
    const workspace = this.workspaces.get(workspaceId)
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
    return
  }
  const f = (service as any)[request.method]
  try {
    const params = [ctx, ...request.params]
    const result = await f.apply(service, params)
    const resp: Response<any> = { id: request.id, result }
    ws.send(serialize(resp))
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
  pipelineFactory: (workspace: string) => Promise<Pipeline>,
  sessionFactory: (token: Token, pipeline: Pipeline, broadcast: BroadcastCall) => Session,
  port: number,
  host?: string
): () => void {
  console.log(`starting server on port ${port} ...`)

  const sessions = new SessionManager(sessionFactory)

  const wss = new Server({
    noServer: true,
    perMessageDeflate: {
      zlibDeflateOptions: {
        // See zlib defaults.
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      // Below options specified as default values.
      concurrencyLimit: 10, // Limits zlib concurrency for perf.
      threshold: 1024 // Size (in bytes) below which messages
      // should not be compressed if context takeover is disabled.
    }
  })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  wss.on('connection', async (ws: WebSocket, request: any, token: Token) => {
    const buffer: string[] = []

    ws.on('message', (msg: string) => {
      buffer.push(msg)
    })
    const session = await sessions.addSession(ctx, ws, token, pipelineFactory)
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    ws.on('message', async (msg: string) => await handleRequest(ctx, session, ws, msg))
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    ws.on('close', async (code: number, reason: string) => await sessions.close(ctx, ws, token.workspace, code, reason))

    for (const msg of buffer) {
      await handleRequest(ctx, session, ws, msg)
    }
  })

  const server = createServer()
  server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    const token = request.url?.substring(1) // remove leading '/'
    try {
      const payload = decodeToken(token ?? '')
      console.log('client connected with payload', payload)
      wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request, payload))
    } catch (err) {
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
  return () => {
    server.close()
  }
}
