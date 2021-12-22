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

import type { Doc, Ref, TxResult } from '@anticrm/core'
import type { FullTextAdapter, IndexedDoc } from '@anticrm/server-core'

import { Client } from '@elastic/elasticsearch'

class ElasticAdapter implements FullTextAdapter {
  constructor (
    private readonly client: Client,
    private readonly db: string
  ) {
  }

  async search (
    search: string
  ): Promise<IndexedDoc[]> {
    const query = search.replace(/[\\/+\-=&><!()|{}^"~*&:[\]]/g, '\\$&')
    try {
      const result = await this.client.search({
        index: this.db,
        body: {
          query: {
            multi_match: {
              query: query,
              fields: [
                'content0',
                'content1',
                'content2',
                'content3',
                'content4',
                'content5',
                'content6',
                'content7',
                'content8',
                'content9',
                'attachment.content'
              ]
            }
          }
        }
      })
      const hits = result.body.hits.hits as any[]
      return hits.map(hit => hit._source)
    } catch (err) {
      console.error(JSON.stringify(err, null, 2))
      return []
    }
  }

  async index (doc: IndexedDoc): Promise<TxResult> {
    if (doc.data === undefined) {
      try {
        await this.client.index({
          index: this.db,
          id: doc.id,
          type: '_doc',
          body: doc
        })
      } catch (err: any) {
        console.error('elastic-exception', err)
      }
    } else {
      try {
        await this.client.index({
          index: this.db,
          id: doc.id,
          type: '_doc',
          pipeline: 'attachment',
          body: doc
        })
      } catch (err: any) {
        console.error('elastic-exception', err)
      }
    }
    return {}
  }

  async update (id: Ref<Doc>, update: Record<string, any>): Promise<TxResult> {
    try {
      await this.client.update({
        index: this.db,
        id,
        body: {
          doc: update
        }
      })
    } catch (err: any) {
      console.error('elastic-exception', err)
    }

    return {}
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
