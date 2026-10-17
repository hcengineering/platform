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
  type ClientFactoryOptions,
  ClientSocket,
  ClientSocketReadyState,
  pingConst,
  pongConst
} from '@hcengineering/client'
import core, {
  Account,
  Class,
  ClientConnectEvent,
  ClientConnection,
  clone,
  Doc,
  DocChunk,
  DocumentQuery,
  Domain,
  type DomainParams,
  type DomainRequestOptions,
  type DomainResult,
  FindOptions,
  FindResult,
  generateId,
  platformNow,
  LoadModelResponse,
  type MeasureContext,
  MeasureMetricsContext,
  type OperationDomain,
  type PersonUuid,
  Ref,
  SearchOptions,
  SearchQuery,
  SearchResult,
  Timestamp,
  toFindResult,
  Tx,
  TxApplyIf,
  TxHandler,
  TxResult,
  type WorkspaceUuid
} from '@hcengineering/core'
import platform, { getMetadata, PlatformError, Severity, Status } from '@hcengineering/platform'
import { HelloRequest, HelloResponse, type RateLimitInfo, ReqId, type Response, RPCHandler } from '@hcengineering/rpc'
import { uncompress } from 'snappyjs'

const SECOND = 1000
const pingTimeout = 10 * SECOND
const hangTimeout = 5 * 60 * SECOND
const dialTimeout = 30 * SECOND
// After visibilitychange -> visible we probe with short timeout.
const visibilityProbeTimeout = 1 * SECOND
// Jitter (ms) applied to reconnect retries after a failed attempt and to pending-request
// resend, so a herd of clients doesn't redial/resend on the same tick.
const reconnectJitterMs = 300
// Throttle window for noisy diagnostics logs in hot paths.
const diagLogThrottleMs = 5 * SECOND

interface MeasureData {
  time: number
  serverTime: number
  queue: number
  result: any
  compressedSize: number
  uncompressedSize: number
}

class RequestPromise {
  startTime: number = platformNow()
  handleTime?: (data: MeasureData) => void
  readonly promise: Promise<any>
  resolve!: (value?: any) => void
  reject!: (reason?: any) => void
  reconnect?: () => void

  // Required to properly handle rate limits
  sendData: () => void = () => {}

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

interface OnConnectHandler {
  resolve: () => void
  reject: (err: Error) => void
}

class Connection implements ClientConnection {
  private websocket: ClientSocket | null = null
  binaryMode = false
  compressionMode = false
  private readonly requests = new Map<ReqId, RequestPromise>()
  private lastId = 0
  private interval: number | undefined
  private dialTimer: number | undefined

  private sockets = 0
  private openAction: any

  private readonly sessionId: string | undefined
  private closed = false

  private upgrading: boolean = false

  private pingResponse: number = platformNow()

  private helloReceived: boolean = false

  private account: Account | undefined

  private visibilityHandler?: () => void
  private lastReconnectAt: number = 0
  private lastVisibilityLogAt: number = 0

  onConnect?: (event: ClientConnectEvent, lastTx: string | undefined, data: any) => Promise<void>

  rpcHandler: RPCHandler

  lastHash?: string

  handlers: TxHandler[] = []

  constructor (
    private readonly ctx: MeasureContext,
    private readonly url: string,
    handler: TxHandler,
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
        sessionStorage.setItem(sKey, sessionId)
      })
    } else {
      this.sessionId = generateId()
    }
    this.rpcHandler = opt?.useGlobalRPCHandler === true ? globalRPCHandler : new RPCHandler()
    this.pushHandler(handler)
    this.onConnect = opt?.onConnect

    this.installVisibilityHandler()

    this.scheduleOpen(this.ctx, false)
  }

  private installVisibilityHandler (): void {
    if (typeof document === 'undefined') return
    this.visibilityHandler = () => {
      if (this.closed) return
      if (document.visibilityState !== 'visible') return
      const sinceLastPong = platformNow() - this.pingResponse
      const pendingCount = this.requests.size
      const readyState = this.websocket?.readyState
      const now = platformNow()
      if (now - this.lastVisibilityLogAt > diagLogThrottleMs) {
        this.lastVisibilityLogAt = now
        console.log('[conn] visibility=visible', {
          readyState,
          pendingCount,
          sinceLastPong,
          helloReceived: this.helloReceived,
          workspace: this.workspace
        })
      }
      // If socket dead / not ready - force reconnect immediately.
      if (this.websocket === null || readyState !== ClientSocketReadyState.OPEN || !this.helloReceived) {
        console.log('[conn] visibility -> force reconnect (socket not ready)')
        this.scheduleOpen(this.ctx, true)
        return
      }
      // Probe with short timeout. If pong not arrive -> force reconnect.
      const probeStart = platformNow()
      const probeSocket = this.websocket
      void this.sendRequest({
        method: pingConst,
        params: [],
        once: true,
        handleResult: async () => {
          if (this.websocket === probeSocket) {
            this.pingResponse = platformNow()
          }
        }
      }).catch(() => {})
      setTimeout(() => {
        if (this.closed) return
        if (this.websocket !== probeSocket) return
        if (this.pingResponse < probeStart) {
          console.log('[conn] visibility probe timeout -> force reconnect', {
            probeTimeout: visibilityProbeTimeout,
            pendingCount: this.requests.size
          })
          this.scheduleOpen(this.ctx, true)
        }
      }, visibilityProbeTimeout)
    }
    document.addEventListener('visibilitychange', this.visibilityHandler)
  }

  pushHandler (handler: TxHandler): void {
    this.handlers.push(handler)
  }

  async getLastHash (ctx: MeasureContext): Promise<string | undefined> {
    await this.waitOpenConnection(ctx)
    return this.lastHash
  }

  private schedulePing (socketId: number): void {
    this.pingResponse = platformNow()
    const wsocket = this.websocket

    clearInterval(this.interval)
    this.interval = setInterval(() => {
      if (wsocket !== this.websocket) {
        clearInterval(this.interval)
        return
      }
      if (!this.upgrading && this.pingResponse !== 0 && platformNow() - this.pingResponse > hangTimeout) {
        // No ping response from server.

        if (this.websocket !== null) {
          console.log('no ping response from server. Closing socket.', {
            socketId,
            workspace: this.workspace,
            user: this.user,
            sinceLastPong: platformNow() - this.pingResponse,
            pendingCount: this.requests.size
          })
          clearInterval(this.interval)
          this.websocket.close(1000)
          return
        }
      }

      if (!this.closed) {
        const sinceLastPong = platformNow() - this.pingResponse
        if (sinceLastPong > pingTimeout * 2 && this.requests.size > 0) {
          console.log('[conn] ping tick - no pong but pending requests', {
            sinceLastPong,
            pendingCount: this.requests.size,
            socketId
          })
        }
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        void this.sendRequest({
          method: pingConst,
          params: [],
          once: true,
          handleResult: async (result) => {
            if (this.websocket === wsocket) {
              this.pingResponse = platformNow()
            }
          }
        }).catch((err) => {
          this.ctx.error('failed to send msg', { err })
        })
      } else {
        clearInterval(this.interval)
      }
    }, pingTimeout)
  }

  async close (): Promise<void> {
    this.closed = true
    clearTimeout(this.openAction)
    clearTimeout(this.dialTimer)
    clearInterval(this.interval)
    if (this.visibilityHandler !== undefined && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler)
      this.visibilityHandler = undefined
    }
    for (const handler of this.onConnectHandlers) {
      handler.reject(new Error('Connection closed'))
    }
    for (const req of this.requests.values()) {
      req.reject(new Error('Connection closed'))
    }
    if (this.websocket !== null) {
      this.websocket.close(1000)
      this.websocket = null
    }
  }

  isConnected (): boolean {
    return this.websocket != null && this.websocket.readyState === ClientSocketReadyState.OPEN && this.helloReceived
  }

  delay = 0
  onConnectHandlers: OnConnectHandler[] = []

  private waitOpenConnection (ctx: MeasureContext): Promise<void> | undefined {
    if (this.isConnected()) {
      return undefined
    }

    return ctx.with(
      'wait-connection',
      {},
      (ctx) =>
        new Promise((resolve, reject) => {
          this.onConnectHandlers.push({
            resolve,
            reject
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
          // delay>0 means a prior attempt failed (transactor down / herd). Jitter the backoff
          // so clients don't all retry on the same tick; a clean first reconnect stays immediate.
          const jitter = Math.floor(Math.random() * reconnectJitterMs)
          this.openAction = setTimeout(
            () => {
              this.openAction = undefined
              this.openConnection(ctx, socketId)
            },
            this.delay * 1000 + jitter
          )
        }
      }
    }
  }

  currentRateLimit: RateLimitInfo | undefined
  slowDownTimer = 0

  handleMsg (
    socketId: number,
    resp: Response<any>,
    sizes: { compressedSize: number, uncompressedSize: number } = { compressedSize: 0, uncompressedSize: 0 }
  ): void {
    if (this.closed) {
      return
    }

    if (resp.rateLimit !== undefined && resp.rateLimit.remaining < 50) {
      this.currentRateLimit = resp.rateLimit
      if (this.currentRateLimit.remaining < this.currentRateLimit.limit / 3) {
        if (this.slowDownTimer < 50) {
          this.slowDownTimer += 50
        }
        this.slowDownTimer++
      } else if (this.slowDownTimer > 0) {
        this.slowDownTimer--
      }
    }

    if (resp.error !== undefined) {
      if (resp.terminate === true) {
        if (
          resp.error.code !== platform.status.WorkspaceArchived &&
          resp.error.code !== platform.status.WorkspaceNotFound
        ) {
          Analytics.handleError(new PlatformError(resp.error))
        }
        this.closed = true
        this.websocket?.close()
        this.opt?.onError?.(resp.error.code)
      }

      if (resp.id !== undefined) {
        const promise = this.requests.get(resp.id)

        // Support rate limits
        if (resp.rateLimit !== undefined) {
          const { remaining, retryAfter } = resp.rateLimit
          if (remaining === 0) {
            void new Promise((resolve) => setTimeout(resolve, retryAfter ?? 1)).then(() => {
              // Retry after a while, so rate limits allow to call more.
              promise?.sendData()
            })
            return
          }
        }

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
        this.dialTimer = undefined
        this.lastHash = (resp as HelloResponse).lastHash

        const serverVersion = helloResp.serverVersion
        if (typeof window !== 'undefined') {
          console.log('Connected to server:', serverVersion)
        }

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
          h.resolve()
        }

        this.lastReconnectAt = platformNow()
        const pendingReqs = [...this.requests.values()]
        if (pendingReqs.length > 0) {
          const oldest = pendingReqs.reduce((m, r) => Math.max(m, platformNow() - r.startTime), 0)
          console.log('[conn] hello reconnect resend', {
            count: pendingReqs.length,
            oldestAgeMs: oldest,
            workspace: this.workspace
          })
        }
        // Jitter resend to avoid burst on recovered slow mobile networks.
        for (const v of pendingReqs) {
          const delay = Math.floor(Math.random() * reconnectJitterMs)
          if (delay === 0) {
            v.reconnect?.()
          } else {
            setTimeout(() => {
              if (!this.closed) v.reconnect?.()
            }, delay)
          }
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
      promise.handleTime?.({
        time: platformNow() - promise.startTime,
        result: resp.result,
        serverTime: resp.time ?? 0,
        queue: resp.queue ?? 0,
        compressedSize: sizes.compressedSize,
        uncompressedSize: sizes.uncompressedSize
      })
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
    } else {
      const txArr = Array.isArray(resp.result) ? (resp.result as Tx[]) : [resp.result as Tx]

      for (const tx of txArr) {
        if (tx?._class === core.class.TxModelUpgrade) {
          console.log('Processing upgrade', this.workspace, this.user)
          this.opt?.onUpgrade?.()
          return
        }
      }
      this.handlers.forEach((handler) => {
        handler(...txArr)
      })
    }
  }

  checkArrayBufferPing (data: ArrayBuffer): boolean {
    if (data.byteLength === pingConst.length || data.byteLength === pongConst.length) {
      const text = new TextDecoder().decode(data)
      if (text === pingConst) {
        void this.sendRequest({ method: pingConst, params: [] }).catch((err) => {
          this.ctx.error('failed to send ping', { err })
        })
        return true
      }
      if (text === pongConst) {
        this.pingResponse = platformNow()
        return true
      }
    }
    return false
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
    if (this.dialTimer === undefined) {
      this.dialTimer = setTimeout(() => {
        this.dialTimer = undefined
        if (!this.closed) {
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
        this.pingResponse = platformNow()
        return
      }
      if (event.data === pingConst) {
        void this.sendRequest({ method: pingConst, params: [] }).catch((err) => {
          this.ctx.error('failed to send ping', { err })
        })
        return
      }
      if (event.data instanceof ArrayBuffer && this.checkArrayBufferPing(event.data)) {
        return
      }
      if (event.data instanceof Blob) {
        void event.data
          .arrayBuffer()
          .then((data) => {
            if (this.checkArrayBufferPing(data)) {
              // Support ping/pong
              return
            }
            const compressedSize = data.byteLength
            if (this.compressionMode && this.helloReceived) {
              try {
                data = uncompress(data)
              } catch (err: any) {
                // Ignore
                console.error(err)
              }
            }
            const uncompressedSize = data.byteLength
            try {
              const resp = this.rpcHandler.readResponse<any>(data, this.binaryMode)
              this.handleMsg(socketId, resp, { compressedSize, uncompressedSize })
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
        const compressedSize = typeof data === 'string' ? data.length : (data?.byteLength ?? 0)
        if (this.compressionMode && this.helloReceived) {
          try {
            data = uncompress(data)
          } catch (err: any) {
            // Ignore
            console.error(err)
          }
        }
        const uncompressedSize = typeof data === 'string' ? data.length : (data?.byteLength ?? 0)
        try {
          const resp = this.rpcHandler.readResponse<any>(data, this.binaryMode)
          this.handleMsg(socketId, resp, { compressedSize, uncompressedSize })
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
      console.log('[conn] wsocket.onclose', {
        code: ev.code,
        reason: ev.reason,
        pendingCount: this.requests.size,
        workspace: this.workspace
      })
      // Immediate redial for a clean disconnect; if the transactor is down the failed
      // attempt bumps delay and scheduleOpen jitters the retry herd (see reconnectJitterMs).
      if (!this.closed) this.scheduleOpen(this.ctx, true)
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

    // FIX: remove undefined variable 'opened'
    wsocket.onerror = () => {
      if (this.websocket !== wsocket) {
        return
      }
      if (this.delay < 3) {
        this.delay += 1
      }
      console.error('client websocket error:', socketId, this.url, this.workspace, this.user)
    }
  }

  private sendRequest (data: {
    method: string
    params: any[]
    // If not defined, on reconnect with timeout, will retry automatically.
    retry?: () => Promise<boolean>
    handleResult?: (result: any) => Promise<void>
    once?: boolean // Require handleResult to retrieve result
    measure?: (data: MeasureData) => void
    allowReconnect?: boolean
    overrideId?: number
  }): Promise<any> {
    return this.ctx.with(
      'send-request',
      {},
      async (ctx) => {
        if (this.closed) {
          throw new PlatformError(new Status(Severity.ERROR, platform.status.ConnectionClosed, {}))
        }

        if (this.slowDownTimer > 0) {
          // We need to wait a bit to avoid ban.
          await new Promise((resolve) => setTimeout(resolve, this.slowDownTimer))
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
        promise.sendData = (): void => {
          if (this.websocket?.readyState === ClientSocketReadyState.OPEN) {
            promise.startTime = platformNow()

            if (data.method !== pingConst) {
              const dta = this.rpcHandler.serialize(
                {
                  method: data.method,
                  params: data.params,
                  meta: ctx.extractMeta(),
                  id,
                  time: Date.now()
                },
                this.binaryMode
              )

              this.websocket?.send(dta)
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
                promise.sendData()
              }
            }, 50)
          }
        }
        promise.sendData()
        if (data.method !== pingConst) {
          return await promise.promise
        }
      },
      { method: data.method },
      {
        span: 'skip'
      }
    )
  }

  loadModel (last: Timestamp, hash?: string): Promise<Tx[] | LoadModelResponse> {
    return this.sendRequest({ method: 'loadModel', params: [last, hash] })
  }

  getAccount (): Promise<Account> {
    if (this.account !== undefined) {
      return Promise.resolve(clone(this.account))
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
      measure: ({ time, serverTime, queue, result, compressedSize, uncompressedSize }) => {
        if (typeof window !== 'undefined' && (time > 1000 || serverTime > 500)) {
          console.warn('measure slow findAll', {
            time,
            serverTime,
            queue,
            _class,
            query,
            options,
            reason: time > 1000 ? 'time' : 'serverTime',
            compressedSize,
            uncompressedSize,
            ratio: compressedSize > 0 && uncompressedSize > 0 ? (uncompressedSize / compressedSize).toFixed(2) : 'n/a',
            count: result.length,
            lookupDocs: result.lookupMap !== undefined ? Object.keys(result.lookupMap).length : 0,
            pendingCount: this.requests.size,
            sinceReconnectMs: this.lastReconnectAt === 0 ? -1 : platformNow() - this.lastReconnectAt
          })
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
      for (const [k, v] of Object.entries(query)) {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          if (doc[k] == null) {
            doc[k] = v
          }
        }
      }
      if (doc._class == null) {
        doc._class = _class
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

  async getDomainHash (domain: Domain): Promise<string> {
    return await this.sendRequest({ method: 'getDomainHash', params: [domain] })
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

  domainRequest (domain: OperationDomain, params: DomainParams, options?: DomainRequestOptions): Promise<DomainResult> {
    return this.sendRequest({
      method: 'domainRequest',
      params: [domain, params],
      retry: async () => {
        return options?.retry ?? false
      }
    })
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
