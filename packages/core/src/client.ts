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
import type { Class, Doc, Domain, PluginConfiguration, Ref } from './classes'
import { DOMAIN_MODEL } from './classes'
import core from './component'
import { Hierarchy } from './hierarchy'
import { ModelDb } from './memdb'
import type { DocumentQuery, FindOptions, FindResult, Storage, TxResult, WithLookup } from './storage'
import { SortingOrder } from './storage'
import { Tx, TxCreateDoc, TxProcessor, TxUpdateDoc } from './tx'
import { toFindResult } from './utils'

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
export interface ClientConnection extends Storage, BackupClient {
  close: () => Promise<void>
}

class ClientImpl implements Client, BackupClient {
  notify?: (tx: Tx) => void

  constructor (
    private readonly hierarchy: Hierarchy,
    private readonly model: ModelDb,
    private readonly conn: ClientConnection
  ) {}

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
}

/**
 * @public
 */
export async function createClient (
  connect: (txHandler: TxHandler) => Promise<ClientConnection>,
  // If set will build model with only allowed plugins.
  allowedPlugins?: Plugin[]
): Promise<Client> {
  let client: ClientImpl | null = null
  let txBuffer: Tx[] | undefined = []

  const hierarchy = new Hierarchy()
  const model = new ModelDb(hierarchy)

  function txHandler (tx: Tx): void {
    if (client === null) {
      txBuffer?.push(tx)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      client.updateFromRemote(tx)
    }
  }

  const conn = await connect(txHandler)
  const atxes = await conn.findAll(
    core.class.Tx,
    { objectSpace: core.space.Model },
    { sort: { _id: SortingOrder.Ascending } }
  )
  console.log('find model', atxes.length)

  let systemTx: Tx[] = []
  const userTx: Tx[] = []

  atxes.forEach((tx) => (tx.modifiedBy === core.account.System ? systemTx : userTx).push(tx))

  if (allowedPlugins !== undefined) {
    // Filter system transactions
    const configs = new Map<Ref<PluginConfiguration>, PluginConfiguration>()
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

    const excludedPlugins = Array.from(configs.values()).filter((it) => !allowedPlugins.includes(it.pluginId as Plugin))

    for (const a of excludedPlugins) {
      for (const c of configs.values()) {
        if (a.pluginId === c.pluginId) {
          const excluded = new Set<Ref<Tx>>()
          for (const id of c.transactions) {
            excluded.add(id as Ref<Tx>)
          }
          const exclude = systemTx.filter((t) => excluded.has(t._id))
          console.log('exclude plugin', c.pluginId, exclude.length)
          systemTx = systemTx.filter((t) => !excluded.has(t._id))
        }
      }
    }
  }

  const txes = systemTx.concat(userTx)

  const txMap = new Map<Ref<Tx>, Ref<Tx>>()
  for (const tx of txes) txMap.set(tx._id, tx._id)
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

  txBuffer = txBuffer.filter((tx) => txMap.get(tx._id) === undefined)

  client = new ClientImpl(hierarchy, model, conn)

  for (const tx of txBuffer) txHandler(tx)
  txBuffer = undefined

  return client
}
