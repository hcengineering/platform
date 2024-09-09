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
  type Client,
  type Doc,
  type Hierarchy,
  type MeasureContext,
  type ModelDb,
  type SearchOptions,
  type SearchQuery,
  type Tx,
  toFindResult
} from '@hcengineering/core'
import { LiveQuery as LQ } from '@hcengineering/query'
import { BaseMiddleware } from '@hcengineering/server-core'
import type { Middleware, PipelineContext, ServerFindOptions, TxMiddlewareResult } from '@hcengineering/server-core'

/**
 * @public
 */
export class LiveQueryMiddleware extends BaseMiddleware implements Middleware {
  liveQuery: LQ

  constructor (metrics: MeasureContext, context: PipelineContext, next?: Middleware) {
    super(context, next)
    this.liveQuery = new LQ(this.newCastClient(context.hierarchy, context.modelDb, metrics))
    this.context.liveQuery = this.liveQuery
  }

  private newCastClient (hierarchy: Hierarchy, modelDb: ModelDb, metrics: MeasureContext): Client {
    return {
      getHierarchy (): Hierarchy {
        return hierarchy
      },
      getModel (): ModelDb {
        return modelDb
      },
      close: async () => {},
      findAll: async (_class, query, options) => {
        const _ctx: MeasureContext = (options as ServerFindOptions<Doc>)?.ctx ?? metrics
        delete (options as ServerFindOptions<Doc>)?.ctx

        const results = await this.findAll(_ctx, _class, query, options)
        return toFindResult(
          results.map((v) => {
            return this.context.hierarchy.updateLookupMixin(_class, v, options)
          }),
          results.total
        )
      },
      findOne: async (_class, query, options) => {
        const _ctx: MeasureContext = (options as ServerFindOptions<Doc>)?.ctx ?? metrics
        delete (options as ServerFindOptions<Doc>)?.ctx

        const results = await this.findAll(_ctx, _class, query, { ...options, limit: 1 })
        return toFindResult(
          results.map((v) => {
            return this.context.hierarchy.updateLookupMixin(_class, v, options)
          }),
          results.total
        )[0]
      },
      tx: async (tx) => {
        return {}
      },
      searchFulltext: async (query: SearchQuery, options: SearchOptions) => {
        // Cast client doesn't support fulltext search
        return { docs: [] }
      }
    }
  }

  static async create (ctx: MeasureContext, context: PipelineContext, next?: Middleware): Promise<LiveQueryMiddleware> {
    // we need to init triggers from model first.
    return new LiveQueryMiddleware(ctx, context, next)
  }

  async tx (ctx: MeasureContext, tx: Tx[]): Promise<TxMiddlewareResult> {
    for (const _tx of tx) {
      await this.liveQuery.tx(_tx)
    }
    return await this.provideTx(ctx, tx)
  }
}
