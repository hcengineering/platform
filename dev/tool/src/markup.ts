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

import {
  loadCollabYdoc,
  saveCollabJson,
  saveCollabYdoc,
  yDocCopyXmlField,
  yDocFromBuffer
} from '@hcengineering/collaboration'
import core, {
  type Blob,
  type Doc,
  type Hierarchy,
  type MeasureContext,
  type Ref,
  type TxCreateDoc,
  type TxUpdateDoc,
  DOMAIN_TX,
  SortingOrder,
  type WorkspaceIds,
  makeCollabId,
  makeCollabYdocId,
  makeDocCollabId
} from '@hcengineering/core'
import document, { type Document } from '@hcengineering/document'
import documents from '@hcengineering/controlled-documents'
import { DOMAIN_DOCUMENT } from '@hcengineering/model-document'
import { DOMAIN_DOCUMENTS } from '@hcengineering/model-controlled-documents'
import { type StorageAdapter } from '@hcengineering/server-core'
import { type Db } from 'mongodb'

export interface RestoreWikiContentParams {
  dryRun: boolean
}

export async function restoreWikiContentMongo (
  ctx: MeasureContext,
  db: Db,
  wsIds: WorkspaceIds,
  storageAdapter: StorageAdapter,
  params: RestoreWikiContentParams
): Promise<void> {
  const iterator = db.collection<Document>(DOMAIN_DOCUMENT).find({ _class: document.class.Document })

  let processedCnt = 0
  let restoredCnt = 0

  function printStats (): void {
    console.log('...processed', processedCnt, 'restored', restoredCnt)
  }

  try {
    while (true) {
      const doc = await iterator.next()
      if (doc === null) break

      processedCnt++
      if (processedCnt % 100 === 0) {
        printStats()
      }

      const correctCollabId = { objectClass: doc._class, objectId: doc._id, objectAttr: 'content' }

      const wrongYdocId = await findWikiDocYdocName(ctx, db, doc._id)
      if (wrongYdocId === undefined) {
        console.log('current ydoc not found', doc._id)
        continue
      }

      const stat = storageAdapter.stat(ctx, wsIds, wrongYdocId)
      if (stat === undefined) continue

      const ydoc1 = await loadCollabYdoc(ctx, storageAdapter, wsIds, correctCollabId)
      const ydoc2 = await loadCollabYdoc(ctx, storageAdapter, wsIds, wrongYdocId)

      if (ydoc1 !== undefined && ydoc1.share.has('content')) {
        // There already is content, we should skip the document
        continue
      }

      if (ydoc2 === undefined) {
        // There are no content to restore
        continue
      }

      try {
        console.log('restoring content for', doc._id)
        if (!params.dryRun) {
          if (ydoc2.share.has('description') && !ydoc2.share.has('content')) {
            yDocCopyXmlField(ydoc2, 'description', 'content')
          }

          await saveCollabYdoc(ctx, storageAdapter, wsIds, correctCollabId, ydoc2)
        }
        restoredCnt++
      } catch (err: any) {
        console.error('failed to restore content for', doc._id, err)
      }
    }
  } finally {
    printStats()
    await iterator.close()
  }
}

export async function findWikiDocYdocName (
  ctx: MeasureContext,
  db: Db,
  doc: Ref<Document>
): Promise<Ref<Blob> | undefined> {
  const updateContentTx = await db.collection<TxUpdateDoc<Document & { content: string }>>(DOMAIN_TX).findOne(
    {
      _class: core.class.TxUpdateDoc,
      objectId: doc,
      objectClass: document.class.Document,
      'operations.content': { $exists: true }
    },
    {
      sort: { modifiedOn: SortingOrder.Descending }
    }
  )

  if (updateContentTx?.operations?.content != null) {
    const value = updateContentTx.operations.content as string
    if (value.includes(':')) {
      console.log('found update content tx', doc, value)
      return value.split(':')[0] as Ref<Blob>
    }
  }

  const updateDescriptionTx = await db.collection<TxUpdateDoc<Document & { description: string }>>(DOMAIN_TX).findOne(
    {
      _class: core.class.TxUpdateDoc,
      objectId: doc,
      objectClass: document.class.Document,
      'operations.description': { $exists: true }
    },
    {
      sort: { modifiedOn: SortingOrder.Descending }
    }
  )

  if (updateDescriptionTx?.operations?.description != null) {
    const value = updateDescriptionTx.operations.description
    if (value.includes(':')) {
      console.log('found update description tx', doc, value)
      return value.split(':')[0] as Ref<Blob>
    }
  }

  const createContentTx = await db.collection<TxCreateDoc<Document & { content: string }>>(DOMAIN_TX).findOne({
    _class: core.class.TxCreateDoc,
    objectId: doc,
    objectClass: document.class.Document,
    'attributes.content': { $exists: true }
  })

  if (createContentTx?.attributes?.content != null) {
    const value = createContentTx.attributes.content
    if (value.includes(':')) {
      console.log('found create content tx', doc, value)
      return value.split(':')[0] as Ref<Blob>
    }
  }

  const createContentIdTx = await db.collection<TxCreateDoc<Document & { contentId: Ref<Blob> }>>(DOMAIN_TX).findOne({
    _class: core.class.TxCreateDoc,
    objectId: doc,
    objectClass: document.class.Document,
    'attributes.contentId': { $exists: true }
  })

  if (createContentIdTx?.attributes?.contentId != null) {
    const value = createContentIdTx.attributes.contentId
    console.log('found create contentId tx', doc, value)
    return value
  }
}

export interface RestoreControlledDocContentParams {
  dryRun: boolean
}

export async function restoreControlledDocContentMongo (
  ctx: MeasureContext,
  db: Db,
  wsIds: WorkspaceIds,
  storageAdapter: StorageAdapter,
  params: RestoreWikiContentParams
): Promise<void> {
  const iterator = db.collection<Doc>(DOMAIN_DOCUMENTS).find({
    _class: {
      $in: [documents.class.ControlledDocument, documents.class.ControlledDocumentSnapshot]
    }
  })

  let processedCnt = 0
  let restoredCnt = 0

  function printStats (): void {
    console.log('...processed', processedCnt, 'restored', restoredCnt)
  }

  try {
    while (true) {
      const doc = await iterator.next()
      if (doc === null) break

      const restored = await restoreControlledDocContentForDoc(ctx, db, wsIds, storageAdapter, params, doc, 'content')
      if (restored) {
        restoredCnt++
      }

      processedCnt++
      if (processedCnt % 100 === 0) {
        printStats()
      }
    }
  } finally {
    printStats()
    await iterator.close()
  }
}

export async function restoreControlledDocContentForDoc (
  ctx: MeasureContext,
  db: Db,
  wsIds: WorkspaceIds,
  storageAdapter: StorageAdapter,
  params: RestoreWikiContentParams,
  doc: Doc,
  attribute: string
): Promise<boolean> {
  const tx = await db.collection<TxCreateDoc<Doc>>(DOMAIN_TX).findOne({
    _class: core.class.TxCreateDoc,
    objectId: doc._id,
    objectClass: doc._class
  })

  // It is expected that tx contains attribute with content in old collaborative doc format
  // the original value here looks like '65b7f82f4d422b89d4cbdd6f:HEAD:0'
  const attribures = tx?.attributes ?? {}
  const value = (attribures as any)[attribute] as string
  if (value == null || !value.includes(':')) {
    console.log('no content to restore', doc._class, doc._id)
    return false
  }

  const currentYdocId = value.split(':')[0] as Ref<Blob>
  const ydocId = makeCollabYdocId(makeDocCollabId(doc, attribute))

  // Ensure that we don't have new content in storage
  const stat = await storageAdapter.stat(ctx, wsIds, ydocId)
  if (stat !== undefined) {
    console.log('content already restored', doc._class, doc._id, ydocId)
    return false
  }

  console.log('restoring content', doc._id, currentYdocId, '-->', ydocId)
  if (!params.dryRun) {
    try {
      const stat = await storageAdapter.stat(ctx, wsIds, currentYdocId)
      if (stat === undefined) {
        console.log('no content to restore', doc._class, doc._id, ydocId)
        return false
      }

      const data = await storageAdapter.read(ctx, wsIds, currentYdocId)
      await storageAdapter.put(ctx, wsIds, ydocId, data, 'application/ydoc', data.length)
    } catch (err: any) {
      console.error('failed to restore content for', doc._class, doc._id, err)
      return false
    }
  }

  return true
}

export async function restoreMarkupRefsMongo (
  ctx: MeasureContext,
  db: Db,
  wsIds: WorkspaceIds,
  hierarchy: Hierarchy,
  storageAdapter: StorageAdapter
): Promise<void> {
  const classes = hierarchy.getDescendants(core.class.Doc)
  for (const _class of classes) {
    const domain = hierarchy.findDomain(_class)
    if (domain === undefined) continue

    const allAttributes = hierarchy.getAllAttributes(_class)
    const attributes = Array.from(allAttributes.values()).filter((attribute) => {
      return hierarchy.isDerived(attribute.type._class, core.class.TypeCollaborativeDoc)
    })

    if (attributes.length === 0) continue
    if (hierarchy.isMixin(_class) && attributes.every((p) => p.attributeOf !== _class)) continue

    ctx.info('processing', { _class, attributes: attributes.map((p) => p.name) })

    const collection = db.collection<Doc>(domain)
    const iterator = collection.find({ _class })
    try {
      while (true) {
        const doc = await iterator.next()
        if (doc === null) {
          break
        }

        for (const attribute of attributes) {
          const isMixin = hierarchy.isMixin(attribute.attributeOf)

          const attributeName = isMixin ? `${attribute.attributeOf}.${attribute.name}` : attribute.name

          const value = isMixin
            ? ((doc as any)[attribute.attributeOf]?.[attribute.name] as string)
            : ((doc as any)[attribute.name] as string)

          if (typeof value === 'string') {
            continue
          }

          const collabId = makeCollabId(doc._class, doc._id, attribute.name)
          const ydocId = makeCollabYdocId(collabId)

          try {
            const buffer = await storageAdapter.read(ctx, wsIds, ydocId)
            const ydoc = yDocFromBuffer(buffer)

            const jsonId = await saveCollabJson(ctx, storageAdapter, wsIds, collabId, ydoc)
            await collection.updateOne({ _id: doc._id }, { $set: { [attributeName]: jsonId } })
          } catch {}
        }
      }
    } finally {
      await iterator.close()
    }
  }
}
