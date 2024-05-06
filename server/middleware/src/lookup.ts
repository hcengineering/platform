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
  MeasureContext,
  Ref,
  ServerStorage,
  Tx,
  clone,
  toFindResult
} from '@hcengineering/core'
import { BroadcastFunc, Middleware, SessionContext, TxMiddlewareResult } from '@hcengineering/server-core'
import { BaseMiddleware } from './base'

/**
 * @public
 */
export class LookupMiddleware extends BaseMiddleware implements Middleware {
  private constructor (storage: ServerStorage, next?: Middleware) {
    super(storage, next)
  }

  static async create (
    ctx: MeasureContext,
    broadcast: BroadcastFunc,
    storage: ServerStorage,
    next?: Middleware
  ): Promise<LookupMiddleware> {
    return new LookupMiddleware(storage, next)
  }

  async tx (ctx: SessionContext, tx: Tx): Promise<TxMiddlewareResult> {
    return await this.provideTx(ctx, tx)
  }

  handleBroadcast (tx: Tx[], targets?: string[]): Tx[] {
    return this.provideHandleBroadcast(tx, targets)
  }

  override async findAll<T extends Doc>(
    ctx: SessionContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const result = await this.provideFindAll(ctx, _class, query, options)
    // Fill lookup map to make more compact representation

    if (options?.lookup !== undefined) {
      const newResult: T[] = []
      let counter = 0
      const idClassMap: Record<string, { id: number, doc: Doc, count: number }> = {}

      function mapDoc (doc: Doc): number {
        const key = doc._class + '@' + doc._id
        let docRef = idClassMap[key]
        if (docRef === undefined) {
          docRef = { id: ++counter, doc, count: -1 }
          idClassMap[key] = docRef
        }
        docRef.count++
        return docRef.id
      }

      for (const d of result) {
        if (d.$lookup !== undefined) {
          const newDoc = clone(d)
          newResult.push(newDoc)
          for (const [k, v] of Object.entries(d.$lookup)) {
            if (!Array.isArray(v)) {
              newDoc.$lookup[k] = v != null ? mapDoc(v) : v
            } else {
              newDoc.$lookup[k] = v.map((it) => (it != null ? mapDoc(it) : it))
            }
          }
        }
      }
      const lookupMap = Object.fromEntries(Array.from(Object.values(idClassMap)).map((it) => [it.id, it.doc]))
      if (Object.keys(lookupMap).length > 0) {
        return toFindResult(newResult, result.total, lookupMap)
      }
    }

    // We need to get rid of simple query parameters matched in documents
    for (const doc of result) {
      for (const [k, v] of Object.entries(query)) {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          if ((doc as any)[k] === v) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete (doc as any)[k]
          }
        }
      }
    }
    return result
  }
}
