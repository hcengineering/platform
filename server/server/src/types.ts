import {
  type Branding,
  type Class,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  type MeasureContext,
  type Ref,
  type Tx,
  type WorkspaceId,
  type WorkspaceIdWithUrl
} from '@hcengineering/core'
import { type Request, type Response } from '@hcengineering/rpc'
import { type Pipeline, type PipelineFactory, type StorageAdapter } from '@hcengineering/server-core'
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
