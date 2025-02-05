//
// Copyright © 2020 Anticrm Platform Contributors.
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

import core, {
  BackupClient,
  Class,
  Client,
  ClientConnectEvent,
  ClientConnection,
  Doc,
  DocChunk,
  DocumentQuery,
  Domain,
  DOMAIN_TX,
  FindOptions,
  FindResult,
  FulltextStorage,
  generateId,
  Hierarchy,
  LoadModelResponse,
  ModelDb,
  Ref,
  SearchOptions,
  SearchQuery,
  SearchResult,
  Timestamp,
  Tx,
  TxDb,
  TxResult
} from '@hcengineering/core'
import { genMinModel } from './minmodel'

export async function connect (handler: (tx: Tx) => void): Promise<
Client &
BackupClient &
FulltextStorage & {
  isConnected: () => boolean
  loadModel: (last: Timestamp, hash?: string) => Promise<Tx[] | LoadModelResponse>
  sendRequest: () => Promise<any>
}
> {
  const txes = genMinModel()

  const hierarchy = new Hierarchy()
  for (const tx of txes) hierarchy.tx(tx)

  const transactions = new TxDb(hierarchy)
  const model = new ModelDb(hierarchy)
  for (const tx of txes) {
    await transactions.tx(tx)
    await model.tx(tx)
  }

  class TestConnection implements ClientConnection {
    private readonly hierarchy: Hierarchy
    private readonly model: ModelDb
    private readonly transactions: TxDb

    constructor (hierarchy: Hierarchy, model: ModelDb, transactions: TxDb) {
      this.hierarchy = hierarchy
      this.model = model
      this.transactions = transactions
    }

    isConnected (): boolean {
      return true
    }

    async findAll<T extends Doc>(
      _class: Ref<Class<T>>,
      query: DocumentQuery<T>,
      options?: FindOptions<T>
    ): Promise<FindResult<T>> {
      const domain = this.hierarchy.getClass(_class).domain
      if (domain === DOMAIN_TX) return await this.transactions.findAll(_class, query, options)
      return await this.model.findAll(_class, query, options)
    }

    async sendRequest (): Promise<any> {}

    async findOne<T extends Doc>(
      _class: Ref<Class<T>>,
      query: DocumentQuery<T>,
      options?: FindOptions<T>
    ): Promise<T | undefined> {
      return (await this.findAll(_class, query, { ...options, limit: 1 })).shift()
    }

    getHierarchy (): Hierarchy {
      return this.hierarchy
    }

    getModel (): ModelDb {
      return this.model
    }

    async tx (tx: Tx): Promise<TxResult> {
      if (tx.objectSpace === core.space.Model) {
        this.hierarchy.tx(tx)
      }
      await Promise.all([this.model.tx(tx), this.transactions.tx(tx)])
      handler(tx)
      return {}
    }

    async close (): Promise<void> {}

    async loadChunk (domain: Domain, idx?: number): Promise<DocChunk> {
      return {
        idx: -1,
        docs: [],
        finished: true
      }
    }

    async getDomainHash (domain: Domain): Promise<string> {
      return generateId()
    }

    async loadModel (lastTxTime: Timestamp): Promise<Tx[]> {
      return txes
    }

    async closeChunk (idx: number): Promise<void> {}

    async loadDocs (domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
      return []
    }

    async upload (domain: Domain, docs: Doc[]): Promise<void> {}

    async clean (domain: Domain, docs: Ref<Doc>[]): Promise<void> {}

    async searchFulltext (query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
      return { docs: [] }
    }

    async sendForceClose (): Promise<void> {}

    handler?: (event: ClientConnectEvent, lastTx: string | undefined, data: any) => Promise<void>

    set onConnect (
      handler: ((event: ClientConnectEvent, lastTx: string | undefined, data: any) => Promise<void>) | undefined
    ) {
      this.handler = handler
      void this.handler?.(ClientConnectEvent.Connected, '', {})
    }

    get onConnect (): ((event: ClientConnectEvent, lastTx: string | undefined, data: any) => Promise<void>) | undefined {
      return this.handler
    }
  }

  return new TestConnection(hierarchy, model, transactions)
}
