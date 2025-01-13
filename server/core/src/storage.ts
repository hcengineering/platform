import {
  toWorkspaceString,
  type Doc,
  type DocInfo,
  type Domain,
  type LowLevelStorage,
  type MeasureContext,
  type Ref,
  type StorageIterator,
  type WorkspaceId
} from '@hcengineering/core'

export * from '@hcengineering/storage'

/**
 * @public
 */
export function getBucketId (workspaceId: WorkspaceId): string {
  return toWorkspaceString(workspaceId)
}

const chunkSize = 200

/**
 * @public
 */
export interface ChunkInfo {
  idx: number
  index: 0
  finished: boolean
  iterator: StorageIterator
}

/**
 * @public
 */
export class BackupClientOps {
  constructor (protected readonly storage: LowLevelStorage) {}

  idIndex = 0
  chunkInfo = new Map<number, ChunkInfo>()

  loadChunk (
    ctx: MeasureContext,
    domain: Domain,
    idx?: number
  ): Promise<{
      idx: number
      docs: DocInfo[]
      finished: boolean
    }> {
    return ctx.with('load-chunk', {}, async (ctx) => {
      idx = idx ?? this.idIndex++
      let chunk: ChunkInfo | undefined = this.chunkInfo.get(idx)
      let size = 0
      if (chunk !== undefined) {
        chunk.index++
        if (chunk.finished === undefined || chunk.finished) {
          return {
            idx,
            docs: [],
            finished: true
          }
        }
      } else {
        chunk = { idx, iterator: this.storage.find(ctx, domain), finished: false, index: 0 }
        this.chunkInfo.set(idx, chunk)
      }
      const docs: DocInfo[] = []

      while (docs.length < chunkSize) {
        const _docs = await chunk.iterator.next(ctx)
        if (_docs.length === 0) {
          chunk.finished = true
          break
        }
        docs.push(..._docs)
        for (const d of _docs) {
          size += d.size ?? 0
        }
      }

      return {
        idx,
        docs,
        finished: chunk.finished,
        size
      }
    })
  }

  closeChunk (ctx: MeasureContext, idx: number): Promise<void> {
    return ctx.with('close-chunk', {}, async () => {
      const chunk = this.chunkInfo.get(idx)
      this.chunkInfo.delete(idx)
      if (chunk != null) {
        await chunk.iterator.close(ctx)
      }
    })
  }

  loadDocs (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return this.storage.load(ctx, domain, docs)
  }

  upload (ctx: MeasureContext, domain: Domain, docs: Doc[]): Promise<void> {
    return this.storage.upload(ctx, domain, docs)
  }

  clean (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    return this.storage.clean(ctx, domain, docs)
  }
}
