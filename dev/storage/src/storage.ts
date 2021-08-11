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

import type { Tx, Ref, Doc, Class, DocumentQuery, FindResult, FindOptions } from '@anticrm/core'
import core, { ModelDb, TxDb, Hierarchy, DOMAIN_TX, TxFactory, ServerStorage } from '@anticrm/core'
import { Triggers } from '@anticrm/server'

import * as txJson from './model.tx.json'

class DevStorage implements ServerStorage {
  constructor (
    private readonly hierarchy: Hierarchy,
    private readonly triggers: Triggers,
    private readonly txdb: TxDb,
    private readonly modeldb: ModelDb
  ) {
  }

  async findAll<T extends Doc> (
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const domain = this.hierarchy.getDomain(_class)
    if (domain === DOMAIN_TX) return await this.txdb.findAll(_class, query, options)
    return await this.modeldb.findAll(_class, query, options)
  }

  async tx (tx: Tx): Promise<Tx[]> {
    if (tx.objectSpace === core.space.Model) {
      this.hierarchy.tx(tx)
      await this.triggers.tx(tx)
    }
    await Promise.all([this.modeldb.tx(tx), this.txdb.tx(tx)])
    const derived = await this.triggers.apply(tx)
    for (const tx of derived) {
      await Promise.all([this.modeldb.tx(tx), this.txdb.tx(tx)])
    }
    return derived
  }
}

/**
 * @public
 */
export async function createStorage (): Promise<ServerStorage> {
  const txes = txJson as unknown as Tx[]
  const hierarchy = new Hierarchy()
  const triggers = new Triggers(new TxFactory(core.account.System))
  for (const tx of txes) {
    hierarchy.tx(tx)
    await triggers.tx(tx)
  }

  const transactions = new TxDb(hierarchy)
  const model = new ModelDb(hierarchy)
  for (const tx of txes) {
    await Promise.all([transactions.tx(tx), model.tx(tx)])
  }

  return new DevStorage(hierarchy, triggers, transactions, model)
}
