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
import { TxOperations } from './tx'
import type { Storage, DocumentQuery, FindOptions, FindResult } from './storage'

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
export interface Client extends TxOperations {
  getHierarchy: () => Hierarchy
}

class ClientStorage implements Storage {
  constructor (private readonly hierarchy: Hierarchy, private readonly model: ModelDb, private readonly conn: Storage) {
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const clazz = this.hierarchy.getClass(_class)
    if (clazz.domain === DOMAIN_MODEL) {
      return await this.model.findAll(_class, query, options)
    }
    return await this.conn.findAll(_class, query, options)
  }

  async tx (tx: Tx): Promise<void> {
    await this.conn.tx(tx)
  }
}

class ClientImpl extends TxOperations {
  constructor (private readonly hierarchy: Hierarchy, model: ModelDb, conn: Storage) {
    super(new ClientStorage(hierarchy, model, conn), core.account.System)
  }

  getHierarchy (): Hierarchy { return this.hierarchy }
}

/**
 * @public
 */
export async function createClient (
  connect: (txHandler: TxHander) => Promise<Storage>,
  notify?: (tx: Tx) => void
): Promise<Client> {
  let client: Client | null = null
  let txBuffer: Tx[] | undefined = []

  const hierarchy = new Hierarchy()
  const model = new ModelDb(hierarchy)

  function txHander (tx: Tx): void {
    if (client === null) {
      txBuffer?.push(tx)
    } else {
      if (tx.objectSpace === core.space.Model) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        hierarchy.tx(tx)
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        model.tx(tx)
      }
      notify?.(tx)
    }
  }

  const conn = await connect(txHander)
  const txes = await conn.findAll(core.class.Tx, { objectSpace: core.space.Model })

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
