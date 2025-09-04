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

// import WebSocket from "ws"

type Callback = (data: any, key: string, index: number) => void

export class HulypulseClient implements Disposable {
  public ws: WebSocket | null = null
  public closed = false
  private reconnectTimeout: any | undefined
  private readonly RECONNECT_INTERVAL = 1000
  private subscribes: Record<string, Callback[]> = {}

  private pingTimeout: any | undefined
  private pingInterval: any | undefined
  private readonly PING_INTERVAL = 30 * 1000
  private readonly PING_TIMEOUT = 5 * 60 * 1000

  private readonly TIMEOUT = 3000

  private correlationId = 1
  private pending = new Map<
    number,
    { resolve: (v: any) => void; reject: (e: any) => void }
  >()

  private constructor(private readonly url: string | URL) {}

  private async connect(): Promise<void> {

    return new Promise((resolve, reject) => {

      const ws = new WebSocket(this.url.toString())
      this.ws = ws

      ws.onopen = () => {
        // resubscribe
        for (const key in this.subscribes) {
          this.send({ type: "sub", key }).catch((error) => {
            console.error("Resubscription failed:", key, error)
            reject(error)
          })
        }
	      this.startPing()
        resolve()
      }

      ws.onerror = (event) => {
        // console.warn("client websocket error", event)
        this.reconnect()
      }

      ws.onclose = (event) => {
        // console.warn("WebSocket.onclose")
        this.reconnect()
      }

      ws.onmessage = (event) => {
        try {

          if (event.data === 'ping') {
            this.ws?.send('pong')
      	    return
	        }

	        if (event.data === 'pong') {
      	    clearTimeout(this.pingTimeout)
      	    return
	        }

          const msg = JSON.parse(event.data.toString())
          // Handle incoming messages (Set, Expired, Del)
          if (msg.message) {
            for (const key in this.subscribes) {
              if (msg.key.startsWith(key)) {
                this.subscribes[key].forEach((cb, index) => {
                  try {
                    cb(msg, key, index)
                  } catch (err) {
                    console.error(`Error in callback #${index} with key "${key}":`, err)
                  }
                })
              }
            }
          }
          // Handle correlation responses
          else if (msg.correlation) {
            let id = Number(msg.correlation)
            if (id && this.pending.has(id)) {
                this.pending.get(id)!.resolve(msg)
                this.pending.delete(id)
              }
          }
          // Handle unknown
          else {
            console.warn("Unknown message format:", msg)
          }
        } catch (e) {
          console.error("Failed to parse message", e)
        }
      }

    })
  }

  private startPing (): void {
    // console.log('Starting ping')
    clearInterval(this.pingInterval)
    this.pingInterval = setInterval(() => {
      if (this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping')
      }
      clearTimeout(this.pingTimeout)
      this.pingTimeout = setTimeout(() => {
        if (this.ws !== null) {
          console.log('no response from server')
          clearInterval(this.pingInterval)
          this.ws.close(1000)
        }
      }, this.PING_TIMEOUT)
    }, this.PING_INTERVAL)
  }

  private stopPing (): void {
    // console.log('Stopping ping')
    clearInterval(this.pingInterval)
    this.pingInterval = undefined

    clearTimeout(this.pingTimeout)
    this.pingTimeout = undefined
  }


  [Symbol.dispose](): void {
    // console.warn("Disposing HulypulseClient")
    this.close()
  }

  private reconnect (): void {
    // console.warn('Reconnecting...')
    if(this.reconnectTimeout) clearTimeout(this.reconnectTimeout)
    this.reconnectTimeout = undefined
    this.stopPing()

    if(!this.closed) {
      this.reconnectTimeout = setTimeout(() => {
        this.connect()
      }, this.RECONNECT_INTERVAL)
    }
  }

  public close (): void {
    this.closed = true
    if(this.reconnectTimeout) clearTimeout(this.reconnectTimeout)
    this.reconnectTimeout = undefined
    this.stopPing()

    this.ws?.close()
  }

  static async connect(url: string | URL): Promise<HulypulseClient> {
    const client = new HulypulseClient(url)
    await client.connect()
    return client
  }

  // subscribe(key, callback)
  // return: Promise.resolve if success (true - subscribed now, false - already subscribed), Promise.reject if error
  public async subscribe(key: string, callback: Callback): Promise<boolean> {
    if (!this.subscribes[key]) {
      this.subscribes[key] = []
    }

    if (this.subscribes[key].includes(callback)) {
      return false // Already subscribed
    }

    this.subscribes[key].push(callback)

    if (this.subscribes[key].length === 1) {
      const reply = await this.send({ type: "sub", key })
      if (reply.error) {
        this.subscribes[key] = this.subscribes[key].filter(cb => cb !== callback)
        if (this.subscribes[key].length === 0) {
          delete this.subscribes[key]
        }
        throw new Error(reply.error)
      }
    }

    return true
  }

  // unsubscribe(key, callback)
  // return: Promise.resolve if success (true - unsubscribed now, false - already unsubscribed), Promise.reject if error
  public async unsubscribe(key: string, callback: Callback): Promise<boolean> {
    if (!this.subscribes[key] || !this.subscribes[key].includes(callback)) {
      return false
    }
    this.subscribes[key] = this.subscribes[key].filter(cb => cb !== callback)
    if (this.subscribes[key].length === 0) {
      delete this.subscribes[key]
      const reply = await this.send({ type: "unsub", key })
      if (reply.error) {
        this.subscribes[key] = this.subscribes[key] || []
        this.subscribes[key].push(callback)
        throw new Error(reply.error)
      }
    }
    return true
  }

  // put(key, value, TTL?)
  // return: Promise.resolve(true) if success
  public async put(key: string, data: string, TTL?: number): Promise<boolean> {
    try {
      const reply = await this.send({ type: "put", key, data, ...(TTL !== undefined ? { TTL } : {}) })
      if (reply.error) {
        throw new Error(reply.error)
      }
      return Promise.resolve(true)
    } catch (err) {
      return Promise.reject(""+err)
    }
  }

  // get(key)
  // return: Promise.resolve(value) if success, Promise.resolve(false) if not found, Promise.reject if error
  public async get(key: string): Promise<any> {
    try {
      const reply = await this.send({ type: "get", key })
      if (reply.error) {
        if(reply.error=="not found") {
          return Promise.resolve(false)
        }
        return Promise.reject(new Error(reply.error))
      }
      return reply.result?.data
    } catch (err) {
      return Promise.reject(""+err)
    }
  }

  // get_full(key)
  // return: Promise.resolve({data, etag, expires_at}) if success, Promise.resolve(false) if not found, Promise.reject if error
  public async get_full(key: string): Promise<any> {
    try {
      const reply = await this.send({ type: "get", key })
      if (reply.error) {
        if(reply.error=="not found") {
          return Promise.resolve(false)
        }
        return Promise.reject(new Error(reply.error))
      }
      return { data: reply.result.data, etag: reply.result.etag, expires_at: reply.result.expires_at }
    } catch (err) {
      return Promise.reject(""+err)
    }
  }

  // delete(key)
  // return: Promise.resolve if success (true - deleted now, false - not found), Promise.reject if error
  public async delete(key: string): Promise<boolean> {
    try {
      const reply = await this.send({ type: "delete", key })
      if (reply.error) {
        if(reply.error=="not found") {
          return Promise.resolve(false)
        }
        throw new Error(reply.error)
      }
      return Promise.resolve(true)
    } catch (err) {
      return Promise.reject("" + err)
    }
  }

  // send({}): Promise<any>
  public async send(arr: any): Promise<any> {
    const id = this.correlationId++
    arr.correlation = id.toString()

    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return Promise.reject(new Error("WebSocket is not open."))
      }
      this.pending.set(id, { resolve, reject })
      this.ws!.send(JSON.stringify(arr))
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.get(id)!.reject(new Error("Timeout waiting for response"))
          this.pending.delete(id)
        }
      }, this.TIMEOUT)
    })
  }

}