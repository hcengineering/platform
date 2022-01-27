//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { Class, Doc, DocumentQuery, FindOptions, FindResult, MeasureContext, Ref, ServerStorage, Tx, TxResult } from '@anticrm/core'
import { readRequest, Response, serialize, unknownError } from '@anticrm/platform'
import { decodeToken, Token } from '@anticrm/server-token'
import { createServer, IncomingMessage } from 'http'
import WebSocket, { Server } from 'ws'

let LOGGING_ENABLED = true

export function disableLogging (): void { LOGGING_ENABLED = false }

class Session {
  constructor (
    private readonly manager: SessionManager,
    private readonly token: Token,
    private readonly storage: ServerStorage
  ) {}

  async ping (): Promise<string> { console.log('ping'); return 'pong!' }

  async findAll <T extends Doc>(ctx: MeasureContext, _class: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T>): Promise<FindResult<T>> {
    return await this.storage.findAll(ctx, _class, query, options)
  }

  async tx (ctx: MeasureContext, tx: Tx): Promise<TxResult> {
    const [result, derived] = await this.storage.tx(ctx, tx)

    this.manager.broadcast(this, this.token, { result: tx })
    for (const dtx of derived) {
      this.manager.broadcast(null, this.token, { result: dtx })
    }
    return result
  }
}

interface Workspace {
  storage: ServerStorage
  sessions: [Session, WebSocket][]
}

class SessionManager {
  private readonly workspaces = new Map<string, Workspace>()

  async addSession (ws: WebSocket, token: Token, storageFactory: (ws: string) => Promise<ServerStorage>): Promise<Session> {
    const workspace = this.workspaces.get(token.workspace)
    if (workspace === undefined) {
      return await this.createWorkspace(storageFactory, token, ws)
    } else {
      if (token.extra?.model === 'reload') {
        console.log('reloading workspace', JSON.stringify(token))
        // If upgrade client is used.
        // Drop all existing clients
        if (workspace.sessions.length > 0) {
          for (const s of workspace.sessions) {
            this.close(s[1], token.workspace, 0, 'upgrade')
          }
        }
        return await this.createWorkspace(storageFactory, token, ws)
      }

      const session = new Session(this, token, workspace.storage)
      workspace.sessions.push([session, ws])
      return session
    }
  }

  private async createWorkspace (storageFactory: (ws: string) => Promise<ServerStorage>, token: Token, ws: WebSocket): Promise<Session> {
    const storage = await storageFactory(token.workspace)
    const session = new Session(this, token, storage)
    const workspace: Workspace = {
      storage,
      sessions: [[session, ws]]
    }
    this.workspaces.set(token.workspace, workspace)
    return session
  }

  close (ws: WebSocket, workspaceId: string, code: number, reason: string): void {
    if (LOGGING_ENABLED) console.log(`closing websocket, code: ${code}, reason: ${reason}`)
    const workspace = this.workspaces.get(workspaceId)
    if (workspace === undefined) {
      console.error(new Error('internal: cannot find sessions'))
      return
    }
    workspace.sessions = workspace.sessions.filter(session => session[1] !== ws)
    if (workspace.sessions.length === 0) {
      if (LOGGING_ENABLED) console.log('no sessions for workspace', workspaceId)
      this.workspaces.delete(workspaceId)
      workspace.storage.close().catch(err => console.error(err))
    }
  }

  broadcast (from: Session | null, token: Token, resp: Response<any>): void {
    const workspace = this.workspaces.get(token.workspace)
    if (workspace === undefined) {
      console.error(new Error('internal: cannot find sessions'))
      return
    }
    if (LOGGING_ENABLED) console.log(`server broadcasting to ${workspace.sessions.length} clients...`)
    const msg = serialize(resp)
    for (const session of workspace.sessions) {
      if (session[0] !== from) { session[1].send(msg) }
    }
  }
}

async function handleRequest<S extends Session> (ctx: MeasureContext, service: S, ws: WebSocket, msg: string): Promise<void> {
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
export function start (ctx: MeasureContext, storageFactory: (workspace: string) => Promise<ServerStorage>, port: number, host?: string): () => void {
  console.log(`starting server on port ${port} ...`)

  const sessions = new SessionManager()

  const wss = new Server({ noServer: true })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  wss.on('connection', async (ws: WebSocket, request: any, token: Token) => {
    const buffer: string[] = []

    ws.on('message', (msg: string) => { buffer.push(msg) })
    const session = await sessions.addSession(ws, token, storageFactory)
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    ws.on('message', async (msg: string) => await handleRequest(ctx, session, ws, msg))
    ws.on('close', (code: number, reason: string) => sessions.close(ws, token.workspace, code, reason))

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
      wss.handleUpgrade(request, socket, head, ws => wss.emit('connection', ws, request, payload))
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
