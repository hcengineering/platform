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

import { Client, type BucketItemStat, type ItemBucketMetadata, type UploadedObjectInfo } from 'minio'

import { toWorkspaceString, type WorkspaceId } from '@hcengineering/core'

import { type StorageAdapter, type WorkspaceItem } from '@hcengineering/server-core'
import { type Readable } from 'stream'

/**
 * @public
 */
export function getBucketId (workspaceId: WorkspaceId): string {
  return toWorkspaceString(workspaceId, '.')
}

/**
 * @public
 */
export class MinioService implements StorageAdapter {
  client: Client
  constructor (opt: { endPoint: string, port: number, accessKey: string, secretKey: string, useSSL: boolean }) {
    this.client = new Client(opt)
  }

  async exists (workspaceId: WorkspaceId): Promise<boolean> {
    return await this.client.bucketExists(getBucketId(workspaceId))
  }

  async make (workspaceId: WorkspaceId): Promise<void> {
    await this.client.makeBucket(getBucketId(workspaceId), 'k8s')
  }

  async remove (workspaceId: WorkspaceId, objectNames: string[]): Promise<void> {
    await this.client.removeObjects(getBucketId(workspaceId), objectNames)
  }

  async delete (workspaceId: WorkspaceId): Promise<void> {
    await this.client.removeBucket(getBucketId(workspaceId))
  }

  async list (workspaceId: WorkspaceId, prefix?: string): Promise<WorkspaceItem[]> {
    try {
      const items = new Map<string, WorkspaceItem>()
      const list = this.client.listObjects(getBucketId(workspaceId), prefix, true)
      await new Promise((resolve, reject) => {
        list.on('data', (data) => {
          if (data.name !== undefined) {
            items.set(data.name, { metaData: {}, ...data } as any)
          }
        })
        list.on('end', () => {
          list.destroy()
          resolve(null)
        })
        list.on('error', (err) => {
          reject(err)
        })
      })
      return Array.from(items.values())
    } catch (err: any) {
      const msg = (err?.message as string) ?? ''
      if (msg.includes('Invalid bucket name') || msg.includes('The specified bucket does not exist')) {
        return []
      }
      throw err
    }
  }

  async stat (workspaceId: WorkspaceId, objectName: string): Promise<BucketItemStat> {
    return await this.client.statObject(getBucketId(workspaceId), objectName)
  }

  async get (workspaceId: WorkspaceId, objectName: string): Promise<Readable> {
    return await this.client.getObject(getBucketId(workspaceId), objectName)
  }

  async put (
    workspaceId: WorkspaceId,
    objectName: string,
    stream: Readable | Buffer | string,
    size?: number,
    metaData?: ItemBucketMetadata
  ): Promise<UploadedObjectInfo> {
    return await this.client.putObject(getBucketId(workspaceId), objectName, stream, size, metaData)
  }

  async read (workspaceId: WorkspaceId, name: string): Promise<Buffer[]> {
    const data = await this.client.getObject(getBucketId(workspaceId), name)
    const chunks: Buffer[] = []

    await new Promise((resolve, reject) => {
      data.on('readable', () => {
        let chunk
        while ((chunk = data.read()) !== null) {
          const b = chunk as Buffer
          chunks.push(b)
        }
      })

      data.on('end', () => {
        data.destroy()
        resolve(null)
      })
      data.on('error', (err) => {
        reject(err)
      })
    })
    return chunks
  }

  async partial (workspaceId: WorkspaceId, objectName: string, offset: number, length?: number): Promise<Readable> {
    return await this.client.getPartialObject(getBucketId(workspaceId), objectName, offset, length)
  }
}
