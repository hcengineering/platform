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
import { loadCollaborativeDoc, yDocToBuffer } from '@hcengineering/collaboration'
import core, {
  AttachedDoc,
  Class,
  CollaborativeDoc,
  Data,
  Doc,
  Hierarchy,
  Ref,
  Tx,
  TxCollectionCUD,
  TxCUD,
  TxFactory,
  TxProcessor,
  Type
} from '@hcengineering/core'
import notification from '@hcengineering/notification'
import { ServerKit, extractReferences, getHTML, parseHTML, yDocContentToNodes } from '@hcengineering/text'
import { StorageAdapter, TriggerControl } from '@hcengineering/server-core'

const extensions = [ServerKit]

export function isMarkupType (type: Ref<Class<Type<any>>>): boolean {
  return type === core.class.TypeMarkup || type === core.class.TypeCollaborativeMarkup
}

export function isCollaborativeType (type: Ref<Class<Type<any>>>): boolean {
  return type === core.class.TypeCollaborativeDoc
}

export async function getCreateBacklinksTxes (
  control: TriggerControl,
  storage: StorageAdapter,
  txFactory: TxFactory,
  doc: Doc,
  backlinkId: Ref<Doc>,
  backlinkClass: Ref<Class<Doc>>
): Promise<Tx[]> {
  const attachedDocId = doc._id

  const backlinks: Data<Backlink>[] = []
  const attributes = control.hierarchy.getAllAttributes(doc._class)
  for (const attr of attributes.values()) {
    if (isMarkupType(attr.type._class)) {
      const content = (doc as any)[attr.name]?.toString() ?? ''
      const attrBacklinks = getBacklinks(backlinkId, backlinkClass, attachedDocId, content)
      backlinks.push(...attrBacklinks)
    } else if (attr.type._class === core.class.TypeCollaborativeDoc) {
      const collaborativeDoc = (doc as any)[attr.name] as CollaborativeDoc
      try {
        const ydoc = await loadCollaborativeDoc(storage, control.workspace, collaborativeDoc, control.ctx)
        if (ydoc !== undefined) {
          const attrBacklinks = getBacklinks(backlinkId, backlinkClass, attachedDocId, yDocToBuffer(ydoc))
          backlinks.push(...attrBacklinks)
        }
      } catch {
        // do nothing, the collaborative doc does not sem to exist yet
      }
    }
  }

  return getBacklinksTxes(txFactory, backlinks, [])
}

export async function getUpdateBacklinksTxes (
  control: TriggerControl,
  storage: StorageAdapter,
  txFactory: TxFactory,
  doc: Doc,
  backlinkId: Ref<Doc>,
  backlinkClass: Ref<Class<Doc>>
): Promise<Tx[]> {
  const attachedDocId = doc._id

  // collect attribute backlinks
  let hasBacklinkAttrs = false
  const backlinks: Data<Backlink>[] = []
  const attributes = control.hierarchy.getAllAttributes(doc._class)
  for (const attr of attributes.values()) {
    if (isMarkupType(attr.type._class)) {
      hasBacklinkAttrs = true
      const content = (doc as any)[attr.name]?.toString() ?? ''
      const attrBacklinks = getBacklinks(backlinkId, backlinkClass, attachedDocId, content)
      backlinks.push(...attrBacklinks)
    } else if (attr.type._class === core.class.TypeCollaborativeDoc) {
      hasBacklinkAttrs = true
      try {
        const collaborativeDoc = (doc as any)[attr.name] as CollaborativeDoc
        const ydoc = await loadCollaborativeDoc(storage, control.workspace, collaborativeDoc, control.ctx)
        if (ydoc !== undefined) {
          const attrBacklinks = getBacklinks(backlinkId, backlinkClass, attachedDocId, yDocToBuffer(ydoc))
          backlinks.push(...attrBacklinks)
        }
      } catch {
        // do nothing, the collaborative doc does not sem to exist yet
      }
    }
  }

  // There is a chance that backlinks are managed manually
  // do not update backlinks if there are no backlink sources in the doc
  if (hasBacklinkAttrs) {
    const current = await control.findAll(chunter.class.Backlink, {
      backlinkId,
      backlinkClass,
      attachedDocId,
      collection: 'backlinks'
    })

    return getBacklinksTxes(txFactory, backlinks, current)
  }

  return []
}

export function getBacklinks (
  backlinkId: Ref<Doc>,
  backlinkClass: Ref<Class<Doc>>,
  attachedDocId: Ref<Doc> | undefined,
  content: string | Buffer
): Array<Data<Backlink>> {
  const result: Array<Data<Backlink>> = []

  const references = []

  if (content instanceof Buffer) {
    const nodes = yDocContentToNodes(extensions, content)
    for (const node of nodes) {
      references.push(...extractReferences(node))
    }
  } else {
    const doc = parseHTML(content, extensions)
    references.push(...extractReferences(doc))
  }
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

export async function getRemoveBacklinksTxes (
  control: TriggerControl,
  txFactory: TxFactory,
  doc: Ref<Doc>
): Promise<Tx[]> {
  const txes: Tx[] = []

  const backlinks = await control.findAll(chunter.class.Backlink, { attachedDocId: doc, collection: 'backlinks' })
  for (const b of backlinks) {
    const innerTx = txFactory.createTxRemoveDoc(b._class, b.space, b._id)
    txes.push(
      txFactory.createTxCollectionCUD(b.attachedToClass, b.attachedTo, chunter.space.Backlinks, b.collection, innerTx)
    )
  }

  return txes
}

export function guessBacklinkTx (hierarchy: Hierarchy, tx: TxCUD<Doc>): TxCUD<Doc> {
  // Try to guess backlink target Tx for TxCollectionCUD txes based on collaborators availability
  if (hierarchy.isDerived(tx._class, core.class.TxCollectionCUD)) {
    const cltx = tx as TxCollectionCUD<Doc, AttachedDoc>
    tx = TxProcessor.extractTx(cltx) as TxCUD<Doc>

    const mixin = hierarchy.classHierarchyMixin(tx.objectClass, notification.mixin.ClassCollaborators)
    return mixin !== undefined ? tx : cltx
  }
  return tx
}
