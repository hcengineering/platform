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
  Class,
  Doc,
  DocumentQuery,
  Domain,
  FindOptions,
  FindResult,
  Hierarchy,
  ModelDb,
  Ref,
  StorageIterator,
  Tx,
  TxResult,
  BlobData,
  Space
} from '@anticrm/core'
import { DbAdapter } from '@anticrm/server-core'
import { BucketItem, Client, ItemBucketMetadata } from 'minio'

class MinioBlobAdapter implements DbAdapter {
  constructor (readonly db: string, readonly client: Client) {}

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return Object.assign([], { total: 0 })
  }

  async tx (tx: Tx): Promise<TxResult> {
    return {}
  }

  async init (model: Tx[]): Promise<void> {}

  async close (): Promise<void> {}

  async listMinioObjects (): Promise<Map<string, BucketItem & { metaData: ItemBucketMetadata }>> {
    const items = new Map<string, BucketItem & { metaData: ItemBucketMetadata }>()
    const list = await this.client.listObjects(this.db, undefined, true)
    await new Promise((resolve) => {
      list.on('data', (data) => {
        items.set(data.name, { metaData: {}, ...data })
      })
      list.on('end', () => {
        resolve(null)
      })
    })
    return items
  }

  async readMinioData (name: string): Promise<Buffer[]> {
    const data = await this.client.getObject(this.db, name)
    const chunks: Buffer[] = []

    await new Promise((resolve) => {
      data.on('readable', () => {
        let chunk
        while ((chunk = data.read()) !== null) {
          const b = chunk as Buffer
          chunks.push(b)
        }
      })

      data.on('end', () => {
        resolve(null)
      })
    })
    return chunks
  }

  find (domain: Domain): StorageIterator {
    let listRecieved = false
    let items: (BucketItem & { metaData: ItemBucketMetadata })[]
    let pos = 0
    return {
      next: async () => {
        if (!listRecieved) {
          items = Array.from((await this.listMinioObjects()).values())
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
      const stat = await this.client.statObject(this.db, item)
      const chunks: Buffer[] = await this.readMinioData(item)
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
        await this.client.removeObject(this.db, blob._id)
      } catch (ee) {
        // ignore error
      }
      const buffer = Buffer.from(blob.base64Data, 'base64')
      await this.client.putObject(this.db, blob._id, buffer, buffer.length, {
        'Content-Type': blob.type,
        lastModified: new Date(blob.modifiedOn)
      })
    }
  }

  async clean (domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    await this.client.removeObjects(this.db, docs)
  }
}

/**
 * @public
 */
export async function createMinioDataAdapter (
  hierarchy: Hierarchy,
  url: string,
  db: string,
  modelDb: ModelDb,
  storage?: Client
): Promise<DbAdapter> {
  if (storage === undefined) {
    throw new Error('minio storage adapter require minio')
  }
  return new MinioBlobAdapter(db, storage)
}
