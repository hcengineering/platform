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
  formatCollaborativeDoc,
  generateId,
  parseCollaborativeDoc
} from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import { Doc as YDoc } from 'yjs'

import { yDocBranch } from '../history/branch'
import { restoreYdocSnapshot } from '../history/snapshot'
import { yDocFromMinio, yDocToMinio } from './minio'

/** @public */
export function collaborativeHistoryDocId (id: string): string {
  const suffix = '#history'
  return id.endsWith(suffix) ? id : id + suffix
}

/** @public */
export async function loadCollaborativeDoc (
  minio: MinioService,
  workspace: WorkspaceId,
  collaborativeDoc: CollaborativeDoc,
  ctx: MeasureContext
): Promise<YDoc | undefined> {
  const { documentId, versionId } = parseCollaborativeDoc(collaborativeDoc)
  return await loadCollaborativeDocVersion(minio, workspace, documentId, versionId, ctx)
}

/** @public */
export async function loadCollaborativeDocVersion (
  minio: MinioService,
  workspace: WorkspaceId,
  documentId: string,
  versionId: CollaborativeDocVersion,
  ctx: MeasureContext
): Promise<YDoc | undefined> {
  const historyDocumentId = collaborativeHistoryDocId(documentId)

  return await ctx.with('loadCollaborativeDoc', { type: 'content' }, async (ctx) => {
    const yContent = await ctx.with('yDocFromMinio', { type: 'content' }, async () => {
      return await yDocFromMinio(minio, workspace, documentId, new YDoc({ gc: false }))
    })

    if (versionId === 'HEAD') {
      return yContent
    } else {
      const yHistory = await ctx.with('yDocFromMinio', { type: 'history' }, async () => {
        return await yDocFromMinio(minio, workspace, historyDocumentId, new YDoc({ gc: false }))
      })

      return await ctx.with('restoreYdocSnapshot', {}, () => {
        return restoreYdocSnapshot(yContent, yHistory, versionId)
      })
    }
  })
}

/** @public */
export async function saveCollaborativeDoc (
  minio: MinioService,
  workspace: WorkspaceId,
  collaborativeDoc: CollaborativeDoc,
  ydoc: YDoc,
  ctx: MeasureContext
): Promise<void> {
  const { documentId, versionId } = parseCollaborativeDoc(collaborativeDoc)
  await saveCollaborativeDocVersion(minio, workspace, documentId, versionId, ydoc, ctx)
}

/** @public */
export async function saveCollaborativeDocVersion (
  minio: MinioService,
  workspace: WorkspaceId,
  documentId: string,
  versionId: CollaborativeDocVersion,
  ydoc: YDoc,
  ctx: MeasureContext
): Promise<void> {
  await ctx.with('saveCollaborativeDoc', {}, async (ctx) => {
    if (versionId === 'HEAD') {
      await ctx.with('yDocToMinio', {}, async () => {
        await yDocToMinio(minio, workspace, documentId, ydoc)
      })
    } else {
      console.warn('Cannot save non HEAD document version', documentId, versionId)
    }
  })
}

/** @public */
export async function removeCollaborativeDoc (
  minio: MinioService,
  workspace: WorkspaceId,
  collaborativeDocs: CollaborativeDoc[],
  ctx: MeasureContext
): Promise<void> {
  await ctx.with('removeollaborativeDoc', {}, async (ctx) => {
    const toRemove: string[] = []
    for (const collaborativeDoc of collaborativeDocs) {
      const { documentId, versionId } = parseCollaborativeDoc(collaborativeDoc)
      if (versionId === CollaborativeDocVersionHead) {
        toRemove.push(documentId, collaborativeHistoryDocId(documentId))
      } else {
        console.warn('Cannot remove non HEAD document version', documentId, versionId)
      }
    }
    if (toRemove.length > 0) {
      await ctx.with('remove', {}, async () => {
        await minio.remove(workspace, toRemove)
      })
    }
  })
}

/** @public */
export async function copyCollaborativeDoc (
  minio: MinioService,
  workspace: WorkspaceId,
  source: CollaborativeDoc,
  target: CollaborativeDoc,
  ctx: MeasureContext
): Promise<YDoc | undefined> {
  const { documentId: sourceDocumentId, versionId: sourceVersionId } = parseCollaborativeDoc(source)
  const { documentId: targetDocumentId, versionId: targetVersionId } = parseCollaborativeDoc(target)

  if (sourceDocumentId === targetDocumentId) {
    // no need to copy into itself
    return
  }

  await ctx.with('copyCollaborativeDoc', {}, async (ctx) => {
    const ySource = await ctx.with('loadCollaborativeDocVersion', {}, async (ctx) => {
      return await loadCollaborativeDocVersion(minio, workspace, sourceDocumentId, sourceVersionId, ctx)
    })

    if (ySource === undefined) {
      return
    }

    const yTarget = await ctx.with('yDocBranch', {}, () => {
      return yDocBranch(ySource)
    })

    await ctx.with('saveCollaborativeDocVersion', {}, async (ctx) => {
      await saveCollaborativeDocVersion(minio, workspace, targetDocumentId, targetVersionId, yTarget, ctx)
    })
  })
}

/** @public */
export function touchCollaborativeDoc (collaborativeDoc: CollaborativeDoc, revisionId?: string): CollaborativeDoc {
  revisionId ??= generateId()
  const { documentId, versionId } = parseCollaborativeDoc(collaborativeDoc)
  return formatCollaborativeDoc({ documentId, versionId, revisionId })
}

/** @public */
export function isEditableDoc (id: CollaborativeDoc): boolean {
  const data = parseCollaborativeDoc(id)
  return isEditableDocVersion(data.versionId)
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
