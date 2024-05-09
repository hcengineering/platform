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

// uWebSockets.js
// Import should be added: "uWebSockets.js": "github:uNetworking/uWebSockets.js#v20.23.0"

import { generateId, toWorkspaceString, type MeasureContext } from '@hcengineering/core'
import { decodeToken } from '@hcengineering/server-token'

import { Analytics } from '@hcengineering/analytics'
import { serialize } from '@hcengineering/rpc'
import { getStatistics, wipeStatistics } from './stats'
import {
  LOGGING_ENABLED,
  type ConnectionSocket,
  type HandleRequestFunction,
  type PipelineFactory,
  type SessionManager
} from './types'

import { doSessionOp, processRequest, type WebsocketData } from './utils'
import uWebSockets, { DISABLED, SHARED_COMPRESSOR, type HttpResponse, type WebSocket } from '@hcengineering/uws'

interface WebsocketUserData extends WebsocketData {
  backPressure?: Promise<void>
  backPressureResolve?: () => void
  unsendMsg: { data: any, binary: boolean, compression: boolean }[]
}
/**
 * @public
 * @param port -
 * @param host -
 */
export function startUWebsocketServer (
  sessions: SessionManager,
  handleRequest: HandleRequestFunction,
  ctx: MeasureContext,
  pipelineFactory: PipelineFactory,
  port: number,
  productId: string,
  enableCompression: boolean,
  accountsUrl: string
): () => Promise<void> {
  if (LOGGING_ENABLED) console.log(`starting U server on port ${port} ...`)

  const uAPP = uWebSockets.App()

  const writeStatus = (response: HttpResponse, status: string): HttpResponse => {
    return response
      .writeStatus(status)
      .writeHeader('Access-Control-Allow-Origin', '*')
      .writeHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, PUT')
      .writeHeader('Access-Control-Allow-Headers', 'Content-Type')
  }

  uAPP
    .trace('/*', (res, req) => {
      console.log(req.getUrl(), req.getMethod())
    })
    .ws<WebsocketUserData>('/*', {
    /* There are many common helper features */
    // idleTimeout: 32,
    maxBackpressure: 256 * 1024,
    maxPayloadLength: 50 * 1024 * 1024,
    compression: enableCompression ? SHARED_COMPRESSOR : DISABLED,
    idleTimeout: 0,
    maxLifetime: 0,
    sendPingsAutomatically: true,

    upgrade (res, req, context) {
      const url = new URL('http://localhost' + (req.getUrl() ?? ''))
      const token = url.pathname.substring(1)

      try {
        const payload = decodeToken(token ?? '')

        if (payload.workspace.productId !== productId) {
          throw new Error('Invalid workspace product')
        }

        /* You MUST copy data out of req here, as req is only valid within this immediate callback */
        const url = req.getUrl()
        const secWebSocketKey = req.getHeader('sec-websocket-key')
        const secWebSocketProtocol = req.getHeader('sec-websocket-protocol')
        const secWebSocketExtensions = req.getHeader('sec-websocket-extensions')

        /* This immediately calls open handler, you must not use res after this call */
        res.upgrade<WebsocketUserData>(
          {
            payload,
            token,
            session: undefined,
            unsendMsg: [],
            url
          },
          /* Spell these correctly */
          secWebSocketKey,
          secWebSocketProtocol,
          secWebSocketExtensions,
          context
        )
      } catch (err) {
        if (LOGGING_ENABLED) console.error('invalid token', err)
        writeStatus(res, '401 Unauthorized').end()
      }
    },
    open: (ws: WebSocket<WebsocketUserData>) => {
      const data = ws.getUserData()

      const wrData = {
        remoteAddress: ws.getRemoteAddressAsText() ?? '',
        userAgent: '',
        language: '',
        email: data.payload.email,
        mode: data.payload.extra?.mode,
        model: data.payload.extra?.model
      }
      data.connectionSocket = createWebSocketClientSocket(wrData, ws, data)

      data.session = sessions.addSession(
        ctx,
        data.connectionSocket,
        ws.getUserData().payload,
        ws.getUserData().token,
        pipelineFactory,
        productId,
        undefined,
        accountsUrl
      )
    },
    message: (ws, message, isBinary) => {
      const data = ws.getUserData()
      const msg = Buffer.copyBytesFrom(Buffer.from(message))

      doSessionOp(data, (s) => {
        processRequest(
          s.session,
          data.connectionSocket as ConnectionSocket,
          s.context,
          s.workspaceId,
          msg,
          handleRequest
        )
      })
    },
    drain: (ws) => {
      console.log(`WebSocket backpressure: ${ws.getBufferedAmount()}`)
      const data = ws.getUserData()
      while (data.unsendMsg.length > 0) {
        if (ws.send(data.unsendMsg[0].data, data.unsendMsg[0].binary, data.unsendMsg[0].compression) !== 1) {
          ctx.measure('send-data', data.unsendMsg[0].data.length)
          data.unsendMsg.shift()

          // Ok we drained one item, let's unhold send
          data.backPressureResolve?.()
          data.backPressure = undefined
        } else {
          // Wait for next drain.
          return
        }
      }
    },
    close: (ws, code, message) => {
      const data = ws.getUserData()
      doSessionOp(data, (s) => {
        if (!(s.session.workspaceClosed ?? false)) {
          // remove session after 1seconds, give a time to reconnect.
          void sessions.close(
            ctx,
            data.connectionSocket as ConnectionSocket,
            toWorkspaceString(data.payload.workspace)
          )
        }
      })
    }
  })
    .any('/api/v1/statistics', (response, request) => {
      const getUsers = (): any => Array.from(sessions.sessions.entries()).map(([k, v]) => v.session.getUser())

      const token = request.getQuery('token') ?? ''
      try {
        const payload = decodeToken(token ?? '')
        const admin = payload.extra?.admin === 'true'

        const json = JSON.stringify({
          ...getStatistics(ctx, sessions, admin),
          users: getUsers,
          admin
        })

        writeStatus(response, '200 OK').writeHeader('Content-Type', 'application/json').end(json)
      } catch (err: any) {
        Analytics.handleError(err)
        writeStatus(response, '404 ERROR').end()
      }
    })
    .any('/api/v1/version', (response, request) => {
      try {
        writeStatus(response, '200 OK')
          .writeHeader('Content-Type', 'application/json')
          .end(
            JSON.stringify({
              version: process.env.MODEL_VERSION
            })
          )
      } catch (err: any) {
        Analytics.handleError(err)
        writeStatus(response, '404 ERROR').writeHeader('Content-Type', 'application/json').end()
      }
    })
    .any('/api/v1/manage', (res, req) => {
      try {
        const token = req.getQuery('token') as string
        const payload = decodeToken(token)
        if (payload.extra?.admin !== 'true') {
          writeStatus(res, '404 ERROR').writeHeader('Content-Type', 'application/json').end()
          return
        }

        const operation = req.getQuery('operation')

        switch (operation) {
          case 'maintenance': {
            const timeMinutes = parseInt(req.getQuery('timeout' as string) ?? '5')
            sessions.scheduleMaintenance(timeMinutes)

            writeStatus(res, '200 OK').end()
            return
          }
          case 'wipe-statistics': {
            wipeStatistics(ctx)

            writeStatus(res, '200 OK').end()
            return
          }
          case 'force-close': {
            const wsId = req.getQuery('wsId') as string
            void sessions.forceClose(wsId)
            writeStatus(res, '200 OK').end()
            return
          }
          case 'reboot': {
            process.exit(0)
          }
        }

        writeStatus(res, '404 ERROR').end()
      } catch (err: any) {
        Analytics.handleError(err)
        console.error(err)
        writeStatus(res, '404 ERROR').end()
      }
    })
    .any('/*', (res, req) => {
      res.end('')
    })

    .listen(port, (s) => {})

  return async () => {
    await sessions.closeWorkspaces(ctx)
  }
}
function createWebSocketClientSocket (
  wrData: { remoteAddress: ArrayBuffer, userAgent: string, language: string, email: string, mode: any, model: any },
  ws: uWebSockets.WebSocket<WebsocketUserData>,
  data: WebsocketUserData
): ConnectionSocket {
  const cs: ConnectionSocket = {
    id: generateId(),
    isClosed: false,
    data: () => wrData,
    close: () => {
      cs.isClosed = true
      try {
        ws.close()
      } catch (err) {
        // Ignore closed
      }
    },
    send: async (ctx, msg, binary, compression): Promise<number> => {
      await data.backPressure
      const serialized = serialize(msg, binary)
      try {
        const sendR = ws.send(serialized, binary, compression)
        if (sendR === 2) {
          data.backPressure = new Promise((resolve) => {
            data.backPressureResolve = resolve
          })
          data.unsendMsg.push({ data: serialized, binary, compression })
        } else {
          ctx.measure('send-data', serialized.length)
        }
      } catch (err: any) {
        if (!((err.message ?? '') as string).includes('Invalid access of closed')) {
          console.error(err)
        }
        // Ignore socket is closed
      }
      return serialized.length
    }
  }
  return cs
}
