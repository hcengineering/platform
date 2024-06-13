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
  CollaborativeDoc,
  CollaborativeDocVersion,
  CollaborativeDocVersionHead,
  MeasureContext,
  WorkspaceId,
  collaborativeDocParse,
  collaborativeDocUnchain
} from '@hcengineering/core'
import { Doc as YDoc } from 'yjs'

import { StorageAdapter } from '@hcengineering/server-core'
import { yDocBranch } from '../history/branch'
import { YDocVersion } from '../history/history'
import { createYdocSnapshot, restoreYdocSnapshot } from '../history/snapshot'
import { yDocFromStorage, yDocToStorage } from './minio'

/** @public */
export function collaborativeHistoryDocId (id: string): string {
  const suffix = '#history'
  return id.endsWith(suffix) ? id : id + suffix
}

async function loadCollaborativeDocVersion (
  ctx: MeasureContext,
  storageAdapter: StorageAdapter,
  workspace: WorkspaceId,
  documentId: string,
  versionId: string
): Promise<YDoc | undefined> {
  const yContent = await ctx.with('yDocFromStorage', { type: 'content' }, async (ctx) => {
    return await yDocFromStorage(ctx, storageAdapter, workspace, documentId, new YDoc({ gc: false }))
  })

  // the document does not exist
  if (yContent === undefined) {
    return undefined
  }

  if (versionId === 'HEAD') {
    return yContent
  }

  const historyDocumentId = collaborativeHistoryDocId(documentId)
  const yHistory = await ctx.with('yDocFromStorage', { type: 'history' }, async (ctx) => {
    return await yDocFromStorage(ctx, storageAdapter, workspace, historyDocumentId, new YDoc())
  })

  // the history document does not exist
  if (yHistory === undefined) {
    return undefined
  }

  return await ctx.with('restoreYdocSnapshot', {}, () => {
    return restoreYdocSnapshot(yContent, yHistory, versionId)
  })
}

/** @public */
export async function loadCollaborativeDoc (
  storageAdapter: StorageAdapter,
  workspace: WorkspaceId,
  collaborativeDoc: CollaborativeDoc,
  ctx: MeasureContext
): Promise<YDoc | undefined> {
  const sources = collaborativeDocUnchain(collaborativeDoc)

  return await ctx.with('loadCollaborativeDoc', { type: 'content' }, async (ctx) => {
    for (const source of sources) {
      const { documentId, versionId } = collaborativeDocParse(source)
      const ydoc = await loadCollaborativeDocVersion(ctx, storageAdapter, workspace, documentId, versionId)

      if (ydoc !== undefined) {
        return ydoc
      }
    }
    return undefined
  })
}

/** @public */
export async function saveCollaborativeDoc (
  storageAdapter: StorageAdapter,
  workspace: WorkspaceId,
  collaborativeDoc: CollaborativeDoc,
  ydoc: YDoc,
  ctx: MeasureContext
): Promise<void> {
  const { documentId, versionId } = collaborativeDocParse(collaborativeDoc)
  await saveCollaborativeDocVersion(storageAdapter, workspace, documentId, versionId, ydoc, ctx)
}

/** @public */
export async function saveCollaborativeDocVersion (
  storageAdapter: StorageAdapter,
  workspace: WorkspaceId,
  documentId: string,
  versionId: CollaborativeDocVersion,
  ydoc: YDoc,
  ctx: MeasureContext
): Promise<void> {
  await ctx.with('saveCollaborativeDoc', {}, async (ctx) => {
    if (versionId === 'HEAD') {
      await ctx.with('yDocToStorage', {}, async () => {
        await yDocToStorage(ctx, storageAdapter, workspace, documentId, ydoc)
      })
    } else {
      console.warn('Cannot save non HEAD document version', documentId, versionId)
    }
  })
}

/** @public */
export async function removeCollaborativeDoc (
  storageAdapter: StorageAdapter,
  workspace: WorkspaceId,
  collaborativeDocs: CollaborativeDoc[],
  ctx: MeasureContext
): Promise<void> {
  await ctx.with('removeollaborativeDoc', {}, async (ctx) => {
    const toRemove: string[] = []
    for (const collaborativeDoc of collaborativeDocs) {
      const { documentId, versionId } = collaborativeDocParse(collaborativeDoc)
      if (versionId === CollaborativeDocVersionHead) {
        toRemove.push(documentId, collaborativeHistoryDocId(documentId))
      } else {
        console.warn('Cannot remove non HEAD document version', documentId, versionId)
      }
    }
    if (toRemove.length > 0) {
      await ctx.with('remove', {}, async () => {
        await storageAdapter.remove(ctx, workspace, toRemove)
      })
    }
  })
}

/** @public */
export async function copyCollaborativeDoc (
  storageAdapter: StorageAdapter,
  workspace: WorkspaceId,
  source: CollaborativeDoc,
  target: CollaborativeDoc,
  ctx: MeasureContext
): Promise<YDoc | undefined> {
  const { documentId: sourceDocumentId } = collaborativeDocParse(source)
  const { documentId: targetDocumentId, versionId: targetVersionId } = collaborativeDocParse(target)

  if (sourceDocumentId === targetDocumentId) {
    // no need to copy into itself
    return
  }

  await ctx.with('copyCollaborativeDoc', {}, async (ctx) => {
    const ySource = await ctx.with('loadCollaborativeDocVersion', {}, async (ctx) => {
      return await loadCollaborativeDoc(storageAdapter, workspace, source, ctx)
    })

    if (ySource === undefined) {
      return
    }

    const yTarget = await ctx.with('yDocBranch', {}, () => {
      return yDocBranch(ySource)
    })

    await ctx.with('saveCollaborativeDocVersion', {}, async (ctx) => {
      await saveCollaborativeDocVersion(storageAdapter, workspace, targetDocumentId, targetVersionId, yTarget, ctx)
    })
  })
}

/** @public */
export async function takeCollaborativeDocSnapshot (
  storageAdapter: StorageAdapter,
  workspace: WorkspaceId,
  collaborativeDoc: CollaborativeDoc,
  ydoc: YDoc,
  version: YDocVersion,
  ctx: MeasureContext
): Promise<void> {
  const { documentId } = collaborativeDocParse(collaborativeDoc)
  const historyDocumentId = collaborativeHistoryDocId(documentId)

  await ctx.with('takeCollaborativeDocSnapshot', {}, async (ctx) => {
    const yHistory =
      (await ctx.with('yDocFromStorage', { type: 'history' }, async (ctx) => {
        return await yDocFromStorage(ctx, storageAdapter, workspace, historyDocumentId, new YDoc({ gc: false }))
      })) ?? new YDoc()

    await ctx.with('createYdocSnapshot', {}, async () => {
      createYdocSnapshot(ydoc, yHistory, version)
    })

    await ctx.with('yDocToStorage', { type: 'history' }, async (ctx) => {
      await yDocToStorage(ctx, storageAdapter, workspace, historyDocumentId, yHistory)
    })
  })
}

/** @public */
export function isEditableDoc (id: CollaborativeDoc): boolean {
  const { versionId } = collaborativeDocParse(id)
  return isEditableDocVersion(versionId)
}

/** @public */
export function isReadonlyDoc (id: CollaborativeDoc): boolean {
  return !isEditableDoc(id)
}

/** @public */
export function isEditableDocVersion (version: CollaborativeDocVersion): boolean {
  return version === CollaborativeDocVersionHead
}

/** @public */
export function isReadonlyDocVersion (version: CollaborativeDocVersion): boolean {
  return !isEditableDocVersion(version)
}
