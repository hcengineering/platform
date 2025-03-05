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

import {
  type AccountUuid,
  type Account,
  type Branding,
  type Class,
  type Doc,
  type DocumentQuery,
  type Domain,
  type FindOptions,
  type FindResult,
  type Hierarchy,
  type LoadModelResponse,
  type LowLevelStorage,
  type MeasureContext,
  type ModelDb,
  type Obj,
  type PersonId,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type SessionData,
  type Space,
  type Timestamp,
  type Tx,
  type TxFactory,
  type TxResult,
  type WorkspaceDataId,
  type WorkspaceIds,
  type WorkspaceUuid
} from '@hcengineering/core'
import type { Asset, Resource } from '@hcengineering/platform'
import type { LiveQuery } from '@hcengineering/query'
import type { ReqId, Request, Response } from '@hcengineering/rpc'
import type { Token } from '@hcengineering/server-token'
import { type Readable } from 'stream'
import type { DbAdapter, DomainHelper } from './adapter'
import type { StatisticsElement } from './stats'
import { type StorageAdapter } from './storage'

export interface ServerFindOptions<T extends Doc> extends FindOptions<T> {
  domain?: Domain // Allow to find for Doc's in specified domain only.
  prefix?: string

  skipClass?: boolean
  skipSpace?: boolean

  domainLookup?: {
    field: string
    domain: Domain
  }

  // using for join query security
  allowedSpaces?: Ref<Space>[]

  // Optional measure context, for server side operations
  ctx?: MeasureContext
}

export type SessionFindAll = <T extends Doc>(
  ctx: MeasureContext<SessionData>,
  _class: Ref<Class<T>>,
  query: DocumentQuery<T>,
  options?: ServerFindOptions<T>
) => Promise<FindResult<T>>

/**
 * @public
 */
export interface Middleware {
  findAll: <T extends Doc>(
    ctx: MeasureContext<SessionData>,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: ServerFindOptions<T>
  ) => Promise<FindResult<T>>
  tx: (ctx: MeasureContext<SessionData>, tx: Tx[]) => Promise<TxResult>

  groupBy: <T, P extends Doc>(
    ctx: MeasureContext<SessionData>,
    domain: Domain,
    field: string,
    query?: DocumentQuery<P>
  ) => Promise<Map<T, number>>
  searchFulltext: (
    ctx: MeasureContext<SessionData>,
    query: SearchQuery,
    options: SearchOptions
  ) => Promise<SearchResult>

  handleBroadcast: (ctx: MeasureContext<SessionData>) => Promise<void>

  loadModel: (
    ctx: MeasureContext<SessionData>,
    lastModelTx: Timestamp,
    hash?: string
  ) => Promise<Tx[] | LoadModelResponse>

  close: () => Promise<void>
}

/**
 * @public
 */
export type BroadcastFunc = (
  ctx: MeasureContext<SessionData>,
  tx: Tx[],
  targets?: string | string[],
  exclude?: string[]
) => void

/**
 * @public
 */
export type MiddlewareCreator = (
  ctx: MeasureContext,
  context: PipelineContext,
  next?: Middleware
) => Promise<Middleware | undefined>

export interface ServiceAdaptersManager {
  getAdapter: (adapterId: string) => ServiceAdapter | undefined
  close: () => Promise<void>
  metrics: () => MeasureContext
}

/**
 * @public
 */
export type TxMiddlewareResult = TxResult

export interface DBAdapterManager {
  getAdapter: (domain: Domain, requireExists: boolean) => DbAdapter

  getAdapterName: (domain: Domain) => string
  getAdapterByName: (name: string, requireExists: boolean) => DbAdapter

  getDefaultAdapter: () => DbAdapter

  close: () => Promise<void>

  registerHelper: (ctx: MeasureContext, helper: DomainHelper) => Promise<void>

  initAdapters: (ctx: MeasureContext) => Promise<void>

  reserveContext: (id: string) => () => void

  domainHelper?: DomainHelper
}

export interface PipelineContext {
  workspace: WorkspaceIds

  lastTx?: string

  lastHash?: string

  hierarchy: Hierarchy
  modelDb: ModelDb
  branding: Branding | null

  adapterManager?: DBAdapterManager
  storageAdapter?: StorageAdapter
  serviceAdapterManager?: ServiceAdaptersManager
  lowLevelStorage?: LowLevelStorage
  liveQuery?: LiveQuery

  // Entry point for derived data procvessing
  derived?: Middleware
  head?: Middleware

  contextVars: Record<string, any>

  broadcastEvent?: (ctx: MeasureContext, tx: Tx[]) => Promise<void>
}
/**
 * @public
 */
export interface Pipeline {
  context: PipelineContext
  findAll: <T extends Doc>(
    ctx: MeasureContext<SessionData>,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>
  searchFulltext: (
    ctx: MeasureContext<SessionData>,
    query: SearchQuery,
    options: SearchOptions
  ) => Promise<SearchResult>
  tx: (ctx: MeasureContext<SessionData>, tx: Tx[]) => Promise<TxResult>
  close: () => Promise<void>

  loadModel: (
    ctx: MeasureContext<SessionData>,
    lastModelTx: Timestamp,
    hash?: string
  ) => Promise<Tx[] | LoadModelResponse>

  handleBroadcast: (ctx: MeasureContext<SessionData>) => Promise<void>
}

/**
 * @public
 */
export type PipelineFactory = (
  ctx: MeasureContext,
  ws: WorkspaceIds,
  upgrade: boolean,
  broadcast: BroadcastFunc,
  branding: Branding | null
) => Promise<Pipeline>

/**
 * @public
 */
export interface TriggerControl {
  ctx: MeasureContext<SessionData>
  workspace: WorkspaceIds
  branding: Branding | null
  txFactory: TxFactory
  findAll: <T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>
  hierarchy: Hierarchy
  lowLevel: LowLevelStorage
  modelDb: ModelDb
  removedMap: Map<Ref<Doc>, Doc>

  // Cache per workspace
  cache: Map<string, any>
  // Cache per root tx
  contextCache: Map<string, any>

  // Since we don't have other storages let's consider adapter is MinioClient
  // Later can be replaced with generic one with bucket encapsulated inside.
  storageAdapter: StorageAdapter
  serviceAdaptersManager: ServiceAdaptersManager
  // Bulk operations in case trigger require some
  apply: (ctx: MeasureContext, tx: Tx[], needResult?: boolean) => Promise<TxResult>

  // Will create a live query if missing and return values immediately if already asked.
  queryFind: <T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>

  // Current set of transactions to being processed for apply/bulks
  txes: Tx[]
}

/**
 * @public
 */
export type TriggerFunc = (tx: Tx[], ctrl: TriggerControl) => Promise<Tx[]>

/**
 * @public
 */
export interface Trigger extends Doc {
  trigger: Resource<TriggerFunc>

  // In case defiled, trigger will be executed asyncronously after transaction will be done, trigger shouod use
  isAsync?: boolean

  // We should match transaction
  txMatch?: DocumentQuery<Tx>
}

/**
 * @public
 */
export interface EmbeddingSearchOption {
  field: string
  field_enable: string
  size?: number
  from?: number
  embeddingBoost?: number // default 100
  fulltextBoost?: number // default 10
  minScore?: number // 75 for example.
}

/**
 * @public
 */
export interface IndexedDoc {
  id: Ref<Doc>
  _class: Ref<Class<Doc>>[]
  space: Ref<Space>
  modifiedOn: Timestamp
  modifiedBy: PersonId
  attachedTo?: Ref<Doc>
  attachedToClass?: Ref<Class<Doc>>
  searchTitle?: string
  searchTitle_fields?: any[]
  searchShortTitle?: string
  searchShortTitle_fields?: any[]
  searchIcon_fields?: any[]
  fulltextSummary?: string
  [key: string]: any
}

/**
 * @public
 */
export interface SearchStringResult {
  docs: IndexedDoc[]
  total?: number
}

/**
 * @public
 */
export interface FullTextAdapter {
  index: (ctx: MeasureContext, workspace: WorkspaceUuid, doc: IndexedDoc) => Promise<TxResult>
  update: (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    id: Ref<Doc>,
    update: Record<string, any>
  ) => Promise<TxResult>
  remove: (ctx: MeasureContext, workspace: WorkspaceUuid, id: Ref<Doc>[]) => Promise<void>

  clean: (ctx: MeasureContext, workspace: WorkspaceUuid) => Promise<void>
  updateMany: (ctx: MeasureContext, workspace: WorkspaceUuid, docs: IndexedDoc[]) => Promise<TxResult[]>
  load: (ctx: MeasureContext, workspace: WorkspaceUuid, docs: Ref<Doc>[]) => Promise<IndexedDoc[]>
  searchString: (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    query: SearchQuery,
    options: SearchOptions & { scoring?: SearchScoring[] }
  ) => Promise<SearchStringResult>

  search: (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    _classes: Ref<Class<Doc>>[],
    search: DocumentQuery<Doc>,
    size: number | undefined,
    from?: number
  ) => Promise<IndexedDoc[]>

  close: () => Promise<void>

  // If no field is provided, will return existing mapping of all dimms.
  initMapping: (ctx: MeasureContext, field?: { key: string, dims: number }) => Promise<boolean>
}

/**
 * @public
 */
export type FullTextAdapterFactory = (url: string) => Promise<FullTextAdapter>

/**
 * @public
 */
export interface ContentTextAdapter {
  content: (ctx: MeasureContext, workspace: WorkspaceUuid, name: string, type: string, doc: Readable) => Promise<string>
}

/**
 * @public
 */
export type ContentTextAdapterFactory = (url: string) => Promise<ContentTextAdapter>

/**
 * @public
 */
export interface WithFind {
  findAll: <T extends Doc>(
    ctx: MeasureContext,
    clazz: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>
}

/**
 * Allow to contribute and find all derived objects for document.
 * @public
 */
export interface ObjectDDParticipant extends Class<Obj> {
  // Collect more items to be deleted if parent document is deleted.
  collectDocs: Resource<ObjectDDParticipantFunc>
}

export type ObjectDDParticipantFunc = (
  doc: Doc,
  hiearachy: Hierarchy,
  findAll: <T extends Doc>(
    clazz: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>
) => Promise<Doc[]>

/**
 * @public
 */
export type SearchPresenterProvider = (
  doc: Doc,
  parent: Doc | undefined,
  space: Space | undefined,
  hierarchy: Hierarchy,
  mode: string
) => string

export type FieldParamKind = 'space' | 'parent'

export type FieldTemplateParam =
  | /* field */ [string]
  | [/* kind */ 'func', /* Presenter function */ Resource<SearchPresenterProvider>, /* mode */ string]
  | [/* kind */ FieldParamKind, /* field */ string]
/**
 * A concationation template, if string just put string, if obj, use source and field name.
 * @public
 */
export type FieldTemplate = /* text */ (string | /* field inject */ FieldTemplateParam)[]
export interface FieldTemplateComponent {
  component?: Resource<any>
  fields?: FieldTemplateParam[] // Extra fields

  template?: FieldTemplate // Primary value in index
  extraFields?: FieldTemplate[] // Additional values in index.
}
/**
 * @public
 */
export interface SearchScoring {
  attr: string
  value: string
  boost: number
}

/**
 * @public
 */
export interface SearchPresenter extends Class<Doc> {
  searchIcon?: Asset
  iconConfig?: FieldTemplateComponent
  title: FieldTemplateComponent | FieldTemplate
  shortTitle?: FieldTemplateComponent | FieldTemplate
  scoring?: SearchScoring[]
}

export interface ServiceAdapter {
  close: () => Promise<void>
  metrics: () => MeasureContext
}

export type ServiceAdapterFactory = (url: string, db: string, context: MeasureContext) => Promise<ServiceAdapter>

export interface ServiceAdapterConfig {
  factory: ServiceAdapterFactory
  db: string
  url: string
}

export interface StorageConfig {
  name: string
  kind: string
  endpoint: string
  port?: number
}

export class NoSuchKeyError extends Error {
  code: string
  constructor (
    msg: string,
    readonly cause?: any
  ) {
    super(msg)
    this.code = 'NoSuchKey'
  }
}

export interface StorageConfiguration {
  default: string
  storages: StorageConfig[]
}

/**
 * @public
 */
export interface SessionRequest {
  id: string
  params: any
  start: number
}

export interface ClientSessionCtx {
  ctx: MeasureContext

  pipeline: Pipeline
  socialStringsToUsers: Map<PersonId, AccountUuid>
  requestId: ReqId | undefined
  sendResponse: (id: ReqId | undefined, msg: any) => Promise<void>
  sendPong: () => void
  sendError: (id: ReqId | undefined, msg: any, error: any) => Promise<void>
}

/**
 * @public
 */
export interface Session {
  workspace: Workspace
  createTime: number

  // Session restore information
  sessionId: string
  sessionInstanceId?: string
  workspaceClosed?: boolean

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

  broadcast: (ctx: MeasureContext, socket: ConnectionSocket, tx: Tx[]) => void

  // Client methods
  ping: (ctx: ClientSessionCtx) => Promise<void>
  getUser: () => AccountUuid
  getUserSocialIds: () => PersonId[]

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

  loadChunk: (ctx: ClientSessionCtx, domain: Domain, idx?: number) => Promise<void>

  getDomainHash: (ctx: ClientSessionCtx, domain: Domain) => Promise<void>
  closeChunk: (ctx: ClientSessionCtx, idx: number) => Promise<void>
  loadDocs: (ctx: ClientSessionCtx, domain: Domain, docs: Ref<Doc>[]) => Promise<void>
  upload: (ctx: ClientSessionCtx, domain: Domain, docs: Doc[]) => Promise<void>
  clean: (ctx: ClientSessionCtx, domain: Domain, docs: Ref<Doc>[]) => Promise<void>

  includeSessionContext: (ctx: ClientSessionCtx) => void
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

/**
 * @public
 */
export let LOGGING_ENABLED = true

/**
 * @public
 */
export function disableLogging (): void {
  LOGGING_ENABLED = false
}

interface TickHandler {
  ticks: number
  operation: () => void
}

/**
 * @public
 */
export interface Workspace {
  context: MeasureContext
  id: string
  token: string // Account workspace update token.
  pipeline: Promise<Pipeline> | Pipeline
  tickHash: number

  tickHandlers: Map<string, TickHandler>

  sessions: Map<string, { session: Session, socket: ConnectionSocket, tickHash: number }>
  upgrade: boolean

  closing?: Promise<void>
  softShutdown: number
  workspaceInitCompleted: boolean

  workspaceName: string
  workspaceUuid: WorkspaceUuid
  workspaceUrl: string
  workspaceDataId?: WorkspaceDataId
  branding: Branding | null
}

export interface AddSessionActive {
  session: Session
  context: MeasureContext
  workspaceId: WorkspaceUuid
}

export type AddSessionResponse =
  | AddSessionActive
  | { upgrade: true, progress?: number }
  | { error: any, terminate?: boolean, specialError?: 'archived' | 'migration' }

export type SessionFactory = (token: Token, workspace: Workspace, account: Account) => Session

/**
 * @public
 */
export interface SessionManager {
  workspaces: Map<WorkspaceUuid, Workspace>
  sessions: Map<string, { session: Session, socket: ConnectionSocket }>

  createSession: SessionFactory

  addSession: (
    ctx: MeasureContext,
    ws: ConnectionSocket,
    token: Token,
    rawToken: string,
    pipelineFactory: PipelineFactory,
    sessionId: string | undefined
  ) => Promise<AddSessionResponse>

  broadcastAll: (workspace: Workspace, tx: Tx[], targets?: string[]) => void

  close: (ctx: MeasureContext, ws: ConnectionSocket, workspaceId: WorkspaceUuid) => Promise<void>

  closeAll: (
    wsId: WorkspaceUuid,
    workspace: Workspace,
    code: number,
    reason: 'upgrade' | 'shutdown',
    ignoreSocket?: ConnectionSocket
  ) => Promise<void>

  forceClose: (wsId: WorkspaceUuid, ignoreSocket?: ConnectionSocket) => Promise<void>

  closeWorkspaces: (ctx: MeasureContext) => Promise<void>

  scheduleMaintenance: (timeMinutes: number) => void

  profiling?: {
    start: () => void
    stop: () => Promise<string | undefined>
  }

  handleRequest: <S extends Session>(
    requestCtx: MeasureContext,
    service: S,
    ws: ConnectionSocket,
    request: Request<any>,
    workspace: WorkspaceUuid
  ) => Promise<void>
  handleRPC: <S extends Session>(
    requestCtx: MeasureContext,
    service: S,
    ws: ConnectionSocket,
    operation: (ctx: ClientSessionCtx) => Promise<void>
  ) => Promise<void>

  createOpContext: (
    ctx: MeasureContext,
    sendCtx: MeasureContext,
    pipeline: Pipeline,
    requestId: Request<any>['id'],
    service: Session,
    ws: ConnectionSocket
  ) => ClientSessionCtx
}

/**
 * @public
 */
export type HandleRequestFunction = <S extends Session>(
  rctx: MeasureContext,
  service: S,
  ws: ConnectionSocket,
  msg: Request<any>,
  workspaceId: WorkspaceUuid
) => void

/**
 * @public
 */

export type ServerFactory = (
  sessions: SessionManager,
  handleRequest: HandleRequestFunction,
  ctx: MeasureContext,
  pipelineFactory: PipelineFactory,
  port: number,
  accountsUrl: string,
  externalStorage: StorageAdapter
) => () => Promise<void>

export const pingConst = 'ping'
export const pongConst = 'pong!'
