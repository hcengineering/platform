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
import { RPCHandler } from '@hcengineering/rpc'
import { getStatistics, wipeStatistics } from './stats'
import { LOGGING_ENABLED, type ConnectionSocket, type HandleRequestFunction, type SessionManager } from './types'

import { unknownStatus } from '@hcengineering/platform'
import { type PipelineFactory, type StorageAdapter } from '@hcengineering/server-core'
import uWebSockets, { DISABLED, SHARED_COMPRESSOR, type HttpResponse, type WebSocket } from '@hcengineering/uws'
import { Readable } from 'stream'
import { getFile, getFileRange, type BlobResponse } from './blobs'
import { doSessionOp, processRequest, type WebsocketData } from './utils'

const rpcHandler = new RPCHandler()

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
  enableCompression: boolean,
  accountsUrl: string,
  externalStorage: StorageAdapter
): () => Promise<void> {
  if (LOGGING_ENABLED) console.log(`starting U server on port ${port} ...`)

  let profiling = false
  const uAPP = uWebSockets.App()

  const writeStatus = (response: HttpResponse, status: string): HttpResponse => {
    return response
      .writeStatus(status)
      .writeHeader('Access-Control-Allow-Origin', '*')
      .writeHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, PUT')
      .writeHeader('Access-Control-Allow-Headers', 'Content-Type')
  }

  uAPP
    .ws<WebsocketUserData>('/*', {
    /* There are many common helper features */
    maxPayloadLength: 250 * 1024 * 1024,
    compression: enableCompression ? SHARED_COMPRESSOR : DISABLED,
    idleTimeout: 0,
    maxLifetime: 0,
    sendPingsAutomatically: true,

    upgrade (res, req, context) {
      const url = new URL('http://localhost' + (req.getUrl() ?? ''))
      const token = url.pathname.substring(1)

      try {
        const payload = decodeToken(token ?? '')

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
      const cs = createWebSocketClientSocket(wrData, ws, data)
      data.connectionSocket = cs

      data.session = sessions.addSession(
        ctx,
        data.connectionSocket,
        ws.getUserData().payload,
        ws.getUserData().token,
        pipelineFactory,
        undefined,
        accountsUrl
      )

      if (data.session instanceof Promise) {
        void data.session.then((s) => {
          if ('error' in s) {
            cs.send(
              ctx,
              { id: -1, error: unknownStatus(s.error.message ?? 'Unknown error'), terminate: s.terminate },
              false,
              false
            )
            setTimeout(() => {
              cs.close()
            }, 1000)
          }
          if ('upgrade' in s) {
            cs.send(ctx, { id: -1, result: { state: 'upgrading', stats: (s as any).upgradeInfo } }, false, false)
            setTimeout(() => {
              cs.close()
            }, 5000)
          }
        })
      }
    },
    message: (ws, message, isBinary) => {
      const data = ws.getUserData()
      const msg = Buffer.from(message)

      doSessionOp(
        data,
        (s, msg) => {
          processRequest(
            s.session,
            data.connectionSocket as ConnectionSocket,
            s.context,
            s.workspaceId,
            msg,
            handleRequest
          )
        },
        msg
      )
    },
    drain: (ws) => {
      const data = ws.getUserData()
      while (data.unsendMsg.length > 0) {
        const sendResult = ws.send(data.unsendMsg[0].data, data.unsendMsg[0].binary, data.unsendMsg[0].compression)
        if (sendResult !== 2) {
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
      data.backPressureResolve?.()
      data.backPressure = undefined
    },
    close: (ws, code, message) => {
      const data = ws.getUserData()
      doSessionOp(
        data,
        (s) => {
          if (!(s.session.workspaceClosed ?? false)) {
            // remove session after 1seconds, give a time to reconnect.
            void sessions.close(
              ctx,
              data.connectionSocket as ConnectionSocket,
              toWorkspaceString(data.payload.workspace)
            )
          }
        },
        Buffer.from('')
      )
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
          admin,
          profiling
        })

        writeStatus(response, '200 OK').writeHeader('Content-Type', 'application/json').end(json)
      } catch (err: any) {
        Analytics.handleError(err)
        writeStatus(response, '404 ERROR').end()
      }
    })
    .any('/api/v1/profiling', (response, request) => {
      const token = request.getQuery('token') ?? ''
      try {
        decodeToken(token ?? '')

        const json = JSON.stringify({
          profiling
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
          case 'profile-start': {
            ctx.warn(
              '---------------------------------------------PROFILING SESSION STARTED---------------------------------------------'
            )
            profiling = true
            sessions.profiling?.start()

            writeStatus(res, '200 OK').end()
            return
          }
          case 'profile-stop': {
            profiling = false
            if (sessions.profiling?.stop != null) {
              void sessions.profiling?.stop()?.then((profile) => {
                ctx.warn(
                  '---------------------------------------------PROFILING SESSION STOPPED---------------------------------------------',
                  { profile }
                )
                writeStatus(res, '200 OK')
                  .writeHeader('Content-Type', 'application/json')
                  .end(profile ?? '{ error: "no profiling" }')
              })
            } else {
              writeStatus(res, '404 ERROR').end()
            }

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
    .get('/api/v1/blob/*', (res, req) => {
      try {
        const authHeader = req.getHeader('authorization')
        if (authHeader === undefined) {
          res.status(403).send({ error: 'Unauthorized' })
          return
        }

        const payload = decodeToken(authHeader.split(' ')[1])

        const name = req.getQuery('name') as string
        const wrappedRes = wrapRes(res)

        res.onAborted(() => {
          wrappedRes.aborted = true
        })
        const range = req.getHeader('range')
        if (range !== undefined) {
          void ctx.with('file-range', { workspace: payload.workspace.name }, (ctx) =>
            getFileRange(ctx, range, externalStorage, payload.workspace, name, wrappedRes)
          )
        } else {
          void getFile(ctx, externalStorage, payload.workspace, name, wrappedRes)
        }
      } catch (err: any) {
        Analytics.handleError(err)
        writeStatus(res, '404 ERROR').end()
      }
    })
    .put('/api/v1/blob/*', (res, req) => {
      try {
        const authHeader = req.getHeader('authorization')
        if (authHeader === undefined) {
          res.status(403).send({ error: 'Unauthorized' })
          return
        }

        const payload = decodeToken(authHeader.split(' ')[1])

        const name = req.getQuery('name') as string
        const contentType = req.getQuery('contentType') as string
        const size = parseInt((req.getQuery('size') as string) ?? '-1')

        const pipe = pipeFromRequest(res)
        void ctx
          .with(
            'storage upload',
            { workspace: payload.workspace.name },
            () => externalStorage.put(ctx, payload.workspace, name, pipe, contentType, size !== -1 ? size : undefined),
            { file: name, contentType }
          )
          .then(() => {
            res.cork(() => {
              res.writeStatus('200 OK')
              res.end()
            })
          })
      } catch (err: any) {
        Analytics.handleError(err)
        console.error(err)
        writeStatus(res, '404 ERROR').end()
      }
    })
    .any('/*', (res, req) => {
      writeStatus(res, '404 ERROR').end()
    })

    .listen(port, (s) => {})

  return async () => {
    await sessions.closeWorkspaces(ctx)
  }
}
function createWebSocketClientSocket (
  wrData: {
    remoteAddress: ArrayBuffer
    userAgent: string
    language: string
    email: string
    mode: any
    model: any
  },
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
    readRequest: (buffer: Buffer, binary: boolean) => {
      return rpcHandler.readRequest(buffer, binary)
    },
    send: (ctx, msg, binary, compression) => {
      void (async (): Promise<void> => {
        if (data.backPressure !== undefined) {
          await data.backPressure
        }
        const serialized = rpcHandler.serialize(msg, binary)
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
      })()
    }
  }
  return cs
}

/* Helper function converting Node.js buffer to ArrayBuffer */
function toArrayBuffer (buffer: Buffer): ArrayBufferLike {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
}

/* Either onAborted or simply finished request */
function onAbortedOrFinishedResponse (res: HttpResponse, readStream: Readable): void {
  if (res.id === -1) {
    console.log('ERROR! onAbortedOrFinishedResponse called twice for the same res!')
  } else {
    readStream.destroy()
  }

  /* Mark this response already accounted for */
  res.id = -1
}

function pipeFromRequest (res: HttpResponse): Readable {
  const readable = new Readable()
  readable._read = () => {}

  res.onAborted(() => {
    readable.push(null)
  })
  res.onData((ab, isLast) => {
    const chunk = Buffer.copyBytesFrom(Buffer.from(ab))
    readable.push(chunk)
    if (isLast) {
      readable.push(null)
    }
  })
  return readable
}

function pipeStreamOverResponse (
  res: HttpResponse,
  readStream: Readable,
  totalSize: number,
  checkAborted: () => boolean
): void {
  readStream
    .on('data', (chunk) => {
      if (checkAborted()) {
        readStream.destroy()
        return
      }
      const ab = toArrayBuffer(chunk)
      const lastOffset = res.getWriteOffset()
      res.cork(() => {
        const [ok, done] = res.tryEnd(ab, totalSize)
        if (done) {
          onAbortedOrFinishedResponse(res, readStream)
        } else if (!ok) {
          readStream.pause()
          res.ab = ab
          res.abOffset = lastOffset
          res.onWritable((offset) => {
            const [ok, done] = res.tryEnd(res.ab.slice(offset - res.abOffset), totalSize)
            if (done) {
              onAbortedOrFinishedResponse(res, readStream)
            } else if (ok) {
              readStream.resume()
            }
            return ok
          })
        }
      })
    })
    .on('error', (err) => {
      Analytics.handleError(err)
      res.close()
    })

  /* If you plan to asyncronously respond later on, you MUST listen to onAborted BEFORE returning */
  res.onAborted(() => {
    onAbortedOrFinishedResponse(res, readStream)
  })
}

function wrapRes (res: HttpResponse): BlobResponse {
  const result: BlobResponse = {
    aborted: false,
    cork: (cb: () => void) => {
      if (result.aborted || res.id === -1) {
        cb()
        return
      }
      res.cork(cb)
    },
    end: () => {
      if (result.aborted || res.id === -1) {
        return
      }
      res.end()
    },
    status: (code) => {
      if (result.aborted || res.id === -1) {
        return
      }
      switch (code) {
        case 200:
          res.writeStatus(`${code} OK`)
          break
        case 206:
          res.writeStatus(`${code} Partial Content`)
          break
        case 304:
          res.writeStatus(`${code} Not Modified`)
          break
        case 400:
          res.writeStatus(`${code} Bad Request`)
          break
        case 404:
          res.writeStatus(`${code} Not Found`)
          break
        case 416:
          res.writeStatus(`${code} Range Not Satisfiable`)
          break
        default:
          res.writeStatus(`${code} ERROR`)
          break
      }
    },
    pipeFrom: (readable, size) => {
      if (result.aborted || res.id === -1) {
        return
      }
      pipeStreamOverResponse(res, readable, size, () => result.aborted)
    },
    writeHead: (code, header) => {
      if (result.aborted || res.id === -1) {
        return
      }
      result.status(code)
      for (const [k, v] of Object.entries(header)) {
        res.writeHeader(k, `${v}`)
      }
    }
  }
  return result
}
