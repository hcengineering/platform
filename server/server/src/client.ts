//
// Copyright © 2022 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import {
  generateId,
  TxProcessor,
  type Account,
  type Class,
  type Doc,
  type DocumentQuery,
  type Domain,
  type FindOptions,
  type FindResult,
  type MeasureContext,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type SessionData,
  type Timestamp,
  type Tx,
  type TxCUD,
  type TxResult
} from '@hcengineering/core'
import { PlatformError, unknownError } from '@hcengineering/platform'
import {
  BackupClientOps,
  createBroadcastEvent,
  getUser,
  SessionDataImpl,
  type ClientSessionCtx,
  type ConnectionSocket,
  type Pipeline,
  type Session,
  type SessionRequest,
  type StatisticsElement,
  type Workspace
} from '@hcengineering/server-core'
import { type Token } from '@hcengineering/server-token'

const useReserveContext = (process.env.USE_RESERVE_CTX ?? 'true') === 'true'

/**
 * @public
 */
export class ClientSession implements Session {
  createTime = Date.now()
  requests = new Map<string, SessionRequest>()
  binaryMode: boolean = false
  useCompression: boolean = false
  sessionId = ''
  lastRequest = Date.now()

  lastPing: number = Date.now()

  total: StatisticsElement = { find: 0, tx: 0 }
  current: StatisticsElement = { find: 0, tx: 0 }
  mins5: StatisticsElement = { find: 0, tx: 0 }
  measures: { id: string, message: string, time: 0 }[] = []

  ops: BackupClientOps | undefined
  opsPipeline: Pipeline | undefined

  account?: Account
  isAdmin: boolean

  constructor (
    protected readonly token: Token,
    readonly workspace: Workspace,
    readonly allowUpload: boolean
  ) {
    this.isAdmin = this.token.extra?.admin === 'true'
  }

  getUser (): string {
    return this.token.email
  }

  isUpgradeClient (): boolean {
    return this.token.extra?.model === 'upgrade'
  }

  getMode (): string {
    return this.token.extra?.mode ?? 'normal'
  }

  async ping (ctx: ClientSessionCtx): Promise<void> {
    this.lastRequest = Date.now()
    ctx.sendPong()
  }

  async loadModel (ctx: ClientSessionCtx, lastModelTx: Timestamp, hash?: string): Promise<void> {
    this.includeSessionContext(ctx.ctx, ctx.pipeline)
    const result = await ctx.ctx.with('load-model', {}, (_ctx) => ctx.pipeline.loadModel(_ctx, lastModelTx, hash))
    await ctx.sendResponse(ctx.requestId, result)
  }

  async getAccount (ctx: ClientSessionCtx): Promise<void> {
    await ctx.sendResponse(ctx.requestId, this.getRawAccount(ctx.pipeline))
  }

  getRawAccount (pipeline: Pipeline): Account {
    if (this.account === undefined) {
      this.account = getUser(pipeline.context.modelDb, this.token.email, this.isAdmin)
    }
    return this.account
  }

  includeSessionContext (ctx: MeasureContext, pipeline: Pipeline): void {
    const contextData = new SessionDataImpl(
      this.token.email,
      this.sessionId,
      this.isAdmin,
      undefined,
      this.workspace.workspaceId,
      this.workspace.branding,
      false,
      undefined,
      undefined,
      pipeline.context.modelDb,
      this.getRawAccount(pipeline)
    )
    ctx.contextData = contextData
  }

  findAllRaw<T extends Doc>(
    ctx: MeasureContext,
    pipeline: Pipeline,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    this.lastRequest = Date.now()
    this.total.find++
    this.current.find++
    this.includeSessionContext(ctx, pipeline)
    return pipeline.findAll(ctx, _class, query, options)
  }

  async findAll<T extends Doc>(
    ctx: ClientSessionCtx,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<void> {
    await ctx.sendResponse(ctx.requestId, await this.findAllRaw(ctx.ctx, ctx.pipeline, _class, query, options))
  }

  async searchFulltext (ctx: ClientSessionCtx, query: SearchQuery, options: SearchOptions): Promise<void> {
    this.lastRequest = Date.now()
    this.includeSessionContext(ctx.ctx, ctx.pipeline)
    await ctx.sendResponse(ctx.requestId, await ctx.pipeline.searchFulltext(ctx.ctx, query, options))
  }

  async txRaw (
    ctx: ClientSessionCtx,
    tx: Tx
  ): Promise<{
      result: TxResult
      broadcastPromise: Promise<void>
      asyncsPromise: Promise<void> | undefined
    }> {
    this.lastRequest = Date.now()
    this.total.tx++
    this.current.tx++
    this.includeSessionContext(ctx.ctx, ctx.pipeline)

    let cid = 'client_' + generateId()
    ctx.ctx.id = cid
    let onEnd = useReserveContext ? ctx.pipeline.context.adapterManager?.reserveContext?.(cid) : undefined
    let result: TxResult
    try {
      result = await ctx.pipeline.tx(ctx.ctx, [tx])
    } finally {
      onEnd?.()
    }
    // Send result immideately
    await ctx.sendResponse(ctx.requestId, result)

    // We need to broadcast all collected transactions
    const broadcastPromise = ctx.pipeline.handleBroadcast(ctx.ctx)

    // ok we could perform async requests if any
    const asyncs = (ctx.ctx.contextData as SessionData).asyncRequests ?? []
    let asyncsPromise: Promise<void> | undefined
    if (asyncs.length > 0) {
      cid = 'client_async_' + generateId()
      ctx.ctx.id = cid
      onEnd = useReserveContext ? ctx.pipeline.context.adapterManager?.reserveContext?.(cid) : undefined
      const handleAyncs = async (): Promise<void> => {
        try {
          for (const r of (ctx.ctx.contextData as SessionData).asyncRequests ?? []) {
            await r()
          }
        } finally {
          onEnd?.()
        }
      }
      asyncsPromise = handleAyncs()
    }

    return { result, broadcastPromise, asyncsPromise }
  }

  async tx (ctx: ClientSessionCtx, tx: Tx): Promise<void> {
    const { broadcastPromise, asyncsPromise } = await this.txRaw(ctx, tx)
    await broadcastPromise
    if (asyncsPromise !== undefined) {
      await asyncsPromise
    }
  }

  broadcast (ctx: MeasureContext, socket: ConnectionSocket, tx: Tx[]): void {
    if (this.tx.length > 10000) {
      const classes = new Set<Ref<Class<Doc>>>()
      for (const dtx of tx) {
        if (TxProcessor.isExtendsCUD(dtx._class)) {
          classes.add((dtx as TxCUD<Doc>).objectClass)
          const attachedToClass = (dtx as TxCUD<Doc>).attachedToClass
          if (attachedToClass !== undefined) {
            classes.add(attachedToClass)
          }
        }
      }
      const bevent = createBroadcastEvent(Array.from(classes))
      void socket.send(
        ctx,
        {
          result: [bevent]
        },
        this.binaryMode,
        this.useCompression
      )
    } else {
      void socket.send(ctx, { result: tx }, this.binaryMode, this.useCompression)
    }
  }

  getOps (pipeline: Pipeline): BackupClientOps {
    if (this.ops === undefined || this.opsPipeline !== pipeline) {
      if (pipeline.context.lowLevelStorage === undefined) {
        throw new PlatformError(unknownError('Low level storage is not available'))
      }
      this.ops = new BackupClientOps(pipeline.context.lowLevelStorage)
      this.opsPipeline = pipeline
    }
    return this.ops
  }

  async loadChunk (ctx: ClientSessionCtx, domain: Domain, idx?: number): Promise<void> {
    this.lastRequest = Date.now()
    try {
      const result = await this.getOps(ctx.pipeline).loadChunk(ctx.ctx, domain, idx)
      await ctx.sendResponse(ctx.requestId, result)
    } catch (err: any) {
      await ctx.sendError(ctx.requestId, 'Failed to upload', unknownError(err))
      ctx.ctx.error('failed to loadChunk', { domain, err })
    }
  }

  async getDomainHash (ctx: ClientSessionCtx, domain: Domain): Promise<void> {
    this.lastRequest = Date.now()
    try {
      const result = await this.getOps(ctx.pipeline).getDomainHash(ctx.ctx, domain)
      await ctx.sendResponse(ctx.requestId, result)
    } catch (err: any) {
      await ctx.sendError(ctx.requestId, 'Failed to upload', unknownError(err))
      ctx.ctx.error('failed to getDomainHash', { domain, err })
    }
  }

  async closeChunk (ctx: ClientSessionCtx, idx: number): Promise<void> {
    this.lastRequest = Date.now()
    await this.getOps(ctx.pipeline).closeChunk(ctx.ctx, idx)
    await ctx.sendResponse(ctx.requestId, {})
  }

  async loadDocs (ctx: ClientSessionCtx, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    this.lastRequest = Date.now()
    try {
      const result = await this.getOps(ctx.pipeline).loadDocs(ctx.ctx, domain, docs)
      await ctx.sendResponse(ctx.requestId, result)
    } catch (err: any) {
      await ctx.sendError(ctx.requestId, 'Failed to loadDocs', unknownError(err))
      ctx.ctx.error('failed to loadDocs', { domain, err })
    }
  }

  async upload (ctx: ClientSessionCtx, domain: Domain, docs: Doc[]): Promise<void> {
    if (!this.allowUpload) {
      await ctx.sendResponse(ctx.requestId, { error: 'Upload not allowed' })
    }
    this.lastRequest = Date.now()
    try {
      await this.getOps(ctx.pipeline).upload(ctx.ctx, domain, docs)
    } catch (err: any) {
      await ctx.sendError(ctx.requestId, 'Failed to upload', unknownError(err))
      ctx.ctx.error('failed to loadDocs', { domain, err })
      return
    }
    await ctx.sendResponse(ctx.requestId, {})
  }

  async clean (ctx: ClientSessionCtx, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    if (!this.allowUpload) {
      await ctx.sendResponse(ctx.requestId, { error: 'Clean not allowed' })
    }
    this.lastRequest = Date.now()
    try {
      await this.getOps(ctx.pipeline).clean(ctx.ctx, domain, docs)
    } catch (err: any) {
      await ctx.sendError(ctx.requestId, 'Failed to clean', unknownError(err))
      ctx.ctx.error('failed to clean', { domain, err })
      return
    }
    await ctx.sendResponse(ctx.requestId, {})
  }
}
