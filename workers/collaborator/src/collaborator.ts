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
import { type RouterType, Router, error } from 'itty-router'
import * as encoding from 'lib0/encoding'
import { applyUpdate, encodeStateAsUpdate } from 'yjs'

import { Document } from './document'
import { type Env } from './env'
import * as protocol from './protocol'
import type {
  AwarenessUpdate,
  DocumentRequest,
  RpcGetContentRequest,
  RpcRequest,
  RpcUpdateContentRequest
} from './types'
import { jsonToYDoc, yDocToJSON } from './ydoc'
import { parseDocumentName } from './utils'

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
  private readonly router: RouterType
  private readonly doc: Document
  private updates: Uint8Array[]
  private documentId: string = ''
  private hydrated: boolean = false

  constructor (ctx: DurableObjectState, env: Env) {
    super(ctx, env)

    this.router = Router()
      .get<DocumentRequest>('/:id', async ({ documentId, headers }) => {
      if (headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected header Upgrade: websocket', { status: 426 })
      }

      const { 0: client, 1: server } = new WebSocketPair()
      this.ctx.acceptWebSocket(server)
      await this.handleSession(server, documentId)

      return new Response(null, { status: 101, webSocket: client })
    })
      .post<DocumentRequest>('/rpc/:id', async (request) => {
      const rpc = await request.json<RpcRequest>()
      switch (rpc.method) {
        case 'getContent':
          return this.handleRpcGetContent(rpc)
        case 'updateContent':
          return this.handleRpcUpdateContent(rpc)
        default:
          return Response.json({ error: 'Bad request' }, { status: 400 })
      }
    })
      .all('*', () => error(404))

    this.doc = new Document()
    this.updates = []

    void this.hydrate()
  }

  handleRpcGetContent (request: RpcGetContentRequest): Response {
    const content: Record<string, string> = {}
    for (const field of this.doc.share.keys()) {
      content[field] = JSON.stringify(yDocToJSON(this.doc, field))
    }
    return Response.json({ content }, { status: 200 })
  }

  handleRpcUpdateContent (request: RpcUpdateContentRequest): Response {
    this.doc.transact(() => {
      Object.entries(request.payload.content).forEach(([field, value]) => {
        jsonToYDoc(JSON.parse(value), this.doc, field)
      })
    })

    return Response.json({}, { status: 200 })
  }

  async fetch (request: Request): Promise<Response> {
    return await this.router.fetch(request).catch(error)
  }

  async webSocketMessage (ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    if (typeof message === 'string') {
      console.warn('Unexpected message type:', message)
      return
    }

    try {
      const encoder = protocol.handleMessage(this.doc, new Uint8Array(message), ws)
      if (encoding.length(encoder) > 1) {
        ws.send(encoding.toUint8Array(encoder))
      }
    } catch (error) {
      console.error('WebSocket message error:', error)
    }
  }

  async webSocketClose (ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    console.log('WebSocket closed:', code, reason, wasClean)
    await this.handleClose(ws, 1000)
  }

  async webSocketError (ws: WebSocket, error: unknown): Promise<void> {
    console.error('WebSocket error:', error)
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

      if (documentId === '') {
        // name is not set, hydrate later
        return
      }

      this.documentId = documentId

      // restore document state
      await this.readDocument()

      this.ctx.getWebSockets().forEach((ws: WebSocket) => {
        this.doc.addConnection(ws)
      })

      // enable update listeners only after the document is restored
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.doc.on('update', this.handleDocUpdate.bind(this))
      this.doc.awareness.on('update', this.handleAwarenessUpdate.bind(this))

      this.hydrated = true
    })
  }

  async handleSession (ws: WebSocket, documentId: string): Promise<void> {
    if (this.documentId === '') {
      this.documentId = documentId
      await this.ctx.storage.put('documentId', documentId)
    }

    await this.hydrate()

    this.doc.addConnection(ws)

    const encoder = protocol.forceSyncMessage(this.doc)
    ws.send(encoding.toUint8Array(encoder))

    const clients = Array.from(this.doc.awareness.states.keys())
    if (clients.length > 0) {
      const encoder = protocol.awarenessMessage(this.doc, clients)
      ws.send(encoding.toUint8Array(encoder))
    }
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
    const wss = this.ctx
      .getWebSockets()
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
    } catch (error) {
      console.error('Failed to send message:', error)
      await this.handleClose(ws, 1011, 'error')
    }
  }

  async handleClose (ws: WebSocket, code: number, reason?: string): Promise<void> {
    const clients = this.ctx.getWebSockets().length

    try {
      ws.close(code, reason)
    } catch (err) {
      console.error('Failed to close WebSocket:', err)
    }

    this.doc.removeConnection(ws)

    // last client disconnected, write document
    if (clients === 1) {
      await this.writeDocument()
    }
  }

  async readDocument (): Promise<void> {
    console.log('reading document from storage')

    // restore document state from storage or datalake
    const { workspaceId, documentId } = parseDocumentName(this.documentId)

    // find the blob id containing last version
    const versions = await this.ctx.storage.list<string>({ prefix: 'version-', reverse: true, limit: 1 })
    const blobId = versions.values().next().value ?? documentId

    try {
      console.log('loading from datalake', workspaceId, documentId, blobId)
      const buffer = await this.env.DATALAKE.getBlob(workspaceId, blobId)
      applyUpdate(this.doc, new Uint8Array(buffer))

      console.log('loaded from datalake', workspaceId, documentId, blobId)
    } catch (err) {
      console.error('loading from datalake error', workspaceId, documentId, blobId, err)
      // the blob might be missing, ignore errors
    }

    // restore cached updates
    const updates = await this.ctx.storage.get<Array<Uint8Array>>('updates')
    if (updates !== undefined && updates.length > 0) {
      console.log('- restore updates', updates.length)
      this.doc.transact(() => {
        updates.forEach((update) => {
          applyUpdate(this.doc, update)
          this.updates.push(update)
        })
      })
    }

    // restore awareness state
    const awareness = await this.ctx.storage.get<Record<string, unknown>>('awareness')
    if (awareness !== undefined) {
      console.log('- restore awareness', awareness)
      this.doc.awareness.setLocalState(awareness)
    }
  }

  async writeDocument (): Promise<void> {
    await this.ctx.storage.deleteAlarm()

    console.log('saving document to storage')

    const updates = this.updates
    this.updates = []

    if (updates.length === 0) {
      console.log('no document updates to save')
      return
    }

    try {
      const { workspaceId, documentId } = parseDocumentName(this.documentId)
      const versionId = nextVersionId()
      const blobId = datalakeBlobId(documentId, versionId)

      const update = encodeStateAsUpdate(this.doc)
      await this.env.DATALAKE.putBlob(workspaceId, blobId, new Uint8Array(update), 'application/ydoc')

      void this.ctx.storage.put('updates', [])
      void this.ctx.storage.put('version-' + versionId, blobId)
      void this.ctx.storage.put('versionId', versionId)

      console.log('saved document', documentId, versionId, blobId)
    } catch (error) {
      // save failed, restore updates
      console.error('Failed to save document:', error)
      this.updates.push(...updates)
    }
  }
}

function nextVersionId (): number {
  return Date.now()
}

function datalakeBlobId (documentId: string, version: number): string {
  return `${documentId}-${version}`
}
