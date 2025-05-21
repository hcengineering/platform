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

import type { LoginInfoWithWorkspaces } from '@hcengineering/account-client'
import {
  type RequestEvent as CommunicationEvent,
  type SessionData as CommunicationSession,
  type EventResult
} from '@hcengineering/communication-sdk-types'
import {
  type FindCollaboratorsParams,
  type FindLabelsParams,
  type FindMessagesGroupsParams,
  type FindMessagesParams,
  type FindNotificationContextParams,
  type FindNotificationsParams,
  type Message,
  type MessagesGroup
} from '@hcengineering/communication-types'
import {
  generateId,
  groupByArray,
  toFindResult,
  TxProcessor,
  type Account,
  type AccountUuid,
  type Class,
  type Doc,
  type DocumentQuery,
  type Domain,
  type FindOptions,
  type FindResult,
  type LoadModelResponse,
  type MeasureContext,
  type PersonId,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type SessionData,
  type SocialId,
  type Timestamp,
  type Tx,
  type TxCUD,
  type TxOptions,
  type TxResult,
  type WorkspaceDataId,
  type WorkspaceIds,
  type WorkspaceUuid
} from '@hcengineering/core'
import { PlatformError, unknownError } from '@hcengineering/platform'
import {
  BackupClientOps,
  createBroadcastEvent,
  SessionDataImpl,
  type ConnectionSocket,
  type LoadChunkResponse,
  type Pipeline,
  type SessionRequest,
  type StatisticsElement
} from '@hcengineering/server-core'

import { type Token } from '@hcengineering/server-token'
import { mapLookup } from './lookup'
import { type ClientSessionCtx, type Session } from './types'

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
  isAdmin: boolean
  workspaceClosed = false

  subscribedUsers = new Set<AccountUuid>()

  constructor (
    readonly ctx: MeasureContext,
    protected readonly token: Token,
    readonly socket: ConnectionSocket,
    readonly workspaces: Set<WorkspaceUuid>,
    readonly account: Account,
    readonly info: LoginInfoWithWorkspaces,
    readonly allowUpload: boolean
  ) {
    this.isAdmin = this.token.extra?.admin === 'true'
    this.subscribedUsers.add(account.uuid)
  }

  getUser (): AccountUuid {
    return this.token.account
  }

  async getAccount (ctx: ClientSessionCtx): Promise<void> {
    await ctx.sendResponse(ctx.requestId, this.account)
  }

  getUserSocialIds (): PersonId[] {
    return this.account.socialIds
  }

  getSocialIds (): SocialId[] {
    return this.info.socialIds
  }

  getRawAccount (): Account {
    return this.account
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
    // TODO: Model is from first workspace for now.
    const workspace = ctx.workspaces[0]
    await workspace.with(async (pipeline, communicationApi) => {
      try {
        this.includeSessionContext(ctx, pipeline, this.account)
        const result = await ctx.ctx.with('load-model', {}, () => pipeline.loadModel(ctx.ctx, lastModelTx, hash))
        await ctx.sendResponse(ctx.requestId, result)
      } catch (err) {
        await ctx.sendError(ctx.requestId, 'Failed to loadModel', unknownError(err))
        ctx.ctx.error('failed to loadModel', { err })
      }
    })
  }

  async loadModelRaw (ctx: ClientSessionCtx, lastModelTx: Timestamp, hash?: string): Promise<LoadModelResponse | Tx[]> {
    // TODO: Model is from first workspace for now.
    const workspace = ctx.workspaces[0]
    return await workspace.with(async (pipeline, communicationApi) => {
      this.includeSessionContext(ctx, pipeline, this.account)
      return await ctx.ctx.with('load-model', {}, (_ctx) => pipeline.loadModel(_ctx, lastModelTx, hash))
    })
  }

  includeSessionContext (ctx: ClientSessionCtx, pipeline: Pipeline, account: Account): void {
    const dataId = pipeline.context.workspace.dataId ?? (pipeline.context.workspace.uuid as unknown as WorkspaceDataId)
    const contextData = new SessionDataImpl(
      account,
      this.sessionId,
      this.isAdmin,
      undefined,
      {
        ...pipeline.context.workspace,
        dataId
      },
      false,
      undefined,
      undefined,
      pipeline.context.modelDb,
      ctx.socialStringsToUsers,
      this.token.extra?.service ?? '🤦‍♂️user'
    )
    ctx.ctx.contextData = contextData
  }

  async findAllRaw<T extends Doc>(
    ctx: ClientSessionCtx,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    this.lastRequest = Date.now()
    this.total.find++
    this.current.find++

    const result: FindResult<T> = toFindResult([], -1)

    let workspaces = ctx.workspaces

    if (options?.workspace !== undefined) {
      if (typeof options.workspace === 'string') {
        workspaces = workspaces.filter((it) => it.wsId.uuid === options.workspace)
      } else if ('$in' in options.workspace && options.workspace.$in !== undefined) {
        const $in = options.workspace.$in
        workspaces = workspaces.filter((it) => $in.includes(it.wsId.uuid))
      } else if ('$nin' in options.workspace && options.workspace.$nin !== undefined) {
        const $nin = options.workspace.$nin
        workspaces = workspaces.filter((it) => !$nin.includes(it.wsId.uuid))
      }
    }

    const useUser = options?.user !== undefined ? ctx.getAccount(options?.user) : this.account

    for (const workspace of workspaces) {
      await workspace.with(async (pipeline, communicationApi) => {
        this.includeSessionContext(ctx, pipeline, useUser)
        const part = await pipeline.findAll(ctx.ctx, _class, query, options)
        result.push(...part)
        if (part.total !== -1) {
          if (result.total === -1) {
            result.total = 0
          }
          result.total += part.total
        }
      })
    }
    return result
  }

  async findAll<T extends Doc>(
    ctx: ClientSessionCtx,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<void> {
    try {
      const result = await this.findAllRaw(ctx, _class, query, options)
      await ctx.sendResponse(ctx.requestId, mapLookup<T>(query, result, options))
    } catch (err) {
      await ctx.sendError(ctx.requestId, 'Failed to findAll', unknownError(err))
      ctx.ctx.error('failed to findAll', { err })
    }
  }

  async searchFulltext (ctx: ClientSessionCtx, query: SearchQuery, options: SearchOptions): Promise<void> {
    try {
      this.lastRequest = Date.now()
      const workspace = ctx.workspaces[0]
      const useUser = options?.user !== undefined ? ctx.getAccount(options?.user) : this.account
      await workspace.with(async (pipeline, communicationApi) => {
        this.includeSessionContext(ctx, pipeline, useUser)
        await ctx.sendResponse(ctx.requestId, await pipeline.searchFulltext(ctx.ctx, query, options))
      })
    } catch (err) {
      await ctx.sendError(ctx.requestId, 'Failed to searchFulltext', unknownError(err))
      ctx.ctx.error('failed to searchFulltext', { err })
    }
  }

  async searchFulltextRaw (ctx: ClientSessionCtx, query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    this.lastRequest = Date.now()
    const workspace = ctx.workspaces[0]
    const useUser = options?.user !== undefined ? ctx.getAccount(options?.user) : this.account
    return await workspace.with(async (pipeline, communicationApi) => {
      this.includeSessionContext(ctx, pipeline, useUser)
      return await pipeline.searchFulltext(ctx.ctx, query, options)
    })
  }

  async txRaw (
    ctx: ClientSessionCtx,
    tx: Tx,
    accountOverride?: AccountUuid
  ): Promise<{
      result: TxResult
      broadcastPromise: Promise<void>
      asyncsPromise: Promise<void> | undefined
    }> {
    this.lastRequest = Date.now()
    this.total.tx++
    this.current.tx++
    const workspace = ctx.workspaces.find((it) => it.wsId.uuid === tx._uuid)
    if (workspace === undefined) {
      throw new Error('Workspace not found')
    }
    const useUser = accountOverride !== undefined ? ctx.getAccount(accountOverride) : this.account

    return await workspace.with(async (pipeline, communicationApi) => {
      this.includeSessionContext(ctx, pipeline, useUser)

      let cid = 'client_' + generateId()
      ctx.ctx.id = cid

      let onEnd = useReserveContext ? pipeline.context.adapterManager?.reserveContext?.(cid) : undefined
      let result: TxResult
      try {
        result = await pipeline.tx(ctx.ctx, [tx])
      } finally {
        onEnd?.()
      }
      // Send result immideately
      await ctx.sendResponse(ctx.requestId, result)

      // We need to broadcast all collected transactions
      const broadcastPromise = pipeline.handleBroadcast(ctx.ctx)

      // ok we could perform async requests if any
      const asyncs = (ctx.ctx.contextData as SessionData).asyncRequests ?? []
      let asyncsPromise: Promise<void> | undefined
      if (asyncs.length > 0) {
        cid = 'client_async_' + generateId()
        ctx.ctx.id = cid
        onEnd = useReserveContext ? pipeline.context.adapterManager?.reserveContext?.(cid) : undefined

        const handleAyncs = async (): Promise<void> => {
          try {
            for (const r of (ctx.ctx.contextData as SessionData).asyncRequests ?? []) {
              await r(ctx.ctx)
            }
          } finally {
            onEnd?.()
          }
        }
        asyncsPromise = handleAyncs()
      }

      return { result, broadcastPromise, asyncsPromise }
    })
  }

  async tx (ctx: ClientSessionCtx, tx: Tx, options?: TxOptions): Promise<void> {
    try {
      const { broadcastPromise, asyncsPromise } = await this.txRaw(ctx, tx, options?.user)
      await broadcastPromise
      if (asyncsPromise !== undefined) {
        await asyncsPromise
      }
    } catch (err) {
      await ctx.sendError(ctx.requestId, 'Failed to tx', unknownError(err))
      ctx.ctx.error('failed to tx', { err })
    }
  }

  broadcast (ctx: MeasureContext, socket: ConnectionSocket, tx: Tx[], target?: string, exclude?: string[]): void {
    if (tx.length > 10000) {
      const byWorkspace = groupByArray(tx, (it) => it._uuid)
      for (const [uuid, tx] of byWorkspace) {
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
        const bevent = createBroadcastEvent(uuid, Array.from(classes))
        void socket.send(
          ctx,
          {
            result: [bevent],
            target,
            exclude
          },
          this.binaryMode,
          this.useCompression
        )
      }
    } else {
      void socket.send(ctx, { result: tx, target, exclude }, this.binaryMode, this.useCompression)
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

  async loadChunkRaw (
    ctx: ClientSessionCtx,
    workspaceId: WorkspaceUuid,
    domain: Domain,
    idx?: number
  ): Promise<LoadChunkResponse> {
    this.lastRequest = Date.now()
    const workspace = ctx.workspaces.find((it) => it.wsId.uuid === workspaceId)
    if (workspace === undefined) {
      throw new Error('Workspace not found')
    }
    return await workspace.with(async (pipeline, communicationApi) => {
      return await this.getOps(pipeline).loadChunk(ctx.ctx, domain, idx)
    })
  }

  async loadChunk (ctx: ClientSessionCtx, workspaceId: WorkspaceUuid, domain: Domain, idx?: number): Promise<void> {
    try {
      await ctx.sendResponse(ctx.requestId, this.loadChunkRaw(ctx, workspaceId, domain))
    } catch (err: any) {
      await ctx.sendError(ctx.requestId, 'Failed to upload', unknownError(err))
      ctx.ctx.error('failed to loadChunk', { domain, err })
    }
  }

  async getDomainHashRaw (ctx: ClientSessionCtx, workspaceId: WorkspaceUuid, domain: Domain): Promise<string> {
    this.lastRequest = Date.now()
    const workspace = ctx.workspaces.find((it) => it.wsId.uuid === workspaceId)
    if (workspace === undefined) {
      throw new Error('Workspace not found')
    }
    return await workspace.with(async (pipeline, communicationApi) => {
      return await this.getOps(pipeline).getDomainHash(ctx.ctx, domain)
    })
  }

  async getDomainHash (ctx: ClientSessionCtx, workspaceId: WorkspaceUuid, domain: Domain): Promise<void> {
    try {
      await ctx.sendResponse(ctx.requestId, this.getDomainHashRaw(ctx, workspaceId, domain))
    } catch (err: any) {
      await ctx.sendError(ctx.requestId, 'Failed to upload', unknownError(err))
      ctx.ctx.error('failed to getDomainHash', { domain, err })
    }
  }

  async closeChunkRaw (ctx: ClientSessionCtx, workspaceId: WorkspaceUuid, idx: number): Promise<void> {
    this.lastRequest = Date.now()
    const workspace = ctx.workspaces.find((it) => it.wsId.uuid === workspaceId)
    if (workspace === undefined) {
      throw new Error('Workspace not found')
    }
    await workspace.with(async (pipeline, communicationApi) => {
      await this.getOps(pipeline).closeChunk(ctx.ctx, idx)
    })
  }

  async closeChunk (ctx: ClientSessionCtx, workspaceId: WorkspaceUuid, idx: number): Promise<void> {
    try {
      await this.closeChunkRaw(ctx, workspaceId, idx)
      await ctx.sendResponse(ctx.requestId, {})
    } catch (err: any) {
      await ctx.sendError(ctx.requestId, 'Failed to closeChunk', unknownError(err))
      ctx.ctx.error('failed to closeChunk', { err })
    }
  }

  async loadDocsRaw (
    ctx: ClientSessionCtx,
    workspaceId: WorkspaceUuid,
    domain: Domain,
    docs: Ref<Doc>[]
  ): Promise<Doc[]> {
    this.lastRequest = Date.now()

    const workspace = ctx.workspaces.find((it) => it.wsId.uuid === workspaceId)
    if (workspace === undefined) {
      throw new Error('Workspace not found')
    }
    return await workspace.with(async (pipeline, communicationApi) => {
      return await this.getOps(pipeline).loadDocs(ctx.ctx, domain, docs)
    })
  }

  async loadDocs (ctx: ClientSessionCtx, workspaceId: WorkspaceUuid, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    try {
      await ctx.sendResponse(ctx.requestId, await this.loadDocsRaw(ctx, workspaceId, domain, docs))
    } catch (err: any) {
      await ctx.sendError(ctx.requestId, 'Failed to loadDocs', unknownError(err))
      ctx.ctx.error('failed to loadDocs', { domain, err })
    }
  }

  async uploadRaw (ctx: ClientSessionCtx, workspaceId: WorkspaceUuid, domain: Domain, docs: Doc[]): Promise<void> {
    this.lastRequest = Date.now()
    if (!this.allowUpload) {
      return
    }
    const workspace = ctx.workspaces.find((it) => it.wsId.uuid === workspaceId)
    if (workspace === undefined) {
      throw new Error('Workspace not found')
    }
    await workspace.with(async (pipeline, communicationApi) => {
      await this.getOps(pipeline).upload(ctx.ctx, domain, docs)
    })
  }

  async upload (ctx: ClientSessionCtx, workspaceId: WorkspaceUuid, domain: Domain, docs: Doc[]): Promise<void> {
    this.lastRequest = Date.now()
    if (!this.allowUpload) {
      await ctx.sendResponse(ctx.requestId, { error: 'Upload not allowed' })
      return
    }
    try {
      await this.uploadRaw(ctx, workspaceId, domain, docs)
      await ctx.sendResponse(ctx.requestId, {})
    } catch (err: any) {
      await ctx.sendError(ctx.requestId, 'Failed to upload', unknownError(err))
      ctx.ctx.error('failed to loadDocs', { domain, err })
    }
  }

  async cleanRaw (ctx: ClientSessionCtx, workspaceId: WorkspaceUuid, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    this.lastRequest = Date.now()
    if (!this.allowUpload) {
      await ctx.sendResponse(ctx.requestId, { error: 'Clean not allowed' })
      return
    }
    const workspace = ctx.workspaces.find((it) => it.wsId.uuid === workspaceId)
    if (workspace === undefined) {
      throw new Error('Workspace not found')
    }
    await workspace.with(async (pipeline, communicationApi) => {
      await this.getOps(pipeline).clean(ctx.ctx, domain, docs)
    })
  }

  async clean (ctx: ClientSessionCtx, workspaceId: WorkspaceUuid, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    this.lastRequest = Date.now()
    if (!this.allowUpload) {
      await ctx.sendResponse(ctx.requestId, { error: 'Clean not allowed' })
      return
    }
    try {
      await this.cleanRaw(ctx, workspaceId, domain, docs)
      await ctx.sendResponse(ctx.requestId, {})
    } catch (err: any) {
      await ctx.sendError(ctx.requestId, 'Failed to clean', unknownError(err))
      ctx.ctx.error('failed to clean', { domain, err })
    }
  }

  async eventRaw (ctx: ClientSessionCtx, event: CommunicationEvent): Promise<EventResult> {
    this.lastRequest = Date.now()
    const workspace = ctx.workspaces[0]
    return await workspace.with(async (pipeline, communicationApi) => {
      return await communicationApi.event(this.getCommunicationCtx(workspace.wsId), event)
    })
  }

  async event (ctx: ClientSessionCtx, event: CommunicationEvent): Promise<void> {
    const result = await this.eventRaw(ctx, event)
    await ctx.sendResponse(ctx.requestId, result)
  }

  async findMessagesRaw (ctx: ClientSessionCtx, params: FindMessagesParams, queryId?: number): Promise<Message[]> {
    this.lastRequest = Date.now()
    const workspace = ctx.workspaces[0]
    return await workspace.with(async (pipeline, communicationApi) => {
      return await communicationApi.findMessages(this.getCommunicationCtx(workspace.wsId), params, queryId)
    })
  }

  async findMessages (ctx: ClientSessionCtx, params: FindMessagesParams, queryId?: number): Promise<void> {
    const result = await this.findMessagesRaw(ctx, params, queryId)
    await ctx.sendResponse(ctx.requestId, result)
  }

  async findMessagesGroupsRaw (ctx: ClientSessionCtx, params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
    this.lastRequest = Date.now()
    const workspace = ctx.workspaces[0]
    return await workspace.with(async (pipeline, communicationApi) => {
      return await communicationApi.findMessagesGroups(this.getCommunicationCtx(workspace.wsId), params)
    })
  }

  async findMessagesGroups (ctx: ClientSessionCtx, params: FindMessagesGroupsParams): Promise<void> {
    const result = await this.findMessagesGroupsRaw(ctx, params)
    await ctx.sendResponse(ctx.requestId, result)
  }

  async findNotifications (ctx: ClientSessionCtx, params: FindNotificationsParams): Promise<void> {
    const workspace = ctx.workspaces[0]
    await workspace.with(async (pipeline, communicationApi) => {
      const result = await communicationApi.findNotifications(this.getCommunicationCtx(workspace.wsId), params)
      await ctx.sendResponse(ctx.requestId, result)
    })
  }

  async findNotificationContexts (
    ctx: ClientSessionCtx,
    params: FindNotificationContextParams,
    queryId?: number
  ): Promise<void> {
    const workspace = ctx.workspaces[0]
    await workspace.with(async (pipeline, communicationApi) => {
      const result = await communicationApi.findNotificationContexts(
        this.getCommunicationCtx(workspace.wsId),
        params,
        queryId
      )
      await ctx.sendResponse(ctx.requestId, result)
    })
  }

  async findLabels (ctx: ClientSessionCtx, params: FindLabelsParams): Promise<void> {
    const workspace = ctx.workspaces[0]
    await workspace.with(async (pipeline, communicationApi) => {
      const result = await communicationApi.findLabels(this.getCommunicationCtx(workspace.wsId), params)
      await ctx.sendResponse(ctx.requestId, result)
    })
  }

  async findCollaborators (ctx: ClientSessionCtx, params: FindCollaboratorsParams): Promise<void> {
    const workspace = ctx.workspaces[0]
    await workspace.with(async (pipeline, communicationApi) => {
      const result = await communicationApi.findCollaborators(this.getCommunicationCtx(workspace.wsId), params)
      await ctx.sendResponse(ctx.requestId, result)
    })
  }

  async unsubscribeQuery (ctx: ClientSessionCtx, id: number): Promise<void> {
    this.lastRequest = Date.now()
    const workspace = ctx.workspaces[0]
    await workspace.with(async (pipeline, communicationApi) => {
      await communicationApi.unsubscribeQuery(this.getCommunicationCtx(workspace.wsId), id)
      await ctx.sendResponse(ctx.requestId, {})
    })
  }

  private getCommunicationCtx (workspaceId: WorkspaceIds): CommunicationSession {
    return {
      sessionId: this.sessionId,
      account: {
        ...this.account,
        // TODO: Fix me, Undetermined role is missing in communication API
        role: this.account.workspaces[workspaceId.uuid].role ?? this.account.role,
        fullSocialIds: Array.from(this.account.fullSocialIds.values()) // TODO: Fix me, fix types in communication API
      }
    }
  }
}
