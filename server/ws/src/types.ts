import {
  type WorkspaceIdWithUrl,
  type Class,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  type MeasureContext,
  type Ref,
  type Tx,
  type TxResult,
  type WorkspaceId
} from '@hcengineering/core'
import { type Response } from '@hcengineering/rpc'
import { type BroadcastFunc, type Pipeline } from '@hcengineering/server-core'
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
/**
 * @public
 */
export interface Session {
  getUser: () => string
  pipeline: () => Pipeline
  ping: () => Promise<string>
  findAll: <T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>
  tx: (ctx: MeasureContext, tx: Tx) => Promise<TxResult>

  // Session restore information
  sessionId: string
  sessionInstanceId?: string
  workspaceClosed?: boolean

  requests: Map<string, SessionRequest>

  binaryResponseMode: boolean
  useCompression: boolean
  useBroadcast: boolean

  total: StatisticsElement
  current: StatisticsElement
  mins5: StatisticsElement

  measureCtx?: { ctx: MeasureContext, time: number }

  lastRequest: number
}

/**
 * @public
 */
export type BroadcastCall = (
  from: Session | null,
  workspaceId: WorkspaceId,
  resp: Response<any>,
  target?: string[]
) => void

/**
 * @public
 */
export type PipelineFactory = (
  ctx: MeasureContext,
  ws: WorkspaceIdWithUrl,
  upgrade: boolean,
  broadcast: BroadcastFunc
) => Promise<Pipeline>

/**
 * @public
 */
export interface ConnectionSocket {
  id: string
  close: () => void
  send: (ctx: MeasureContext, msg: Response<any>, binary: boolean, compression: boolean) => Promise<void>
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
  closing?: Promise<void>

  workspaceId: WorkspaceId
  workspaceName: string
}

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
  ) => Promise<
  { session: Session, context: MeasureContext, workspaceName: string } | { upgrade: true } | { error: any }
  >

  broadcastAll: (workspace: Workspace, tx: Tx[], targets?: string[]) => void

  close: (ws: ConnectionSocket, workspaceId: WorkspaceId, code: number, reason: string) => Promise<void>

  closeAll: (wsId: string, workspace: Workspace, code: number, reason: 'upgrade' | 'shutdown') => Promise<void>

  closeWorkspaces: (ctx: MeasureContext) => Promise<void>

  broadcast: (from: Session | null, workspaceId: WorkspaceId, resp: Response<any>, target?: string[]) => void

  scheduleMaintenance: (timeMinutes: number) => void
}

/**
 * @public
 */
export type HandleRequestFunction = <S extends Session>(
  rctx: MeasureContext,
  service: S,
  ws: ConnectionSocket,
  msg: Buffer,
  workspace: string
) => Promise<void>

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
  accountsUrl: string
) => () => Promise<void>
