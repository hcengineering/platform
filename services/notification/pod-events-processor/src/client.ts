//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { getClient as getAccountClient, type AccountClient } from '@hcengineering/account-client'
import { createRestTxOperations } from '@hcengineering/api-client'
import core, { PersonId, systemAccountUuid, type TxOperations, type WorkspaceUuid } from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import config from './config'

export async function getClient (
  workspaceUuid: WorkspaceUuid,
  socialId?: PersonId,
  serviceTag: string = config.ServiceId
): Promise<{ client: TxOperations, accountClient: AccountClient }> {
  const token = generateToken(systemAccountUuid, workspaceUuid, { service: serviceTag })
  let accountClient = getAccountClient(config.AccountsUrl, token)

  // If we want the notification author to be a specific user, we can obtain a workspace token for that person.
  if (socialId !== undefined && socialId !== core.account.System) {
    const personUuid = await accountClient.findPersonBySocialId(socialId, true)
    if (personUuid === undefined) {
      throw new Error(`Global person not found for social-id ${socialId}`)
    }
    const token = generateToken(personUuid, workspaceUuid, { service: serviceTag })
    accountClient = getAccountClient(config.AccountsUrl, token)
  }

  const wsInfo = await accountClient.getLoginInfoByToken()
  if (wsInfo == null || !('endpoint' in wsInfo)) {
    throw new Error('Invalid login info')
  }
  const transactorUrl = wsInfo.endpoint.replace('ws://', 'http://').replace('wss://', 'https://')
  const client = await createRestTxOperations(transactorUrl, wsInfo.workspace, wsInfo.token)
  return { client, accountClient }
}
