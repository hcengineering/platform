import core, {
  DOMAIN_BLOB,
  groupByArray,
  toIdMap,
  withContext,
  type Blob,
  type BlobLookup,
  type Branding,
  type MeasureContext,
  type Ref,
  type StorageIterator,
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
    readonly defaultAdapter: string, // Adapter will be used to put new documents into, if not matched by content type
    readonly dbAdapter: RawDBAdapter
  ) {}

  async syncBlobFromStorage (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    providerId?: string
  ): Promise<void> {
    let current: Blob | undefined = (
      await this.dbAdapter.find<Blob>(ctx, workspaceId, DOMAIN_BLOB, { _id: objectName as Ref<Blob> }, { limit: 1 })
    ).shift()
    if (current === undefined && providerId !== undefined) {
      current = await this.adapters.get(providerId)?.stat(ctx, workspaceId, objectName)
      if (current !== undefined) {
        current.provider = providerId
      }
    }

    const provider = this.adapters.get(current?.provider ?? this.defaultAdapter)
    if (provider === undefined) {
      throw new NoSuchKeyError('No such provider found')
    }
    const stat = await provider.stat(ctx, workspaceId, objectName)
    if (stat !== undefined) {
      stat.provider = current?.provider ?? this.defaultAdapter
      if (current !== undefined) {
        await this.dbAdapter.clean(ctx, workspaceId, DOMAIN_BLOB, [current._id])
      }
      await this.dbAdapter.upload<Blob>(ctx, workspaceId, DOMAIN_BLOB, [stat])
      // TODO:  We need to send notification about Blob is changed.
    }
  }

  async initialize (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {}

  async doSyncDocs (ctx: MeasureContext, workspaceId: WorkspaceId, docs: ListBlobResult[]): Promise<void> {
    const existingBlobs = toIdMap(
      await this.dbAdapter.find<Blob>(ctx, workspaceId, DOMAIN_BLOB, { _id: { $in: docs.map((it) => it._id) } })
    )
    const toUpdate: Blob[] = []
    for (const d of docs) {
      const blobInfo = existingBlobs.get(d._id)
      if (blobInfo === undefined || blobInfo.etag !== d.etag || blobInfo.size !== d.size) {
        const stat = await this.stat(ctx, workspaceId, d._id)
        if (stat !== undefined) {
          toUpdate.push(stat)
        }
      }
    }
    if (toUpdate.length > 0) {
      await this.dbAdapter.clean(ctx, workspaceId, DOMAIN_BLOB, Array.from(toUpdate.map((it) => it._id)))
      await this.dbAdapter.upload(ctx, workspaceId, DOMAIN_BLOB, toUpdate)
    }
  }

  find (ctx: MeasureContext, workspaceId: WorkspaceId): StorageIterator {
    const storageIterator = this.makeStorageIterator(ctx, workspaceId)

    let buffer: ListBlobResult[] = []

    return {
      next: async (ctx) => {
        const docInfo = await storageIterator.next()
        if (docInfo !== undefined) {
          buffer.push(docInfo)
        }
        if (buffer.length > 50) {
          await this.doSyncDocs(ctx, workspaceId, buffer)

          buffer = []
        }
        if (docInfo !== undefined) {
          return {
            hash: docInfo.etag,
            id: docInfo._id,
            size: docInfo.size
          }
        }
      },
      close: async (ctx) => {
        if (buffer.length > 0) {
          await this.doSyncDocs(ctx, workspaceId, buffer)
        }
        await storageIterator.close()
      }
    }
  }

  private makeStorageIterator (ctx: MeasureContext, workspaceId: WorkspaceId): BlobStorageIterator {
    const adapters = Array.from(this.adapters.values())
    let iterator: BlobStorageIterator | undefined
    return {
      next: async () => {
        while (true) {
          if (iterator === undefined && adapters.length > 0) {
            iterator = await (adapters.shift() as StorageAdapter).listStream(ctx, workspaceId)
          }
          if (iterator === undefined) {
            return undefined
          }
          const docInfo = await iterator.next()
          if (docInfo !== undefined) {
            // We need to check if our stored version is fine
            return docInfo
          } else {
            // We need to take next adapter
            await iterator.close()
            iterator = undefined
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

  @withContext('aggregator-make', {})
  async make (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {
    for (const a of this.adapters.values()) {
      if (!(await a.exists(ctx, workspaceId))) {
        await a.make(ctx, workspaceId)
      }
    }
  }

  @withContext('aggregator-listBuckets', {})
  async listBuckets (ctx: MeasureContext, productId: string): Promise<BucketInfo[]> {
    const result: BucketInfo[] = []
    for (const a of this.adapters.values()) {
      result.push(...(await a.listBuckets(ctx, productId)))
    }
    return result
  }

  @withContext('aggregator-delete', {})
  async delete (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {
    for (const a of this.adapters.values()) {
      if (await a.exists(ctx, workspaceId)) {
        await a.delete(ctx, workspaceId)
      }
    }
  }

  @withContext('aggregator-remove', {})
  async remove (ctx: MeasureContext, workspaceId: WorkspaceId, objectNames: string[]): Promise<void> {
    const docs = await this.dbAdapter.find<Blob>(ctx, workspaceId, DOMAIN_BLOB, {
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

  @withContext('aggregator-stat', {})
  async stat (ctx: MeasureContext, workspaceId: WorkspaceId, name: string): Promise<Blob | undefined> {
    const result = await this.dbAdapter.find<Blob>(
      ctx,
      workspaceId,
      DOMAIN_BLOB,
      { _id: name as Ref<Blob> },
      { limit: 1 }
    )
    return result.shift()
  }

  @withContext('aggregator-get', {})
  async get (ctx: MeasureContext, workspaceId: WorkspaceId, name: string): Promise<Readable> {
    const { provider, stat } = await this.findProvider(ctx, workspaceId, name)
    return await provider.get(ctx, workspaceId, stat.storageId)
  }

  @withContext('find-provider', {})
  private async findProvider (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string
  ): Promise<{ provider: StorageAdapter, stat: Blob }> {
    const stat = (
      await this.dbAdapter.find<Blob>(ctx, workspaceId, DOMAIN_BLOB, { _id: objectName as Ref<Blob> }, { limit: 1 })
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

  @withContext('aggregator-partial', {})
  async partial (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    offset: number,
    length?: number | undefined
  ): Promise<Readable> {
    const { provider, stat } = await this.findProvider(ctx, workspaceId, objectName)
    return await provider.partial(ctx, workspaceId, stat.storageId, offset, length)
  }

  @withContext('aggregator-read', {})
  async read (ctx: MeasureContext, workspaceId: WorkspaceId, name: string): Promise<Buffer[]> {
    const { provider, stat } = await this.findProvider(ctx, workspaceId, name)
    return await provider.read(ctx, workspaceId, stat.storageId)
  }

  selectProvider (
    forceProvider: string | undefined,
    contentType: string
  ): { adapter: StorageAdapter, provider: string } {
    if (forceProvider !== undefined) {
      return {
        adapter: this.adapters.get(forceProvider) ?? (this.adapters.get(this.defaultAdapter) as StorageAdapter),
        provider: forceProvider
      }
    }
    // try select provider based on content type matching.
    for (const [provider, adapter] of this.adapters.entries()) {
      if (adapter.contentTypes === undefined) {
        continue
      }
      if (adapter.contentTypes.some((it) => contentType.includes(it))) {
        // we have matched content type for adapter.
        return { adapter, provider }
      }
    }

    return { adapter: this.adapters.get(this.defaultAdapter) as StorageAdapter, provider: this.defaultAdapter }
  }

  @withContext('aggregator-put', {})
  async put (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    stream: string | Readable | Buffer,
    contentType: string,
    size?: number | undefined
  ): Promise<UploadedObjectInfo> {
    // We need to reuse same provider for existing documents.
    const stat = (
      await this.dbAdapter.find<Blob>(ctx, workspaceId, DOMAIN_BLOB, { _id: objectName as Ref<Blob> }, { limit: 1 })
    ).shift()

    const { provider, adapter } = this.selectProvider(stat?.provider, contentType)

    const result = await adapter.put(ctx, workspaceId, objectName, stream, contentType, size)

    if (size === undefined || size === 0) {
      const docStats = await adapter.stat(ctx, workspaceId, objectName)
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
      provider,
      storageId: objectName,
      size: size ?? 0,
      contentType,
      etag: result.etag,
      version: result.versionId ?? null
    }

    await this.dbAdapter.upload<Blob>(ctx, workspaceId, DOMAIN_BLOB, [blobDoc])
    return result
  }

  @withContext('aggregator-lookup', {})
  async lookup (
    ctx: MeasureContext,
    workspaceId: WorkspaceIdWithUrl,
    branding: Branding | null,
    docs: Blob[]
  ): Promise<BlobLookupResult> {
    const result: BlobLookup[] = []

    const byProvider = groupByArray(docs, (it) => it.provider)
    for (const [k, v] of byProvider.entries()) {
      const provider = this.adapters.get(k)
      if (provider?.lookup !== undefined) {
        const upd = await provider.lookup(ctx, workspaceId, branding, v)
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
