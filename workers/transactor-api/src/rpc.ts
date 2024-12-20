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
  type Client,
  type Class,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type Storage,
  type Tx,
  type TxResult,
  type WithLookup,
  type Hierarchy,
  type ModelDb
} from '@hcengineering/core'
import { decodeModel } from './utils'
import { type ConnectOptions } from './types'
import { getWorkspaceLogin } from './account'

export interface TransactorService {
  openRpc: (token: string, workspaceId: string) => Promise<TransactorRawApi>
}

export interface TransactorRawApi extends Storage {
  getModel: () => Promise<Buffer>
  getAccount: () => Promise<Account>
}

export async function createRpcClient (
  transactorService: TransactorService,
  options: ConnectOptions
): Promise<Client> {
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
  const client = new TransactorRpcClient(token, options.workspaceId ?? '', transactorService)
  if (options.loadModel === true) {
    await client.loadModel()
  }
  return client
}

class TransactorRpcClient implements Client {
  private disposed = false
  private model: ModelDb | undefined
  private hierarchy: Hierarchy | undefined
  private transactorRpcStub: TransactorRawApi | undefined
  private account: Account | undefined

  constructor (
    private readonly token: string,
    private readonly workspaceId: string,
    private readonly transactorService: TransactorService
  ) {}

  private async transactorStub (): Promise<TransactorRawApi> {
    if (this.transactorRpcStub === undefined) {
      this.transactorRpcStub = await this.transactorService.openRpc(this.token, this.workspaceId)
    }
    return this.transactorRpcStub
  }

  async loadModel (): Promise<void> {
    const stub = await this.transactorStub()
    const compressed = await stub.getModel()
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
    this.dispose()
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const stub = await this.transactorStub()
    return await stub.findAll(_class, query, options)
  }

  async tx (tx: Tx): Promise<TxResult> {
    const stub = await this.transactorStub()
    return await stub.tx(tx)
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
    if (this.account === undefined) {
      const stub = await this.transactorStub()
      this.account = await stub.getAccount()
    }
    return this.account
  }

  private dispose (): void {
    if (!this.disposed && this.transactorRpcStub !== undefined && Symbol.dispose in this.transactorRpcStub) {
      this.disposed = true
      ;(this.transactorRpcStub as any)[Symbol.dispose]()
    }
  }

  [Symbol.dispose] (): void {
    this.dispose()
  }
}
