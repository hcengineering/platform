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
  type Class,
  type Client,
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

export async function createHttpClient (
  token: string,
  workspaceId: string,
  httpApiWorkerUrl: string,
  loadModel?: boolean
): Promise<Client> {
  const client = new TransactorHttpClient(token, workspaceId, httpApiWorkerUrl)
  if (loadModel === true) {
    await client.loadModel()
  }
  return client
}

class TransactorHttpClient implements Client {
  private model: ModelDb | undefined
  private hierarchy: Hierarchy | undefined

  constructor (
    private readonly token: string,
    private readonly workspaceId: string,
    private readonly httpApiWorkerUrl: string
  ) {}

  async loadModel (): Promise<void> {
    // TODO
    this.model = undefined
    this.hierarchy = undefined
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
    // TODO
    throw new Error('Not implemented')
  }

  async close (): Promise<void> {
    // does nothing
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    // TODO
    throw new Error('Not implemented')
  }

  async tx (tx: Tx): Promise<TxResult> {
    // TODO
    throw new Error('Not implemented')
  }

  async searchFulltext (query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    // TODO
    throw new Error('Not implemented')
  }
}
