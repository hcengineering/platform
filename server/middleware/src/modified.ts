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
  Doc,
  MeasureContext,
  ServerStorage,
  Timestamp,
  Tx,
  TxCollectionCUD,
  TxCreateDoc
} from '@hcengineering/core'
import { Middleware, SessionContext, TxMiddlewareResult } from '@hcengineering/server-core'
import { BaseMiddleware } from './base'

/**
 * @public
 */
export class ModifiedMiddleware extends BaseMiddleware implements Middleware {
  private constructor (storage: ServerStorage, next?: Middleware) {
    super(storage, next)
  }

  static async create (ctx: MeasureContext, storage: ServerStorage, next?: Middleware): Promise<ModifiedMiddleware> {
    return new ModifiedMiddleware(storage, next)
  }

  async tx (ctx: SessionContext, tx: Tx): Promise<TxMiddlewareResult> {
    tx.modifiedOn = Date.now()
    if (this.storage.hierarchy.isDerived(tx._class, core.class.TxCreateDoc)) {
      const createTx = tx as TxCreateDoc<Doc & { createOn: Timestamp }>
      const hasCreateOn = this.storage.hierarchy.findAttribute(createTx.objectClass, 'createOn')
      if (hasCreateOn !== undefined) {
        createTx.attributes.createOn = tx.modifiedOn
      }
    }
    if (this.storage.hierarchy.isDerived(tx._class, core.class.TxCollectionCUD)) {
      const coltx = tx as TxCollectionCUD<Doc, AttachedDoc>
      coltx.tx.modifiedOn = tx.modifiedOn
      if (this.storage.hierarchy.isDerived(coltx.tx._class, core.class.TxCreateDoc)) {
        const createTx = coltx.tx as TxCreateDoc<AttachedDoc & { createOn: Timestamp }>
        const hasCreateOn = this.storage.hierarchy.findAttribute(createTx.objectClass, 'createOn')
        if (hasCreateOn !== undefined) {
          createTx.attributes.createOn = tx.modifiedOn
        }
      }
    }
    return await this.provideTx(ctx, tx)
  }
}
