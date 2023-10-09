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
import { UNAUTHORIZED } from '@hcengineering/platform'
import { Response, serialize } from '@hcengineering/rpc'
import { Token, decodeToken } from '@hcengineering/server-token'
import compression from 'compression'
import cors from 'cors'
import express from 'express'
import http, { IncomingMessage } from 'http'
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
  productId: string,
  enableCompression: boolean
): () => Promise<void> {
  if (LOGGING_ENABLED) console.log(`starting server on port ${port} ...`)

  const app = express()
  app.use(cors())
  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression'] != null) {
          // don't compress responses with this request header
          return false
        }

        // fallback to standard filter function
        return compression.filter(req, res)
      },
      level: 6
    })
  )

  const getUsers = (): any => Array.from(sessions.sessions.entries()).map(([k, v]) => v.session.getUser())

  app.get('/api/v1/version', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        version: process.env.MODEL_VERSION
      })
    )
  })

  app.get('/api/v1/statistics', (req, res) => {
    try {
      const token = req.query.token as string
      const payload = decodeToken(token)
      const admin = payload.extra?.admin === 'true'
      res.writeHead(200, { 'Content-Type': 'application/json' })
      const json = JSON.stringify({
        ...getStatistics(ctx, sessions, admin),
        users: getUsers,
        admin
      })
      res.end(json)
    } catch (err) {
      console.error(err)
      res.writeHead(404, {})
      res.end()
    }
  })
  app.put('/api/v1/manage', (req, res) => {
    try {
      const token = req.query.token as string
      const payload = decodeToken(token)
      if (payload.extra?.admin !== 'true') {
        res.writeHead(404, {})
        res.end()
        return
      }

      const operation = req.query.operation

      switch (operation) {
        case 'maintenance': {
          const timeMinutes = parseInt((req.query.timeout as string) ?? '5')
          sessions.scheduleMaintenance(timeMinutes)

          res.writeHead(200)
          res.end()
          break
        }
        case 'reboot': {
          process.exit(0)
        }
      }

      res.writeHead(404, {})
      res.end()
    } catch (err) {
      console.error(err)
      res.writeHead(404, {})
      res.end()
    }
  })

  const httpServer = http.createServer(app)

  const wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: enableCompression
      ? {
          zlibDeflateOptions: {
            // See zlib defaults.
            chunkSize: 16 * 1024,
            level: 6
          },
          zlibInflateOptions: {
            chunkSize: 16 * 1024,
            level: 6
          },
          threshold: 1024, // Size (in bytes) below which messages, should not be compressed if context takeover is disabled.
          concurrencyLimit: 100
        }
      : false,
    skipUTF8Validation: true
  })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  wss.on('connection', async (ws: WebSocket, request: any, token: Token, sessionId?: string) => {
    let buffer: Buffer[] | undefined = []

    const cs: ConnectionSocket = {
      id: generateId(),
      close: () => ws.close(),
      send: async (ctx: MeasureContext, msg, binary, compression) => {
        if (ws.readyState !== ws.OPEN) {
          return
        }
        const smsg = await ctx.with('serialize', {}, async () => serialize(msg, binary))

        ctx.measure('send-data', smsg.length)

        return await ctx.with(
          'socket-send',
          {},
          async (ctx) =>
            await new Promise((resolve, reject) => {
              ws.send(smsg, { binary, compress: compression }, (err) => {
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

    ws.on('message', (msg: Buffer) => {
      buffer?.push(msg)
    })
    const session = await sessions.addSession(ctx, cs, token, pipelineFactory, productId, sessionId)
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    ws.on('message', (msg: RawData) => {
      let buff: any | undefined
      if (msg instanceof Buffer) {
        buff = msg?.toString()
      } else if (Array.isArray(msg)) {
        buff = Buffer.concat(msg).toString()
      }
      if (buff !== undefined) {
        void handleRequest(ctx, session, cs, buff, token.workspace.name)
      }
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

  httpServer.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
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
        ws.send(serialize(resp, false), { binary: false })
        ws.onmessage = (msg) => {
          const resp: Response<any> = {
            error: UNAUTHORIZED
          }
          ws.send(serialize(resp, false), { binary: false })
        }
      })
    }
  })
  httpServer.on('error', (err) => {
    if (LOGGING_ENABLED) console.error('server error', err)
  })

  httpServer.listen(port)
  return async () => {
    httpServer.close()
    await sessions.closeWorkspaces(ctx)
  }
}
