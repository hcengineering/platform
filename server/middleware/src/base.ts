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
  Class,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  Ref,
  SearchOptions,
  SearchQuery,
  SearchResult,
  Tx
} from '@hcengineering/core'
import { Middleware, SessionContext, TxMiddlewareResult, type ServerStorage } from '@hcengineering/server-core'

/**
 * @public
 */
export abstract class BaseMiddleware {
  constructor (
    protected readonly storage: ServerStorage,
    protected readonly next?: Middleware
  ) {}

  async findAll<T extends Doc>(
    ctx: SessionContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return await this.provideFindAll(ctx, _class, query, options)
  }

  async searchFulltext (ctx: SessionContext, query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    return await this.provideSearchFulltext(ctx, query, options)
  }

  async handleBroadcast (tx: Tx[], targets?: string | string[], exclude?: string[]): Promise<void> {
    if (this.next !== undefined) {
      await this.next.handleBroadcast(tx, targets, exclude)
    }
  }

  protected async provideTx (ctx: SessionContext, tx: Tx): Promise<TxMiddlewareResult> {
    if (this.next !== undefined) {
      return await this.next.tx(ctx, tx)
    }
    return await this.storage.tx(ctx, tx)
  }

  protected async provideFindAll<T extends Doc>(
    ctx: SessionContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    if (this.next !== undefined) {
      return await this.next.findAll(ctx, _class, query, options)
    }
    return await this.storage.findAll(ctx.ctx, _class, query, options)
  }

  protected async provideSearchFulltext (
    ctx: SessionContext,
    query: SearchQuery,
    options: SearchOptions
  ): Promise<SearchResult> {
    if (this.next !== undefined) {
      return await this.next.searchFulltext(ctx, query, options)
    }
    return await this.storage.searchFulltext(ctx.ctx, query, options)
  }
}
