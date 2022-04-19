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

import core, { Tx, Doc, Ref, Class, DocumentQuery, FindOptions, ServerStorage, Account, TxCUD } from '@anticrm/core'
import platform, { PlatformError, Severity, Status } from '@anticrm/platform'
import { Middleware, SessionContext, TxMiddlewareResult, FindAllMiddlewareResult } from '@anticrm/server-core'
import { DOMAIN_PREFERENCE } from '@anticrm/server-preference'
import { BaseMiddleware } from './base'

/**
 * @public
 */
export class PrivateMiddleware extends BaseMiddleware implements Middleware {
  private readonly targetDomains = [DOMAIN_PREFERENCE]

  private constructor (storage: ServerStorage, next?: Middleware) {
    super(storage, next)
  }

  static create (storage: ServerStorage, next?: Middleware): PrivateMiddleware {
    return new PrivateMiddleware(storage, next)
  }

  async tx (ctx: SessionContext, tx: Tx): Promise<TxMiddlewareResult> {
    let target: string | undefined
    if (this.storage.hierarchy.isDerived(tx._class, core.class.TxCUD)) {
      const txCUD = tx as TxCUD<Doc>
      const domain = this.storage.hierarchy.getDomain(txCUD.objectClass)
      if (this.targetDomains.includes(domain)) {
        const account = await this.getUser(ctx)
        if (account !== tx.modifiedBy) {
          throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
        }
        target = ctx.userEmail
      }
    }
    const res = await this.provideTx(ctx, tx)
    return [res[0], res[1], res[2] ?? target]
  }

  override async findAll <T extends Doc>(ctx: SessionContext, _class: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T>): Promise<FindAllMiddlewareResult<T>> {
    let newQuery = query
    const domain = this.storage.hierarchy.getDomain(_class)
    if (this.targetDomains.includes(domain)) {
      const account = await this.getUser(ctx)
      newQuery = {
        ...query,
        modifiedBy: account
      }
    }
    return await this.provideFindAll(ctx, _class, newQuery, options)
  }

  private async getUser (ctx: SessionContext): Promise<Ref<Account>> {
    if (ctx.userEmail === undefined) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }
    const account = (await this.storage.modelDb.findAll(core.class.Account, { email: ctx.userEmail }))[0]
    if (account === undefined) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }
    return account._id
  }
}
