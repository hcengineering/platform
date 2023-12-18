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

import { MeasureContext } from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import { defaultExtensions } from '@hcengineering/text'
import { Hocuspocus, onAuthenticatePayload } from '@hocuspocus/server'
import bp from 'body-parser'
import compression from 'compression'
import cors from 'cors'
import express from 'express'
import { IncomingMessage, createServer } from 'http'
import { WebSocket, WebSocketServer } from 'ws'

import { Config } from './config'
import { ActionsExtension } from './extensions/action'
import { Context, buildContext } from './context'
import { MinioStorageExtension } from './extensions/storage/minio'
import { PlatformStorageExtension } from './extensions/storage/platform'
import { RoutedStorageExtension } from './extensions/storage/router'
import { HtmlTransformer } from './transformers/html'

const gcEnabled = process.env.GC !== 'false' && process.env.GC !== '0'

/**
 * @public
 */
export function start (ctx: MeasureContext, config: Config, minio: MinioService): () => void {
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
      new ActionsExtension({
        ctx: ctx.newChild('actions', {}),
        transformer: new HtmlTransformer(defaultExtensions)
      }),
      new RoutedStorageExtension({
        default: 'minio',
        extensions: {
          minio: new MinioStorageExtension({
            ctx: ctx.newChild('minio', {}),
            minio,
            transactorUrl: config.TransactorUrl
          }),
          platform: new PlatformStorageExtension({
            ctx: ctx.newChild('platform', {}),
            transformer: new HtmlTransformer(defaultExtensions),
            transactorUrl: config.TransactorUrl
          })
        }
      })
    ],

    async onAuthenticate (data: onAuthenticatePayload): Promise<Context> {
      ctx.measure('authenticate', 1)

      return buildContext(data)
    }
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

  wss.on('connection', (incoming: WebSocket, request: IncomingMessage) => {
    hocuspocus.handleConnection(incoming, request)
  })

  const server = createServer(app)

  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
    })
  })

  server.listen(port)
  console.log(`started server on :${port}`)

  return () => {
    server.close()
  }
}
