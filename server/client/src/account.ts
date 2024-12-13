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

import {
  AccountRole,
  BackupStatus,
  Doc,
  Ref,
  type BaseWorkspaceInfo,
  type Data,
  type Version,
  type WorkspaceUpdateEvent
} from '@hcengineering/core'
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

const connectionErrorCodes = ['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND']

export async function listAccountWorkspaces (token: string, region: string | null = null): Promise<BaseWorkspaceInfo[]> {
  const accountsUrl = getAccoutsUrlOrFail()
  const workspaces = await (
    await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'listWorkspaces',
        params: [token, region]
      })
    })
  ).json()

  return (workspaces.result as BaseWorkspaceInfo[]) ?? []
}

export async function updateBackupInfo (token: string, info: BackupStatus): Promise<BaseWorkspaceInfo[]> {
  const accountsUrl = getAccoutsUrlOrFail()
  const workspaces = await (
    await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'updateBackupInfo',
        params: [token, info]
      })
    })
  ).json()

  return (workspaces.result as BaseWorkspaceInfo[]) ?? []
}

const externalRegions = process.env.EXTERNAL_REGIONS?.split(';') ?? []

/**
 * Retrieves the transactor endpoint for a given token and kind.
 *
 * @param token - The authorization token.
 * @param kind - The type of endpoint to retrieve. Can be 'internal', 'external', or 'byregion'. Defaults to 'byregion'.
 * @param timeout - The timeout duration in milliseconds. Defaults to -1 (no timeout).
 * @returns A promise that resolves to the transactor endpoint URL as a string.
 * @throws Will throw an error if the request fails or if the timeout is reached.
 */
export async function getTransactorEndpoint (
  token: string,
  kind: 'internal' | 'external' | 'byregion' = 'byregion',
  timeout: number = -1
): Promise<string> {
  const accountsUrl = getAccoutsUrlOrFail()
  const st = Date.now()
  while (true) {
    try {
      const workspaceInfo: { result: BaseWorkspaceInfo } = await (
        await fetch(accountsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
          },
          body: JSON.stringify({
            method: 'selectWorkspace',
            params: ['', kind, true, externalRegions]
          })
        })
      ).json()
      return workspaceInfo.result.endpoint
    } catch (err: any) {
      if (timeout > 0 && st + timeout < Date.now()) {
        // Timeout happened
        throw err
      }
      if (connectionErrorCodes.includes(err?.cause?.code)) {
        await new Promise<void>((resolve) => setTimeout(resolve, 1000))
      } else {
        throw err
      }
    }
  }
}

export function withRetry<P extends any[], T> (
  f: (...params: P) => Promise<T>,
  shouldFail: (err: any, attempt: number) => boolean,
  intervalMs: number = 1000
): (...params: P) => Promise<T> {
  return async function (...params: P): Promise<T> {
    let attempt = 0
    while (true) {
      try {
        return await f(...params)
      } catch (err: any) {
        if (shouldFail(err, attempt)) {
          throw err
        }

        attempt++
        await new Promise<void>((resolve) => setTimeout(resolve, intervalMs))
      }
    }
  }
}

export function withRetryConnUntilTimeout<P extends any[], T> (
  f: (...params: P) => Promise<T>,
  timeoutMs: number = 5000
): (...params: P) => Promise<T> {
  const timeout = Date.now() + timeoutMs
  const shouldFail = (err: any): boolean => !connectionErrorCodes.includes(err?.cause?.code) || timeout < Date.now()

  return withRetry(f, shouldFail)
}

export function withRetryConnUntilSuccess<P extends any[], T> (
  f: (...params: P) => Promise<T>
): (...params: P) => Promise<T> {
  const shouldFail = (err: any): boolean => {
    const res = !connectionErrorCodes.includes(err?.cause?.code)

    if (res) {
      console.error('Failing withRetryConnUntilSuccess with error cause:', err?.cause)
    }

    return res
  }

  return withRetry(f, shouldFail)
}

export async function getPendingWorkspace (
  token: string,
  region: string,
  version: Data<Version>,
  operation: 'create' | 'upgrade' | 'all' | 'all+backup'
): Promise<BaseWorkspaceInfo | undefined> {
  const accountsUrl = getAccoutsUrlOrFail()
  const workspaces = await (
    await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'getPendingWorkspace',
        params: [token, region, version, operation]
      })
    })
  ).json()

  return workspaces.result as BaseWorkspaceInfo
}

export async function updateWorkspaceInfo (
  token: string,
  workspaceId: string,
  event: WorkspaceUpdateEvent,
  version: Data<Version>,
  progress: number,
  message?: string
): Promise<void> {
  const accountsUrl = getAccoutsUrlOrFail()
  await (
    await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'updateWorkspaceInfo',
        params: [token, workspaceId, event, version, progress, message]
      })
    })
  ).json()
}

export async function workerHandshake (
  token: string,
  region: string,
  version: Data<Version>,
  operation: 'create' | 'upgrade' | 'all' | 'all+backup'
): Promise<void> {
  const accountsUrl = getAccoutsUrlOrFail()
  await fetch(accountsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      method: 'workerHandshake',
      params: [token, region, version, operation]
    })
  })
}

export async function getWorkspaceInfo (
  token: string,
  updateLastAccess = false
): Promise<BaseWorkspaceInfo | undefined> {
  const accountsUrl = getAccoutsUrlOrFail()
  const workspaceInfo = await (
    await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'getWorkspaceInfo',
        params: updateLastAccess ? [true] : []
      })
    })
  ).json()

  return workspaceInfo.result as BaseWorkspaceInfo | undefined
}

export async function login (user: string, password: string, workspace: string): Promise<string> {
  const accountsUrl = getAccoutsUrlOrFail()
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

export async function getUserWorkspaces (token: string): Promise<BaseWorkspaceInfo[]> {
  const accountsUrl = getAccoutsUrlOrFail()
  const response = await fetch(accountsUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      method: 'getUserWorkspaces',
      params: []
    })
  })
  const result = await response.json()
  return (result.result as BaseWorkspaceInfo[]) ?? []
}

export async function selectWorkspace (token: string, workspace: string): Promise<WorkspaceLoginInfo> {
  const accountsUrl = getAccoutsUrlOrFail()
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

function getAccoutsUrlOrFail (): string {
  const accountsUrl = getMetadata(plugin.metadata.Endpoint)
  if (accountsUrl == null) {
    throw new PlatformError(unknownError('No account endpoint specified'))
  }
  return accountsUrl
}

export async function assignWorkspace (
  token: string,
  email: string,
  workspace: string,
  role: AccountRole = AccountRole.User,
  personId?: Ref<Doc>,
  shouldReplaceAccount = false,
  personAccountId?: Ref<Doc>
): Promise<WorkspaceLoginInfo> {
  const accountsUrl = getAccoutsUrlOrFail()
  const res = await (
    await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'assignWorkspace',
        params: [token, email, workspace, role, personId, shouldReplaceAccount, undefined, personAccountId]
      })
    })
  ).json()

  return res.result as WorkspaceLoginInfo
}

export async function createAccount (
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<WorkspaceLoginInfo> {
  const accountsUrl = getAccoutsUrlOrFail()
  const workspace = await (
    await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'createAccount',
        params: [email, password, firstName, lastName]
      })
    })
  ).json()

  return workspace.result as WorkspaceLoginInfo
}
