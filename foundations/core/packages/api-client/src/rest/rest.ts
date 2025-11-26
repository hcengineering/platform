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

import {
  type Account,
  buildModel,
  type Class,
  concatLink,
  type Doc,
  type DocumentQuery,
  type DomainParams,
  type DomainRequestOptions,
  type DomainResult,
  type FindOptions,
  type FindResult,
  Hierarchy,
  MeasureMetricsContext,
  ModelDb,
  OperationDomain,
  PersonId,
  PersonUuid,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  SocialIdType,
  type Tx,
  type TxResult,
  type WithLookup
} from '@hcengineering/core'
import { PlatformError, type Status, unknownError } from '@hcengineering/platform'

import { AuthOptions } from '../types'
import { getWorkspaceToken } from '../utils'
import type { RestClient } from './types'
import { extractJson, withRetry } from './utils'

export function createRestClient (endpoint: string, workspaceId: string, token: string): RestClient {
  return new RestClientImpl(endpoint, workspaceId, token)
}

export async function connectRest (url: string, options: AuthOptions): Promise<RestClient> {
  const { endpoint, token, workspaceId } = await getWorkspaceToken(url, options)
  return createRestClient(endpoint, workspaceId, token)
}

const rateLimitError = 'rate-limit'

function isRLE (err: any): boolean {
  return err.message === rateLimitError
}

export class RestClientImpl implements RestClient {
  endpoint: string

  slowDownTimer = 0
  currentRateLimit: { remaining: number, limit: number } = { remaining: 1000, limit: 1000 }

  remaining: number = 1000
  limit: number = 1000
  constructor (
    endpoint: string,
    readonly workspace: string,
    readonly token: string
  ) {
    this.endpoint = endpoint.replace('ws', 'http')
  }

  jsonHeaders (): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + this.token,
      'accept-encoding': 'snappy, gzip'
    }
  }

  requestInit (): RequestInit {
    return {
      method: 'GET',
      keepalive: true,
      headers: this.jsonHeaders()
    }
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const params = new URLSearchParams()
    params.append('class', _class)
    if (query !== undefined && Object.keys(query).length > 0) {
      params.append('query', JSON.stringify(query))
    }
    if (options !== undefined && Object.keys(options).length > 0) {
      params.append('options', JSON.stringify(options))
    }
    const requestUrl = concatLink(this.endpoint, `/api/v1/find-all/${this.workspace}?${params.toString()}`)
    const result = await withRetry<FindResult<T> & { error?: Status }>(async () => {
      const response = await fetch(requestUrl, this.requestInit())
      if (!response.ok) {
        await this.checkRateLimits(response)
        throw new PlatformError(unknownError(response.statusText))
      }
      this.updateRateLimit(response)
      return await extractJson<FindResult<T>>(response)
    }, isRLE)

    if (result.error !== undefined) {
      throw new PlatformError(result.error)
    }

    if (result.lookupMap !== undefined) {
      // We need to extract lookup map to document lookups
      for (const d of result) {
        if (d.$lookup !== undefined) {
          for (const [k, v] of Object.entries(d.$lookup)) {
            if (!Array.isArray(v)) {
              ;(d as any).$lookup[k] = result.lookupMap[v]
            } else {
              ;(d as any).$lookup[k] = v.map((it) => result.lookupMap?.[it])
            }
          }
        }
      }
      delete result.lookupMap
    }

    // We need to revert deleted query simple values.
    // We need to get rid of simple query parameters matched in documents
    for (const doc of result) {
      if (doc._class == null) {
        doc._class = _class
      }
      for (const [k, v] of Object.entries(query)) {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          if ((doc as any)[k] == null) {
            ;(doc as any)[k] = v
          }
        }
      }
    }

    return result
  }

  private async checkRate (): Promise<void> {
    if (this.currentRateLimit.remaining < this.currentRateLimit.limit / 3) {
      if (this.slowDownTimer < 50) {
        this.slowDownTimer += 50
      }
      this.slowDownTimer++
    } else if (this.slowDownTimer > 0) {
      this.slowDownTimer--
    }
    if (this.slowDownTimer > 0) {
      // We need to wait a bit to avoid ban.
      await new Promise((resolve) => setTimeout(resolve, this.slowDownTimer))
    }
  }

  private updateRateLimit (response: Response): void {
    const rateLimitLimit: number = parseInt(response.headers.get('X-RateLimit-Limit') ?? '100')
    const remaining: number = parseInt(response.headers.get('X-RateLimit-Remaining') ?? '100')
    this.currentRateLimit = { remaining, limit: rateLimitLimit }
  }

  private async checkRateLimits (response: Response): Promise<void> {
    if (response.status === 429) {
      // Extract rate limit information from headers
      const retryAfter = response.headers.get('Retry-After')
      const retryAfterMS = response.headers.get('Retry-After-ms')
      const rateLimitReset = response.headers.get('X-RateLimit-Reset')

      this.updateRateLimit(response)
      const waitTime =
        (retryAfterMS != null ? parseInt(retryAfterMS) : undefined) ??
        (retryAfter != null
          ? parseInt(retryAfter) * 1000
          : rateLimitReset != null
            ? new Date(parseInt(rateLimitReset)).getTime() - Date.now()
            : 1000) // Default to 1 seconds if no headers are provided
      await new Promise((resolve) => setTimeout(resolve, waitTime))
      throw new Error(rateLimitError)
    }
  }

  async getAccount (): Promise<Account> {
    const requestUrl = concatLink(this.endpoint, `/api/v1/account/${this.workspace}`)
    await this.checkRate()
    const result = await withRetry<Account & { error?: Status }>(async () => {
      const response = await fetch(requestUrl, this.requestInit())
      if (!response.ok) {
        await this.checkRateLimits(response)
        throw new PlatformError(unknownError(response.statusText))
      }
      this.updateRateLimit(response)
      return await extractJson<Account>(response)
    })
    if (result.error !== undefined) {
      throw new PlatformError(result.error)
    }
    return result
  }

  async getModel (full: boolean = false): Promise<{ hierarchy: Hierarchy, model: ModelDb }> {
    const requestUrl = new URL(concatLink(this.endpoint, `/api/v1/load-model/${this.workspace}`))
    if (full) {
      requestUrl.searchParams.append('full', 'true')
    }
    await this.checkRate()
    const result = await withRetry<{ hierarchy: Hierarchy, model: ModelDb, error?: Status }>(async () => {
      const response = await fetch(requestUrl, this.requestInit())
      if (!response.ok) {
        await this.checkRateLimits(response)
        throw new PlatformError(unknownError(response.statusText))
      }
      this.updateRateLimit(response)

      const modelResponse: Tx[] = await extractJson<Tx[]>(response)

      const hierarchy = new Hierarchy()
      const model = new ModelDb(hierarchy)

      const ctx = new MeasureMetricsContext('loadModel', {})
      buildModel(ctx, modelResponse, undefined, hierarchy, model)

      return { hierarchy, model }
    }, isRLE)
    if (result.error !== undefined) {
      throw new PlatformError(result.error)
    }
    return result
  }

  async findOne<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<WithLookup<T> | undefined> {
    return (await this.findAll(_class, query, { ...options, limit: 1 })).shift()
  }

  async tx (tx: Tx): Promise<TxResult> {
    const requestUrl = concatLink(this.endpoint, `/api/v1/tx/${this.workspace}`)
    await this.checkRate()
    const result = await withRetry<TxResult & { error?: Status }>(async () => {
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: this.jsonHeaders(),
        keepalive: true,
        body: JSON.stringify(tx)
      })
      if (!response.ok) {
        await this.checkRateLimits(response)
        throw new PlatformError(unknownError(response.statusText))
      }
      this.updateRateLimit(response)
      return await extractJson<TxResult>(response)
    }, isRLE)
    if (result.error !== undefined) {
      throw new PlatformError(result.error)
    }
    return result
  }

  async searchFulltext (query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    const result = await withRetry<SearchResult & { error?: Status }>(async () => {
      const params = new URLSearchParams()
      params.append('query', query.query)
      if (query.classes != null && Object.keys(query.classes).length > 0) {
        params.append('classes', JSON.stringify(query.classes))
      }
      if (query.spaces != null && Object.keys(query.spaces).length > 0) {
        params.append('spaces', JSON.stringify(query.spaces))
      }
      if (options.limit != null) {
        params.append('limit', `${options.limit}`)
      }
      const requestUrl = concatLink(this.endpoint, `/api/v1/search-fulltext/${this.workspace}?${params.toString()}`)
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: this.jsonHeaders(),
        keepalive: true
      })
      if (!response.ok) {
        await this.checkRateLimits(response)
        throw new PlatformError(unknownError(response.statusText))
      }
      this.updateRateLimit(response)
      return await extractJson<TxResult>(response)
    })
    if (result.error !== undefined) {
      throw new PlatformError(result.error)
    }
    return result
  }

  async domainRequest<T>(
    domain: OperationDomain,
    params: DomainParams,
    options?: DomainRequestOptions
  ): Promise<DomainResult<T>> {
    const requestUrl = concatLink(this.endpoint, `/api/v1/request/${domain}/${this.workspace}`)

    await this.checkRate()
    return await withRetry(async () => {
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: this.jsonHeaders(),
        keepalive: true,
        body: JSON.stringify(params)
      })
      if (!response.ok) {
        await this.checkRateLimits(response)
        throw new PlatformError(unknownError(response.statusText))
      }
      this.updateRateLimit(response)
      const value = await extractJson<T>(response)
      return { domain, value }
    }, isRLE)
  }

  async ensurePerson (
    socialType: SocialIdType,
    socialValue: string,
    firstName: string,
    lastName: string
  ): Promise<{ uuid: PersonUuid, socialId: PersonId, localPerson: string }> {
    const requestUrl = concatLink(this.endpoint, `/api/v1/ensure-person/${this.workspace}`)
    await this.checkRate()
    const result = await withRetry(async () => {
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: this.jsonHeaders(),
        keepalive: true,
        body: JSON.stringify({
          socialType,
          socialValue,
          firstName,
          lastName
        })
      })
      if (!response.ok) {
        await this.checkRateLimits(response)
        throw new PlatformError(unknownError(response.statusText))
      }
      this.updateRateLimit(response)
      return await extractJson<{ uuid: PersonUuid, socialId: PersonId, localPerson: string }>(response)
    }, isRLE)
    if (result.error !== undefined) {
      throw new PlatformError(result.error)
    }
    return result
  }
}
