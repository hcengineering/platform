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

import { ClientConnectEvent, DocChunk, generateId } from '..'
import type { Class, Doc, Domain, Ref, Timestamp } from '../classes'
import { ClientConnection } from '../client'
import core from '../component'
import { Hierarchy } from '../hierarchy'
import { ModelDb, TxDb } from '../memdb'
import type { DocumentQuery, FindResult, SearchOptions, SearchQuery, SearchResult, TxResult } from '../storage'
import type { Tx } from '../tx'
import { DOMAIN_TX } from '../tx'
import { genMinModel } from './minmodel'

export async function connect (handler: (tx: Tx) => void): Promise<ClientConnection> {
  const txes = genMinModel()

  const hierarchy = new Hierarchy()
  for (const tx of txes) hierarchy.tx(tx)

  const transactions = new TxDb(hierarchy)
  const model = new ModelDb(hierarchy)
  for (const tx of txes) {
    await transactions.tx(tx)
    await model.tx(tx)
  }

  async function findAll<T extends Doc> (_class: Ref<Class<T>>, query: DocumentQuery<T>): Promise<FindResult<T>> {
    const domain = hierarchy.getClass(_class).domain
    if (domain === DOMAIN_TX) return await transactions.findAll(_class, query)
    return await model.findAll(_class, query)
  }

  class ClientConnectionImpl implements ClientConnection {
    isConnected = (): boolean => true
    findAll = findAll

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

    async searchFulltext (query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
      return { docs: [] }
    }

    pushHandler = (): void => {}

    async tx (tx: Tx): Promise<TxResult> {
      if (tx.objectSpace === core.space.Model) {
        hierarchy.tx(tx)
      }
      const result = await Promise.all([model.tx(tx), transactions.tx(tx)])
      return result[0]
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

    async closeChunk (idx: number): Promise<void> {}
    async loadDocs (domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
      return []
    }

    async upload (domain: Domain, docs: Doc[]): Promise<void> {}
    async clean (domain: Domain, docs: Ref<Doc>[]): Promise<void> {}
    async loadModel (last: Timestamp): Promise<Tx[]> {
      return txes
    }

    async sendForceClose (): Promise<void> {}
  }

  return new ClientConnectionImpl()
}
