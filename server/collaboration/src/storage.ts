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
  type Blob,
  type CollaborativeDoc,
  type Ref,
  type WorkspaceIds,
  type Markup,
  type MarkupBlobRef,
  type MeasureContext,
  generateId,
  makeCollabJsonId,
  makeCollabYdocId
} from '@hcengineering/core'
import { type StorageAdapter } from '@hcengineering/server-core'
import { yDocToMarkup } from '@hcengineering/text-ydoc'
import { Doc as YDoc } from 'yjs'

import { yDocFromBuffer, yDocToBuffer } from './ydoc'

/** @public */
export async function loadCollabYdoc (
  ctx: MeasureContext,
  storageAdapter: StorageAdapter,
  wsIds: WorkspaceIds,
  doc: CollaborativeDoc | MarkupBlobRef
): Promise<YDoc | undefined> {
  const blobId = typeof doc === 'string' ? doc : makeCollabYdocId(doc)

  const blob = await storageAdapter.stat(ctx, wsIds, blobId)
  if (blob === undefined) {
    return undefined
  }

  if (!blob.contentType.includes('application/ydoc')) {
    ctx.warn('invalid content type', { contentType: blob.contentType })
  }

  // no need to apply gc because we load existing document
  // it is either already gc-ed, or gc not needed and it is disabled
  const ydoc = new YDoc({ guid: generateId(), gc: false })

  const buffer = await storageAdapter.read(ctx, wsIds, blobId)
  return yDocFromBuffer(buffer, ydoc)
}

/** @public */
export async function saveCollabYdoc (
  ctx: MeasureContext,
  storageAdapter: StorageAdapter,
  wsIds: WorkspaceIds,
  doc: CollaborativeDoc | MarkupBlobRef,
  ydoc: YDoc
): Promise<Ref<Blob>> {
  const blobId = typeof doc === 'string' ? doc : makeCollabYdocId(doc)

  const buffer = yDocToBuffer(ydoc)
  await storageAdapter.put(ctx, wsIds, blobId, buffer, 'application/ydoc', buffer.length)

  return blobId
}

/** @public */
export async function removeCollabYdoc (
  storageAdapter: StorageAdapter,
  wsIds: WorkspaceIds,
  collaborativeDocs: CollaborativeDoc[],
  ctx: MeasureContext
): Promise<void> {
  const toRemove: string[] = collaborativeDocs.map(makeCollabYdocId)
  if (toRemove.length > 0) {
    await ctx.with('remove', {}, async () => {
      await storageAdapter.remove(ctx, wsIds, toRemove)
    })
  }
}

/** @public */
export async function loadCollabJson (
  ctx: MeasureContext,
  storageAdapter: StorageAdapter,
  wsIds: WorkspaceIds,
  blobId: Ref<Blob>
): Promise<Markup | undefined> {
  const blob = await storageAdapter.stat(ctx, wsIds, blobId)
  if (blob === undefined) {
    return undefined
  }

  if (!blob.contentType.includes('application/json')) {
    ctx.error('invalid content type', { contentType: blob.contentType })
    return undefined
  }

  const buffer = await storageAdapter.read(ctx, wsIds, blobId)
  return buffer.toString()
}

/** @public */
export async function saveCollabJson (
  ctx: MeasureContext,
  storageAdapter: StorageAdapter,
  wsIds: WorkspaceIds,
  doc: CollaborativeDoc,
  content: Markup | YDoc
): Promise<Ref<Blob>> {
  const blobId = makeCollabJsonId(doc)

  const markup = typeof content === 'string' ? content : yDocToMarkup(content, doc.objectAttr)
  const buffer = Buffer.from(markup)
  await storageAdapter.put(ctx, wsIds, blobId, buffer, 'application/json', buffer.length)

  return blobId
}
