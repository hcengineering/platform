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

import { YDocVersion, takeCollaborativeDocSnapshot } from '@hcengineering/collaboration'
import {
  parseDocumentId,
  type TakeSnapshotRequest,
  type TakeSnapshotResponse
} from '@hcengineering/collaborator-client'
import { CollaborativeDocVersionHead, MeasureContext, collaborativeDocParse } from '@hcengineering/core'
import { Doc as YDoc } from 'yjs'
import { Context } from '../../context'
import { RpcMethodParams } from '../rpc'

export async function takeSnapshot (
  ctx: MeasureContext,
  context: Context,
  payload: TakeSnapshotRequest,
  params: RpcMethodParams
): Promise<TakeSnapshotResponse> {
  const { documentId, snapshot } = payload
  const { hocuspocus, storage } = params
  const { workspaceId } = context

  const version: YDocVersion = {
    versionId: snapshot.versionId,
    name: snapshot.versionName ?? snapshot.versionId,
    createdBy: snapshot.createdBy,
    createdOn: Date.now()
  }

  const { collaborativeDoc } = parseDocumentId(documentId)
  const { versionId } = collaborativeDocParse(collaborativeDoc)
  if (versionId !== CollaborativeDocVersionHead) {
    throw new Error('invalid document version')
  }

  const connection = await ctx.with('connect', {}, async () => {
    return await hocuspocus.openDirectConnection(documentId, context)
  })

  try {
    const ydoc = connection.document ?? new YDoc()

    await ctx.with('snapshot', {}, async () => {
      await takeCollaborativeDocSnapshot(storage, workspaceId, collaborativeDoc, ydoc, version, ctx)
    })

    return { ...version }
  } finally {
    await connection.disconnect()
  }
}
