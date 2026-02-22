//
// Copyright © 2025 Hardcore Engineering Inc.
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
  clone,
  type Doc,
  type DocumentQuery,
  type FindResult,
  type MeasureContext,
  type Ref,
  type SessionData,
  SortingOrder,
  type Tx,
  type TxApplyIf,
  type TxCreateDoc,
  TxFactory,
  TxProcessor,
  type VersionableDoc
} from '@hcengineering/core'
import {
  BaseMiddleware,
  type ServerFindOptions,
  type Middleware,
  type PipelineContext,
  type TxMiddlewareResult
} from '@hcengineering/server-core'

/**
 * @public
 */
export class VersioningMiddleware extends BaseMiddleware implements Middleware {
  private constructor (context: PipelineContext, next?: Middleware) {
    super(context, next)
  }

  static async create (
    ctx: MeasureContext,
    context: PipelineContext,
    next: Middleware | undefined
  ): Promise<VersioningMiddleware> {
    return new VersioningMiddleware(context, next)
  }

  override async findAll<T extends Doc>(
    ctx: MeasureContext<SessionData>,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: ServerFindOptions<T>
  ): Promise<FindResult<T>> {
    if (
      this.isVerionableClass(_class) &&
      query.isLatest === undefined &&
      query._id === undefined &&
      query.baseId === undefined
    ) {
      const newQuery = clone(query)
      newQuery.isLatest = true

      const findResult = await this.provideFindAll(ctx, _class, newQuery, options)

      return findResult
    } else {
      return await this.provideFindAll(ctx, _class, query, options)
    }
  }

  async tx (ctx: MeasureContext<SessionData>, txes: Tx[]): Promise<TxMiddlewareResult> {
    let nestedTxes: Tx[] = []
    for (const tx of txes) {
      if (tx._class === core.class.TxCreateDoc) {
        const childTxes = await this.setVersionData(ctx, tx as TxCreateDoc<VersionableDoc>)
        if (childTxes !== undefined && childTxes.length > 0) {
          nestedTxes = nestedTxes.concat(childTxes)
        }
      }
      if (tx._class === core.class.TxApplyIf) {
        for (const _tx of (tx as TxApplyIf).txes) {
          if (_tx._class === core.class.TxCreateDoc) {
            const childTxes = await this.setVersionData(ctx, _tx as TxCreateDoc<VersionableDoc>)
            if (childTxes !== undefined && childTxes.length > 0) {
              nestedTxes = nestedTxes.concat(childTxes)
            }
          }
        }
      }
    }
    const res = await this.provideTx(ctx, txes)
    if (nestedTxes.length > 0) {
      await this.provideTx(ctx, nestedTxes)
    }
    return res
  }

  private async setVersionData (
    ctx: MeasureContext<SessionData>,
    tx: TxCreateDoc<VersionableDoc>
  ): Promise<Tx[] | undefined> {
    const isVersionedClass = this.isVerionableClass(tx.objectClass)
    if (!isVersionedClass) return []
    const doc = TxProcessor.createDoc2Doc(tx)
    const isNew = doc.baseId === doc._id || doc.baseId === undefined
    tx.attributes.isLatest = true
    if (isNew) {
      tx.attributes.version = 1
      tx.attributes.baseId = tx.objectId
      tx.attributes.docCreatedBy = tx.createdBy ?? tx.modifiedBy
    } else {
      const base = await this.provideFindAll(
        ctx,
        tx.objectClass,
        { baseId: doc.baseId },
        { sort: { version: SortingOrder.Descending } }
      )
      const latest = base.find((p) => p.isLatest === true) ?? base[0]
      if (latest === undefined) throw new Error('No base object found for the new version')
      tx.attributes.version = (latest.version ?? 1) + 1
      tx.attributes.docCreatedBy = latest.docCreatedBy
      const txes: Tx[] = []
      const factory = new TxFactory(core.account.System, true)
      for (const prev of base) {
        if (prev.isLatest === true) {
          txes.push(
            factory.createTxUpdateDoc(prev._class, prev.space, prev._id, {
              isLatest: false,
              readonly: true
            })
          )
        }
      }
      return txes
    }
  }

  private isVerionableClass (_class: Ref<Class<Doc>>): boolean {
    try {
      return this.context.hierarchy.classHierarchyMixin(_class, core.mixin.VersionableClass) !== undefined
    } catch {
      return false
    }
  }
}
