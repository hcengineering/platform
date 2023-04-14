import { Doc, DocChunk, Domain, MeasureContext, Ref, StorageIterator } from '@hcengineering/core'
import { Pipeline } from '@hcengineering/server-core'
import { Token } from '@hcengineering/server-token'
import { BroadcastCall, ClientSession, Session } from '@hcengineering/server-ws'

const chunkSize = 1024 * 1024

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
export interface BackupSession extends Session {
  loadChunk: (ctx: MeasureContext, domain: Domain, idx?: number) => Promise<DocChunk>
  closeChunk: (ctx: MeasureContext, idx: number) => Promise<void>
  loadDocs: (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]) => Promise<Doc[]>
}

/**
 * @public
 */
export class BackupClientSession extends ClientSession implements BackupSession {
  constructor (
    protected readonly broadcast: BroadcastCall,
    protected readonly token: Token,
    protected readonly _pipeline: Pipeline
  ) {
    super(broadcast, token, _pipeline)
  }

  idIndex = 0
  chunkInfo = new Map<number, ChunkInfo>()

  async loadChunk (ctx: MeasureContext, domain: Domain, idx?: number): Promise<DocChunk> {
    idx = idx ?? this.idIndex++
    let chunk: ChunkInfo | undefined = this.chunkInfo.get(idx)
    if (chunk !== undefined) {
      chunk.index++
      if (chunk.finished === undefined) {
        return {
          idx,
          docs: {},
          finished: true
        }
      }
    } else {
      chunk = { idx, iterator: this._pipeline.storage.find(domain), finished: false, index: 0 }
      this.chunkInfo.set(idx, chunk)
    }
    let size = 0
    const docs: Record<string, string> = {}

    while (size < chunkSize) {
      const doc = await chunk.iterator.next()
      if (doc === undefined) {
        chunk.finished = true
        break
      }

      size = size + doc.size
      docs[doc.id] = doc.hash
    }

    return {
      idx,
      docs,
      finished: chunk.finished
    }
  }

  async closeChunk (ctx: MeasureContext, idx: number): Promise<void> {
    const chunk = this.chunkInfo.get(idx)
    this.chunkInfo.delete(idx)
    if (chunk != null) {
      await chunk.iterator.close()
    }
  }

  async loadDocs (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return await this._pipeline.storage.load(domain, docs)
  }

  async upload (ctx: MeasureContext, domain: Domain, docs: Doc[]): Promise<void> {
    return await this._pipeline.storage.upload(domain, docs)
  }

  async clean (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    return await this._pipeline.storage.clean(domain, docs)
  }
}
