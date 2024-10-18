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

import { type BaseWorkspaceInfo, type Data, type Version, BackupStatus } from '@hcengineering/core'
import { getMetadata, PlatformError, unknownError } from '@hcengineering/platform'

import plugin from './plugin'

export interface WorkspaceLoginInfo extends LoginInfo {
  workspace: string
  workspaceId: string
}
export interface LoginInfo {
  token: string
  endpoint: string
  confirmed: boolean
  email: string
}

// Helper function for POST requests to the accounts URL
async function postToAccounts(method: string, params: any[], token?: string): Promise<any> {
  const accountsUrl = getAccountsUrlOrFail()
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) {
    headers.Authorization = 'Bearer ' + token
  }

  const response = await fetch(accountsUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ method, params })
  })

  return response.json()
}

export async function listAccountWorkspaces(token: string): Promise<BaseWorkspaceInfo[]> {
  const workspaces = await postToAccounts('listWorkspaces', [token])
  return (workspaces.result as BaseWorkspaceInfo[]) ?? []
}

export async function updateBackupInfo(token: string, info: BackupStatus): Promise<BaseWorkspaceInfo[]> {
  const workspaces = await postToAccounts('updateBackupInfo', [token, info])
  return (workspaces.result as BaseWorkspaceInfo[]) ?? []
}

export async function getTransactorEndpoint(
  token: string,
  kind: 'internal' | 'external' = 'internal',
  timeout: number = -1
): Promise<string> {
  const st = Date.now()
  while (true) {
    try {
      const workspaceInfo: { result: BaseWorkspaceInfo } = await postToAccounts('selectWorkspace', ['', kind], token)
      return workspaceInfo.result.endpoint
    } catch (err: any) {
      if (timeout > 0 && st + timeout < Date.now()) {
        throw err // Timeout
      }
      if (err?.cause?.code === 'ECONNRESET' || err?.cause?.code === 'ECONNREFUSED') {
        await new Promise<void>((resolve) => setTimeout(resolve, 1000))
      } else {
        throw err
      }
    }
  }
}

export async function getPendingWorkspace(
  token: string,
  region: string,
  version: Data<Version>,
  operation: 'create' | 'upgrade' | 'all'
): Promise<BaseWorkspaceInfo | undefined> {
  const workspaces = await postToAccounts('getPendingWorkspace', [token, region, version, operation])
  return workspaces.result as BaseWorkspaceInfo
}

export async function updateWorkspaceInfo(
  token: string,
  workspaceId: string,
  event: 'ping' | 'create-started' | 'upgrade-started' | 'progress' | 'create-done' | 'upgrade-done',
  version: Data<Version>,
  progress: number,
  message?: string
): Promise<void> {
  await postToAccounts('updateWorkspaceInfo', [token, workspaceId, event, version, progress, message])
}

export async function workerHandshake(
  token: string,
  region: string,
  version: Data<Version>,
  operation: 'create' | 'upgrade' | 'all'
): Promise<void> {
  await postToAccounts('workerHandshake', [token, region, version, operation])
}

export async function getWorkspaceInfo(
  token: string,
  updateLastAccess = false
): Promise<BaseWorkspaceInfo | undefined> {
  const workspaceInfo = await postToAccounts('getWorkspaceInfo', [updateLastAccess ? true : undefined], token)
  return workspaceInfo.result as BaseWorkspaceInfo | undefined
}

export async function login(user: string, password: string, workspace: string): Promise<string> {
  const response = await postToAccounts('login', [user, password, workspace])
  return response.result?.token
}

export async function getUserWorkspaces(token: string): Promise<BaseWorkspaceInfo[]> {
  const result = await postToAccounts('getUserWorkspaces', [], token)
  return (result.result as BaseWorkspaceInfo[]) ?? []
}

export async function selectWorkspace(token: string, workspace: string): Promise<WorkspaceLoginInfo> {
  const result = await postToAccounts('selectWorkspace', [workspace, 'external'], token)
  return result.result as WorkspaceLoginInfo
}

function getAccountsUrlOrFail(): string {
  const accountsUrl = getMetadata(plugin.metadata.Endpoint)
  if (!accountsUrl) {
    throw new PlatformError(unknownError('No account endpoint specified'))
  }
  return accountsUrl
}
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

import { type BaseWorkspaceInfo, type Data, type Version, BackupStatus } from '@hcengineering/core'
import { getMetadata, PlatformError, unknownError } from '@hcengineering/platform'

import plugin from './plugin'

export interface WorkspaceLoginInfo extends LoginInfo {
  workspace: string
  workspaceId: string
}
export interface LoginInfo {
  token: string
  endpoint: string
  confirmed: boolean
  email: string
}

// Helper function for POST requests to the accounts URL
async function postToAccounts(method: string, params: any[], token?: string): Promise<any> {
  const accountsUrl = getAccountsUrlOrFail()
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) {
    headers.Authorization = 'Bearer ' + token
  }

  const response = await fetch(accountsUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ method, params })
  })

  return response.json()
}

export async function listAccountWorkspaces(token: string): Promise<BaseWorkspaceInfo[]> {
  const workspaces = await postToAccounts('listWorkspaces', [token])
  return (workspaces.result as BaseWorkspaceInfo[]) ?? []
}

export async function updateBackupInfo(token: string, info: BackupStatus): Promise<BaseWorkspaceInfo[]> {
  const workspaces = await postToAccounts('updateBackupInfo', [token, info])
  return (workspaces.result as BaseWorkspaceInfo[]) ?? []
}

export async function getTransactorEndpoint(
  token: string,
  kind: 'internal' | 'external' = 'internal',
  timeout: number = -1
): Promise<string> {
  const st = Date.now()
  while (true) {
    try {
      const workspaceInfo: { result: BaseWorkspaceInfo } = await postToAccounts('selectWorkspace', ['', kind], token)
      return workspaceInfo.result.endpoint
    } catch (err: any) {
      if (timeout > 0 && st + timeout < Date.now()) {
        throw err // Timeout
      }
      if (err?.cause?.code === 'ECONNRESET' || err?.cause?.code === 'ECONNREFUSED') {
        await new Promise<void>((resolve) => setTimeout(resolve, 1000))
      } else {
        throw err
      }
    }
  }
}

export async function getPendingWorkspace(
  token: string,
  region: string,
  version: Data<Version>,
  operation: 'create' | 'upgrade' | 'all'
): Promise<BaseWorkspaceInfo | undefined> {
  const workspaces = await postToAccounts('getPendingWorkspace', [token, region, version, operation])
  return workspaces.result as BaseWorkspaceInfo
}

export async function updateWorkspaceInfo(
  token: string,
  workspaceId: string,
  event: 'ping' | 'create-started' | 'upgrade-started' | 'progress' | 'create-done' | 'upgrade-done',
  version: Data<Version>,
  progress: number,
  message?: string
): Promise<void> {
  await postToAccounts('updateWorkspaceInfo', [token, workspaceId, event, version, progress, message])
}

export async function workerHandshake(
  token: string,
  region: string,
  version: Data<Version>,
  operation: 'create' | 'upgrade' | 'all'
): Promise<void> {
  await postToAccounts('workerHandshake', [token, region, version, operation])
}

export async function getWorkspaceInfo(
  token: string,
  updateLastAccess = false
): Promise<BaseWorkspaceInfo | undefined> {
  const workspaceInfo = await postToAccounts('getWorkspaceInfo', [updateLastAccess ? true : undefined], token)
  return workspaceInfo.result as BaseWorkspaceInfo | undefined
}

export async function login(user: string, password: string, workspace: string): Promise<string> {
  const response = await postToAccounts('login', [user, password, workspace])
  return response.result?.token
}

export async function getUserWorkspaces(token: string): Promise<BaseWorkspaceInfo[]> {
  const result = await postToAccounts('getUserWorkspaces', [], token)
  return (result.result as BaseWorkspaceInfo[]) ?? []
}

export async function selectWorkspace(token: string, workspace: string): Promise<WorkspaceLoginInfo> {
  const result = await postToAccounts('selectWorkspace', [workspace, 'external'], token)
  return result.result as WorkspaceLoginInfo
}

function getAccountsUrlOrFail(): string {
  const accountsUrl = getMetadata(plugin.metadata.Endpoint)
  if (!accountsUrl) {
    throw new PlatformError(unknownError('No account endpoint specified'))
  }
  return accountsUrl
}

