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
import { type UpdateContentRequest, type UpdateContentResponse } from '@hcengineering/collaborator-client'
import { applyUpdate, encodeStateAsUpdate } from 'yjs'
import { Context } from '../../context'
import { RpcMethodParams } from '../rpc'

export async function updateContent (
  ctx: MeasureContext,
  context: Context,
  documentId: string,
  payload: UpdateContentRequest,
  params: RpcMethodParams
): Promise<UpdateContentResponse> {
  const { content } = payload
  const { hocuspocus, transformer } = params

  const updates = await ctx.with('transform', {}, () => {
    const updates: Record<string, Uint8Array> = {}

    Object.entries(content).forEach(([field, markup]) => {
      const ydoc = transformer.toYdoc(markup, field)
      updates[field] = encodeStateAsUpdate(ydoc)
    })

    return updates
  })

  const connection = await ctx.with('connect', {}, async () => {
    return await hocuspocus.openDirectConnection(documentId, context)
  })

  try {
    await ctx.with('update', {}, async () => {
      await connection.transact((document) => {
        document.transact(() => {
          Object.entries(updates).forEach(([field, update]) => {
            const fragment = document.getXmlFragment(field)
            fragment.delete(0, fragment.length)
            applyUpdate(document, update)
          })
        }, connection)
      })
    })
  } finally {
    await connection.disconnect()
  }

  return {}
}
