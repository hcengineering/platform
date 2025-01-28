//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { Blob, Ref, generateId, WorkspaceUuid, WorkspaceDataId } from '@hcengineering/core'
import { decodeToken } from '@hcengineering/server-token'
import { onAuthenticatePayload } from '@hocuspocus/server'
import { ClientFactory, simpleClientFactory } from './platform'

export interface Context {
  connectionId: string
  workspaceId: WorkspaceUuid
  workspaceDataId: WorkspaceDataId
  clientFactory: ClientFactory

  content?: Ref<Blob>
}

interface WithContext {
  context: any
}

export type withContext<T extends WithContext> = Omit<T, 'context'> & {
  context: Context
}

export function buildContext (data: onAuthenticatePayload, wsDataId?: WorkspaceDataId): Context {
  const context = data.context as Partial<Context>

  const connectionId = context.connectionId ?? generateId()
  const decodedToken = decodeToken(data.token)

  const content = (data.requestParameters.get('content') as Ref<Blob>) ?? undefined

  return {
    connectionId,
    workspaceId: decodedToken.workspace,
    workspaceDataId: wsDataId ?? decodedToken.workspace as unknown as WorkspaceDataId,
    clientFactory: simpleClientFactory(decodedToken),
    content
  }
}
