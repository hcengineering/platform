import {
  systemAccountUuid,
  type Account,
  type Branding,
  type Class,
  type Doc,
  type DocumentQuery,
  type Domain,
  type DomainParams,
  type DomainResult,
  type FindOptions,
  type FindResult,
  type LoadModelResponse,
  type MeasureContext,
  type OperationDomain,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type SocialStringsToUsers,
  type Timestamp,
  type Tx,
  type TxResult,
  type WorkspaceIds
} from '@hcengineering/core'
import type {
  ContainerConnection,
  ContainerKind,
  ContainerReference,
  ContainerUuid,
  NetworkClient
} from '@hcengineering/network-core'
import {
  ClientSession,
  type BroadcastOps,
  type ConnectionSocket,
  type LoadChunkResult,
  type Session,
  type WorkspaceService
} from '@hcengineering/server-core'
import type { Token } from '@hcengineering/server-token'
import { transactorKind } from './types'

export class WorkspaceServiceClient implements WorkspaceService {
  ref: ContainerReference | Promise<ContainerReference>
  connection: ContainerConnection | Promise<ContainerConnection>

  sessions = new Map<string, { session: Session, socket: ConnectionSocket, tickHash: number }>()

  operations: number = 0

  softShutdown: number = 0
  tickHash: number = 0

  constructor (
    readonly client: NetworkClient,
    readonly context: MeasureContext,
    readonly wsId: WorkspaceIds,
    readonly version: string,
    readonly broadcast: BroadcastOps,
    readonly socialStringsToUsers: SocialStringsToUsers,
    readonly branding: Branding | null,
    readonly region: string
  ) {
    const containerId = ('tr_' + wsId.uuid + `${version}`) as ContainerUuid
    this.ref = client.get((transactorKind + region) as ContainerKind, {
      uuid: containerId,
      extra: {
        ids: wsId,
        branding
      }
    })

    void this.ref.then((r) => {
      console.log('Connected to transactor', { containerId, region, ref: r })
    })

    this.connection = this.ref.then((r) => {
      console.log('connecting to workspace')
      return r.connect()
    })
    void this.connection.then(() => {
      console.log('Connected to workspace')
    })

    void this.connection.then((c) => {
      c.on = this.handleData.bind(this)
    })
  }

  async handleData (data?: any): Promise<void> {
    // Handle incoming data if necessary
    if (Array.isArray(data)) {
      if (data[0] === 'broadcast') {
        const [, tx, targets, exclude] = data
        this.broadcast.broadcast(tx, targets, exclude)
      }
      if (data[0] === 'broadcast-sessions') {
        const [, sessions] = data
        this.broadcast.broadcastSessions(this.context, sessions)
      }
    }
  }

  async close (ctx: MeasureContext): Promise<void> {
    await (await this.connection).close()
    await (await this.ref).close()
  }

  async request (operation: string, data?: any): Promise<any> {
    let connection = this.connection
    if (connection instanceof Promise) {
      connection = await connection
      this.connection = connection
    }
    return await connection.request(operation, data)
  }

  async createSession (ctx: MeasureContext, sessionId: string, token: Token, account: Account): Promise<Session> {
    if (account.uuid !== systemAccountUuid) {
      // Just fill social ids, do not clean
      for (const id of account.fullSocialIds) {
        this.socialStringsToUsers.set(id._id, {
          accountUuid: account.uuid,
          role: account.role
        })
      }
    }

    await this.request('registerSession', {
      meta: ctx.extractMeta(),
      token,
      sessionId,
      account
    })

    return new ClientSession(token, sessionId, this.wsId, account, token.extra?.mode === 'backup')
  }

  async closeSession (ctx: MeasureContext, session: Session): Promise<void> {
    await this.request('closeSession', {
      meta: ctx.extractMeta(),
      sessionId: session.sessionId
    })
  }

  loadModel (
    ctx: MeasureContext,
    client: Session,
    lastModelTx?: Timestamp,
    hash?: string,
    filter?: boolean
  ): Promise<LoadModelResponse | Tx[]> {
    return this.request('loadModel', {
      meta: ctx.extractMeta(),
      sessionId: client.sessionId,
      params: [lastModelTx, hash, filter]
    })
  }

  findAll<T extends Doc>(
    ctx: MeasureContext,
    client: Session,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return this.request('findAll', {
      meta: ctx.extractMeta(),
      sessionId: client.sessionId,
      params: [_class, query, options]
    })
  }

  searchFulltext (
    ctx: MeasureContext,
    client: Session,
    query: SearchQuery,
    options: SearchOptions
  ): Promise<SearchResult> {
    return this.request('searchFulltext', {
      meta: ctx.extractMeta(),
      sessionId: client.sessionId,
      params: [query, options]
    })
  }

  async tx (
    ctx: MeasureContext,
    session: Session,
    tx: Tx,
    onResult?: (result: TxResult) => Promise<void>
  ): Promise<TxResult> {
    const resp = await this.request('tx', {
      meta: ctx.extractMeta(),
      sessionId: session.sessionId,
      params: [tx]
    })
    await onResult?.(resp)
    return resp
  }

  async domainRequest (
    ctx: MeasureContext,
    session: Session,
    domain: OperationDomain,
    params: DomainParams,
    onResult?: (result: DomainResult) => Promise<void>
  ): Promise<DomainResult> {
    const resp = await this.request('domainRequest', {
      meta: ctx.extractMeta(),
      sessionId: session.sessionId,
      params: [domain, params]
    })
    await onResult?.(resp)
    return resp
  }

  async getLastTxHash (ctx: MeasureContext): Promise<{ lastTx?: string, lastHash?: string }> {
    return await this.request('getLastTxHash', {
      meta: ctx.extractMeta()
    })
  }

  loadChunk (ctx: MeasureContext, client: Session, domain: Domain, idx?: number): Promise<LoadChunkResult> {
    return this.request('loadChunk', {
      meta: ctx.extractMeta(),
      sessionId: client.sessionId,
      params: [domain, idx]
    })
  }

  async getDomainHash (ctx: MeasureContext, domain: Domain): Promise<string> {
    return await this.request('getDomainHash', { meta: ctx.extractMeta(), params: [domain] })
  }

  closeChunk (ctx: MeasureContext, client: Session, idx: number): Promise<any> {
    return this.request('closeChunk', {
      meta: ctx.extractMeta(),
      sessionId: client.sessionId,
      params: [idx]
    })
  }

  loadDocs (ctx: MeasureContext, client: Session, domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return this.request('loadDocs', {
      meta: ctx.extractMeta(),
      sessionId: client.sessionId,
      params: [domain, docs]
    })
  }

  upload (ctx: MeasureContext, client: Session, domain: Domain, docs: Doc[]): Promise<any> {
    return this.request('upload', {
      meta: ctx.extractMeta(),
      sessionId: client.sessionId,
      params: [domain, docs]
    })
  }

  clean (ctx: MeasureContext, client: Session, domain: Domain, docs: Ref<Doc>[]): Promise<any> {
    return this.request('clean', {
      meta: ctx.extractMeta(),
      sessionId: client.sessionId,
      params: [domain, docs]
    })
  }
}
