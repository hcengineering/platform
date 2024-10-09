import core, {
  DOMAIN_BLOB,
  groupByArray,
  toIdMap,
  withContext,
  type Blob,
  type MeasureContext,
  type Ref,
  type StorageIterator,
  type WorkspaceId
} from '@hcengineering/core'
import { type Readable } from 'stream'

import { getMetadata } from '@hcengineering/platform'
import {
  type BlobStorageIterator,
  type BucketInfo,
  type ListBlobResult,
  type StorageAdapter,
  type StorageAdapterEx,
  type UploadedObjectInfo
} from '@hcengineering/storage'

import { Analytics } from '@hcengineering/analytics'
import serverCore, {
  type RawDBAdapter,
  type StorageConfig,
  type StorageConfiguration
} from '@hcengineering/server-core'

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

  doTrimHash (s: string | undefined): string {
    if (s == null) {
      return ''
    }
    if (s.startsWith('"') && s.endsWith('"')) {
      return s.slice(1, s.length - 1)
    }
    return s
  }

  async doSyncDocs (ctx: MeasureContext, workspaceId: WorkspaceId, docs: ListBlobResult[]): Promise<void> {
    const existingBlobs = toIdMap(
      await this.dbAdapter.find<Blob>(ctx, workspaceId, DOMAIN_BLOB, { _id: { $in: docs.map((it) => it._id) } })
    )
    const toUpdate: Blob[] = []
    for (const d of docs) {
      const blobInfo = existingBlobs.get(d._id)
      if (
        blobInfo === undefined || // Blob info undefined
        // Provider are same and etag or size are diffrent.
        (d.provider === blobInfo.provider &&
          (this.doTrimHash(blobInfo.etag) !== this.doTrimHash(d.etag) || blobInfo.size !== d.size)) ||
        // We have replacement in default
        (d.provider === this.defaultAdapter && blobInfo?.provider !== d.provider)
      ) {
        const stat = await this.adapters.get(d.provider)?.stat(ctx, workspaceId, d._id)
        if (stat !== undefined) {
          stat.provider = d.provider
          toUpdate.push(stat)
        } else {
          ctx.error('blob not found for sync', { provider: d.provider, id: d._id, workspace: workspaceId.name })
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

    return {
      next: async () => {
        const docInfos = await storageIterator.next()
        if (docInfos.length > 0) {
          await this.doSyncDocs(ctx, workspaceId, docInfos)
        }

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
    const adapters = Array.from(this.adapters.entries())
    let provider: [string, StorageAdapter] | undefined
    let iterator: BlobStorageIterator | undefined
    return {
      next: async () => {
        while (true) {
          if (iterator === undefined && adapters.length > 0) {
            provider = adapters.shift() as [string, StorageAdapter]
            iterator = await provider[1].listStream(ctx, workspaceId)
          }
          if (iterator === undefined) {
            return []
          }
          const docInfos = await iterator.next()
          if (docInfos.length > 0) {
            for (const d of docInfos) {
              d.provider = provider?.[0] as string
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
    for (const [k, a] of this.adapters.entries()) {
      try {
        if (!(await a.exists(ctx, workspaceId))) {
          await a.make(ctx, workspaceId)
        }
      } catch (err: any) {
        ctx.error('failed to init adapter', { adapter: k, workspaceId, error: err })
        // Do not throw error in case default adapter is ok
        Analytics.handleError(err)
        if (k === this.defaultAdapter) {
          // We should throw in case default one is not valid
          throw err
        }
      }
    }
  }

  @withContext('aggregator-listBuckets', {})
  async listBuckets (ctx: MeasureContext): Promise<BucketInfo[]> {
    const result: BucketInfo[] = []
    for (const a of this.adapters.values()) {
      result.push(...(await a.listBuckets(ctx)))
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

  async listStream (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<BlobStorageIterator> {
    const data = await this.dbAdapter.findStream<Blob>(ctx, workspaceId, DOMAIN_BLOB, {})
    return {
      next: async (): Promise<ListBlobResult[]> => {
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
      throw new NoSuchKeyError(`No such provider found: ${provider}`)
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
    const stat = (
      await this.dbAdapter.find<Blob>(ctx, workspaceId, DOMAIN_BLOB, { _id: objectName as Ref<Blob> }, { limit: 1 })
    ).shift()

    const { provider, adapter } = this.selectProvider(undefined, contentType)

    const result = await adapter.put(ctx, workspaceId, objectName, stream, contentType, size)

    if (size === undefined || size === 0 || !Number.isInteger(size)) {
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

    // If the file is already stored in different provider, we need to remove it.
    if (stat !== undefined && stat.provider !== provider) {
      // TODO temporary not needed
      // const adapter = this.adapters.get(stat.provider)
      // await adapter?.remove(ctx, workspaceId, [stat._id])
    }

    return result
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
  dbAdapter: RawDBAdapter,
  storageFactory: (config: StorageConfig) => StorageAdapter
): AggregatorStorageAdapter {
  const adapters = new Map<string, StorageAdapter>()
  for (const c of config.storages) {
    adapters.set(c.name, storageFactory(c))
  }
  return new AggregatorStorageAdapter(adapters, config.default, dbAdapter)
}
