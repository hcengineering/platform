//
// Copyright © 2022 Hardcore Engineering Inc.
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

import type {
  Class,
  Doc,
  DocumentQuery,
  Domain,
  FindOptions,
  FindResult,
  Ref,
  StorageIterator,
  Tx,
  TxResult
} from '@anticrm/core'
import { Hierarchy, TxDb } from '@anticrm/core'
import builder from '@anticrm/model-all'
import type { TxAdapter } from '@anticrm/server-core'

class InMemoryTxAdapter implements TxAdapter {
  private readonly txdb: TxDb

  constructor (hierarchy: Hierarchy) {
    this.txdb = new TxDb(hierarchy)
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return await this.txdb.findAll(_class, query, options)
  }

  tx (tx: Tx): Promise<TxResult> {
    return this.txdb.tx(tx)
  }

  async init (model: Tx[]): Promise<void> {
    for (const tx of model) {
      await this.txdb.tx(tx)
    }
  }

  async getModel (): Promise<Tx[]> {
    return builder.getTxes()
  }

  async close (): Promise<void> {}

  find (domain: Domain): StorageIterator {
    return {
      next: async () => await Promise.reject(new Error('Not implemented')),
      close: async () => {}
    }
  }

  async load (domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return []
  }
}

/**
 * @public
 */
export async function createInMemoryTxAdapter (
  hierarchy: Hierarchy,
  url: string,
  workspace: string
): Promise<TxAdapter> {
  return new InMemoryTxAdapter(hierarchy)
}
