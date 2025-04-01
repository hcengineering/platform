//
// Copyright © 2020 Anticrm Platform Contributors.
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
import { BackupClient, DocChunk } from './backup'
import { Class, DOMAIN_MODEL, Doc, Domain, Ref, Timestamp } from './classes'
import core from './component'
import { Hierarchy } from './hierarchy'
import { MeasureContext, MeasureMetricsContext } from './measurements'
import { ModelDb } from './memdb'
import type { DocumentQuery, FindOptions, FindResult, FulltextStorage, Storage, TxResult, WithLookup } from './storage'
import { SearchOptions, SearchQuery, SearchResult } from './storage'
import { Tx, TxCUD, WorkspaceEvent, type TxWorkspaceEvent } from './tx'
import { platformNow, platformNowDiff, toFindResult } from './utils'

/**
 * @public
 */
export type TxHandler = (...tx: Tx[]) => void

/**
 * @public
 */
export interface Client extends Storage, FulltextStorage {
  notify?: (...tx: Tx[]) => void
  getHierarchy: () => Hierarchy
  getModel: () => ModelDb
  findOne: <T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<WithLookup<T> | undefined>
  close: () => Promise<void>
  getConnection?: () => ClientConnection
}

/**
 * @public
 */
export interface LoadModelResponse {
  // A diff or a full set of transactions.
  transactions: Tx[]
  // A current hash chain
  hash: string
  // If full model is returned, on hash diff for request
  full: boolean
}

/**
 * @public
 */
export enum ClientConnectEvent {
  Connected, // In case we just connected to server, and receive a full model
  Reconnected, // In case we re-connected to server and receive and apply diff.

  // Client could cause back a few more states.
  Upgraded, // In case client code receive a full new model and need to be rebuild.
  Refresh, // In case we detect query refresh is required
  Maintenance // In case workspace are in maintenance mode
}

export type Handler = (...result: any[]) => void

/**
 * @public
 */
export interface ClientConnection extends Storage, FulltextStorage, BackupClient {
  isConnected: () => boolean

  close: () => Promise<void>
  onConnect?: (event: ClientConnectEvent, lastTx: string | undefined, data: any) => Promise<void>

  // If hash is passed, will return LoadModelResponse
  loadModel: (last: Timestamp, hash?: string) => Promise<Tx[] | LoadModelResponse>

  getLastHash?: (ctx: MeasureContext) => Promise<string | undefined>
  pushHandler: (handler: Handler) => void
}

class ClientImpl implements Client, BackupClient {
  notify?: (...tx: Tx[]) => void
  hierarchy!: Hierarchy
  model!: ModelDb
  private readonly appliedModelTransactions = new Set<Ref<Tx>>()
  constructor (private readonly conn: ClientConnection) {}

  getConnection (): ClientConnection {
    return this.conn
  }

  setModel (hierarchy: Hierarchy, model: ModelDb): void {
    this.hierarchy = hierarchy
    this.model = model
  }

  getHierarchy (): Hierarchy {
    return this.hierarchy
  }

  getModel (): ModelDb {
    return this.model
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const domain = this.hierarchy.getDomain(_class)
    const data =
      domain === DOMAIN_MODEL
        ? await this.model.findAll(_class, query, options)
        : await this.conn.findAll(_class, query, options)

    // In case of mixin we need to create mixin proxies.

    // Update mixins & lookups
    const result = data.map((v) => {
      return this.hierarchy.updateLookupMixin(_class, v, options)
    })
    return toFindResult(result, data.total)
  }

  async searchFulltext (query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    return await this.conn.searchFulltext(query, options)
  }

  async findOne<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<WithLookup<T> | undefined> {
    return (await this.findAll(_class, query, { ...options, limit: 1 }))[0]
  }

  async tx (tx: Tx): Promise<TxResult> {
    if (tx.objectSpace === core.space.Model) {
      this.hierarchy.tx(tx)
      await this.model.tx(tx)
      this.appliedModelTransactions.add(tx._id)
    }
    // We need to handle it on server, before performing local live query updates.
    return await this.conn.tx(tx)
  }

  async updateFromRemote (...tx: Tx[]): Promise<void> {
    for (const t of tx) {
      try {
        if (t.objectSpace === core.space.Model) {
          const hasTx = this.appliedModelTransactions.has(t._id)
          if (!hasTx) {
            this.hierarchy.tx(t)
            await this.model.tx(t)
          } else {
            this.appliedModelTransactions.delete(t._id)
          }
        }
      } catch (err) {
        // console.error('failed to apply model transaction, skipping', t)
        continue
      }
    }
    this.notify?.(...tx)
  }

  async close (): Promise<void> {
    await this.conn.close()
  }

  async loadChunk (domain: Domain, idx?: number): Promise<DocChunk> {
    return await this.conn.loadChunk(domain, idx)
  }

  async getDomainHash (domain: Domain): Promise<string> {
    return await this.conn.getDomainHash(domain)
  }

  async closeChunk (idx: number): Promise<void> {
    await this.conn.closeChunk(idx)
  }

  async loadDocs (domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return await this.conn.loadDocs(domain, docs)
  }

  async upload (domain: Domain, docs: Doc[]): Promise<void> {
    await this.conn.upload(domain, docs)
  }

  async clean (domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    await this.conn.clean(domain, docs)
  }

  async sendForceClose (): Promise<void> {
    await this.conn.sendForceClose()
  }
}

/**
 * @public
 */
export interface TxPersistenceStore {
  load: () => Promise<LoadModelResponse>
  store: (model: LoadModelResponse) => Promise<void>
}

export type ModelFilter = (tx: Tx[]) => Tx[]

/**
 * @public
 */
export async function createClient (
  connect: (txHandler: TxHandler) => Promise<ClientConnection>,
  // If set will build model with only allowed plugins.
  modelFilter?: ModelFilter,
  txPersistence?: TxPersistenceStore,
  _ctx?: MeasureContext
): Promise<Client> {
  const ctx = _ctx ?? new MeasureMetricsContext('createClient', {})
  let client: ClientImpl | null = null

  // Temporal buffer, while we apply model
  let txBuffer: Tx[] | undefined = []

  let hierarchy = new Hierarchy()
  let model = new ModelDb(hierarchy)

  let lastTx: string | undefined

  function txHandler (...tx: Tx[]): void {
    if (tx == null || tx.length === 0) {
      return
    }
    if (client === null) {
      txBuffer?.push(...tx)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      client.updateFromRemote(...tx)
    }
    for (const t of tx) {
      if (t._class === core.class.TxWorkspaceEvent && (t as TxWorkspaceEvent).event === WorkspaceEvent.LastTx) {
        lastTx = (t as TxWorkspaceEvent).params.lastTx
      }
    }
  }
  const conn = await ctx.with('connect', {}, () => connect(txHandler))

  let { mode, current, addition } = await ctx.with('load-model', {}, (ctx) => loadModel(ctx, conn, txPersistence))
  switch (mode) {
    case 'same':
    case 'upgrade':
      ctx.withSync('build-model', {}, (ctx) => {
        buildModel(ctx, current, modelFilter, hierarchy, model)
      })
      break
    case 'addition':
      ctx.withSync('build-model', {}, (ctx) => {
        buildModel(ctx, current.concat(addition), modelFilter, hierarchy, model)
      })
  }
  current = []
  addition = []

  txBuffer = txBuffer.filter((tx) => tx.space !== core.space.Model)

  client = new ClientImpl(conn)
  client.setModel(hierarchy, model)

  txHandler(...txBuffer)
  txBuffer = undefined

  const oldOnConnect:
  | ((event: ClientConnectEvent, lastTx: string | undefined, data: any) => Promise<void>)
  | undefined = conn.onConnect
  conn.onConnect = async (event, _lastTx, data) => {
    console.log('Client: onConnect', event)
    if (event === ClientConnectEvent.Maintenance) {
      lastTx = _lastTx
      await oldOnConnect?.(ClientConnectEvent.Maintenance, _lastTx, data)
      return
    }
    // Find all new transactions and apply
    let { mode, current, addition } = await ctx.with('load-model', {}, (ctx) => loadModel(ctx, conn, txPersistence))

    switch (mode) {
      case 'upgrade':
        // We have upgrade procedure and need rebuild all stuff.
        hierarchy = new Hierarchy()
        model = new ModelDb(hierarchy)
        ;(client as ClientImpl).setModel(hierarchy, model)

        ctx.withSync('build-model', {}, (ctx) => {
          buildModel(ctx, current, modelFilter, hierarchy, model)
        })
        current = []
        await oldOnConnect?.(ClientConnectEvent.Upgraded, _lastTx, data)
        // No need to fetch more stuff since upgrade was happened.
        break
      case 'addition':
        ctx.withSync('build-model', {}, (ctx) => {
          buildModel(ctx, current.concat(addition), modelFilter, hierarchy, model)
        })
        break
    }
    current = []
    addition = []

    if (lastTx === undefined) {
      // No need to do anything here since we connected.
      await oldOnConnect?.(event, _lastTx, data)
      lastTx = _lastTx
      return
    }

    if (lastTx === _lastTx) {
      // Same lastTx, no need to refresh
      await oldOnConnect?.(ClientConnectEvent.Reconnected, _lastTx, data)
      return
    }
    lastTx = _lastTx
    // We need to trigger full refresh on queries, etc.
    await oldOnConnect?.(ClientConnectEvent.Refresh, lastTx, data)
  }

  return client
}

// Ignore Employee accounts.
// We may still have them in transactions in old workspaces even with global accounts.
function isPersonAccount (tx: Tx): boolean {
  return (
    (tx._class === core.class.TxCreateDoc ||
      tx._class === core.class.TxUpdateDoc ||
      tx._class === core.class.TxRemoveDoc) &&
    ((tx as TxCUD<Doc>).objectClass === 'contact:class:PersonAccount' ||
      (tx as TxCUD<Doc>).objectClass === 'core:class:Account')
  )
}

async function loadModel (
  ctx: MeasureContext,
  conn: ClientConnection,
  persistence?: TxPersistenceStore
): Promise<{ mode: 'same' | 'addition' | 'upgrade', current: Tx[], addition: Tx[] }> {
  const t = platformNow()

  const current = (await ctx.with('persistence-load', {}, () => persistence?.load())) ?? {
    full: true,
    transactions: [],
    hash: ''
  }

  if (conn.getLastHash !== undefined && (await conn.getLastHash(ctx)) === current.hash) {
    // We have same model hash.
    return { mode: 'same', current: current.transactions, addition: [] }
  }
  const lastTxTime = getLastTxTime(current.transactions)
  const result = await ctx.with('connection-load-model', { hash: current.hash !== '' }, (ctx) =>
    conn.loadModel(lastTxTime, current.hash)
  )

  if (Array.isArray(result)) {
    // Fallback to old behavior, only for tests
    return {
      mode: 'same',
      current: result,
      addition: []
    }
  }

  // Save concatenated, if have some more of them.
  void ctx
    .with('persistence-store', {}, (ctx) =>
      persistence?.store({
        ...result,
        // Store concatinated old + new txes
        transactions: result.full ? result.transactions : current.transactions.concat(result.transactions)
      })
    )
    .catch((err) => {
      Analytics.handleError(err)
    })

  if (typeof window !== 'undefined') {
    console.log('find' + (result.full ? 'full model' : 'model diff'), result.transactions.length, platformNowDiff(t))
  }
  if (result.full) {
    return { mode: 'upgrade', current: result.transactions, addition: [] }
  }
  return { mode: 'addition', current: current.transactions, addition: result.transactions }
}

export function buildModel (
  ctx: MeasureContext,
  transactions: Tx[],
  modelFilter: ModelFilter | undefined,
  hierarchy: Hierarchy,
  model: ModelDb
): void {
  const systemTx: Tx[] = []
  const userTx: Tx[] = []

  const atxes = transactions

  ctx.withSync('split txes', {}, () => {
    atxes.forEach((tx) =>
      ((tx.modifiedBy === core.account.ConfigUser || tx.modifiedBy === core.account.System) && !isPersonAccount(tx)
        ? systemTx
        : userTx
      ).push(tx)
    )
  })

  userTx.sort(compareTxes)

  let txes = systemTx.concat(userTx)
  if (modelFilter !== undefined) {
    txes = modelFilter(txes)
  }

  ctx.withSync('build hierarchy', {}, () => {
    for (const tx of txes) {
      try {
        hierarchy.tx(tx)
      } catch (err: any) {
        ctx.warn('failed to apply model transaction, skipping', {
          _id: tx._id,
          _class: tx._class,
          message: err?.message
        })
      }
    }
  })
  ctx.withSync('build model', {}, (ctx) => {
    model.addTxes(ctx, txes, false)
  })
}

function getLastTxTime (txes: Tx[]): number {
  let lastTxTime = 0
  for (const tx of txes) {
    if (tx.modifiedOn > lastTxTime) {
      lastTxTime = tx.modifiedOn
    }
  }
  return lastTxTime
}

function compareTxes (a: Tx, b: Tx): number {
  const result = a._id.localeCompare(b._id)
  return result !== 0 ? result : a.modifiedOn - b.modifiedOn
}
