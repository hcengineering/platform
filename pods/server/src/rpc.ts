import core, {
  buildSocialIdString,
  generateId,
  systemAccountUuid,
  pickPrimarySocialId,
  TxFactory,
  TxProcessor,
  type AttachedData,
  type Data,
  type Class,
  type Doc,
  type MeasureContext,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type TxCUD
} from '@hcengineering/core'
import type { ClientSessionCtx, ConnectionSocket, Session, SessionManager } from '@hcengineering/server-core'
import { decodeToken } from '@hcengineering/server-token'
import { rpcJSONReplacer, type RateLimitInfo } from '@hcengineering/rpc'
import contact, {
  AvatarType,
  combineName,
  type SocialIdentity,
  type Person,
  type SocialIdentityRef
} from '@hcengineering/contact'
import { type AccountClient, getClient as getAccountClientRaw } from '@hcengineering/account-client'

import { createHash } from 'crypto'
import { type Express, type Response as ExpressResponse, type Request } from 'express'
import type { OutgoingHttpHeaders } from 'http2'
import { compress } from 'snappy'
import { promisify } from 'util'
import { gzip } from 'zlib'
import { retrieveJson } from './utils'

import { unknownError } from '@hcengineering/platform'
interface RPCClientInfo {
  client: ConnectionSocket
  session: Session
  workspaceId: string
}

const gzipAsync = promisify(gzip)

const keepAliveOptions = {
  'keep-alive': 'timeout=5, max=1000',
  Connection: 'keep-alive'
}

const sendError = (res: ExpressResponse, code: number, data: any): void => {
  res.writeHead(code, {
    ...keepAliveOptions,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache'
  })
  res.end(JSON.stringify(data))
}

function rateLimitToHeaders (rateLimit?: RateLimitInfo): OutgoingHttpHeaders {
  if (rateLimit === undefined) {
    return {}
  }
  const { remaining, limit, reset, retryAfter } = rateLimit
  return {
    'Retry-After': `${Math.max(retryAfter ?? 0, 1)}`,
    'Retry-After-ms': `${retryAfter ?? 0}`,
    'X-RateLimit-Limit': `${limit}`,
    'X-RateLimit-Remaining': `${remaining}`,
    'X-RateLimit-Reset': `${reset}`
  }
}

async function sendJson (
  req: Request,
  res: ExpressResponse,
  result: any,
  extraHeaders?: OutgoingHttpHeaders
): Promise<void> {
  // Calculate ETag
  let body: any = JSON.stringify(result, rpcJSONReplacer)

  const etag = createHash('sha256').update(body).digest('hex')
  const headers: OutgoingHttpHeaders = {
    ...(extraHeaders ?? {}),
    ...keepAliveOptions,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    ETag: etag
  }

  // Check if the ETag matches
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers)
    res.end()
    return
  }

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
  headers['content-length'] = body.length
  res.writeHead(200, headers)
  res.end(body)
}

export function registerRPC (app: Express, sessions: SessionManager, ctx: MeasureContext, accountsUrl: string): void {
  const rpcSessions = new Map<string, RPCClientInfo>()

  function getAccountClient (token?: string): AccountClient {
    return getAccountClientRaw(accountsUrl, token)
  }

  async function withSession (
    req: Request,
    res: ExpressResponse,
    operation: (
      ctx: ClientSessionCtx,
      session: Session,
      rateLimit: RateLimitInfo | undefined,
      token: string
    ) => Promise<void>
  ): Promise<void> {
    try {
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
      if (workspaceId !== decodedToken.workspace) {
        sendError(res, 401, { message: 'Invalid workspace', workspace: decodedToken.workspace })
        return
      }

      let transactorRpc = rpcSessions.get(token)

      if (transactorRpc === undefined) {
        const cs: ConnectionSocket = createClosingSocket(token, rpcSessions)
        const s = await sessions.addSession(ctx, cs, decodedToken, token, token)
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

      const rpc = transactorRpc
      const rateLimit = await sessions.handleRPC(ctx, rpc.session, rpc.client, async (ctx, rateLimit) => {
        await operation(ctx, rpc.session, rateLimit, token)
      })
      if (rateLimit !== undefined) {
        const { remaining, limit, reset, retryAfter } = rateLimit
        const retryHeaders: OutgoingHttpHeaders = {
          ...keepAliveOptions,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Retry-After': `${Math.max((retryAfter ?? 0) / 1000, 1)}`,
          'Retry-After-ms': `${retryAfter ?? 0}`,
          'X-RateLimit-Limit': `${limit}`,
          'X-RateLimit-Remaining': `${remaining}`,
          'X-RateLimit-Reset': `${reset}`
        }
        res.writeHead(429, retryHeaders)
        res.end(
          JSON.stringify({
            id: -1,
            error: unknownError('Rate limit')
          })
        )
      }
    } catch (err: any) {
      sendError(res, 500, { message: 'Failed to execute operation', error: err.message, stack: err.stack })
    }
  }

  app.get('/api/v1/ping/:workspaceId', (req, res) => {
    void withSession(req, res, async (ctx, session, rateLimit) => {
      await session.ping(ctx)
      await sendJson(
        req,
        res,
        {
          pong: true,
          lastTx: ctx.pipeline.context.lastTx,
          lastHash: ctx.pipeline.context.lastHash
        },
        rateLimitToHeaders(rateLimit)
      )
    })
  })

  app.get('/api/v1/find-all/:workspaceId', (req, res) => {
    void withSession(req, res, async (ctx, session, rateLimit) => {
      const _class = req.query.class as Ref<Class<Doc>>
      const query = req.query.query !== undefined ? JSON.parse(req.query.query as string) : {}
      const options = req.query.options !== undefined ? JSON.parse(req.query.options as string) : {}

      const result = await session.findAllRaw(ctx, _class, query, options)
      await sendJson(req, res, result, rateLimitToHeaders(rateLimit))
    })
  })

  app.post('/api/v1/find-all/:workspaceId', (req, res) => {
    void withSession(req, res, async (ctx, session, rateLimit) => {
      const { _class, query, options }: any = (await retrieveJson(req)) ?? {}

      const result = await session.findAllRaw(ctx, _class, query, options)
      await sendJson(req, res, result, rateLimitToHeaders(rateLimit))
    })
  })

  app.post('/api/v1/tx/:workspaceId', (req, res) => {
    void withSession(req, res, async (ctx, session, rateLimit) => {
      const tx: any = (await retrieveJson(req)) ?? {}

      const result = await session.txRaw(ctx, tx)
      await sendJson(req, res, result.result, rateLimitToHeaders(rateLimit))
    })
  })
  app.get('/api/v1/account/:workspaceId', (req, res) => {
    void withSession(req, res, async (ctx, session, rateLimit) => {
      const result = session.getRawAccount()
      await sendJson(req, res, result, rateLimitToHeaders(rateLimit))
    })
  })

  app.get('/api/v1/load-model/:workspaceId', (req, res) => {
    void withSession(req, res, async (ctx, session, rateLimit) => {
      const lastModelTx = parseInt((req.query.lastModelTx as string) ?? '0')
      const lastHash = req.query.lastHash as string
      const result = await session.loadModelRaw(ctx, lastModelTx, lastHash)
      const txes = Array.isArray(result) ? result : result.transactions
      // we need to filter only hierarchy related txes.
      const allowedClasess: Ref<Class<Doc>>[] = [
        core.class.Class,
        core.class.Attribute,
        core.class.Mixin,
        core.class.Type,
        core.class.Status,
        core.class.Permission,
        core.class.Space,
        core.class.Tx
      ]
      const h = ctx.pipeline.context.hierarchy
      const filtered = txes.filter(
        (it) =>
          TxProcessor.isExtendsCUD(it._class) &&
          allowedClasess.some((cl) => h.isDerived((it as TxCUD<Doc>).objectClass, cl))
      )

      await sendJson(req, res, filtered, rateLimitToHeaders(rateLimit))
    })
  })

  app.get('/api/v1/search-fulltext/:workspaceId', (req, res) => {
    void withSession(req, res, async (ctx, session, rateLimit) => {
      const query: SearchQuery = {
        query: req.query.query as string,
        classes: req.query.classes !== undefined ? JSON.parse(req.query.classes as string) : undefined,
        spaces: req.query.spaces !== undefined ? JSON.parse(req.query.spaces as string) : undefined
      }
      const options: SearchOptions = {
        limit: req.query.limit !== undefined ? parseInt(req.query.limit as string) : undefined
      }
      const result = await session.searchFulltextRaw(ctx, query, options)
      await sendJson(req, res, result, rateLimitToHeaders(rateLimit))
    })
  })

  app.get('/api/v1/find-messages/:workspaceId', (req, res) => {
    void withSession(req, res, async (ctx, session) => {
      const params = req.query.params !== undefined ? JSON.parse(req.query.params as string) : {}

      const result = await session.findMessagesRaw(ctx, params)
      await sendJson(req, res, result)
    })
  })
  app.get('/api/v1/find-messages-groups/:workspaceId', (req, res) => {
    void withSession(req, res, async (ctx, session) => {
      const params = req.query.params !== undefined ? JSON.parse(req.query.params as string) : {}

      const result = await session.findMessagesGroupsRaw(ctx, params)
      await sendJson(req, res, result)
    })
  })
  app.post('/api/v1/event/:workspaceId', (req, res) => {
    void withSession(req, res, async (ctx, session) => {
      const event: any = (await retrieveJson(req)) ?? {}

      const result = await session.eventRaw(ctx, event)
      await sendJson(req, res, result)
    })
  })

  app.post('/api/v1/ensure-person/:workspaceId', (req, res) => {
    void withSession(req, res, async (ctx, session, rateLimit, token) => {
      const { socialType, socialValue, firstName, lastName } = (await retrieveJson(req)) ?? {}
      const accountClient = getAccountClient(token)

      const { uuid, socialId } = await accountClient.ensurePerson(socialType, socialValue, firstName, lastName)
      const primaryPersonId =
        session.getUser() === systemAccountUuid ? core.account.System : pickPrimarySocialId(session.getSocialIds())._id
      const txFactory: TxFactory = new TxFactory(primaryPersonId)

      const [person] = await session.findAllRaw(ctx, contact.class.Person, { personUuid: uuid }, { limit: 1 })
      let personRef: Ref<Person> = person?._id

      if (personRef === undefined) {
        const createPersonTx = txFactory.createTxCreateDoc(contact.class.Person, contact.space.Contacts, {
          avatarType: AvatarType.COLOR,
          name: combineName(firstName, lastName),
          personUuid: uuid
        })

        await session.txRaw(ctx, createPersonTx)
        personRef = createPersonTx.objectId
      }

      const [socialIdentity] = await session.findAllRaw(
        ctx,
        contact.class.SocialIdentity,
        {
          attachedTo: personRef,
          type: socialType,
          value: socialValue
        },
        { limit: 1 }
      )

      if (socialIdentity === undefined) {
        const data: AttachedData<SocialIdentity> = {
          key: buildSocialIdString({ type: socialType, value: socialValue }),
          type: socialType,
          value: socialValue
        }

        const addSocialIdentityTx = txFactory.createTxCollectionCUD(
          contact.class.Person,
          personRef,
          contact.space.Contacts,
          'socialIds',
          txFactory.createTxCreateDoc(
            contact.class.SocialIdentity,
            contact.space.Contacts,
            data as Data<SocialIdentity>,
            socialId as SocialIdentityRef
          )
        )

        await session.txRaw(ctx, addSocialIdentityTx)
      }

      const result = { uuid, socialId, localPerson: personRef }

      await sendJson(req, res, result, rateLimitToHeaders(rateLimit))
    })
  })

  // To use in non-js (rust) clients that can't link to @hcengineering/core
  app.get('/api/v1/generate-id/:workspaceId', (req, res) => {
    void withSession(req, res, async (ctx, session, rateLimit) => {
      const result = { id: generateId() }
      await sendJson(req, res, result, rateLimitToHeaders(rateLimit))
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
    send: async (ctx, msg, binary, compression) => {},
    isBackpressure: () => false,
    backpressure: async (ctx) => {},
    sendPong: () => {},
    data: () => ({}),
    readRequest: (buffer, binary) => ({ method: '', params: [], id: -1, time: Date.now() }),
    checkState: () => true
  }
}
