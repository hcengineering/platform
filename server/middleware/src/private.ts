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
  AttachedDoc,
  Class,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  LookupData,
  MeasureContext,
  Ref,
  ServerStorage,
  Tx,
  TxCUD
} from '@hcengineering/core'
import platform, { PlatformError, Severity, Status } from '@hcengineering/platform'
import { Middleware, SessionContext, TxMiddlewareResult } from '@hcengineering/server-core'
import { DOMAIN_PREFERENCE } from '@hcengineering/server-preference'
import { BaseMiddleware } from './base'
import { getUser, mergeTargets } from './utils'

/**
 * @public
 */
export class PrivateMiddleware extends BaseMiddleware implements Middleware {
  private readonly targetDomains = [DOMAIN_PREFERENCE]

  private constructor (storage: ServerStorage, next?: Middleware) {
    super(storage, next)
  }

  static async create (ctx: MeasureContext, storage: ServerStorage, next?: Middleware): Promise<PrivateMiddleware> {
    return new PrivateMiddleware(storage, next)
  }

  async tx (ctx: SessionContext, tx: Tx): Promise<TxMiddlewareResult> {
    let target: string[] | undefined
    if (this.storage.hierarchy.isDerived(tx._class, core.class.TxCUD)) {
      const txCUD = tx as TxCUD<Doc>
      const domain = this.storage.hierarchy.getDomain(txCUD.objectClass)
      if (this.targetDomains.includes(domain)) {
        const account = await getUser(this.storage, ctx)
        if (account !== tx.modifiedBy) {
          throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
        }
        target = [ctx.userEmail]
      }
    }
    const res = await this.provideTx(ctx, tx)
    return [res[0], res[1], mergeTargets(target, res[2])]
  }

  override async findAll<T extends Doc>(
    ctx: SessionContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    let newQuery = query
    const domain = this.storage.hierarchy.getDomain(_class)
    if (this.targetDomains.includes(domain)) {
      const account = await getUser(this.storage, ctx)
      newQuery = {
        ...query,
        modifiedBy: account
      }
    }
    const findResult = this.storage.hierarchy.clone(
      await this.provideFindAll(ctx, _class, newQuery, options)
    ) as FindResult<T>
    for (const object of findResult) {
      if (object.$lookup !== undefined) {
        await this.filterLookup(ctx, object.$lookup)
      }
    }
    return findResult
  }

  async isAvailable (ctx: SessionContext, doc: Doc): Promise<boolean> {
    const domain = this.storage.hierarchy.getDomain(doc._class)
    if (!this.targetDomains.includes(domain)) return true
    if (ctx.userEmail === 'anticrm@hc.engineering') {
      return true
    }
    const account = await getUser(this.storage, ctx)
    return doc.modifiedBy === account
  }

  async filterLookup<T extends Doc>(ctx: SessionContext, lookup: LookupData<T>): Promise<void> {
    for (const key in lookup) {
      const val = lookup[key]
      if (Array.isArray(val)) {
        const arr: AttachedDoc[] = []
        for (const value of val) {
          if (await this.isAvailable(ctx, value)) {
            arr.push(value)
          }
        }
        lookup[key] = arr as any
      } else if (val !== undefined) {
        if (!(await this.isAvailable(ctx, val))) {
          lookup[key] = undefined
        }
      }
    }
  }
}
