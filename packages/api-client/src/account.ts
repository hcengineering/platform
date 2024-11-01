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

/** @public */
export interface LoginInfo {
  token: string
  endpoint: string
  confirmed: boolean
  email: string
}

/** @public */
export interface WorkspaceLoginInfo extends LoginInfo {
  workspace: string
  workspaceId: string
}

/** @public */
export async function login (accountsUrl: string, user: string, password: string, workspace: string): Promise<string> {
  const response = await fetch(accountsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      method: 'login',
      params: [user, password, workspace]
    })
  })

  const result = await response.json()
  return result.result?.token
}

/** @public */
export async function selectWorkspace (
  accountsUrl: string,
  token: string,
  workspace: string
): Promise<WorkspaceLoginInfo> {
  const response = await fetch(accountsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token
    },
    body: JSON.stringify({
      method: 'selectWorkspace',
      params: [workspace, 'external']
    })
  })
  const result = await response.json()
  return result.result as WorkspaceLoginInfo
}
