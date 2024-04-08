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
  BlobData,
  Class,
  Doc,
  DocumentQuery,
  DocumentUpdate,
  Domain,
  FindOptions,
  FindResult,
  Hierarchy,
  IndexingConfiguration,
  MeasureContext,
  ModelDb,
  Ref,
  Space,
  StorageIterator,
  Tx,
  TxResult,
  WorkspaceId
} from '@hcengineering/core'
import { DbAdapter, ListBlobResult, StorageAdapter } from '@hcengineering/server-core'

class StorageBlobAdapter implements DbAdapter {
  constructor (
    readonly workspaceId: WorkspaceId,
    readonly client: StorageAdapter,
    readonly ctx: MeasureContext
  ) {}

  async findAll<T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return Object.assign([], { total: 0 })
  }

  async tx (ctx: MeasureContext, ...tx: Tx[]): Promise<TxResult[]> {
    return []
  }

  async createIndexes (domain: Domain, config: Pick<IndexingConfiguration<Doc>, 'indexes'>): Promise<void> {}
  async removeOldIndex (domain: Domain, deletePattern: RegExp, keepPattern: RegExp): Promise<void> {}

  async close (): Promise<void> {}

  find (ctx: MeasureContext, domain: Domain): StorageIterator {
    let listReceived = false
    let items: ListBlobResult[] = []
    let pos = 0
    return {
      next: async () => {
        if (!listReceived) {
          items = await this.client.list(this.ctx, this.workspaceId)
          listReceived = true
        }
        if (pos < items?.length) {
          const item = items[pos]
          const result = {
            id: item._id,
            hash: item.etag,
            size: item.size
          }
          pos++
          return result
        }
      },
      close: async () => {}
    }
  }

  async load (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    const result: Doc[] = []
    for (const item of docs) {
      const stat = await this.client.stat(this.ctx, this.workspaceId, item)
      if (stat === undefined) {
        throw new Error(`Could not find blob ${item}`)
      }
      const chunks: Buffer[] = await this.client.read(this.ctx, this.workspaceId, item)
      const final = Buffer.concat(chunks)
      const dta: BlobData = {
        _id: item as Ref<BlobData>,
        _class: core.class.BlobData,
        name: item as string,
        size: stat.size,
        type: stat.contentType,
        space: 'blob' as Ref<Space>,
        modifiedOn: stat.modifiedOn,
        modifiedBy: core.account.System,
        base64Data: final.toString('base64')
      }
      result.push(dta)
    }
    return result
  }

  async upload (ctx: MeasureContext, domain: Domain, docs: Doc[]): Promise<void> {
    // Find documents to be updated
    for (const d of docs) {
      if (d._class !== core.class.BlobData) {
        // Skip non blob data documents
        continue
      }
      const blob = d as unknown as BlobData
      // Remove existing document
      try {
        await this.client.remove(this.ctx, this.workspaceId, [blob._id])
      } catch (ee) {
        // ignore error
      }
      const buffer = Buffer.from(blob.base64Data, 'base64')
      // TODO: Add support of
      /// lastModified: new Date(blob.modifiedOn)
      await this.client.put(this.ctx, this.workspaceId, blob._id, buffer, blob.type, buffer.length)
    }
  }

  async clean (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    await this.client.remove(this.ctx, this.workspaceId, docs)
  }

  async update (ctx: MeasureContext, domain: Domain, operations: Map<Ref<Doc>, DocumentUpdate<Doc>>): Promise<void> {
    throw new Error('Method not implemented.')
  }
}

/**
 * @public
 */
export async function createStorageDataAdapter (
  ctx: MeasureContext,
  hierarchy: Hierarchy,
  url: string,
  workspaceId: WorkspaceId,
  modelDb: ModelDb,
  storage?: StorageAdapter
): Promise<DbAdapter> {
  if (storage === undefined) {
    throw new Error('minio storage adapter require minio')
  }
  // We need to create bucket if it doesn't exist
  if (storage !== undefined) {
    if (!(await storage.exists(ctx, workspaceId))) {
      await storage.make(ctx, workspaceId)
    }
  }
  return new StorageBlobAdapter(workspaceId, storage, ctx)
}
