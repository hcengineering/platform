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
  Class,
  Doc,
  DocumentQuery,
  DocumentUpdate,
  Domain,
  FindOptions,
  FindResult,
  Hierarchy,
  IndexingConfiguration,
  Iterator,
  MeasureContext,
  ModelDb,
  Ref,
  StorageIterator,
  toFindResult,
  Tx,
  TxResult,
  WorkspaceUuid,
  type Blob
} from '@hcengineering/core'
import { PlatformError, unknownError } from '@hcengineering/platform'
import { DbAdapter, DbAdapterHandler, StorageAdapter, type StorageAdapterEx } from '@hcengineering/server-core'

class StorageBlobAdapter implements DbAdapter {
  constructor (
    readonly workspaceId: WorkspaceUuid,
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

  init?: ((domains?: string[], excludeDomains?: string[]) => Promise<void>) | undefined
  on?: ((handler: DbAdapterHandler) => void) | undefined

  async rawFindAll<T extends Doc>(domain: Domain, query: DocumentQuery<T>, options?: FindOptions<T>): Promise<T[]> {
    return []
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

  find (ctx: MeasureContext, domain: Domain, recheck?: boolean): StorageIterator {
    return this.client.find(ctx, this.workspaceId)
  }

  async load (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    const blobs: Blob[] = []
    for (const d of docs) {
      const bb = await this.client.stat(ctx, this.workspaceId, d)
      if (bb !== undefined) {
        blobs.push(bb)
      }
    }
    return blobs
  }

  async upload (ctx: MeasureContext, domain: Domain, docs: Doc[]): Promise<void> {
    // Nothing to do
  }

  async clean (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    await this.client.remove(this.ctx, this.workspaceId, docs)
  }

  async update (ctx: MeasureContext, domain: Domain, operations: Map<Ref<Doc>, DocumentUpdate<Doc>>): Promise<void> {}
}

/**
 * @public
 */
export async function createStorageDataAdapter (
  ctx: MeasureContext,
  hierarchy: Hierarchy,
  url: string,
  workspaceId: WorkspaceUuid,
  modelDb: ModelDb,
  storage: StorageAdapter
): Promise<DbAdapter> {
  if (storage === undefined) {
    throw new Error('minio storage adapter require minio')
  }
  // We need to create bucket if it doesn't exist
  if (!(await storage.exists(ctx, workspaceId))) {
    await storage.make(ctx, workspaceId)
  }
  return new StorageBlobAdapter(workspaceId, storage as StorageAdapterEx, ctx)
}
