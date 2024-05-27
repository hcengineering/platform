import core, {
  DOMAIN_BLOB,
  groupByArray,
  type Blob,
  type BlobLookup,
  type MeasureContext,
  type Ref,
  type WorkspaceId,
  type WorkspaceIdWithUrl
} from '@hcengineering/core'
import { type Readable } from 'stream'
import { type RawDBAdapter } from '../adapter'

import {
  type BlobLookupResult,
  type BlobStorageIterator,
  type BucketInfo,
  type ListBlobResult,
  type StorageAdapter,
  type StorageAdapterEx,
  type UploadedObjectInfo
} from '@hcengineering/storage'
import { type StorageConfig, type StorageConfiguration } from '../types'

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
export class AggregatorStorageAdapter implements StorageAdapter, StorageAdapterEx {
  constructor (
    readonly adapters: Map<string, StorageAdapter>,
    readonly defaultAdapter: string, // Adapter will be used to put new documents into
    readonly dbAdapter: RawDBAdapter
  ) {}

  async syncBlobFromStorage (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string): Promise<void> {
    const current = await this.dbAdapter.find<Blob>(
      ctx,
      workspaceId,
      DOMAIN_BLOB,
      { _class: core.class.Blob, _id: objectName as Ref<Blob> },
      { limit: 1 }
    )
    const provider = this.adapters.get(current[0]?.provider ?? this.defaultAdapter)
    if (provider === undefined) {
      throw new NoSuchKeyError('No such provider found')
    }
    const stat = await provider.stat(ctx, workspaceId, objectName)
    if (stat !== undefined) {
      stat.provider = current[0]?.provider ?? this.defaultAdapter
      if (current[0] !== undefined) {
        await this.dbAdapter.clean(ctx, workspaceId, DOMAIN_BLOB, [current[0]._id])
      }
      await this.dbAdapter.upload<Blob>(ctx, workspaceId, DOMAIN_BLOB, [stat])
    }
  }

  async initialize (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {
    // We need to initialize internal table if it miss documents.
  }

  async close (): Promise<void> {
    for (const a of this.adapters.values()) {
      await a.close()
    }
    await this.dbAdapter.close()
  }

  async exists (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<boolean> {
    for (const a of this.adapters.values()) {
      if (!(await a.exists(ctx, workspaceId))) {
        return false
      }
    }
    return true
  }

  async make (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {
    for (const a of this.adapters.values()) {
      if (!(await a.exists(ctx, workspaceId))) {
        await a.make(ctx, workspaceId)
      }
    }
  }

  async listBuckets (ctx: MeasureContext, productId: string): Promise<BucketInfo[]> {
    const result: BucketInfo[] = []
    for (const a of this.adapters.values()) {
      result.push(...(await a.listBuckets(ctx, productId)))
    }
    return result
  }

  async delete (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {
    for (const a of this.adapters.values()) {
      if (await a.exists(ctx, workspaceId)) {
        await a.delete(ctx, workspaceId)
      }
    }
  }

  async remove (ctx: MeasureContext, workspaceId: WorkspaceId, objectNames: string[]): Promise<void> {
    const docs = await this.dbAdapter.find<Blob>(ctx, workspaceId, DOMAIN_BLOB, {
      _class: core.class.Blob,
      _id: { $in: objectNames as Ref<Blob>[] }
    })

    // Group by provider and delegate into it.
    const byProvider = groupByArray(docs, (item) => item.provider)
    for (const [k, docs] of byProvider) {
      const adapter = this.adapters.get(k)
      if (adapter !== undefined) {
        await adapter.remove(
          ctx,
          workspaceId,
          docs.map((it) => it._id)
        )
      }
    }
    await this.dbAdapter.clean(ctx, workspaceId, DOMAIN_BLOB, objectNames as Ref<Blob>[])
  }

  async listStream (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    prefix?: string | undefined
  ): Promise<BlobStorageIterator> {
    const data = await this.dbAdapter.findStream<Blob>(ctx, workspaceId, DOMAIN_BLOB, {
      _class: core.class.Blob,
      _id: { $regex: `${prefix ?? ''}.*` }
    })
    return {
      next: async (): Promise<ListBlobResult | undefined> => {
        return await data.next()
      },
      close: async () => {
        await data.close()
      }
    }
  }

  async stat (ctx: MeasureContext, workspaceId: WorkspaceId, name: string): Promise<Blob | undefined> {
    const result = await this.dbAdapter.find<Blob>(
      ctx,
      workspaceId,
      DOMAIN_BLOB,
      { _class: core.class.Blob, _id: name as Ref<Blob> },
      { limit: 1 }
    )
    return result.shift()
  }

  async get (ctx: MeasureContext, workspaceId: WorkspaceId, name: string): Promise<Readable> {
    const { provider, stat } = await this.findProvider(workspaceId, ctx, name)
    return await provider.get(ctx, workspaceId, stat.storageId)
  }

  private async findProvider (
    workspaceId: WorkspaceId,
    ctx: MeasureContext,
    objectName: string
  ): Promise<{ provider: StorageAdapter, stat: Blob }> {
    const stat = (
      await this.dbAdapter.find<Blob>(
        ctx,
        workspaceId,
        DOMAIN_BLOB,
        { _class: core.class.Blob, _id: objectName as Ref<Blob> },
        { limit: 1 }
      )
    ).shift()
    if (stat === undefined) {
      throw new NoSuchKeyError(`No such object found ${objectName}`)
    }
    const provider = this.adapters.get(stat.provider)
    if (provider === undefined) {
      throw new NoSuchKeyError('No such provider found')
    }
    return { provider, stat }
  }

  async partial (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    offset: number,
    length?: number | undefined
  ): Promise<Readable> {
    const { provider, stat } = await this.findProvider(workspaceId, ctx, objectName)
    return await provider.partial(ctx, workspaceId, stat.storageId, offset, length)
  }

  async read (ctx: MeasureContext, workspaceId: WorkspaceId, name: string): Promise<Buffer[]> {
    const { provider, stat } = await this.findProvider(workspaceId, ctx, name)
    return await provider.read(ctx, workspaceId, stat.storageId)
  }

  async put (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    stream: string | Readable | Buffer,
    contentType: string,
    size?: number | undefined
  ): Promise<UploadedObjectInfo> {
    const provider = this.adapters.get(this.defaultAdapter)
    if (provider === undefined) {
      throw new NoSuchKeyError('No such provider found')
    }

    const result = await provider.put(ctx, workspaceId, objectName, stream, contentType, size)

    if (size === undefined || size === 0) {
      const docStats = await provider.stat(ctx, workspaceId, objectName)
      if (docStats !== undefined) {
        if (contentType !== docStats.contentType) {
          contentType = docStats.contentType
        }
        size = docStats.size
      }
    }

    const blobDoc: Blob = {
      _class: core.class.Blob,
      _id: objectName as Ref<Blob>,
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      space: core.space.Configuration,
      provider: this.defaultAdapter,
      storageId: objectName,
      size: size ?? 0,
      contentType,
      etag: result.etag,
      version: result.versionId ?? null
    }

    await this.dbAdapter.upload<Blob>(ctx, workspaceId, DOMAIN_BLOB, [blobDoc])
    return result
  }

  async lookup (ctx: MeasureContext, workspaceId: WorkspaceIdWithUrl, docs: Blob[]): Promise<BlobLookupResult> {
    const result: BlobLookup[] = []

    const byProvider = groupByArray(docs, (it) => it.provider)
    for (const [k, v] of byProvider.entries()) {
      const provider = this.adapters.get(k)
      if (provider?.lookup !== undefined) {
        const upd = await provider.lookup(ctx, workspaceId, v)
        if (upd.updates !== undefined) {
          await this.dbAdapter.update(ctx, workspaceId, DOMAIN_BLOB, upd.updates)
        }
        result.push(...upd.lookups)
      }
    }
    // Check if we need to perform diff update for blobs

    return { lookups: result }
  }
}

/**
 * @public
 */
export function buildStorage (
  config: StorageConfiguration,
  dbAdapter: RawDBAdapter,
  storageFactory: (kind: string, config: StorageConfig) => StorageAdapter
): AggregatorStorageAdapter {
  const adapters = new Map<string, StorageAdapter>()
  for (const c of config.storages) {
    adapters.set(c.name, storageFactory(c.kind, c))
  }
  return new AggregatorStorageAdapter(adapters, config.default, dbAdapter)
}
