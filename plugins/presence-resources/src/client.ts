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

import { type Ref, concatLink } from '@hcengineering/core'
import { getCurrentEmployee, type Person } from '@hcengineering/contact'
import { getMetadata } from '@hcengineering/platform'
import presence from '@hcengineering/presence'
import presentation from '@hcengineering/presentation'
import { type Unsubscriber, get } from 'svelte/store'

import { myPresence, onPersonUpdate, onPersonLeave } from './store'
import { type RoomPresence } from './types'

interface Message {
  id: Ref<Person>
  type: 'update' | 'remove'
  presence?: RoomPresence[]
  lastUpdate?: number
}

export class PresenceClient implements Disposable {
  private ws: WebSocket | null = null
  private closed = false
  private reconnectTimeout: number | undefined
  private readonly reconnectInterval = 1000

  private presence: RoomPresence[]
  private readonly myPresenceUnsub: Unsubscriber

  constructor (private readonly url: string | URL) {
    this.presence = get(myPresence)
    this.myPresenceUnsub = myPresence.subscribe((presence) => {
      this.handlePresenceChanged(presence)
    })

    this.connect()
  }

  close (): void {
    this.closed = true
    clearTimeout(this.reconnectTimeout)

    this.myPresenceUnsub()

    if (this.ws !== null) {
      this.ws.close()
      this.ws = null
    }
  }

  private connect (): void {
    try {
      const ws = new WebSocket(this.url)
      this.ws = ws

      ws.onopen = () => {
        if (this.ws !== ws) {
          return
        }

        this.handleConnect()
      }

      ws.onclose = (event: CloseEvent) => {
        if (this.ws !== ws) {
          ws.close()
          return
        }

        this.reconnect()
      }

      ws.onmessage = (event: MessageEvent) => {
        if (this.closed || this.ws !== ws) {
          return
        }

        this.handleMessage(event.data)
      }

      ws.onerror = (event: Event) => {
        if (this.ws !== ws) {
          return
        }

        console.log('client websocket error', event)
      }
    } catch (err: any) {
      this.reconnect()
    }
  }

  private reconnect (): void {
    clearTimeout(this.reconnectTimeout)

    if (!this.closed) {
      this.reconnectTimeout = window.setTimeout(() => {
        this.connect()
      }, this.reconnectInterval)
    }
  }

  private handleConnect (): void {
    this.sendPresence(getCurrentEmployee(), this.presence)
  }

  private handleMessage (data: string): void {
    try {
      const message = JSON.parse(data) as Message
      if (message.type === 'update' && message.presence !== undefined) {
        onPersonUpdate(message.id, message.presence ?? [])
      } else if (message.type === 'remove') {
        onPersonLeave(message.id)
      } else {
        console.warn('Unknown message type', message)
      }
    } catch (err: any) {
      console.error('Error parsing message', err, data)
    }
  }

  private handlePresenceChanged (presence: RoomPresence[]): void {
    this.presence = presence
    this.sendPresence(getCurrentEmployee(), this.presence)
  }

  private sendPresence (person: Ref<Person>, presence: RoomPresence[]): void {
    if (!this.closed && this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
      const message: Message = { id: person, type: 'update', presence }
      this.ws.send(JSON.stringify(message))
    }
  }

  [Symbol.dispose] (): void {
    this.close()
  }
}

export function connect (): PresenceClient | undefined {
  const wsUuid = getMetadata(presentation.metadata.WorkspaceUuid)
  if (wsUuid === undefined) {
    console.warn('Workspace uuid is not defined')
    return undefined
  }

  const token = getMetadata(presentation.metadata.Token)

  const presenceUrl = getMetadata(presence.metadata.PresenceUrl)
  if (presenceUrl === undefined || presenceUrl === '') {
    console.warn('Presence URL is not defined')
    return undefined
  }

  const url = new URL(concatLink(presenceUrl, wsUuid))
  if (token !== undefined) {
    url.searchParams.set('token', token)
  }

  return new PresenceClient(url)
}
