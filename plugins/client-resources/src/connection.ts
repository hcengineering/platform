//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import client, { ClientSocket, ClientSocketReadyState } from '@hcengineering/client'
import core, {
  Account,
  Class,
  ClientConnectEvent,
  ClientConnection,
  Doc,
  DocChunk,
  DocumentQuery,
  Domain,
  FindOptions,
  FindResult,
  LoadModelResponse,
  Ref,
  Timestamp,
  Tx,
  TxApplyIf,
  TxHandler,
  TxResult,
  TxWorkspaceEvent,
  WorkspaceEvent,
  generateId
} from '@hcengineering/core'
import { PlatformError, UNAUTHORIZED, broadcastEvent, getMetadata, unknownError } from '@hcengineering/platform'

import { HelloRequest, HelloResponse, ReqId, readResponse, serialize } from '@hcengineering/rpc'

const SECOND = 1000
const pingTimeout = 10 * SECOND
const hangTimeout = 5 * 60 * SECOND
const dialTimeout = 60 * SECOND

class RequestPromise {
  readonly promise: Promise<any>
  resolve!: (value?: any) => void
  reject!: (reason?: any) => void
  reconnect?: () => void
  constructor (readonly method: string, readonly params: any[]) {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
  }

  chunks?: { index: number, data: any[] }[]
}

class Connection implements ClientConnection {
  private websocket: ClientSocket | Promise<ClientSocket> | null = null
  private readonly requests = new Map<ReqId, RequestPromise>()
  private lastId = 0
  private readonly interval: number
  private sessionId: string | undefined
  private closed = false

  private pingResponse: number = Date.now()

  constructor (
    private readonly url: string,
    private readonly handler: TxHandler,
    private readonly onUpgrade?: () => void,
    private readonly onUnauthorized?: () => void,
    readonly onConnect?: (event: ClientConnectEvent) => Promise<void>
  ) {
    console.log('connection created')
    this.interval = setInterval(() => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises

      if (this.pingResponse !== 0 && Date.now() - this.pingResponse > hangTimeout) {
        // No ping response from server.
        const s = this.websocket

        if (!(s instanceof Promise)) {
          console.log('no ping response from server. Closing socket.', s, (s as any)?.readyState)
          // Trying to close connection and re-establish it.
          s?.close()
        } else {
          console.log('no ping response from server. Closing socket.', s)
          void s.then((s) => s.close())
        }
        this.websocket = null
      }

      void this.sendRequest({ method: 'ping', params: [] }).then(() => {
        this.pingResponse = Date.now()
      })
    }, pingTimeout)
  }

  async close (): Promise<void> {
    this.closed = true
    clearInterval(this.interval)
    if (this.websocket !== null) {
      if (this.websocket instanceof Promise) {
        await this.websocket.then((ws) => ws.close())
      } else {
        this.websocket.close(1000)
      }
      this.websocket = null
    }
  }

  delay = 1
  pending: Promise<ClientSocket> | undefined

  private async waitOpenConnection (): Promise<ClientSocket> {
    while (true) {
      try {
        const socket = await this.pending
        if (socket != null && socket.readyState === ClientSocketReadyState.OPEN) {
          return socket
        }
        this.pending = this.openConnection()
        await this.pending
        this.delay = 5
        return await this.pending
      } catch (err: any) {
        this.pending = undefined
        console.log('failed to connect', err)
        if (err?.code === UNAUTHORIZED.code) {
          this.onUnauthorized?.()
          throw err
        }
        await new Promise((resolve) => {
          setTimeout(() => {
            console.log(`delay ${this.delay} second`)
            resolve(null)
            if (this.delay !== 15) {
              this.delay++
            }
          }, this.delay * SECOND)
        })
      }
    }
  }

  sockets = 0

  incomingTimer: any

  private openConnection (): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      // Use defined factory or browser default one.
      const clientSocketFactory =
        getMetadata(client.metadata.ClientSocketFactory) ??
        ((url: string) => {
          const s = new WebSocket(url)
          s.binaryType = 'arraybuffer'
          return s as ClientSocket
        })

      if (this.sessionId === undefined) {
        // Find local session id in session storage.
        this.sessionId =
          typeof sessionStorage !== 'undefined'
            ? sessionStorage.getItem('session.id.' + this.url) ?? undefined
            : undefined
        console.log('find sessionId', this.sessionId)
        this.sessionId = this.sessionId ?? generateId()
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('session.id.' + this.url, this.sessionId)
        }
      }
      const websocket = clientSocketFactory(this.url + `?sessionId=${this.sessionId}`)
      const opened = false
      const socketId = this.sockets++
      let binaryResponse = false

      const dialTimer = setTimeout(() => {
        if (!opened) {
          websocket.close()
          reject(new PlatformError(unknownError('timeout')))
        }
      }, dialTimeout)

      websocket.onmessage = (event: MessageEvent) => {
        const resp = readResponse<any>(event.data, binaryResponse)
        if (resp.id === -1 && resp.result === 'hello') {
          if ((resp as HelloResponse).binary) {
            binaryResponse = true
          }
          if (resp.error !== undefined) {
            reject(resp.error)
            return
          }
          for (const [, v] of this.requests.entries()) {
            v.reconnect?.()
          }
          resolve(websocket)
          console.log('reconnect info', (resp as HelloResponse).reconnect)

          void this.onConnect?.(
            (resp as HelloResponse).reconnect === true ? ClientConnectEvent.Reconnected : ClientConnectEvent.Connected
          )
          return
        }
        if (resp.id !== undefined) {
          const promise = this.requests.get(resp.id)
          if (promise === undefined) {
            throw new Error(`unknown response id: ${resp.id as string}`)
          }

          if (resp.chunk !== undefined) {
            promise.chunks = [
              ...(promise.chunks ?? []),
              {
                index: resp.chunk.index,
                data: resp.result as []
              }
            ]
            // console.log(socketId, 'chunk', promise.chunks.length, resp.chunk.total)
            if (resp.chunk.final) {
              promise.chunks.sort((a, b) => a.index - b.index)
              let result: any[] = []
              for (const c of promise.chunks) {
                result = result.concat(c.data)
              }
              resp.result = result
              resp.chunk = undefined
            } else {
              // Not all chunks are available yet.
              return
            }
          }

          this.requests.delete(resp.id)
          if (resp.error !== undefined) {
            console.log('ERROR', promise, resp.id)
            promise.reject(new PlatformError(resp.error))
          } else {
            promise.resolve(resp.result)
          }
          void broadcastEvent(client.event.NetworkRequests, this.requests.size)
        } else {
          const tx = resp.result as Tx
          if (
            (tx?._class === core.class.TxWorkspaceEvent && (tx as TxWorkspaceEvent).event === WorkspaceEvent.Upgrade) ||
            tx?._class === core.class.TxModelUpgrade
          ) {
            console.log('Processing upgrade')
            websocket.send(
              serialize(
                {
                  method: '#upgrading',
                  params: [],
                  id: -1
                },
                false
              )
            )
            this.onUpgrade?.()
            return
          }
          this.handler(tx)

          clearTimeout(this.incomingTimer)
          void broadcastEvent(client.event.NetworkRequests, this.requests.size + 1)

          this.incomingTimer = setTimeout(() => {
            void broadcastEvent(client.event.NetworkRequests, this.requests.size)
          }, 500)
        }
      }
      websocket.onclose = (ev) => {
        // console.log('client websocket closed', socketId, ev?.reason)

        if (!(this.websocket instanceof Promise)) {
          this.websocket = null
        }
        void broadcastEvent(client.event.NetworkRequests, -1)
        reject(new Error('websocket error'))
      }
      websocket.onopen = () => {
        const useBinary = getMetadata(client.metadata.UseBinaryProtocol) ?? true
        const useCompression = getMetadata(client.metadata.UseProtocolCompression) ?? false
        console.log('connection opened...', socketId, useBinary, useCompression)
        clearTimeout(dialTimer)
        const helloRequest: HelloRequest = {
          method: 'hello',
          params: [],
          id: -1,
          binary: useBinary,
          compression: useCompression
        }
        websocket.send(serialize(helloRequest, false))
      }
      websocket.onerror = (event: any) => {
        console.error('client websocket error:', socketId, event)
        void broadcastEvent(client.event.NetworkRequests, -1)
        reject(new Error(`websocket error:${socketId}`))
      }
    })
  }

  private async sendRequest (data: {
    method: string
    params: any[]
    // If not defined, on reconnect with timeout, will retry automatically.
    retry?: () => Promise<boolean>
  }): Promise<any> {
    if (this.closed) {
      throw new PlatformError(unknownError('connection closed'))
    }

    const id = this.lastId++
    const promise = new RequestPromise(data.method, data.params)

    const sendData = async (): Promise<void> => {
      if (this.websocket instanceof Promise) {
        this.websocket = await this.websocket
      }
      if (this.websocket === null) {
        this.websocket = this.waitOpenConnection()
        this.websocket = await this.websocket
      }
      this.requests.set(id, promise)
      this.websocket.send(
        serialize(
          {
            method: data.method,
            params: data.params,
            id
          },
          false
        )
      )
    }
    promise.reconnect = () => {
      setTimeout(async () => {
        // In case we don't have response yet.
        if (this.requests.has(id) && ((await data.retry?.()) ?? true)) {
          await sendData()
        }
      }, 500)
    }
    await sendData()
    void broadcastEvent(client.event.NetworkRequests, this.requests.size)
    return await promise.promise
  }

  async loadModel (last: Timestamp, hash?: string): Promise<Tx[] | LoadModelResponse> {
    return await this.sendRequest({ method: 'loadModel', params: [last, hash] })
  }

  async getAccount (): Promise<Account> {
    return await this.sendRequest({ method: 'getAccount', params: [] })
  }

  findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return this.sendRequest({ method: 'findAll', params: [_class, query, options] })
  }

  tx (tx: Tx): Promise<TxResult> {
    return this.sendRequest({
      method: 'tx',
      params: [tx],
      retry: async () => {
        if (tx._class === core.class.TxApplyIf) {
          return (
            (await (await this.findAll(core.class.Tx, { _id: (tx as TxApplyIf).txes[0]._id }, { limit: 1 })).length) ===
            0
          )
        }
        return (await (await this.findAll(core.class.Tx, { _id: tx._id }, { limit: 1 })).length) === 0
      }
    })
  }

  loadChunk (domain: Domain, idx?: number): Promise<DocChunk> {
    return this.sendRequest({ method: 'loadChunk', params: [domain, idx] })
  }

  closeChunk (idx: number): Promise<void> {
    return this.sendRequest({ method: 'closeChunk', params: [idx] })
  }

  loadDocs (domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return this.sendRequest({ method: 'loadDocs', params: [domain, docs] })
  }

  upload (domain: Domain, docs: Doc[]): Promise<void> {
    return this.sendRequest({ method: 'upload', params: [domain, docs] })
  }

  clean (domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    return this.sendRequest({ method: 'clean', params: [domain, docs] })
  }
}

/**
 * @public
 */
export async function connect (
  url: string,
  handler: TxHandler,
  onUpgrade?: () => void,
  onUnauthorized?: () => void,
  onConnect?: (event: ClientConnectEvent) => void
): Promise<ClientConnection> {
  return new Connection(url, handler, onUpgrade, onUnauthorized, async (event) => {
    onConnect?.(event)
  })
}
