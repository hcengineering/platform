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
import { getClient as getAccountClientRaw, Integration, IntegrationKey, type AccountClient } from '@hcengineering/account-client'
import { AccountUuid, IntegrationKind, PersonId, SocialId, WorkspaceUuid } from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import { v4 as uuid } from 'uuid'

export class IntegrationClient {
  private readonly client: AccountClient

  constructor (
    accountsUrl: string,
    token: string,
    private readonly integrationKind: IntegrationKind,
    private readonly serviceName: string
  ) {
    this.client = getAccountClientRaw(accountsUrl, token)
  }

  async getIntegrationsByAccount (
    account: AccountUuid,
    workspaceUuid?: WorkspaceUuid
  ): Promise<Integration | null> {
    const integrations = await this.client.listIntegrations({
      kind: this.integrationKind,
      workspaceUuid: workspaceUuid ?? null
    })
    if (integrations.length === 0) return null
    const socialIds = await this.getAccountSocialIds(account)

    for (const integration of integrations) {
      if (integration.workspaceUuid == null) continue
      const socialId = socialIds.find((it) => it._id === integration.socialId)
      if (socialId !== undefined) {
        return integration
      }
    }

    return null
  }

  async integrate (socialId: PersonId, workspace: WorkspaceUuid, data: Record<string, any> = {}, connection?: Integration): Promise<Integration> {
    const integrationConnection = connection ?? await this.connect(socialId)
    const integration = {
      socialId,
      kind: this.integrationKind,
      workspaceUuid: workspace,
      data: {
        _id: uuid(),
        connectionId: integrationConnection.data?._id,
        ...data
      }
    }
    const existingIntegration = await this.client.getIntegration(integration)
    if (existingIntegration != null) return existingIntegration

    await this.client.createIntegration(integration)
    return integration
  }

  async connect (socialId: PersonId): Promise<Integration> {
    const connection = {
      socialId,
      kind: this.integrationKind,
      workspaceUuid: null
    }
    const existingConnection = await this.client.getIntegration(connection)
    if (existingConnection != null) return existingConnection

    await this.client.createIntegration(connection)
    return connection
  }

  async updateConfig (integrationKey: IntegrationKey, config: Record<string, any>): Promise<void> {
    const integration = await this.client.getIntegration(integrationKey)
    if (integration == null) {
      throw new Error(`Integration not found: ${JSON.stringify(integrationKey)}`)
    }
    const data = {
      ...integration.data,
      config
    }
    await this.client.updateIntegration({
      ...integration,
      data
    })
  }

  async removeIntegration (
    socialId: PersonId | undefined | null,
    workspaceUuid: WorkspaceUuid
  ): Promise<void> {
    if (socialId == null) return
    const integrations = await this.client.listIntegrations({ kind: this.integrationKind, socialId, workspaceUuid })
    for (const integration of integrations) {
      await this.client.deleteIntegration({
        socialId,
        kind: this.integrationKind,
        workspaceUuid: integration.workspaceUuid
      })
    }
  }

  private async getAccountSocialIds (account: AccountUuid): Promise<SocialId[]> {
    try {
      const accountClient = getAccountClientRaw(generateToken(account, undefined, { service: this.serviceName }))
      // Include not-deleted social ids here
      return await accountClient.getSocialIds(false)
    } catch (e) {
      console.error(e)
    }
    return []
  }
}
