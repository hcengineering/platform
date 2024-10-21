import {
  withContext,
  type Blob,
  type MeasureContext,
  type StorageIterator,
  type WorkspaceId
} from '@hcengineering/core'
import { type Readable } from 'stream'

import { getMetadata } from '@hcengineering/platform'
import {
  type BlobStorageIterator,
  type BucketInfo,
  type ListBlobResult,
  type NamedStorageAdapter,
  type StorageAdapter,
  type StorageAdapterEx,
  type UploadedObjectInfo
} from '@hcengineering/storage'

import { Analytics } from '@hcengineering/analytics'
import serverCore, { type StorageConfig, type StorageConfiguration } from '@hcengineering/server-core'

class NoSuchKeyError extends Error {
  code: string
  constructor (msg: string) {
    super(msg)
    this.code = 'NoSuchKey'
  }
}

/**
 * Perform operations on storage adapter and map required information into BinaryDocument into provided DbAdapter storage.
 */
export class FallbackStorageAdapter implements StorageAdapter, StorageAdapterEx {
  // Adapters should be in reverse order, first one is target one, and next ones are for fallback
  constructor (readonly adapters: NamedStorageAdapter[]) {}

  async initialize (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {}

  doTrimHash (s: string | undefined): string {
    if (s == null) {
      return ''
    }
    if (s.startsWith('"') && s.endsWith('"')) {
      return s.slice(1, s.length - 1)
    }
    return s
  }

  find (ctx: MeasureContext, workspaceId: WorkspaceId): StorageIterator {
    const storageIterator = this.makeStorageIterator(ctx, workspaceId)

    return {
      next: async () => {
        const docInfos = await storageIterator.next()

        return docInfos.map((it) => ({
          hash: it.etag,
          id: it._id,
          size: it.size
        }))
      },
      close: async (ctx) => {
        await storageIterator.close()
      }
    }
  }

  private makeStorageIterator (ctx: MeasureContext, workspaceId: WorkspaceId): BlobStorageIterator {
    // We need to reverse, since we need to iterate on latest document last
    const adapters = [...this.adapters].reverse()
    let provider: NamedStorageAdapter | undefined
    let iterator: BlobStorageIterator | undefined
    return {
      next: async () => {
        while (true) {
          if (iterator === undefined && adapters.length > 0) {
            provider = adapters.shift() as NamedStorageAdapter
            iterator = await provider.adapter.listStream(ctx, workspaceId)
          }
          if (iterator === undefined) {
            return []
          }
          const docInfos = await iterator.next()
          if (docInfos.length > 0) {
            for (const d of docInfos) {
              d.provider = provider?.name as string
            }
            // We need to check if our stored version is fine
            return docInfos
          } else {
            // We need to take next adapter
            await iterator.close()
            iterator = undefined
            continue
          }
        }
      },
      close: async () => {
        if (iterator !== undefined) {
          await iterator.close()
        }
      }
    }
  }

  async close (): Promise<void> {
    for (const { adapter } of this.adapters) {
      await adapter.close()
    }
  }

  async exists (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<boolean> {
    for (const { adapter } of this.adapters) {
      if (!(await adapter.exists(ctx, workspaceId))) {
        return false
      }
    }
    return true
  }

  @withContext('aggregator-make', {})
  async make (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {
    for (const { name, adapter } of this.adapters) {
      try {
        if (!(await adapter.exists(ctx, workspaceId))) {
          await adapter.make(ctx, workspaceId)
        }
      } catch (err: any) {
        ctx.error('failed to init adapter', { adapter: name, workspaceId, error: err })
        // Do not throw error in case default adapter is ok
        Analytics.handleError(err)
      }
    }
  }

  @withContext('aggregator-listBuckets', {})
  async listBuckets (ctx: MeasureContext): Promise<BucketInfo[]> {
    const result: BucketInfo[] = []
    for (const { adapter } of this.adapters) {
      result.push(...(await adapter.listBuckets(ctx)))
    }
    return result
  }

  @withContext('aggregator-delete', {})
  async delete (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {
    for (const { adapter } of this.adapters) {
      if (await adapter.exists(ctx, workspaceId)) {
        await adapter.delete(ctx, workspaceId)
      }
    }
  }

  @withContext('aggregator-remove', {})
  async remove (ctx: MeasureContext, workspaceId: WorkspaceId, objectNames: string[]): Promise<void> {
    // Group by provider and delegate into it.
    for (const { adapter } of this.adapters) {
      await adapter.remove(ctx, workspaceId, objectNames)
    }
  }

  async listStream (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<BlobStorageIterator> {
    const storageIterator = this.makeStorageIterator(ctx, workspaceId)
    return {
      next: async (): Promise<ListBlobResult[]> => {
        return await storageIterator.next()
      },
      close: async () => {
        await storageIterator.close()
      }
    }
  }

  @withContext('aggregator-stat', {})
  async stat (ctx: MeasureContext, workspaceId: WorkspaceId, name: string): Promise<Blob | undefined> {
    const result = await this.findProvider(ctx, workspaceId, name)
    if (result !== undefined) {
      result.stat.provider = result.name
    }
    return result?.stat
  }

  @withContext('aggregator-get', {})
  async get (ctx: MeasureContext, workspaceId: WorkspaceId, name: string): Promise<Readable> {
    const result = await this.findProvider(ctx, workspaceId, name)
    if (result === undefined) {
      throw new NoSuchKeyError(`${workspaceId.name} missing ${name}`)
    }
    return await result.adapter.get(ctx, workspaceId, result.stat._id)
  }

  @withContext('find-provider', {})
  private async findProvider (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string
  ): Promise<{ name: string, adapter: StorageAdapter, stat: Blob } | undefined> {
    // Group by provider and delegate into it.
    for (const { name, adapter } of this.adapters) {
      const stat = await adapter.stat(ctx, workspaceId, objectName)
      if (stat !== undefined) {
        return { name, adapter, stat }
      }
    }
  }

  @withContext('aggregator-partial', {})
  async partial (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    offset: number,
    length?: number | undefined
  ): Promise<Readable> {
    const result = await this.findProvider(ctx, workspaceId, objectName)
    if (result === undefined) {
      throw new NoSuchKeyError(`${workspaceId.name} missing ${objectName}`)
    }
    return await result.adapter.partial(ctx, workspaceId, result.stat._id, offset, length)
  }

  @withContext('aggregator-read', {})
  async read (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string): Promise<Buffer[]> {
    const result = await this.findProvider(ctx, workspaceId, objectName)
    if (result === undefined) {
      throw new NoSuchKeyError(`${workspaceId.name} missing ${objectName}`)
    }
    return await result.adapter.read(ctx, workspaceId, result.stat._id)
  }

  @withContext('aggregator-put', {})
  put (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    stream: string | Readable | Buffer,
    contentType: string,
    size?: number | undefined
  ): Promise<UploadedObjectInfo> {
    const adapter = this.adapters[0].adapter
    // Remove in other storages, if appicable
    return adapter.put(ctx, workspaceId, objectName, stream, contentType, size)
  }

  @withContext('aggregator-getUrl', {})
  async getUrl (ctx: MeasureContext, workspaceId: WorkspaceId, name: string): Promise<string> {
    // const { provider, stat } = await this.findProvider(ctx, workspaceId, name)
    // return await provider.getUrl(ctx, workspaceId, stat.storageId)
    const filesUrl = getMetadata(serverCore.metadata.FilesUrl) ?? ''
    return filesUrl.replaceAll(':workspace', workspaceId.name).replaceAll(':blobId', name)
  }
}

/**
 * @public
 */
export function buildStorage (
  config: StorageConfiguration,
  storageFactory: (config: StorageConfig) => StorageAdapter
): FallbackStorageAdapter {
  const adapters: NamedStorageAdapter[] = []
  for (const c of config.storages) {
    adapters.push({ name: c.name, adapter: storageFactory(c) })
  }
  // Reverse adapter's so latest one will be target one.
  return new FallbackStorageAdapter(adapters.reverse())
}
