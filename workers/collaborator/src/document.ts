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
import { type AwarenessUpdate } from './types'

interface SessionState {
  clients: Set<number>
}

export class Document extends YDoc {
  awareness: Awareness
  sessions: Map<WebSocket, SessionState>

  constructor () {
    super({ gc: false })

    this.sessions = new Map()

    this.awareness = new Awareness(this)
    this.awareness.setLocalState(null)

    this.awareness.on('update', this.handleAwarenessUpdate.bind(this))
  }

  addConnection (ws: WebSocket): void {
    const state = ws.deserializeAttachment() ?? { clients: new Set() }
    this.sessions.set(ws, state)
  }

  removeConnection (ws: WebSocket): void {
    const state = this.sessions.get(ws)
    if (state !== undefined && state.clients.size > 0) {
      removeAwarenessStates(this.awareness, Array.from(state.clients), null)
    }

    this.sessions.delete(ws)
  }

  private handleAwarenessUpdate ({ added, removed }: AwarenessUpdate, origin: any): void {
    if (origin == null || !(origin instanceof WebSocket)) return

    if (added.length > 0 || removed.length > 0) {
      const state = this.sessions.get(origin)
      if (state !== undefined) {
        added.forEach((client) => state.clients.add(client))
        removed.forEach((client) => state.clients.delete(client))

        origin.serializeAttachment(state)
      }
    }
  }
}
