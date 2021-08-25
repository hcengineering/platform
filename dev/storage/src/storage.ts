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
import { ModelDb, TxDb, Hierarchy, DOMAIN_TX } from '@anticrm/core'
import type { DbAdapter } from '@anticrm/server-core'

import * as txJson from './model.tx.json'

const txes = txJson as unknown as Tx[]

class InMemoryAdapter implements DbAdapter {
  constructor (
    private readonly hierarchy: Hierarchy,
    private readonly txdb: TxDb,
    private readonly modeldb: ModelDb
  ) {}

  async findAll<T extends Doc> (
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const domain = this.hierarchy.getDomain(_class)
    if (domain === DOMAIN_TX) return await this.txdb.findAll(_class, query, options)
    return await this.modeldb.findAll(_class, query, options)
  }

  async tx (tx: Tx): Promise<void> {
    await Promise.all([this.modeldb.tx(tx), this.txdb.tx(tx)])
  }

  async init (): Promise<void> {
    for (const tx of txes) {
      await this.txdb.tx(tx)
      await this.modeldb.tx(tx)
    }
  }
}

/**
 * @public
 */
export async function createInMemoryAdapter (hierarchy: Hierarchy, url: string, db: string): Promise<[DbAdapter, Tx[]]> {
  const txdb = new TxDb(hierarchy)
  const modeldb = new ModelDb(hierarchy)
  return [new InMemoryAdapter(hierarchy, txdb, modeldb), txes]
}
