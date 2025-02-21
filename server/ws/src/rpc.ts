import type { Class, Doc, MeasureContext, Ref } from '@hcengineering/core'
import type {
  ClientSessionCtx,
  ConnectionSocket,
  PipelineFactory,
  Session,
  SessionManager
} from '@hcengineering/server-core'
import { decodeToken } from '@hcengineering/server-token'

import { type Express, type Response as ExpressResponse, type Request } from 'express'
import type { OutgoingHttpHeaders } from 'http2'
import { compress } from 'snappy'
import { promisify } from 'util'
import { gzip } from 'zlib'
import { retrieveJson } from './utils'
interface RPCClientInfo {
  client: ConnectionSocket
  session: Session
  workspaceId: string
}

const gzipAsync = promisify(gzip)

const sendError = (res: ExpressResponse, code: number, data: any): void => {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'keep-alive': 'timeout=5, max=1000'
  })
  res.end(JSON.stringify(data))
}

async function sendJson (req: Request, res: ExpressResponse, result: any): Promise<void> {
  const headers: OutgoingHttpHeaders = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'keep-alive': 'timeout=5, max=1000'
  }
  let body: any = JSON.stringify(result)

  const contentEncodings: string[] =
    typeof req.headers['accept-encoding'] === 'string'
      ? req.headers['accept-encoding'].split(',').map((it) => it.trim())
      : req.headers['accept-encoding'] ?? []
  for (const contentEncoding of contentEncodings) {
    let done = false
    switch (contentEncoding) {
      case 'snappy':
        headers['content-encoding'] = 'snappy'
        body = await compress(body)
        done = true
        break
      case 'gzip':
        headers['content-encoding'] = 'gzip'
        body = await gzipAsync(body)
        done = true
        break
    }
    if (done) {
      break
    }
  }

  res.writeHead(200, headers)
  res.end(body)
}

export function registerRPC (
  app: Express,
  sessions: SessionManager,
  ctx: MeasureContext,
  pipelineFactory: PipelineFactory
): void {
  const rpcSessions = new Map<string, RPCClientInfo>()

  async function withSession (
    req: Request,
    res: ExpressResponse,
    operation: (ctx: ClientSessionCtx, session: Session) => Promise<void>
  ): Promise<void> {
    if (req.params.workspaceId === undefined || req.params.workspaceId === '') {
      res.writeHead(400, {})
      res.end('Missing workspace')
      return
    }
    let token = req.headers.authorization as string
    if (token === null) {
      sendError(res, 401, { message: 'Missing Authorization header' })
      return
    }
    const workspaceId = decodeURIComponent(req.params.workspaceId)
    token = token.split(' ')[1]

    const decodedToken = decodeToken(token)
    if (workspaceId !== decodedToken.workspace.name) {
      sendError(res, 401, { message: 'Invalid workspace' })
      return
    }

    let transactorRpc = rpcSessions.get(token)

    if (transactorRpc === undefined) {
      const cs: ConnectionSocket = createClosingSocket(token, rpcSessions)
      const s = await sessions.addSession(ctx, cs, decodedToken, token, pipelineFactory, token)
      if (!('session' in s)) {
        sendError(res, 401, {
          message: 'Failed to create session',
          mode: 'specialError' in s ? s.specialError ?? '' : 'upgrading'
        })
        return
      }
      transactorRpc = { session: s.session, client: cs, workspaceId: s.workspaceId }
      rpcSessions.set(token, transactorRpc)
    }
    try {
      const rpc = transactorRpc
      await sessions.handleRPC(ctx, rpc.session, rpc.client, async (ctx) => {
        await operation(ctx, rpc.session)
      })
    } catch (err: any) {
      sendError(res, 401, { message: 'Failed to execute operation', error: err.message, stack: err.stack })
    }
  }

  app.get('/api/v1/ping/:workspaceId', (req, res) => {
    void withSession(req, res, async (ctx, session) => {
      await session.ping(ctx)
      await sendJson(req, res, { pong: true })
    })
  })

  app.get('/api/v1/find-all/:workspaceId', (req, res) => {
    void withSession(req, res, async (ctx, session) => {
      const _class = req.query.class as Ref<Class<Doc>>
      const query = req.query.query !== undefined ? JSON.parse(req.query.query as string) : {}
      const options = req.query.options !== undefined ? JSON.parse(req.query.options as string) : {}

      const result = await session.findAllRaw(ctx.ctx, ctx.pipeline, _class, query, options)
      await sendJson(req, res, result)
    })
  })

  app.post('/api/v1/find-all/:workspaceId', (req, res) => {
    void withSession(req, res, async (ctx, session) => {
      const { _class, query, options }: any = (await retrieveJson(req)) ?? {}

      const result = await session.findAllRaw(ctx.ctx, ctx.pipeline, _class, query, options)
      await sendJson(req, res, result)
    })
  })

  app.post('/api/v1/tx/:workspaceId', (req, res) => {
    void withSession(req, res, async (ctx, session) => {
      const tx: any = (await retrieveJson(req)) ?? {}

      const result = await session.txRaw(ctx, tx)
      await sendJson(req, res, result.result)
    })
  })
  app.get('/api/v1/account/:workspaceId', (req, res) => {
    void withSession(req, res, async (ctx, session) => {
      const result = session.getRawAccount(ctx.pipeline)
      await sendJson(req, res, result)
    })
  })
}

function createClosingSocket (rawToken: string, rpcSessions: Map<string, RPCClientInfo>): ConnectionSocket {
  return {
    id: rawToken,
    isClosed: false,
    close: () => {
      rpcSessions.delete(rawToken)
    },
    send: (ctx, msg, binary, compression) => {},
    sendPong: () => {},
    data: () => ({}),
    readRequest: (buffer, binary) => ({ method: '', params: [], id: -1, time: Date.now() }),
    checkState: () => true
  }
}
