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

import { Integration, type AccountClient } from '@hcengineering/account-client'
import { AccountUuid, MeasureContext, PersonId, TxOperations, WorkspaceUuid } from '@hcengineering/core'
import gmail, { gmailIntegrationKind } from '@hcengineering/gmail'
import { getAccountClient } from '@hcengineering/server-client'
import setting from '@hcengineering/setting'
import { IntegrationClient, IntegrationClientImpl } from '@hcengineering/integration-client'

import { serviceToken } from './utils'
import { getAccountSocialIds } from './accounts'
import config from './config'

let integrationClient: IntegrationClient | undefined
export function getIntegrationClient (): IntegrationClient {
  if (integrationClient === undefined) {
    integrationClient = new IntegrationClientImpl(getAccountClient(serviceToken()), gmailIntegrationKind, 'gmail')
  }
  return integrationClient
}

export async function getIntegration (socialId: PersonId, workspaceUuid?: WorkspaceUuid): Promise<Integration | null> {
  const client = getAccountClient(serviceToken())
  return await client.getIntegration({ kind: gmailIntegrationKind, socialId, workspaceUuid: workspaceUuid ?? null })
}

export async function getIntegrations (client: AccountClient, token: string): Promise<Integration[]> {
  return (await client.listIntegrations({ kind: gmailIntegrationKind })) ?? []
}

export async function getIntegrationByAccount (
  account: AccountUuid,
  workspaceUuid?: WorkspaceUuid
): Promise<Integration | null> {
  const token = serviceToken()
  const client = getAccountClient(token)
  const integrations = await client.listIntegrations({
    kind: gmailIntegrationKind,
    workspaceUuid: workspaceUuid ?? null
  })
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
  const integrations = await accountClient.listIntegrations({ kind: gmailIntegrationKind, socialId, workspaceUuid })
  for (const integration of integrations) {
    await accountClient.deleteIntegration({
      socialId,
      kind: gmailIntegrationKind,
      workspaceUuid: integration.workspaceUuid
    })
  }
}

export async function deleteIntegration (integration: Integration): Promise<void> {
  const accountClient = getAccountClient(serviceToken())
  await accountClient.deleteIntegration(integration)
}

export async function createIntegrationIfNotExists (
  socialId: PersonId,
  workspace: WorkspaceUuid,
  email: string
): Promise<Integration> {
  const client = getIntegrationClient()
  const connection = await client.connect(socialId, {
    email
  })
  return await client.integrate(connection, workspace, {
    integrationVersion: config.Version
  })
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

export async function cleanIntegrations (
  ctx: MeasureContext,
  client: TxOperations,
  userId: AccountUuid,
  workspace: WorkspaceUuid
): Promise<void> {
  const integration = await getIntegrationByAccount(userId, workspace)
  if (integration != null) {
    await deleteIntegration(integration)
    ctx.info('Deleted integration', { userId, workspace })
  }
  const personIds = ((await getAccountSocialIds(userId)) ?? []).map((id) => id._id)
  const integrationSetting = await client.findOne(setting.class.Integration, {
    createdBy: { $in: personIds },
    type: gmail.integrationType.Gmail
  })
  if (integrationSetting != null) {
    await client.remove(integrationSetting)
    ctx.info('Deleted integration setting', { userId, workspace })
  }
}
