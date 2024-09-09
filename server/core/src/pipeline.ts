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

import { Analytics } from '@hcengineering/analytics'
import {
  toFindResult,
  type Class,
  type Doc,
  type DocumentQuery,
  type Domain,
  type FindOptions,
  type FindResult,
  type LoadModelResponse,
  type MeasureContext,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type SessionData,
  type Timestamp,
  type Tx,
  type TxResult
} from '@hcengineering/core'
import { emptyBroadcastResult } from './base'
import { type Middleware, type MiddlewareCreator, type Pipeline, type PipelineContext } from './types'

/**
 * @public
 */
export async function createPipeline (
  ctx: MeasureContext,
  constructors: MiddlewareCreator[],
  context: PipelineContext
): Promise<Pipeline> {
  return await PipelineImpl.create(ctx.newChild('pipeline-operations', {}), constructors, context)
}

class PipelineImpl implements Pipeline {
  private head: Middleware | undefined

  private readonly middlewares: Middleware[] = []

  private constructor (readonly context: PipelineContext) {}

  static async create (
    ctx: MeasureContext,
    constructors: MiddlewareCreator[],
    context: PipelineContext
  ): Promise<PipelineImpl> {
    const pipeline = new PipelineImpl(context)

    pipeline.head = await pipeline.buildChain(ctx, constructors, pipeline.context)
    context.head = pipeline.head
    return pipeline
  }

  private async buildChain (
    ctx: MeasureContext,
    constructors: MiddlewareCreator[],
    context: PipelineContext
  ): Promise<Middleware | undefined> {
    let current: Middleware | undefined
    for (let index = constructors.length - 1; index >= 0; index--) {
      const element = constructors[index]
      const newCur = await element(ctx, context, current)
      if (newCur != null) {
        this.middlewares.push(newCur)
      }
      current = newCur ?? current
    }
    this.middlewares.reverse()

    return current
  }

  async findAll<T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return this.head !== undefined ? await this.head.findAll(ctx, _class, query, options) : toFindResult([])
  }

  async loadModel (ctx: MeasureContext, lastModelTx: Timestamp, hash?: string): Promise<Tx[] | LoadModelResponse> {
    return this.head !== undefined ? await this.head.loadModel(ctx, lastModelTx, hash) : []
  }

  async groupBy<T>(ctx: MeasureContext, domain: Domain, field: string): Promise<Set<T>> {
    return this.head !== undefined ? await this.head.groupBy(ctx, domain, field) : new Set()
  }

  async searchFulltext (ctx: MeasureContext, query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    return this.head !== undefined ? await this.head.searchFulltext(ctx, query, options) : { docs: [] }
  }

  async tx (ctx: MeasureContext, tx: Tx[]): Promise<TxResult> {
    if (this.head !== undefined) {
      return await this.head.tx(ctx, tx)
    }
    return {}
  }

  handleBroadcast (ctx: MeasureContext<SessionData>): Promise<void> {
    return this.head?.handleBroadcast(ctx) ?? emptyBroadcastResult
  }

  async close (): Promise<void> {
    for (const mw of this.middlewares) {
      try {
        await mw.close()
      } catch (err: any) {
        Analytics.handleError(err)
      }
    }
  }
}
