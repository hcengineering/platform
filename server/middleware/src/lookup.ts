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
  clone,
  toFindResult
} from '@hcengineering/core'
import { BaseMiddleware, Middleware, type PipelineContext } from '@hcengineering/server-core'
/**
 * @public
 */
export class LookupMiddleware extends BaseMiddleware implements Middleware {
  private constructor (context: PipelineContext, next?: Middleware) {
    super(context, next)
  }

  static async create (
    ctx: MeasureContext,
    context: PipelineContext,
    next: Middleware | undefined
  ): Promise<LookupMiddleware> {
    return new LookupMiddleware(context, next)
  }

  override async findAll<T extends Doc>(
    ctx: MeasureContext,
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
        const newDoc: any = { ...d }
        if (d.$lookup !== undefined) {
          newDoc.$lookup = clone(d.$lookup)
          newResult.push(newDoc)
          for (const [k, v] of Object.entries(d.$lookup)) {
            if (!Array.isArray(v)) {
              newDoc.$lookup[k] = v != null ? mapDoc(v) : v
            } else {
              newDoc.$lookup[k] = v.map((it) => (it != null ? mapDoc(it) : it))
            }
          }
        } else {
          newResult.push(newDoc)
        }
      }
      const lookupMap = Object.fromEntries(Array.from(Object.values(idClassMap)).map((it) => [it.id, it.doc]))
      return this.cleanQuery<T>(toFindResult(newResult, result.total, lookupMap), query, lookupMap)
    }

    // We need to get rid of simple query parameters matched in documents
    return this.cleanQuery<T>(result, query)
  }

  private cleanQuery<T extends Doc>(
    result: FindResult<T>,
    query: DocumentQuery<T>,
    lookupMap?: Record<string, Doc>
  ): FindResult<T> {
    const newResult: T[] = []
    for (const doc of result) {
      let _doc = doc
      let cloned = false
      for (const [k, v] of Object.entries(query)) {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          if ((_doc as any)[k] === v) {
            if (!cloned) {
              _doc = { ...doc } as any
              cloned = true
            }
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete (_doc as any)[k]
          }
        }
      }
      newResult.push(_doc)
    }
    return toFindResult(newResult, result.total, lookupMap)
  }
}
