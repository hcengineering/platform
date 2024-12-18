//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { DurableObject } from 'cloudflare:workers'
import { type RouterType, type IRequest, Router, error } from 'itty-router'
import * as encoding from 'lib0/encoding'
import { applyUpdate, encodeStateAsUpdate } from 'yjs'

import { Document } from './document'
import { type Env } from './env'
import { ConsoleLogger, type MetricsContext, withMetrics } from './metrics'
import * as protocol from './protocol'
import type {
  AwarenessUpdate,
  RpcCreateContentRequest,
  RpcGetContentRequest,
  RpcRequest,
  RpcUpdateContentRequest
} from './types'
import { decodeDocumentId, extractStrParam, jsonBlobId, ydocBlobId } from './utils'
import { jsonToYDoc, yDocToJSON } from './ydoc'
import { ConnectionManager } from './connection'

export const PREFERRED_SAVE_SIZE = 500
export const PREFERRED_SAVE_INTERVAL = 30 * 1000

/**
 * YDoc state is stored as a series of updates in the Durable Object KV storage.
 *
 * Durable Object KV
 * - documentId: string, document Id as provided by the client
 * - versionId: string, latest document version Id
 * - version-*: string, maps version Id to datalake blob Id
 * - updates: Uint8Array[]: list of pending updates to be saved
 */
export class Collaborator extends DurableObject<Env> {
  private readonly logger = new ConsoleLogger()
  private readonly connections: ConnectionManager
  private readonly router: RouterType
  private readonly doc: Document
  private readonly updates: Uint8Array[]
  private documentId: string = ''
  private source: string = ''
  private hydrated: boolean = false

  constructor (ctx: DurableObjectState, env: Env) {
    super(ctx, env)

    this.connections = new ConnectionManager(this.ctx)
    this.doc = new Document()
    this.updates = []

    this.router = Router()
      .get('/:id', async (request) => {
        return await withMetrics('connnect', (ctx) => {
          return this.handleConnect(ctx, request)
        })
      })
      .post('/rpc/:id', async (request, env) => {
        return await withMetrics('rpc', (ctx) => {
          return this.handleRpc(ctx, request)
        })
      })
  }

  async fetch (request: Request): Promise<Response> {
    return await this.router.fetch(request).catch(error)
  }

  async handleConnect (ctx: MetricsContext, request: IRequest): Promise<Response> {
    const documentId = decodeURIComponent(request.params.id)
    const source = decodeURIComponent(extractStrParam(request.query.source) ?? '')
    const headers = request.headers

    if (headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected header Upgrade: websocket', { status: 426 })
    }

    const { 0: client, 1: server } = new WebSocketPair()
    this.connections.accept(server)

    await ctx.with('session', async (ctx) => {
      await this.handleSession(ctx, server, documentId, source)
    })

    return new Response(null, { status: 101, webSocket: client })
  }

  async handleRpc (ctx: MetricsContext, request: IRequest): Promise<Response> {
    const documentId = decodeURIComponent(request.params.id)
    const rpc = await request.json<RpcRequest>()

    return await ctx.with(rpc.method, async (ctx) => {
      try {
        switch (rpc.method) {
          case 'getContent':
            return this.handleRpcGetContent(ctx, documentId, rpc)
          case 'createContent':
            return await this.handleRpcCreateContent(ctx, documentId, rpc)
          case 'updateContent':
            return this.handleRpcUpdateContent(ctx, documentId, rpc)
          default:
            return Response.json({ error: 'Bad request' }, { status: 400 })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        ctx.error('failed to perform rpc request', { error: message })
        return error(500)
      }
    })
  }

  handleRpcGetContent (ctx: MetricsContext, id: string, request: RpcGetContentRequest): Response {
    const content: Record<string, string> = {}

    ctx.withSync('ydoc.read', () => {
      for (const field of this.doc.share.keys()) {
        content[field] = JSON.stringify(yDocToJSON(this.doc, field))
      }
    })

    return Response.json({ content }, { status: 200 })
  }

  async handleRpcCreateContent (ctx: MetricsContext, id: string, request: RpcCreateContentRequest): Promise<Response> {
    const documentId = decodeDocumentId(id)
    const content: Record<string, string> = {}

    ctx.withSync('ydoc.write', () => {
      this.doc.transact(() => {
        Object.entries(request.payload.content).forEach(([field, value]) => {
          jsonToYDoc(JSON.parse(value), this.doc, field)
        })
      })
    })

    for (const [field, value] of Object.entries(request.payload.content)) {
      const blobId = jsonBlobId(documentId)
      await ctx.with('datalake.putBlob', async () => {
        await this.env.DATALAKE.putBlob(documentId.workspaceId, blobId, value, 'application/json')
      })
      content[field] = blobId
    }

    return Response.json({ content }, { status: 200 })
  }

  handleRpcUpdateContent (ctx: MetricsContext, id: string, request: RpcUpdateContentRequest): Response {
    ctx.withSync('ydoc.write', () => {
      this.doc.transact(() => {
        Object.entries(request.payload.content).forEach(([field, value]) => {
          jsonToYDoc(JSON.parse(value), this.doc, field)
        })
      })
    })

    return Response.json({}, { status: 200 })
  }

  async webSocketMessage (ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    if (typeof message === 'string') {
      this.logger.warn('unexpected message type', { message })
      return
    }

    try {
      const encoder = protocol.handleMessage(this.doc, new Uint8Array(message), ws)
      if (encoding.length(encoder) > 1) {
        ws.send(encoding.toUint8Array(encoder))
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      this.logger.error('WebSocket message error', { error })
    }
  }

  async webSocketClose (ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    this.logger.log('WebSocket closed', { code, reason, wasClean })
    await this.handleClose(ws, 1000)
  }

  async webSocketError (ws: WebSocket, error: unknown): Promise<void> {
    this.logger.error('WebSocket error', { error })
    await this.handleClose(ws, 1011, 'error')
  }

  async alarm (): Promise<void> {
    await this.hydrate()
    await this.writeDocument()
  }

  async hydrate (): Promise<void> {
    if (this.hydrated) {
      return
    }

    await this.ctx.blockConcurrencyWhile(async () => {
      const documentId = (await this.ctx.storage.get<string>('documentId')) ?? ''
      const source = (await this.ctx.storage.get<string>('source')) ?? ''

      if (documentId === '') {
        // name is not set, hydrate later
        return
      }

      this.documentId = documentId
      this.source = source

      await withMetrics('hydrate', async (ctx) => {
        await ctx.with('readDocument', async (ctx) => {
          await this.readDocument(ctx)
        })

        ctx.withSync('restoreConnections', () => {
          const connections = this.connections.getConnections()
          connections.forEach((ws: WebSocket) => {
            this.doc.addConnection(ws)
          })
        })

        ctx.withSync('restoreListeners', () => {
          // enable update listeners only after the document is restored
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          this.doc.on('update', this.handleDocUpdate.bind(this))
          this.doc.awareness.on('update', this.handleAwarenessUpdate.bind(this))
        })
      })

      this.hydrated = true
    })
  }

  async handleSession (ctx: MetricsContext, ws: WebSocket, documentId: string, source: string): Promise<void> {
    if (this.documentId !== documentId) {
      this.documentId = documentId
      await this.ctx.storage.put('documentId', documentId)
    }

    if (this.source !== source) {
      this.source = source
      await this.ctx.storage.put('source', source)
    }

    await ctx.with('hydrate', async () => {
      await this.hydrate()
    })

    this.doc.addConnection(ws)

    ctx.withSync('forceSync', () => {
      const encoder = protocol.forceSyncMessage(this.doc)
      ws.send(encoding.toUint8Array(encoder))
    })

    ctx.withSync('awareness', () => {
      const clients = Array.from(this.doc.awareness.states.keys())
      if (clients.length > 0) {
        const encoder = protocol.awarenessMessage(this.doc, clients)
        ws.send(encoding.toUint8Array(encoder))
      }
    })
  }

  async handleAwarenessUpdate ({ added, updated, removed }: AwarenessUpdate, origin: any): Promise<void> {
    // broadcast awareness state
    const clients = [...added, ...updated, ...removed]
    const encoder = protocol.awarenessMessage(this.doc, clients)
    await this.broadcastMessage(encoding.toUint8Array(encoder))

    // persist awareness state
    const state = this.doc.awareness.getLocalState()
    await this.ctx.storage.put('awareness', state)
  }

  async handleDocUpdate (update: Uint8Array, origin: any): Promise<void> {
    // save update
    this.updates.push(update)
    await this.ctx.storage.put('updates', [...this.updates])

    await this.ctx.storage.setAlarm(Date.now() + PREFERRED_SAVE_INTERVAL)
    if (this.updates.length > PREFERRED_SAVE_SIZE) {
      void this.writeDocument()
    }

    // broadcast update
    const encoder = protocol.updateMessage(update, origin)
    await this.broadcastMessage(encoding.toUint8Array(encoder), origin)
  }

  async broadcastMessage (message: Uint8Array, origin?: any): Promise<void> {
    const connections = this.connections.getConnections()
    const wss = connections
      .filter((ws) => ws !== origin)
      .filter((ws) => ws.readyState === WebSocket.OPEN)
    const promises = wss.map(async (ws) => {
      await this.sendMessage(ws, message)
    })
    await Promise.all(promises)
  }

  async sendMessage (ws: WebSocket, message: Uint8Array): Promise<void> {
    try {
      ws.send(message)
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      this.logger.error('failed to send message', { error })
      await this.handleClose(ws, 1011, 'error')
    }
  }

  async handleClose (ws: WebSocket, code: number, reason?: string): Promise<void> {
    const clients = this.connections.count()

    try {
      ws.close(code, reason)
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      this.logger.error('failed to close WebSocket', { error })
    }

    this.doc.removeConnection(ws)

    // last client disconnected, write document
    if (clients === 1) {
      await this.writeDocument()
    }
  }

  async readDocument (ctx: MetricsContext): Promise<void> {
    // restore document state from storage or datalake
    const source = this.source
    const documentId = decodeDocumentId(this.documentId)
    const workspaceId = documentId.workspaceId

    const blobId = ydocBlobId(documentId)

    let loaded = false

    try {
      ctx.log('loading from datalake', { workspaceId, documentId, blobId })

      await ctx.with('fromYdoc', async (ctx) => {
        const buffer = await ctx.with('datalake.getBlob', () => {
          return this.env.DATALAKE.getBlob(workspaceId, blobId)
        })

        ctx.withSync('applyUpdate', () => {
          applyUpdate(this.doc, new Uint8Array(buffer))
        })

        loaded = true
        ctx.log('loaded from datalake', { workspaceId, documentId, blobId })
      })
    } catch (err) {
      // the blob might be missing, ignore errors
      const error = err instanceof Error ? err.message : String(err)
      ctx.error('loading from datalake error', { workspaceId, documentId, blobId, error })
    }

    if (!loaded && source !== '') {
      try {
        ctx.log('loading from datalake', { workspaceId, documentId, source })

        await ctx.with('fromJson', async (ctx) => {
          const buffer = await ctx.with('datalake.getBlob', () => {
            return this.env.DATALAKE.getBlob(workspaceId, source)
          })

          ctx.withSync('jsonToYDoc', () => {
            jsonToYDoc(JSON.parse(String(buffer)), this.doc, documentId.objectAttr)
          })

          ctx.log('loaded from datalake', { workspaceId, documentId, blobId })
        })
      } catch (err) {
        // the blob might be missing, ignore errors
        const error = err instanceof Error ? err.message : String(err)
        ctx.error('loading from datalake error', { workspaceId, documentId, source, error })
      }
    }

    // restore cached updates
    await ctx.with('restore updates', async () => {
      try {
        const updates = await this.ctx.storage.get<Array<Uint8Array>>('updates')
        if (updates !== undefined && updates.length > 0) {
          this.doc.transact(() => {
            updates.forEach((update) => {
              applyUpdate(this.doc, update)
              this.updates.push(update)
            })
          })
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        ctx.error('failed to restore updates', { workspaceId, documentId, error })
      }
    })

    // restore awareness state
    await ctx.with('restore awareness', async () => {
      try {
        const awareness = await this.ctx.storage.get<Record<string, unknown>>('awareness')
        if (awareness !== undefined) {
          this.doc.awareness.setLocalState(awareness)
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        ctx.error('failed to restore awareness', { workspaceId, documentId, error })
      }
    })
  }

  async writeDocument (): Promise<void> {
    await this.ctx.storage.deleteAlarm()

    const updates = this.updates.splice(0)
    if (updates.length === 0) {
      return
    }

    await withMetrics('write document', async (ctx) => {
      try {
        const documentId = decodeDocumentId(this.documentId)
        const workspaceId = documentId.workspaceId

        // save ydoc content
        const update = ctx.withSync('ydoc.encodeStateAsUpdate', () => encodeStateAsUpdate(this.doc))
        await ctx.with('datalake.putBlob', async () => {
          const blobId = ydocBlobId(documentId)
          await this.env.DATALAKE.putBlob(workspaceId, blobId, new Uint8Array(update), 'application/ydoc')
          ctx.log('saved ydoc content to datalake', { documentId, blobId })
        })

        void this.ctx.storage.put('updates', [])

        // save json snapshot
        const blobId = jsonBlobId(documentId)
        const markup = JSON.stringify(yDocToJSON(this.doc, documentId.objectAttr))
        await ctx.with('datalake.putBlob', async () => {
          await this.env.DATALAKE.putBlob(workspaceId, blobId, markup, 'application/json')
          ctx.log('saved json content to datalake', { documentId, blobId })
        })
      } catch (err) {
        // save failed, restore updates
        const error = err instanceof Error ? err.message : String(err)
        ctx.error('failed to save document', { documentId: this.documentId, error })
        this.updates.unshift(...updates)
      }
    })
  }
}
