import {
  withContext,
  type WorkspaceIds,
  type Blob,
  type MeasureContext,
  type StorageIterator
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
import serverCore, { getDataId, type StorageConfig, type StorageConfiguration } from '@hcengineering/server-core'

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

  async initialize (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<void> {}

  doTrimHash (s: string | undefined): string {
    if (s == null) {
      return ''
    }
    if (s.startsWith('"') && s.endsWith('"')) {
      return s.slice(1, s.length - 1)
    }
    return s
  }

  find (ctx: MeasureContext, wsIds: WorkspaceIds): StorageIterator {
    const storageIterator = this.makeStorageIterator(ctx, wsIds)

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

  private makeStorageIterator (ctx: MeasureContext, wsIds: WorkspaceIds): BlobStorageIterator {
    // We need to reverse, since we need to iterate on latest document last
    const adapters = [...this.adapters].reverse()
    let provider: NamedStorageAdapter | undefined
    let iterator: BlobStorageIterator | undefined
    return {
      next: async () => {
        while (true) {
          if (iterator === undefined && adapters.length > 0) {
            provider = adapters.shift() as NamedStorageAdapter
            iterator = await provider.adapter.listStream(ctx, wsIds)
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

  async exists (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<boolean> {
    for (const { adapter } of this.adapters) {
      if (!(await adapter.exists(ctx, wsIds))) {
        return false
      }
    }
    return true
  }

  @withContext('aggregator-make', {})
  async make (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<void> {
    for (const { name, adapter } of this.adapters) {
      try {
        if (!(await adapter.exists(ctx, wsIds))) {
          await adapter.make(ctx, wsIds)
        }
      } catch (err: any) {
        ctx.error('failed to init adapter', { adapter: name, wsIds, error: err })
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

  @withContext('fallback-delete', {})
  async delete (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<void> {
    for (const { adapter } of this.adapters) {
      if (await adapter.exists(ctx, wsIds)) {
        await adapter.delete(ctx, wsIds)
      }
    }
  }

  @withContext('fallback-remove', {})
  async remove (ctx: MeasureContext, wsIds: WorkspaceIds, objectNames: string[]): Promise<void> {
    // Group by provider and delegate into it.
    for (const { adapter } of this.adapters) {
      await adapter.remove(ctx, wsIds, objectNames)
    }
  }

  async listStream (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<BlobStorageIterator> {
    const storageIterator = this.makeStorageIterator(ctx, wsIds)
    return {
      next: async (): Promise<ListBlobResult[]> => {
        return await storageIterator.next()
      },
      close: async () => {
        await storageIterator.close()
      }
    }
  }

  @withContext('fallback-stat', {})
  async stat (ctx: MeasureContext, wsIds: WorkspaceIds, objectName: string): Promise<Blob | undefined> {
    for (const { name, adapter } of this.adapters) {
      const stat = await adapter.stat(ctx, wsIds, objectName)
      if (stat !== undefined) {
        stat.provider = name
        return stat
      }
    }
  }

  @withContext('fallback-get', {})
  async get (ctx: MeasureContext, wsIds: WorkspaceIds, objectName: string): Promise<Readable> {
    for (const { adapter } of this.adapters) {
      try {
        return await adapter.get(ctx, wsIds, objectName)
      } catch (err: any) {
        // ignore
      }
    }
    throw new NoSuchKeyError(`uuid=${wsIds.uuid} dataId=${wsIds.dataId} missing ${objectName}`)
  }

  @withContext('fallback-partial', {})
  async partial (
    ctx: MeasureContext,
    wsIds: WorkspaceIds,
    objectName: string,
    offset: number,
    length?: number | undefined
  ): Promise<Readable> {
    for (const { adapter } of this.adapters) {
      try {
        return await adapter.partial(ctx, wsIds, objectName, offset, length)
      } catch (err: any) {
        // ignore
      }
    }
    throw new NoSuchKeyError(`uuid=${wsIds.uuid} dataId=${wsIds.dataId} missing ${objectName}`)
  }

  @withContext('fallback-read', {})
  async read (ctx: MeasureContext, wsIds: WorkspaceIds, objectName: string): Promise<Buffer> {
    for (const { adapter } of this.adapters) {
      try {
        return await adapter.read(ctx, wsIds, objectName)
      } catch (err: any) {
        // Ignore
      }
    }
    throw new NoSuchKeyError(`uuid=${wsIds.uuid} dataId=${wsIds.dataId} missing ${objectName}`)
  }

  @withContext('aggregator-put', {})
  put (
    ctx: MeasureContext,
    wsIds: WorkspaceIds,
    objectName: string,
    stream: string | Readable | Buffer,
    contentType: string,
    size?: number | undefined
  ): Promise<UploadedObjectInfo> {
    const adapter = this.adapters[0].adapter
    // Remove in other storages, if appicable
    return adapter.put(ctx, wsIds, objectName, stream, contentType, size)
  }

  @withContext('aggregator-getUrl', {})
  async getUrl (ctx: MeasureContext, wsIds: WorkspaceIds, name: string): Promise<string> {
    // const { provider, stat } = await this.findProvider(ctx, wsIds, name)
    // return await provider.getUrl(ctx, wsIds, stat.storageId)
    const filesUrl = getMetadata(serverCore.metadata.FilesUrl) ?? ''
    return filesUrl.replaceAll(':workspace', getDataId(wsIds)).replaceAll(':blobId', name)
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
