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
import { type DbAdapter, type DomainHelperOperations } from './adapter'

/**
 * @public
 */
export class DummyDbAdapter implements DbAdapter {
  async findAll<T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T> | undefined
  ): Promise<FindResult<T>> {
    return toFindResult([])
  }

  async init (): Promise<void> {}

  helper (): DomainHelperOperations {
    return {
      create: async () => {},
      exists: () => true,
      listDomains: async () => new Set(),
      createIndex: async () => {},
      dropIndex: async () => {},
      listIndexes: async () => [],
      estimatedCount: async () => 0
    }
  }

  async createIndexes (domain: Domain, config: Pick<IndexingConfiguration<Doc>, 'indexes'>): Promise<void> {}
  async removeOldIndex (domain: Domain, deletePattern: RegExp[], keepPattern: RegExp[]): Promise<void> {}

  async tx (ctx: MeasureContext, ...tx: Tx[]): Promise<TxResult[]> {
    return []
  }

  async close (): Promise<void> {}

  find (ctx: MeasureContext, domain: Domain): StorageIterator {
    return {
      next: async () => undefined,
      close: async () => {}
    }
  }

  async load (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return []
  }

  async upload (ctx: MeasureContext, domain: Domain, docs: Doc[]): Promise<void> {}

  async clean (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<void> {}

  async update (ctx: MeasureContext, domain: Domain, operations: Map<Ref<Doc>, DocumentUpdate<Doc>>): Promise<void> {}

  async groupBy<T>(ctx: MeasureContext, domain: Domain, field: string): Promise<Set<T>> {
    return new Set()
  }
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
  ctx: MeasureContext,
  hierarchy: Hierarchy,
  url: string,
  workspaceId: WorkspaceId
): Promise<DbAdapter> {
  return new InMemoryAdapter(hierarchy)
}
