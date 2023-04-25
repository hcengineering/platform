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
  FindOptions,
  FindResult,
  Ref,
  Tx,
  TxResult,
  WorkspaceId
} from '@hcengineering/core'
import { Hierarchy, TxDb } from '@hcengineering/core'
import builder from '@hcengineering/model-all'
import { DummyDbAdapter, TxAdapter } from '@hcengineering/server-core'

class InMemoryTxAdapter extends DummyDbAdapter implements TxAdapter {
  private readonly txdb: TxDb

  constructor (hierarchy: Hierarchy) {
    super()
    this.txdb = new TxDb(hierarchy)
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return await this.txdb.findAll(_class, query, options)
  }

  async tx (...tx: Tx[]): Promise<TxResult> {
    const r: TxResult[] = []
    for (const t of tx) {
      r.push(await this.txdb.tx(t))
    }
    if (r.length === 1) {
      return r[0]
    }
    if (r.length === 0) {
      return {}
    }
    return r
  }

  async init (model: Tx[]): Promise<void> {
    for (const tx of model) {
      await this.txdb.tx(tx)
    }
  }

  async getModel (): Promise<Tx[]> {
    return builder().getTxes()
  }
}

/**
 * @public
 */
export async function createInMemoryTxAdapter (
  hierarchy: Hierarchy,
  url: string,
  workspace: WorkspaceId
): Promise<TxAdapter> {
  return new InMemoryTxAdapter(hierarchy)
}
