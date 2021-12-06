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

import type { Doc, Ref, Class } from './classes'
import type { Tx } from './tx'
import type { Storage, DocumentQuery, FindOptions, FindResult, WithLookup, TxResult } from './storage'

import { SortingOrder } from './storage'
import { Hierarchy } from './hierarchy'
import { ModelDb } from './memdb'
import { DOMAIN_MODEL } from './classes'

import core from './component'

/**
 * @public
 */
export type TxHander = (tx: Tx) => void

/**
 * @public
 */
export interface Closable {
  close: () => Promise<void>
}
/**
 * @public
 */
export interface Client extends Storage, Closable {
  notify?: (tx: Tx) => void
  getHierarchy: () => Hierarchy
  getModel: () => ModelDb
  findOne: <T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<WithLookup<T> | undefined>
}

class ClientImpl implements Client {
  notify?: (tx: Tx) => void

  constructor (private readonly hierarchy: Hierarchy, private readonly model: ModelDb, private readonly conn: Storage & Closable) {
  }

  getHierarchy (): Hierarchy { return this.hierarchy }

  getModel (): ModelDb { return this.model }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const domain = this.hierarchy.getDomain(_class)
    if (domain === DOMAIN_MODEL) {
      return await this.model.findAll(_class, query, options)
    }
    return await this.conn.findAll(_class, query, options)
  }

  async findOne<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<WithLookup<T> | undefined> {
    return (await this.findAll(_class, query, options))[0]
  }

  async tx (tx: Tx): Promise<TxResult> {
    if (tx.objectSpace === core.space.Model) {
      this.hierarchy.tx(tx)
      await this.model.tx(tx)
    }
    this.notify?.(tx)
    return await this.conn.tx(tx)
  }

  async updateFromRemote (tx: Tx): Promise<void> {
    console.log('UPDATE FROM REMOTE')
    if (tx.objectSpace === core.space.Model) {
      this.hierarchy.tx(tx)
      await this.model.tx(tx)
    }
    this.notify?.(tx)
  }

  async close (): Promise<void> {
    await this.conn.close()
  }
}

/**
 * @public
 */
export async function createClient (
  connect: (txHandler: TxHander) => Promise<Storage & Closable>
): Promise<Client> {
  let client: ClientImpl | null = null
  let txBuffer: Tx[] | undefined = []

  const hierarchy = new Hierarchy()
  const model = new ModelDb(hierarchy)

  function txHander (tx: Tx): void {
    if (client === null) {
      txBuffer?.push(tx)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      client.updateFromRemote(tx)
    }
  }

  const conn = await connect(txHander)
  const txes = await conn.findAll(core.class.Tx, { objectSpace: core.space.Model }, { sort: { _id: SortingOrder.Ascending } })

  const txMap = new Map<Ref<Tx>, Ref<Tx>>()
  for (const tx of txes) txMap.set(tx._id, tx._id)
  for (const tx of txes) hierarchy.tx(tx)
  for (const tx of txes) await model.tx(tx)

  txBuffer = txBuffer.filter((tx) => txMap.get(tx._id) === undefined)

  client = new ClientImpl(hierarchy, model, conn)

  for (const tx of txBuffer) txHander(tx)
  txBuffer = undefined

  return client
}
