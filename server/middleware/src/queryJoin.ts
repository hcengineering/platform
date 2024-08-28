//
// Copyright © 2022 Hardcore Engineering Inc.
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
  type Class,
  type Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  type MeasureContext,
  Ref,
  type Tx
} from '@hcengineering/core'
import { Middleware, type ServerStorage, SessionContext, TxMiddlewareResult } from '@hcengineering/server-core'
import { BaseMiddleware } from './base'

import { QueryJoiner } from '@hcengineering/server-core'

/**
 * @public
 */
export class QueryJoinMiddleware extends BaseMiddleware implements Middleware {
  private readonly joiner: QueryJoiner

  private constructor (storage: ServerStorage, next?: Middleware) {
    super(storage, next)
    this.joiner = new QueryJoiner((ctx, _class, query, options) => {
      return storage.findAll(ctx, _class, query, options)
    })
  }

  static async create (ctx: MeasureContext, storage: ServerStorage, next?: Middleware): Promise<QueryJoinMiddleware> {
    return new QueryJoinMiddleware(storage, next)
  }

  async tx (ctx: SessionContext, tx: Tx): Promise<TxMiddlewareResult> {
    return await this.provideTx(ctx, tx)
  }

  override async findAll<T extends Doc>(
    ctx: SessionContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    // Will find a query or add + 1 to callbacks
    return await this.joiner.findAll(ctx.ctx, _class, query, options)
  }
}
