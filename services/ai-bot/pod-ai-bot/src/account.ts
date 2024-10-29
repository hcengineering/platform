//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { LoginInfo, Workspace, WorkspaceLoginInfo } from '@hcengineering/account'
import aiBot, { aiBotAccountEmail } from '@hcengineering/ai-bot'
import { AccountRole, systemAccountEmail } from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'

import config from './config'

export async function assignBotToWorkspace (workspace: string): Promise<Workspace> {
  const token = generateToken(systemAccountEmail, { name: '-' }, { service: 'aibot' })
  const accountsUrl = config.AccountsURL
  const res = await (
    await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'assignWorkspace',
        params: [
          token,
          aiBotAccountEmail,
          workspace,
          AccountRole.User,
          undefined,
          false,
          undefined,
          aiBot.account.AIBot
        ]
      })
    })
  ).json()

  return res.result as Workspace
}

export async function createBotAccount (): Promise<Workspace> {
  const accountsUrl = config.AccountsURL
  const workspace = await (
    await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'createAccount',
        params: [aiBotAccountEmail, config.Password, config.FirstName, config.LastName]
      })
    })
  ).json()

  return workspace.result as Workspace
}

export async function loginBot (): Promise<LoginInfo | undefined> {
  const accountsUrl = config.AccountsURL
  const workspace = await (
    await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'login',
        params: [aiBotAccountEmail, config.Password]
      })
    })
  ).json()

  return workspace.result as LoginInfo | undefined
}

export async function getWorkspaceInfo (token: string): Promise<WorkspaceLoginInfo> {
  const accountsUrl = config.AccountsURL
  const workspaceInfo = await (
    await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'getWorkspaceInfo',
        params: []
      })
    })
  ).json()

  return workspaceInfo.result as WorkspaceLoginInfo
}
