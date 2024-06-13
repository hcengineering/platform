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

import { MeasureContext } from '@hcengineering/core'
import {
  parseDocumentId,
  type UpdateContentRequest,
  type UpdateContentResponse
} from '@hcengineering/collaborator-client'
import { Doc as YDoc, applyUpdate, encodeStateAsUpdate } from 'yjs'
import { Context } from '../../context'
import { RpcMethodParams } from '../rpc'
import { YDocVersion, takeCollaborativeDocSnapshot } from '@hcengineering/collaboration'

export async function updateContent (
  ctx: MeasureContext,
  context: Context,
  payload: UpdateContentRequest,
  params: RpcMethodParams
): Promise<UpdateContentResponse> {
  const { documentId, field, markup, snapshot } = payload
  const { hocuspocus, transformer, storage } = params
  const { workspaceId } = context

  const update = await ctx.with('transform', {}, () => {
    const ydoc = transformer.toYdoc(markup, field)
    return encodeStateAsUpdate(ydoc)
  })

  const connection = await ctx.with('connect', {}, async () => {
    return await hocuspocus.openDirectConnection(documentId, context)
  })

  try {
    await ctx.with('update', {}, async () => {
      await connection.transact((document) => {
        const fragment = document.getXmlFragment(field)
        document.transact(() => {
          fragment.delete(0, fragment.length)
          applyUpdate(document, update)
        })
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
