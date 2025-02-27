//
// Copyright © 2024 Hardcore Engineering Inc.
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
  type Domain,
  FindResult,
  type LoadModelResponse,
  type MeasureContext,
  Ref,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type SessionData,
  type Timestamp,
  type Tx
} from '@hcengineering/core'
import { BaseMiddleware, Middleware, type PipelineContext, ServerFindOptions } from '@hcengineering/server-core'

interface Query {
  key: string
  result: object | Promise<object> | undefined
  callbacks: number
  max: number
}
/**
 * @public
 */
export class QueryJoiner {
  private readonly queries: Map<string, Query> = new Map<string, Query>()

  async query<T>(ctx: MeasureContext, key: string, retrieve: (ctx: MeasureContext) => Promise<T>): Promise<T> {
    // Will find a query or add + 1 to callbacks
    const q = this.getQuery(key)
    try {
      if (q.result === undefined) {
        q.result = retrieve(ctx)
      }
      if (q.result instanceof Promise) {
        q.result = await q.result
      }

      return q.result as T
    } finally {
      q.callbacks--

      this.removeFromQueue(q)
    }
  }

  private getQuery (key: string): Query {
    const query = this.queries.get(key)
    if (query === undefined) {
      const q: Query = {
        key,
        result: undefined,
        callbacks: 1,
        max: 1
      }
      this.queries.set(key, q)
      return q
    }

    query.callbacks++
    query.max++
    return query
  }

  private removeFromQueue (q: Query): void {
    if (q.callbacks === 0) {
      this.queries.delete(q.key)
    }
  }
}

/**
 * @public
 */
export class QueryJoinMiddleware extends BaseMiddleware implements Middleware {
  private readonly joiner: QueryJoiner

  private constructor (context: PipelineContext, next?: Middleware) {
    super(context, next)
    this.joiner = new QueryJoiner()
  }

  loadModel (
    ctx: MeasureContext<SessionData>,
    lastModelTx: Timestamp,
    hash?: string
  ): Promise<Tx[] | LoadModelResponse> {
    return this.joiner.query(ctx, `model-${lastModelTx}${hash ?? ''}`, async (ctx) => {
      return await this.provideLoadModel(ctx, lastModelTx, hash)
    })
  }

  static async create (
    ctx: MeasureContext,
    context: PipelineContext,
    next: Middleware | undefined
  ): Promise<QueryJoinMiddleware> {
    return new QueryJoinMiddleware(context, next)
  }

  override findAll<T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: ServerFindOptions<T>
  ): Promise<FindResult<T>> {
    const opt = { ...options }
    delete opt.ctx
    return this.joiner.query(
      ctx,
      `findAll-${_class}-${JSON.stringify(query)}-${JSON.stringify(options)}`,
      async (ctx) => {
        return await this.provideFindAll(ctx, _class, query, options)
      }
    )
  }

  groupBy<T, P extends Doc>(
    ctx: MeasureContext<SessionData>,
    domain: Domain,
    field: string,
    query?: DocumentQuery<P>
  ): Promise<Map<T, number>> {
    return this.joiner.query(ctx, `groupBy-${domain}-${field}-${JSON.stringify(query ?? {})})`, async (ctx) => {
      return await this.provideGroupBy(ctx, domain, field, query)
    })
  }

  searchFulltext (ctx: MeasureContext<SessionData>, query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    return this.joiner.query(ctx, `searchFulltext-${JSON.stringify(query)}-${JSON.stringify(options)}`, async (ctx) => {
      return await this.provideSearchFulltext(ctx, query, options)
    })
  }
}
