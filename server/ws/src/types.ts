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
import { Response } from '@hcengineering/platform'
import { Pipeline } from '@hcengineering/server-core'
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
  sessionId?: string
  sessionInstanceId?: string
  closeTimeout?: any
  workspaceClosed?: boolean

  requests: Map<string, SessionRequest>
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
  broadcast: (tx: Tx[]) => void
) => Promise<Pipeline>

/**
 * @public
 */
export interface ConnectionSocket {
  id: string
  close: () => void
  send: (ctx: MeasureContext, msg: Response<any>) => Promise<void>
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
  sessions: [Session, ConnectionSocket][]
  upgrade: boolean
  closing?: Promise<void>
}

/**
 * @public
 */
export interface SessionManager {
  workspaces: Map<string, Workspace>

  createSession: (token: Token, pipeline: Pipeline) => Session

  addSession: (
    ctx: MeasureContext,
    ws: ConnectionSocket,
    token: Token,
    pipelineFactory: PipelineFactory,
    productId: string,
    sessionId?: string
  ) => Promise<Session>

  broadcastAll: (workspace: Workspace, tx: Tx[]) => void

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
}

/**
 * @public
 */
export type HandleRequestFunction = <S extends Session>(
  rctx: MeasureContext,
  service: S,
  ws: ConnectionSocket,
  msg: string,
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
  productId: string
) => () => Promise<void>
