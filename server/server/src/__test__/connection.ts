import {
  ClientConnectEvent,
  generateId,
  type Account,
  type AccountUuid,
  type Class,
  type ClientConnection,
  type ClientConnectOptions,
  type Doc,
  type DocChunk,
  type DocumentQuery,
  type Domain,
  type FindOptions,
  type FindResult,
  type Handler,
  type LoadModelResponse,
  type MeasureContext,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type Storage,
  type SubscribedWorkspaceInfo,
  type Timestamp,
  type Tx,
  type TxHandler,
  type TxOptions,
  type TxResult,
  type WorkspaceUuid
} from '@hcengineering/core'
import type { Request, Response } from '@hcengineering/rpc'
import type { ConnectionSocket } from '@hcengineering/server-core'
import type { ClientSession } from '../client'
import type { TSessionManager } from '../sessionManager'
import type { ClientSessionCtx } from '../types'
import type { Workspace } from '../workspace'

export class CollectConnectionSocket implements ConnectionSocket {
  id: string = generateId()
  private _isClosed: boolean = false
  private readonly _data: Record<string, any> = {}
  private backpressurePromise: Promise<void> | undefined

  isClosed: boolean = false

  messagesTo: Response<any>[] = []

  close: () => void = () => {
    this._isClosed = true
    this.isClosed = true
  }

  send: (ctx: MeasureContext, msg: Response<any>, binary: boolean, compression: boolean) => Promise<void> = async (
    ctx,
    msg,
    binary,
    compression
  ) => {
    if (this._isClosed) {
      throw new Error('Connection is closed')
    }

    this.messagesTo.push(msg)
  }

  sendPong: () => void = () => {
    // Simulate pong response
  }

  data: () => Record<string, any> = () => {
    return { ...this._data }
  }

  readRequest: (buffer: Buffer, binary: boolean) => Request<any> = (buffer, binary) => {
    // Mock request parsing from buffer
    return JSON.parse(buffer.toString())
  }

  isBackpressure: () => boolean = () => {
    return this.backpressurePromise !== undefined
  }

  backpressure: (ctx: MeasureContext) => Promise<void> = async (ctx) => {
    if (this.backpressurePromise === undefined) {
      this.backpressurePromise = new Promise((resolve) => {
        setTimeout(() => {
          this.backpressurePromise = undefined
          resolve()
        }, 100)
      })
    }
    await this.backpressurePromise
  }

  checkState: () => boolean = () => {
    return !this._isClosed
  }
}

export class SMClientConnection implements ClientConnection {
  reqId: number = 0

  constructor (
    readonly ctx: MeasureContext,
    readonly endpoint: string,
    readonly account: Account,
    readonly sessionManager: TSessionManager,
    readonly session: ClientSession,

    readonly handler: TxHandler,
    readonly options?: ClientConnectOptions
  ) {
    if (options?.onConnect !== undefined) {
      void options.onConnect(ClientConnectEvent.Connected, {}, {})
    }
    if (options?.onAccount !== undefined) {
      options.onAccount(this.account)
    }
    sessionManager.addBroadcastHandler(this.handler)
  }

  isConnected: () => boolean = () => true

  close: () => Promise<void> = async () => {}

  async loadModel (last: Timestamp, hash?: string, workspace?: WorkspaceUuid): Promise<Tx[] | LoadModelResponse> {
    return await this.session.loadModelRaw(this.toContext(this.ctx, workspace), last, hash)
  }

  getLastHash?: ((ctx: MeasureContext) => Promise<Record<WorkspaceUuid, string | undefined>>) | undefined =
    async () => ({})

  pushHandler: (handler: Handler) => void = () => {}

  private getWorkspace (workspace: WorkspaceUuid | undefined): Workspace {
    if (workspace === undefined) {
      throw new Error('Workspace not specified')
    }

    const workspaceRef = this.sessionManager.workspaces.get(workspace)
    if (workspaceRef === undefined) {
      throw new Error('Workspace not found')
    }
    return workspaceRef
  }

  async getAccount (): Promise<Account> {
    return this.account
  }

  subscribe (subscription: {
    accounts?: AccountUuid[]
    workspaces?: WorkspaceUuid[]
  }): Promise<SubscribedWorkspaceInfo> {
    return this.sessionManager.handleSubcribe(this.ctx, this.session, subscription, true)
  }

  unsubscribe (subscription: { accounts?: AccountUuid[], workspaces?: WorkspaceUuid[] }): Promise<void> {
    return this.sessionManager.handleSubcribe(this.ctx, this.session, subscription, false).then()
  }

  toContext (ctx: MeasureContext, workspace: WorkspaceUuid | undefined): ClientSessionCtx {
    const workspaceRef = this.getWorkspace(workspace)
    return this.sessionManager.createOpContext(
      this.ctx,
      this.ctx,
      [workspaceRef],
      this.reqId++,
      this.session,
      new CollectConnectionSocket(),
      undefined
    )
  }

  findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return this.session.findAllRaw(this.toContext(this.ctx, options?.workspace as WorkspaceUuid), _class, query)
  }

  tx (tx: Tx, options?: TxOptions): Promise<TxResult> {
    return this.session.txRaw(this.toContext(this.ctx, tx._uuid), tx, options?.user)
  }

  searchFulltext (query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    return this.session.searchFulltextRaw(this.toContext(this.ctx, options.workspace), query, options)
  }

  loadChunk (workspaceId: WorkspaceUuid, domain: Domain, idx?: number): Promise<DocChunk> {
    return this.session.loadChunkRaw(this.toContext(this.ctx, workspaceId), workspaceId, domain, idx)
  }

  closeChunk (workspaceId: WorkspaceUuid, idx: number): Promise<void> {
    return this.session.closeChunkRaw(this.toContext(this.ctx, workspaceId), workspaceId, idx)
  }

  loadDocs (workspaceId: WorkspaceUuid, domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return this.session.loadDocsRaw(this.toContext(this.ctx, workspaceId), workspaceId, domain, docs)
  }

  upload (workspaceId: WorkspaceUuid, domain: Domain, docs: Doc[]): Promise<void> {
    return this.session.uploadRaw(this.toContext(this.ctx, workspaceId), workspaceId, domain, docs)
  }

  clean (workspaceId: WorkspaceUuid, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    return this.session.cleanRaw(this.toContext(this.ctx, workspaceId), workspaceId, domain, docs)
  }

  async getDomainHash (workspaceId: WorkspaceUuid, domain: Domain): Promise<string> {
    return await this.session.getDomainHashRaw(this.toContext(this.ctx, workspaceId), workspaceId, domain)
  }

  async sendForceClose (workspace: WorkspaceUuid): Promise<void> {
    // TODO: Check if required for tests
  }
}

export class ClientConnectionWrapper implements Storage {
  constructor (
    readonly sessionManager: TSessionManager,
    readonly session: ClientSession
  ) {}

  findAll: <T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>> = async (_class, query, options) => {
      const ctx = this.sessionManager.createOpContext(
        this.sessionManager.ctx,
        this.sessionManager.ctx,
        Array.from(this.sessionManager.workspaces.values()),
        0,
        this.session,
        new CollectConnectionSocket(),
        undefined
      )
      return await this.session.findAllRaw(ctx, _class, query, options)
    }

  tx: (tx: Tx) => Promise<TxResult> = async (tx) => {
    const ctx = this.sessionManager.createOpContext(
      this.sessionManager.ctx,
      this.sessionManager.ctx,
      Array.from(this.sessionManager.workspaces.values()),
      0,
      this.session,
      new CollectConnectionSocket(),
      undefined
    )
    return await this.session.txRaw(ctx, tx)
  }
}
