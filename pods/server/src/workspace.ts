//
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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

import { Analytics } from '@hcengineering/analytics'
import core, {
  generateId,
  systemAccountUuid,
  TxProcessor,
  type Account,
  type Branding,
  type Class,
  type Doc,
  type DocumentQuery,
  type Domain,
  type DomainParams,
  type DomainResult,
  type FindOptions,
  type FindResult,
  type LoadModelResponse,
  type MeasureContext,
  type OperationDomain,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type SessionData,
  type SocialStringsToUsers,
  type Timestamp,
  type Tx,
  type TxCUD,
  type TxResult,
  type WorkspaceIds
} from '@hcengineering/core'
import { PlatformError, unknownError } from '@hcengineering/platform'
import { type TickHandler, type Workspace } from '@hcengineering/server'
import {
  BackupClientOps,
  ClientSession,
  type ConnectionSocket,
  type LoadChunkResult,
  type Pipeline,
  type Session,
  type WorkspaceService
} from '@hcengineering/server-core'
import type { Token } from '@hcengineering/server-token'

const useReserveContext = (process.env.USE_RESERVE_CTX ?? 'true') === 'true'

export type WorkspacePipelineFactory = () => Promise<Pipeline>

/**
 * @public
 */
export class WorkspaceImpl implements Workspace, WorkspaceService {
  pipeline?: Pipeline | Promise<Pipeline>
  maintenance: boolean = false
  closing?: Promise<void>

  workspaceInitCompleted: boolean = false

  softShutdown: number = 0
  tickHash: number = 0

  sessions = new Map<string, { session: Session, socket: ConnectionSocket, tickHash: number }>()
  tickHandlers = new Map<string, TickHandler>()

  operations: number = 0

  socialStringsToUsers: SocialStringsToUsers = new Map()

  ops: BackupClientOps | undefined

  constructor (
    readonly context: MeasureContext,
    readonly factory: WorkspacePipelineFactory,
    readonly wsId: WorkspaceIds,
    readonly branding: Branding | null
  ) {}

  async getPipeline (): Promise<Pipeline> {
    if (this.pipeline === undefined) {
      this.pipeline = this.factory()
    }
    if (this.pipeline instanceof Promise) {
      this.pipeline = await this.pipeline
    }
    return this.pipeline
  }

  async close (ctx: MeasureContext): Promise<void> {
    if (this.pipeline === undefined) {
      return
    }
    const pipeline = await this.pipeline
    const closePipeline = async (): Promise<void> => {
      try {
        await ctx.with('close-pipeline', {}, async () => {
          await pipeline.close()
        })
      } catch (err: any) {
        Analytics.handleError(err)
        ctx.error('close-pipeline-error', { error: err })
      }
    }

    await ctx.with('closing', {}, async () => {
      const to = timeoutPromise(120000)
      const closePromises = closePipeline()
      await Promise.race([closePromises, to.promise])
      to.cancelHandle()
    })
  }

  async getLastTxHash (ctx: MeasureContext): Promise<{ lastTx?: string, lastHash?: string }> {
    const pipeline = await this.getPipeline()
    return { lastHash: pipeline.context.lastHash, lastTx: pipeline.context.lastTx }
  }

  async createSession (ctx: MeasureContext, sessionId: string, token: Token, account: Account): Promise<Session> {
    if (account.uuid !== systemAccountUuid) {
      // Just fill social ids, do not clean
      for (const id of account.fullSocialIds) {
        this.socialStringsToUsers.set(id._id, {
          accountUuid: account.uuid,
          role: account.role
        })
      }
    }

    return new ClientSession(token, sessionId, this.wsId, account, token.extra?.mode === 'backup')
  }

  async closeSession (ctx: MeasureContext, session: Session): Promise<void> {
    const pipeline = await this.getPipeline()
    await pipeline.closeSession(ctx, session.sessionId)
  }

  // Operation over workspace
  async loadModel (
    ctx: MeasureContext,
    session: Session,
    lastModelTx: Timestamp,
    hash?: string,
    shouldFilter?: boolean
  ): Promise<LoadModelResponse | Tx[]> {
    session.includeSessionContext(ctx, this.socialStringsToUsers)
    const pipeline = await this.getPipeline()
    const txes = await ctx.with('load-model', {}, (_ctx) => pipeline.loadModel(_ctx, lastModelTx, hash))
    if (shouldFilter === true) {
      // we need to filter only hierarchy related txes.
      const allowedClasess: Ref<Class<Doc>>[] = [
        core.class.Class,
        core.class.Attribute,
        core.class.Mixin,
        core.class.Type,
        core.class.Status,
        core.class.Permission,
        core.class.Space,
        core.class.Tx
      ]
      const h = pipeline.context.hierarchy
      if (Array.isArray(txes)) {
        return txes.filter(
          (it) =>
            TxProcessor.isExtendsCUD(it._class) &&
            allowedClasess.some((cl) => h.isDerived((it as TxCUD<Doc>).objectClass, cl))
        )
      } else {
        txes.transactions = txes.transactions.filter(
          (it) =>
            TxProcessor.isExtendsCUD(it._class) &&
            allowedClasess.some((cl) => h.isDerived((it as TxCUD<Doc>).objectClass, cl))
        )
        return txes
      }
    }
    return txes
  }

  async findAll<T extends Doc>(
    ctx: MeasureContext,
    session: Session,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    session.updateLast({ find: true })

    const pipeline = await this.getPipeline()
    session.includeSessionContext(ctx, this.socialStringsToUsers)
    return await pipeline.findAll(ctx, _class, query, options)
  }

  async searchFulltext (
    ctx: MeasureContext,
    session: Session,
    query: SearchQuery,
    options: SearchOptions
  ): Promise<SearchResult> {
    session.updateLast({ find: true })
    const pipeline = await this.getPipeline()
    session.includeSessionContext(ctx, this.socialStringsToUsers)
    return await pipeline.searchFulltext(ctx, query, options)
  }

  async tx (
    ctx: MeasureContext,
    session: Session,
    tx: Tx,
    onResult?: (result: TxResult) => Promise<void>
  ): Promise<TxResult> {
    session.updateLast({ tx: true })
    session.includeSessionContext(ctx, this.socialStringsToUsers)

    const pipeline = await this.getPipeline()

    let cid = 'client_' + generateId()
    ctx.id = cid
    let onEnd = useReserveContext ? pipeline.context.adapterManager?.reserveContext?.(cid) : undefined
    let result: TxResult
    try {
      result = await pipeline.tx(ctx, [tx])
    } finally {
      onEnd?.()
    }

    try {
      await onResult?.(result)
    } catch (err: any) {
      ctx.error('failed to handle tx result', { err })
    }

    // We need to broadcast all collected transactions
    await pipeline.handleBroadcast(ctx)

    // ok we could perform async requests if any
    const asyncs = (ctx.contextData as SessionData).asyncRequests ?? []
    if (asyncs.length > 0) {
      cid = 'client_async_' + generateId()
      ctx.id = cid
      onEnd = useReserveContext ? pipeline.context.adapterManager?.reserveContext?.(cid) : undefined
      try {
        for (const r of asyncs) {
          await r(ctx, cid)
        }
      } finally {
        onEnd?.()
      }
    }
    return result
  }

  async domainRequest (
    ctx: MeasureContext,
    session: Session,
    domain: OperationDomain,
    params: DomainParams,
    onResult?: (result: DomainResult) => Promise<void>
  ): Promise<DomainResult> {
    session.updateLast({ find: true })
    session.includeSessionContext(ctx, this.socialStringsToUsers)
    const pipeline = await this.getPipeline()

    const result: DomainResult = await pipeline.domainRequest(ctx, domain, params)

    try {
      await onResult?.(result)
    } catch (err: any) {
      ctx.error('failed to handle domain request result', { err })
    }
    // We need to broadcast all collected transactions
    await pipeline.handleBroadcast(ctx)

    // ok we could perform async requests if any
    const asyncs = (ctx.contextData as SessionData).asyncRequests ?? []
    if (asyncs.length > 0) {
      ctx.contextData.broadcast.queue = []
      ctx.contextData.broadcast.txes = []
      ctx.contextData.broadcast.sessions = {}
      try {
        for (const r of asyncs) {
          await r(ctx)
        }
      } catch (err: any) {
        ctx.error('failed to handleAsyncs', { err })
      }
      await pipeline.handleBroadcast(ctx)
    }
    return result
  }

  async getOps (): Promise<BackupClientOps> {
    if (this.ops === undefined) {
      const pipeline = await this.getPipeline()
      if (pipeline.context.lowLevelStorage === undefined) {
        throw new PlatformError(unknownError('Low level storage is not available'))
      }
      this.ops = new BackupClientOps(pipeline.context.lowLevelStorage)
    }
    return this.ops
  }

  async loadChunk (ctx: MeasureContext, session: Session, domain: Domain, idx?: number): Promise<LoadChunkResult> {
    session.updateLast({ find: true })
    const ops = await this.getOps()
    return await ops.loadChunk(ctx, domain, idx)
  }

  async getDomainHash (ctx: MeasureContext, domain: Domain): Promise<string> {
    const ops = await this.getOps()
    return await ops.getDomainHash(ctx, domain)
  }

  async closeChunk (ctx: MeasureContext, session: Session, idx: number): Promise<void> {
    session.updateLast({ find: true })
    const ops = await this.getOps()
    await ops.closeChunk(ctx, idx)
  }

  async loadDocs (ctx: MeasureContext, session: Session, domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    session.updateLast({ find: true })

    const ops = await this.getOps()
    return await ops.loadDocs(ctx, domain, docs)
  }

  async upload (ctx: MeasureContext, session: Session, domain: Domain, docs: Doc[]): Promise<void> {
    if (!session.allowUpload) {
      throw new PlatformError(unknownError('Upload not allowed'))
    }
    session.updateLast({ tx: true })

    const ops = await this.getOps()
    await ops.upload(ctx, domain, docs)
  }

  async clean (ctx: MeasureContext, session: Session, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    if (!session.allowUpload) {
      throw new PlatformError(unknownError('Clean not allowed'))
    }
    session.updateLast({ tx: true })
    const ops = await this.getOps()
    await ops.clean(ctx, domain, docs)
  }
}

function timeoutPromise (time: number): { promise: Promise<void>, cancelHandle: () => void } {
  let timer: any
  return {
    promise: new Promise((resolve) => {
      timer = setTimeout(resolve, time)
    }),
    cancelHandle: () => {
      clearTimeout(timer)
    }
  }
}
