//
// Copyright © 2024-2025 Hardcore Engineering Inc.
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

import { myPresence, myData, isAnybodyInMyRoom, onPersonUpdate, onPersonLeave, onPersonData } from './store'
import type { RoomPresence, MyDataItem } from './types'

interface PresenceMessage {
  id: Ref<Person>
  type: 'update' | 'remove'
  presence?: RoomPresence[]
  lastUpdate?: number
}

interface DataMessage {
  type: 'data'
  sender: Ref<Person>
  topic: string
  data: any
}

type IncomingMessage = PresenceMessage | DataMessage

export class PresenceClient implements Disposable {
  private ws: WebSocket | null = null
  private closed = false
  private reconnectTimeout: number | undefined
  private pingTimeout: number | undefined
  private pingInterval: number | undefined
  private readonly RECONNECT_INTERVAL = 1000
  private readonly PING_INTERVAL = 30 * 1000
  private readonly PING_TIMEOUT = 5 * 60 * 1000
  private readonly myDataThrottleInterval = 100

  private presence: RoomPresence[]
  private readonly myDataTimestamps = new Map<string, number>()
  private readonly myPresenceUnsub: Unsubscriber
  private readonly myDataUnsub: Unsubscriber

  constructor (private readonly url: string | URL) {
    this.presence = get(myPresence)
    this.myPresenceUnsub = myPresence.subscribe((presence) => {
      this.handlePresenceChanged(presence)
    })
    this.myDataUnsub = myData.subscribe((data) => {
      this.handleMyDataChanged(data, false)
    })

    this.connect()
  }

  close (): void {
    this.closed = true
    clearTimeout(this.reconnectTimeout)
    this.stopPing()

    this.myPresenceUnsub()
    this.myDataUnsub()

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

  private startPing (): void {
    clearInterval(this.pingInterval)
    this.pingInterval = window.setInterval(() => {
      if (this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping')
      }
      clearTimeout(this.pingTimeout)
      this.pingTimeout = window.setTimeout(() => {
        if (this.ws !== null) {
          console.log('no response from server')
          clearInterval(this.pingInterval)
          this.ws.close(1000)
        }
      }, this.PING_TIMEOUT)
    }, this.PING_INTERVAL)
  }

  private stopPing (): void {
    clearInterval(this.pingInterval)
    this.pingInterval = undefined

    clearTimeout(this.pingTimeout)
    this.pingTimeout = undefined
  }

  private reconnect (): void {
    clearTimeout(this.reconnectTimeout)
    this.stopPing()

    if (!this.closed) {
      this.reconnectTimeout = window.setTimeout(() => {
        this.connect()
      }, this.RECONNECT_INTERVAL)
    }
  }

  private handleConnect (): void {
    this.sendPresence(getCurrentEmployee(), this.presence)
    this.startPing()
    this.handleMyDataChanged(get(myData), true)
  }

  private handleMessage (data: string): void {
    try {
      const message = JSON.parse(data) as IncomingMessage
      if (message.type === 'update' && message.presence !== undefined) {
        onPersonUpdate(message.id, message.presence ?? [])
      } else if (message.type === 'remove') {
        onPersonLeave(message.id)
      } else if (message.type === 'data') {
        onPersonData(message.sender, message.topic, message.data)
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
    this.handleMyDataChanged(get(myData), true)
  }

  private sendPresence (person: Ref<Person>, presence: RoomPresence[]): void {
    if (!this.closed && this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
      const message: PresenceMessage = { id: person, type: 'update', presence }
      this.ws.send(JSON.stringify(message))
    }
  }

  private handleMyDataChanged (data: Map<string, MyDataItem>, forceSend: boolean): void {
    if (!isAnybodyInMyRoom()) {
      return
    }
    if (!this.closed && this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
      for (const [topic, value] of data) {
        const lastSend = this.myDataTimestamps.get(topic) ?? 0
        if (value.lastUpdated >= lastSend + this.myDataThrottleInterval || forceSend) {
          this.myDataTimestamps.set(topic, value.lastUpdated)
          const message: DataMessage = {
            sender: getCurrentEmployee(),
            type: 'data',
            topic,
            data: value.data
          }
          this.ws.send(JSON.stringify(message))
        }
      }
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
