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

import { Client, type UploadedObjectInfo } from 'minio'

import core, {
  toWorkspaceString,
  type Blob,
  type MeasureContext,
  type Ref,
  type WorkspaceId
} from '@hcengineering/core'

import { type ListBlobResult, type StorageAdapter, type StorageConfig } from '@hcengineering/server-core'
import { type Readable } from 'stream'

/**
 * @public
 */
export function getBucketId (workspaceId: WorkspaceId): string {
  return toWorkspaceString(workspaceId, '.')
}

export interface MinioConfig extends StorageConfig {
  kind: 'minio'
  region: string
  endpoint: string
  accessKeyId: string
  secretAccessKey: string

  port: number
  useSSL: boolean
}

/**
 * @public
 */
export class MinioService implements StorageAdapter {
  static config = 'minio'
  client: Client
  constructor (opt: { endPoint: string, port: number, accessKey: string, secretKey: string, useSSL: boolean }) {
    this.client = new Client(opt)
  }

  async initialize (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {}

  async exists (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<boolean> {
    return await this.client.bucketExists(getBucketId(workspaceId))
  }

  async make (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {
    await this.client.makeBucket(getBucketId(workspaceId), 'k8s')
  }

  async remove (ctx: MeasureContext, workspaceId: WorkspaceId, objectNames: string[]): Promise<void> {
    await this.client.removeObjects(getBucketId(workspaceId), objectNames)
  }

  async delete (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {
    await this.client.removeBucket(getBucketId(workspaceId))
  }

  async list (ctx: MeasureContext, workspaceId: WorkspaceId, prefix?: string): Promise<ListBlobResult[]> {
    try {
      const items = new Map<string, ListBlobResult>()
      const list = this.client.listObjects(getBucketId(workspaceId), prefix, true)
      await new Promise((resolve, reject) => {
        list.on('data', (data) => {
          if (data.name !== undefined) {
            items.set(data.name, {
              _id: data.name as Ref<Blob>,
              _class: core.class.Blob,
              etag: data.etag,
              size: data.size,
              provider: 'minio',
              space: core.space.Configuration,
              modifiedBy: core.account.ConfigUser,
              modifiedOn: data.lastModified.getTime(),
              storageId: data.name
            })
          }
        })
        list.on('end', () => {
          list.destroy()
          resolve(null)
        })
        list.on('error', (err) => {
          list.destroy()
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

  async stat (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string): Promise<Blob | undefined> {
    try {
      const result = await this.client.statObject(getBucketId(workspaceId), objectName)
      return {
        provider: '',
        _class: core.class.Blob,
        _id: objectName as Ref<Blob>,
        storageId: objectName,
        contentType: result.metaData['content-type'],
        size: result.size,
        etag: result.etag,
        space: core.space.Configuration,
        modifiedBy: core.account.System,
        modifiedOn: result.lastModified.getTime(),
        version: result.versionId ?? null
      }
    } catch (err: any) {
      await ctx.error('no object found', err)
    }
  }

  async get (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string): Promise<Readable> {
    return await this.client.getObject(getBucketId(workspaceId), objectName)
  }

  async put (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    stream: Readable | Buffer | string,
    contentType: string,
    size?: number
  ): Promise<UploadedObjectInfo> {
    return await this.client.putObject(getBucketId(workspaceId), objectName, stream, size, {
      'Content-Type': contentType
    })
  }

  async read (ctx: MeasureContext, workspaceId: WorkspaceId, name: string): Promise<Buffer[]> {
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

  async partial (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    offset: number,
    length?: number
  ): Promise<Readable> {
    return await this.client.getPartialObject(getBucketId(workspaceId), objectName, offset, length)
  }
}
