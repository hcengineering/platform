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

import { Class, Doc, DocumentQuery, Ref, toWorkspaceString, TxResult, WorkspaceId } from '@hcengineering/core'
import type { FullTextAdapter, IndexedDoc } from '@hcengineering/server-core'

import { Client, errors as esErr } from '@elastic/elasticsearch'
class ElasticAdapter implements FullTextAdapter {
  constructor (private readonly client: Client, private readonly workspaceId: WorkspaceId) {}

  async close (): Promise<void> {
    await this.client.close()
  }

  async search (
    _classes: Ref<Class<Doc>>[],
    query: DocumentQuery<Doc>,
    size: number | undefined,
    from: number | undefined
  ): Promise<IndexedDoc[]> {
    if (query.$search === undefined) return []
    const request: any = {
      bool: {
        must: [
          {
            simple_query_string: {
              query: query.$search,
              flags: 'OR|PREFIX|PHRASE',
              default_operator: 'and'
            }
          }
        ],
        should: [
          {
            terms: {
              _class: _classes.map((c) => c.toLowerCase()),
              boost: 50.0
            }
          }
        ],
        filter: [
          {
            bool: {
              should: [
                {
                  terms: {
                    _class: _classes.map((c) => c.toLowerCase())
                  }
                },
                {
                  terms: {
                    attachedToClass: _classes.map((c) => c.toLowerCase())
                  }
                }
              ]
            }
          }
        ]
      }
    }

    if (query.space != null) {
      if (typeof query.space === 'object' && query.space.$in !== undefined) {
        request.bool.should.push({
          terms: {
            space: query.space.$in.map((c) => c.toLowerCase()),
            boost: 2.0
          }
        })
      } else {
        request.bool.should.push({
          term: {
            space: {
              value: query.space,
              boost: 2.0,
              case_insensitive: true
            }
          }
        })
      }
    }

    try {
      const result = await this.client.search({
        index: toWorkspaceString(this.workspaceId),
        body: {
          query: request,
          size: size ?? 200,
          from: from ?? 0
        }
      })
      const hits = result.body.hits.hits as any[]
      return hits.map((hit) => hit._source)
    } catch (err) {
      console.error(JSON.stringify(err, null, 2))
      return []
    }
  }

  async index (doc: IndexedDoc): Promise<TxResult> {
    if (doc.data === undefined) {
      await this.client.index({
        index: toWorkspaceString(this.workspaceId),
        id: doc.id,
        type: '_doc',
        body: doc
      })
    } else {
      await this.client.index({
        index: toWorkspaceString(this.workspaceId),
        id: doc.id,
        type: '_doc',
        pipeline: 'attachment',
        body: doc
      })
    }
    return {}
  }

  async update (id: Ref<Doc>, update: Record<string, any>): Promise<TxResult> {
    await this.client.update({
      index: toWorkspaceString(this.workspaceId),
      id,
      body: {
        doc: update
      }
    })

    return {}
  }

  async remove (id: Ref<Doc>): Promise<void> {
    try {
      await this.client.delete({
        index: toWorkspaceString(this.workspaceId),
        id
      })
    } catch (e: any) {
      if (e instanceof esErr.ResponseError && e.meta.statusCode === 404) {
        return
      }

      throw e
    }
  }
}

/**
 * @public
 */
export async function createElasticAdapter (
  url: string,
  workspaceId: WorkspaceId
): Promise<FullTextAdapter & { close: () => Promise<void> }> {
  const client = new Client({
    node: url
  })

  return new ElasticAdapter(client, workspaceId)
}
