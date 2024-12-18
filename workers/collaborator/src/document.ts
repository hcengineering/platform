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

import { Doc as YDoc } from 'yjs'
import { Awareness, removeAwarenessStates } from 'y-protocols/awareness'

import * as encoding from 'lib0/encoding'
import * as protocol from './protocol'
import { type AwarenessUpdate } from './types'

export class Document extends YDoc {
  awareness: Awareness
  connections: Map<WebSocket, Set<number>>

  constructor () {
    super({ gc: false })

    this.connections = new Map()

    this.awareness = new Awareness(this)
    this.awareness.setLocalState(null)

    this.on('update', this.handleUpdate.bind(this))
    this.awareness.on('update', this.handleAwarenessUpdate.bind(this))
  }

  addConnection (ws: WebSocket): void {
    const state = ws.deserializeAttachment() ?? new Set()
    this.connections.set(ws, state)

    const awareness = this.awareness

    // Force sync document state
    const encoder = protocol.forceSyncMessage(this)
    ws.send(encoding.toUint8Array(encoder))

    // Force sync awareness state
    if (awareness.states.size > 0) {
      const clients = Array.from(awareness.states.keys())
      if (clients.length > 0) {
        const encoder = protocol.awarenessMessage(this, clients)
        ws.send(encoding.toUint8Array(encoder))
      }
    }
  }

  removeConnection (ws: WebSocket): void {
    closeConnection(this, ws)
  }

  handleMessage (message: Uint8Array, origin: WebSocket): void {
    try {
      const encoder = protocol.handleMessage(this, new Uint8Array(message), origin)
      if (encoding.length(encoder) > 1) {
        origin.send(encoding.toUint8Array(encoder))
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      console.error('WebSocket message error', { error })
    }
  }

  private handleUpdate (update: Uint8Array, origin: any): void {
    const encoder = protocol.updateMessage(update, origin)
    broadcast(this, encoding.toUint8Array(encoder), [origin])
  }

  private handleAwarenessUpdate ({ added, updated, removed }: AwarenessUpdate, origin: any): void {
    const changed = [...added, ...updated, ...removed]
    const encoder = protocol.awarenessMessage(this, changed)
    broadcast(this, encoding.toUint8Array(encoder))

    if (origin == null || !(origin instanceof WebSocket)) return

    if (added.length > 0 || removed.length > 0) {
      const connIDs = this.connections.get(origin)
      if (connIDs !== undefined) {
        added.forEach((client) => connIDs.add(client))
        removed.forEach((client) => connIDs.delete(client))

        origin.serializeAttachment(connIDs)
      }
    }
  }
}

function closeConnection (doc: Document, ws: WebSocket): void {
  if (doc.connections.has(ws)) {
    const connIDs = doc.connections.get(ws)
    doc.connections.delete(ws)

    if (connIDs !== undefined && connIDs.size > 0) {
      removeAwarenessStates(doc.awareness, Array.from(connIDs), null)
    }
  }

  try {
    ws.close()
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error('failed to close WebSocket', { error })
  }
}

function broadcast (doc: Document, message: Uint8Array, exclude: any[] = []): void {
  doc.connections.forEach((_, ws) => {
    if (!exclude.includes(ws)) {
      send(doc, ws, message)
    }
  })
}

function send (doc: Document, ws: WebSocket, message: Uint8Array): void {
  if (ws.readyState !== undefined && ws.readyState !== WebSocket.CONNECTING && ws.readyState !== WebSocket.OPEN) {
    closeConnection(doc, ws)
  }

  try {
    ws.send(message)
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error('failed to send message', { error })
    closeConnection(doc, ws)
  }
}
