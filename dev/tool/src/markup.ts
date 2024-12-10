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

import { loadCollabYdoc, saveCollabYdoc, yDocCopyXmlField } from '@hcengineering/collaboration'
import { type MeasureContext, type WorkspaceId, makeCollabYdocId } from '@hcengineering/core'
import document, { type Document } from '@hcengineering/document'
import { DOMAIN_DOCUMENT } from '@hcengineering/model-document'
import { type StorageAdapter } from '@hcengineering/server-core'
import { type Db } from 'mongodb'

export interface RestoreWikiContentParams {
  dryRun: boolean
}

export async function restoreWikiContentMongo (
  ctx: MeasureContext,
  db: Db,
  workspaceId: WorkspaceId,
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
      if (doc === null) return

      processedCnt++
      if (processedCnt % 100 === 0) {
        printStats()
      }

      const correctCollabId = { objectClass: doc._class, objectId: doc._id, objectAttr: 'content' }
      const wrongCollabId = { objectClass: doc._class, objectId: doc._id, objectAttr: 'description' }

      const stat = storageAdapter.stat(ctx, workspaceId, makeCollabYdocId(wrongCollabId))
      if (stat === undefined) continue

      const ydoc1 = await loadCollabYdoc(ctx, storageAdapter, workspaceId, correctCollabId)
      const ydoc2 = await loadCollabYdoc(ctx, storageAdapter, workspaceId, wrongCollabId)

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

          await saveCollabYdoc(ctx, storageAdapter, workspaceId, correctCollabId, ydoc2)
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
