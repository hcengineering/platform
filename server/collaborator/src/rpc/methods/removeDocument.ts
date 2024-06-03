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

import { collaborativeHistoryDocId } from '@hcengineering/collaboration'
import {
  parseDocumentId,
  type RemoveDocumentRequest,
  type RemoveDocumentResponse
} from '@hcengineering/collaborator-client'
import { MeasureContext, collaborativeDocParse } from '@hcengineering/core'
import { Context } from '../../context'
import { RpcMethodParams } from '../rpc'

export async function removeDocument (
  ctx: MeasureContext,
  context: Context,
  payload: RemoveDocumentRequest,
  params: RpcMethodParams
): Promise<RemoveDocumentResponse> {
  const { documentId } = payload
  const { hocuspocus, storage: minio } = params
  const { workspaceId } = context

  const document = hocuspocus.documents.get(documentId)
  if (document !== undefined) {
    hocuspocus.closeConnections(documentId)
    hocuspocus.unloadDocument(document)
  }

  const { collaborativeDoc } = parseDocumentId(documentId)
  const { documentId: minioDocumentId } = collaborativeDocParse(collaborativeDoc)
  const historyDocumentId = collaborativeHistoryDocId(minioDocumentId)

  try {
    await minio.remove(ctx, workspaceId, [minioDocumentId, historyDocumentId])
  } catch (err) {
    ctx.error('failed to remove document', { documentId, error: err })
  }

  return {}
}
