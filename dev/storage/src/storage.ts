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

import type { Tx, Ref, Doc, Class, DocumentQuery, FindResult, FindOptions, TxResult } from '@anticrm/core'
import { ModelDb, TxDb, Hierarchy } from '@anticrm/core'
import type { DbAdapter, TxAdapter } from '@anticrm/server-core'

import * as txJson from './model.tx.json'

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
    return txJson as unknown as Tx[]
  }
}

class InMemoryAdapter implements DbAdapter {
  private readonly modeldb: ModelDb

  constructor (hierarchy: Hierarchy) {
    this.modeldb = new ModelDb(hierarchy)
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return await this.modeldb.findAll(_class, query, options)
  }

  async tx (tx: Tx): Promise<TxResult> {
    return await this.modeldb.tx(tx)
  }

  async init (model: Tx[]): Promise<void> {
    for (const tx of model) {
      await this.modeldb.tx(tx)
    }
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

/**
 * @public
 */
export async function createInMemoryAdapter (hierarchy: Hierarchy, url: string, db: string): Promise<DbAdapter> {
  return new InMemoryAdapter(hierarchy)
}
