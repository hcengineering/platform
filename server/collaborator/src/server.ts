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
import { MeasureContext, generateId, metricsAggregate } from '@hcengineering/core'
import { Token, decodeToken } from '@hcengineering/server-token'
import { ServerKit } from '@hcengineering/text'
import { Hocuspocus } from '@hocuspocus/server'
import bp from 'body-parser'
import compression from 'compression'
import cors from 'cors'
import express from 'express'
import { IncomingMessage, createServer } from 'http'
import { WebSocket, WebSocketServer } from 'ws'

import type { StorageAdapter } from '@hcengineering/server-core'
import { Config } from './config'
import { Context } from './context'
import { AuthenticationExtension } from './extensions/authentication'
import { StorageExtension } from './extensions/storage'
import { simpleClientFactory } from './platform'
import { RpcErrorResponse, RpcRequest, RpcResponse, methods } from './rpc'
import { PlatformStorageAdapter } from './storage/platform'
import { MarkupTransformer } from './transformers/markup'

/**
 * @public
 */
export type Shutdown = () => Promise<void>

/**
 * @public
 */
export async function start (ctx: MeasureContext, config: Config, minio: StorageAdapter): Promise<Shutdown> {
  const port = config.Port

  ctx.info('Starting collaborator server', { port })

  const app = express()
  app.use(cors())
  app.use(bp.json())
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
      level: 1,
      memLevel: 9
    })
  )

  const extensions = [
    ServerKit.configure({
      image: {
        getBlobRef: async (fileId, name, size) => {
          const sz = size !== undefined ? `&size=${size}` : ''
          return {
            src: `${config.UploadUrl}?file=${fileId}`,
            srcset: `${config.UploadUrl}?file=${fileId}${sz}`
          }
        }
      }
    })
  ]

  const extensionsCtx = ctx.newChild('extensions', {})

  const transformer = new MarkupTransformer(extensions)

  const hocuspocus = new Hocuspocus({
    address: '0.0.0.0',
    port,

    /**
     * Defines in which interval the server sends a ping, and closes the connection when no pong is sent back.
     */
    timeout: 30000,
    /**
     * Debounces the call of the `onStoreDocument` hook for the given amount of time in ms.
     * Otherwise every single update would be persisted.
     */
    debounce: 10000,
    /**
     * Makes sure to call `onStoreDocument` at least in the given amount of time (ms).
     */
    maxDebounce: 60000,
    /**
     * options to pass to the ydoc document
     */
    yDocOptions: {
      // we intentionally disable gc in order to make snapshots working
      // see https://github.com/yjs/yjs/blob/v13.5.52/src/utils/Snapshot.js#L162
      gc: false,
      gcFilter: () => false
    },
    /**
     * If set to false, respects the debounce time of `onStoreDocument` before unloading a document.
     * Otherwise, the document will be unloaded immediately.
     *
     * This prevents a client from DOSing the server by repeatedly connecting and disconnecting when
     * your onStoreDocument is rate-limited.
     */
    unloadImmediately: false,

    extensions: [
      new AuthenticationExtension({
        ctx: extensionsCtx.newChild('authenticate', {})
      }),
      new StorageExtension({
        ctx: extensionsCtx.newChild('storage', {}),
        adapter: new PlatformStorageAdapter({ minio }, transformer)
      })
    ]
  })

  const rpcCtx = ctx.newChild('rpc', {})

  const getContext = (token: Token): Context => {
    return {
      connectionId: generateId(),
      workspaceId: token.workspace,
      clientFactory: simpleClientFactory(token)
    }
  }

  app.get('/api/v1/statistics', (req, res) => {
    try {
      const token = req.query.token as string
      const payload = decodeToken(token)
      const admin = payload.extra?.admin === 'true'
      res.status(200)
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'public, no-store, no-cache, must-revalidate, max-age=0')

      const json = JSON.stringify({
        metrics: metricsAggregate((ctx as any).metrics),
        statistics: {
          activeSessions: {}
        },
        admin
      })
      res.end(json)
    } catch (err: any) {
      ctx.error('statistics error', { err })
      Analytics.handleError(err)
      res.writeHead(404, {})
      res.end()
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/rpc', async (req, res) => {
    const authHeader = req.headers.authorization
    if (authHeader === undefined) {
      res.status(403).send({ error: 'Unauthorized' })
      return
    }

    const request = req.body as RpcRequest
    const method = methods[request.method]
    if (method === undefined) {
      const response: RpcErrorResponse = {
        error: 'Unknown method'
      }
      res.status(400).send(response)
    } else {
      const token = decodeToken(authHeader.split(' ')[1])
      const context = getContext(token)

      rpcCtx.info('rpc', { method: request.method, connectionId: context.connectionId, mode: token.extra?.mode ?? '' })
      await rpcCtx.with('/rpc', { method: request.method }, async (ctx) => {
        try {
          const response: RpcResponse = await rpcCtx.with(request.method, {}, async (ctx) => {
            return await method(ctx, context, request.payload, { hocuspocus, minio, transformer })
          })
          res.status(200).send(response)
        } catch (err: any) {
          res.status(500).send({ error: err.message })
        }
      })
    }
  })

  const wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 32 * 1024,
        memLevel: 9,
        level: 1
      },
      zlibInflateOptions: {
        chunkSize: 32 * 1024,
        memLevel: 9,
        level: 1
      },
      // Below options specified as default values.
      concurrencyLimit: 10, // Limits zlib concurrency for perf.
      threshold: 1024 // Size (in bytes) below which messages
      // should not be compressed if context takeover is disabled.
    }
  })

  wss.on('connection', (incoming: WebSocket, request: IncomingMessage) => {
    const context: Partial<Context> = { connectionId: generateId() }
    hocuspocus.handleConnection(incoming, request, context)
  })

  const server = createServer(app)

  server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
    })
  })

  server.listen(port)

  ctx.info('Running collaborator server', { port })

  return async () => {
    server.close()
  }
}
