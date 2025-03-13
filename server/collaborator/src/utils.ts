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
import { GUEST_ACCOUNT } from '@hcengineering/account'
import { getClient as getAccountClient } from '@hcengineering/account-client'
import { type WorkspaceIds } from '@hcengineering/core'
import { type Token } from '@hcengineering/server-token'

import config from './config'

export function isGuest (token: Token): boolean {
  return token.account === GUEST_ACCOUNT && token.extra?.guest === 'true'
}

// TODO: consider storing this in a cache for some short period of time
export async function getWorkspaceIds (token: string): Promise<WorkspaceIds> {
  const workspaceInfo = await getAccountClient(config.AccountsUrl, token).getWorkspaceInfo()

  return {
    uuid: workspaceInfo.uuid,
    dataId: workspaceInfo.dataId,
    url: workspaceInfo.url
  }
}
