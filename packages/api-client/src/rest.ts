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
  type Class,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  type Ref,
  type Storage,
  type Tx,
  type TxResult,
  type WithLookup,
  concatLink
} from '@hcengineering/core'

import { PlatformError, unknownError } from '@hcengineering/platform'

import { uncompress } from 'snappyjs'

export interface RestClient extends Storage {
  getAccount: () => Promise<Account>

  findOne: <T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<WithLookup<T> | undefined>
}

export async function createRestClient (endpoint: string, workspaceId: string, token: string): Promise<RestClient> {
  return new RestClientImpl(endpoint, workspaceId, token)
}

class RestClientImpl implements RestClient {
  constructor (
    readonly endpoint: string,
    readonly workspace: string,
    readonly token: string
  ) {}

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
    const response = await fetch(concatLink(this.endpoint, `/api/v1/find-all/${this.workspace}?${params.toString()}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.token,
        'accept-encoding': 'snappy, gzip'
      },
      keepalive: true
    })
    if (!response.ok) {
      throw new PlatformError(unknownError(response.statusText))
    }
    const encoding = response.headers.get('content-encoding')
    if (encoding === 'snappy') {
      const buffer = await response.arrayBuffer()
      const decompressed = uncompress(buffer)
      const decoder = new TextDecoder()
      const jsonString = decoder.decode(decompressed)
      return JSON.parse(jsonString) as FindResult<T>
    }
    return (await response.json()) as FindResult<T>
  }

  async getAccount (): Promise<Account> {
    const response = await fetch(concatLink(this.endpoint, `/api/v1/account/${this.workspace}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.token
      },
      keepalive: true
    })
    if (!response.ok) {
      throw new PlatformError(unknownError(response.statusText))
    }
    return (await response.json()) as Account
  }

  async findOne<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<WithLookup<T> | undefined> {
    return (await this.findAll(_class, query, { ...options, limit: 1 })).shift()
  }

  async tx (tx: Tx): Promise<TxResult> {
    const response = await fetch(concatLink(this.endpoint, `/api/v1/tx/${this.workspace}`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.token
      },
      keepalive: true,
      body: JSON.stringify(tx)
    })
    if (!response.ok) {
      throw new PlatformError(unknownError(response.statusText))
    }
    return (await response.json()) as TxResult
  }
}
