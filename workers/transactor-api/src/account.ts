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

import { concatLink } from '@hcengineering/core'

/**
 * Configuration options for password-based authentication
 * @public
 */
export interface PasswordAuthOptions {
  /** User's email address */
  email: string

  /** User's password */
  password: string

  /** Workspace name */
  workspace: string
}

/**
 * Configuration options for token-based authentication
 * @public
 */
export interface TokenAuthOptions {
  /** Authentication token */
  token: string

  /** Workspace name */
  workspace: string
}

/**
 * Union type representing all authentication options
 * Can be either password-based or token-based authentication
 * @public
 */
export type AuthOptions = PasswordAuthOptions | TokenAuthOptions

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

export interface ServerConfig {
  ACCOUNTS_URL: string
}

async function loadServerConfig (url: string): Promise<ServerConfig> {
  const configUrl = concatLink(url, '/config.json')
  const res = await fetch(configUrl)
  if (res.ok) {
    return (await res.json()) as ServerConfig
  }
  throw new Error('Failed to fetch config')
}

export async function getWorkspaceToken (
  configUrl: string,
  options: AuthOptions,
  config?: ServerConfig
): Promise<{ endpoint: string, token: string }> {
  config ??= await loadServerConfig(configUrl)

  let token: string

  if ('token' in options) {
    token = options.token
  } else {
    const { email, password, workspace } = options
    token = await login(config.ACCOUNTS_URL, email, password, workspace)
  }

  if (token === undefined) {
    throw new Error('Login failed')
  }

  const ws = await selectWorkspace(config.ACCOUNTS_URL, token, options.workspace)
  if (ws === undefined) {
    throw new Error('Workspace not found')
  }

  return { endpoint: ws.endpoint, token: ws.token }
}

async function login (accountsUrl: string, user: string, password: string, workspace: string): Promise<string> {
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

async function selectWorkspace (accountsUrl: string, token: string, workspace: string): Promise<WorkspaceLoginInfo> {
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
