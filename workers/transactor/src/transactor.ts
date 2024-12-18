// Copyright © 2024 Huly Labs.

import {
  Branding,
  generateId,
  MeasureMetricsContext,
  type MeasureContext,
  type WorkspaceIdWithUrl
} from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import { RPCHandler } from '@hcengineering/rpc'
import {
  ClientSession,
  createSessionManager,
  doSessionOp,
  type WebsocketData
} from '@hcengineering/server'
import serverClient from '@hcengineering/server-client'
import {
  createDummyStorageAdapter,
  loadBrandingMap, Pipeline,
  type ConnectionSocket,
  type PipelineFactory,
  type SessionManager
} from '@hcengineering/server-core'
// import { registerStringLoaders } from '@hcengineering/server-pipeline'
import serverPlugin, { decodeToken, type Token } from '@hcengineering/server-token'
import { DurableObject } from 'cloudflare:workers'

// Approach usefull only for separate build, after model-all bundle phase is executed.
import { createServerPipeline, registerServerPlugins } from '@hcengineering/server-pipeline'
import model from './model.json'

const rpcHandler = new RPCHandler()

export const PREFERRED_SAVE_SIZE = 500
export const PREFERRED_SAVE_INTERVAL = 30 * 1000

export class Transactor extends DurableObject<Env> {
  private workspace: string = ''

  private sessionManager!: SessionManager

  private readonly measureCtx: MeasureContext

  private readonly pipelineFactory: PipelineFactory

  private readonly accountsUrl: string

  private readonly sessions = new Map<WebSocket, WebsocketData>()

  constructor (ctx: DurableObjectState, env: Env) {
    super(ctx, env)

    registerServerPlugins()
    this.accountsUrl = env.ACCOUNTS_URL

    this.workspace = this.ctx.id.toString()
    this.measureCtx = new MeasureMetricsContext('transactor-' + this.workspace, {})

    setMetadata(serverPlugin.metadata.Secret, env.SERVER_SECRET)

    console.log('Connecting DB to', env.HYPERDRIVE.connectionString)

    // TODO:
    const storage = createDummyStorageAdapter()

    this.pipelineFactory = async (ctx, ws, upgrade, broadcast, branding) => {
      const pipeline = createServerPipeline(
        this.measureCtx,
        env.HYPERDRIVE.connectionString,
        model, {
          externalStorage: storage,
          adapterSecurity: false,
          disableTriggers: false,
          fulltextUrl: undefined // TODO: Pass fulltext service URI.
        })
      return await pipeline(ctx, ws, upgrade, broadcast, branding)
    }

    void this.ctx.blockConcurrencyWhile(async () => {
      setMetadata(serverClient.metadata.Endpoint, env.ACCOUNTS_URL)

      this.sessionManager = createSessionManager(
        this.measureCtx,
        (token: Token, pipeline: Pipeline, workspaceId: WorkspaceIdWithUrl, branding: Branding | null) =>
          new ClientSession(token, pipeline, workspaceId, branding, false),
        loadBrandingMap(), // TODO: Support branding map
        {
          pingTimeout: 10000,
          reconnectTimeout: 3000
        },
        undefined,
        this.accountsUrl
      )
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
        this.workspace = payload.workspace.name
      }

      if (!(await this.handleSession(server, request, payload, token, sessionId))) {
        return new Response(null, { status: 404 })
      }
      return new Response(null, { status: 101, webSocket: client })
    } catch (err: any) {
      console.error(err)
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
    doSessionOp(
      session,
      (s, buff) => {
        s.context.measure('receive-data', buff?.length ?? 0)
        // processRequest(s.session, cs, s.context, s.workspaceId, buff, handleRequest)
        const request = cs.readRequest(buff, s.session.binaryMode)
        this.sessionManager.handleRequest(this.measureCtx, s.session, cs, request, this.workspace)
      },
      typeof message === 'string' ? Buffer.from(message) : Buffer.from(message)
    )
  }

  async webSocketError (ws: WebSocket, error: unknown): Promise<void> {
    console.error('WebSocket error:', error)
    await this.handleClose(ws, 1011, 'error')
  }

  async alarm (): Promise<void> {}

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
      email: token.email,
      mode: token.extra?.mode,
      model: token.extra?.model
    }
    const cs = this.createWebsocketClientSocket(ws, data)

    const session = await this.sessionManager.addSession(
      this.measureCtx,
      cs,
      token,
      rawToken,
      this.pipelineFactory,
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
      if (session.terminate === true) {
        ws.close()
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
      cs.close()
      return true
    }

    this.sessions.set(ws, webSocketData)
    this.ctx.acceptWebSocket(ws)

    return true
  }

  createWebsocketClientSocket (
    ws: WebSocket,
    data: {
      remoteAddress: string
      userAgent: string
      language: string
      email: string
      mode: any
      model: any
    }
  ): ConnectionSocket {
    const cs: ConnectionSocket = {
      id: generateId(),
      isClosed: false,
      close: () => {
        cs.isClosed = true
        ws.close()
      },
      checkState: () => {
        if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
          ws.close()
          return false
        }
        return true
      },
      readRequest: (buffer: Buffer, binary: boolean) => {
        return rpcHandler.readRequest(buffer, binary)
      },
      data: () => data,
      send: (ctx: MeasureContext, msg, binary, compression) => {
        const smsg = rpcHandler.serialize(msg, binary)

        ctx.measure('send-data', smsg.length)
        if (ws.readyState !== WebSocket.OPEN || cs.isClosed) {
          return
        }
        ws.send(smsg)
      }
    }
    return cs
  }

  async broadcastMessage (message: Uint8Array, origin?: any): Promise<void> {
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
      console.error('Failed to send message:', error)
      await this.handleClose(ws, 1011, 'error')
    }
  }

  async handleClose (ws: WebSocket, code: number, reason?: string): Promise<void> {
    try {
      ws.close(code, reason)
    } catch (err) {
      console.error('Failed to close WebSocket:', err)
    }
    const session = this.sessions.get(ws)
    if (session !== undefined) {
      await this.sessionManager.close(this.measureCtx, session.connectionSocket as ConnectionSocket, this.workspace)
    }
  }
}
