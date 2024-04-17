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

import { Analytics } from '@hcengineering/analytics'
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
  MeasureDoneOperation,
  Ref,
  SearchOptions,
  SearchQuery,
  SearchResult,
  Timestamp,
  Tx,
  TxApplyIf,
  TxApplyResult,
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
  constructor (
    readonly method: string,
    readonly params: any[],
    readonly handleResult?: (result: any) => Promise<void>
  ) {
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

  private upgrading: boolean = false

  private pingResponse: number = Date.now()

  constructor (
    private readonly url: string,
    private readonly handler: TxHandler,
    private readonly onUpgrade?: () => void,
    private readonly onUnauthorized?: () => void,
    readonly onConnect?: (event: ClientConnectEvent) => Promise<void>
  ) {
    this.interval = setInterval(() => {
      if (this.pingResponse !== 0 && Date.now() - this.pingResponse > hangTimeout) {
        // No ping response from server.
        const s = this.websocket

        if (!(s instanceof Promise)) {
          console.log('no ping response from server. Closing socket.', s, (s as any)?.readyState)
          // Trying to close connection and re-establish it.
          s?.close(1000)
        } else {
          console.log('no ping response from server. Closing socket.', s)
          void s.then((s) => {
            s.close(1000)
          })
        }
        this.websocket = null
      }

      if (!this.closed) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        void this.sendRequest({ method: 'ping', params: [] }).then(() => {
          this.pingResponse = Date.now()
        })
      } else {
        clearInterval(this.interval)
      }
    }, pingTimeout)
  }

  async close (): Promise<void> {
    this.closed = true
    clearInterval(this.interval)
    const closeEvt = serialize(
      {
        method: 'close',
        params: [],
        id: -1
      },
      false
    )
    if (this.websocket !== null) {
      if (this.websocket instanceof Promise) {
        await this.websocket.then((ws) => {
          ws.send(closeEvt)
          ws.close(1000)
        })
      } else {
        this.websocket.send(closeEvt)
        this.websocket.close(1000)
      }
      this.websocket = null
    }
  }

  delay = 0
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
        this.delay = 0
        return await this.pending
      } catch (err: any) {
        if (this.closed) {
          throw new Error('connection closed')
        }
        this.pending = undefined
        if (!this.upgrading) {
          console.log('connection: failed to connect', this.lastId)
        } else {
          console.log('connection: workspace during upgrade', this.lastId)
        }
        if (err?.code === UNAUTHORIZED.code) {
          Analytics.handleError(err)
          this.onUnauthorized?.()
          throw err
        }
        await new Promise((resolve) => {
          setTimeout(() => {
            if (!this.upgrading) {
              console.log(`delay ${this.delay} second`)
            }
            resolve(null)
            if (this.delay < 5) {
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
        if (resp.id === -1 && resp.result === 'upgrading') {
          this.upgrading = true
          return
        }
        if (resp.id === -1 && resp.result === 'hello') {
          this.upgrading = false
          if ((resp as HelloResponse).alreadyConnected === true) {
            this.sessionId = generateId()
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem('session.id.' + this.url, this.sessionId)
            }
            reject(new Error('alreadyConnected'))
          }
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

          void this.onConnect?.(
            (resp as HelloResponse).reconnect === true ? ClientConnectEvent.Reconnected : ClientConnectEvent.Connected
          )
          return
        }
        if (resp.result === 'ping') {
          void this.sendRequest({ method: 'ping', params: [] })
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

          const request = this.requests.get(resp.id)
          this.requests.delete(resp.id)
          if (resp.error !== undefined) {
            console.log(
              'ERROR',
              'request:',
              request?.method,
              'response-id:',
              resp.id,
              'error: ',
              resp.error,
              'result: ',
              resp.result
            )
            promise.reject(new PlatformError(resp.error))
          } else {
            if (request?.handleResult !== undefined) {
              void request.handleResult(resp.result).then(() => {
                promise.resolve(resp.result)
              })
            } else {
              promise.resolve(resp.result)
            }
          }
          void broadcastEvent(client.event.NetworkRequests, this.requests.size)
        } else {
          const txArr = Array.isArray(resp.result) ? (resp.result as Tx[]) : [resp.result as Tx]

          for (const tx of txArr) {
            if (
              (tx?._class === core.class.TxWorkspaceEvent &&
                (tx as TxWorkspaceEvent).event === WorkspaceEvent.Upgrade) ||
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
          }
          this.handler(...txArr)

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
        clearTimeout(dialTimer)
        const helloRequest: HelloRequest = {
          method: 'hello',
          params: [],
          id: -1,
          binary: useBinary,
          compression: useCompression,
          broadcast: true
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
    handleResult?: (result: any) => Promise<void>
  }): Promise<any> {
    if (this.closed) {
      throw new PlatformError(unknownError('connection closed'))
    }

    const id = this.lastId++
    const promise = new RequestPromise(data.method, data.params, data.handleResult)

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

  async measure (operationName: string): Promise<MeasureDoneOperation> {
    const dateNow = Date.now()

    // Send measure-start
    const mid = await this.sendRequest({
      method: 'measure',
      params: [operationName]
    })
    return async () => {
      const serverTime: number = await this.sendRequest({
        method: 'measure-done',
        params: [operationName, mid]
      })
      return {
        time: Date.now() - dateNow,
        serverTime
      }
    }
  }

  async loadModel (last: Timestamp, hash?: string): Promise<Tx[] | LoadModelResponse> {
    return await this.sendRequest({ method: 'loadModel', params: [last, hash] })
  }

  async getAccount (): Promise<Account> {
    return await this.sendRequest({ method: 'getAccount', params: [] })
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const st = Date.now()
    const result = await this.sendRequest({ method: 'findAll', params: [_class, query, options] })
    if (Date.now() - st > 1000) {
      console.error('measure slow findAll', Date.now() - st, _class, query, options, result)
    }
    return result
  }

  tx (tx: Tx): Promise<TxResult> {
    return this.sendRequest({
      method: 'tx',
      params: [tx],
      retry: async () => {
        if (tx._class === core.class.TxApplyIf) {
          return (await this.findAll(core.class.Tx, { _id: (tx as TxApplyIf).txes[0]._id }, { limit: 1 })).length === 0
        }
        return (await this.findAll(core.class.Tx, { _id: tx._id }, { limit: 1 })).length === 0
      },
      handleResult:
        tx._class === core.class.TxApplyIf
          ? async (result) => {
            if (tx._class === core.class.TxApplyIf) {
              // We need to check extra broadcast's and perform them before
              const r = result as TxApplyResult
              const dr = r?.derived ?? []
              if (dr.length > 0) {
                this.handler(...dr)
              }
            }
          }
          : undefined
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

  searchFulltext (query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    return this.sendRequest({ method: 'searchFulltext', params: [query, options] })
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
