//
// Copyright © 2024 Hardcore Engineering Inc.
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

import core, { type Blob, type MeasureContext, type Ref, type WorkspaceId, withContext } from '@hcengineering/core'

import {
  type BlobStorageIterator,
  type BucketInfo,
  type StorageAdapter,
  type StorageConfig,
  type StorageConfiguration,
  type UploadedObjectInfo
} from '@hcengineering/server-core'
import { type Readable } from 'stream'
import { type ObjectMetadata, Client } from './client'

export interface DatalakeConfig extends StorageConfig {
  kind: 'datalake'
}

/**
 * @public
 */
export class DatalakeService implements StorageAdapter {
  static config = 'datalake'
  client: Client
  constructor (readonly opt: DatalakeConfig) {
    this.client = new Client(opt.endpoint, opt.port)
  }

  async initialize (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {}

  async close (): Promise<void> {}

  async exists (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<boolean> {
    // workspace/buckets not supported, assume that always exist
    return true
  }

  @withContext('make')
  async make (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {
    // workspace/buckets not supported, assume that always exist
  }

  async listBuckets (ctx: MeasureContext): Promise<BucketInfo[]> {
    return []
  }

  @withContext('remove')
  async remove (ctx: MeasureContext, workspaceId: WorkspaceId, objectNames: string[]): Promise<void> {
    await Promise.all(
      objectNames.map(async (objectName) => {
        await this.client.deleteObject(ctx, workspaceId, objectName)
      })
    )
  }

  @withContext('delete')
  async delete (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {
    // not supported, just do nothing and pretend we deleted the workspace
  }

  @withContext('listStream')
  async listStream (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<BlobStorageIterator> {
    return {
      next: async () => [],
      close: async () => {}
    }
  }

  @withContext('stat')
  async stat (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string): Promise<Blob | undefined> {
    try {
      const result = await this.client.statObject(ctx, workspaceId, objectName)
      if (result !== undefined) {
        return {
          provider: '',
          _class: core.class.Blob,
          _id: objectName as Ref<Blob>,
          storageId: objectName,
          contentType: result.type,
          size: result.size ?? 0,
          etag: result.etag ?? '',
          space: core.space.Configuration,
          modifiedBy: core.account.System,
          modifiedOn: result.lastModified,
          version: null
        }
      } else {
        ctx.error('no object found', { objectName, workspaceId: workspaceId.name })
      }
    } catch (err) {
      ctx.error('failed to stat object', { error: err, objectName, workspaceId: workspaceId.name })
    }
  }

  @withContext('get')
  async get (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string): Promise<Readable> {
    return await this.client.getObject(ctx, workspaceId, objectName)
  }

  @withContext('put')
  async put (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    stream: Readable | Buffer | string,
    contentType: string,
    size?: number
  ): Promise<UploadedObjectInfo> {
    const metadata: ObjectMetadata = {
      lastModified: Date.now(),
      name: objectName,
      type: contentType,
      size
    }

    await ctx.with('put', {}, async (ctx) => {
      await withRetry(ctx, 5, async () => {
        await this.client.putObject(ctx, workspaceId, objectName, stream, metadata, size)
      })
    })

    return {
      etag: '',
      versionId: ''
    }
  }

  @withContext('read')
  async read (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string): Promise<Buffer[]> {
    const data = await this.client.getObject(ctx, workspaceId, objectName)
    const chunks: Buffer[] = []

    for await (const chunk of data) {
      chunks.push(chunk)
    }

    return chunks
  }

  @withContext('partial')
  async partial (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    offset: number,
    length?: number
  ): Promise<Readable> {
    return await this.client.getPartialObject(ctx, workspaceId, objectName, offset, length)
  }

  async getUrl (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string): Promise<string> {
    return this.client.getObjectUrl(ctx, workspaceId, objectName)
  }
}

export function processConfigFromEnv (storageConfig: StorageConfiguration): string | undefined {
  let endpoint = process.env.DATALAKE_ENDPOINT
  if (endpoint === undefined) {
    return 'DATALAKE_ENDPOINT'
  }

  let port = 80
  const sp = endpoint.split(':')
  if (sp.length > 1) {
    endpoint = sp[0]
    port = parseInt(sp[1])
  }

  const config: DatalakeConfig = {
    kind: 'datalake',
    name: 'datalake',
    endpoint,
    port
  }
  storageConfig.storages.push(config)
  storageConfig.default = 'datalake'
}

async function withRetry<T> (
  ctx: MeasureContext,
  retries: number,
  op: () => Promise<T>,
  delay: number = 100
): Promise<T> {
  let error: any
  while (retries > 0) {
    retries--
    try {
      return await op()
    } catch (err: any) {
      error = err
      ctx.error('error', { err })
      if (retries !== 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw error
}
