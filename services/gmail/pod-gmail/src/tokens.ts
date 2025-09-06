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

import type { AccountClient } from '@hcengineering/account-client'
import { groupByArray, MeasureContext, PersonId, WorkspaceUuid } from '@hcengineering/core'
import { getAccountClient } from '@hcengineering/server-client'
import { gmailIntegrationKind } from '@hcengineering/gmail'
import { SecretType, Token } from './types'

export class TokenStorage {
  private readonly accountClient: AccountClient

  constructor (
    private readonly ctx: MeasureContext,
    private readonly workspace: WorkspaceUuid,
    platformToken: string
  ) {
    this.accountClient = getAccountClient(platformToken)
  }

  async getToken (socialId: PersonId): Promise<Token | null> {
    const secret = await this.accountClient.getIntegrationSecret({
      key: SecretType.TOKEN,
      kind: gmailIntegrationKind,
      socialId,
      workspaceUuid: this.workspace
    })
    return secret?.secret !== undefined ? JSON.parse(secret.secret) : null
  }

  async saveToken (socialId: PersonId, token: Token): Promise<void> {
    const existingToken = await this.getToken(socialId)

    if (existingToken !== null) {
      const updatedToken = {
        ...existingToken,
        ...token
      }
      await this.accountClient.updateIntegrationSecret({
        key: SecretType.TOKEN,
        kind: gmailIntegrationKind,
        socialId,
        secret: JSON.stringify(updatedToken),
        workspaceUuid: this.workspace
      })
      this.ctx.info('Updated integration secret', { socialId, workspaceUuid: this.workspace })
    } else {
      await this.accountClient.addIntegrationSecret({
        key: SecretType.TOKEN,
        kind: gmailIntegrationKind,
        socialId,
        secret: JSON.stringify(token),
        workspaceUuid: this.workspace
      })
      this.ctx.info('Created integration secret', { socialId, workspaceUuid: this.workspace })
    }
  }

  async deleteToken (socialId: PersonId): Promise<void> {
    await this.accountClient.deleteIntegrationSecret({
      key: SecretType.TOKEN,
      kind: gmailIntegrationKind,
      socialId,
      workspaceUuid: this.workspace
    })
  }
}

export async function getWorkspaceTokens (
  accountClient: AccountClient,
  workspace?: WorkspaceUuid
): Promise<Map<WorkspaceUuid, Token[]>> {
  const secrets = (
    await accountClient.listIntegrationsSecrets(
      workspace !== undefined
        ? {
            kind: gmailIntegrationKind,
            workspaceUuid: workspace
          }
        : { kind: gmailIntegrationKind }
    )
  ).filter((it) => it.workspaceUuid != null)

  const byWorkspaces = groupByArray(secrets, (it) => it.workspaceUuid as WorkspaceUuid)

  const result = new Map<WorkspaceUuid, Token[]>()
  for (const entry of byWorkspaces.entries()) {
    result.set(
      entry[0],
      entry[1].map((secret: { secret: string }) => JSON.parse(secret.secret))
    )
  }
  return result
}
