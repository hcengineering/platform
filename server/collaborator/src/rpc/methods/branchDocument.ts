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

import { yDocBranchWithGC } from '@hcengineering/collaboration'
import { type BranchDocumentRequest, type BranchDocumentResponse } from '@hcengineering/collaborator-client'
import { MeasureContext } from '@hcengineering/core'
import { applyUpdate, encodeStateAsUpdate } from 'yjs'
import { Context } from '../../context'
import { RpcMethodParams } from '../rpc'

export async function branchDocument (
  ctx: MeasureContext,
  context: Context,
  payload: BranchDocumentRequest,
  params: RpcMethodParams
): Promise<BranchDocumentResponse> {
  const { sourceDocumentId, targetDocumentId } = payload
  const { hocuspocus } = params

  const sourceConnection = await ctx.with('connect', { type: 'source' }, async () => {
    return await hocuspocus.openDirectConnection(sourceDocumentId, context)
  })

  const targetConnection = await ctx.with('connect', { type: 'target' }, async () => {
    return await hocuspocus.openDirectConnection(targetDocumentId, context)
  })

  try {
    let update = new Uint8Array()

    await sourceConnection.transact((document) => {
      const copy = yDocBranchWithGC(document)
      update = encodeStateAsUpdate(copy)
    })

    await targetConnection.transact((document) => {
      applyUpdate(document, update)
    })
  } finally {
    await sourceConnection.disconnect()
    await targetConnection.disconnect()
  }

  return {}
}
