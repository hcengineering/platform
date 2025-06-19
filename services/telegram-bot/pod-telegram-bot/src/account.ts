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
    const accountClient = getAccountClient(generateToken(account, undefined, { service: 'telegram-bot' }))
    return await accountClient.getPerson()
  } catch (e) {
    console.error(e)
  }
  return undefined
}

export async function getAccountSocialIds (account: AccountUuid): Promise<SocialId[]> {
  try {
    const accountClient = getAccountClient(generateToken(account, undefined, { service: 'telegram-bot' }))
    return await accountClient.getSocialIds()
  } catch (e) {
    console.error(e)
  }
  return []
}

export async function listIntegrationsByAccount (account: AccountUuid): Promise<IntegrationInfo[]> {
  const client = getAccountClient(generateToken(account, undefined, { service: 'telegram-bot' }))
  const integrations = await client.listIntegrations({ kind: 'telegram-bot' })
  if (integrations.length === 0) return []
  const socialIds = await getAccountSocialIds(account)

  const result: IntegrationInfo[] = []
  for (const integration of integrations) {
    if (integration.workspaceUuid == null) continue
    const socialId = socialIds.find((it) => it._id === integration.socialId)
    if (socialId === undefined) continue
    result.push({
      ...integration,
      workspaceUuid: integration.workspaceUuid,
      account,
      telegramId: Number(socialId.value),
      username: socialId.displayValue
    })
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

export async function getAnyIntegrationByTelegramId (
  telegramId: number,
  workspace?: WorkspaceUuid
): Promise<IntegrationInfo | undefined> {
  const client = getAccountClient(serviceToken())
  const socialId = await client.findFullSocialIdBySocialKey(
    buildSocialIdString({ type: SocialIdType.TELEGRAM, value: telegramId.toString() })
  )
  if (socialId == null) return undefined

  const integrations = await client.listIntegrations({ kind: 'telegram-bot', socialId: socialId._id })
  if (integrations.length === 0) return undefined

  const integration = workspace != null ? integrations.find((it) => it.workspaceUuid === workspace) : integrations[0]
  if (integration == null) return undefined
  return {
    ...integration,
    workspaceUuid: integration.workspaceUuid as WorkspaceUuid,
    account: socialId.personUuid as AccountUuid,
    telegramId,
    username: socialId.displayValue
  }
}

export async function getAnyIntegrationByAccount (
  account: AccountUuid,
  workspace?: WorkspaceUuid
): Promise<IntegrationInfo | undefined> {
  const client = getAccountClient(generateToken(account, undefined, { service: 'telegram-bot' }))
  const integrations = await client.listIntegrations({ kind: 'telegram-bot', workspaceUuid: workspace })
  if (integrations.length === 0) return undefined

  const integration = integrations[0]
  const socialId = await getAccountClient(serviceToken()).findFullSocialIdBySocialKey(integration.socialId)
  if (socialId == null) return undefined

  return {
    ...integration,
    workspaceUuid: integration.workspaceUuid as WorkspaceUuid,
    account,
    telegramId: Number(socialId.value),
    username: socialId?.displayValue
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
    console.error('Social id connected to another account', socialId, account)
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
  const integrations = await accountClient.listIntegrations({ kind: 'telegram-bot', socialId })
  for (const integration of integrations) {
    await accountClient.deleteIntegration({ socialId, kind: 'telegram-bot', workspaceUuid: integration.workspaceUuid })
  }
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
