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

import { type WorkspaceLoginInfo, getClient as getAccountClient } from '@hcengineering/account-client'
import { WorkspaceUuid } from '@hcengineering/core'
import { AuthOptions } from './types'
import { loadServerConfig, ServerConfig } from './config'

export interface WorkspaceToken {
  endpoint: string
  token: string
  workspaceId: WorkspaceUuid
  info: WorkspaceLoginInfo
}

export async function getWorkspaceToken (
  url: string,
  options: AuthOptions,
  config?: ServerConfig
): Promise<WorkspaceToken> {
  config ??= await loadServerConfig(url)

  let token: string | undefined

  if ('token' in options) {
    token = options.token
  } else {
    const { email, password } = options
    const loginInfo = await getAccountClient(config.ACCOUNTS_URL).login(email, password)
    token = loginInfo.token
  }

  if (token === undefined) {
    throw new Error('Login failed')
  }

  const ws = await getAccountClient(config.ACCOUNTS_URL, token).selectWorkspace(options.workspace)
  if (ws === undefined) {
    throw new Error('Workspace not found')
  }

  return { endpoint: ws.endpoint, token: ws.token, workspaceId: ws.workspace, info: ws }
}
