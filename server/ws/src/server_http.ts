//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { MeasureContext, generateId } from '@hcengineering/core'
import { Response, UNAUTHORIZED, serialize } from '@hcengineering/platform'
import { Token, decodeToken } from '@hcengineering/server-token'
import { IncomingMessage, ServerResponse, createServer } from 'http'
import { RawData, WebSocket, WebSocketServer } from 'ws'
import { getStatistics } from './stats'
import { ConnectionSocket, HandleRequestFunction, LOGGING_ENABLED, PipelineFactory, SessionManager } from './types'
/**
 * @public
 * @param sessionFactory -
 * @param port -
 * @param host -
 */
export function startHttpServer (
  sessions: SessionManager,
  handleRequest: HandleRequestFunction,
  ctx: MeasureContext,
  pipelineFactory: PipelineFactory,
  port: number,
  productId: string
): () => Promise<void> {
  if (LOGGING_ENABLED) console.log(`starting server on port ${port} ...`)

  const wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: {
      zlibDeflateOptions: {
        // See zlib defaults.
        chunkSize: 16 * 1024,
        level: 6
      },
      zlibInflateOptions: {
        chunkSize: 16 * 1024,
        level: 6
      },
      threshold: 1024 // Size (in bytes) below which messages, should not be compressed if context takeover is disabled.
    },
    skipUTF8Validation: true
  })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  wss.on('connection', async (ws: WebSocket, request: any, token: Token, sessionId?: string) => {
    let buffer: string[] | undefined = []

    const cs: ConnectionSocket = {
      id: generateId(),
      close: () => ws.close(),
      send: async (ctx: MeasureContext, msg) => {
        if (ws.readyState !== ws.OPEN) {
          return
        }
        const smsg = await ctx.with('serialize', {}, async () => serialize(msg))

        ctx.measure('send-data', smsg.length)

        return await ctx.with(
          'socket-send',
          {},
          async (ctx) =>
            await new Promise((resolve, reject) => {
              ws.send(smsg, (err) => {
                if (err != null) {
                  reject(err)
                } else {
                  resolve()
                }
              })
            })
        )
      }
    }

    ws.on('message', (msg: string) => {
      buffer?.push(msg)
    })
    const session = await sessions.addSession(ctx, cs, token, pipelineFactory, productId, sessionId)
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
      void handleRequest(ctx, session, cs, msgStr, token.workspace.name)
    })
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    ws.on('close', (code: number, reason: Buffer) => {
      if (session.workspaceClosed ?? false) {
        return
      }
      // remove session after 1seconds, give a time to reconnect.
      // if (LOGGING_ENABLED) console.log(token.workspace.name, `client "${token.email}" closed ${code === 1000 ? 'normally' : 'abnormally'}`)
      void sessions.close(ctx, cs, token.workspace, code, reason.toString())
    })
    const b = buffer
    buffer = undefined
    for (const msg of b) {
      await handleRequest(ctx, session, cs, msg, token.workspace.name)
    }
  })

  const server = createServer()

  server.on('request', (request: IncomingMessage, response: ServerResponse) => {
    const url = new URL('http://localhost' + (request.url ?? ''))

    const token = url.pathname.substring(1)
    try {
      const payload = decodeToken(token ?? '')
      console.log(payload.workspace, 'statistics request')

      response.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      })
      const json = JSON.stringify(getStatistics(ctx, sessions))
      response.end(json)
    } catch (err) {
      response.writeHead(404, {})
      response.end()
    }
  })

  server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    const url = new URL('http://localhost' + (request.url ?? ''))
    const token = url.pathname.substring(1)

    try {
      const payload = decodeToken(token ?? '')
      const sessionId = url.searchParams.get('sessionId')
      // if (LOGGING_ENABLED) console.log(payload.workspace.name, 'client connected with payload', payload, sessionId)

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
  server.on('error', () => {
    if (LOGGING_ENABLED) console.error('server error')
  })

  server.listen(port)
  return async () => {
    server.close()
    await sessions.closeWorkspaces(ctx)
  }
}
