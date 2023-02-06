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
  Hierarchy,
  Ref,
  Tx,
  TxCreateDoc,
  TxCUD,
  TxProcessor,
  TxRemoveDoc
} from '@hcengineering/core'
import { TriggerControl } from '@hcengineering/server-core'
import tags, { TagElement, TagReference } from '@hcengineering/tags'

/**
 * @public
 */
export async function TagElementRemove (
  doc: Doc,
  hierarchy: Hierarchy,
  findAll: <T extends Doc>(
    clazz: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>
): Promise<Doc[]> {
  if (!hierarchy.isDerived(doc._class, tags.class.TagElement)) return []
  return await findAll(tags.class.TagReference, { tag: doc._id as Ref<TagElement> })
}

/**
 * @public
 */
export async function onTagReference (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const actualTx = TxProcessor.extractTx(tx)
  const isCreate = control.hierarchy.isDerived(actualTx._class, core.class.TxCreateDoc)
  const isRemove = control.hierarchy.isDerived(actualTx._class, core.class.TxRemoveDoc)
  if (!isCreate && !isRemove) return []
  if (!control.hierarchy.isDerived((actualTx as TxCUD<Doc>).objectClass, tags.class.TagReference)) return []
  if (isCreate) {
    const doc = TxProcessor.createDoc2Doc(actualTx as TxCreateDoc<TagReference>)
    const res = control.txFactory.createTxUpdateDoc(tags.class.TagElement, tags.space.Tags, doc.tag, {
      $inc: { refCount: 1 }
    })
    return [res]
  }
  if (isRemove) {
    const ctx = actualTx as TxRemoveDoc<TagReference>
    const doc = control.removedMap.get(ctx.objectId) as TagReference
    if (doc !== undefined) {
      if (!control.removedMap.has(doc.tag)) {
        const res = control.txFactory.createTxUpdateDoc(tags.class.TagElement, tags.space.Tags, doc.tag, {
          $inc: { refCount: -1 }
        })
        return [res]
      }
    }
  }
  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    onTagReference
  },
  function: {
    TagElementRemove
  }
})
