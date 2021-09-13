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

import type { FullTextAdapter, IndexedAttachment, IndexedDoc, SearchQuery } from '@anticrm/server-core'

import { Client } from '@elastic/elasticsearch'

class ElasticAdapter implements FullTextAdapter {
  constructor (
    private readonly client: Client,
    private readonly db: string
  ) {
  }

  async search (
    query: SearchQuery
  ): Promise<IndexedDoc[]> {
    const result = await this.client.search({
      index: this.db,
      body: {
        query: {
          match: {
            content: query.$search
            // 'attachment.content': query.$search
          }
        }
      }
    })
    console.log(result)
    const hits = result.body.hits.hits as any[]
    return hits.map(hit => hit._source)
  }

  async index (doc: IndexedDoc): Promise<void> {
    console.log('eastic: index', doc)
    if ((doc as IndexedAttachment).data === undefined) {
      const resp = await this.client.index({
        index: this.db,
        type: '_doc',
        body: doc
      })
      console.log(resp)
    } else {
      console.log('attachment pipeline')
      const resp = await this.client.index({
        index: this.db,
        type: '_doc',
        pipeline: 'attachment',
        body: doc
      })
      console.log(resp)
    }
  }
}

/**
 * @public
 */
export async function createElasticAdapter (url: string, dbName: string): Promise<FullTextAdapter> {
  const client = new Client({
    node: url
  })

  return new ElasticAdapter(client, dbName)
}
