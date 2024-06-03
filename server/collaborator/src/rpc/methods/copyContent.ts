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

import { YDocVersion, takeCollaborativeDocSnapshot, yDocCopyXmlField } from '@hcengineering/collaboration'
import { parseDocumentId, type CopyContentRequest, type CopyContentResponse } from '@hcengineering/collaborator-client'
import { MeasureContext } from '@hcengineering/core'
import { Doc as YDoc } from 'yjs'
import { Context } from '../../context'
import { RpcMethodParams } from '../rpc'

export async function copyContent (
  ctx: MeasureContext,
  context: Context,
  payload: CopyContentRequest,
  params: RpcMethodParams
): Promise<CopyContentResponse> {
  const { documentId, sourceField, targetField, snapshot } = payload
  const { hocuspocus, storage } = params
  const { workspaceId } = context

  const connection = await ctx.with('connect', {}, async () => {
    return await hocuspocus.openDirectConnection(documentId, context)
  })

  try {
    await ctx.with('copy', {}, async () => {
      await connection.transact((document) => {
        yDocCopyXmlField(document, sourceField, targetField)
      })
    })

    if (snapshot !== undefined && snapshot.versionId !== 'HEAD') {
      const ydoc = connection.document ?? new YDoc()
      const { collaborativeDoc } = parseDocumentId(documentId)

      const version: YDocVersion = {
        versionId: snapshot.versionId,
        name: snapshot.versionName ?? snapshot.versionId,
        createdBy: snapshot.createdBy,
        createdOn: Date.now()
      }

      await ctx.with('snapshot', {}, async () => {
        await takeCollaborativeDocSnapshot(storage, workspaceId, collaborativeDoc, ydoc, version, ctx)
      })
    }
  } finally {
    await connection.disconnect()
  }

  return {}
}
