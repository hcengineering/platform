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

import core, {
  type Class,
  type Doc,
  type DocumentQuery,
  type DocumentUpdate,
  type Domain,
  type FindOptions,
  type FindResult,
  type Hierarchy,
  type IndexingConfiguration,
  type MeasureContext,
  ModelDb,
  type Ref,
  type StorageIterator,
  toFindResult,
  type Tx,
  type TxResult,
  type WorkspaceId
} from '@hcengineering/core'
import { type DbAdapter } from './adapter'

/**
 * @public
 */
export class DummyDbAdapter implements DbAdapter {
  async findAll<T extends Doc>(
    _class: Ref<Class<T>>
  ): Promise<FindResult<T>> {
    return toFindResult([])
  }

  async createIndexes (): Promise<void> {}
  async removeOldIndex (): Promise<void> {}

  async tx (): Promise<TxResult[]> {
    return []
  }

  async close (): Promise<void> {}

  find (): StorageIterator {
    return {
      next: async () => undefined,
      close: async () => {}
    }
  }

  async load (): Promise<Doc[]> {
    return []
  }

  async upload (): Promise<void> {}

  async clean (): Promise<void> {}

  async update (): Promise<void> {}
}

class InMemoryAdapter extends DummyDbAdapter implements DbAdapter {
  private readonly modeldb: ModelDb

  constructor (hierarchy: Hierarchy) {
    super()
    this.modeldb = new ModelDb(hierarchy)
  }

  async findAll<T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return await this.modeldb.findAll(_class, query, options)
  }

  async load (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return await this.modeldb.findAll(core.class.Doc, { _id: { $in: docs } })
  }

  async tx (ctx: MeasureContext, ...tx: Tx[]): Promise<TxResult[]> {
    return await this.modeldb.tx(...tx)
  }
}

/**
 * @public
 */
export async function createInMemoryAdapter (
  hierarchy: Hierarchy,
): Promise<DbAdapter> {
  return new InMemoryAdapter(hierarchy)
}
