//
// Copyright © 2024 Hardcore Engineering Inc.
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
  DocIndexState,
  isClassIndexable,
  isFullTextAttribute,
  Tx,
  TxProcessor,
  type AnyAttribute,
  type AttachedDoc,
  type Class,
  type Doc,
  type FullTextSearchContext,
  type Ref,
  type TxCollectionCUD,
  type TxCUD,
  type TxUpdateDoc
} from '@hcengineering/core'
import { TriggerControl } from '@hcengineering/server-core'

const indexingCtx = 'indexing_contexts'
export async function OnChange (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  let contexts = control.contextCache.get(indexingCtx) as Map<Ref<Class<Doc>>, FullTextSearchContext>
  if (contexts === undefined) {
    contexts = new Map()
    control.contextCache.set(indexingCtx, contexts)
  }

  if (control.ctx.contextData.fulltextUpdates === undefined) {
    control.ctx.contextData.fulltextUpdates = new Map()
  }
  const docsToUpsert = control.ctx.contextData.fulltextUpdates

  for (let tx of txes) {
    if (tx._class === core.class.TxCollectionCUD) {
      const txcol = tx as TxCollectionCUD<Doc, AttachedDoc>
      tx = txcol.tx
    }
    const attrs = new Map<string, AnyAttribute>()
    if (TxProcessor.isExtendsCUD(tx._class)) {
      const cud = tx as TxCUD<Doc>

      if (!isClassIndexable(control.hierarchy, cud.objectClass, contexts)) {
        // No need, since no indixable fields or attachments.
        continue
      }

      // We need to check if operation has indexable attributes.
      if (cud._class === core.class.TxUpdateDoc) {
        let hasFulltext = false
        // We could skip updates for a lot of transactions if they have non idexable attributes
        const upd = cud as TxUpdateDoc<Doc>
        for (const [k] of Object.entries(upd.operations)) {
          if (k.startsWith('$') || k === 'modifiedOn') {
            // Is operator
            // Skip operator changes
          } else {
            const key = upd.objectClass + '.' + k
            const attr = attrs.get(key) ?? control.hierarchy.findAttribute(upd.objectClass, k)
            if (attr !== undefined) {
              attrs.set(key, attr ?? null)
            }
            if (attr != null) {
              if (isFullTextAttribute(attr)) {
                hasFulltext = true
              }
            }
          }
        }
        if (!hasFulltext) {
          // No full text changes, no indexing is required
          continue
        }
      }

      docsToUpsert.set(cud.objectId as Ref<DocIndexState>, {
        _id: cud.objectId as Ref<DocIndexState>,
        _class: core.class.DocIndexState,
        objectClass: cud.objectClass,
        needIndex: true,
        modifiedBy: tx.modifiedBy,
        modifiedOn: tx.modifiedOn,
        space: cud.space,
        removed: cud._class === core.class.TxRemoveDoc
      })
    }
  }
  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnChange
  }
})
