//
// Copyright © 2023 Hardcore Engineering Inc.
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

import chunter, { Backlink } from '@hcengineering/chunter'
import { Class, Data, Doc, Ref, Tx, TxFactory } from '@hcengineering/core'
import { defaultExtensions, extractReferences, getHTML, parseHTML, ReferenceNode } from '@hcengineering/text'

const extensions = [...defaultExtensions, ReferenceNode]

export function getBacklinks (
  backlinkId: Ref<Doc>,
  backlinkClass: Ref<Class<Doc>>,
  attachedDocId: Ref<Doc> | undefined,
  content: string
): Array<Data<Backlink>> {
  const doc = parseHTML(content, extensions)

  const result: Array<Data<Backlink>> = []

  const references = extractReferences(doc)
  for (const ref of references) {
    if (ref.objectId !== attachedDocId && ref.objectId !== backlinkId) {
      result.push({
        attachedTo: ref.objectId,
        attachedToClass: ref.objectClass,
        collection: 'backlinks',
        backlinkId,
        backlinkClass,
        message: ref.parentNode !== null ? getHTML(ref.parentNode, extensions) : '',
        attachedDocId
      })
    }
  }

  return result
}

/**
 * @public
 */
export function getBacklinksTxes (txFactory: TxFactory, backlinks: Data<Backlink>[], current: Backlink[]): Tx[] {
  const txes: Tx[] = []

  for (const c of current) {
    // Find existing and check if we need to update message
    const pos = backlinks.findIndex(
      (b) => b.backlinkId === c.backlinkId && b.backlinkClass === c.backlinkClass && b.attachedTo === c.attachedTo
    )
    if (pos !== -1) {
      // Update existing backlinks when message changed
      const data = backlinks[pos]
      if (c.message !== data.message) {
        const innerTx = txFactory.createTxUpdateDoc(c._class, c.space, c._id, {
          message: data.message
        })
        txes.push(
          txFactory.createTxCollectionCUD(
            c.attachedToClass,
            c.attachedTo,
            chunter.space.Backlinks,
            c.collection,
            innerTx
          )
        )
      }
      backlinks.splice(pos, 1)
    } else {
      // Remove not found backlinks
      const innerTx = txFactory.createTxRemoveDoc(c._class, c.space, c._id)
      txes.push(
        txFactory.createTxCollectionCUD(c.attachedToClass, c.attachedTo, chunter.space.Backlinks, c.collection, innerTx)
      )
    }
  }

  // Add missing backlinks
  for (const backlink of backlinks) {
    const backlinkTx = txFactory.createTxCreateDoc(chunter.class.Backlink, chunter.space.Backlinks, backlink)
    txes.push(
      txFactory.createTxCollectionCUD(
        backlink.attachedToClass,
        backlink.attachedTo,
        chunter.space.Backlinks,
        backlink.collection,
        backlinkTx
      )
    )
  }

  return txes
}
