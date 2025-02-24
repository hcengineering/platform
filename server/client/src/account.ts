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
import { getClient as getAccountClientRaw, type AccountClient } from '@hcengineering/account-client'
import { getMetadata } from '@hcengineering/platform'

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

export function getAccountClient (token?: string): AccountClient {
  const accountsUrl = getMetadata(plugin.metadata.Endpoint)

  return getAccountClientRaw(accountsUrl, token)
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
  const accountClient = getAccountClient(token)
  const st = Date.now()
  while (true) {
    try {
      const workspaceInfo = await accountClient.selectWorkspace('', kind, externalRegions)
      if (workspaceInfo === undefined) {
        throw new Error('Workspace not found')
      }
      return workspaceInfo.endpoint
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
