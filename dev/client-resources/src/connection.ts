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

import type { Tx, Storage, Ref, Doc, Class, DocumentQuery, FindResult, FindOptions, TxHander, ServerStorage, TxResult, Closable } from '@anticrm/core'
import { DOMAIN_TX } from '@anticrm/core'
import { createInMemoryAdapter, createInMemoryTxAdapter } from '@anticrm/dev-storage'
import { createServerStorage, FullTextAdapter, IndexedDoc } from '@anticrm/server-core'
import type { DbConfiguration } from '@anticrm/server-core'
import { protoSerialize, protoDeserialize } from '@anticrm/platform'

class ServerStorageWrapper implements Storage, Closable {
  constructor (private readonly storage: ServerStorage, private readonly handler: TxHander) {}

  findAll <T extends Doc>(_class: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T>): Promise<FindResult<T>> {
    const [c, q, o] = protoDeserialize(protoSerialize([_class, query, options]))
    return this.storage.findAll(c, q, o)
  }

  async tx (tx: Tx): Promise<TxResult> {
    const _tx = protoDeserialize(protoSerialize(tx))
    const [result, derived] = await this.storage.tx(_tx)
    for (const tx of derived) { this.handler(tx) }
    return result
  }

  async close (): Promise<void> {
  }
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
}

async function createNullFullTextAdapter (): Promise<FullTextAdapter> {
  return new NullFullTextAdapter()
}

export async function connect (handler: (tx: Tx) => void): Promise<Storage & Closable> {
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
    workspace: ''
  }
  const serverStorage = await createServerStorage(conf)
  return new ServerStorageWrapper(serverStorage, handler)
}
