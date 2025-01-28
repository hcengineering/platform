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
  type CreateContentRequest,
  type CreateContentResponse,
  decodeDocumentId
} from '@hcengineering/collaborator-client'
import { saveCollabJson } from '@hcengineering/collaboration'
import { type Blob, type Ref, MeasureContext, type WorkspaceDataId } from '@hcengineering/core'
import { Context } from '../../context'
import { RpcMethodParams } from '../rpc'

export async function createContent (
  ctx: MeasureContext,
  context: Context,
  documentName: string,
  payload: CreateContentRequest,
  params: RpcMethodParams
): Promise<CreateContentResponse> {
  const { content } = payload
  const { hocuspocus, storageAdapter } = params

  if (hocuspocus.documents.has(documentName) || hocuspocus.loadingDocuments.has(documentName)) {
    throw new Error(`Document ${documentName} already exists`)
  }

  const { documentId, workspaceId } = decodeDocumentId(documentName)

  const result: Record<string, Ref<Blob>> = {}
  const dataId = context.workspaceDataId ?? (workspaceId as WorkspaceDataId)
  for (const [field, markup] of Object.entries(content)) {
    const blob = await saveCollabJson(ctx, storageAdapter, dataId, documentId, markup)
    result[field] = blob
  }

  return { content: result }
}
