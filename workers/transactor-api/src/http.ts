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
  type Account,
  type AccountClient,
  type Class,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  type ModelDb,
  type Tx,
  type TxResult,
  type Ref,
  type Hierarchy,
  type SearchQuery,
  type SearchOptions,
  type SearchResult,
  type WithLookup
} from '@hcengineering/core'
import { type ConnectOptions } from './types'
import { getWorkspaceLogin } from './account'
import { decodeModel } from './utils'

export async function createHttpClient (httpApiWorkerUrl: string, options: ConnectOptions): Promise<AccountClient> {
  let token = options.workspaceToken
  if (token === undefined) {
    if (options.authOptions === undefined) {
      throw new Error('Either workspaceToken or authOptions must be provided')
    }
    if (options.configUrl === '' && options.serverConfig === undefined) {
      throw new Error('Either configUrl or serverConfig must be provided')
    }
    const ws = await getWorkspaceLogin(options.configUrl ?? '', options.authOptions, options.serverConfig)
    token = ws.token
  }
  const client = new TransactorHttpClient(token, options.workspaceId ?? '', httpApiWorkerUrl)
  if (options.loadModel ?? false) {
    await client.loadModel()
  }
  return client
}

class TransactorHttpClient implements AccountClient {
  private model: ModelDb | undefined
  private hierarchy: Hierarchy | undefined

  constructor (
    private readonly token: string,
    private readonly workspaceId: string,
    private readonly httpApiWorkerUrl: string
  ) {}

  private url (method: string): string {
    return `${this.httpApiWorkerUrl}/${method}/${encodeURIComponent(this.workspaceId)}`
  }

  async loadModel (): Promise<void> {
    const response = await fetch(this.url('model'), {
      method: 'GET',
      headers: {
        Accept: 'application/octet-stream',
        Authorization: 'Bearer ' + this.token
      }
    })
    const compressed = await (response as any).bytes()
    const { model, hierarchy } = await decodeModel(compressed)
    this.model = model
    this.hierarchy = hierarchy
  }

  notify (...tx: Tx[]): void {
    // does nothing
  }

  getHierarchy (): Hierarchy {
    if (this.hierarchy === undefined) {
      throw new Error('Hierarchy is not loaded, please use loadModel=true when initializing client')
    }
    return this.hierarchy
  }

  getModel (): ModelDb {
    if (this.model === undefined) {
      throw new Error('Model is not loaded, please use loadModel=true when initializing client')
    }
    return this.model
  }

  async findOne<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<WithLookup<T> | undefined> {
    return (await this.findAll(_class, query, options)).shift()
  }

  async close (): Promise<void> {
    // does nothing
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const response = await fetch(this.url('find-all'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.token
      },
      body: JSON.stringify({ _class, query, options })
    })
    return await response.json()
  }

  async tx (tx: Tx): Promise<TxResult> {
    const response = await fetch(this.url('tx'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.token
      },
      body: JSON.stringify(tx)
    })
    return await response.json()
  }

  async searchFulltext (query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    // TODO
    const result: SearchResult = {
      docs: [],
      total: 0
    }
    return result
  }

  async getAccount (): Promise<Account> {
    const response = await fetch(this.url('account'), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer ' + this.token
      }
    })
    return await response.json()
  }
}
