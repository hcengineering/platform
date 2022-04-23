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
  Class,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  MeasureContext,
  ModelDb,
  Ref,
  Space,
  Tx, TxFactory,
  TxResult
} from '@anticrm/core'
import { readRequest, Response, serialize, unknownError } from '@anticrm/platform'
import type { Pipeline, SessionContext } from '@anticrm/server-core'
import { decodeToken, Token } from '@anticrm/server-token'
import { createServer, IncomingMessage } from 'http'
import WebSocket, { Server } from 'ws'

let LOGGING_ENABLED = true

export function disableLogging (): void {
  LOGGING_ENABLED = false
}

class Session {
  readonly modelDb: ModelDb

  constructor (
    private readonly manager: SessionManager,
    private readonly token: Token,
    private readonly pipeline: Pipeline
  ) {
    this.modelDb = pipeline.modelDb
  }

  getUser (): string {
    return this.token.email
  }

  async ping (): Promise<string> {
    console.log('ping')
    return 'pong!'
  }

  async findAll<T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const context = ctx as SessionContext
    context.userEmail = this.token.email
    return await this.pipeline.findAll(context, _class, query, options)
  }

  async tx (ctx: MeasureContext, tx: Tx): Promise<TxResult> {
    const context = ctx as SessionContext
    context.userEmail = this.token.email
    const [result, derived, target] = await this.pipeline.tx(context, tx)

    this.manager.broadcast(this, this.token.workspace, { result: tx }, target)
    for (const dtx of derived) {
      this.manager.broadcast(null, this.token.workspace, { result: dtx }, target)
    }
    return result
  }
}

interface Workspace {
  pipeline: Pipeline
  sessions: [Session, WebSocket][]
}

class SessionManager {
  private readonly workspaces = new Map<string, Workspace>()

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
      if (token.extra?.model === 'reload') {
        console.log('reloading workspace', JSON.stringify(token))
        // If upgrade client is used.
        // Drop all existing clients
        if (workspace.sessions.length > 0) {
          for (const s of workspace.sessions) {
            await this.close(ctx, s[1], token.workspace, 0, 'upgrade')
          }
        }
        return await this.createWorkspace(ctx, pipelineFactory, token, ws)
      }

      const session = new Session(this, token, workspace.pipeline)
      workspace.sessions.push([session, ws])
      await this.setStatus(ctx, session, true)
      return session
    }
  }

  private async setStatus (ctx: MeasureContext, session: Session, online: boolean): Promise<void> {
    try {
      const user = (
        await session.modelDb.findAll(
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
    } catch {
    }
  }

  private async createWorkspace (
    ctx: MeasureContext,
    pipelineFactory: (ws: string) => Promise<Pipeline>,
    token: Token,
    ws: WebSocket
  ): Promise<Session> {
    const pipeline = await pipelineFactory(token.workspace)
    const session = new Session(this, token, pipeline)
    const workspace: Workspace = {
      pipeline,
      sessions: [[session, ws]]
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
      const user = session[0].getUser()
      const another = workspace.sessions.findIndex((p) => p[0].getUser() === user)
      if (another === -1) {
        await this.setStatus(ctx, session[0], false)
      }
      if (workspace.sessions.length === 0) {
        if (LOGGING_ENABLED) console.log('no sessions for workspace', workspaceId)
        this.workspaces.delete(workspaceId)
        workspace.pipeline.close().catch((err) => console.error(err))
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
  port: number,
  host?: string
): () => void {
  console.log(`starting server on port ${port} ...`)

  const sessions = new SessionManager()

  const wss = new Server({ noServer: true })
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
      console.log('unauthorized client')
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
    }
  })

  server.listen(port, host)
  return () => {
    server.close()
  }
}
