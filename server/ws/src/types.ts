import {
  type Class,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  type MeasureContext,
  type Ref,
  type Tx,
  type WorkspaceId,
  type WorkspaceIdWithUrl,
  type Branding
} from '@hcengineering/core'
import { type Request, type Response } from '@hcengineering/rpc'
import { type BroadcastFunc, type Pipeline, type StorageAdapter } from '@hcengineering/server-core'
import { type Token } from '@hcengineering/server-token'

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

  // target === undefined, send to all except exclude
  // target !== undefined, send to selected target only, exclude is not used.
  send: (msg: Tx[], target?: string, exclude?: string[]) => Promise<void>
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

  measureCtx?: { ctx: MeasureContext, time: number }

  lastRequest: number

  isUpgradeClient: () => boolean

  getMode: () => string
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
export interface ConnectionSocket {
  id: string
  isClosed: boolean
  close: () => void
  send: (ctx: MeasureContext, msg: Response<any>, binary: boolean, compression: boolean) => Promise<number>
  data: () => Record<string, any>
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
  sessions: Map<string, { session: Session, socket: ConnectionSocket }>
  upgrade: boolean
  backup: boolean

  closing?: Promise<void>
  softShutdown: number

  workspaceId: WorkspaceId
  workspaceName: string
  branding: Branding | null
}

export interface AddSessionActive {
  session: Session
  context: MeasureContext
  workspaceId: string
}
export type AddSessionResponse = AddSessionActive | { upgrade: true } | { error: any }

/**
 * @public
 */
export interface SessionManager {
  workspaces: Map<string, Workspace>
  sessions: Map<string, { session: Session, socket: ConnectionSocket }>

  createSession: (token: Token, pipeline: Pipeline) => Session

  addSession: (
    ctx: MeasureContext,
    ws: ConnectionSocket,
    token: Token,
    rawToken: string,
    pipelineFactory: PipelineFactory,
    productId: string,
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
  productId: string,
  enableCompression: boolean,
  accountsUrl: string,
  externalStorage: StorageAdapter
) => () => Promise<void>
