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
import client, {
  ClientSocket,
  ClientSocketReadyState,
  pingConst,
  pongConst,
  type ClientFactoryOptions
} from '@hcengineering/client'
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
  MeasureMetricsContext,
  type PersonUuid,
  Ref,
  SearchOptions,
  SearchQuery,
  SearchResult,
  Timestamp,
  Tx,
  TxApplyIf,
  TxHandler,
  TxResult,
  type WorkspaceUuid,
  clone,
  generateId,
  toFindResult,
  type MeasureContext
} from '@hcengineering/core'
import platform, {
  PlatformError,
  Severity,
  Status,
  UNAUTHORIZED,
  broadcastEvent,
  getMetadata
} from '@hcengineering/platform'
import { uncompress } from 'snappyjs'

import { HelloRequest, HelloResponse, RPCHandler, ReqId, type Response } from '@hcengineering/rpc'

const SECOND = 1000
const pingTimeout = 10 * SECOND
const hangTimeout = 5 * 60 * SECOND
const dialTimeout = 30 * SECOND

class RequestPromise {
  startTime: number = Date.now()
  handleTime?: (diff: number, result: any, serverTime: number, queue: number, toRecieve: number) => void
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

  chunks?: { index: number, data: FindResult<any> }[]
}

const globalRPCHandler: RPCHandler = new RPCHandler()

class Connection implements ClientConnection {
  private websocket: ClientSocket | null = null
  binaryMode = false
  compressionMode = false
  private readonly requests = new Map<ReqId, RequestPromise>()
  private lastId = 0
  private interval: number | undefined
  private dialTimer: any | undefined

  private sockets = 0

  private incomingTimer: any

  private openAction: any

  private readonly sessionId: string | undefined
  private closed = false

  private upgrading: boolean = false

  private pingResponse: number = Date.now()

  private helloReceived: boolean = false

  private account: Account | undefined

  onConnect?: (event: ClientConnectEvent, lastTx: string | undefined, data: any) => Promise<void>

  rpcHandler: RPCHandler

  lastHash?: string

  constructor (
    private readonly ctx: MeasureContext,
    private readonly url: string,
    private readonly handler: TxHandler,
    readonly workspace: WorkspaceUuid,
    readonly user: PersonUuid,
    readonly opt?: ClientFactoryOptions
  ) {
    if (typeof sessionStorage !== 'undefined') {
      // Find local session id in session storage only if user refresh a page.
      const sKey = 'session.id.' + this.url
      let sessionId = sessionStorage.getItem(sKey) ?? undefined
      if (sessionId === undefined) {
        sessionId = generateId()
        console.log('Generate new SessionId', sessionId)
        this.sessionId = sessionId
      } else {
        this.sessionId = sessionId
        sessionStorage.removeItem(sKey)
      }
      window.addEventListener('beforeunload', () => {
        sessionStorage.setItem(sKey, sessionId as string)
      })
    } else {
      this.sessionId = generateId()
    }
    this.rpcHandler = opt?.useGlobalRPCHandler === true ? globalRPCHandler : new RPCHandler()

    this.onConnect = opt?.onConnect

    this.scheduleOpen(this.ctx, false)
  }

  async getLastHash (ctx: MeasureContext): Promise<string | undefined> {
    await this.waitOpenConnection(ctx)
    return this.lastHash
  }

  private schedulePing (socketId: number): void {
    clearInterval(this.interval)
    this.pingResponse = Date.now()
    const wsocket = this.websocket
    const interval = setInterval(() => {
      if (wsocket !== this.websocket) {
        clearInterval(interval)
        return
      }
      if (!this.upgrading && this.pingResponse !== 0 && Date.now() - this.pingResponse > hangTimeout) {
        // No ping response from server.

        if (this.websocket !== null) {
          console.log('no ping response from server. Closing socket.', socketId, this.workspace, this.user)
          clearInterval(this.interval)
          this.websocket.close(1000)
          return
        }
      }

      if (!this.closed) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        void this.sendRequest({
          method: pingConst,
          params: [],
          once: true,
          handleResult: async (result) => {
            if (this.websocket === wsocket) {
              this.pingResponse = Date.now()
            }
          }
        }).catch((err) => {
          this.ctx.error('failed to send msg', { err })
        })
      } else {
        clearInterval(this.interval)
      }
    }, pingTimeout)
    this.interval = interval
  }

  async close (): Promise<void> {
    this.closed = true
    clearTimeout(this.openAction)
    clearTimeout(this.dialTimer)
    clearInterval(this.interval)
    if (this.websocket !== null) {
      this.websocket.close(1000)
      this.websocket = null
    }
  }

  isConnected (): boolean {
    return this.websocket != null && this.websocket.readyState === ClientSocketReadyState.OPEN && this.helloReceived
  }

  delay = 0
  onConnectHandlers: (() => void)[] = []

  private waitOpenConnection (ctx: MeasureContext): Promise<void> | undefined {
    if (this.isConnected()) {
      return undefined
    }

    return ctx.with(
      'wait-connection',
      {},
      (ctx) =>
        new Promise((resolve) => {
          this.onConnectHandlers.push(() => {
            resolve()
          })
          // Websocket is null for first time
          this.scheduleOpen(ctx, false)
        })
    )
  }

  scheduleOpen (ctx: MeasureContext, force: boolean): void {
    if (force) {
      ctx.withSync('close-ws', {}, () => {
        if (this.websocket !== null) {
          this.websocket.close()
          this.websocket = null
        }
      })
      clearTimeout(this.openAction)
      this.openAction = undefined
    }
    clearInterval(this.interval)
    if (!this.closed && this.openAction === undefined) {
      if (this.websocket === null) {
        const socketId = ++this.sockets
        // Re create socket in case of error, if not closed
        if (this.delay === 0) {
          this.openConnection(ctx, socketId)
        } else {
          this.openAction = setTimeout(() => {
            this.openAction = undefined
            this.openConnection(ctx, socketId)
          }, this.delay * 1000)
        }
      }
    }
  }

  handleMsg (socketId: number, resp: Response<any>): void {
    if (this.closed) {
      return
    }

    if (resp.error !== undefined) {
      if (resp.error?.code === UNAUTHORIZED.code || resp.terminate === true) {
        Analytics.handleError(new PlatformError(resp.error))
        this.closed = true
        this.websocket?.close()
        if (resp.error?.code === UNAUTHORIZED.code) {
          this.opt?.onUnauthorized?.()
        }
        if (resp.error?.code === platform.status.WorkspaceArchived) {
          this.opt?.onArchived?.()
        }
      }

      if (resp.id !== undefined) {
        const promise = this.requests.get(resp.id)
        if (promise !== undefined) {
          promise.reject(new PlatformError(resp.error))
        }
      }

      return
    }

    if (resp.id === -1) {
      this.delay = 0
      if (resp.result?.state === 'upgrading') {
        void this.onConnect?.(ClientConnectEvent.Maintenance, undefined, resp.result.stats)
        this.upgrading = true
        this.delay = 3
        return
      }
      if (resp.result === 'hello') {
        const helloResp = resp as HelloResponse
        this.binaryMode = helloResp.binary
        this.compressionMode = helloResp.useCompression ?? false

        // We need to clear dial timer, since we recieve hello response.
        clearTimeout(this.dialTimer)
        this.dialTimer = null
        this.lastHash = (resp as HelloResponse).lastHash

        const serverVersion = helloResp.serverVersion
        console.log('Connected to server:', serverVersion)

        if (this.opt?.onHello !== undefined && !this.opt.onHello(serverVersion)) {
          this.closed = true
          this.websocket?.close()
          return
        }
        this.account = helloResp.account
        this.helloReceived = true
        if (this.upgrading) {
          // We need to call upgrade since connection is upgraded
          this.opt?.onUpgrade?.()
        }

        this.upgrading = false
        // Notify all waiting connection listeners
        const handlers = this.onConnectHandlers.splice(0, this.onConnectHandlers.length)
        for (const h of handlers) {
          h()
        }

        for (const [, v] of this.requests.entries()) {
          v.reconnect?.()
        }

        void this.onConnect?.(
          helloResp.reconnect === true ? ClientConnectEvent.Reconnected : ClientConnectEvent.Connected,
          helloResp.lastTx,
          this.sessionId
        )?.catch((err) => {
          this.ctx.error('failed to call onConnect', { err })
        })
        this.schedulePing(socketId)
        return
      } else {
        Analytics.handleError(new Error(`unexpected response: ${JSON.stringify(resp)}`))
      }
      return
    }
    if (resp.result === pingConst) {
      void this.sendRequest({ method: pingConst, params: [] }).catch((err) => {
        this.ctx.error('failed to send ping', { err })
      })
      return
    }
    if (resp.id !== undefined) {
      const promise = this.requests.get(resp.id)
      if (promise === undefined) {
        console.error(
          new Error(`unknown response id: ${resp.id as string} ${this.workspace} ${this.user}`),
          JSON.stringify(this.requests)
        )
        return
      }

      if (resp.chunk !== undefined) {
        promise.chunks = [
          ...(promise.chunks ?? []),
          {
            index: resp.chunk.index,
            data: resp.result as FindResult<any>
          }
        ]
        // console.log(socketId, 'chunk', promise.method, promise.params, promise.chunks.length, (resp.result as []).length)
        if (resp.chunk.final) {
          promise.chunks.sort((a, b) => a.index - b.index)
          let result: any[] = []
          let total = -1
          let lookupMap: Record<string, Doc> | undefined

          for (const c of promise.chunks) {
            if (c.data.total !== 0) {
              total = c.data.total
            }
            if (c.data.lookupMap !== undefined) {
              lookupMap = c.data.lookupMap
            }
            result = result.concat(c.data)
          }
          resp.result = toFindResult(result, total, lookupMap)
          resp.chunk = undefined
        } else {
          // Not all chunks are available yet.
          return
        }
      }

      const request = this.requests.get(resp.id)
      promise.handleTime?.(
        Date.now() - promise.startTime,
        resp.result,
        resp.time ?? 0,
        resp.queue ?? 0,
        Date.now() - (resp.bfst ?? 0)
      )
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
          resp.result,
          this.workspace,
          this.user
        )
        promise.reject(new PlatformError(resp.error))
      } else {
        if (request?.handleResult !== undefined) {
          void request
            .handleResult(resp.result)
            .then(() => {
              promise.resolve(resp.result)
            })
            .catch((err) => {
              this.ctx.error('failed to handleResult', { err })
            })
        } else {
          promise.resolve(resp.result)
        }
      }
      void broadcastEvent(client.event.NetworkRequests, this.requests.size).catch((err) => {
        this.ctx.error('failed to broadcast', { err })
      })
    } else {
      const txArr = Array.isArray(resp.result) ? (resp.result as Tx[]) : [resp.result as Tx]

      for (const tx of txArr) {
        if (tx?._class === core.class.TxModelUpgrade) {
          console.log('Processing upgrade', this.workspace, this.user)
          this.opt?.onUpgrade?.()
          return
        }
      }
      this.handler(...txArr)

      clearTimeout(this.incomingTimer)
      void broadcastEvent(client.event.NetworkRequests, this.requests.size + 1).catch((err) => {
        this.ctx.error('failed to broadcast', { err })
      })

      this.incomingTimer = setTimeout(() => {
        void broadcastEvent(client.event.NetworkRequests, this.requests.size).catch((err) => {
          this.ctx.error('failed to broadcast', { err })
        })
      }, 500)
    }
  }

  private openConnection (ctx: MeasureContext, socketId: number): void {
    this.binaryMode = false
    this.helloReceived = false
    // Use defined factory or browser default one.
    const clientSocketFactory =
      this.opt?.socketFactory ??
      getMetadata(client.metadata.ClientSocketFactory) ??
      ((url: string) => {
        const s = new WebSocket(url)
        // s.binaryType = 'arraybuffer'
        return s as ClientSocket
      })

    if (socketId !== this.sockets) {
      return
    }
    const wsocket = ctx.withSync('create-socket', {}, () =>
      clientSocketFactory(this.url + `?sessionId=${this.sessionId}`)
    )

    if (socketId !== this.sockets) {
      wsocket.close()
      return
    }
    this.websocket = wsocket
    const opened = false

    if (this.dialTimer != null) {
      this.dialTimer = setTimeout(() => {
        this.dialTimer = null
        if (!opened && !this.closed) {
          void this.opt?.onDialTimeout?.()?.catch((err) => {
            this.ctx.error('failed to handle dial timeout', { err })
          })
          this.scheduleOpen(this.ctx, true)
        }
      }, dialTimeout)
    }

    wsocket.onmessage = (event: MessageEvent) => {
      if (this.closed) {
        return
      }
      if (this.websocket !== wsocket) {
        return
      }
      if (event.data === pongConst) {
        this.pingResponse = Date.now()
        return
      }
      if (event.data === pingConst) {
        void this.sendRequest({ method: pingConst, params: [] }).catch((err) => {
          this.ctx.error('failed to send ping', { err })
        })
        return
      }
      if (
        event.data instanceof ArrayBuffer &&
        (event.data.byteLength === pingConst.length || event.data.byteLength === pongConst.length)
      ) {
        const text = new TextDecoder().decode(event.data)
        if (text === pingConst) {
          void this.sendRequest({ method: pingConst, params: [] }).catch((err) => {
            this.ctx.error('failed to send ping', { err })
          })
        }
        if (text === pongConst) {
          this.pingResponse = Date.now()
        }
        return
      }
      if (event.data instanceof Blob) {
        void event.data
          .arrayBuffer()
          .then((data) => {
            if (this.compressionMode && this.helloReceived) {
              try {
                data = uncompress(data)
              } catch (err: any) {
                // Ignore
                console.error(err)
              }
            }
            try {
              const resp = this.rpcHandler.readResponse<any>(data, this.binaryMode)
              this.handleMsg(socketId, resp)
            } catch (err: any) {
              if (!this.helloReceived) {
                // Just error and ignore for now.
                console.error(err)
              } else {
                throw err
              }
            }
          })
          .catch((err) => {
            this.ctx.error('failed to decode array buffer', { err })
          })
      } else {
        let data = event.data
        if (this.compressionMode && this.helloReceived) {
          try {
            data = uncompress(data)
          } catch (err: any) {
            // Ignore
            console.error(err)
          }
        }
        try {
          const resp = this.rpcHandler.readResponse<any>(data, this.binaryMode)
          this.handleMsg(socketId, resp)
        } catch (err: any) {
          if (!this.helloReceived) {
            // Just error and ignore for now.
            console.error(err)
          } else {
            throw err
          }
        }
      }
    }
    wsocket.onclose = (ev) => {
      if (this.websocket !== wsocket) {
        wsocket.close()
        return
      }
      // console.log('client websocket closed', socketId, ev?.reason)
      void broadcastEvent(client.event.NetworkRequests, -1).catch((err) => {
        this.ctx.error('failed broadcast', { err })
      })
      this.scheduleOpen(this.ctx, true)
    }
    wsocket.onopen = () => {
      if (this.websocket !== wsocket) {
        return
      }
      const useBinary = this.opt?.useBinaryProtocol ?? getMetadata(client.metadata.UseBinaryProtocol) ?? true
      this.compressionMode =
        this.opt?.useProtocolCompression ?? getMetadata(client.metadata.UseProtocolCompression) ?? false
      const helloRequest: HelloRequest = {
        method: 'hello',
        params: [],
        id: -1,
        binary: useBinary,
        compression: this.compressionMode
      }
      ctx.withSync('send-hello', {}, () => this.websocket?.send(this.rpcHandler.serialize(helloRequest, false)))
    }

    wsocket.onerror = (event: any) => {
      if (this.websocket !== wsocket) {
        return
      }
      if (this.delay < 3) {
        this.delay += 1
      }
      if (opened) {
        console.error('client websocket error:', socketId, this.url, this.workspace, this.user)
      }
      void broadcastEvent(client.event.NetworkRequests, -1).catch((err) => {
        this.ctx.error('failed to broadcast', { err })
      })
    }
  }

  private sendRequest (data: {
    method: string
    params: any[]
    // If not defined, on reconnect with timeout, will retry automatically.
    retry?: () => Promise<boolean>
    handleResult?: (result: any) => Promise<void>
    once?: boolean // Require handleResult to retrieve result
    measure?: (time: number, result: any, serverTime: number, queue: number, toRecieve: number) => void
    allowReconnect?: boolean
    overrideId?: number
  }): Promise<any> {
    return this.ctx.newChild('send-request', {}).with(data.method, {}, async (ctx) => {
      if (this.closed) {
        throw new PlatformError(new Status(Severity.ERROR, platform.status.ConnectionClosed, {}))
      }

      if (data.once === true) {
        // Check if has same request already then skip
        const dparams = JSON.stringify(data.params)
        for (const [, v] of this.requests) {
          if (v.method === data.method && JSON.stringify(v.params) === dparams) {
            // We have same unanswered, do not add one more.
            return
          }
        }
      }

      const id = data.overrideId ?? this.lastId++
      const promise = new RequestPromise(data.method, data.params, data.handleResult)
      promise.handleTime = data.measure

      const w = this.waitOpenConnection(ctx)
      if (w instanceof Promise) {
        await w
      }
      if (data.method !== pingConst) {
        this.requests.set(id, promise)
      }
      const sendData = (): void => {
        if (this.websocket?.readyState === ClientSocketReadyState.OPEN) {
          promise.startTime = Date.now()

          if (data.method !== pingConst) {
            const dta = ctx.withSync('serialize', {}, () =>
              this.rpcHandler.serialize(
                {
                  method: data.method,
                  params: data.params,
                  id,
                  time: Date.now()
                },
                this.binaryMode
              )
            )

            ctx.withSync('send-data', {}, () => this.websocket?.send(dta))
          } else {
            this.websocket?.send(pingConst)
          }
        }
      }
      if (data.allowReconnect ?? true) {
        promise.reconnect = () => {
          setTimeout(async () => {
            // In case we don't have response yet.
            if (this.requests.has(id) && ((await data.retry?.()) ?? true)) {
              sendData()
            }
          }, 50)
        }
      }
      ctx.withSync('send-data', {}, () => {
        sendData()
      })
      void ctx
        .with('broadcast-event', {}, () => broadcastEvent(client.event.NetworkRequests, this.requests.size))
        .catch((err) => {
          this.ctx.error('failed to broadcast', { err })
        })
      if (data.method !== pingConst) {
        return await promise.promise
      }
    })
  }

  loadModel (last: Timestamp, hash?: string): Promise<Tx[] | LoadModelResponse> {
    return this.sendRequest({ method: 'loadModel', params: [last, hash] })
  }

  getAccount (): Promise<Account> {
    if (this.account !== undefined) {
      return clone(this.account)
    }
    return this.sendRequest({ method: 'getAccount', params: [] })
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const result = await this.sendRequest({
      method: 'findAll',
      params: [_class, query, options],
      measure: (time, result, serverTime, queue, toReceive) => {
        if (typeof window !== 'undefined' && (time > 1000 || serverTime > 500)) {
          console.error(
            'measure slow findAll',
            time,
            serverTime,
            toReceive,
            queue,
            _class,
            query,
            options,
            result,
            JSON.stringify(result).length
          )
        }
      }
    })
    if (result.lookupMap !== undefined) {
      // We need to extract lookup map to document lookups
      for (const d of result) {
        if (d.$lookup !== undefined) {
          for (const [k, v] of Object.entries(d.$lookup)) {
            if (!Array.isArray(v)) {
              d.$lookup[k] = result.lookupMap[v as any]
            } else {
              d.$lookup[k] = v.map((it) => result.lookupMap?.[it])
            }
          }
        }
      }
      delete result.lookupMap
    }

    // We need to revert deleted query simple values.
    // We need to get rid of simple query parameters matched in documents
    for (const doc of result) {
      if (doc._class == null) {
        doc._class = _class
      }
      for (const [k, v] of Object.entries(query)) {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          if (doc[k] == null) {
            doc[k] = v
          }
        }
      }
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

  searchFulltext (query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    return this.sendRequest({ method: 'searchFulltext', params: [query, options] })
  }

  sendForceClose (): Promise<void> {
    return this.sendRequest({ method: 'forceClose', params: [], allowReconnect: false, overrideId: -2, once: true })
  }
}

/**
 * @public
 */
export function connect (
  url: string,
  handler: TxHandler,
  workspace: WorkspaceUuid,
  user: PersonUuid,
  opt?: ClientFactoryOptions
): ClientConnection {
  return new Connection(
    opt?.ctx?.newChild?.('connection', {}) ?? new MeasureMetricsContext('connection', {}),
    url,
    handler,
    workspace,
    user,
    opt
  )
}
