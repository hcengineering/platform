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

import {
  Class,
  ClientConnection,
  Doc,
  DocChunk,
  DocumentQuery,
  Domain,
  DOMAIN_TX,
  FindOptions,
  FindResult,
  getWorkspaceId,
  MeasureMetricsContext,
  Ref,
  ServerStorage,
  Tx,
  TxHander,
  TxResult
} from '@hcengineering/core'
import { createInMemoryTxAdapter } from '@hcengineering/dev-storage'
import devmodel from '@hcengineering/devmodel'
import { protoDeserialize, protoSerialize, setMetadata } from '@hcengineering/platform'
import {
  createInMemoryAdapter,
  createServerStorage,
  DbConfiguration,
  FullTextAdapter,
  IndexedDoc
} from '@hcengineering/server-core'

class ServerStorageWrapper implements ClientConnection {
  measureCtx = new MeasureMetricsContext('client', {})
  constructor (private readonly storage: ServerStorage, private readonly handler: TxHander) {}

  findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const [c, q, o] = protoDeserialize(protoSerialize([_class, query, options]))
    return this.storage.findAll(this.measureCtx, c, q, o)
  }

  async tx (tx: Tx): Promise<TxResult> {
    const _tx = protoDeserialize(protoSerialize(tx))
    const [result, derived] = await this.storage.tx(this.measureCtx, _tx)
    for (const tx of derived) {
      this.handler(tx)
    }
    return result
  }

  async close (): Promise<void> {}

  async loadChunk (domain: Domain, idx?: number): Promise<DocChunk> {
    return { idx: -1, docs: {}, finished: true }
  }

  async closeChunk (idx: number): Promise<void> {}

  async loadDocs (domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return []
  }

  async upload (domain: Domain, docs: Doc[]): Promise<void> {}

  async clean (domain: Domain, docs: Ref<Doc>[]): Promise<void> {}
}

class NullFullTextAdapter implements FullTextAdapter {
  async index (doc: IndexedDoc): Promise<TxResult> {
    return {}
  }

  async update (id: Ref<Doc>, update: Record<string, any>): Promise<TxResult> {
    return {}
  }

  async search (query: any): Promise<IndexedDoc[]> {
    return []
  }

  async remove (id: Ref<Doc>): Promise<void> {}

  async close (): Promise<void> {}
}

async function createNullFullTextAdapter (): Promise<FullTextAdapter> {
  return new NullFullTextAdapter()
}

export async function connect (handler: (tx: Tx) => void): Promise<ClientConnection> {
  const conf: DbConfiguration = {
    domains: {
      [DOMAIN_TX]: 'InMemoryTx'
    },
    defaultAdapter: 'InMemory',
    adapters: {
      InMemoryTx: {
        factory: createInMemoryTxAdapter,
        url: ''
      },
      InMemory: {
        factory: createInMemoryAdapter,
        url: ''
      }
    },
    fulltextAdapter: {
      factory: createNullFullTextAdapter,
      url: ''
    },
    workspace: getWorkspaceId('')
  }
  const serverStorage = await createServerStorage(conf)
  setMetadata(devmodel.metadata.DevModel, serverStorage)
  return new ServerStorageWrapper(serverStorage, handler)
}
