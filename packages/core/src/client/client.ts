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
import { deepEqual } from 'fast-equals'
import { BackupClient, DocChunk } from '../backup'
import {
  Class,
  Doc,
  Domain,
  DOMAIN_MODEL,
  Ref,
  type Account,
  type AccountUuid,
  type AccountWorkspace
} from '../classes'
import core from '../component'
import { Hierarchy } from '../hierarchy'
import { MeasureContext, MeasureMetricsContext } from '../measurements'
import { ModelDb } from '../memdb'
import type { DocumentQuery, FindOptions, FindResult, TxResult, WithLookup } from '../storage'
import { SearchOptions, SearchQuery, SearchResult } from '../storage'
import { Tx, WorkspaceEvent, type TxWorkspaceEvent } from '../tx'
import { platformNow, platformNowDiff, toFindResult, type WorkspaceUuid } from '../utils'
import {
  ClientConnectEvent,
  type Client,
  type ClientConnection,
  type ClientConnectOptions,
  type ConnectionEvents,
  type TxHandler,
  type TxPersistenceStore
} from './types'
import { buildModel, getLastTxTime, isModelDomain } from './utils'

class ClientImpl implements Client, BackupClient {
  notify?: (tx: Tx[], workspace?: WorkspaceUuid, target?: string, exclude?: string[]) => void
  hierarchy: Hierarchy
  model: ModelDb
  modelLoaded: boolean = false

  account: Account

  workspaces: Record<WorkspaceUuid, AccountWorkspace> = {}
  availableWorkspaces: WorkspaceUuid[] = []

  lastTx: Record<WorkspaceUuid, string | undefined> | undefined = {}

  private readonly appliedModelTransactions = new Set<Ref<Tx>>()
  constructor (
    private readonly conn: ClientConnection,
    account: Account,
    readonly ctx: MeasureContext,
    readonly opt?: ClientConnectOptions
  ) {
    this.account = account

    this.hierarchy = new Hierarchy()
    this.model = new ModelDb(this.hierarchy)
  }

  onAccount (account: Account): void {
    // Do diff and notify about workspace changes.
    this.account = account
    this.workspaces = account.workspaces
    this.availableWorkspaces = Object.entries(this.workspaces)
      .filter((it) => !it[1].maintenance && it[1].enabled)
      .map((it) => it[0] as WorkspaceUuid)
  }

  getConnection (): ClientConnection {
    return this.conn
  }

  getWorkspaces (): Record<WorkspaceUuid, AccountWorkspace> {
    return this.workspaces
  }

  getAvailableWorkspaces (): WorkspaceUuid[] {
    return this.availableWorkspaces
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
    if (isModelDomain(tx, this.hierarchy)) {
      this.hierarchy.tx(tx)
      await this.model.tx(tx)
      this.appliedModelTransactions.add(tx._id)
    }
    // We need to handle it on server, before performing local live query updates.
    return await this.conn.tx(tx)
  }

  async updateFromRemote (tx: Tx[], workspace?: WorkspaceUuid, target?: string, exclude?: string[]): Promise<void> {
    for (const t of tx) {
      try {
        if (isModelDomain(t, this.hierarchy)) {
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
    this.notify?.(tx, workspace, target, exclude)
  }

  async close (): Promise<void> {
    await this.conn.close()
  }

  async loadChunk (workspaceId: WorkspaceUuid, domain: Domain, idx?: number): Promise<DocChunk> {
    return await this.conn.loadChunk(workspaceId, domain, idx)
  }

  async getDomainHash (workspaceId: WorkspaceUuid, domain: Domain): Promise<string> {
    return await this.conn.getDomainHash(workspaceId, domain)
  }

  async closeChunk (workspaceId: WorkspaceUuid, idx: number): Promise<void> {
    await this.conn.closeChunk(workspaceId, idx)
  }

  async loadDocs (workspaceId: WorkspaceUuid, domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return await this.conn.loadDocs(workspaceId, domain, docs)
  }

  async upload (workspaceId: WorkspaceUuid, domain: Domain, docs: Doc[]): Promise<void> {
    await this.conn.upload(workspaceId, domain, docs)
  }

  async clean (workspaceId: WorkspaceUuid, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    await this.conn.clean(workspaceId, domain, docs)
  }

  async sendForceClose (workspaceId: WorkspaceUuid): Promise<void> {
    await this.conn.sendForceClose(workspaceId)
  }

  async loadModelInternal (ctx: MeasureContext): Promise<void> {
    let { mode, current, addition } = await ctx.with('load-model', {}, (ctx) =>
      loadModel(ctx, this.conn, this.opt?.txPersistence)
    )

    if (mode === 'same' && this.modelLoaded) {
      // We have same model hash.
      return
    }
    if (mode === 'same' || mode === 'upgrade') {
      ctx.withSync('build-model', {}, (ctx) => {
        buildModel(ctx, current, this.opt?.modelFilter, this.hierarchy, this.model)
      })
    } else if (mode === 'addition') {
      ctx.withSync('build-model', {}, (ctx) => {
        buildModel(ctx, current.concat(addition), this.opt?.modelFilter, this.hierarchy, this.model)
      })
    }
    current = []
    addition = []
  }

  async onConnect (
    ctx: MeasureContext,
    event: ClientConnectEvent,
    lastTx: Record<WorkspaceUuid, string | undefined> | undefined,
    data: any
  ): Promise<void> {
    this.lastTx = lastTx
    if (this.modelLoaded) {
      await this.loadModelInternal(ctx)

      if (this.lastTx === undefined) {
        // No need to do anything here since we connected.
        await this.opt?.onConnect?.(event, this.lastTx, data)
        this.lastTx = lastTx
        return
      }

      if (deepEqual(this.lastTx, lastTx)) {
        // Same lastTx, no need to refresh
        await this.opt?.onConnect?.(ClientConnectEvent.Reconnected, lastTx, data)
        return
      }
      this.lastTx = lastTx
      // We need to trigger full refresh on queries, etc.
      await this.opt?.onConnect?.(ClientConnectEvent.Refresh, lastTx, data)
    }
  }
}

/**
 * @public
 */
export async function createClient (
  connect: (txHandler: TxHandler, events?: ConnectionEvents) => Promise<ClientConnection>,
  // If set will build model with only allowed plugins.
  opt?: ClientConnectOptions
): Promise<Client> {
  const ctx = opt?._ctx ?? new MeasureMetricsContext('createClient', {})
  let client: ClientImpl | null = null

  // Temporal buffer, while we apply model
  let txBuffer: { buff: Tx[], workspace?: WorkspaceUuid, target?: AccountUuid, exclude?: AccountUuid[] }[] | undefined =
    []

  function txHandler (tx: Tx[], workspace?: WorkspaceUuid, target?: AccountUuid, exclude?: AccountUuid[]): void {
    if (tx == null || tx.length === 0) {
      return
    }
    if (client === null) {
      txBuffer?.push({ buff: tx, workspace, target, exclude })
    } else {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      client.updateFromRemote(tx, workspace, target, exclude)

      for (const t of tx) {
        if (t._class === core.class.TxWorkspaceEvent && (t as TxWorkspaceEvent).event === WorkspaceEvent.LastTx) {
          client.lastTx = (t as TxWorkspaceEvent).params.lastTx
        }
      }
    }
  }
  let account: Account | undefined
  const conn = await ctx.with('connect', {}, () =>
    connect(txHandler, {
      ...opt,
      onAccount: (a) => {
        account = a
        client?.onAccount(account)
        opt?.onAccount?.(a)
      },
      onConnect: async (event, _lastTx, data) => {
        console.log('Client: onConnect', event)
        if (event === ClientConnectEvent.Maintenance) {
          await opt?.onConnect?.(event, _lastTx, data)
        }
        await client?.onConnect(ctx, event, _lastTx, data)
      }
    })
  )

  if (account === undefined) {
    account = await conn.getAccount()
    opt?.onAccount?.(account)
  }

  client = new ClientImpl(conn, account, ctx, opt)
  client.onAccount(account)

  await client.loadModelInternal(ctx)

  for (const { buff, workspace, target, exclude } of txBuffer) {
    txHandler(buff, workspace, target, exclude)
  }
  txBuffer = undefined

  return client
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

  if (conn.getLastHash !== undefined) {
    const account = await conn.getAccount()
    const lastHash = await conn.getLastHash(ctx)
    if (lastHash[account.targetWorkspace] === current.hash) {
      // We have same model hash.
      return { mode: 'same', current: current.transactions, addition: [] }
    }
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
