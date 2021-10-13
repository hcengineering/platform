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

import { readRequest, serialize, Response } from '@anticrm/platform'
import type { Token } from '@anticrm/server-core'
import { createServer, IncomingMessage } from 'http'
import WebSocket, { Server } from 'ws'
import { decode } from 'jwt-simple'

import type { Doc, Ref, Class, FindOptions, FindResult, Tx, DocumentQuery, Storage, ServerStorage, TxResult } from '@anticrm/core'

let LOGGING_ENABLED = true

export function disableLogging (): void { LOGGING_ENABLED = false }

class Session implements Storage {
  constructor (
    private readonly manager: SessionManager,
    private readonly token: Token,
    private readonly storage: ServerStorage
  ) {}

  async ping (): Promise<string> { console.log('ping'); return 'pong!' }

  async findAll <T extends Doc>(_class: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T>): Promise<FindResult<T>> {
    return await this.storage.findAll(_class, query, options)
  }

  async tx (tx: Tx): Promise<TxResult> {
    const [result, derived] = await this.storage.tx(tx)
    this.manager.broadcast(this, this.token, { result: tx })
    for (const tx of derived) {
      this.manager.broadcast(null, this.token, { result: tx })
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
      const storage = await storageFactory(token.workspace)
      const session = new Session(this, token, storage)
      const workspace: Workspace = {
        storage,
        sessions: [[session, ws]]
      }
      this.workspaces.set(token.workspace, workspace)
      return session
    } else {
      const session = new Session(this, token, workspace.storage)
      workspace.sessions.push([session, ws])
      return session
    }
  }

  close (ws: WebSocket, token: Token, code: number, reason: string): void {
    if (LOGGING_ENABLED) console.log(`closing websocket, code: ${code}, reason: ${reason}`)
    const workspace = this.workspaces.get(token.workspace)
    if (workspace === undefined) {
      throw new Error('internal: cannot find sessions')
    }
    workspace.sessions = workspace.sessions.filter(session => session[1] !== ws)
    if (workspace.sessions.length === 0) {
      if (LOGGING_ENABLED) console.log('no sessions for workspace', token.workspace)
      this.workspaces.delete(token.workspace)
    }
  }

  broadcast (from: Session | null, token: Token, resp: Response<any>): void {
    const workspace = this.workspaces.get(token.workspace)
    if (workspace === undefined) {
      throw new Error('internal: cannot find sessions')
    }
    if (LOGGING_ENABLED) console.log(`server broadcasting to ${workspace.sessions.length} clients...`)
    const msg = serialize(resp)
    for (const session of workspace.sessions) {
      if (session[0] !== from) { session[1].send(msg) }
    }
  }
}

async function handleRequest<S> (service: S, ws: WebSocket, msg: string): Promise<void> {
  const request = readRequest(msg)
  const f = (service as any)[request.method]
  const result = await f.apply(service, request.params)
  const resp = { id: request.id, result }
  ws.send(serialize(resp))
}

/**
 * @public
 * @param sessionFactory -
 * @param port -
 * @param host -
 */
export function start (storageFactory: (workspace: string) => Promise<ServerStorage>, port: number, host?: string): void {
  console.log(`starting server on port ${port} ...`)

  const sessions = new SessionManager()

  const wss = new Server({ noServer: true })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  wss.on('connection', async (ws: WebSocket, request: any, token: Token) => {
    const buffer: string[] = []

    ws.on('message', (msg: string) => { buffer.push(msg) })
    const session = await sessions.addSession(ws, token, storageFactory)
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    ws.on('message', async (msg: string) => await handleRequest(session, ws, msg))
    ws.on('close', (code: number, reason: string) => sessions.close(ws, token, code, reason))

    for (const msg of buffer) {
      await handleRequest(session, ws, msg)
    }
  })

  const server = createServer()
  server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    const token = request.url?.substring(1) // remove leading '/'
    try {
      const payload = decode(token ?? '', 'secret', false)
      console.log('client connected with payload', payload)
      wss.handleUpgrade(request, socket, head, ws => wss.emit('connection', ws, request, payload))
    } catch (err) {
      console.log('unauthorized client')
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
    }
  })

  server.listen(port, host)
}
