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
  Class,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  MeasureContext,
  Ref,
  Tx,
  toFindResult,
  toIdMap,
  type Blob,
  type BlobLookup,
  type WorkspaceIdWithUrl,
  type Branding
} from '@hcengineering/core'
import { Middleware, SessionContext, TxMiddlewareResult, type ServerStorage } from '@hcengineering/server-core'
import { BaseMiddleware } from './base'

/**
 * @public
 */
export class BlobLookupMiddleware extends BaseMiddleware implements Middleware {
  private constructor (storage: ServerStorage, next?: Middleware) {
    super(storage, next)
  }

  static async create (ctx: MeasureContext, storage: ServerStorage, next?: Middleware): Promise<BlobLookupMiddleware> {
    return new BlobLookupMiddleware(storage, next)
  }

  async tx (ctx: SessionContext, tx: Tx): Promise<TxMiddlewareResult> {
    return await this.provideTx(ctx, tx)
  }

  async fetchBlobInfo (
    ctx: MeasureContext,
    workspace: WorkspaceIdWithUrl,
    branding: Branding | null,
    toUpdate: [Doc, Blob, string][]
  ): Promise<void> {
    if (this.storage.storageAdapter.lookup !== undefined) {
      const docsToUpdate = toUpdate.map((it) => it[1])
      const updatedBlobs = toIdMap<Blob>(
        (await this.storage.storageAdapter.lookup(ctx, workspace, branding, docsToUpdate)).lookups
      )
      for (const [doc, blob, key] of toUpdate) {
        const ublob = updatedBlobs.get(blob._id)
        if (ublob !== undefined) {
          ;(doc as any).$lookup[key] = ublob
        }
      }
    }
  }

  override async findAll<T extends Doc>(
    ctx: SessionContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const result = await this.provideFindAll(ctx, _class, query, options)
    // Fill lookup map to make more compact representation

    if (_class === core.class.Blob) {
      // Bulk update of info
      const updatedBlobs = toIdMap<Blob>(
        (await this.storage.storageAdapter.lookup(ctx.ctx, ctx.workspace, ctx.branding, result as unknown as Blob[]))
          .lookups
      )
      const res: T[] = []
      for (const d of result) {
        res.push((updatedBlobs.get(d._id as unknown as Ref<BlobLookup>) ?? d) as T)
      }
      return toFindResult(res, result.total, result.lookupMap)
    }

    if (options?.lookup !== undefined && this.storage.storageAdapter.lookup !== undefined) {
      // Check if $lookups has core.class.Blob as object, and we need to enhance them

      let toUpdate: [Doc, Blob, string][] = []

      for (const d of result) {
        if (d.$lookup !== undefined) {
          for (const [k, v] of Object.entries(d.$lookup)) {
            if (v !== undefined && !Array.isArray(v) && v._class === core.class.Blob) {
              toUpdate.push([d, v, k])
            }
          }
        }
        if (toUpdate.length > 50) {
          // Bulk update of info
          await this.fetchBlobInfo(ctx.ctx, ctx.workspace, ctx.branding, toUpdate)
          toUpdate = []
        }
      }
      if (toUpdate.length > 0) {
        // Bulk update of info
        await this.fetchBlobInfo(ctx.ctx, ctx.workspace, ctx.branding, toUpdate)
        toUpdate = []
      }
    }
    return result
  }
}
