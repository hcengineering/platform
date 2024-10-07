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

import core, {
  type Class,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  type IndexingUpdateEvent,
  type MeasureContext,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type Tx,
  type TxWorkspaceEvent,
  generateId,
  WorkspaceEvent
} from '@hcengineering/core'
import { PlatformError, unknownError } from '@hcengineering/platform'
import type {
  DbConfiguration,
  FullTextAdapter,
  Middleware,
  MiddlewareCreator,
  PipelineContext,
  SessionFindAll,
  TxMiddlewareResult
} from '@hcengineering/server-core'
import { BaseMiddleware, createContentAdapter } from '@hcengineering/server-core'
import type { FulltextDBConfiguration } from '..'
import { FullTextIndex } from '../fulltext'
import { FullTextIndexPipeline } from '../indexer'

/**
 * @public
 */
export class FullTextMiddleware extends BaseMiddleware implements Middleware {
  private fulltext!: FullTextIndex
  private fulltextAdapter?: FullTextAdapter

  constructor (
    context: PipelineContext,
    next: Middleware | undefined,
    readonly conf: DbConfiguration & FulltextDBConfiguration,
    readonly upgrade?: boolean
  ) {
    super(context, next)
  }

  static create (conf: DbConfiguration & FulltextDBConfiguration, upgrade: boolean): MiddlewareCreator {
    return async (ctx, context, next): Promise<Middleware> => {
      const middleware = new FullTextMiddleware(context, next, conf, upgrade)
      await middleware.init(ctx)
      return middleware
    }
  }

  async init (ctx: MeasureContext): Promise<void> {
    if (this.context.adapterManager == null) {
      throw new PlatformError(unknownError('Adapter manager should be specified'))
    }
    if (this.context.storageAdapter == null) {
      throw new PlatformError(unknownError('Storage adapter should be specified'))
    }
    const fullTextCtx = ctx.newChild('🗒️ fulltext', {})
    if (this.conf.fulltextAdapter !== undefined) {
      const fta = this.conf.fulltextAdapter
      this.fulltextAdapter = await fullTextCtx.with(
        'init',
        {},
        async (ctx) => await fta.factory(fta.url, this.context.workspace, fullTextCtx)
      )
    }

    const contentAdapter = await ctx.with('create content adapter', {}, (ctx) =>
      createContentAdapter(
        this.conf.contentAdapters,
        this.conf.defaultContentAdapter,
        this.context.workspace,
        fullTextCtx.newChild('content', {})
      )
    )
    const defaultAdapter = this.context.adapterManager.getDefaultAdapter()
    const findAll: SessionFindAll = (ctx, _class, query, options) => {
      return this.provideFindAll(ctx, _class, query, options)
    }

    // TODO: Extract storage adapter to context
    const stages =
      this.conf.fulltextAdapter !== undefined && this.fulltextAdapter !== undefined
        ? this.conf.fulltextAdapter.stages(this.fulltextAdapter, findAll, this.context.storageAdapter, contentAdapter)
        : []

    const indexer = new FullTextIndexPipeline(
      defaultAdapter,
      stages,
      this.context.hierarchy,
      this.context.workspace,
      fullTextCtx,
      this.context.modelDb,
      (ctx: MeasureContext, classes: Ref<Class<Doc>>[]) => {
        ctx.info('broadcast indexing update', { classes, workspace: this.context.workspace })
        const evt: IndexingUpdateEvent = {
          _class: classes
        }
        const tx: TxWorkspaceEvent = {
          _class: core.class.TxWorkspaceEvent,
          _id: generateId(),
          event: WorkspaceEvent.IndexingUpdate,
          modifiedBy: core.account.System,
          modifiedOn: Date.now(),
          objectSpace: core.space.DerivedTx,
          space: core.space.DerivedTx,
          params: evt
        }
        // Send tx to pipeline
        void this.context.broadcastEvent?.(ctx, [tx])
      }
    )
    this.fulltext = new FullTextIndex(
      this.context.hierarchy,
      this.fulltextAdapter,
      findAll,
      this.context.storageAdapter,
      this.context.workspace,
      indexer,
      this.upgrade ?? false
    )
  }

  findAll<T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    if (query?.$search !== undefined) {
      return ctx.with('fulltext-find-all', {}, (ctx) => this.fulltext.findAll(ctx, _class, query, options))
    }
    return this.provideFindAll(ctx, _class, query, options)
  }

  searchFulltext (ctx: MeasureContext, query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    return ctx.with('full-text-search', {}, (ctx) => {
      return this.fulltext.searchFulltext(ctx, query, options)
    })
  }

  async tx (ctx: MeasureContext, tx: Tx[]): Promise<TxMiddlewareResult> {
    await this.fulltext.tx(ctx, tx)
    return await this.provideTx(ctx, tx)
  }

  async close (): Promise<void> {
    await this.fulltext.close()
    await this.fulltextAdapter?.close()
  }
}
