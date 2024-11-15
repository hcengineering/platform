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
import { Account, Class, DOMAIN_MODEL, Doc, Domain, Ref, Timestamp } from './classes'
import core from './component'
import { Hierarchy } from './hierarchy'
import { MeasureContext, MeasureMetricsContext } from './measurements'
import { ModelDb } from './memdb'
import type { DocumentQuery, FindOptions, FindResult, FulltextStorage, Storage, TxResult, WithLookup } from './storage'
import { SearchOptions, SearchQuery, SearchResult, SortingOrder } from './storage'
import { Tx, TxCUD } from './tx'
import { toFindResult } from './utils'

const transactionThreshold = 500

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
}

/**
 * @public
 */
export interface AccountClient extends Client {
  getAccount: () => Promise<Account>
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
/**
 * @public
 */
export interface ClientConnection extends Storage, FulltextStorage, BackupClient {
  isConnected: () => boolean

  close: () => Promise<void>
  onConnect?: (event: ClientConnectEvent) => Promise<void>

  // If hash is passed, will return LoadModelResponse
  loadModel: (last: Timestamp, hash?: string) => Promise<Tx[] | LoadModelResponse>
  getAccount: () => Promise<Account>
}

class ClientImpl implements AccountClient, BackupClient {
  notify?: (...tx: Tx[]) => void
  hierarchy!: Hierarchy
  model!: ModelDb
  private readonly appliedModelTransactions = new Set<Ref<Tx>>()
  constructor (private readonly conn: ClientConnection) {}

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

  async loadChunk (domain: Domain, idx?: number, recheck?: boolean): Promise<DocChunk> {
    return await this.conn.loadChunk(domain, idx, recheck)
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

  async getAccount (): Promise<Account> {
    return await this.conn.getAccount()
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

export type ModelFilter = (tx: Tx[]) => Promise<Tx[]>

/**
 * @public
 */
export async function createClient (
  connect: (txHandler: TxHandler) => Promise<ClientConnection>,
  // If set will build model with only allowed plugins.
  modelFilter?: ModelFilter,
  txPersistence?: TxPersistenceStore,
  _ctx?: MeasureContext
): Promise<AccountClient> {
  const ctx = _ctx ?? new MeasureMetricsContext('createClient', {})
  let client: ClientImpl | null = null

  // Temporal buffer, while we apply model
  let txBuffer: Tx[] | undefined = []

  let hierarchy = new Hierarchy()
  let model = new ModelDb(hierarchy)

  let lastTx: number

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
    lastTx = tx.reduce((cur, it) => (it.modifiedOn > cur ? it.modifiedOn : cur), 0)
  }
  const conn = await ctx.with('connect', {}, () => connect(txHandler))

  await ctx.with('load-model', { reload: false }, (ctx) =>
    loadModel(ctx, conn, modelFilter, hierarchy, model, false, txPersistence)
  )

  txBuffer = txBuffer.filter((tx) => tx.space !== core.space.Model)

  client = new ClientImpl(conn)
  client.setModel(hierarchy, model)

  txHandler(...txBuffer)
  txBuffer = undefined

  const oldOnConnect: ((event: ClientConnectEvent) => Promise<void>) | undefined = conn.onConnect
  conn.onConnect = async (event) => {
    console.log('Client: onConnect', event)
    if (event === ClientConnectEvent.Maintenance) {
      await oldOnConnect?.(ClientConnectEvent.Maintenance)
      return
    }
    // Find all new transactions and apply
    const loadModelResponse = await ctx.with('connect', { reload: true }, (ctx) =>
      loadModel(ctx, conn, modelFilter, hierarchy, model, true, txPersistence)
    )

    if (event === ClientConnectEvent.Reconnected && loadModelResponse.full) {
      // We have upgrade procedure and need rebuild all stuff.
      hierarchy = new Hierarchy()
      model = new ModelDb(hierarchy)

      await ctx.with('build-model', {}, (ctx) => buildModel(ctx, loadModelResponse, modelFilter, hierarchy, model))
      await oldOnConnect?.(ClientConnectEvent.Upgraded)

      // No need to fetch more stuff since upgrade was happened.
      return
    }

    if (event === ClientConnectEvent.Connected) {
      // No need to do anything here since we connected.
      await oldOnConnect?.(event)
      return
    }

    // We need to look for last {transactionThreshold} transactions and if it is more since lastTx one we receive, we need to perform full refresh.
    const atxes = await ctx.with('find-atx', {}, () =>
      conn.findAll(
        core.class.Tx,
        { modifiedOn: { $gt: lastTx }, objectSpace: { $ne: core.space.Model } },
        { sort: { modifiedOn: SortingOrder.Ascending, _id: SortingOrder.Ascending }, limit: transactionThreshold }
      )
    )

    let needFullRefresh = false
    // if we have attachment document create/delete we need to full refresh, since some derived data could be missing
    for (const tx of atxes) {
      if (
        (tx as TxCUD<Doc>).attachedTo !== undefined &&
        (tx._class === core.class.TxCreateDoc || tx._class === core.class.TxRemoveDoc)
      ) {
        needFullRefresh = true
        break
      }
    }

    if (atxes.length < transactionThreshold && !needFullRefresh) {
      console.log('applying input transactions', atxes.length)
      txHandler(...atxes)
      await oldOnConnect?.(ClientConnectEvent.Reconnected)
    } else {
      // We need to trigger full refresh on queries, etc.
      await oldOnConnect?.(ClientConnectEvent.Refresh)
    }
  }

  return client
}

async function tryLoadModel (
  ctx: MeasureContext,
  conn: ClientConnection,
  reload: boolean,
  persistence?: TxPersistenceStore
): Promise<LoadModelResponse> {
  const current = (await ctx.with('persistence-load', {}, () => persistence?.load())) ?? {
    full: true,
    transactions: [],
    hash: ''
  }

  const lastTxTime = getLastTxTime(current.transactions)
  const result = await ctx.with('connection-load-model', { hash: current.hash !== '' }, (ctx) =>
    conn.loadModel(lastTxTime, current.hash)
  )

  if (Array.isArray(result)) {
    // Fallback to old behavior, only for tests
    return {
      full: true,
      transactions: result,
      hash: ''
    }
  }

  // Save concatenated
  void ctx
    .with('persistence-store', {}, (ctx) =>
      persistence?.store({
        ...result,
        transactions: !result.full ? current.transactions.concat(result.transactions) : result.transactions
      })
    )
    .catch((err) => {
      Analytics.handleError(err)
    })

  if (!result.full && !reload) {
    result.transactions = current.transactions.concat(result.transactions)
  }

  return result
}

// Ignore Employee accounts.
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
  modelFilter: ModelFilter | undefined,
  hierarchy: Hierarchy,
  model: ModelDb,
  reload = false,
  persistence?: TxPersistenceStore
): Promise<LoadModelResponse> {
  const t = Date.now()

  const modelResponse = await ctx.with('try-load-model', { reload }, (ctx) =>
    tryLoadModel(ctx, conn, reload, persistence)
  )

  if (reload && modelResponse.full) {
    return modelResponse
  }

  if (typeof window !== 'undefined') {
    console.log(
      'find' + (modelResponse.full ? 'full model' : 'model diff'),
      modelResponse.transactions.length,
      Date.now() - t
    )
  }

  await ctx.with('build-model', {}, (ctx) => buildModel(ctx, modelResponse, modelFilter, hierarchy, model))
  return modelResponse
}

async function buildModel (
  ctx: MeasureContext,
  modelResponse: LoadModelResponse,
  modelFilter: ModelFilter | undefined,
  hierarchy: Hierarchy,
  model: ModelDb
): Promise<void> {
  const systemTx: Tx[] = []
  const userTx: Tx[] = []

  const atxes = modelResponse.transactions

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
    txes = await modelFilter(txes)
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
