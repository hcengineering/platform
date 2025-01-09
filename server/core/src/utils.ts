import core, {
  AccountRole,
  ClientConnectEvent,
  WorkspaceEvent,
  generateId,
  getTypeOf,
  systemAccountEmail,
  type Account,
  type BackupClient,
  type Branding,
  type BrandingMap,
  type BulkUpdateEvent,
  type Class,
  type Client,
  type ClientConnection,
  type Doc,
  type DocChunk,
  type DocumentQuery,
  type Domain,
  type FindOptions,
  type FindResult,
  type MeasureContext,
  type ModelDb,
  type Ref,
  type SearchResult,
  type SessionData,
  type Tx,
  type TxResult,
  type TxWorkspaceEvent,
  type WorkspaceIdWithUrl
} from '@hcengineering/core'
import platform, { PlatformError, Severity, Status, unknownError } from '@hcengineering/platform'
import { type Hash } from 'crypto'
import fs from 'fs'
import type { DbAdapter } from './adapter'
import { BackupClientOps } from './storage'
import type { Pipeline } from './types'

/**
 * Return some estimation for object size
 */
export function estimateDocSize (_obj: any): number {
  let result = 0
  const toProcess = [_obj]
  while (toProcess.length > 0) {
    const obj = toProcess.shift()
    if (typeof obj === 'undefined') {
      continue
    }
    if (typeof obj === 'function') {
      continue
    }
    for (const key in obj) {
      // include prototype properties
      const value = obj[key]
      const type = getTypeOf(value)
      result += key.length

      switch (type) {
        case 'Array':
          result += 4
          toProcess.push(value)
          break
        case 'Object':
          toProcess.push(value)
          break
        case 'Date':
          result += 24 // Some value
          break
        case 'string':
          result += (value as string).length
          break
        case 'number':
          result += 8
          break
        case 'boolean':
          result += 1
          break
        case 'symbol':
          result += (value as symbol).toString().length
          break
        case 'bigint':
          result += (value as bigint).toString().length
          break
        case 'undefined':
          result += 1
          break
        case 'null':
          result += 1
          break
        default:
          result += value.toString().length
      }
    }
  }
  return result
}
/**
 * Calculate hash for object
 */
export function updateHashForDoc (hash: Hash, _obj: any): void {
  const toProcess = [_obj]
  while (toProcess.length > 0) {
    const obj = toProcess.shift()
    if (typeof obj === 'undefined') {
      continue
    }
    if (typeof obj === 'function') {
      continue
    }
    const keys = Object.keys(obj).sort()
    // We need sorted list of keys to make it consistent
    for (const key of keys) {
      // include prototype properties
      const value = obj[key]
      const type = getTypeOf(value)
      hash.update(key)

      switch (type) {
        case 'Array':
          toProcess.push(value)
          break
        case 'Object':
          toProcess.push(value)
          break
        case 'Date':
          hash.update(value.toString())
          break
        case 'string':
          hash.update(value)
          break
        case 'number':
          hash.update((value as number).toString(16))
          break
        case 'boolean':
          hash.update((value as boolean) ? '1' : '0')
          break
        case 'symbol':
          hash.update((value as symbol).toString())
          break
        case 'bigint':
          hash.update((value as bigint).toString())
          break
        case 'undefined':
          hash.update('und')
          break
        case 'null':
          hash.update('null')
          break
        default:
          hash.update(value.toString())
      }
    }
  }
}

export function getUser (modelDb: ModelDb, userEmail: string | undefined, admin?: boolean): Account {
  if (userEmail === undefined) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }
  const account = modelDb.getAccountByEmail(userEmail)
  if (account === undefined) {
    if (userEmail === systemAccountEmail || admin === true) {
      return {
        _id: core.account.System,
        _class: core.class.Account,
        role: AccountRole.Owner,
        email: systemAccountEmail,
        space: core.space.Model,
        modifiedBy: core.account.System,
        modifiedOn: 0
      }
    }
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  }
  return account
}

export class SessionDataImpl implements SessionData {
  _account: Account | undefined
  _removedMap: Map<Ref<Doc>, Doc> | undefined
  _contextCache: Map<string, any> | undefined
  _broadcast: SessionData['broadcast'] | undefined

  constructor (
    readonly userEmail: string,
    readonly sessionId: string,
    readonly admin: boolean | undefined,
    _broadcast: SessionData['broadcast'] | undefined,
    readonly workspace: WorkspaceIdWithUrl,
    readonly branding: Branding | null,
    readonly isAsyncContext: boolean,
    _removedMap: Map<Ref<Doc>, Doc> | undefined,
    _contextCache: Map<string, any> | undefined,
    readonly modelDb: ModelDb,
    readonly rawAccount?: Account
  ) {
    this._removedMap = _removedMap
    this._contextCache = _contextCache
    this._broadcast = _broadcast
  }

  get broadcast (): SessionData['broadcast'] {
    if (this._broadcast === undefined) {
      this._broadcast = {
        targets: {},
        txes: []
      }
    }
    return this._broadcast
  }

  get removedMap (): Map<Ref<Doc>, Doc> {
    if (this._removedMap === undefined) {
      this._removedMap = new Map()
    }
    return this._removedMap
  }

  get contextCache (): Map<string, any> {
    if (this._contextCache === undefined) {
      this._contextCache = new Map()
    }
    return this._contextCache
  }

  get account (): Account {
    this._account = this.rawAccount ?? this._account ?? getUser(this.modelDb, this.userEmail, this.admin)
    return this._account
  }

  getAccount (account: Ref<Account>): Account | undefined {
    return this.modelDb.findObject(account)
  }
}

export function createBroadcastEvent (classes: Ref<Class<Doc>>[]): TxWorkspaceEvent<BulkUpdateEvent> {
  return {
    _class: core.class.TxWorkspaceEvent,
    _id: generateId(),
    event: WorkspaceEvent.BulkUpdate,
    params: {
      _class: classes
    },
    modifiedBy: core.account.System,
    modifiedOn: Date.now(),
    objectSpace: core.space.DerivedTx,
    space: core.space.DerivedTx
  }
}

export function loadBrandingMap (brandingPath?: string): BrandingMap {
  let brandings: BrandingMap = {}
  if (brandingPath !== undefined && brandingPath !== '') {
    brandings = JSON.parse(fs.readFileSync(brandingPath, 'utf8'))

    for (const [host, value] of Object.entries(brandings)) {
      const protocol = value.protocol ?? 'https'
      value.front = `${protocol}://${host}/`
    }
  }

  return brandings
}

export function wrapPipeline (
  ctx: MeasureContext,
  pipeline: Pipeline,
  wsUrl: WorkspaceIdWithUrl
): Client & BackupClient {
  const contextData = new SessionDataImpl(
    systemAccountEmail,
    'pipeline',
    true,
    { targets: {}, txes: [] },
    wsUrl,
    null,
    true,
    undefined,
    undefined,
    pipeline.context.modelDb
  )
  ctx.contextData = contextData
  if (pipeline.context.lowLevelStorage === undefined) {
    throw new PlatformError(unknownError('Low level storage is not available'))
  }
  const backupOps = new BackupClientOps(pipeline.context.lowLevelStorage)

  return {
    findAll: (_class, query, options) => pipeline.findAll(ctx, _class, query, options),
    findOne: async (_class, query, options) =>
      (await pipeline.findAll(ctx, _class, query, { ...options, limit: 1 })).shift(),
    clean: (domain, docs) => backupOps.clean(ctx, domain, docs),
    close: () => pipeline.close(),
    closeChunk: (idx) => backupOps.closeChunk(ctx, idx),
    getHierarchy: () => pipeline.context.hierarchy,
    getModel: () => pipeline.context.modelDb,
    loadChunk: (domain, idx) => backupOps.loadChunk(ctx, domain, idx),
    loadDocs: (domain, docs) => backupOps.loadDocs(ctx, domain, docs),
    upload: (domain, docs) => backupOps.upload(ctx, domain, docs),
    searchFulltext: async (query, options) => ({ docs: [], total: 0 }),
    sendForceClose: async () => {},
    tx: (tx) => pipeline.tx(ctx, [tx]),
    notify: (...tx) => {}
  }
}

export function wrapAdapterToClient (ctx: MeasureContext, storageAdapter: DbAdapter, txes: Tx[]): ClientConnection {
  class TestClientConnection implements ClientConnection {
    isConnected = (): boolean => true

    handler?: (event: ClientConnectEvent, lastTx: string | undefined, data: any) => Promise<void>

    set onConnect (
      handler: ((event: ClientConnectEvent, lastTx: string | undefined, data: any) => Promise<void>) | undefined
    ) {
      this.handler = handler
      void this.handler?.(ClientConnectEvent.Connected, '', {})
    }

    get onConnect (): ((event: ClientConnectEvent, lastTx: string | undefined, data: any) => Promise<void>) | undefined {
      return this.handler
    }

    async findAll<T extends Doc>(
      _class: Ref<Class<Doc>>,
      query: DocumentQuery<Doc>,
      options?: FindOptions<Doc>
    ): Promise<FindResult<T>> {
      return (await storageAdapter.findAll(ctx, _class, query, options)) as any
    }

    async tx (tx: Tx): Promise<TxResult> {
      return await storageAdapter.tx(ctx, tx)
    }

    async searchFulltext (): Promise<SearchResult> {
      return { docs: [] }
    }

    async close (): Promise<void> {}

    async loadChunk (domain: Domain): Promise<DocChunk> {
      throw new Error('unsupported')
    }

    async closeChunk (idx: number): Promise<void> {}

    async loadDocs (domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
      return []
    }

    async upload (domain: Domain, docs: Doc[]): Promise<void> {}

    async clean (domain: Domain, docs: Ref<Doc>[]): Promise<void> {}

    async loadModel (): Promise<Tx[]> {
      return txes
    }

    async getAccount (): Promise<Account> {
      return {} as any
    }

    async sendForceClose (): Promise<void> {}
  }
  return new TestClientConnection()
}
