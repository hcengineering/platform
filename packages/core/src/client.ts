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

import { Plugin } from '@hcengineering/platform'
import { BackupClient, DocChunk } from './backup'
import { Account, AttachedDoc, Class, DOMAIN_MODEL, Doc, Domain, PluginConfiguration, Ref, Timestamp } from './classes'
import core from './component'
import { Hierarchy } from './hierarchy'
import { ModelDb } from './memdb'
import type { DocumentQuery, FindOptions, FindResult, Storage, TxResult, WithLookup } from './storage'
import { SortingOrder } from './storage'
import { Tx, TxCUD, TxCollectionCUD, TxCreateDoc, TxProcessor, TxUpdateDoc } from './tx'
import { toFindResult } from './utils'

const transactionThreshold = 500

/**
 * @public
 */
export type TxHandler = (tx: Tx) => void

/**
 * @public
 */
export interface Client extends Storage {
  notify?: (tx: Tx) => void
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
  Refresh // In case we detect query refresh is required
}
/**
 * @public
 */
export interface ClientConnection extends Storage, BackupClient {
  close: () => Promise<void>
  onConnect?: (event: ClientConnectEvent) => Promise<void>

  // If hash is passed, will return LoadModelResponse
  loadModel: (last: Timestamp, hash?: string) => Promise<Tx[] | LoadModelResponse>
  getAccount: () => Promise<Account>
}

class ClientImpl implements AccountClient, BackupClient {
  notify?: (tx: Tx) => void
  hierarchy!: Hierarchy
  model!: ModelDb
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
    }

    // We need to handle it on server, before performing local live query updates.
    const result = await this.conn.tx(tx)
    this.notify?.(tx)
    return result
  }

  async updateFromRemote (tx: Tx): Promise<void> {
    if (tx.objectSpace === core.space.Model) {
      this.hierarchy.tx(tx)
      await this.model.tx(tx)
    }
    this.notify?.(tx)
  }

  async close (): Promise<void> {
    await this.conn.close()
  }

  async loadChunk (domain: Domain, idx?: number | undefined): Promise<DocChunk> {
    return await this.conn.loadChunk(domain, idx)
  }

  async closeChunk (idx: number): Promise<void> {
    return await this.conn.closeChunk(idx)
  }

  async loadDocs (domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return await this.conn.loadDocs(domain, docs)
  }

  async upload (domain: Domain, docs: Doc[]): Promise<void> {
    return await this.conn.upload(domain, docs)
  }

  async clean (domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    return await this.conn.clean(domain, docs)
  }

  async getAccount (): Promise<Account> {
    return await this.conn.getAccount()
  }
}

/**
 * @public
 */
export interface TxPersistenceStore {
  load: () => Promise<LoadModelResponse>
  store: (model: LoadModelResponse) => Promise<void>
}

/**
 * @public
 */
export async function createClient (
  connect: (txHandler: TxHandler) => Promise<ClientConnection>,
  // If set will build model with only allowed plugins.
  allowedPlugins?: Plugin[],
  txPersistence?: TxPersistenceStore
): Promise<AccountClient> {
  let client: ClientImpl | null = null

  // Temporal buffer, while we apply model
  let txBuffer: Tx[] | undefined = []

  let hierarchy = new Hierarchy()
  let model = new ModelDb(hierarchy)

  let lastTx: number

  function txHandler (tx: Tx): void {
    if (tx === null) {
      return
    }
    if (client === null) {
      txBuffer?.push(tx)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      client.updateFromRemote(tx)
    }
    lastTx = tx.modifiedOn
  }
  const configs = new Map<Ref<PluginConfiguration>, PluginConfiguration>()

  const conn = await connect(txHandler)

  await loadModel(conn, allowedPlugins, configs, hierarchy, model, false, txPersistence)

  txBuffer = txBuffer.filter((tx) => tx.space !== core.space.Model)

  client = new ClientImpl(conn)
  client.setModel(hierarchy, model)

  for (const tx of txBuffer) {
    txHandler(tx)
  }
  txBuffer = undefined

  const oldOnConnect: ((event: ClientConnectEvent) => void) | undefined = conn.onConnect
  conn.onConnect = async (event) => {
    console.log('Client: onConnect', event)
    // Find all new transactions and apply
    const loadModelResponse = await loadModel(conn, allowedPlugins, configs, hierarchy, model, true, txPersistence)

    if (event === ClientConnectEvent.Reconnected && loadModelResponse.full) {
      // We have upgrade procedure and need rebuild all stuff.
      hierarchy = new Hierarchy()
      model = new ModelDb(hierarchy)

      await buildModel(loadModelResponse, allowedPlugins, configs, hierarchy, model)
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
    const atxes = await conn.findAll(
      core.class.Tx,
      { modifiedOn: { $gt: lastTx }, objectSpace: { $ne: core.space.Model } },
      { sort: { modifiedOn: SortingOrder.Ascending, _id: SortingOrder.Ascending }, limit: transactionThreshold }
    )

    let needFullRefresh = false
    // if we have attachment document create/delete we need to full refresh, since some derived data could be missing
    for (const tx of atxes) {
      if (
        tx._class === core.class.TxCollectionCUD &&
        ((tx as TxCollectionCUD<Doc, AttachedDoc>).tx._class === core.class.TxCreateDoc ||
          (tx as TxCollectionCUD<Doc, AttachedDoc>).tx._class === core.class.TxRemoveDoc)
      ) {
        needFullRefresh = true
        break
      }
    }

    if (atxes.length < transactionThreshold && !needFullRefresh) {
      console.log('applying input transactions', atxes.length)
      for (const tx of atxes) {
        txHandler(tx)
      }
      await oldOnConnect?.(ClientConnectEvent.Reconnected)
    } else {
      // We need to trigger full refresh on queries, etc.
      await oldOnConnect?.(ClientConnectEvent.Refresh)
    }
  }

  return client
}

async function tryLoadModel (
  conn: ClientConnection,
  reload: boolean,
  persistence?: TxPersistenceStore
): Promise<LoadModelResponse> {
  const current = (await persistence?.load()) ?? { full: true, transactions: [], hash: '' }

  const lastTxTime = getLastTxTime(current.transactions)
  const result = await conn.loadModel(lastTxTime, current.hash)

  if (Array.isArray(result)) {
    // Fallback to old behavior, only for tests
    return {
      full: true,
      transactions: result,
      hash: ''
    }
  }

  // Save concatenated
  await persistence?.store({
    ...result,
    transactions: !result.full ? current.transactions.concat(result.transactions) : result.transactions
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
  conn: ClientConnection,
  allowedPlugins: Plugin[] | undefined,
  configs: Map<Ref<PluginConfiguration>, PluginConfiguration>,
  hierarchy: Hierarchy,
  model: ModelDb,
  reload = false,
  persistence?: TxPersistenceStore
): Promise<LoadModelResponse> {
  const t = Date.now()

  const modelResponse = await tryLoadModel(conn, reload, persistence)

  if (reload && modelResponse.full) {
    return modelResponse
  }

  console.log(
    'find' + (modelResponse.full ? 'full model' : 'model diff'),
    modelResponse.transactions.length,
    Date.now() - t
  )

  await buildModel(modelResponse, allowedPlugins, configs, hierarchy, model)
  return modelResponse
}

async function buildModel (
  modelResponse: LoadModelResponse,
  allowedPlugins: Plugin[] | undefined,
  configs: Map<Ref<PluginConfiguration>, PluginConfiguration>,
  hierarchy: Hierarchy,
  model: ModelDb
): Promise<void> {
  let systemTx: Tx[] = []
  const userTx: Tx[] = []

  const atxes = modelResponse.transactions
  atxes.forEach((tx) => (tx.modifiedBy === core.account.System && !isPersonAccount(tx) ? systemTx : userTx).push(tx))

  if (allowedPlugins != null) {
    fillConfiguration(systemTx, configs)
    fillConfiguration(userTx, configs)
    const excludedPlugins = Array.from(configs.values()).filter(
      (it) => !it.enabled || !allowedPlugins.includes(it.pluginId)
    )
    systemTx = pluginFilterTx(excludedPlugins, configs, systemTx)
  }

  const txes = systemTx.concat(userTx)

  for (const tx of txes) {
    try {
      hierarchy.tx(tx)
    } catch (err: any) {
      console.error('failed to apply model transaction, skipping', JSON.stringify(tx), err)
    }
  }
  for (const tx of txes) {
    try {
      await model.tx(tx)
    } catch (err: any) {
      console.error('failed to apply model transaction, skipping', JSON.stringify(tx), err)
    }
  }
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

function fillConfiguration (systemTx: Tx[], configs: Map<Ref<PluginConfiguration>, PluginConfiguration>): void {
  for (const t of systemTx) {
    if (t._class === core.class.TxCreateDoc) {
      const ct = t as TxCreateDoc<Doc>
      if (ct.objectClass === core.class.PluginConfiguration) {
        configs.set(ct.objectId as Ref<PluginConfiguration>, TxProcessor.createDoc2Doc(ct) as PluginConfiguration)
      }
    } else if (t._class === core.class.TxUpdateDoc) {
      const ut = t as TxUpdateDoc<Doc>
      if (ut.objectClass === core.class.PluginConfiguration) {
        const c = configs.get(ut.objectId as Ref<PluginConfiguration>)
        if (c !== undefined) {
          TxProcessor.updateDoc2Doc(c, ut)
        }
      }
    }
  }
}

function pluginFilterTx (
  excludedPlugins: PluginConfiguration[],
  configs: Map<Ref<PluginConfiguration>, PluginConfiguration>,
  systemTx: Tx[]
): Tx[] {
  for (const a of excludedPlugins) {
    for (const c of configs.values()) {
      if (a.pluginId === c.pluginId) {
        const excluded = new Set<Ref<Tx>>()
        for (const id of c.transactions) {
          if (c.classFilter !== undefined) {
            const filter = new Set(c.classFilter)
            const tx = systemTx.find((it) => it._id === id)
            if (
              tx?._class === core.class.TxCreateDoc ||
              tx?._class === core.class.TxUpdateDoc ||
              tx?._class === core.class.TxRemoveDoc
            ) {
              const cud = tx as TxCUD<Doc>
              if (filter.has(cud.objectClass)) {
                excluded.add(id as Ref<Tx>)
              }
            }
          } else {
            excluded.add(id as Ref<Tx>)
          }
        }
        const exclude = systemTx.filter((t) => excluded.has(t._id))
        console.log('exclude plugin', c.pluginId, exclude.length)
        systemTx = systemTx.filter((t) => !excluded.has(t._id))
      }
    }
  }
  return systemTx
}
