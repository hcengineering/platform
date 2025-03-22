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

import {
  type Class,
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
  type ModelDb,
  type Ref,
  type StorageIterator,
  toFindResult,
  type Tx,
  type TxResult,
  type Blob,
  type WorkspaceIds,
  generateId
} from '@hcengineering/core'
import { PlatformError, unknownError } from '@hcengineering/platform'
import {
  type DbAdapter,
  type DbAdapterHandler,
  type RawFindIterator,
  type StorageAdapter,
  type StorageAdapterEx
} from '@hcengineering/server-core'

class StorageBlobAdapter implements DbAdapter {
  constructor (
    readonly storageIds: WorkspaceIds,
    readonly client: StorageAdapterEx, // Should not be closed
    readonly ctx: MeasureContext
  ) {}

  async traverse<T extends Doc>(
    domain: Domain,
    query: DocumentQuery<T>,
    options?: Pick<FindOptions<T>, 'sort' | 'limit' | 'projection'>
  ): Promise<Iterator<T>> {
    return {
      next: async () => {
        return toFindResult<T>([])
      },
      close: async () => {}
    }
  }

  init?:
  | ((
    ctx: MeasureContext,
    contextVars: Record<string, any>,
    domains?: string[],
    excludeDomains?: string[]
  ) => Promise<void>)
  | undefined

  on?: ((handler: DbAdapterHandler) => void) | undefined

  async rawFindAll<T extends Doc>(domain: Domain, query: DocumentQuery<T>, options?: FindOptions<T>): Promise<T[]> {
    return []
  }

  rawFind (ctx: MeasureContext, domain: Domain): RawFindIterator {
    return {
      find: async () => [],
      close: async () => {}
    }
  }

  async rawUpdate<T extends Doc>(
    domain: Domain,
    query: DocumentQuery<T>,
    operations: DocumentUpdate<T>
  ): Promise<void> {}

  async rawDeleteMany<T extends Doc>(domain: Domain, query: DocumentQuery<T>): Promise<void> {}

  async findAll<T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return toFindResult([])
  }

  async groupBy<T>(ctx: MeasureContext, domain: Domain, field: string): Promise<Map<T, number>> {
    return new Map()
  }

  async tx (ctx: MeasureContext, ...tx: Tx[]): Promise<TxResult[]> {
    throw new PlatformError(unknownError('Direct Blob operations are not possible'))
  }

  async createIndexes (domain: Domain, config: Pick<IndexingConfiguration<Doc>, 'indexes'>): Promise<void> {}
  async removeOldIndex (domain: Domain, deletePattern: RegExp[], keepPattern: RegExp[]): Promise<void> {}

  async close (): Promise<void> {}

  find (ctx: MeasureContext, domain: Domain): StorageIterator {
    return this.client.find(ctx, this.storageIds)
  }

  async load (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    const blobs: Blob[] = []
    for (const d of docs) {
      const bb = await this.client.stat(ctx, this.storageIds, d)
      if (bb !== undefined) {
        blobs.push(bb)
      }
    }
    return blobs
  }

  getDomainHash (ctx: MeasureContext, domain: Domain): Promise<string> {
    // TODO: Check if possible to ask storage if there any changes.
    return Promise.resolve(generateId())
  }

  async upload (ctx: MeasureContext, domain: Domain, docs: Doc[]): Promise<void> {
    // Nothing to do
  }

  async clean (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    await this.client.remove(this.ctx, this.storageIds, docs)
  }

  async update (ctx: MeasureContext, domain: Domain, operations: Map<Ref<Doc>, DocumentUpdate<Doc>>): Promise<void> {}
}

/**
 * @public
 */
export async function createStorageDataAdapter (
  ctx: MeasureContext,
  contextVars: Record<string, any>,
  hierarchy: Hierarchy,
  url: string,
  wsIds: WorkspaceIds,
  modelDb: ModelDb,
  storage?: StorageAdapter
): Promise<DbAdapter> {
  if (storage === undefined) {
    throw new Error('Storage adapter required')
  }
  // We need to create bucket if it doesn't exist
  if (!(await storage.exists(ctx, wsIds))) {
    await storage.make(ctx, wsIds)
  }
  return new StorageBlobAdapter(wsIds, storage as StorageAdapterEx, ctx)
}
