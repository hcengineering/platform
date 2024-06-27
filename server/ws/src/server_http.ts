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

import { Analytics } from '@hcengineering/analytics'
import { generateId, toWorkspaceString, type MeasureContext } from '@hcengineering/core'
import { UNAUTHORIZED } from '@hcengineering/platform'
import { serialize, type Response } from '@hcengineering/rpc'
import { decodeToken, type Token } from '@hcengineering/server-token'
import os from 'os'
import { type RawData, type WebSocket } from 'ws'
import { getStatistics, wipeStatistics } from './stats'
import {
  LOGGING_ENABLED,
  type ConnectionSocket,
  type HandleRequestFunction,
  type PipelineFactory,
  type SessionManager
} from './types'

import type { StorageAdapter } from '@hcengineering/server-core'
import 'bufferutil'
import 'utf-8-validate'
import { getFile, getFileRange, type BlobResponse } from './blobs'
import { doSessionOp, processRequest, type WebsocketData } from './utils'

import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyWebSocket from '@fastify/websocket'
import fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import { Readable } from 'stream'

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
  enableCompression: boolean,
  accountsUrl: string,
  externalStorage: StorageAdapter
): () => Promise<void> {
  if (LOGGING_ENABLED) {
    ctx.info('starting server on', {
      port,
      productId,
      enableCompression,
      accountsUrl,
      parallel: os.availableParallelism()
    })
  }

  const httpLogger = ctx.newChild('http', {}, {}, ctx.logger.childLogger?.('http', {}))

  const app = fastify({
    logger: {
      level: 'info',
      stream: {
        write (msg) {
          const msgInfo = JSON.parse(msg)
          delete msgInfo.hostname
          delete msgInfo.hostname
          httpLogger.info('http', msgInfo)
        }
      }
    }
  })

  app.addContentTypeParser(
    'application/octet-stream',
    { parseAs: 'buffer', bodyLimit: 512 * 1024 * 1024 },
    function (req, body, done) {
      try {
        done(null, body)
      } catch (err: any) {
        err.statusCode = 400
        done(err, undefined)
      }
    }
  )
  void app.register(fastifyWebSocket, {
    options: {
      maxPayload: 512 * 1024 * 1024,
      perMessageDeflate: enableCompression
        ? {
            zlibDeflateOptions: {
              // See zlib defaults.
              chunkSize: 32 * 1024,
              memLevel: 9,
              level: 1
            },
            zlibInflateOptions: {
              chunkSize: 32 * 1024,
              level: 1,
              memLevel: 9
            },
            serverNoContextTakeover: true,
            clientNoContextTakeover: true,
            // Below options specified as default values.
            concurrencyLimit: Math.max(10, os.availableParallelism()), // Limits zlib concurrency for perf.
            threshold: 1024 // Size (in bytes) below which messages
            // should not be compressed if context takeover is disabled.
          }
        : false,
      skipUTF8Validation: true
    }
  })

  void app.register(multipart, {
    limits: {
      fileSize: 512 * 1024 * 1024,
      files: 50
    }
  })

  void app.register(cors, {
    // put your options here
    credentials: true
  })

  const getUsers = (): any => Array.from(sessions.sessions.entries()).map(([k, v]) => v.session.getUser())

  void app.get('/api/v1/version', async (req, res) => {
    await res
      .status(200)
      .headers({
        'content-type': 'application/json',
        'cache-control': 'no-cache'
      })
      .send(
        JSON.stringify({
          version: process.env.MODEL_VERSION
        })
      )
  })

  void app.get(
    '/api/v1/statistics',
    async (
      req: FastifyRequest<{
        Querystring: {
          token: string
        }
      }>,
      res
    ) => {
      try {
        const token = req.query.token
        const payload = decodeToken(token)
        const admin = payload.extra?.admin === 'true'
        const json = JSON.stringify({
          ...getStatistics(ctx, sessions, admin),
          users: getUsers,
          admin
        })
        await res.status(200).type('application/json').send(json)
      } catch (err: any) {
        Analytics.handleError(err)
        ctx.error('statistics', { err })
        await res.status(404).send()
      }
    }
  )
  void app.put(
    '/api/v1/manage',
    async (
      req: FastifyRequest<{
        Querystring: {
          token: string
          operation: string
          timeout?: string
          wsId?: string
        }
      }>,
      res
    ) => {
      try {
        const token = req.query.token
        const payload = decodeToken(token)
        if (payload.extra?.admin !== 'true') {
          await res.status(404).send()
          return
        }

        const operation = req.query.operation

        switch (operation) {
          case 'maintenance': {
            const timeMinutes = parseInt(req.query.timeout ?? '5')
            sessions.scheduleMaintenance(timeMinutes)

            await res.status(200).send()
            return
          }
          case 'wipe-statistics': {
            wipeStatistics(ctx)

            await res.status(200).send()
            return
          }
          case 'force-close': {
            const wsId = req.query.wsId as string
            void sessions.forceClose(wsId)
            await res.status(200).send()
            return
          }
          case 'reboot': {
            process.exit(0)
          }
        }

        await res.status(404).send()
      } catch (err: any) {
        Analytics.handleError(err)
        ctx.error('manager', { err })
        await res.status(404).send()
      }
    }
  )

  void app.put(
    '/api/v1/blob',
    async (
      req: FastifyRequest<{
        Querystring: {
          name: string
          contentType: string
          size?: string
        }
        Body: Buffer
      }>,
      res
    ) => {
      try {
        const authHeader = req.headers.authorization
        if (authHeader === undefined) {
          await res.status(403).send({ error: 'Unauthorized' })
          return
        }

        const payload = decodeToken(authHeader.split(' ')[1])

        const name = req.query.name
        const contentType = req.query.contentType
        const size = parseInt(req.query.size ?? '-1')

        await ctx.with(
          'storage upload',
          { workspace: payload.workspace.name },
          async (ctx) =>
            await externalStorage.put(
              ctx,
              payload.workspace,
              name,
              req.body,
              contentType,
              size !== -1 ? size : undefined
            ),
          { file: name, contentType }
        )
        await res.status(200).headers({ 'cache-control': 'no-cache' }).send()
      } catch (err: any) {
        Analytics.handleError(err)
        ctx.error('/api/v1/blob put error', { err })
        await res.status(404).send()
      }
    }
  )
  void app.get(
    '/api/v1/blob',
    async (
      req: FastifyRequest<{
        Querystring: {
          name: string
        }
      }>,
      res
    ) => {
      try {
        const authHeader = req.headers.authorization
        if (authHeader === undefined) {
          await res.status(403).send({ error: 'Unauthorized' })
          return
        }

        const payload = decodeToken(authHeader.split(' ')[1])

        const name = req.query.name

        const range = req.headers.range
        if (range !== undefined) {
          await ctx.with('file-range', { workspace: payload.workspace.name }, async (ctx) => {
            await getFileRange(ctx, range, externalStorage, payload.workspace, name, wrapRes(res))
          })
        } else {
          await ctx.with('file', { workspace: payload.workspace.name }, async (ctx) => {
            await getFile(ctx, externalStorage, payload.workspace, name, wrapRes(res))
          })
        }
      } catch (err: any) {
        Analytics.handleError(err)
        ctx.error('/api/v1/blob get error', { err })
        await res.status(404).send()
      }
    }
  )

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  const handleConnection = async (
    ws: WebSocket,
    request: FastifyRequest,
    token: Token,
    rawToken: string,
    sessionId?: string
  ): Promise<void> => {
    const data = {
      remoteAddress: request.socket.remoteAddress ?? '',
      userAgent: request.headers['user-agent'] ?? '',
      language: request.headers['accept-language'] ?? '',
      email: token.email,
      mode: token.extra?.mode,
      model: token.extra?.model
    }
    const cs: ConnectionSocket = createWebsocketClientSocket(ws, data)

    const webSocketData: WebsocketData = {
      connectionSocket: cs,
      payload: token,
      token: rawToken,
      session: sessions.addSession(ctx, cs, token, rawToken, pipelineFactory, productId, sessionId, accountsUrl),
      url: ''
    }

    if (webSocketData.session instanceof Promise) {
      void webSocketData.session.then((s) => {
        if ('error' in s) {
          ctx.error('error', { error: s.error?.message, stack: s.error?.stack })
        }
        if ('upgrade' in s) {
          void cs
            .send(ctx, { id: -1, result: { state: 'upgrading', stats: (s as any).upgradeInfo } }, false, false)
            .then(() => {
              cs.close()
            })
        }
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    ws.on('message', (msg: RawData) => {
      try {
        let buff: any | undefined
        if (msg instanceof Buffer) {
          buff = Buffer.copyBytesFrom(msg)
        } else if (Array.isArray(msg)) {
          buff = Buffer.copyBytesFrom(Buffer.concat(msg))
        }
        if (buff !== undefined) {
          doSessionOp(webSocketData, (s) => {
            processRequest(s.session, cs, s.context, s.workspaceId, buff, handleRequest)
          })
        }
      } catch (err: any) {
        Analytics.handleError(err)
        if (LOGGING_ENABLED) {
          ctx.error('message error', { err })
        }
      }
    })
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    ws.on('close', async (code: number, reason: Buffer) => {
      doSessionOp(webSocketData, (s) => {
        if (!(s.session.workspaceClosed ?? false)) {
          // remove session after 1seconds, give a time to reconnect.
          void sessions.close(ctx, cs, toWorkspaceString(token.workspace))
        }
      })
    })

    ws.on('error', (err) => {
      doSessionOp(webSocketData, (s) => {
        console.error(s.session.getUser(), 'error', err)
      })
    })
  }

  void app.register(async function (fastify) {
    fastify.get(
      '/*',
      { websocket: true },
      async (
        socket: WebSocket,
        req: FastifyRequest<{
          Params: {
            '*': string
          }
          Querystring: {
            sessionId?: string
          }
        }>
      ) => {
        try {
          const token = req.params['*']
          const payload = decodeToken(token ?? '')
          const sessionId = req.query.sessionId

          if (payload.workspace.productId !== productId) {
            if (LOGGING_ENABLED) {
              ctx.error('invalid product', { required: payload.workspace.productId, productId })
            }
            throw new Error('Invalid workspace product')
          }
          await handleConnection(socket, req, payload, token, sessionId ?? undefined)
        } catch (err: any) {
          Analytics.handleError(err)
          if (LOGGING_ENABLED) {
            ctx.error('invalid token', err)
          }

          const resp: Response<any> = {
            id: -1,
            error: UNAUTHORIZED,
            result: 'hello'
          }
          socket.send(serialize(resp, false), { binary: false })
          socket.onmessage = (msg) => {
            const resp: Response<any> = {
              error: UNAUTHORIZED
            }
            socket.send(serialize(resp, false), { binary: false })
          }
        }
      }
    )
  })

  app.listen({ port, host: '' }, (err: any) => {
    if (err != null) {
      ctx.error('server error', { err })
      process.exit(1)
    }
  })

  return async () => {
    await sessions.closeWorkspaces(ctx)
    await app.close()
  }
}
function createWebsocketClientSocket (
  ws: WebSocket,
  data: { remoteAddress: string, userAgent: string, language: string, email: string, mode: any, model: any }
): ConnectionSocket {
  const cs: ConnectionSocket = {
    id: generateId(),
    isClosed: false,
    close: () => {
      cs.isClosed = true
      ws.close()
    },
    data: () => data,
    send: async (ctx: MeasureContext, msg, binary, compression) => {
      const smsg = serialize(msg, binary)

      ctx.measure('send-data', smsg.length)
      await new Promise<void>((resolve, reject) => {
        const doSend = (): void => {
          if (ws.readyState !== ws.OPEN || cs.isClosed) {
            return
          }
          if (ws.bufferedAmount > 16 * 1024) {
            setTimeout(doSend)
            return
          }
          ws.send(smsg, { binary: true, compress: compression }, (err) => {
            if (err != null) {
              if (!`${err.message}`.includes('WebSocket is not open')) {
                ctx.error('send error', { err })
                Analytics.handleError(err)
                reject(err)
              }
              // In case socket not open, just resolve
              resolve()
            }
            resolve()
          })
        }
        doSend()
      })
      return smsg.length
    }
  }
  return cs
}
function wrapRes (res: FastifyReply): BlobResponse {
  return {
    aborted: false,
    cork: (cb) => {
      cb()
    },
    end: () => {},
    pipeFrom: (readable) => {
      void res.send(Readable.toWeb(readable))
    },
    status: (code) => {
      void res.status(code)
    },
    writeHead: (code, header) => {
      void res.status(code).headers(header)
    }
  }
}
