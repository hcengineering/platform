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
}

/**
 * @public
 */
export type BroadcastCall = (
  from: Session | null,
  workspaceId: WorkspaceId,
  resp: Response<any>,
  target?: string
) => void

/**
 * @public
 */
export type PipelineFactory = (ws: WorkspaceId, upgrade: boolean, broadcast: (tx: Tx[]) => void) => Promise<Pipeline>
