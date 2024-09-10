import { Doc, Domain, Ref, type Branding, type WorkspaceIdWithUrl } from '@hcengineering/core'
import { PlatformError, unknownError } from '@hcengineering/platform'
import { BackupClientOps, Pipeline } from '@hcengineering/server-core'
import { Token } from '@hcengineering/server-token'
import { ClientSession, Session, type ClientSessionCtx } from '@hcengineering/server-ws'

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
  ops: BackupClientOps
  constructor (
    protected readonly token: Token,
    _pipeline: Pipeline,
    workspaceId: WorkspaceIdWithUrl,
    branding: Branding | null
  ) {
    super(token, _pipeline, workspaceId, branding)
    if (_pipeline.context.lowLevelStorage === undefined) {
      throw new PlatformError(unknownError('Low level storage is not available'))
    }
    this.ops = new BackupClientOps(_pipeline.context.lowLevelStorage)
  }

  async loadChunk (_ctx: ClientSessionCtx, domain: Domain, idx?: number, recheck?: boolean): Promise<void> {
    this.lastRequest = Date.now()
    try {
      const result = await this.ops.loadChunk(_ctx.ctx, domain, idx, recheck)
      await _ctx.sendResponse(result)
    } catch (err: any) {
      await _ctx.sendResponse({ error: err.message })
    }
  }

  async closeChunk (ctx: ClientSessionCtx, idx: number): Promise<void> {
    this.lastRequest = Date.now()
    await this.ops.closeChunk(ctx.ctx, idx)
    await ctx.sendResponse({})
  }

  async loadDocs (ctx: ClientSessionCtx, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    this.lastRequest = Date.now()
    try {
      const result = await this.ops.loadDocs(ctx.ctx, domain, docs)
      await ctx.sendResponse(result)
    } catch (err: any) {
      await ctx.sendResponse({ error: err.message })
    }
  }

  async upload (ctx: ClientSessionCtx, domain: Domain, docs: Doc[]): Promise<void> {
    this.lastRequest = Date.now()
    try {
      await this.ops.upload(ctx.ctx, domain, docs)
    } catch (err: any) {
      await ctx.sendResponse({ error: err.message })
      return
    }
    await ctx.sendResponse({})
  }

  async clean (ctx: ClientSessionCtx, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    this.lastRequest = Date.now()
    try {
      await this.ops.clean(ctx.ctx, domain, docs)
    } catch (err: any) {
      await ctx.sendResponse({ error: err.message })
      return
    }
    await ctx.sendResponse({})
  }
}
