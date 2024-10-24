import { generateId, type MeasureContext, type Tx } from '@hcengineering/core'
import {
  BaseMiddleware,
  type Middleware,
  type PipelineContext,
  type TxMiddlewareResult
} from '@hcengineering/server-core'

/**
 * Will support apply tx
 * @public
 */
export class ConnectionMgrMiddleware extends BaseMiddleware implements Middleware {
  static async create (
    ctx: MeasureContext,
    context: PipelineContext,
    next?: Middleware
  ): Promise<Middleware | undefined> {
    return new ConnectionMgrMiddleware(context, next)
  }

  async tx (ctx: MeasureContext, tx: Tx[]): Promise<TxMiddlewareResult> {
    if (ctx.id === undefined) {
      ctx.id = generateId()
    }
    const result = await this.provideTx(ctx, tx)
    this.context.endContext = async (_ctx: MeasureContext) => {
      await this.context.adapterManager?.closeContext?.(ctx)
    }
    return result
  }
}
