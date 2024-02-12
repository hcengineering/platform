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
  CollaborativeDocVersion,
  CollaborativeDocVersionRef,
  CollaborativeObjectRef,
  Doc,
  MeasureContext,
  TxOperations,
  WorkspaceId,
  collaborativeHistoryId
} from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import { Doc as YDoc } from 'yjs'

import { restoreYdocSnapshot } from './history/snapshot'
import { yDocFromMinio } from './utils/minio'

export async function pushVersion (
  client: TxOperations,
  doc: Doc,
  ref: CollaborativeObjectRef,
  version: CollaborativeDocVersion
): Promise<void> {
  await client.update(
    doc,
    {
      $push: {
        [`${ref.objectAttr}.history`]: version
      }
    }
  )
}

/** @public */
export async function loadCollaborativeDoc (
  minio: MinioService,
  workspace: WorkspaceId,
  version: CollaborativeDocVersionRef,
  ctx: MeasureContext
): Promise<YDoc | undefined> {
  const { contentId, versionId } = version

  // TODO check if we need { gc: false }

  const yContent = await ctx.with('yDocFromMinio', { type: 'content' }, async () => {
    return await yDocFromMinio(minio, workspace, contentId, new YDoc({ gc: false }))
  })

  if (versionId === 'HEAD') {
    return yContent
  } else {
    const historyId = collaborativeHistoryId(contentId)
    const yHistory = await ctx.with('yDocFromMinio', { type: 'history' }, async () => {
      return await yDocFromMinio(minio, workspace, historyId, new YDoc({ gc: false }))
    })

    return await ctx.with('restoreYdocSnapshot', {}, () => {
      return restoreYdocSnapshot(yContent, yHistory, versionId)
    })
  }
}
