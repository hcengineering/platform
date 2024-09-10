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
import { type GetContentRequest, type GetContentResponse } from '@hcengineering/collaborator-client'
import { Context } from '../../context'
import { RpcMethodParams } from '../rpc'

export async function getContent (
  ctx: MeasureContext,
  context: Context,
  documentId: string,
  payload: GetContentRequest,
  params: RpcMethodParams
): Promise<GetContentResponse> {
  const { hocuspocus, transformer } = params

  const connection = await ctx.with('connect', {}, async () => {
    return await hocuspocus.openDirectConnection(documentId, context)
  })

  try {
    const content = await ctx.with('transform', {}, async () => {
      const object: Record<string, string> = {}
      await connection.transact((document) => {
        document.share.forEach((_, field) => {
          object[field] = transformer.fromYdoc(document, field)
        })
      })
      return object
    })

    return { content }
  } finally {
    await connection.disconnect()
  }
}
