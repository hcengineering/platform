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

import core, {
  AccountRole,
  TxFactory,
  TxProcessor,
  type Account,
  type Branding,
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
  type Timestamp,
  type Tx,
  type TxCUD,
  type WorkspaceIdWithUrl
} from '@hcengineering/core'
import { PlatformError, unknownError } from '@hcengineering/platform'
import {
  BackupClientOps,
  SessionDataImpl,
  createBroadcastEvent,
  type ClientSessionCtx,
  type ConnectionSocket,
  type Pipeline,
  type Session,
  type SessionRequest,
  type StatisticsElement
} from '@hcengineering/server-core'
import { type Token } from '@hcengineering/server-token'
import { handleSend } from './utils'

/**
 * @public
 */
export class ClientSession implements Session {
  createTime = Date.now()
  requests = new Map<string, SessionRequest>()
  binaryMode: boolean = false
  useCompression: boolean = true
  sessionId = ''
  lastRequest = Date.now()

  lastPing: number = Date.now()

  total: StatisticsElement = { find: 0, tx: 0 }
  current: StatisticsElement = { find: 0, tx: 0 }
  mins5: StatisticsElement = { find: 0, tx: 0 }
  measures: { id: string, message: string, time: 0 }[] = []

  ops: BackupClientOps | undefined

  constructor (
    protected readonly token: Token,
    protected readonly _pipeline: Pipeline,
    readonly workspaceId: WorkspaceIdWithUrl,
    readonly branding: Branding | null,
    readonly allowUpload: boolean
  ) {}

  getUser (): string {
    return this.token.email
  }

  isUpgradeClient (): boolean {
    return this.token.extra?.model === 'upgrade'
  }

  getMode (): string {
    return this.token.extra?.mode ?? 'normal'
  }

  pipeline (): Pipeline {
    return this._pipeline
  }

  async ping (ctx: ClientSessionCtx): Promise<void> {
    // console.log('ping')
    this.lastRequest = Date.now()
    await ctx.sendResponse('pong!')
  }

  async loadModel (ctx: ClientSessionCtx, lastModelTx: Timestamp, hash?: string): Promise<void> {
    this.includeSessionContext(ctx.ctx)
    const result = await ctx.ctx.with('load-model', {}, () => this._pipeline.loadModel(ctx.ctx, lastModelTx, hash))
    await ctx.sendResponse(result)
  }

  async getAccount (ctx: ClientSessionCtx): Promise<void> {
    const account = this._pipeline.context.modelDb.getAccountByEmail(this.token.email)
    if (account === undefined && this.token.extra?.admin === 'true') {
      await ctx.sendResponse(this.getSystemAccount())
      return
    }
    await ctx.sendResponse(account)
  }

  private getSystemAccount (): Account {
    // Generate account for admin user
    const factory = new TxFactory(core.account.System)
    const email = `system:${this.token.email}`
    const createTx = factory.createTxCreateDoc(
      core.class.Account,
      core.space.Model,
      {
        role: AccountRole.Owner,
        email
      },
      email as Ref<Account>
    )
    return TxProcessor.createDoc2Doc(createTx)
  }

  includeSessionContext (ctx: MeasureContext): void {
    let account: Account | undefined
    if (this.token.extra?.admin === 'true') {
      account = this._pipeline.context.modelDb.getAccountByEmail(this.token.email)
      if (account === undefined) {
        account = this.getSystemAccount()
      }
    }

    const contextData = new SessionDataImpl(
      this.token.email,
      this.sessionId,
      this.token.extra?.admin === 'true',
      {
        txes: [],
        targets: {}
      },
      this.workspaceId,
      this.branding,
      false,
      new Map(),
      new Map(),
      this._pipeline.context.modelDb,
      account
    )
    ctx.contextData = contextData
  }

  findAllRaw<T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    this.lastRequest = Date.now()
    this.total.find++
    this.current.find++
    this.includeSessionContext(ctx)
    return this._pipeline.findAll(ctx, _class, query, options)
  }

  async findAll<T extends Doc>(
    ctx: ClientSessionCtx,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<void> {
    await ctx.sendResponse(await this.findAllRaw(ctx.ctx, _class, query, options))
  }

  async searchFulltext (ctx: ClientSessionCtx, query: SearchQuery, options: SearchOptions): Promise<void> {
    this.lastRequest = Date.now()
    this.includeSessionContext(ctx.ctx)
    await ctx.sendResponse(await this._pipeline.searchFulltext(ctx.ctx, query, options))
  }

  async tx (ctx: ClientSessionCtx, tx: Tx): Promise<void> {
    this.lastRequest = Date.now()
    this.total.tx++
    this.current.tx++
    this.includeSessionContext(ctx.ctx)

    const result = await this._pipeline.tx(ctx.ctx, [tx])

    // Send result immideately
    await ctx.sendResponse(result)

    // We need to broadcast all collected transactions
    await this._pipeline.handleBroadcast(ctx.ctx)
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
      socket.send(
        ctx,
        {
          result: [bevent]
        },
        this.binaryMode,
        this.useCompression
      )
    } else {
      void handleSend(ctx, socket, { result: tx }, 1024 * 1024, this.binaryMode, this.useCompression)
    }
  }

  getOps (): BackupClientOps {
    if (this.ops === undefined) {
      if (this._pipeline.context.lowLevelStorage === undefined) {
        throw new PlatformError(unknownError('Low level storage is not available'))
      }
      this.ops = new BackupClientOps(this._pipeline.context.lowLevelStorage)
    }
    return this.ops
  }

  async loadChunk (ctx: ClientSessionCtx, domain: Domain, idx?: number, recheck?: boolean): Promise<void> {
    this.lastRequest = Date.now()
    try {
      const result = await this.getOps().loadChunk(ctx.ctx, domain, idx, recheck)
      await ctx.sendResponse(result)
    } catch (err: any) {
      await ctx.sendError('Failed to upload', unknownError(err))
      ctx.ctx.error('failed to loadChunk', { domain, err })
    }
  }

  async closeChunk (ctx: ClientSessionCtx, idx: number): Promise<void> {
    this.lastRequest = Date.now()
    await this.getOps().closeChunk(ctx.ctx, idx)
    await ctx.sendResponse({})
  }

  async loadDocs (ctx: ClientSessionCtx, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    this.lastRequest = Date.now()
    try {
      const result = await this.getOps().loadDocs(ctx.ctx, domain, docs)
      await ctx.sendResponse(result)
    } catch (err: any) {
      await ctx.sendError('Failed to loadDocs', unknownError(err))
      ctx.ctx.error('failed to loadDocs', { domain, err })
    }
  }

  async upload (ctx: ClientSessionCtx, domain: Domain, docs: Doc[]): Promise<void> {
    if (!this.allowUpload) {
      await ctx.sendResponse({ error: 'Upload not allowed' })
    }
    this.lastRequest = Date.now()
    try {
      await this.getOps().upload(ctx.ctx, domain, docs)
    } catch (err: any) {
      await ctx.sendError('Failed to upload', unknownError(err))
      ctx.ctx.error('failed to loadDocs', { domain, err })
      return
    }
    await ctx.sendResponse({})
  }

  async clean (ctx: ClientSessionCtx, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    if (!this.allowUpload) {
      await ctx.sendResponse({ error: 'Clean not allowed' })
    }
    this.lastRequest = Date.now()
    try {
      await this.getOps().clean(ctx.ctx, domain, docs)
    } catch (err: any) {
      await ctx.sendError('Failed to clean', unknownError(err))
      ctx.ctx.error('failed to clean', { domain, err })
      return
    }
    await ctx.sendResponse({})
  }
}

/**
 * @public
 */
export interface BackupSession extends Session {
  loadChunk: (ctx: ClientSessionCtx, domain: Domain, idx?: number, recheck?: boolean) => Promise<void>
  closeChunk: (ctx: ClientSessionCtx, idx: number) => Promise<void>
  loadDocs: (ctx: ClientSessionCtx, domain: Domain, docs: Ref<Doc>[]) => Promise<void>
}
