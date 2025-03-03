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
  type FindOptions,
  type FindResult,
  Hierarchy,
  MeasureMetricsContext,
  ModelDb,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type Tx,
  type TxResult,
  type WithLookup
} from '@hcengineering/core'
import { PlatformError, unknownError } from '@hcengineering/platform'
import { EventResult, RequestEvent as CommunicationEvent } from '@hcengineering/communication-sdk-types'
import {
  FindMessagesGroupsParams,
  FindMessagesParams,
  Message,
  MessagesGroup
} from '@hcengineering/communication-types'

import type { RestClient } from './types'
import { extractJson, withRetry } from './utils'

export function createRestClient (endpoint: string, workspaceId: string, token: string): RestClient {
  return new RestClientImpl(endpoint, workspaceId, token)
}

export class RestClientImpl implements RestClient {
  endpoint: string
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
    const result = await withRetry(async () => {
      const response = await fetch(requestUrl, this.requestInit())
      if (!response.ok) {
        throw new PlatformError(unknownError(response.statusText))
      }
      return await extractJson<FindResult<T>>(response)
    })

    if (result.lookupMap !== undefined) {
      // We need to extract lookup map to document lookups
      for (const d of result) {
        if (d.$lookup !== undefined) {
          for (const [k, v] of Object.entries(d.$lookup)) {
            if (!Array.isArray(v)) {
              d.$lookup[k] = result.lookupMap[v as any]
            } else {
              d.$lookup[k] = v.map((it) => result.lookupMap?.[it])
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
          if (doc[k] == null) {
            doc[k] = v
          }
        }
      }
    }

    return result
  }

  async getAccount (): Promise<Account> {
    const requestUrl = concatLink(this.endpoint, `/api/v1/account/${this.workspace}`)
    const response = await fetch(requestUrl, this.requestInit())
    if (!response.ok) {
      throw new PlatformError(unknownError(response.statusText))
    }
    return await extractJson<Account>(response)
  }

  async getModel (): Promise<{ hierarchy: Hierarchy, model: ModelDb }> {
    const requestUrl = concatLink(this.endpoint, `/api/v1/load-model/${this.workspace}`)
    const response = await fetch(requestUrl, this.requestInit())
    if (!response.ok) {
      throw new PlatformError(unknownError(response.statusText))
    }
    const modelResponse: Tx[] = await extractJson<Tx[]>(response)

    const hierarchy = new Hierarchy()
    const model = new ModelDb(hierarchy)

    const ctx = new MeasureMetricsContext('loadModel', {})
    buildModel(ctx, modelResponse, (txes: Tx[]) => txes, hierarchy, model)

    return { hierarchy, model }
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
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: this.jsonHeaders(),
      keepalive: true,
      body: JSON.stringify(tx)
    })
    if (!response.ok) {
      throw new PlatformError(unknownError(response.statusText))
    }
    return await extractJson<TxResult>(response)
  }

  async searchFulltext (query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
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
    const requestUrl = concatLink(this.endpoint, `/api/v1/search-fulltext/${this.workspace}`)
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: this.jsonHeaders(),
      keepalive: true
    })
    if (!response.ok) {
      throw new PlatformError(unknownError(response.statusText))
    }
    return await extractJson<TxResult>(response)
  }

  async event (event: CommunicationEvent): Promise<EventResult> {
    const response = await fetch(concatLink(this.endpoint, `/api/v1/event/${this.workspace}`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.token
      },
      keepalive: true,
      body: JSON.stringify(event)
    })
    if (!response.ok) {
      throw new PlatformError(unknownError(response.statusText))
    }
    return (await response.json()) as EventResult
  }

  async findMessages (params: FindMessagesParams): Promise<Message[]> {
    const searchParams = new URLSearchParams()
    if (Object.keys(params).length > 0) {
      searchParams.append('params', JSON.stringify(params))
    }
    const requestUrl = concatLink(this.endpoint, `/api/v1/find-messages/${this.workspace}?${searchParams.toString()}`)

    return await withRetry(async () => {
      const response = await fetch(requestUrl, this.requestInit())
      if (!response.ok) {
        throw new PlatformError(unknownError(response.statusText))
      }
      return await extractJson<MessagesGroup[]>(response)
    })
  }

  async findGroups (params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
    const searchParams = new URLSearchParams()
    if (Object.keys(params).length > 0) {
      searchParams.append('params', JSON.stringify(params))
    }
    const requestUrl = concatLink(this.endpoint, `/api/v1/find-messages-groups/${this.workspace}?${searchParams.toString()}`)
    return await withRetry(async () => {
      const response = await fetch(requestUrl, this.requestInit())
      if (!response.ok) {
        throw new PlatformError(unknownError(response.statusText))
      }
      return await extractJson<MessagesGroup[]>(response)
    })
  }
}
