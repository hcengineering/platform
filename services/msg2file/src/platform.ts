//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { generateToken } from '@hcengineering/server-token'
import { systemAccountUuid } from '@hcengineering/core'
import { getTransactorEndpoint } from '@hcengineering/server-client'
import { createRestClient, RestClient } from '@hcengineering/api-client'
import { WorkspaceID } from '@hcengineering/communication-types'

import config from './config'

export async function connectPlatform (workspace: WorkspaceID): Promise<RestClient> {
  const token = generateToken(systemAccountUuid, workspace, { service: config.ServiceID })
  const endpoint = toHttpUrl(await getTransactorEndpoint(token))
  return createRestClient(endpoint, workspace, token)
}

function toHttpUrl (url: string): string {
  if (url.startsWith('ws://')) {
    return url.replace('ws://', 'http://')
  }
  if (url.startsWith('wss://')) {
    return url.replace('wss://', 'https://')
  }
  return url
}
