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

import { PersonId, WorkspaceUuid } from '@hcengineering/core'
import type { AccountClient } from '@hcengineering/account-client'
import { getAccountClient } from '@hcengineering/server-client'
import { GMAIL_INTEGRATION, SecretType, Token } from './types'

export class TokenStorage {
  private readonly accountClient: AccountClient

  constructor (
    private readonly workspace: WorkspaceUuid,
    platformToken: string
  ) {
    this.accountClient = getAccountClient(platformToken)
  }

  async getToken (socialId: PersonId): Promise<Token | null> {
    const secret = await this.accountClient.getIntegrationSecret({
      key: SecretType.TOKEN,
      kind: GMAIL_INTEGRATION,
      socialId,
      workspaceUuid: this.workspace
    })
    return secret?.secret !== undefined ? JSON.parse(secret.secret) : null
  }

  async saveToken (token: Token): Promise<void> {
    const exists = await this.accountClient.getIntegrationSecret({
      key: SecretType.TOKEN,
      kind: GMAIL_INTEGRATION,
      socialId: token.socialId._id,
      workspaceUuid: this.workspace
    })

    if (exists !== null) {
      await this.accountClient.updateIntegrationSecret({
        key: SecretType.TOKEN,
        kind: GMAIL_INTEGRATION,
        socialId: token.socialId._id,
        secret: JSON.stringify(token),
        workspaceUuid: this.workspace
      })
    } else {
      await this.accountClient.addIntegrationSecret({
        key: SecretType.TOKEN,
        kind: GMAIL_INTEGRATION,
        socialId: token.socialId._id,
        secret: JSON.stringify(token),
        workspaceUuid: this.workspace
      })
    }
  }

  async deleteToken (socialId: PersonId): Promise<void> {
    await this.accountClient.deleteIntegrationSecret({
      key: SecretType.TOKEN,
      kind: GMAIL_INTEGRATION,
      socialId,
      workspaceUuid: this.workspace
    })
  }
}

export async function getWorkspaceTokens (accountClient: AccountClient, workspace: WorkspaceUuid): Promise<Token[]> {
  const secrets = await accountClient.listIntegrationsSecrets({
    kind: GMAIL_INTEGRATION,
    workspaceUuid: workspace
  })
  return secrets.map((secret: { secret: string }) => JSON.parse(secret.secret))
}
