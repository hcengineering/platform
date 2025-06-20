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
  type DocumentQuery,
  type Domain,
  type FindOptions,
  type FindResult,
  type MeasureContext,
  type Ref,
  type SessionData,
  DOMAIN_MODEL
} from '@hcengineering/core'
import { PlatformError, unknownError } from '@hcengineering/platform'
import type { DBAdapterManager, Middleware, PipelineContext, ServerFindOptions } from '@hcengineering/server-core'
import { BaseMiddleware } from '@hcengineering/server-core'
import { emptyFindResult } from '@hcengineering/server-core/src/base'

/**
 * Will perform a find inside adapters
 * @public
 */
export class DomainFindMiddleware extends BaseMiddleware implements Middleware {
  adapterManager!: DBAdapterManager

  static async create (ctx: MeasureContext, context: PipelineContext, next?: Middleware): Promise<Middleware> {
    const middleware = new DomainFindMiddleware(context, next)
    if (context.adapterManager == null) {
      throw new PlatformError(unknownError('Adapter maneger should be configured'))
    }
    middleware.adapterManager = context.adapterManager
    return middleware
  }

  toPrintableOptions (options?: ServerFindOptions<Doc>): FindOptions<Doc> {
    const { ctx, allowedSpaces, associations, ...opt } = options ?? {}
    return opt
  }

  findAll<T extends Doc>(
    ctx: MeasureContext<SessionData>,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: ServerFindOptions<T>
  ): Promise<FindResult<T>> {
    if (query?.$search !== undefined) {
      // Server storage pass $search queries to next
      return this.next?.findAll(ctx, _class, query, options) ?? emptyFindResult
    }
    const p = options?.prefix ?? 'client'
    const domain = this.context.hierarchy.getDomain(_class)
    if (domain === DOMAIN_MODEL) {
      return Promise.resolve(this.context.modelDb.findAllSync(_class, query, options))
    }
    return ctx.with(
      p + '-find-all',
      { source: ctx.contextData?.service ?? 'system', _class },
      (ctx) => {
        return this.adapterManager.getAdapter(domain, false).findAll(ctx, _class, query, options)
      },
      { _class, query, options: this.toPrintableOptions(options) }
    )
  }

  groupBy<T, P extends Doc>(
    ctx: MeasureContext,
    domain: Domain,
    field: string,
    query?: DocumentQuery<P>
  ): Promise<Map<T, number>> {
    return this.adapterManager.getAdapter(domain, false).groupBy(ctx, domain, field, query)
  }
}
