//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { WorkspaceUuid, type Client } from '@hcengineering/core'
import { createClient, getTransactorEndpoint } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import { systemAccountUuid } from '@hcengineering/core'
import {
  createRestClient as createCommunicationRestClient,
  RestClient as CommunicationRestClient
} from '@hcengineering/communication-rest-client'

export async function getClient (token: string): Promise<Client> {
  const endpoint = await getTransactorEndpoint(token)
  console.log('connecting to', endpoint)
  return await createClient(endpoint, token)
}

export async function getCommunicationClient (workspace: WorkspaceUuid): Promise<CommunicationRestClient> {
  const token = generateToken(systemAccountUuid, workspace, { service: 'gmail' })
  const endpoint = toHttpUrl(await getTransactorEndpoint(token))
  return createCommunicationRestClient(endpoint, workspace, token)
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
