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
  type Timestamp,
  type WorkspaceIds,
  systemAccountUuid,
  withContext
} from '@hcengineering/core'
import { type HulylakeClient, type PutOptions, getClient } from '@hcengineering/hulylake-client'
import { getMetadata } from '@hcengineering/platform'
import {
  type BlobStorageIterator,
  type BucketInfo,
  type StorageAdapter,
  type StorageConfig,
  type StorageConfiguration,
  type UploadedObjectInfo
} from '@hcengineering/server-core'
import serverToken, { generateToken } from '@hcengineering/server-token'
import { Readable } from 'stream'
import { NotFoundError } from './error'

/**
 * @public
 */
export interface HulylakeConfig extends StorageConfig {
  kind: 'hulylake'
}

/**
 * @public
 */
export function createHulylakeClient (cfg: HulylakeConfig, token: string): HulylakeClient {
  const endpoint = Number.isInteger(cfg.port) ? `${cfg.endpoint}:${cfg.port}` : cfg.endpoint
  return getClient(endpoint, token)
}

export const CONFIG_KIND = 'hulylake'

/**
 * @public
 */
export interface HulylakeClientOptions {
  retryCount?: number
  retryInterval?: number
}

/**
 * @public
 */
export class HulylakeService implements StorageAdapter {
  private readonly client: HulylakeClient
  private readonly retryCount: number
  private readonly retryInterval: number

  constructor (
    readonly cfg: HulylakeConfig,
    readonly options: HulylakeClientOptions = {}
  ) {
    const secret = getMetadata(serverToken.metadata.Secret)
    if (secret === undefined) {
      console.warn('Server secret not set, hulylake storage adapter initialized with default secret')
    }
    const token = generateToken(systemAccountUuid, undefined)
    this.client = createHulylakeClient(cfg, token)
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
        await this.client.delete(wsIds.uuid, objectName)
      })
    )
  }

  @withContext('delete')
  async delete (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<void> {
    // not supported, just do nothing and pretend we deleted the workspace
  }

  @withContext('listStream')
  async listStream (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<BlobStorageIterator> {
    throw new Error('not implemented')
  }

  @withContext('stat')
  async stat (ctx: MeasureContext, wsIds: WorkspaceIds, objectName: string): Promise<Blob | undefined> {
    const result = await this.client.head(wsIds.uuid, objectName)
    if (result.ok) {
      return {
        provider: '',
        _class: core.class.Blob,
        _id: objectName as Ref<Blob>,
        contentType: result.contentType ?? 'application/octet-stream',
        size: result.contentLength ?? 0,
        etag: result.etag ?? '',
        space: core.space.Configuration,
        modifiedBy: core.account.System,
        modifiedOn: result.lastModified as Timestamp,
        version: null
      }
    }
  }

  @withContext('get')
  async get (ctx: MeasureContext, wsIds: WorkspaceIds, objectName: string): Promise<Readable> {
    const res = await this.client.get(wsIds.uuid, objectName)
    if (res?.body === undefined) {
      throw new NotFoundError()
    }

    return fromFetchBody(res.body)
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
    size = size ?? (typeof stream === 'string' ? Buffer.byteLength(stream) : undefined)
    const body = toFetchBody(stream)

    if (size === undefined) {
      throw new Error('Size must be specified for string or stream body')
    }

    const params: PutOptions = {
      contentLength: size,
      contentType
    }

    const { etag } = await ctx.with('put', {}, (ctx) => this.client.put(wsIds.uuid, objectName, body, params), {
      workspace: wsIds.uuid,
      objectName
    })

    return {
      etag: etag ?? '',
      versionId: ''
    }
  }

  @withContext('read')
  async read (ctx: MeasureContext, wsIds: WorkspaceIds, objectName: string): Promise<Buffer[]> {
    const res = await this.client.get(wsIds.uuid, objectName)
    if (res?.body === undefined) {
      throw new NotFoundError()
    }

    const body = fromFetchBody(res.body)

    const chunks: Buffer[] = []
    for await (const chunk of body) {
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
    const res = await this.client.partial(wsIds.uuid, objectName, offset, length)
    if (res?.body === undefined) {
      throw new NotFoundError()
    }

    return fromFetchBody(res.body)
  }

  async getUrl (ctx: MeasureContext, wsIds: WorkspaceIds, objectName: string): Promise<string> {
    return this.client.objectUrl(wsIds.uuid, objectName)
  }
}

export function processConfigFromEnv (storageConfig: StorageConfiguration): string | undefined {
  const endpoint = process.env.HULYLAKE_ENDPOINT
  if (endpoint === undefined) {
    return 'HULYLAKE_ENDPOINT'
  }

  const config: HulylakeConfig = {
    kind: 'hulylake',
    name: 'hulylake',
    endpoint
  }

  storageConfig.storages.push(config)
  storageConfig.default = 'hulylake'
}

function toFetchBody (body: Readable | Buffer | string): ReadableStream | ArrayBuffer | string {
  if (typeof body === 'string') {
    return body
  } else if (Buffer.isBuffer(body)) {
    return new Uint8Array(body).buffer
  } else {
    return Readable.toWeb(body) as ReadableStream
  }
}

function fromFetchBody (body: ReadableStream | ArrayBuffer | string): Readable {
  if (typeof body === 'string') {
    return Readable.from(body)
  } else if (body instanceof ArrayBuffer) {
    return Readable.from(Buffer.from(body))
  } else {
    return Readable.fromWeb(body as any)
  }
}
