// Copyright © 2024 Huly Labs.

import {
  generateId,
  NoMetricsContext,
  platformNow,
  platformNowDiff,
  WorkspaceUuid,
  type Account,
  type Class,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type MeasureContext,
  type Ref,
  type Tx
} from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import { RPCHandler } from '@hcengineering/rpc'
import { ClientSession, createSessionManager, doSessionOp, type WebsocketData } from '@hcengineering/server'
import serverCore, {
  createDummyStorageAdapter,
  loadBrandingMap,
  pingConst,
  pongConst,
  Session,
  Workspace,
  type ConnectionSocket,
  type Pipeline,
  type PipelineFactory,
  type SessionManager,
  CommunicationApiFactory
} from '@hcengineering/server-core'
import serverPlugin, { decodeToken, type Token } from '@hcengineering/server-token'
import { DurableObject } from 'cloudflare:workers'
import { compress, uncompress } from 'snappyjs'
import { promisify } from 'util'
import { gzip } from 'zlib'

// Approach usefull only for separate build, after model-all bundle phase is executed.
import {
  createPostgreeDestroyAdapter,
  createPostgresAdapter,
  createPostgresTxAdapter,
  registerGreenDecoder,
  registerGreenUrl,
  setDBExtraOptions
} from '@hcengineering/postgres'
import {
  createServerPipeline,
  isAdapterSecurity,
  registerAdapterFactory,
  registerDestroyFactory,
  registerServerPlugins,
  registerStringLoaders,
  registerTxAdapterFactory,
  setAdapterSecurity
} from '@hcengineering/server-pipeline'
import { CloudFlareLogger } from './logger'
import model from './model.json'
// import { configureAnalytics } from '@hcengineering/analytics-service'
// import { Analytics } from '@hcengineering/analytics'
import contactPlugin from '@hcengineering/contact'
import serverAiBot from '@hcengineering/server-ai-bot'
import serverNotification from '@hcengineering/server-notification'
import serverTelegram from '@hcengineering/server-telegram'
import { Api as CommunicationApi } from '@hcengineering/communication-server'

export const PREFERRED_SAVE_SIZE = 500
export const PREFERRED_SAVE_INTERVAL = 30 * 1000

export class Transactor extends DurableObject<Env> {
  private workspace = '' as WorkspaceUuid

  private sessionManager!: SessionManager

  private readonly measureCtx: MeasureContext

  private readonly pipelineFactory: PipelineFactory
  private readonly communicationApiFactory: CommunicationApiFactory

  private readonly accountsUrl: string

  private readonly sessions = new Map<WebSocket, WebsocketData>()

  private readonly contextVars: Record<string, any> = {}

  constructor (ctx: DurableObjectState, env: Env) {
    super(ctx, env)

    setDBExtraOptions({
      ssl: false,
      max: env.USE_GREEN === 'true' ? 2 : 5, // Cloud flare limit an concurrent connection to be 6 total
      connection: {
        application_name: 'cloud-transactor'
      }
    })

    // this.ctx.setHibernatableWebSocketEventTimeout(60 * 1000)
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(pingConst, pongConst))

    // configureAnalytics(env.SENTRY_DSN, {})
    // Analytics.setTag('application', 'transactor')

    const lastNameFirst = process.env.LAST_NAME_FIRST === 'true'
    setMetadata(contactPlugin.metadata.LastNameFirst, lastNameFirst)
    setMetadata(serverCore.metadata.FrontUrl, env.FRONT_URL)
    setMetadata(serverCore.metadata.FilesUrl, env.FILES_URL)
    setMetadata(serverNotification.metadata.SesUrl, env.SES_URL ?? '')
    setMetadata(serverNotification.metadata.SesAuthToken, env.SES_AUTH_TOKEN)
    setMetadata(serverTelegram.metadata.BotUrl, process.env.TELEGRAM_BOT_URL)
    setMetadata(serverAiBot.metadata.EndpointURL, process.env.AI_BOT_URL)

    registerTxAdapterFactory('postgresql', createPostgresTxAdapter, true)
    registerAdapterFactory('postgresql', createPostgresAdapter, true)
    registerDestroyFactory('postgresql', createPostgreeDestroyAdapter, true)
    setAdapterSecurity('postgresql', true)

    if (env.USE_GREEN === 'true') {
      registerGreenUrl(env.GREEN_URL)
      registerGreenDecoder('snappy', async (data) => uncompress(data))
    }

    registerStringLoaders()
    registerServerPlugins()
    this.accountsUrl = env.ACCOUNTS_URL ?? 'http://127.0.0.1:3000'

    this.measureCtx = new NoMetricsContext(new CloudFlareLogger())
    // initStatisticsContext('ctr-' + ctx.id.toString(), {
    //   statsUrl: this.env.STATS_URL ?? 'http://127.0.0.1:4900',
    //   serviceName: () => 'cloud-transactor: ' + this.workspace,
    //   factory: () => new MeasureMetricsContext('transactor', {}, {}, newMetrics(), new CloudFlareLogger())
    // })

    setMetadata(serverPlugin.metadata.Secret, env.SERVER_SECRET ?? 'secret')

    console.log({ message: 'Connecting DB', mode: env.DB_URL !== '' ? 'Direct ' : 'Hyperdrive' })
    console.log({ message: 'use stats', url: this.env.STATS_URL })
    console.log({ message: 'use fulltext', url: this.env.FULLTEXT_URL })

    const dbUrl = env.DB_MODE === 'direct' ? env.DB_URL ?? '' : env.HYPERDRIVE.connectionString

    // TODO:
    const storage = createDummyStorageAdapter()

    this.pipelineFactory = async (ctx, ws, upgrade, broadcast, branding) => {
      const pipeline = createServerPipeline(this.measureCtx, dbUrl, model, {
        externalStorage: storage,
        adapterSecurity: isAdapterSecurity(dbUrl),
        disableTriggers: false,
        fulltextUrl: env.FULLTEXT_URL,
        extraLogging: true,
        pipelineContextVars: this.contextVars
      })
      return await pipeline(ctx, ws, upgrade, broadcast, branding)
    }
    this.communicationApiFactory = async (ctx, ws, broadcastSessions) => {
      return await CommunicationApi.create(ctx.newChild('💬 communication api', {}), ws.uuid, dbUrl, broadcastSessions)
    }
    void this.ctx
      .blockConcurrencyWhile(async () => {
        const wakeUps = ((await ctx.storage.get('wakeUps')) as number) ?? 0
        console.log({ message: `wakeup ${wakeUps}`, connections: ctx.getWebSockets().length })
        await ctx.storage.put('wakeUps', wakeUps + 1)

        this.sessionManager = createSessionManager(
          this.measureCtx,
          (token: Token, workspace: Workspace, account: Account) => new ClientSession(token, workspace, account, false),
          loadBrandingMap(), // TODO: Support branding map
          {
            pingTimeout: 10000,
            reconnectTimeout: 3000
          },
          undefined,
          this.accountsUrl,
          env.ENABLE_COMPRESSION === 'true',
          false
        )
      })
      .catch((err) => {
        console.error({ message: 'Failed to init transactor', err })
      })
  }

  async fetch (request: Request): Promise<Response> {
    const { 0: client, 1: server } = new WebSocketPair()

    const url = new URL(request.url ?? '')
    const token = url.pathname.substring(1)

    try {
      const payload = decodeToken(token ?? '')
      const sessionId = url.searchParams.get('sessionId')

      // By design, all fetches to this durable object will be for the same workspace
      if (this.workspace === '') {
        this.workspace = payload.workspace
      }

      if (!(await this.handleSession(server, request, payload, token, sessionId))) {
        return new Response(null, { status: 404 })
      }
      return new Response(null, { status: 101, webSocket: client })
    } catch (err: any) {
      console.error({ message: 'Failed to handle request', errMsg: err.message, errStack: err.stack })
      return new Response(null, { status: 404 })
    }
  }

  async webSocketMessage (ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    const session = this.sessions.get(ws)
    if (session === undefined) {
      return
    }
    const cs = session.connectionSocket
    if (cs === undefined) {
      return
    }
    try {
      doSessionOp(
        session,
        (s, buff) => {
          s.context.measure('receive-data', buff?.length ?? 0)
          // processRequest(s.session, cs, s.context, s.workspaceId, buff, handleRequest)
          const request = cs.readRequest(buff, s.session.binaryMode)
          const st = platformNow()
          const r = this.sessionManager.handleRequest(this.measureCtx, s.session, cs, request, this.workspace)
          this.ctx.waitUntil(
            r.finally(() => {
              const time = platformNowDiff(st)
              console.log({
                message: `handle-request: ${request.method} time: ${time}`,
                method: request.method,
                params: request.params,
                workspace: s.workspaceId,
                user: s.session.getUser(),
                time
              })
            })
          )
        },
        typeof message === 'string' ? Buffer.from(message) : Buffer.from(message)
      )
    } catch (err: any) {
      console.error({ message: 'Failed to handle message:', errMsg: err.message, err, stack: err.stack })
    }
  }

  async webSocketError (ws: WebSocket, error: unknown): Promise<void> {
    const session = this.sessions.get(ws)
    console.error({ message: 'error:', error, account: session?.payload?.account })
    await this.handleClose(ws, 1011, 'error')
  }

  async webSocketClose (ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    const session = this.sessions.get(ws)
    console.warn({ message: 'closed', reason, code, wasClean, account: session?.payload?.account })
  }

  async alarm (): Promise<void> {
    const memoryUsage = process.memoryUsage()
    console.log({
      message: 'Resource usage',
      memoryUsed: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed
    })
  }

  async handleSession (
    ws: WebSocket,
    request: Request,
    token: Token,
    rawToken: string,
    sessionId: string | null
  ): Promise<boolean> {
    const data = {
      remoteAddress: request.headers.get('CF-Connecting-IP') ?? '',
      userAgent: request.headers.get('user-agent') ?? '',
      language: request.headers.get('accept-language') ?? '',
      account: token.account,
      mode: token.extra?.mode,
      model: token.extra?.model
    }
    console.log({
      message: 'New session attempt',
      remoteAddress: data.remoteAddress,
      userAgent: data.userAgent,
      account: data.account
    })
    this.ctx.acceptWebSocket(ws)
    const cs = this.createWebsocketClientSocket(ws, data)

    try {
      const session = await this.sessionManager.addSession(
        this.measureCtx,
        cs,
        token,
        rawToken,
        this.pipelineFactory,
        this.communicationApiFactory,
        sessionId ?? undefined
      )

      const webSocketData: WebsocketData = {
        connectionSocket: cs,
        payload: token,
        token: rawToken,
        session,
        url: ''
      }

      if ('error' in session) {
        console.error({ message: 'Failed to establish session:', error: session.error })
        if (session.terminate === true) {
          ws.close(4003, 'Session establishment failed')
        }
        throw session.error
      }
      if ('upgrade' in session) {
        cs.send(
          this.measureCtx,
          { id: -1, result: { state: 'upgrading', stats: (session as any).upgradeInfo } },
          false,
          false
        )
        ws.close(4003, 'Session establishment failed')
        return true
      }

      console.log({
        message: 'Session established successfully:',
        sessionId: session.session.sessionId,
        workspaceId: token.workspace,
        user: token.account
      })
      this.sessions.set(ws, webSocketData)
    } catch (err: any) {
      console.error({ message: 'Failed to establish session:', err })
      ws.close(4003, 'Session establishment failed')
      throw err
    }

    return true
  }

  createWebsocketClientSocket (
    ws: WebSocket,
    data: {
      remoteAddress: string
      userAgent: string
      language: string
      account: string
      mode: any
      model: any
    }
  ): ConnectionSocket {
    const rpcHandler = new RPCHandler()
    const cs: ConnectionSocket = {
      id: generateId(),
      isClosed: false,
      close: () => {
        cs.isClosed = true
        console.warn({ message: 'close socket', id: cs.id })
        ws.close()
      },
      checkState: () => {
        if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
          return false
        }
        return true
      },
      readRequest: (buffer: Buffer, binary: boolean) => {
        if (buffer.length === pingConst.length) {
          if (buffer.toString() === pingConst) {
            return { method: pingConst, params: [], id: -1, time: Date.now() }
          }
        }
        return rpcHandler.readRequest(buffer, binary)
      },
      data: () => data,
      send: (ctx: MeasureContext, msg, binary, _compression) => {
        let smsg = rpcHandler.serialize(msg, binary)

        ctx.measure('send-data', smsg.length)
        if (ws.readyState !== WebSocket.OPEN || cs.isClosed) {
          return
        }

        if (_compression) {
          smsg = compress(smsg)
        }

        try {
          ws.send(smsg)
        } catch (err: any) {
          console.error({ message: 'failed to send', err })
        }
      },
      sendPong: () => {
        if (ws.readyState !== WebSocket.OPEN || cs.isClosed) {
          return
        }
        try {
          ws.send(pongConst)
        } catch (err: any) {
          console.error({ message: 'failed to send', err })
        }
      }
    }
    return cs
  }

  async broadcastMessage (message: Uint8Array, origin?: any): Promise<void> {
    console.log({ message: 'broadcast' })
    const wss = this.ctx.getWebSockets().filter((ws) => ws.readyState === WebSocket.OPEN)
    await Promise.all(
      wss.map(async (ws) => {
        await this.sendMessage(ws, message)
      })
    )
  }

  async sendMessage (ws: WebSocket, message: Uint8Array): Promise<void> {
    try {
      ws.send(message)
    } catch (error) {
      console.error({ message: 'Failed to send message:', error })
      await this.handleClose(ws, 1011, 'error')
    }
  }

  async handleClose (ws: WebSocket, code: number, reason?: string): Promise<void> {
    try {
      console.log({ message: 'Closing connection with code', code, reason })
      ws.close(code, reason)
    } catch (err) {
      console.error({ message: 'Failed to close WebSocket:', err })
    }
    const session = this.sessions.get(ws)
    if (session !== undefined) {
      this.sessions.delete(ws)
      console.log({ message: 'Cleaning up session for', account: session.payload.account })
      await this.sessionManager.close(this.measureCtx, session.connectionSocket as ConnectionSocket, this.workspace)
    }
  }

  private createDummyClientSocket (): ConnectionSocket {
    const cs: ConnectionSocket = {
      id: generateId(),
      isClosed: false,
      close: () => {
        cs.isClosed = true
      },
      checkState: () => {
        return !cs.isClosed
      },
      readRequest: (buffer: Buffer, binary: boolean) => {
        return {} as any
      },
      data: () => {
        return {}
      },
      send: (ctx: MeasureContext, msg, binary, compression) => {},
      sendPong: () => {}
    }
    return cs
  }

  private async makeRpcSession (rawToken: string, cs: ConnectionSocket): Promise<Session> {
    const token = decodeToken(rawToken ?? '')
    const session = await this.sessionManager.addSession(
      this.measureCtx,
      cs,
      token,
      rawToken,
      this.pipelineFactory,
      this.communicationApiFactory,
      generateId()
    )
    if ('error' in session) {
      throw session.error
    }
    if ('upgrade' in session) {
      throw new Error('Workspace is upgrading')
    }
    if (!('session' in session) || session.session === undefined) {
      throw new Error('No session')
    }
    // By design, all fetches to this durable object will be for the same workspace
    if (this.workspace === '') {
      this.workspace = token.workspace
    }
    return session.session
  }

  private async getRpcPipeline (rawToken: string, cs: ConnectionSocket): Promise<Pipeline> {
    const session = await this.makeRpcSession(rawToken, cs)
    const pipeline =
      session.workspace.pipeline instanceof Promise ? await session.workspace.pipeline : session.workspace.pipeline
    const communicationApi =
      session.workspace.communicationApi instanceof Promise
        ? await session.workspace.communicationApi
        : session.workspace.communicationApi
    const opContext = this.sessionManager.createOpContext(
      this.measureCtx,
      pipeline,
      communicationApi,
      undefined,
      session,
      cs
    )
    session.includeSessionContext(opContext)
    return pipeline
  }

  async findAll (
    rawToken: string,
    workspaceId: string,
    _class: Ref<Class<Doc>>,
    query?: DocumentQuery<Doc>,
    options?: FindOptions<Doc>
  ): Promise<any> {
    let result
    const cs = this.createDummyClientSocket()
    try {
      const pipeline = await this.getRpcPipeline(rawToken, cs)
      result = await pipeline.findAll(this.measureCtx, _class, query ?? {}, options ?? {})
    } catch (error: any) {
      console.error(error)
      result = { error: `${error}` }
    } finally {
      await this.sessionManager.close(this.measureCtx, cs, this.workspace)
    }
    return result
  }

  async tx (rawToken: string, workspaceId: string, tx: Tx): Promise<any> {
    let result
    const cs = this.createDummyClientSocket()
    try {
      const pipeline = await this.getRpcPipeline(rawToken, cs)
      result = await pipeline.tx(this.measureCtx, [tx])
    } catch (error: any) {
      console.error(error)
      result = { error: `${error}` }
    } finally {
      await this.sessionManager.close(this.measureCtx, cs, this.workspace)
    }
    return result
  }

  async getModel (rawToken: string): Promise<any> {
    let result: Tx[] = []
    const cs = this.createDummyClientSocket()
    try {
      const pipeline = await this.getRpcPipeline(rawToken, cs)
      const ret = await pipeline.loadModel(this.measureCtx, 0)
      if (Array.isArray(ret)) {
        result = ret
      } else {
        result = ret.transactions
      }
    } catch (error: any) {
      console.error(error)
      return { error: `${error}` }
    } finally {
      await this.sessionManager.close(this.measureCtx, cs, this.workspace)
    }

    const encoder = new TextEncoder()
    const buffer = encoder.encode(JSON.stringify(result))
    const gzipAsync = promisify(gzip)
    const compressed = await gzipAsync(buffer)
    return compressed
  }

  async getAccount (rawToken: string): Promise<any> {
    const cs = this.createDummyClientSocket()
    try {
      const session = await this.makeRpcSession(rawToken, cs)
      return session.getRawAccount()
    } catch (error: any) {
      return { error: `${error}` }
    } finally {
      await this.sessionManager.close(this.measureCtx, cs, this.workspace)
    }
  }
}
