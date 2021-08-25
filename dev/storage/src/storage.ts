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
import { DbAdapter } from '@anticrm/server-core'

import * as txJson from './model.tx.json'

const txes = txJson as unknown as Tx[]

/**
 * @public
 */
export class InMemoryAdapter implements DbAdapter {
  private _modeldb: ModelDb | undefined
  private _txdb: TxDb | undefined
  private _hierarchy: Hierarchy | undefined

  async connect (url: string, db: string): Promise<void> {
  }

  private hierarchy (): Hierarchy {
    if (this._hierarchy === undefined) {
      throw new Error('hierarchy not set')
    }
    return this._hierarchy
  }

  private txdb (): TxDb {
    if (this._txdb === undefined) {
      throw new Error('hierarchy not set')
    }
    return this._txdb
  }

  private modeldb (): ModelDb {
    if (this._modeldb === undefined) {
      throw new Error('hierarchy not set')
    }
    return this._modeldb
  }

  setHierarchy (hierarchy: Hierarchy): void {
    this._hierarchy = hierarchy
    this._txdb = new TxDb(hierarchy)
    this._modeldb = new ModelDb(hierarchy)
    for (const tx of txes) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this._txdb.tx(tx)
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this._modeldb.tx(tx)
    }
  }

  async findAll<T extends Doc> (
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const domain = this.hierarchy().getDomain(_class)
    if (domain === DOMAIN_TX) return await this.txdb().findAll(_class, query, options)
    return await this.modeldb().findAll(_class, query, options)
  }

  async tx (tx: Tx): Promise<void> {
    await Promise.all([this.modeldb().tx(tx), this.txdb().tx(tx)])
  }

  async getModel (): Promise<Tx[]> {
    return txes
  }
}
