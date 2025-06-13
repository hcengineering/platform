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

import { type RequestEvent as CommunicationEvent, type EventResult } from '@hcengineering/communication-sdk-types'
import {
  type FindMessagesGroupsParams,
  type FindMessagesParams,
  type Message,
  type MessagesGroup
} from '@hcengineering/communication-types'
import {
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
  type SocialId,
  type Timestamp,
  type Tx,
  type TxResult,
  type WorkspaceUuid
} from '@hcengineering/core'
import type { RateLimitInfo, ReqId, Request, Response } from '@hcengineering/rpc'
import type { Token } from '@hcengineering/server-token'

import type { StatisticsElement, WorkspaceStatistics } from '@hcengineering/server-core'
import type { Workspace } from './workspace'

/**
 * @public
 */
export interface SessionRequest {
  id: string
  params: any
  start: number

  workspaceId?: WorkspaceUuid
}

export interface ClientSessionCtx {
  ctx: MeasureContext
  workspaces: Workspace[]
  socialStringsToUsers: Map<PersonId, AccountUuid>
  requestId: ReqId | undefined
  sendResponse: (id: ReqId | undefined, msg: any) => Promise<void>
  sendPong: () => void
  sendError: (id: ReqId | undefined, msg: any, error: any) => Promise<void>

  getAccount: (uuid: AccountUuid) => Account
}

/**
 * @public
 */
export interface Session {
  workspaces: Set<WorkspaceUuid>

  socket: ConnectionSocket
  createTime: number

  // Session restore information
  sessionId: string

  requests: Map<string, SessionRequest>

  binaryMode: boolean
  useCompression: boolean
  total: StatisticsElement
  current: StatisticsElement
  mins5: StatisticsElement

  lastRequest: number
  lastPing: number

  isUpgradeClient: () => boolean

  getMode: () => string

  broadcast: (
    ctx: MeasureContext,
    socket: ConnectionSocket,
    tx: Tx[],
    target?: AccountUuid,
    exclude?: AccountUuid[]
  ) => void

  // Client methods
  ping: (ctx: ClientSessionCtx) => Promise<void>
  getUser: () => AccountUuid

  subscribedUsers: Set<AccountUuid> // A set of accounts a session is listening for

  getUserSocialIds: () => PersonId[]

  getSocialIds: () => SocialId[]

  loadModel: (ctx: ClientSessionCtx, lastModelTx: Timestamp, hash?: string) => Promise<void>
  loadModelRaw: (ctx: ClientSessionCtx, lastModelTx: Timestamp, hash?: string) => Promise<LoadModelResponse | Tx[]>
  getRawAccount: () => Account
  findAll: <T extends Doc>(
    ctx: ClientSessionCtx,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<void>
  findAllRaw: <T extends Doc>(
    ctx: ClientSessionCtx,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>
  searchFulltext: (ctx: ClientSessionCtx, query: SearchQuery, options: SearchOptions) => Promise<void>
  searchFulltextRaw: (ctx: ClientSessionCtx, query: SearchQuery, options: SearchOptions) => Promise<SearchResult>
  tx: (ctx: ClientSessionCtx, tx: Tx) => Promise<void>

  txRaw: (
    ctx: ClientSessionCtx,
    tx: Tx
  ) => Promise<{
    result: TxResult
    broadcastPromise: Promise<void>
    asyncsPromise: Promise<void> | undefined
  }>

  loadChunk: (ctx: ClientSessionCtx, workspaceId: WorkspaceUuid, domain: Domain, idx?: number) => Promise<void>

  getDomainHash: (ctx: ClientSessionCtx, workspaceId: WorkspaceUuid, domain: Domain) => Promise<void>
  closeChunk: (ctx: ClientSessionCtx, workspaceId: WorkspaceUuid, idx: number) => Promise<void>
  loadDocs: (ctx: ClientSessionCtx, workspaceId: WorkspaceUuid, domain: Domain, docs: Ref<Doc>[]) => Promise<void>
  upload: (ctx: ClientSessionCtx, workspaceId: WorkspaceUuid, domain: Domain, docs: Doc[]) => Promise<void>
  clean: (ctx: ClientSessionCtx, workspaceId: WorkspaceUuid, domain: Domain, docs: Ref<Doc>[]) => Promise<void>

  eventRaw: (ctx: ClientSessionCtx, event: CommunicationEvent) => Promise<EventResult>
  findMessagesRaw: (ctx: ClientSessionCtx, params: FindMessagesParams) => Promise<Message[]>
  findMessagesGroupsRaw: (ctx: ClientSessionCtx, params: FindMessagesGroupsParams) => Promise<MessagesGroup[]>
}

/**
 * @public
 */
export interface ConnectionSocket {
  id: string
  isClosed: boolean
  close: () => void
  send: (ctx: MeasureContext, msg: Response<any>, binary: boolean, compression: boolean) => Promise<void>

  sendPong: () => void
  data: () => Record<string, any>

  readRequest: (buffer: Buffer, binary: boolean) => Request<any>

  isBackpressure: () => boolean // In bytes
  backpressure: (ctx: MeasureContext) => Promise<void>
  checkState: () => boolean
}

export interface SessionInfoRecord {
  session: Session
  socket: ConnectionSocket
  tickHash: number
}

/**
 * @public
 */
export interface SessionManager {
  // workspaces: Map<WorkspaceUuid, Workspace>
  sessions: Map<string, SessionInfoRecord>

  addSession: (
    ctx: MeasureContext,
    ws: ConnectionSocket,
    token: Token,
    rawToken: string,
    sessionId: string | undefined
  ) => Promise<Session>

  broadcastAll: (workspace: WorkspaceUuid, tx: Tx[], targets?: AccountUuid[]) => void

  broadcast: (workspaceId: WorkspaceUuid, resp: Tx[], target: AccountUuid | undefined, exclude?: AccountUuid[]) => void

  close: (ctx: MeasureContext, sessionRef: Session) => Promise<void>

  closeWorkspaces: (ctx: MeasureContext) => Promise<void>

  scheduleMaintenance: (timeMinutes: number) => void

  profiling?: {
    start: () => void
    stop: () => Promise<string | undefined>
  }

  handleRequest: (
    requestCtx: MeasureContext,
    service: Session,
    ws: ConnectionSocket,
    request: Request<any>
  ) => Promise<void>

  handleRPC: (
    requestCtx: MeasureContext,
    workspaceId: WorkspaceUuid,
    service: Session,
    ws: ConnectionSocket,
    operation: (ctx: ClientSessionCtx, rateLimit?: RateLimitInfo | undefined) => Promise<void>
  ) => Promise<RateLimitInfo | undefined>

  createOpContext: (
    ctx: MeasureContext,
    sendCtx: MeasureContext,
    workspaces: Workspace[],
    requestId: Request<any>['id'],
    service: Session,
    ws: ConnectionSocket,
    rateLimit: RateLimitInfo | undefined
  ) => ClientSessionCtx

  getStatistics: () => WorkspaceStatistics[]

  forceCloseWorkspace: (ctx: MeasureContext, workspace: WorkspaceUuid) => Promise<void>

  getLastTxHash: (workspaceId: WorkspaceUuid) => Promise<{ lastTx: string | undefined, lastHash: string | undefined }>
}
