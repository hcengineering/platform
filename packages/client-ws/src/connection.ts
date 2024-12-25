import type { Response, HelloRequest, RequestId, BroadcastEvent, Request } from '@communication/sdk-types'
import { encode, decode } from '@msgpack/msgpack'

const PING_TIMEOUT = 10000
const RECONNECT_TIMEOUT = 1000

export class WebSocketConnection {
  private ws!: WebSocket | Promise<WebSocket>
  private requests: { [key: RequestId]: { resolve: (response: any) => void; reject: (reason: any) => void } } = {}
  private lastId: number = 0

  private pingInterval: any
  private reconnectTimeout: any

  onEvent: (event: BroadcastEvent) => void = () => {}

  constructor(
    private url: string,
    private readonly binary: boolean = false
  ) {
    this.connect()
  }

  private connect(): void {
    const ws = new WebSocket(this.url)

    ws.onmessage = (event: MessageEvent) => {
      const response = deserializeResponse(event.data, this.binary)
      if (response.id !== undefined) {
        const handlers = this.requests[response.id]
        if (handlers === undefined) return
        delete this.requests[response.id]
        if (response.error !== undefined) {
          console.error('Websocket error', response.error)
          handlers.reject(response.error)
        } else {
          handlers.resolve(response.result)
        }
      } else {
        if (response.error !== undefined) {
          console.error('Websocket error', response.error)
        } else {
          const event = response.result as BroadcastEvent
          this.onEvent(event)
        }
      }
    }

    ws.onclose = () => {
      clearInterval(this.pingInterval)
      this.handleReconnect()
    }

    this.ws = new Promise((resolve, reject) => {
      ws.onopen = () => {
        const request: HelloRequest = { id: 'hello', method: 'hello', params: [], binary: this.binary }
        ws.send(serializeRequest(request, this.binary))
        clearInterval(this.pingInterval)
        this.pingInterval = setInterval(() => {
          void this.sendRequest({ method: 'ping', params: [] })
        }, PING_TIMEOUT)
        resolve(ws)
      }
      ws.onerror = (event: any) => {
        console.error('Websocket error', event)
        reject(new Error('Websocket error'))
      }
    })
  }

  private handleReconnect() {
    clearTimeout(this.reconnectTimeout)
    this.reconnectTimeout = setTimeout(() => {
      this.connect()
    }, RECONNECT_TIMEOUT)
  }

  async waitWs(): Promise<WebSocket> {
    if (this.ws instanceof Promise) {
      this.ws = await this.ws
    }
    return this.ws
  }

  async send(method: string, params: any[]): Promise<any> {
    const id = ++this.lastId
    return await this.sendRequest({ id: id.toString(), method, params })
  }

  private async sendRequest(request: Request): Promise<any> {
    const ws = await this.waitWs()

    return new Promise((resolve, reject) => {
      if (request.id !== undefined) {
        this.requests[request.id] = { resolve, reject }
      }
      ws.send(serializeRequest(request, this.binary))
    })
  }

  async close(): Promise<void> {
    clearInterval(this.pingInterval)
    clearTimeout(this.reconnectTimeout)
    const ws = await this.waitWs()
    ws.close()
  }
}

function serializeRequest(request: Request, binary: boolean): any {
  if (binary) {
    return encode(request)
  } else {
    return JSON.stringify(request)
  }
}

function deserializeResponse(data: any, binary: boolean): Response {
  if (binary) {
    return decode(data) as Response
  } else {
    return JSON.parse(data.toString())
  }
}
