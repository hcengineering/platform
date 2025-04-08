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
import {
  AccountUuid,
  Person,
  PersonId,
  SocialId,
  SocialIdType,
  WorkspaceUuid,
  buildSocialIdString
} from '@hcengineering/core'
import { getAccountClient } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import { Integration } from '@hcengineering/account-client'

import { serviceToken } from './utils'
import { IntegrationInfo } from './types'

export async function getAccountPerson (account: AccountUuid): Promise<Person | undefined> {
  try {
    const accountClient = getAccountClient(generateToken(account))
    return await accountClient.getPerson()
  } catch (e) {
    console.error(e)
  }
  return undefined
}

export async function getAccountSocialIds (account: AccountUuid): Promise<SocialId[]> {
  try {
    const accountClient = getAccountClient(generateToken(account))
    return await accountClient.getSocialIds()
  } catch (e) {
    console.error(e)
  }
  return []
}

export async function listIntegrationsByAccount (account: AccountUuid): Promise<IntegrationInfo[]> {
  const socialIds = await getAccountSocialIds(account)
  const telegramIds = socialIds.filter((it) => it.type === SocialIdType.TELEGRAM && it.verifiedOn != null)
  if (telegramIds.length === 0) return []

  const client = getAccountClient(serviceToken())

  const result: IntegrationInfo[] = []
  for (const id of telegramIds) {
    const integrations = await client.listIntegrations({ kind: 'telegram-bot', socialId: id._id })

    result.push(
      ...integrations.map((it) => ({
        ...it,
        workspaceUuid: it.workspaceUuid as WorkspaceUuid,
        account,
        telegramId: Number(id.value),
        username: id?.displayValue
      }))
    )
  }

  return result
}

export async function listIntegrationsByTelegramId (telegramId: number): Promise<IntegrationInfo[]> {
  const client = getAccountClient(serviceToken())
  const socialId = await client.findFullSocialIdBySocialKey(
    buildSocialIdString({ type: SocialIdType.TELEGRAM, value: telegramId.toString() })
  )
  if (socialId == null) return []

  const integrations = await client.listIntegrations({ kind: 'telegram-bot', socialId: socialId._id })
  if (integrations == null) return []

  return integrations.map((it) => ({
    ...it,
    workspaceUuid: it.workspaceUuid as WorkspaceUuid,
    account: socialId.personUuid as AccountUuid,
    telegramId,
    username: socialId.displayValue
  }))
}

export async function getIntegrationByTelegramId (
  telegramId: number,
  workspace?: WorkspaceUuid
): Promise<IntegrationInfo | undefined> {
  const client = getAccountClient(serviceToken())
  const socialId = await client.findFullSocialIdBySocialKey(
    buildSocialIdString({ type: SocialIdType.TELEGRAM, value: telegramId.toString() })
  )
  if (socialId == null) return undefined

  const integration = await client.getIntegration({
    kind: 'telegram-bot',
    socialId: socialId._id,
    workspaceUuid: workspace
  })
  if (integration == null) return undefined

  return {
    ...integration,
    workspaceUuid: integration.workspaceUuid as WorkspaceUuid,
    account: socialId.personUuid as AccountUuid,
    telegramId,
    username: socialId.displayValue
  }
}

export async function getIntegrationByAccount (
  account: AccountUuid,
  workspace?: WorkspaceUuid
): Promise<IntegrationInfo | undefined> {
  const socialIds = await getAccountSocialIds(account)
  const telegramIds = socialIds.filter((it) => it.type === SocialIdType.TELEGRAM && it.verifiedOn != null)
  if (telegramIds.length === 0) return undefined

  const client = getAccountClient(serviceToken())

  for (const id of telegramIds) {
    const integration = await client.getIntegration({
      kind: 'telegram-bot',
      socialId: id._id,
      workspaceUuid: workspace
    })
    if (integration != null) {
      return {
        ...integration,
        workspaceUuid: integration.workspaceUuid as WorkspaceUuid,
        account,
        telegramId: Number(id.value),
        username: id?.displayValue
      }
    }
  }
}

export async function getOrCreateSocialId (
  account: AccountUuid,
  telegramId: number,
  username?: string
): Promise<PersonId> {
  const accountClient = getAccountClient(serviceToken())
  const socialId = await accountClient.findFullSocialIdBySocialKey(
    buildSocialIdString({ type: SocialIdType.TELEGRAM, value: telegramId.toString() })
  )
  if (socialId == null) {
    return await accountClient.addSocialIdToPerson(
      account,
      SocialIdType.TELEGRAM,
      telegramId.toString(),
      true,
      username
    )
  }

  // TODO: proper handle if connected to other account
  if (socialId.personUuid !== account) {
    throw new Error('Social id connected to another account')
  }

  if (socialId.displayValue !== username) {
    await accountClient.updateSocialId(socialId._id, username ?? '')
  }

  return socialId._id
}

export async function createIntegration (socialId: PersonId, workspace: WorkspaceUuid): Promise<Integration> {
  const accountClient = getAccountClient(serviceToken())
  const integration = {
    socialId,
    kind: 'telegram-bot',
    workspaceUuid: workspace
  }
  await accountClient.createIntegration(integration)
  return integration
}

export async function removeIntegrationsByTg (telegramId: number): Promise<void> {
  const accountClient = getAccountClient(serviceToken())
  const socialId = await accountClient.findSocialIdBySocialKey(
    buildSocialIdString({ type: SocialIdType.TELEGRAM, value: telegramId.toString() })
  )
  if (socialId == null) return
  await accountClient.deleteIntegration({ socialId, kind: 'telegram-bot' })
}

export async function addWorkspace (integration: IntegrationInfo, workspace: WorkspaceUuid): Promise<void> {
  const client = getAccountClient(serviceToken())
  await client.createIntegration({ ...integration, workspaceUuid: workspace })
}

export async function disableIntegration (integration: IntegrationInfo): Promise<void> {
  const client = getAccountClient(serviceToken())
  await client.updateIntegration({
    ...integration,
    data: {
      disabled: true
    }
  })
}

export async function enableIntegration (integration: IntegrationInfo): Promise<void> {
  const client = getAccountClient(serviceToken())
  await client.updateIntegration({
    ...integration,
    data: {
      disabled: false
    }
  })
}
