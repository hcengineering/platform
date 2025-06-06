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
  type Client,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  Hierarchy,
  ModelDb,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  toFindResult,
  type Tx,
  TxOperations,
  type TxResult,
  type WithLookup
} from '@hcengineering/core'
import { RestClientImpl } from './rest'

export async function createRestTxOperations (
  endpoint: string,
  workspaceId: string,
  token: string
): Promise<TxOperations> {
  const restClient = new RestClientImpl(endpoint, workspaceId, token)

  const account = await restClient.getAccount()
  const { hierarchy, model } = await restClient.getModel()

  return new TxOperations(new RestTxClient(restClient, hierarchy, model, account), account.socialIds[0])
}

class RestTxClient implements Client {
  constructor (
    readonly client: RestClientImpl,
    readonly hierarchy: Hierarchy,
    readonly model: ModelDb,
    readonly account: Account
  ) {}

  close (): Promise<void> {
    return Promise.resolve()
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const data = await this.client.findAll(_class, query, options)
    const result = data.map((v) => {
      return this.hierarchy.updateLookupMixin(_class, v, options)
    })
    return toFindResult(result, data.total)
  }

  async findOne<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<WithLookup<T> | undefined> {
    const v = await this.client.findOne(_class, query, options)
    if (v === undefined) {
      return
    }
    return this.hierarchy.updateLookupMixin(_class, v, options)
  }

  getHierarchy: () => Hierarchy = () => this.hierarchy
  getModel: () => ModelDb = () => this.model

  async getAccount (): Promise<Account> {
    return this.account
  }

  async tx (tx: Tx): Promise<TxResult> {
    return await this.client.tx(tx)
  }

  async searchFulltext (query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    return await this.client.searchFulltext(query, options)
  }
}
