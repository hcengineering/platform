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

import {
  getClient as getAccountClientRaw,
  isWorkspaceLoginInfo,
  type AccountClient
} from '@hcengineering/account-client'
import { Analytics } from '@hcengineering/analytics'
import {
  generateId,
  platformNow,
  systemAccountUuid,
  type MeasureContext,
  type Tx,
  type WorkspaceIds,
  type WorkspaceUuid
} from '@hcengineering/core'
import platform, { Severity, Status, UNAUTHORIZED, unknownStatus } from '@hcengineering/platform'
import { RPCHandler, type Response } from '@hcengineering/rpc'
import {
  doSessionOp,
  getFile,
  getFileRange,
  getStatistics,
  processRequest,
  wipeStatistics,
  type BlobResponse,
  type WebsocketData
} from '@hcengineering/server'
import {
  LOGGING_ENABLED,
  pingConst,
  pongConst,
  type ConnectionSocket,
  type HandleRequestFunction,
  type PipelineFactory,
  type SessionManager,
  type StorageAdapter
} from '@hcengineering/server-core'
import { decodeToken, type Token } from '@hcengineering/server-token'
import cors from 'cors'
import express, { type Response as ExpressResponse, type NextFunction, type Request } from 'express'
import http, { type IncomingMessage } from 'http'
import os from 'os'
import { WebSocketServer, type RawData, type WebSocket } from 'ws'

import 'bufferutil'
import morgan from 'morgan'
import { compress } from 'snappy'
import 'utf-8-validate'
import { registerRPC } from './rpc'
import { retrieveJson } from './utils'

import { setImmediate } from 'timers/promises'

export type RequestHandler = (req: Request, res: ExpressResponse, next?: NextFunction) => Promise<void>

const catchError = (fn: RequestHandler) => (req: Request, res: ExpressResponse, next: NextFunction) => {
  void (async () => {
    try {
      await fn(req, res, next)
    } catch (err: unknown) {
      next(err)
    }
  })()
}

let profiling = false
const rpcHandler = new RPCHandler()

const backpressureSize = 100 * 1024
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
  accountsUrl: string,
  externalStorage: StorageAdapter
): () => Promise<void> {
  function getAccountClient (token?: string): AccountClient {
    return getAccountClientRaw(accountsUrl, token)
  }

  async function getWorkspaceIds (token: string): Promise<WorkspaceIds> {
    const wsLoginInfo = await getAccountClient(token).getLoginInfoByToken()

    if (!isWorkspaceLoginInfo(wsLoginInfo)) {
      throw new Error('Invalid workspace login info by token')
    }

    return {
      uuid: wsLoginInfo.workspace,
      dataId: wsLoginInfo.workspaceDataId,
      url: wsLoginInfo.workspaceUrl
    }
  }

  if (LOGGING_ENABLED) {
    ctx.info('starting server on', {
      port,
      accountsUrl,
      parallel: os.availableParallelism()
    })
  }

  const app = express()
  app.use(cors())

  const childLogger = ctx.logger.childLogger?.('requests', {
    enableConsole: 'true'
  })
  const requests = ctx.newChild('requests', {}, {}, childLogger)

  class MyStream {
    write (text: string): void {
      requests.info(text)
    }
  }

  const myStream = new MyStream()

  app.use(morgan('short', { stream: myStream }))

  const getUsers = (): any => Array.from(sessions.sessions.entries()).map(([k, v]) => v.session.getUser())

  app.get('/api/v1/version', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      Connection: 'keep-alive',
      'keep-alive': 'timeout=5, max=1000'
    })
    res.end(
      JSON.stringify({
        version: process.env.MODEL_VERSION
      })
    )
  })

  app.get('/api/v1/statistics', (req, res) => {
    try {
      const token = (req.query.token as string) ?? (req.headers.authorization ?? '').split(' ')[1]
      const payload = decodeToken(token)
      const admin = payload.extra?.admin === 'true'
      const jsonData = {
        ...getStatistics(ctx, sessions, admin),
        users: getUsers(),
        admin,
        profiling
      }
      const json = JSON.stringify(jsonData)
      res.writeHead(200, {
        'Content-Type': 'application/json',
        Connection: 'keep-alive',
        'keep-alive': 'timeout=5, max=1000'
      })
      res.end(json)
    } catch (err: any) {
      Analytics.handleError(err)
      ctx.error('error', { err })
      res.writeHead(404, {})
      res.end()
    }
  })

  app.get('/api/v1/profiling', (req, res) => {
    try {
      const token = req.query.token as string
      decodeToken(token)
      const jsonData = {
        profiling
      }
      const json = JSON.stringify(jsonData)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(json)
    } catch (err: any) {
      Analytics.handleError(err)
      ctx.error('error', { err })
      res.writeHead(404, {})
      res.end()
    }
  })
  app.put('/api/v1/manage', (req, res) => {
    try {
      const token = (req.query.token as string) ?? (req.headers.authorization ?? '').split(' ')[1]
      const payload = decodeToken(token)
      if (payload.extra?.admin !== 'true' && payload.account !== systemAccountUuid) {
        console.warn('Non admin attempt to maintenance action', { payload })
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
          return
        }
        case 'wipe-statistics': {
          wipeStatistics(ctx)

          res.writeHead(200)
          res.end()
          return
        }
        case 'profile-start': {
          ctx.warn(
            '---------------------------------------------PROFILING SESSION STARTED---------------------------------------------'
          )
          profiling = true
          sessions.profiling?.start()

          res.writeHead(200)
          res.end()
          return
        }
        case 'profile-stop': {
          profiling = false
          if (sessions.profiling?.stop != null) {
            void sessions.profiling.stop().then((profile) => {
              ctx.warn(
                '---------------------------------------------PROFILING SESSION STOPPED---------------------------------------------',
                {}
              )
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(profile ?? '{ error: "no profiling" }')
            })
          } else {
            res.writeHead(404)
            res.end()
          }

          return
        }
        case 'force-close': {
          const wsId = req.query.wsId as WorkspaceUuid
          void sessions.forceClose(wsId ?? payload.workspace)
          res.writeHead(200)
          res.end()
          return
        }
        case 'reboot': {
          process.exit(0)
        }
      }

      res.writeHead(404, {})
      res.end()
    } catch (err: any) {
      Analytics.handleError(err)
      ctx.error('error', { err })
      res.writeHead(404, {})
      res.end()
    }
  })

  app.put(
    '/api/v1/blob',
    catchError(async (req, res) => {
      try {
        const authHeader = req.headers.authorization
        if (authHeader === undefined) {
          res.status(403).send({ error: 'Unauthorized' })
          return
        }

        const token = authHeader.split(' ')[1]
        const wsIds = await getWorkspaceIds(token)

        if (wsIds.uuid == null) {
          res.status(401).send({ error: 'No workspace found' })
        }

        const name = req.query.name as string
        const contentType = req.query.contentType as string
        const size = parseInt((req.query.size as string) ?? '-1')
        const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB limit

        if (size > MAX_FILE_SIZE) {
          res.writeHead(413, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'File too large' }))
          return
        }
        if (Number.isNaN(size)) {
          ctx.error('/api/v1/blob put error', {
            message: 'invalid NaN file size',
            name,
            workspace: wsIds.uuid
          })
          res.writeHead(404, {})
          res.end()
          return
        }
        ctx
          .with(
            'storage upload',
            { workspace: wsIds.uuid },
            (ctx) => externalStorage.put(ctx, wsIds, name, req, contentType, size !== -1 ? size : undefined),
            { file: name, contentType }
          )
          .then(() => {
            res.writeHead(200, { 'Cache-Control': 'no-cache' })
            res.end()
          })
          .catch((err) => {
            Analytics.handleError(err)
            ctx.error('/api/v1/blob put error', { err })
            res.writeHead(404, {})
            res.end()
          })
      } catch (err: any) {
        Analytics.handleError(err)
        ctx.error('/api/v1/blob put error', { err })
        res.writeHead(404, {})
        res.end()
      }
    })
  )

  app.get(
    '/api/v1/blob',
    catchError(async (req, res) => {
      try {
        const authHeader = req.headers.authorization
        if (authHeader === undefined) {
          res.status(403).send({ error: 'Unauthorized' })
          return
        }

        const token = authHeader.split(' ')[1]
        const wsIds = await getWorkspaceIds(token)

        if (wsIds.uuid == null) {
          res.status(401).send({ error: 'No workspace found' })
        }

        const name = req.query.name as string

        const range = req.headers.range
        if (range !== undefined) {
          ctx
            .with('file-range', { workspace: wsIds.uuid }, (ctx) =>
              getFileRange(ctx, range, externalStorage, wsIds, name, wrapRes(res))
            )
            .catch((err) => {
              Analytics.handleError(err)
              ctx.error('/api/v1/blob get error', { err })
              res.writeHead(404, {})
              res.end()
            })
        } else {
          void getFile(ctx, externalStorage, wsIds, name, wrapRes(res)).catch((err) => {
            Analytics.handleError(err)
            ctx.error('/api/v1/blob get error', { err })
            res.writeHead(404, {})
            res.end()
          })
        }
      } catch (err: any) {
        Analytics.handleError(err)
        ctx.error('/api/v1/blob get error', { err })
      }
    })
  )

  registerRPC(app, sessions, ctx, pipelineFactory)

  app.put('/api/v1/broadcast', (req, res) => {
    try {
      const token = req.query.token as string
      decodeToken(token)
      const ws = sessions.workspaces.get(req.query.workspace as WorkspaceUuid)
      if (ws !== undefined) {
        // push the data to body
        void retrieveJson(req)
          .then((data) => {
            if (Array.isArray(data)) {
              sessions.broadcastAll(ws, data as Tx[])
            } else {
              sessions.broadcastAll(ws, [data as unknown as Tx])
            }
            res.end()
          })
          .catch((err) => {
            ctx.error('JSON parse error', { err })
            res.writeHead(400, {})
            res.end()
          })
      } else {
        res.writeHead(404, {})
        res.end()
      }
    } catch (err: any) {
      Analytics.handleError(err)
      ctx.error('error', { err })
      res.writeHead(404, {})
      res.end()
    }
  })

  const httpServer = http.createServer(app)
  const wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: false,
    skipUTF8Validation: true,
    maxPayload: 250 * 1024 * 1024,
    clientTracking: false // We do not need to track clients inside clients.
  })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  const handleConnection = async (
    ws: WebSocket,
    request: IncomingMessage,
    token: Token,
    rawToken: string,
    sessionId?: string
  ): Promise<void> => {
    const data = {
      remoteAddress: request.socket.remoteAddress ?? '',
      userAgent: request.headers['user-agent'] ?? '',
      language: request.headers['accept-language'] ?? '',
      account: token.account,
      mode: token.extra?.mode,
      model: token.extra?.model
    }
    const cs: ConnectionSocket = createWebsocketClientSocket(ws, data)

    const webSocketData: WebsocketData = {
      connectionSocket: cs,
      payload: token,
      token: rawToken,
      session: sessions.addSession(ctx, cs, token, rawToken, pipelineFactory, sessionId),
      url: ''
    }

    if (webSocketData.session instanceof Promise) {
      void webSocketData.session.then((s) => {
        if ('error' in s) {
          if (s.specialError === 'archived') {
            void cs.send(
              ctx,
              {
                id: -1,
                error: new Status(Severity.ERROR, platform.status.WorkspaceArchived, {
                  workspaceUuid: token.workspace
                }),
                terminate: s.terminate
              },
              false,
              false
            )
          } else if (s.specialError === 'migration') {
            void cs.send(
              ctx,
              {
                id: -1,
                error: new Status(Severity.ERROR, platform.status.WorkspaceMigration, {
                  workspaceUuid: token.workspace
                }),
                terminate: s.terminate
              },
              false,
              false
            )
          } else {
            void cs.send(
              ctx,
              { id: -1, error: unknownStatus(s.error.message ?? 'Unknown error'), terminate: s.terminate },
              false,
              false
            )
          }
          // No connection to account service, retry from client.
          setTimeout(() => {
            cs.close()
          }, 1000)
        }
        if ('upgrade' in s) {
          void cs.send(ctx, { id: -1, result: { state: 'upgrading', stats: (s as any).upgradeInfo } }, false, false)
          setTimeout(() => {
            cs.close()
          }, 5000)
        }
      })
      void webSocketData.session.catch((err) => {
        ctx.error('unexpected error in websocket', { err })
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    ws.on('message', (msg: RawData) => {
      try {
        let buff: Buffer | undefined
        if (msg instanceof Buffer) {
          buff = msg
        } else if (Array.isArray(msg)) {
          buff = Buffer.concat(msg)
        }
        if (buff !== undefined) {
          doSessionOp(
            webSocketData,
            (s, buff) => {
              s.context.measure('receive-data', buff?.length ?? 0)
              processRequest(s.session, cs, s.context, s.workspaceId, buff, handleRequest)
            },
            buff
          )
        }
      } catch (err: any) {
        Analytics.handleError(err)
        if (LOGGING_ENABLED) {
          ctx.error('message error', { err })
        }
      }
    })
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    ws.on('close', (code: number, reason: Buffer) => {
      doSessionOp(
        webSocketData,
        (s) => {
          if (!(s.session.workspaceClosed ?? false)) {
            // remove session after 1seconds, give a time to reconnect.
            void sessions.close(ctx, cs, token.workspace)
          }
        },
        Buffer.from('')
      )
    })

    ws.on('error', (err) => {
      doSessionOp(
        webSocketData,
        (s) => {
          ctx.error('error', { err, user: s.session.getUser() })
          if (!(s.session.workspaceClosed ?? false)) {
            // remove session after 1seconds, give a time to reconnect.
            void sessions.close(ctx, cs, token.workspace)
          }
        },
        Buffer.from('')
      )
    })
  }
  wss.on('connection', handleConnection as any)

  httpServer.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    const url = new URL('http://localhost' + (request.url ?? ''))
    const token = url.pathname.substring(1)

    try {
      const payload = decodeToken(token ?? '')
      const sessionId = url.searchParams.get('sessionId')

      wss.handleUpgrade(request, socket, head, (ws) => {
        void handleConnection(ws, request, payload, token, sessionId ?? undefined)
      })
    } catch (err: any) {
      Analytics.handleError(err)
      if (LOGGING_ENABLED) {
        ctx.error('invalid token', err)
      }
      wss.handleUpgrade(request, socket, head, (ws) => {
        const resp: Response<any> = {
          id: -1,
          error: UNAUTHORIZED,
          result: 'hello'
        }
        ws.send(rpcHandler.serialize(resp, false), { binary: false })
        ws.onmessage = (msg) => {
          const resp: Response<any> = {
            error: UNAUTHORIZED
          }
          ws.send(rpcHandler.serialize(resp, false), { binary: false })
        }
      })
    }
  })
  httpServer.on('error', (err) => {
    if (LOGGING_ENABLED) {
      ctx.error('server error', err)
    }
  })

  httpServer.listen(port)
  return async () => {
    await sessions.closeWorkspaces(ctx)
    await new Promise<void>((resolve, reject) => {
      wss.close((err) => {
        if (err != null) {
          reject(err)
        }
        resolve()
      })
    })
    await new Promise<void>((resolve, reject) =>
      httpServer.close((err) => {
        if (err != null) {
          reject(err)
        }
        resolve()
      })
    )
  }
}
function createWebsocketClientSocket (
  ws: WebSocket,
  data: {
    remoteAddress: string
    userAgent: string
    language: string
    account: string
    mode: any
    model: any
  }
): ConnectionSocket {
  const cs: ConnectionSocket = {
    id: generateId(),
    isClosed: false,
    close: () => {
      cs.isClosed = true
      ws.close()
      ws.terminate()
    },
    isBackpressure: () => ws.bufferedAmount > backpressureSize,
    backpressure: async (ctx) => {
      if (ws.bufferedAmount < backpressureSize) {
        return
      }
      await ctx.with('backpressure', {}, async () => {
        while (ws.bufferedAmount > backpressureSize) {
          await setImmediate()
        }
      })
    },
    checkState: () => {
      if (ws.readyState === ws.CLOSED || ws.readyState === ws.CLOSING) {
        ws.terminate()
        return false
      }
      return true
    },
    readRequest: (buffer: Buffer, binary: boolean) => {
      if (buffer.length === pingConst.length && buffer.toString() === pingConst) {
        return { method: pingConst, params: [], id: -1, time: Date.now() }
      }
      return rpcHandler.readRequest(buffer, binary)
    },
    data: () => data,
    sendPong: () => {
      if (ws.readyState !== ws.OPEN || cs.isClosed) {
        return
      }
      ws.send(pongConst)
    },
    send: async (ctx: MeasureContext, msg, binary, _compression): Promise<void> => {
      const smsg = rpcHandler.serialize(msg, binary)
      if (ws.readyState !== ws.OPEN || cs.isClosed) {
        return
      }

      // We need to be sure all data is send before we will send more.
      if (cs.isBackpressure()) {
        await cs.backpressure(ctx)
      }

      let sendMsg = smsg
      if (_compression) {
        sendMsg = await compress(smsg)
      }
      const st = platformNow()
      await new Promise<void>((resolve) => {
        const handleErr = (err?: Error): void => {
          ctx.measure('msg-send-delta', platformNow() - st)
          if (err != null) {
            if (!`${err.message}`.includes('WebSocket is not open')) {
              ctx.error('send error', { err })
              Analytics.handleError(err)
            }
          }
          resolve() // In any case we need to resolve.
        }
        ws.send(sendMsg, { binary: true }, handleErr)
      })
    }
  }
  return cs
}
function wrapRes (res: ExpressResponse): BlobResponse {
  return {
    aborted: false,
    cork: (cb) => {
      cb()
    },
    end: () => res.end(),
    pipeFrom: (readable) => readable.pipe(res),
    status: (code) => res.status(code),
    writeHead: (code, header) => res.writeHead(code, header)
  }
}
