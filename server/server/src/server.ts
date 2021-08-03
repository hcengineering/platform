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

import { readRequest, serialize } from '@anticrm/platform'
import { createServer, IncomingMessage } from 'http'
import WebSocket, { Server } from 'ws'
import { decode } from 'jwt-simple'

/**
 * @internal
 */
export interface _Token {
  workspace: string
}

async function handleRequest<S> (service: S, ws: WebSocket, msg: string): Promise<void> {
  const request = readRequest(msg)
  const f = (service as any)[request.method]
  const result = await f.apply(null, request.params)
  ws.send(serialize({
    id: request.id,
    result
  }))
}

/**
 * @public
 * @param serviceFactory
 * @param port
 * @param host
 */
export function start<S> (serviceFactory: () => Promise<S>, port: number, host?: string): void {
  // console.log('starting server on port ' + port + '...')
  // console.log('host: ' + host)

  const connections: S[] = []

  const wss = new Server({ noServer: true })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  wss.on('connection', async (ws: WebSocket, request: any, token: _Token) => {
    const service = await serviceFactory()
    connections.push(service)
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    ws.on('message', async (msg: string) => await handleRequest(service, ws, msg))
  })

  const server = createServer()
  server.on('upgrade', (request: IncomingMessage, socket, head: Buffer) => {
    const token = request.url?.substring(1) // remove leading '/'
    if (token === undefined) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
    } else {
      const payload = decode(token, 'secret', false)
      wss.handleUpgrade(request, socket, head, ws => wss.emit('connection', ws, request, payload))
    }
  })

  server.listen(port, host)
}
