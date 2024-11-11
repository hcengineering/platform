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
  DOMAIN_DOC_INDEX_STATE,
  getFullTextContext,
  isClassIndexable,
  Tx,
  TxProcessor,
  type AttachedDoc,
  type Class,
  type Doc,
  type FullTextSearchContext,
  type Ref,
  type TxCollectionCUD,
  type TxCUD
} from '@hcengineering/core'
import { TriggerControl } from '@hcengineering/server-core'

const indexingCtx = 'indexing_contexts'
export async function OnChange (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  let contexts = control.contextCache.get(indexingCtx) as Map<Ref<Class<Doc>>, FullTextSearchContext>
  if (contexts === undefined) {
    contexts = new Map()
    control.contextCache.set(indexingCtx, contexts)
  }

  const docsToUpsert = new Map<Ref<DocIndexState>, DocIndexState>()

  for (let tx of txes) {
    if (tx._class === core.class.TxCollectionCUD) {
      const txcol = tx as TxCollectionCUD<Doc, AttachedDoc>
      tx = txcol.tx
    }
    if (TxProcessor.isExtendsCUD(tx._class)) {
      const cud = tx as TxCUD<Doc>

      if (!isClassIndexable(control.hierarchy, cud.objectClass, contexts)) {
        // No need, since no indixable fields or attachments.
        continue
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

      const propagate = getFullTextContext(control.hierarchy, cud.objectClass, contexts).propagate
      if (propagate !== undefined && propagate.length > 0) {
        control.ctx.contextData.needWarmupFulltext = true
        await control.ctx.with('clean-childs', { _class: cud.objectClass }, () => {
          // We need to propagate all changes to all child's of following classes.
          return control.lowLevel.rawUpdate<DocIndexState>(
            DOMAIN_DOC_INDEX_STATE,
            { attachedTo: cud.objectClass, objectClass: { $in: propagate } },
            { needIndex: true }
          )
        })
      }
    }
  }
  if (docsToUpsert.size > 0) {
    control.ctx.contextData.needWarmupFulltext = true
    await control.lowLevel.upload(control.ctx, DOMAIN_DOC_INDEX_STATE, Array.from(docsToUpsert.values()))
  }
  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnChange
  }
})
