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
import { MinioService } from '@hcengineering/minio'
import { UNAUTHORIZED } from '@hcengineering/platform'
import { Response, serialize } from '@hcengineering/rpc'
import { Token, decodeToken } from '@hcengineering/server-token'
import { ServerKit } from '@hcengineering/text'
import { Hocuspocus, onAuthenticatePayload, onDestroyPayload } from '@hocuspocus/server'
import bp from 'body-parser'
import compression from 'compression'
import cors from 'cors'
import express from 'express'
import { IncomingMessage, createServer } from 'http'
import { MongoClient } from 'mongodb'
import { WebSocket, WebSocketServer } from 'ws'

import { Config } from './config'
import { Context, buildContext } from './context'
import { ActionsExtension } from './extensions/action'
import { StateExtension } from './extensions/state'
import { StorageExtension } from './extensions/storage'
import { Controller, getClientFactory } from './platform'
import { MinioStorageAdapter } from './storage/minio'
import { MongodbStorageAdapter } from './storage/mongodb'
import { PlatformStorageAdapter } from './storage/platform'
import { RouterStorageAdapter } from './storage/router'
import { HtmlTransformer } from './transformers/html'
import { Server } from './ws/server'
import { ClientSession } from './ws/session'

const gcEnabled = process.env.GC !== 'false' && process.env.GC !== '0'

/**
 * @public
 */
export type Shutdown = () => Promise<void>

/**
 * @public
 */
export async function start (
  ctx: MeasureContext,
  config: Config,
  minio: MinioService,
  mongo: MongoClient
): Promise<Shutdown> {
  const port = config.Port
  console.log(`starting server on :${port} ...`)

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
      level: 6
    })
  )

  const extensions = [
    ServerKit.configure({
      image: {
        uploadUrl: config.UploadUrl
      }
    })
  ]

  const extensionsCtx = ctx.newChild('extensions', {})
  const storageCtx = ctx.newChild('storage', {})

  const controller = new Controller()

  const transformer = new HtmlTransformer(extensions)

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
    maxDebounce: 30000,
    /**
     * options to pass to the ydoc document
     */
    yDocOptions: {
      gc: gcEnabled,
      gcFilter: () => true
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
      new StateExtension({ controller }),
      new ActionsExtension({
        ctx: extensionsCtx.newChild('actions', {}),
        transformer
      }),
      new StorageExtension({
        ctx: extensionsCtx.newChild('storage', {}),
        adapter: new RouterStorageAdapter(
          {
            minio: new MinioStorageAdapter(storageCtx.newChild('minio', {}), minio),
            mongodb: new MongodbStorageAdapter(storageCtx.newChild('mongodb', {}), mongo, transformer),
            platform: new PlatformStorageAdapter(storageCtx.newChild('platform', {}), transformer)
          },
          'minio'
        )
      })
    ],

    async onAuthenticate (data: onAuthenticatePayload): Promise<Context> {
      ctx.measure('authenticate', 1)
      return buildContext(data, controller)
    },

    async onDestroy (data: onDestroyPayload): Promise<void> {
      await controller.close()
    }
  })

  const contentserver = new Server(ctx.newChild('content', {}), (token) => {
    return new ClientSession(
      generateId(),
      token.workspace,
      getClientFactory(token, controller),
      hocuspocus,
      transformer
    )
  })

  const wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: {
      zlibDeflateOptions: {
        // See zlib defaults.
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      // Below options specified as default values.
      concurrencyLimit: 10, // Limits zlib concurrency for perf.
      threshold: 1024 // Size (in bytes) below which messages
      // should not be compressed if context takeover is disabled.
    }
  })

  wss.on('documents', (incoming: WebSocket, request: IncomingMessage) => {
    hocuspocus.handleConnection(incoming, request)
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  wss.on('content', async (incoming: WebSocket, request: IncomingMessage, token: Token) => {
    await contentserver.handleConnection(token, incoming, request)
  })

  const server = createServer(app)

  server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    const [path, query] = request?.url?.split('?', 2) ?? []

    if (path === config.ContentUrl) {
      const params = new URLSearchParams(query ?? '')
      const token = params.get('token')

      try {
        const decodedToken = decodeToken(token ?? '')
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('content', ws, request, decodedToken)
        })
      } catch (err) {
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
    } else {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('documents', ws, request)
      })
    }
  })

  server.listen(port)
  console.log(`started server on :${port}`)

  return async () => {
    server.close()
  }
}
