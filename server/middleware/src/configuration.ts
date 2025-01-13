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
  AccountRole,
  Class,
  Doc,
  DocumentQuery,
  DOMAIN_CONFIGURATION,
  FindOptions,
  FindResult,
  MeasureContext,
  Ref,
  Tx,
  TxCUD,
  TxProcessor,
  type SessionData
} from '@hcengineering/core'
import platform, { PlatformError, Severity, Status } from '@hcengineering/platform'
import { BaseMiddleware, Middleware, TxMiddlewareResult, type PipelineContext } from '@hcengineering/server-core'

export const configurationAccountEmail = '#configurator@hc.engineering'
/**
 * @public
 */
export class ConfigurationMiddleware extends BaseMiddleware implements Middleware {
  private readonly targetDomains = [DOMAIN_CONFIGURATION]

  private constructor (
    readonly context: PipelineContext,
    next?: Middleware
  ) {
    super(context, next)
  }

  static async create (
    ctx: MeasureContext,
    context: PipelineContext,
    next: Middleware | undefined
  ): Promise<ConfigurationMiddleware> {
    return new ConfigurationMiddleware(context, next)
  }

  tx (ctx: MeasureContext<SessionData>, txes: Tx[]): Promise<TxMiddlewareResult> {
    for (const tx of txes) {
      if (TxProcessor.isExtendsCUD(tx._class)) {
        const txCUD = tx as TxCUD<Doc>
        const domain = this.context.hierarchy.getDomain(txCUD.objectClass)
        if (this.targetDomains.includes(domain)) {
          const account = ctx.contextData.account
          if (account.role !== AccountRole.Owner && ctx.contextData.admin !== true) {
            throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
          }
        }
      }
    }
    return this.provideTx(ctx, txes)
  }

  findAll<T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const domain = this.context.hierarchy.getDomain(_class)
    if (this.targetDomains.includes(domain)) {
      const account = ctx.contextData.account
      if (account.role !== AccountRole.Owner && account._id !== core.account.System && ctx.contextData.admin !== true) {
        throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      }
    }
    return this.provideFindAll(ctx, _class, query, options)
  }
}
