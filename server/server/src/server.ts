//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { Class, Doc, DocumentQuery, DOMAIN_MODEL, DOMAIN_TX, FindOptions, FindResult, Hierarchy, ModelDb, Ref, Tx, TxResult } from '@anticrm/core'
import { start as startJsonRpc } from '@anticrm/server-ws'
import { createMongoAdapter, createMongoTxAdapter } from '@anticrm/mongo'
import { createElasticAdapter } from '@anticrm/elastic'
import { createServerStorage } from '@anticrm/server-core'
import type { DbConfiguration, DbAdapter } from '@anticrm/server-core'

import { addLocation } from '@anticrm/platform'
import { serverChunterId } from '@anticrm/server-chunter'
import { serverRecruitId } from '@anticrm/server-recruit'
import { metricsContext } from './metrics'

class NullDbAdapter implements DbAdapter {
  async init (model: Tx[]): Promise<void> {}
  async findAll <T extends Doc>(_class: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T> | undefined): Promise<FindResult<T>> { return [] }
  async tx (tx: Tx): Promise<TxResult> { return {} }
}

async function createNullAdapter (hierarchy: Hierarchy, url: string, db: string, modelDb: ModelDb): Promise<DbAdapter> {
  return new NullDbAdapter()
}

/**
 * @public
 */
export function start (dbUrl: string, fullTextUrl: string, port: number, host?: string): () => void {
  addLocation(serverChunterId, () => import('@anticrm/server-chunter-resources'))
  addLocation(serverRecruitId, () => import('@anticrm/server-recruit-resources'))

  return startJsonRpc(metricsContext, (workspace: string) => {
    const conf: DbConfiguration = {
      domains: {
        [DOMAIN_TX]: 'MongoTx',
        [DOMAIN_MODEL]: 'Null'
      },
      defaultAdapter: 'Mongo',
      adapters: {
        MongoTx: {
          factory: createMongoTxAdapter,
          url: dbUrl
        },
        Mongo: {
          factory: createMongoAdapter,
          url: dbUrl
        },
        Null: {
          factory: createNullAdapter,
          url: ''
        }
      },
      fulltextAdapter: {
        factory: createElasticAdapter,
        url: fullTextUrl
      },
      workspace
    }
    return createServerStorage(conf)
  }, port, host)
}
