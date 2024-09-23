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

import { type MeasureContext } from '@hcengineering/core'
import type { Middleware, PipelineContext } from '@hcengineering/server-core'
import { BaseMiddleware, DomainIndexHelperImpl } from '@hcengineering/server-core'

/**
 * @public
 */
export class DBAdapterInitMiddleware extends BaseMiddleware implements Middleware {
  static async create (
    ctx: MeasureContext,
    context: PipelineContext,
    next?: Middleware
  ): Promise<Middleware | undefined> {
    await context.adapterManager?.initAdapters?.(ctx)
    const domainHelper = new DomainIndexHelperImpl(ctx, context.hierarchy, context.modelDb, context.workspace)
    await context.adapterManager?.registerHelper?.(domainHelper)
    return undefined
  }
}
