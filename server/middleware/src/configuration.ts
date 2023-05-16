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
  Account,
  AccountRole,
  Class,
  Doc,
  DocumentQuery,
  DOMAIN_CONFIGURATION,
  FindOptions,
  FindResult,
  MeasureContext,
  Ref,
  ServerStorage,
  Tx,
  TxCUD
} from '@hcengineering/core'
import platform, { PlatformError, Severity, Status } from '@hcengineering/platform'
import { BroadcastFunc, Middleware, SessionContext, TxMiddlewareResult } from '@hcengineering/server-core'
import { BaseMiddleware } from './base'

const configurationAccountEmail = '#configurator@hc.engineering'
/**
 * @public
 */
export class ConfigurationMiddleware extends BaseMiddleware implements Middleware {
  private readonly targetDomains = [DOMAIN_CONFIGURATION]

  private constructor (storage: ServerStorage, next?: Middleware) {
    super(storage, next)
  }

  static async create (
    ctx: MeasureContext,
    broadcast: BroadcastFunc,
    storage: ServerStorage,
    next?: Middleware
  ): Promise<ConfigurationMiddleware> {
    return new ConfigurationMiddleware(storage, next)
  }

  async tx (ctx: SessionContext, tx: Tx): Promise<TxMiddlewareResult> {
    if (this.storage.hierarchy.isDerived(tx._class, core.class.TxCUD)) {
      const txCUD = tx as TxCUD<Doc>
      const domain = this.storage.hierarchy.getDomain(txCUD.objectClass)
      if (this.targetDomains.includes(domain)) {
        if (ctx.userEmail !== configurationAccountEmail) {
          const account = await this.getUser(ctx)
          if (account.role !== AccountRole.Owner) {
            throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
          }
        }
      }
    }
    return await this.provideTx(ctx, tx)
  }

  override async findAll<T extends Doc>(
    ctx: SessionContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const domain = this.storage.hierarchy.getDomain(_class)
    if (this.targetDomains.includes(domain)) {
      if (ctx.userEmail !== configurationAccountEmail) {
        const account = await this.getUser(ctx)
        if (account.role !== AccountRole.Owner && account._id !== core.account.System) {
          throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
        }
      }
    }
    return await this.provideFindAll(ctx, _class, query, options)
  }

  private async getUser (ctx: SessionContext): Promise<Account> {
    if (ctx.userEmail === undefined) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }
    const account = (await this.storage.modelDb.findAll(core.class.Account, { email: ctx.userEmail }))[0]
    if (account === undefined) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }
    return account
  }
}
