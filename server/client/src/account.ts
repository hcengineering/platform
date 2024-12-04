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
  type Data,
  type Version,
  type WorkspaceInfo,
  type SocialId,
  WorkspaceInfoWithStatus,
  BackupStatus,
  AccountRole,
  Ref,
  Doc
} from '@hcengineering/core'

import { getMetadata, PlatformError, unknownError } from '@hcengineering/platform'

import plugin from './plugin'

export interface WorkspaceLoginInfo extends LoginInfo {
  workspace: string
  endpoint: string
}
export interface LoginInfo {
  account: string
  token: string
}

const connectionErrorCodes = ['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND']

export async function listAccountWorkspaces (token: string, region: string | null = null): Promise<WorkspaceInfoWithStatus[]> {
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

  return workspaces.result ?? []
}

export async function updateBackupInfo (token: string, info: BackupStatus): Promise<WorkspaceInfo[]> {
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

  return (workspaces.result as WorkspaceInfo[]) ?? []
}

export async function getTransactorEndpoint (
  token: string,
  kind: 'internal' | 'external' = 'internal',
  timeout: number = -1
): Promise<string> {
  const accountsUrl = getAccoutsUrlOrFail()
  const st = Date.now()
  while (true) {
    try {
      const workspaceInfo = await (
        await fetch(accountsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
          },
          body: JSON.stringify({
            method: 'selectWorkspace',
            params: ['', kind]
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
  operation: 'create' | 'upgrade' | 'all'
): Promise<WorkspaceInfo | undefined> {
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

  return workspaces.result as WorkspaceInfo
}

export async function updateWorkspaceInfo (
  token: string,
  workspaceId: string,
  event: 'ping' | 'create-started' | 'upgrade-started' | 'progress' | 'create-done' | 'upgrade-done',
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
  operation: 'create' | 'upgrade' | 'all'
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

export async function getLoginInfoByToken (
  token: string,
  url: string | undefined
): Promise<void> {
  const accountsUrl = url ?? getAccoutsUrlOrFail()

  await fetch(accountsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      method: 'getLoginInfoByToken',
      params: [token]
    })
  })
}

export async function getWorkspaceInfo (
  token: string,
  updateLastAccess = false,
  url: string | undefined
): Promise<WorkspaceInfoWithStatus | undefined> {
  const accountsUrl = url ?? getAccoutsUrlOrFail()
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

  if (workspaceInfo.error !== undefined) {
    throw new Error(JSON.stringify(workspaceInfo.error))
  }

  const workspace = workspaceInfo.result

  if (workspace == null) {
    return undefined
  }

  const status = workspace.status ?? {}

  const workspaceWithStatus = {
    ...workspace,
    ...status,
    version: {
      major: status.versionMajor,
      minor: status.versionMinor,
      patch: status.versionPatch
    }
  }

  return workspaceWithStatus
}

export async function login (user: string, password: string, workspace: string): Promise<LoginInfo> {
  const accountsUrl = getAccoutsUrlOrFail()
  const response = await fetch(accountsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      method: 'login',
      params: [user, password]
    })
  })

  const result = await response.json()
  return result.result
}

export async function getUserWorkspaces (token: string): Promise<WorkspaceInfo[]> {
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
  return (result.result as WorkspaceInfo[]) ?? []
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

export async function getSocialIds (token: string): Promise<SocialId[]> {
  const accountsUrl = getAccoutsUrlOrFail()
  const response = await fetch(accountsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token
    },
    body: JSON.stringify({
      method: 'getSocialIds',
      params: []
    })
  })

  const result = await response.json()
  return result.result as SocialId[]
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
