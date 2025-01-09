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
  withContext,
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

  @withContext('build-chain')
  private async buildChain (
    ctx: MeasureContext,
    constructors: MiddlewareCreator[],
    context: PipelineContext
  ): Promise<Middleware | undefined> {
    let current: Middleware | undefined
    for (let index = constructors.length - 1; index >= 0; index--) {
      const element = constructors[index]
      try {
        const newCur = await element(ctx, context, current)
        if (newCur != null) {
          this.middlewares.push(newCur)
        }
        current = newCur ?? current
      } catch (err: any) {
        ctx.error('failed to initialize pipeline', { err, workspace: context.workspace.name })
        // We need to call close for all items.
        await this.close()
        throw err
      }
    }
    this.middlewares.reverse()

    return current
  }

  findAll<T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return this.head !== undefined ? this.head.findAll(ctx, _class, query, options) : Promise.resolve(toFindResult([]))
  }

  loadModel (ctx: MeasureContext, lastModelTx: Timestamp, hash?: string): Promise<Tx[] | LoadModelResponse> {
    return this.head !== undefined ? this.head.loadModel(ctx, lastModelTx, hash) : Promise.resolve([])
  }

  groupBy<T, P extends Doc>(
    ctx: MeasureContext,
    domain: Domain,
    field: string,
    query?: DocumentQuery<P>
  ): Promise<Map<T, number>> {
    return this.head !== undefined ? this.head.groupBy(ctx, domain, field, query) : Promise.resolve(new Map())
  }

  searchFulltext (ctx: MeasureContext, query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    return this.head !== undefined ? this.head.searchFulltext(ctx, query, options) : Promise.resolve({ docs: [] })
  }

  tx (ctx: MeasureContext, tx: Tx[]): Promise<TxResult> {
    if (this.head !== undefined) {
      return this.head.tx(ctx, tx)
    }
    return Promise.resolve({})
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
