import { Class, Doc, DocumentQuery, FindOptions, FindResult, MeasureContext, Ref, Tx, TxResult } from '@anticrm/core'
import { Response } from '@anticrm/platform'
import { Pipeline } from '@anticrm/server-core'

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
export type BroadcastCall = (from: Session | null, workspaceId: string, resp: Response<any>, target?: string) => void
