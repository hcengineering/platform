import { Doc, DocInfo, Domain, Ref, StorageIterator } from '@hcengineering/core'
import { Pipeline, estimateDocSize } from '@hcengineering/server-core'
import { Token } from '@hcengineering/server-token'
import { ClientSession, Session, type ClientSessionCtx } from '@hcengineering/server-ws'

const chunkSize = 2 * 1024 * 1024

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
  loadChunk: (ctx: ClientSessionCtx, domain: Domain, idx?: number, recheck?: boolean) => Promise<void>
  closeChunk: (ctx: ClientSessionCtx, idx: number) => Promise<void>
  loadDocs: (ctx: ClientSessionCtx, domain: Domain, docs: Ref<Doc>[]) => Promise<void>
}

/**
 * @public
 */
export class BackupClientSession extends ClientSession implements BackupSession {
  constructor (
    protected readonly token: Token,
    protected readonly _pipeline: Pipeline
  ) {
    super(token, _pipeline)
  }

  idIndex = 0
  chunkInfo = new Map<number, ChunkInfo>()

  async loadChunk (_ctx: ClientSessionCtx, domain: Domain, idx?: number, recheck?: boolean): Promise<void> {
    this.lastRequest = Date.now()
    await _ctx.ctx.with('load-chunk', { domain }, async (ctx) => {
      idx = idx ?? this.idIndex++
      let chunk: ChunkInfo | undefined = this.chunkInfo.get(idx)
      if (chunk !== undefined) {
        chunk.index++
        if (chunk.finished === undefined) {
          return {
            idx,
            docs: [],
            finished: true
          }
        }
      } else {
        chunk = { idx, iterator: this._pipeline.storage.find(ctx, domain, recheck), finished: false, index: 0 }
        this.chunkInfo.set(idx, chunk)
      }
      let size = 0
      const docs: DocInfo[] = []

      while (size < chunkSize) {
        const doc = await chunk.iterator.next(ctx)
        if (doc === undefined) {
          chunk.finished = true
          break
        }

        size += estimateDocSize(doc)
        docs.push(doc)
      }

      await _ctx.sendResponse({
        idx,
        docs,
        finished: chunk.finished
      })
    })
  }

  async closeChunk (ctx: ClientSessionCtx, idx: number): Promise<void> {
    this.lastRequest = Date.now()
    await ctx.ctx.with('close-chunk', {}, async () => {
      const chunk = this.chunkInfo.get(idx)
      this.chunkInfo.delete(idx)
      if (chunk != null) {
        await chunk.iterator.close(ctx.ctx)
      }
      await ctx.sendResponse({})
    })
  }

  async loadDocs (ctx: ClientSessionCtx, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    this.lastRequest = Date.now()
    await ctx.sendResponse(await this._pipeline.storage.load(ctx.ctx, domain, docs))
  }

  async upload (ctx: ClientSessionCtx, domain: Domain, docs: Doc[]): Promise<void> {
    this.lastRequest = Date.now()
    await this._pipeline.storage.upload(ctx.ctx, domain, docs)
    await ctx.sendResponse({})
  }

  async clean (ctx: ClientSessionCtx, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    this.lastRequest = Date.now()
    await this._pipeline.storage.clean(ctx.ctx, domain, docs)
    await ctx.sendResponse({})
  }
}
