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
  ModelDb,
  Ref,
  Space,
  StorageIterator,
  Tx,
  TxResult,
  WorkspaceId
} from '@hcengineering/core'
import { MinioService, MinioWorkspaceItem } from '@hcengineering/minio'
import { DbAdapter } from '@hcengineering/server-core'

class MinioBlobAdapter implements DbAdapter {
  constructor (readonly workspaceId: WorkspaceId, readonly client: MinioService) {}

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return Object.assign([], { total: 0 })
  }

  async tx (...tx: Tx[]): Promise<TxResult> {
    return {}
  }

  async init (model: Tx[]): Promise<void> {}

  async createIndexes (domain: Domain, config: Pick<IndexingConfiguration<Doc>, 'indexes'>): Promise<void> {}

  async close (): Promise<void> {}

  find (domain: Domain): StorageIterator {
    let listRecieved = false
    let items: MinioWorkspaceItem[] = []
    let pos = 0
    return {
      next: async () => {
        if (!listRecieved) {
          items = await this.client.list(this.workspaceId)
          listRecieved = true
        }
        if (pos < items?.length) {
          const item = items[pos]
          const result = {
            id: item.name,
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

  async load (domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    const result: Doc[] = []
    for (const item of docs) {
      const stat = await this.client.stat(this.workspaceId, item)
      const chunks: Buffer[] = await this.client.read(this.workspaceId, item)
      const final = Buffer.concat(chunks)
      const dta: BlobData = {
        _id: item as Ref<BlobData>,
        _class: core.class.BlobData,
        name: item as string,
        size: stat.size,
        type: stat.metaData['content-type'],
        space: 'blob' as Ref<Space>,
        modifiedOn: stat.lastModified.getTime(),
        modifiedBy: core.account.System,
        base64Data: final.toString('base64')
      }
      result.push(dta)
    }
    return result
  }

  async upload (domain: Domain, docs: Doc[]): Promise<void> {
    // Find documents to be updated
    for (const d of docs) {
      if (d._class !== core.class.BlobData) {
        // Skip non blob data documents
        continue
      }
      const blob = d as unknown as BlobData
      // Remove existing document
      try {
        await this.client.remove(this.workspaceId, [blob._id])
      } catch (ee) {
        // ignore error
      }
      const buffer = Buffer.from(blob.base64Data, 'base64')
      await this.client.put(this.workspaceId, blob._id, buffer, buffer.length, {
        'Content-Type': blob.type,
        lastModified: new Date(blob.modifiedOn)
      })
    }
  }

  async clean (domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    await this.client.remove(this.workspaceId, docs)
  }

  async update (domain: Domain, operations: Map<Ref<Doc>, DocumentUpdate<Doc>>): Promise<void> {
    throw new Error('Method not implemented.')
  }
}

/**
 * @public
 */
export async function createMinioDataAdapter (
  hierarchy: Hierarchy,
  url: string,
  workspaceId: WorkspaceId,
  modelDb: ModelDb,
  storage?: MinioService
): Promise<DbAdapter> {
  if (storage === undefined) {
    throw new Error('minio storage adapter require minio')
  }
  return new MinioBlobAdapter(workspaceId, storage)
}
