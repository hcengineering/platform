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
import { getClient as getAccountClient, AccountClient } from '@hcengineering/account-client'
import { createRestTxOperations } from '@hcengineering/api-client'
import { Event } from '@hcengineering/calendar'
import core, { Hierarchy, PersonId, systemAccountUuid, TxOperations, WorkspaceUuid } from '@hcengineering/core'
import love from '@hcengineering/love'
import { generateToken } from '@hcengineering/server-token'
import config from './config'

export async function getClient (
  workspaceUuid: WorkspaceUuid,
  socialId?: PersonId
): Promise<{ client: TxOperations, accountClient: AccountClient }> {
  const token = generateToken(systemAccountUuid, workspaceUuid, { service: 'calendar-mailer' })
  let accountClient = getAccountClient(config.accountsUrl, token)

  if (socialId !== undefined && socialId !== core.account.System) {
    const personUuid = await accountClient.findPersonBySocialId(socialId, true)
    if (personUuid === undefined) {
      throw new Error('Global person not found')
    }
    const token = generateToken(personUuid, workspaceUuid, { service: 'calendar-mailer' })
    accountClient = getAccountClient(config.accountsUrl, token)
  }

  const wsInfo = await accountClient.getLoginInfoByToken()
  if (wsInfo == null || !('endpoint' in wsInfo)) {
    throw new Error('Invalid login info')
  }
  const transactorUrl = wsInfo.endpoint.replace('ws://', 'http://').replace('wss://', 'https://')
  const client = await createRestTxOperations(transactorUrl, wsInfo.workspace, wsInfo.token)
  return { client, accountClient }
}

const hierarchies = new Map<WorkspaceUuid, Hierarchy>()

export async function isMeeting (workspaceUuid: WorkspaceUuid, event: Event): Promise<boolean> {
  let hierarchy = hierarchies.get(workspaceUuid)
  if (hierarchy === undefined) {
    const { client } = await getClient(workspaceUuid)
    hierarchy = client.getHierarchy()
    hierarchies.set(workspaceUuid, hierarchy)
  }
  return hierarchy.hasMixin(event, love.mixin.Meeting)
}
