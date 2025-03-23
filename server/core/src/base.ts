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
  toFindResult,
  type Tx
} from '@hcengineering/core'
import type { Middleware, PipelineContext, TxMiddlewareResult } from './types'

export const emptyFindResult = Promise.resolve(toFindResult([]))
export const emptySearchResult = Promise.resolve({ docs: [], total: 0 })
export const emptyTxResult = Promise.resolve<TxMiddlewareResult>({})

export const emptyBroadcastResult = Promise.resolve()
export const emptyModelResult = Promise.resolve<Tx[]>([])
/**
 * @public
 */
export abstract class BaseMiddleware implements Middleware {
  protected constructor (
    readonly context: PipelineContext,
    protected readonly next?: Middleware
  ) {}

  findAll<T extends Doc>(
    ctx: MeasureContext<SessionData>,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return this.provideFindAll(ctx, _class, query, options)
  }

  provideLoadModel (
    ctx: MeasureContext<SessionData>,
    lastModelTx: Timestamp,
    hash?: string
  ): Promise<Tx[] | LoadModelResponse> {
    return this.next?.loadModel(ctx, lastModelTx, hash) ?? emptyModelResult
  }

  loadModel (
    ctx: MeasureContext<SessionData>,
    lastModelTx: Timestamp,
    hash?: string
  ): Promise<Tx[] | LoadModelResponse> {
    return this.provideLoadModel(ctx, lastModelTx, hash)
  }

  provideGroupBy<T, P extends Doc>(
    ctx: MeasureContext<SessionData>,
    domain: Domain,
    field: string,
    query?: DocumentQuery<P>
  ): Promise<Map<T, number>> {
    if (this.next !== undefined) {
      return this.next.groupBy(ctx, domain, field, query)
    }
    return Promise.resolve(new Map<T, number>())
  }

  async close (): Promise<void> {}

  groupBy<T, P extends Doc>(
    ctx: MeasureContext<SessionData>,
    domain: Domain,
    field: string,
    query?: DocumentQuery<P>
  ): Promise<Map<T, number>> {
    return this.provideGroupBy(ctx, domain, field, query)
  }

  searchFulltext (ctx: MeasureContext<SessionData>, query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    return this.provideSearchFulltext(ctx, query, options)
  }

  handleBroadcast (ctx: MeasureContext<SessionData>): Promise<void> {
    return this.next?.handleBroadcast(ctx) ?? emptyBroadcastResult
  }

  provideBroadcast (ctx: MeasureContext<SessionData>): Promise<void> {
    return this.next?.handleBroadcast(ctx) ?? emptyBroadcastResult
  }

  protected provideTx (ctx: MeasureContext<SessionData>, tx: Tx[]): Promise<TxMiddlewareResult> {
    if (this.next !== undefined) {
      return this.next.tx(ctx, tx)
    }
    return emptyTxResult
  }

  tx (ctx: MeasureContext, tx: Tx[]): Promise<TxMiddlewareResult> {
    return this.provideTx(ctx, tx)
  }

  protected provideFindAll<T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    if (this.next !== undefined) {
      return this.next.findAll(ctx, _class, query, options)
    }
    return emptyFindResult
  }

  protected provideSearchFulltext (
    ctx: MeasureContext,
    query: SearchQuery,
    options: SearchOptions
  ): Promise<SearchResult> {
    if (this.next !== undefined) {
      return this.next.searchFulltext(ctx, query, options)
    }
    return emptySearchResult
  }
}
