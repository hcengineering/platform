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
import { concatLink } from '@hcengineering/core'
import { PlatformError } from '@hcengineering/platform'
import { KeyValueClient, ListResult } from './types'

/**
 * Get a KeyValueClient instance
 * @param namespace - Namespace for the key-value operations
 * @param baseUrl - URL of the key-value API server
 * @param token - Optional authorization token
 * @param retryTimeoutMs - Optional timeout for retrying failed requests
 * @returns KeyValueClient instance
 * @public
 */
export function getClient (namespace: string, baseUrl: string, token?: string, retryTimeoutMs?: number): KeyValueClient {
  if (baseUrl === undefined) {
    throw new Error('Key-value API URL not specified')
  }

  return new KeyValueClientImpl(namespace, baseUrl, token, retryTimeoutMs)
}

class KeyValueClientImpl implements KeyValueClient {
  private readonly requestInit: RequestInit

  constructor (
    private readonly namespace: string,
    private readonly baseUrl: string,
    private readonly token?: string,
    private readonly retryTimeoutMs: number = 5000
  ) {
    if (baseUrl === '') {
      throw new Error('Key-value API URL not specified')
    }

    if (namespace === '' || namespace === undefined) {
      throw new Error('Namespace not specified')
    }

    const isBrowser = typeof window !== 'undefined'

    this.requestInit = {
      keepalive: true,
      headers: {
        ...(this.token === undefined
          ? {}
          : {
              Authorization: 'Bearer ' + this.token
            })
      },
      ...(isBrowser ? { credentials: 'include' } : {})
    }
  }

  async setValue<T>(key: string, value: T): Promise<void> {
    const url = this.buildUrl(key)
    await this.sendRequest(url, {
      method: 'POST',
      body: JSON.stringify(value),
      contentType: 'application/json',
      errorMessage: 'Failed to store value'
    })
  }

  async getValue<T>(key: string): Promise<T | null> {
    const url = this.buildUrl(key)
    return await this.sendRequest<T>(url, {
      method: 'GET',
      returnNullOn404: true
    })
  }

  async deleteKey (key: string): Promise<void> {
    const url = this.buildUrl(key)
    await this.sendRequest(url, {
      method: 'DELETE',
      acceptNotFound: true,
      errorMessage: 'Failed to delete key'
    })
  }

  async listKeys (prefix?: string): Promise<ListResult | null> {
    let url = this.buildUrl()
    if (prefix !== undefined) {
      url += `?prefix=${encodeURIComponent(prefix)}`
    }
    return await this.sendRequest<ListResult>(url, {
      method: 'GET',
      errorMessage: 'Failed to list keys'
    })
  }

  private buildUrl (key?: string): string {
    const baseApiUrl = concatLink(this.baseUrl, `/api/${encodeURIComponent(this.namespace)}`)
    return key !== undefined ? concatLink(baseApiUrl, encodeURIComponent(key)) : baseApiUrl
  }

  private async sendRequest<T>(
    url: string,
    options: {
      method: string
      body?: string
      contentType?: string
      returnNullOn404?: boolean
      acceptNotFound?: boolean
      errorMessage?: string
    }
  ): Promise<T | null> {
    const headers = {
      ...this.requestInit.headers,
      ...(options.contentType !== undefined && options.contentType !== ''
        ? { 'Content-Type': options.contentType }
        : {})
    }

    const response = await this.fetchWithRetry(url, {
      ...this.requestInit,
      method: options.method,
      headers,
      body: options.body
    })

    if (options.returnNullOn404 === true && response.status === 404) {
      return null
    }

    if (options.acceptNotFound === true && response.status === 404) {
      return null
    }

    if (!response.ok) {
      try {
        const errorBody = await response.json()
        if (errorBody?.error != null) {
          throw new PlatformError(errorBody?.error)
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
      throw new Error(options.errorMessage ?? 'Request failed')
    }

    // Parse JSON response when needed
    const contentType = response.headers.get('content-type')
    if (
      response.status !== 204 &&
      (options.method === 'GET' || (contentType != null && contentType.includes('application/json')))
    ) {
      return await response.json()
    }

    return null
  }

  private async fetchWithRetry (url: string, init: RequestInit): Promise<Response> {
    const timeout = Date.now() + this.retryTimeoutMs
    const connectionErrorCodes = ['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND']
    let intervalMs = 25

    while (true) {
      try {
        const headers = {
          ...init.headers,
          Connection: 'keep-alive'
        }

        return await fetch(url, { ...init, headers })
      } catch (err: any) {
        // Check if this is a network error we should retry
        const errMessage: string = err?.message ?? ''
        const isNetworkError =
          connectionErrorCodes.includes(err?.cause?.code) ||
          errMessage.includes('Network error') ||
          errMessage.includes('network')

        if (!isNetworkError || timeout < Date.now()) {
          console.error(`KVS request failed for url ${url}`, err.message)
          throw err
        }

        await new Promise<void>((resolve) => setTimeout(resolve, intervalMs))
        if (intervalMs < 1000) {
          intervalMs += 100
        }
      }
    }
  }
}
