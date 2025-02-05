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
  type Data,
  type Doc,
  type DocumentQuery,
  type DocumentUpdate,
  type Domain,
  type FindOptions,
  type FindResult,
  type Hierarchy,
  type IndexingConfiguration,
  type Iterator,
  type MeasureContext,
  ModelDb,
  type Ref,
  type StorageIterator,
  toFindResult,
  type Tx,
  type TxCUD,
  TxProcessor,
  type TxResult,
  type WorkspaceId
} from '@hcengineering/core'
import { type DbAdapter, type DbAdapterHandler, type DomainHelperOperations } from './adapter'
/**
 * @public
 */
export class DummyDbAdapter implements DbAdapter {
  on?: ((handler: DbAdapterHandler) => void) | undefined

  async traverse<T extends Doc>(
    domain: Domain,
    query: DocumentQuery<T>,
    options?: Pick<FindOptions<T>, 'sort' | 'limit' | 'projection'>
  ): Promise<Iterator<T>> {
    return {
      next: async () => [],
      close: async () => {}
    }
  }

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
      exists: async () => true,
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
      next: async () => [],
      close: async () => {}
    }
  }

  async load (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return []
  }

  async upload (ctx: MeasureContext, domain: Domain, docs: Doc[]): Promise<void> {}

  async clean (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<void> {}

  getDomainHash (ctx: MeasureContext, domain: Domain): Promise<string> {
    // Return '' for empty documents content.
    return Promise.resolve('')
  }

  async update<T extends Doc>(
    ctx: MeasureContext,
    domain: Domain,
    operations: Map<Ref<Doc>, Partial<Data<T>>>
  ): Promise<void> {}

  async groupBy<T, P extends Doc>(
    ctx: MeasureContext,
    domain: Domain,
    field: string,
    query?: DocumentQuery<P>
  ): Promise<Map<T, number>> {
    return new Map()
  }

  async rawFindAll<T extends Doc>(domain: Domain, query: DocumentQuery<T>, options?: FindOptions<T>): Promise<T[]> {
    return []
  }

  async rawUpdate<T extends Doc>(
    domain: Domain,
    query: DocumentQuery<T>,
    operations: DocumentUpdate<T>
  ): Promise<void> {}

  async rawDeleteMany<T extends Doc>(domain: Domain, query: DocumentQuery<T>): Promise<void> {}
}

class InMemoryAdapter extends DummyDbAdapter implements DbAdapter {
  private readonly modeldb: ModelDb

  constructor (readonly hierarchy: Hierarchy) {
    super()
    this.modeldb = new ModelDb(hierarchy)
  }

  findAll<T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return ctx.withSync('inmem-find', {}, () => this.modeldb.findAll(_class, query, options))
  }

  load (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return this.modeldb.findAll(core.class.Doc, { _id: { $in: docs } })
  }

  tx (ctx: MeasureContext, ...tx: Tx[]): Promise<TxResult[]> {
    // Filter transactions with broadcast only flags
    const ftx = tx.filter((it) => {
      if (TxProcessor.isExtendsCUD(it._class)) {
        const cud = it as TxCUD<Doc>
        const objClass = this.hierarchy.getClass(cud.objectClass)
        const mix = this.hierarchy.hasMixin(objClass, core.mixin.TransientConfiguration)
        if (mix && this.hierarchy.as(objClass, core.mixin.TransientConfiguration).broadcastOnly) {
          // We do not need to store a broadcast only transactions into model.
          return false
        }
      }
      return true
    })
    if (ftx.length === 0) {
      return Promise.resolve([])
    }
    return this.modeldb.tx(...ftx)
  }
}

/**
 * @public
 */
export async function createInMemoryAdapter (
  ctx: MeasureContext,
  contextVars: Record<string, any>,
  hierarchy: Hierarchy,
  url: string,
  workspaceId: WorkspaceId
): Promise<DbAdapter> {
  return new InMemoryAdapter(hierarchy)
}
