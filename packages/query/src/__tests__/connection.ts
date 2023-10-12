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

import type {
  AccountClient,
  BackupClient,
  Class,
  Doc,
  DocumentQuery,
  Domain,
  FindOptions,
  FindResult,
  LoadModelResponse,
  Ref,
  Timestamp,
  Tx,
  TxResult
} from '@hcengineering/core'
import core, { DOMAIN_TX, Hierarchy, ModelDb, TxDb } from '@hcengineering/core'
import { genMinModel } from './minmodel'

export async function connect (handler: (tx: Tx) => void): Promise<
AccountClient &
BackupClient & {
  loadModel: (last: Timestamp, hash?: string) => Promise<Tx[] | LoadModelResponse>
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

  async function findAll<T extends Doc> (
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const domain = hierarchy.getClass(_class).domain
    if (domain === DOMAIN_TX) return await transactions.findAll(_class, query, options)
    return await model.findAll(_class, query, options)
  }

  return {
    findAll,
    findOne: async (_class, query, options) => (await findAll(_class, query, { ...options, limit: 1 })).shift(),
    getHierarchy: () => hierarchy,
    getModel: () => model,
    getAccount: async () => ({} as unknown as any),
    tx: async (tx: Tx): Promise<TxResult> => {
      if (tx.objectSpace === core.space.Model) {
        hierarchy.tx(tx)
      }
      await Promise.all([model.tx(tx), transactions.tx(tx)])
      // Not required, since handled in client.
      // handler(tx)
      return {}
    },
    close: async () => {},
    loadChunk: async (domain: Domain, idx?: number) => ({
      idx: -1,
      index: -1,
      docs: {},
      finished: true,
      digest: ''
    }),
    loadModel: async (lastTxTime) => txes,
    closeChunk: async (idx: number) => {},
    loadDocs: async (domain: Domain, docs: Ref<Doc>[]) => [],
    upload: async (domain: Domain, docs: Doc[]) => {},
    clean: async (domain: Domain, docs: Ref<Doc>[]) => {}
  }
}
