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

import { TxProcessor, Hierarchy } from '@anticrm/core'
import type { Doc, Ref, Class, DocumentQuery, FindOptions, FindResult, TxCreateDoc } from '@anticrm/core'
import type { DbAdapter } from '@anticrm/server-core'

import { Client } from '@elastic/elasticsearch'

function translateDoc (doc: Doc): any {
  const obj = { id: doc._id, ...doc } as any
  delete obj._id
  return obj
}

class ElasticAdapter extends TxProcessor implements DbAdapter {
  constructor (
    private readonly client: Client,
    private readonly db: string,
    private readonly hierarchy: Hierarchy
  ) {
    super()
  }

  async init (): Promise<void> {}

  async findAll<T extends Doc> (
    clazz: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const domain = this.hierarchy.getDomain(clazz)
    const result = await this.client.search({
      index: this.db + '_' + domain,
      type: '_doc',
      body: {
      }
    })
    const hits = result.body.hits.hits as []
    console.log(hits)
    return []
  }

  protected override async txCreateDoc (tx: TxCreateDoc<Doc>): Promise<void> {
    const doc = TxProcessor.createDoc2Doc(tx)
    const domain = this.hierarchy.getDomain(doc._class)
    await this.client.index({
      index: this.db + '_' + domain,
      type: '_doc',
      body: translateDoc(doc)
    })
  }
}

/**
 * @public
 */
export async function createElasticAdapter (hierarchy: Hierarchy, url: string, dbName: string): Promise<DbAdapter> {
  const client = new Client({
    node: url
  })

  return new ElasticAdapter(client, dbName, hierarchy)
}
