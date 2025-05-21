import core, {
  generateId,
  toFindResult,
  type Class,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  type MeasureContext,
  type Ref,
  type SessionData,
  type Tx
} from '@hcengineering/core'
import {
  BaseMiddleware,
  type Middleware,
  type MiddlewareCreator,
  type PipelineContext,
  type TxMiddlewareResult
} from '@hcengineering/server-core'

export class CollectMiddleware extends BaseMiddleware {
  constructor (
    ctx: MeasureContext,
    readonly context: PipelineContext,
    protected readonly next: Middleware | undefined
  ) {
    super(context, next)
  }

  static create (): MiddlewareCreator {
    return async (ctx, context, next) => {
      return new CollectMiddleware(ctx, context, next)
    }
  }

  async tx (ctx: MeasureContext, tx: Tx[]): Promise<TxMiddlewareResult> {
    return {}
  }

  async findAll<T extends Doc>(
    ctx: MeasureContext<SessionData>,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return toFindResult([
      {
        _class,
        _id: generateId(),
        _uuid: this.context.workspace.uuid,
        modifiedBy: core.account.System,
        modifiedOn: Date.now(),
        space: core.space.DerivedTx,
        query,
        options
      } as any
    ])
  }
}
