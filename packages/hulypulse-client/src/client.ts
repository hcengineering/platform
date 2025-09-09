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

type Callback = (
  key: string,
  data: JSONValue,
  info: { msg: JSONObject; subscribed_key: string; run_index: number }
) => void

const WEBSOCKET_MESSAGE_CONSTANT_PING_REQUEST = 'ping'
const WEBSOCKET_MESSAGE_CONSTANT_PONG_RESPONSE = 'pong'

type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue }
interface JSONObject {
  [key: string]: JSONValue
}

interface GetFullResult<T> {
  data: T
  etag: string
  expiresAt: number
}

interface GetMessage {
  type: 'get'
  key: string
  correlation?: string
}

interface PutMessage {
  type: 'put'
  key: string
  data: JSONValue
  TTL?: number
  expiresAt?: number
  ifMatch?: string
  ifNoneMatch?: string
  correlation?: string
}

interface DeleteMessage {
  type: 'delete'
  key: string
  ifMatch?: string
  correlation?: string
}

interface SubscribeMessages {
  type: 'sub'
  key: string
  correlation?: string
}

interface UnsubscribeMessages {
  type: 'unsub'
  key: string
  correlation?: string
}

interface SubscribesList {
  type: 'list'
  correlation?: string
}

interface InfoMessage {
  type: 'info'
  correlation?: string
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
  
  private subscribes: Map<string, Callback[]> = new Map()

  private pingTimeout: ReturnType<typeof setTimeout> | undefined
  private pingInterval: ReturnType<typeof setInterval> | undefined
  private readonly PING_INTERVAL_MS = 30 * 1000
  private readonly PING_TIMEOUT_MS = 5 * 60 * 1000
  private readonly SEND_TIMEOUT_MS = 3000

  private correlationId = 1

  private pending = new Map<
    string,
    {
      resolve: (v: any) => void
      reject: (e: any) => void
      send_timeout: ReturnType<typeof setTimeout>
    }
  >()

  private constructor(private readonly url: string | URL) {}

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url.toString())
      this.ws = ws

      ws.onopen = () => {
        this.resubscribe()
        this.startPing()
        resolve()
      }

      ws.onerror = (event) => {
        this.reconnect()
      }

      ws.onclose = (event) => {
        this.reconnect()
      }

      ws.onmessage = (event) => {
        try {
          if (event.data === WEBSOCKET_MESSAGE_CONSTANT_PING_REQUEST) {
            this.ws?.send(WEBSOCKET_MESSAGE_CONSTANT_PONG_RESPONSE)
            return
          }

          if (event.data === WEBSOCKET_MESSAGE_CONSTANT_PONG_RESPONSE) {
            clearTimeout(this.pingTimeout)
            return
          }

          const msg = JSON.parse(event.data.toString())
          // Handle incoming messages (Set, Expired, Del)
          if (msg.message) {
            for (const [key, callbacks] of this.subscribes) {
              if (msg.key.startsWith(key)) {
                callbacks.forEach((cb, index) => {
                  try {
                    cb(msg.key, msg.message === 'Set' ? msg.value : undefined, {
                      msg: msg,
                      subscribed_key: key,
                      run_index: index
                    })
                  } catch (err) {
                    console.error(`Error in callback #${index} with key "${key}":`, err)
                  }
                })
              }
            }
          }
          // Handle correlation responses
          else if (msg.correlation) {
            let id = msg.correlation
            if (id && this.pending.has(id)) {
              clearTimeout(this.pending.get(id)!.send_timeout)
              this.pending.get(id)!.resolve(msg)
              this.pending.delete(id)
            }
          }
          // Handle unknown
          else {
            console.warn('Unknown message format:', msg)
          }
        } catch (e) {
          console.error('Failed to parse message', e)
        }
      }
    })
  }

  private resubscribe(): void {
    for (const key in this.subscribes) {
      this.send({ type: 'sub', key }).catch((error) => {
        throw new Error(`Resubscription failed for key=${key}: ${error.message ?? error}`)
      })
    }
  }

  private startPing(): void {
    clearInterval(this.pingInterval)
    this.pingInterval = setInterval(() => {
      if (this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(WEBSOCKET_MESSAGE_CONSTANT_PING_REQUEST)
      }
      clearTimeout(this.pingTimeout)
      this.pingTimeout = setTimeout(() => {
        if (this.ws !== null) {
          console.log('no response from server')
          clearInterval(this.pingInterval)
          this.ws.close(WS_CLOSE_NORMAL)
        }
      }, this.PING_TIMEOUT_MS)
    }, this.PING_INTERVAL_MS)
  }

  private stopPing(): void {
    clearInterval(this.pingInterval)
    this.pingInterval = undefined

    clearTimeout(this.pingTimeout)
    this.pingTimeout = undefined
  }

  [Symbol.dispose](): void {
    this.close()
  }

  private reconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }
    this.reconnectTimeout = undefined
    this.stopPing()

    if (!this.closed) {
      this.reconnectTimeout = setTimeout(() => {
        this.connect()
      }, this.RECONNECT_INTERVAL_MS)
    }
  }

  public close(): void {
    this.closed = true
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }
    this.reconnectTimeout = undefined
    this.stopPing()

    this.ws?.close()
  }

  static async connect(url: string | URL): Promise<HulypulseClient> {
    const client = new HulypulseClient(url)
    await client.connect()
    return client
  }

  public async info(): Promise<string> {
    const reply = await this.send({ type: 'info' })
    if (reply.error) {
      throw new Error(reply.error)
    }
    return reply.result || ''
  }

  public async list(): Promise<string> {
    const reply = await this.send({ type: 'list' })
    if (reply.error) {
      throw new Error(reply.error)
    }
    return reply.result || ''
  }

  public async subscribe<T>(key: string, callback: Callback): Promise<() => Promise<boolean>> {

    let list = this.subscribes.get(key)
    if (!list) {
      list = []
      this.subscribes.set(key, list)
    }

    if (!list.includes(callback)) {
      // Already subscribed?
      list.push(callback)
      if (list.length === 1) {
        const reply = await this.send({ type: 'sub', key })
        if (reply.error) {
          this.reconnect()
        }
      }
    }

    return async () => {
      return this.unsubscribe(key, callback)
    }
  }

  public async unsubscribe(key: string, callback: Callback): Promise<boolean> {
    const list = this.subscribes.get(key)
    if (!list || !list.includes(callback)) {
      return false
    }
    const newList = list.filter((cb) => cb !== callback)
    if (newList.length === 0) {
      this.subscribes.delete(key)
      const reply = await this.send({ type: 'unsub', key })
      if (reply.error) {
        this.reconnect()
        return true
      }
    } else {
      this.subscribes.set(key, newList)
    }
    return true
  }

  public async put<T extends JSONValue>(key: string, data: T, ttl: number): Promise<void>
  public async put<T extends JSONValue>(
    key: string,
    data: T,
    options?: Pick<PutMessage, 'ifMatch' | 'ifNoneMatch' | 'TTL' | 'expiresAt'>
  ): Promise<void>
  public async put<T extends JSONValue>(
    key: string,
    data: T,
    third?: number | Pick<PutMessage, 'ifMatch' | 'ifNoneMatch' | 'TTL' | 'expiresAt'>
  ): Promise<void> {
    const message: PutMessage = { type: 'put', key, data, ...(typeof third === 'number' ? { TTL: third } : third) }
    const reply = await this.send(message)
    if (reply.error) {
      throw new Error(reply.error)
    }
  }

  public async get<T>(key: string): Promise<T | undefined> {
    const reply = await this.send({ type: 'get', key })
    if (reply.error) {
      if (reply.error == 'not found') {
        return undefined
      }
      throw new Error(reply.error)
    }
    return reply.result?.data
  }

  public async get_full<T>(key: string): Promise<GetFullResult<T> | undefined> {
    const reply = await this.send({ type: 'get', key })
    if (reply.error) {
      if (reply.error == 'not found') {
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

  public async delete(key: string, options?: Pick<DeleteMessage, 'ifMatch'>): Promise<boolean> {
    const message: DeleteMessage = { type: 'delete', key, ...options }
    const reply = await this.send(message)
    if (reply.error) {
      if (reply.error == 'not found') {
        return false
      }
      throw new Error(reply.error)
    }
    return true
  }

  private async send<M extends Omit<ProtocolMessage, 'correlation'>>(msg: M): Promise<any> {
    const id = String(this.correlationId++)
    const message = { ...msg, correlation: id.toString() } as M

    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('WebSocket is not open.'))
      }
      const send_timeout = setTimeout(() => {
        const pending = this.pending.get(id)
        if (pending !== undefined) {
          pending.reject(new Error('Timeout waiting for response'))
          this.pending.delete(id)
        }
      }, this.SEND_TIMEOUT_MS)
      this.pending.set(id, { resolve, reject, send_timeout })
      this.ws.send(JSON.stringify(message))
    })
  }
}