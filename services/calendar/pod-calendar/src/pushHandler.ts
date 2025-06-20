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

import { AccountClient } from '@hcengineering/account-client'
import core, { isActiveMode, MeasureContext, TxOperations } from '@hcengineering/core'
import { getClient } from './client'
import { getUserByEmail, removeUserByEmail } from './kvsUtils'
import { IncomingSyncManager } from './sync'
import { CALENDAR_INTEGRATION, GoogleEmail, Token } from './types'
import { getGoogleClient, getWorkspaceToken, removeIntegrationSecret, setCredentials } from './utils'

export class PushHandler {
  constructor (
    private readonly ctx: MeasureContext,
    private readonly accountClient: AccountClient
  ) {}

  async sync (token: Token, calendarId: string | null): Promise<void> {
    await this.ctx.with(
      'Push handler',
      {},
      async () => {
        const client = await getClient(getWorkspaceToken(token.workspace))
        const txOp = new TxOperations(client, core.account.System)
        const res = getGoogleClient()
        const authSuccess = await setCredentials(res.auth, token)
        if (!authSuccess) {
          await removeUserByEmail(token, token.email)
          await removeIntegrationSecret(this.ctx, this.accountClient, {
            kind: CALENDAR_INTEGRATION,
            workspaceUuid: token.workspace,
            socialId: token.userId,
            key: token.email
          })
        } else {
          await IncomingSyncManager.push(this.ctx, this.accountClient, txOp, token, res.google, calendarId)
        }
        await txOp.close()
      },
      { workspace: token.workspace, user: token.userId }
    )
  }

  async push (email: GoogleEmail, mode: 'events' | 'calendar', calendarId?: string): Promise<void> {
    const tokens = await getUserByEmail(email)
    const workspaces = [...new Set(tokens.map((p) => p.workspace))]
    const infos = await this.accountClient.getWorkspacesInfo(workspaces)
    for (const token of tokens) {
      const info = infos.find((p) => p.uuid === token.workspace)
      if (info === undefined) {
        continue
      }
      if (!isActiveMode(info.mode)) {
        continue
      }
      await this.sync(token, mode === 'events' ? calendarId ?? null : null)
    }
  }
}
