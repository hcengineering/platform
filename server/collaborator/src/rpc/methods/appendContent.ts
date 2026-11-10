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

import { type AppendContentRequest, type AppendContentResponse } from '@hcengineering/collaborator-client'
import { MeasureContext } from '@hcengineering/core'
import { applyUpdate, encodeStateAsUpdate } from 'yjs'
import { Context } from '../../context'
import { RpcMethodParams } from '../rpc'

// Like updateContent, but WITHOUT clearing the existing fragment first. Applying
// the incoming update onto the untouched Y.XmlFragment merges (appends) the new
// content into whatever is already there, instead of replacing it. Because the
// mutation runs inside the same hocuspocus direct connection updateContent uses,
// it is race-free against concurrent browser editors via the Y.js CRDT layer.
export async function appendContent (
  ctx: MeasureContext,
  context: Context,
  documentName: string,
  payload: AppendContentRequest,
  params: RpcMethodParams
): Promise<AppendContentResponse> {
  const { content } = payload
  const { hocuspocus, transformer } = params

  const updates = ctx.withSync('transform', {}, () => {
    const updates: Record<string, Uint8Array> = {}

    Object.entries(content).forEach(([field, markup]) => {
      const ydoc = transformer.toYdoc(markup, field)
      updates[field] = encodeStateAsUpdate(ydoc)
    })

    return updates
  })

  const connection = await ctx.with('connect', {}, () => {
    return hocuspocus.openDirectConnection(documentName, context)
  })

  try {
    await ctx.with('append', {}, () =>
      connection.transact((document) => {
        document.transact(() => {
          Object.entries(updates).forEach(([field, update]) => {
            applyUpdate(document, update)
          })
        }, connection)
      })
    )
  } finally {
    await connection.disconnect()
  }

  return {}
}
