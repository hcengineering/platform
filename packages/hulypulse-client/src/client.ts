//
// Copyright © 2025 Hardcore Engineering Inc.
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

const WS_CLOSE_NORMAL = 1000

export type UnsubscribeCallback = () => Promise<boolean>

export type Callback<T> = (key: string, data: T | undefined) => void

interface GetFullResult<T> {
  data: T
  etag: string
  expiresAt: number
}

type Command = 'sub' | 'unsub' | 'put' | 'get' | 'delete' | 'list' | 'sublist' | 'info'

interface SubscribedMessage {
  message: 'Set' | 'Del' | 'Unlink' | 'Expired'
  key: string
  value?: string
}

interface CommandMessage {
  command: Command
  correlation: string
  result: any
}

interface ErrorCommandMessage {
  error: string
  command: Command
  correlation: string
}

type PulseIncomingMessage = SubscribedMessage | CommandMessage | ErrorCommandMessage

interface GetMessage {
  type: 'get'
  key: string
}

interface PutMessage {
  type: 'put'
  key: string
  data: string
  TTL?: number
  expiresAt?: number
  ifMatch?: string
  ifNoneMatch?: string
}

interface DeleteMessage {
  type: 'delete'
  key: string
  ifMatch?: string
}

interface SubscribeMessages {
  type: 'sub'
  key: string
}

interface UnsubscribeMessages {
  type: 'unsub'
  key: string
}

interface SubscribesList {
  type: 'list'
}

interface InfoMessage {
  type: 'info'
}

type ProtocolMessage =
  | GetMessage
  | PutMessage
  | DeleteMessage
  | SubscribeMessages
  | UnsubscribeMessages
  | SubscribesList
  | InfoMessage

export class HulypulseClient implements Disposable {
  private ws: WebSocket | null = null
  private closed = false
  private reconnectTimeout: any | undefined
  private readonly RECONNECT_INTERVAL_MS = 1000

  private readonly subscribes = new Map<string, Callback<any>[]>()

  private pingTimeout: ReturnType<typeof setTimeout> | undefined
  private pingInterval: ReturnType<typeof setInterval> | undefined
  private readonly PING_INTERVAL_MS = 30 * 1000
  private readonly PING_TIMEOUT_MS = 5 * 60 * 1000
  private readonly SEND_TIMEOUT_MS = 3000

  private correlationId = 1

  private readonly pending = new Map<
  string,
  {
    resolve: (v: any) => void
    reject: (e: any) => void
    send_timeout: ReturnType<typeof setTimeout>
  }
  >()

  private constructor (private readonly url: string | URL) {}

  private async connect (): Promise<void> {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url.toString())
      this.ws = ws

      ws.onopen = () => {
        this.resubscribe()
        this.startPing()
        resolve(undefined)
      }

      ws.onerror = (event) => {
        this.reconnect()
      }

      ws.onclose = (event) => {
        this.reconnect()
      }

      ws.onmessage = (event) => {
        try {
          if (event.data === 'ping') {
            this.ws?.send('pong')
            return
          }
          if (event.data === 'pong') {
            return
          }

          const msg: PulseIncomingMessage = JSON.parse(event.data.toString())

          // Handle incoming messages (Set, Expired, Del)
          if ('message' in msg) {
            for (const [key, callbacks] of this.subscribes) {
              if (msg.key.startsWith(key)) {
                callbacks.forEach((cb, index) => {
                  try {
                    const value = msg.message === 'Set' && msg.value !== undefined ? JSON.parse(msg.value) : undefined
                    cb(msg.key, value)
                  } catch (err) {
                    console.error(`Error in callback #${index} with key "${key}":`, err)
                  }
                })
              }
            }
          } else if ('correlation' in msg) {
            const id = msg.correlation
            if (id !== undefined && this.pending.has(id)) {
              const pending = this.pending.get(id)
              if (pending !== undefined) {
                clearTimeout(pending.send_timeout)
                this.pending.delete(id)
                if ('error' in msg) {
                  pending.reject(new Error(msg.error))
                } else {
                  pending.resolve(msg)
                }
              }
            }
          } else {
            console.warn('Unknown message format:', msg)
          }
        } catch (e) {
          console.error('Failed to parse message', e)
        }
      }
    })
  }

  private resubscribe (): void {
    for (const [key, callbacks] of this.subscribes) {
      this.send({ type: 'sub', key }).catch((error) => {
        throw new Error(`Resubscription failed for key=${key}: ${error.message ?? error}`)
      })
    }
  }

  private startPing (): void {
    this.stopPing()
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send('ping')
      }
      if (this.pingTimeout !== undefined) {
        clearTimeout(this.pingTimeout)
      }
      this.pingTimeout = setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          console.warn('WS-server not responding to ping, closing connection')
          clearInterval(this.pingInterval)
          this.ws?.close(WS_CLOSE_NORMAL)
        }
      }, this.PING_TIMEOUT_MS)
    }, this.PING_INTERVAL_MS)
  }

  private stopPing (): void {
    if (this.pingInterval !== undefined) {
      clearInterval(this.pingInterval)
      this.pingInterval = undefined
    }
    if (this.pingTimeout !== undefined) {
      clearTimeout(this.pingTimeout)
      this.pingTimeout = undefined
    }
  }

  [Symbol.dispose] (): void {
    this.close()
  }

  private reconnect (): void {
    if (this.reconnectTimeout !== undefined) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = undefined
    }
    this.stopPing()

    if (!this.closed) {
      this.reconnectTimeout = setTimeout(() => {
        void this.connect()
      }, this.RECONNECT_INTERVAL_MS)
    }
  }

  public close (): void {
    this.closed = true
    if (this.reconnectTimeout !== undefined) {
      clearTimeout(this.reconnectTimeout)
    }
    this.reconnectTimeout = undefined
    this.stopPing()

    this.ws?.close()
  }

  static async connect (url: string | URL): Promise<HulypulseClient> {
    const client = new HulypulseClient(url)
    await client.connect()
    return client
  }

  public async info (): Promise<string> {
    const reply = await this.send({ type: 'info' })
    if (reply.error !== undefined) {
      throw new Error(reply.error)
    }
    return reply.result ?? ''
  }

  public async list (): Promise<string> {
    const reply = await this.send({ type: 'list' })
    if (reply.error !== undefined) {
      throw new Error(reply.error)
    }
    return reply.result ?? ''
  }

  public async subscribe (key: string, callback: Callback<any>): Promise<UnsubscribeCallback> {
    let list = this.subscribes.get(key)
    if (list === undefined) {
      list = []
      this.subscribes.set(key, list)
    }

    if (!list.includes(callback)) {
      // Already subscribed?
      list.push(callback)
      if (list.length === 1) {
        const reply = await this.send({ type: 'sub', key })
        if (reply.error !== undefined) {
          throw new Error(reply.error)
        }
      }
    }

    // callback for every old item (expires_at > 1 sec for atomicity)
    const prevlist = await this.send({ type: 'list', key })
    if (prevlist.error !== undefined) {
      throw new Error(prevlist.error)
    } else if (Array.isArray(prevlist.result)) {
      for (const item of prevlist.result) {
        try {
          const value = item.data !== undefined ? JSON.parse(item.data) : undefined
          if (item.expires_at <= 1 || value === undefined) {
            continue
          }
          callback(item.key, value)
        } catch (err) {
          console.error('Error in initial callback', err)
        }
      }
    }

    return async () => {
      return await this.unsubscribe(key, callback)
    }
  }

  public async unsubscribe (key: string, callback: Callback<any>): Promise<boolean> {
    const list = this.subscribes.get(key)
    if (list === undefined || !list.includes(callback)) {
      return false
    }
    const newList = list.filter((cb) => cb !== callback)
    if (newList.length === 0) {
      this.subscribes.delete(key)
      const reply = await this.send({ type: 'unsub', key })
      if (reply?.error !== undefined) {
        throw new Error(reply.error)
      }
    } else {
      this.subscribes.set(key, newList)
    }
    return true
  }

  public async put (key: string, data: any, ttl: number): Promise<void>
  public async put (
    key: string,
    data: any,
    options?: Pick<PutMessage, 'ifMatch' | 'ifNoneMatch' | 'TTL' | 'expiresAt'>
  ): Promise<void>
  public async put (
    key: string,
    data: any,
    third?: number | Pick<PutMessage, 'ifMatch' | 'ifNoneMatch' | 'TTL' | 'expiresAt'>
  ): Promise<void> {
    const message: Omit<PutMessage, 'correlation'> = {
      type: 'put',
      key,
      data: JSON.stringify(data),
      ...(typeof third === 'number' ? { TTL: third } : third)
    }
    const reply = await this.send(message)
    if (reply.error !== undefined) {
      throw new Error(reply.error)
    }
  }

  public async get<T>(key: string): Promise<T | undefined> {
    const reply = await this.send({ type: 'get', key })
    if (reply.error !== undefined) {
      if (reply.error === 'not found') {
        return undefined
      }
      throw new Error(reply.error)
    }
    return reply.result?.data
  }

  public async get_full<T>(key: string): Promise<GetFullResult<T> | undefined> {
    const reply = await this.send({ type: 'get', key })
    if (reply.error !== undefined) {
      if (reply.error === 'not found') {
        return undefined
      }
      throw new Error(reply.error)
    }
    return {
      data: reply.result.data,
      etag: reply.result.etag,
      expiresAt: reply.result.expiresAt
    }
  }

  public async delete (key: string, options?: Pick<DeleteMessage, 'ifMatch'>): Promise<boolean> {
    const message: Omit<DeleteMessage, 'correlation'> = { type: 'delete', key, ...options }
    const reply = await this.send(message)
    if (reply.error !== undefined) {
      if (reply.error === 'not found') {
        return false
      }
      throw new Error(reply.error)
    }
    return true
  }

  private async send<M extends Omit<ProtocolMessage, 'correlation'>>(msg: M): Promise<any> {
    const id = String(this.correlationId++)
    const message = { ...msg, correlation: id.toString() } satisfies M

    return await new Promise((resolve, reject) => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        resolve({ error: 'WebSocket is not open.' })
        return
      }
      const sendTimeout = setTimeout(() => {
        const pending = this.pending.get(id)
        if (pending !== undefined) {
          pending.resolve({ error: 'Timeout waiting for response' })
          this.pending.delete(id)
        }
      }, this.SEND_TIMEOUT_MS)
      this.pending.set(id, { resolve, reject, send_timeout: sendTimeout })
      this.ws.send(JSON.stringify(message))
      this.startPing() // reset ping timer on any send
    })
  }
}

export function escapeString (str: string): string {
  // eslint-disable-next-line no-control-regex, no-useless-escape
  return str.replace(/[*?\[\]\\\x00-\x1F\x7F"']/g, '_')
}
