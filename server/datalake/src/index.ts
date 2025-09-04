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

import core, {
  type Blob,
  type MeasureContext,
  type Ref,
  type WorkspaceIds,
  systemAccountUuid,
  withContext
} from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import {
  type BlobStorageIterator,
  type BucketInfo,
  type ListBlobResult,
  type StorageAdapter,
  type StorageConfig,
  type StorageConfiguration,
  type UploadedObjectInfo
} from '@hcengineering/server-core'
import serverToken, { generateToken } from '@hcengineering/server-token'
import { type Readable } from 'stream'
import { type UploadObjectParams, DatalakeClient, type WorkspaceStats } from './client'
import { NotFoundError } from './error'

export { DatalakeClient, type WorkspaceStats }

/**
 * @public
 */
export interface DatalakeConfig extends StorageConfig {
  kind: 'datalake'
}

/**
 * @public
 */
export function createDatalakeClient (cfg: DatalakeConfig, token: string): DatalakeClient {
  const endpoint = Number.isInteger(cfg.port) ? `${cfg.endpoint}:${cfg.port}` : cfg.endpoint
  return new DatalakeClient(endpoint, token)
}

export const CONFIG_KIND = 'datalake'

/**
 * @public
 */
export interface DatalakeClientOptions {
  retryCount?: number
  retryInterval?: number
}

/**
 * @public
 */
export class DatalakeService implements StorageAdapter {
  private readonly client: DatalakeClient
  private readonly retryCount: number
  private readonly retryInterval: number

  constructor (
    readonly cfg: DatalakeConfig,
    readonly options: DatalakeClientOptions = {}
  ) {
    const secret = getMetadata(serverToken.metadata.Secret)
    if (secret === undefined) {
      console.warn('Server secret not set, datalake storage adapter initialized with default secret')
    }
    const token = generateToken(systemAccountUuid, undefined)
    this.client = createDatalakeClient(cfg, token)
    this.retryCount = options.retryCount ?? 5
    this.retryInterval = options.retryInterval ?? 50
  }

  async initialize (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<void> {}

  async close (): Promise<void> {}

  async exists (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<boolean> {
    // workspace/buckets not supported, assume that always exist
    return true
  }

  @withContext('make')
  async make (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<void> {
    // workspace/buckets not supported, assume that always exist
  }

  async listBuckets (ctx: MeasureContext): Promise<BucketInfo[]> {
    return []
  }

  @withContext('remove')
  async remove (ctx: MeasureContext, wsIds: WorkspaceIds, objectNames: string[]): Promise<void> {
    await Promise.all(
      objectNames.map(async (objectName) => {
        await this.retry(ctx, () => this.client.deleteObject(ctx, wsIds.uuid, objectName))
      })
    )
  }

  @withContext('delete')
  async delete (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<void> {
    // not supported, just do nothing and pretend we deleted the workspace
  }

  @withContext('listStream')
  async listStream (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<BlobStorageIterator> {
    let hasMore = true
    const buffer: ListBlobResult[] = []
    let cursor: string | undefined

    return {
      next: async () => {
        try {
          while (hasMore && buffer.length < 50) {
            const res = await this.retry(ctx, () => this.client.listObjects(ctx, wsIds.uuid, cursor, 10000))
            hasMore = res.cursor !== undefined
            cursor = res.cursor

            for (const blob of res.blobs) {
              buffer.push({
                _id: blob.name as Ref<Blob>,
                _class: core.class.Blob,
                etag: blob.etag,
                size: (typeof blob.size === 'string' ? parseInt(blob.size) : blob.size) ?? 0,
                provider: this.cfg.name,
                space: core.space.Configuration,
                modifiedBy: core.account.System,
                modifiedOn: 0,
                contentType: blob.contentType
              })
            }
          }
        } catch (err: any) {
          ctx.error('Failed to get list', { error: err, workspace: wsIds.uuid })
        }
        return buffer.splice(0, 50)
      },
      close: async () => {}
    }
  }

  @withContext('stat')
  async stat (ctx: MeasureContext, wsIds: WorkspaceIds, objectName: string): Promise<Blob | undefined> {
    const result = await this.retry(ctx, () => this.client.statObject(ctx, wsIds.uuid, objectName))
    if (result !== undefined) {
      return {
        provider: '',
        _class: core.class.Blob,
        _id: objectName as Ref<Blob>,
        contentType: result.type,
        size: result.size ?? 0,
        etag: result.etag ?? '',
        space: core.space.Configuration,
        modifiedBy: core.account.System,
        modifiedOn: result.lastModified,
        version: null
      }
    }
  }

  @withContext('get')
  async get (ctx: MeasureContext, wsIds: WorkspaceIds, objectName: string): Promise<Readable> {
    const object = await this.retry(ctx, () => this.client.getObject(ctx, wsIds.uuid, objectName))
    if (object === undefined) {
      throw new NotFoundError()
    }
    return object
  }

  @withContext('put')
  async put (
    ctx: MeasureContext,
    wsIds: WorkspaceIds,
    objectName: string,
    stream: Readable | Buffer | string,
    contentType: string,
    size?: number
  ): Promise<UploadedObjectInfo> {
    const params: UploadObjectParams = {
      lastModified: Date.now(),
      type: contentType,
      size
    }

    const { etag } = await ctx.with(
      'put',
      {},
      (ctx) => this.retry(ctx, () => this.client.putObject(ctx, wsIds.uuid, objectName, stream, params)),
      { workspace: wsIds.uuid, objectName }
    )

    return {
      etag,
      versionId: ''
    }
  }

  @withContext('read')
  async read (ctx: MeasureContext, wsIds: WorkspaceIds, objectName: string): Promise<Buffer[]> {
    const data = await this.retry(ctx, () => this.client.getObject(ctx, wsIds.uuid, objectName))
    if (data === undefined) {
      throw new NotFoundError()
    }

    const chunks: Buffer[] = []
    for await (const chunk of data) {
      chunks.push(chunk)
    }

    return chunks
  }

  @withContext('partial')
  async partial (
    ctx: MeasureContext,
    wsIds: WorkspaceIds,
    objectName: string,
    offset: number,
    length?: number
  ): Promise<Readable> {
    const object = await this.retry(ctx, () =>
      this.client.getPartialObject(ctx, wsIds.uuid, objectName, offset, length)
    )
    if (object === undefined) {
      throw new NotFoundError()
    }
    return object
  }

  async getUrl (ctx: MeasureContext, wsIds: WorkspaceIds, objectName: string): Promise<string> {
    return this.client.getObjectUrl(ctx, wsIds.uuid, objectName)
  }

  async retry<T>(ctx: MeasureContext, op: () => Promise<T>): Promise<T> {
    return await withRetry(ctx, this.retryCount, op, this.retryInterval)
  }
}

export function processConfigFromEnv (storageConfig: StorageConfiguration): string | undefined {
  const endpoint = process.env.DATALAKE_ENDPOINT
  if (endpoint === undefined) {
    return 'DATALAKE_ENDPOINT'
  }

  const config: DatalakeConfig = {
    kind: 'datalake',
    name: 'datalake',
    endpoint
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
      if (retries !== 0 && delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw error
}
