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

import { BucketItem, BucketItemStat, Client, ItemBucketMetadata, UploadedObjectInfo } from 'minio'

import { Readable as ReadableStream } from 'stream'

import { toWorkspaceString, WorkspaceId } from '@hcengineering/core'

/**
 * @public
 */
export type MinioWorkspaceItem = Required<BucketItem> & { metaData: ItemBucketMetadata }

/**
 * @public
 */
export function getBucketId (workspaceId: WorkspaceId): string {
  return toWorkspaceString(workspaceId, '.')
}

/**
 * @public
 */
export class MinioService {
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

  async list (workspaceId: WorkspaceId, prefix?: string): Promise<MinioWorkspaceItem[]> {
    try {
      const items = new Map<string, MinioWorkspaceItem>()
      const list = await this.client.listObjects(getBucketId(workspaceId), prefix, true)
      await new Promise((resolve) => {
        list.on('data', (data) => {
          if (data.name !== undefined) {
            items.set(data.name, { metaData: {}, ...data } as any)
          }
        })
        list.on('end', () => {
          resolve(null)
        })
      })
      return Array.from(items.values())
    } catch (err: any) {
      if (((err?.message as string) ?? '').includes('Invalid bucket name')) {
        return []
      }
      throw err
    }
  }

  async stat (workspaceId: WorkspaceId, objectName: string): Promise<BucketItemStat> {
    return await this.client.statObject(getBucketId(workspaceId), objectName)
  }

  async get (workspaceId: WorkspaceId, objectName: string): Promise<ReadableStream> {
    return await this.client.getObject(getBucketId(workspaceId), objectName)
  }

  async put (
    workspaceId: WorkspaceId,
    objectName: string,
    stream: ReadableStream | Buffer | string,
    size?: number,
    metaData?: ItemBucketMetadata
  ): Promise<UploadedObjectInfo> {
    return await this.client.putObject(getBucketId(workspaceId), objectName, stream, size, metaData)
  }

  async read (workspaceId: WorkspaceId, name: string): Promise<Buffer[]> {
    const data = await this.client.getObject(getBucketId(workspaceId), name)
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

  async partial (
    workspaceId: WorkspaceId,
    objectName: string,
    offset: number,
    length?: number
  ): Promise<ReadableStream> {
    return await this.client.getPartialObject(getBucketId(workspaceId), objectName, offset, length)
  }
}
