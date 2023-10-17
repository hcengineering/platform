import {
  Class,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  MeasureContext,
  Ref,
  Tx,
  TxResult,
  WorkspaceId
} from '@hcengineering/core'
import { Response } from '@hcengineering/rpc'
import { BroadcastFunc, Pipeline } from '@hcengineering/server-core'
import { Token } from '@hcengineering/server-token'

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

  total: StatisticsElement
  current: StatisticsElement
  mins5: StatisticsElement
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
  ws: WorkspaceId,
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
  id: string
  pipeline: Promise<Pipeline>
  sessions: Map<string, { session: Session, socket: ConnectionSocket }>
  upgrade: boolean
  closing?: Promise<void>
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
    pipelineFactory: PipelineFactory,
    productId: string,
    sessionId?: string
  ) => Promise<Session>

  broadcastAll: (workspace: Workspace, tx: Tx[], targets?: string[]) => void

  close: (
    ctx: MeasureContext,
    ws: ConnectionSocket,
    workspaceId: WorkspaceId,
    code: number,
    reason: string
  ) => Promise<void>

  closeAll: (
    ctx: MeasureContext,
    wsId: string,
    workspace: Workspace,
    code: number,
    reason: 'upgrade' | 'shutdown'
  ) => Promise<void>

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
  enableCompression: boolean
) => () => Promise<void>
