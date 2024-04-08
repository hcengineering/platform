import core, {
  DOMAIN_BLOB_DATA,
  generateId,
  groupByArray,
  type Blob,
  type MeasureContext,
  type Ref,
  type WorkspaceId
} from '@hcengineering/core'
import { type Readable } from 'stream'
import { type RawDBAdapter } from '../adapter'
import { type ListBlobResult, type StorageAdapter, type UploadedObjectInfo } from '../storage'

import { v4 as uuid } from 'uuid'
import { type StorageConfig, type StorageConfiguration } from '../types'

/**
 * Perform operations on storage adapter and map required information into BinaryDocument into provided DbAdapter storage.
 */
export class AggregatorStorageAdapter implements StorageAdapter {
  constructor (
    readonly adapters: Map<string, StorageAdapter>,
    readonly defaultAdapter: string, // Adapter will be used to put new documents into
    readonly dbAdapter: RawDBAdapter
  ) {}

  async initialize (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {
    // We need to initialize internal table if it miss documents.
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

  async delete (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {
    for (const a of this.adapters.values()) {
      if (await a.exists(ctx, workspaceId)) {
        await a.delete(ctx, workspaceId)
      }
    }
  }

  async remove (ctx: MeasureContext, workspaceId: WorkspaceId, objectNames: string[]): Promise<void> {
    const docs = await this.dbAdapter.find<Blob>(ctx, workspaceId, DOMAIN_BLOB_DATA, {
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
  }

  async list (ctx: MeasureContext, workspaceId: WorkspaceId, prefix?: string | undefined): Promise<ListBlobResult[]> {
    return await this.dbAdapter.find<Blob>(ctx, workspaceId, DOMAIN_BLOB_DATA, {
      _class: core.class.Blob,
      _id: { $regex: `/^${prefix ?? ''}/i` }
    })
  }

  async stat (ctx: MeasureContext, workspaceId: WorkspaceId, name: string): Promise<Blob | undefined> {
    return (
      await this.dbAdapter.find<Blob>(
        ctx,
        workspaceId,
        DOMAIN_BLOB_DATA,
        { _class: core.class.Blob, _id: name as Ref<Blob> },
        { limit: 1 }
      )
    ).shift()
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
        DOMAIN_BLOB_DATA,
        { _class: core.class.Blob, _id: objectName as Ref<Blob> },
        { limit: 1 }
      )
    ).shift()
    if (stat === undefined) {
      throw new Error('No such object found')
    }
    const provider = this.adapters.get(stat.provider)
    if (provider === undefined) {
      throw new Error('No such provider found')
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
      throw new Error('No such provider found')
    }

    const storageId = uuid()

    const result = await provider.put(ctx, workspaceId, storageId, stream, contentType, size)

    if (size === undefined || size === 0) {
      const docStats = await provider.stat(ctx, workspaceId, storageId)
      if (docStats !== undefined) {
        if (contentType !== docStats.contentType) {
          contentType = docStats.contentType
        }
        size = docStats.size
      }
    }

    const blobDoc: Blob = {
      _class: core.class.Blob,
      _id: generateId(),
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      space: core.space.Configuration,
      provider: this.defaultAdapter,
      storageId,
      size: size ?? 0,
      contentType,
      etag: result.etag,
      version: result.versionId ?? null
    }

    await this.dbAdapter.upload<Blob>(ctx, workspaceId, DOMAIN_BLOB_DATA, [blobDoc])
    return result
  }
}

/**
 * @public
 */
export function buildStorage (
  config: StorageConfiguration,
  dbAdapter: RawDBAdapter,
  storageFactory: (kind: string, config: StorageConfig) => StorageAdapter
): StorageAdapter {
  const adapters = new Map<string, StorageAdapter>()
  for (const c of config.storages) {
    adapters.set(c.name, storageFactory(c.kind, c))
  }
  return new AggregatorStorageAdapter(adapters, config.default, dbAdapter)
}
