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
import { GMAIL_INTEGRATION } from './types'

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

export async function getIntegration (
  token: string,
  socialId: PersonId,
  workspaceUuid?: WorkspaceUuid
): Promise<Integration | null> {
  const client = getAccountClient(token)
  return await client.getIntegration({ kind: GMAIL_INTEGRATION, socialId, workspaceUuid: workspaceUuid ?? null })
}

export async function getIntegrations (token: string): Promise<Integration[]> {
  const client = getAccountClient(token)
  return (await client.listIntegrations({ kind: GMAIL_INTEGRATION })) ?? []
}

export async function getOrCreateSocialIdByEmail (
  token: string,
  account: AccountUuid,
  email: string
): Promise<PersonId> {
  const client = getAccountClient(token)
  const socialId = await client.findFullSocialIdBySocialKey(
    buildSocialIdString({ type: SocialIdType.EMAIL, value: email })
  )
  if (socialId != null) return socialId._id
  return await client.addSocialIdToPerson(account, SocialIdType.EMAIL, email, true)
}

export async function getIntegrationByAccount (
  token: string,
  account: AccountUuid,
  workspaceUuid?: WorkspaceUuid
): Promise<Integration | null> {
  const client = getAccountClient(token)
  const integrations = await client.listIntegrations({ kind: GMAIL_INTEGRATION, workspaceUuid: workspaceUuid ?? null })
  if (integrations.length === 0) return null
  const socialIds = await getAccountSocialIds(account)

  for (const integration of integrations) {
    if (integration.workspaceUuid == null) continue
    const socialId = socialIds.find((it) => it._id === integration.socialId)
    if (socialId !== undefined) {
      return integration
    }
  }

  return null
}

export async function removeIntegration (
  socialId: PersonId | undefined | null,
  workspaceUuid: WorkspaceUuid
): Promise<void> {
  if (socialId == null) return
  const accountClient = getAccountClient(serviceToken())
  const integrations = await accountClient.listIntegrations({ kind: GMAIL_INTEGRATION, socialId, workspaceUuid })
  for (const integration of integrations) {
    await accountClient.deleteIntegration({
      socialId,
      kind: GMAIL_INTEGRATION,
      workspaceUuid: integration.workspaceUuid
    })
  }
}

export async function getOrCreateSocialId (account: AccountUuid, email: string): Promise<PersonId> {
  const accountClient = getAccountClient(serviceToken())
  const socialId = await accountClient.findFullSocialIdBySocialKey(
    buildSocialIdString({ type: SocialIdType.EMAIL, value: email })
  )
  if (socialId == null) {
    return await accountClient.addSocialIdToPerson(account, SocialIdType.EMAIL, email, true)
  }

  // TODO: proper handle if connected to other account
  if (socialId.personUuid !== account) {
    throw new Error('Social id connected to another account')
  }

  return socialId._id
}

export async function createIntegration (socialId: PersonId, workspace: WorkspaceUuid): Promise<Integration> {
  const accountClient = getAccountClient(serviceToken())
  const integration = {
    socialId,
    kind: GMAIL_INTEGRATION,
    workspaceUuid: workspace
  }
  await accountClient.createIntegration(integration)
  return integration
}

export async function disableIntegration (integration: Integration): Promise<void> {
  const client = getAccountClient(serviceToken())
  await client.updateIntegration({
    ...integration,
    data: {
      disabled: true
    }
  })
}

export async function enableIntegration (integration: Integration): Promise<void> {
  const client = getAccountClient(serviceToken())
  await client.updateIntegration({
    ...integration,
    data: {
      disabled: false
    }
  })
}
