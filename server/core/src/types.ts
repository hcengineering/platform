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
  MeasureMetricsContext,
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
  type WorkspaceId,
  type WorkspaceIdWithUrl
} from '@hcengineering/core'
import type { Asset, Resource } from '@hcengineering/platform'
import type { LiveQuery } from '@hcengineering/query'
import type { Request, Response } from '@hcengineering/rpc'
import type { Token } from '@hcengineering/server-token'
import { type Readable } from 'stream'
import type { DbAdapter, DomainHelper } from './adapter'
import { type StorageAdapter } from './storage'

export interface ServerFindOptions<T extends Doc> extends FindOptions<T> {
  domain?: Domain // Allow to find for Doc's in specified domain only.
  prefix?: string

  skipClass?: boolean
  skipSpace?: boolean

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

  groupBy: <T>(ctx: MeasureContext<SessionData>, domain: Domain, field: string) => Promise<Set<T>>
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

  getDefaultAdapter: () => DbAdapter

  close: () => Promise<void>

  registerHelper: (helper: DomainHelper) => Promise<void>

  initAdapters: (ctx: MeasureContext) => Promise<void>
}

export interface PipelineContext {
  workspace: WorkspaceIdWithUrl
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
  ws: WorkspaceIdWithUrl,
  upgrade: boolean,
  broadcast: BroadcastFunc,
  branding: Branding | null
) => Promise<Pipeline>

/**
 * @public
 */
export interface TriggerControl {
  ctx: MeasureContext<SessionData>
  workspace: WorkspaceIdWithUrl
  branding: Branding | null
  txFactory: TxFactory
  findAll: <T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>
  hierarchy: Hierarchy
  modelDb: ModelDb
  removedMap: Map<Ref<Doc>, Doc>

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
export type TriggerFunc = (tx: Tx | Tx[], ctrl: TriggerControl) => Promise<Tx[]>

/**
 * @public
 */
export interface Trigger extends Doc {
  trigger: Resource<TriggerFunc>

  // In case defiled, trigger will be executed asyncronously after transaction will be done, trigger shouod use
  isAsync?: boolean

  // We should match transaction
  txMatch?: DocumentQuery<Tx>

  // If set trigger will handle Tx[] instead of Tx
  arrays?: boolean
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
  space: Ref<Space>[]
  modifiedOn: Timestamp
  modifiedBy: Ref<Account>
  attachedTo?: Ref<Doc>
  attachedToClass?: Ref<Class<Doc>>
  searchTitle?: string
  searchShortTitle?: string
  searchIcon?: any
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
  index: (doc: IndexedDoc) => Promise<TxResult>
  update: (id: Ref<Doc>, update: Record<string, any>) => Promise<TxResult>
  remove: (id: Ref<Doc>[]) => Promise<void>
  updateMany: (docs: IndexedDoc[]) => Promise<TxResult[]>

  searchString: (
    query: SearchQuery,
    options: SearchOptions & { scoring?: SearchScoring[] }
  ) => Promise<SearchStringResult>

  search: (
    _classes: Ref<Class<Doc>>[],
    search: DocumentQuery<Doc>,
    size: number | undefined,
    from?: number
  ) => Promise<IndexedDoc[]>

  searchEmbedding: (
    _classes: Ref<Class<Doc>>[],
    search: DocumentQuery<Doc>,
    embedding: number[],
    options: EmbeddingSearchOption
  ) => Promise<IndexedDoc[]>

  close: () => Promise<void>
  metrics: () => MeasureContext

  // If no field is provided, will return existing mapping of all dimms.
  initMapping: (field?: { key: string, dims: number }) => Promise<Record<string, number>>

  load: (docs: Ref<Doc>[]) => Promise<IndexedDoc[]>
}

/**
 * @public
 */
export class DummyFullTextAdapter implements FullTextAdapter {
  async initMapping (field?: { key: string, dims: number }): Promise<Record<string, number>> {
    return {}
  }

  async index (doc: IndexedDoc): Promise<TxResult> {
    return {}
  }

  async load (docs: Ref<Doc>[]): Promise<IndexedDoc[]> {
    return []
  }

  async update (id: Ref<Doc>, update: Record<string, any>): Promise<TxResult> {
    return {}
  }

  async updateMany (docs: IndexedDoc[]): Promise<TxResult[]> {
    return []
  }

  async searchString (query: SearchQuery, options: SearchOptions): Promise<SearchStringResult> {
    return { docs: [] }
  }

  async search (query: any): Promise<IndexedDoc[]> {
    return []
  }

  async searchEmbedding (
    _classes: Ref<Class<Doc>>[],
    search: DocumentQuery<Doc>,
    embedding: number[],
    options: EmbeddingSearchOption
  ): Promise<IndexedDoc[]> {
    return []
  }

  async remove (id: Ref<Doc>[]): Promise<void> {}

  async close (): Promise<void> {}

  metrics (): MeasureContext {
    return new MeasureMetricsContext('', {}, {})
  }
}

/**
 * @public
 */
export type FullTextAdapterFactory = (
  url: string,
  workspace: WorkspaceId,
  context: MeasureContext
) => Promise<FullTextAdapter>

/**
 * @public
 */
export interface ContentTextAdapter {
  content: (name: string, type: string, doc: Readable) => Promise<string>
  metrics: () => MeasureContext
}

/**
 * @public
 */
export type ContentTextAdapterFactory = (
  url: string,
  workspace: WorkspaceId,
  context: MeasureContext
) => Promise<ContentTextAdapter>

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
export type SearchProps = Record<string, string>

/**
 * @public
 */
export type SearchPresenterProvider = (hierarchy: Hierarchy, props: SearchProps) => string
/**
 * @public
 */
export type SearchPresenterFunc = Record<string, Resource<SearchPresenterProvider>>

/**
 * @public
 */
export type ClassSearchConfigProps = string | Record<string, string[]>

/**
 * @public
 */
export type ClassSearchConfigProperty = string | { tmpl?: string, props: ClassSearchConfigProps[] }

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
export interface ClassSearchConfig {
  icon?: Asset
  iconConfig?: { component: any, props: ClassSearchConfigProps[] }
  title: ClassSearchConfigProperty
  shortTitle?: ClassSearchConfigProperty
  scoring?: SearchScoring[]
}

/**
 * @public
 */
export interface SearchPresenter extends Class<Doc> {
  searchConfig: ClassSearchConfig
  getSearchShortTitle?: SearchPresenterFunc
  getSearchTitle?: SearchPresenterFunc
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

/**
 * @public
 */
export interface StatisticsElement {
  find: number
  tx: number
}

export interface ClientSessionCtx {
  ctx: MeasureContext
  sendResponse: (msg: any) => Promise<void>
  sendError: (msg: any, error: any) => Promise<void>
}

/**
 * @public
 */
export interface Session {
  createTime: number
  getUser: () => string
  pipeline: () => Pipeline
  ping: (ctx: ClientSessionCtx) => Promise<void>
  findAll: <T extends Doc>(
    ctx: ClientSessionCtx,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<void>
  findAllRaw: <T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>
  tx: (ctx: ClientSessionCtx, tx: Tx) => Promise<void>

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
}

/**
 * @public
 */
export interface ConnectionSocket {
  id: string
  isClosed: boolean
  close: () => void
  send: (ctx: MeasureContext, msg: Response<any>, binary: boolean, compression: boolean) => void
  data: () => Record<string, any>

  readRequest: (buffer: Buffer, binary: boolean) => Request<any>

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

/**
 * @public
 */
export interface Workspace {
  context: MeasureContext
  id: string
  pipeline: Promise<Pipeline>
  sessions: Map<string, { session: Session, socket: ConnectionSocket, tickHash: number }>
  upgrade: boolean

  closing?: Promise<void>
  softShutdown: number
  workspaceInitCompleted: boolean

  workspaceId: WorkspaceId
  workspaceName: string
  branding: Branding | null
}

export interface AddSessionActive {
  session: Session
  context: MeasureContext
  workspaceId: string
}
export type AddSessionResponse = AddSessionActive | { upgrade: true } | { error: any, terminate?: boolean }

/**
 * @public
 */
export interface SessionManager {
  workspaces: Map<string, Workspace>
  sessions: Map<string, { session: Session, socket: ConnectionSocket }>

  createSession: (
    token: Token,
    pipeline: Pipeline,
    workspaceId: WorkspaceIdWithUrl,
    branding: Branding | null
  ) => Session

  addSession: (
    ctx: MeasureContext,
    ws: ConnectionSocket,
    token: Token,
    rawToken: string,
    pipelineFactory: PipelineFactory,
    sessionId: string | undefined,
    accountsUrl: string
  ) => Promise<AddSessionResponse>

  broadcastAll: (workspace: Workspace, tx: Tx[], targets?: string[]) => void

  close: (ctx: MeasureContext, ws: ConnectionSocket, workspaceId: string) => Promise<void>

  closeAll: (
    wsId: string,
    workspace: Workspace,
    code: number,
    reason: 'upgrade' | 'shutdown',
    ignoreSocket?: ConnectionSocket
  ) => Promise<void>

  forceClose: (wsId: string, ignoreSocket?: ConnectionSocket) => Promise<void>

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
    workspace: string // wsId, toWorkspaceString()
  ) => void
}

/**
 * @public
 */
export type HandleRequestFunction = <S extends Session>(
  rctx: MeasureContext,
  service: S,
  ws: ConnectionSocket,
  msg: Request<any>,
  workspaceId: string
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
  enableCompression: boolean,
  accountsUrl: string,
  externalStorage: StorageAdapter
) => () => Promise<void>
