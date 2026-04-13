//
// Copyright © 2026 Hardcore Engineering Inc.
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
  type Class,
  Client,
  type Doc,
  type DocumentQuery,
  type DomainParams,
  type DomainRequestOptions,
  type DomainResult,
  type FindOptions,
  type FindResult,
  Hierarchy,
  ModelDb,
  OperationDomain,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type Tx,
  type TxResult,
  type WithLookup
} from '@hcengineering/core'

import type { RestClient } from './types'

export class RestClientAdapter implements Client {
  constructor (
    private readonly client: RestClient,
    private readonly hierarchy: Hierarchy | undefined,
    private readonly model: ModelDb | undefined
  ) {}

  async domainRequest<T>(
    domain: OperationDomain,
    params: DomainParams,
    options?: DomainRequestOptions
  ): Promise<DomainResult<T>> {
    return await this.client.domainRequest(domain, params, options)
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return await this.client.findAll(_class, query, options)
  }

  async tx (tx: Tx): Promise<TxResult> {
    return await this.client.tx(tx)
  }

  async findOne<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<WithLookup<T> | undefined> {
    return await this.client.findOne(_class, query, options)
  }

  async searchFulltext (query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    return await this.client.searchFulltext(query, options)
  }

  async close (): Promise<void> {
    // No ned to close the REST client
  }

  getHierarchy (): Hierarchy {
    if (this.hierarchy === undefined) {
      throw new Error('Hierarchy is not defined')
    }
    return this.hierarchy
  }

  getModel (): ModelDb {
    if (this.model === undefined) {
      throw new Error('Model is not defined')
    }
    return this.model
  }
}
