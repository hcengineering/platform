//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { ApiResponse, Client } from '@elastic/elasticsearch'
import { SearchResponse } from '@elastic/elasticsearch/api/types'
import core, {
  Class,
  Doc,
  DocumentQuery,
  DocumentUpdate,
  Domain,
  FindOptions,
  FindResult,
  FullTextData,
  Hierarchy,
  IndexingConfiguration,
  MeasureContext,
  Ref,
  Space,
  StorageIterator,
  Tx,
  TxResult,
  WorkspaceId,
  toWorkspaceString
} from '@hcengineering/core'
import { getMetadata, PlatformError, unknownStatus } from '@hcengineering/platform'
import serverCore, { DbAdapter, IndexedDoc } from '@hcengineering/server-core'
import { createHash } from 'node:crypto'

const indexName = getMetadata(serverCore.metadata.ElasticIndexName) ?? 'storage_index'
class ElasticDataAdapter implements DbAdapter {
  constructor (
    readonly workspaceId: WorkspaceId,
    readonly client: Client
  ) {}

  async findAll<T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return Object.assign([], { total: 0 })
  }

  async tx (ctx: MeasureContext, ...tx: Tx[]): Promise<TxResult[]> {
    return []
  }

  async init (model: Tx[]): Promise<void> {}

  async createIndexes (domain: Domain, config: Pick<IndexingConfiguration<Doc>, 'indexes'>): Promise<void> {}
  async removeOldIndex (domain: Domain, deletePattern: RegExp, keepPattern: RegExp): Promise<void> {}

  async close (): Promise<void> {
    await this.client.close()
  }

  find (domain: Domain): StorageIterator {
    let listRecieved = false
    let pos = 0
    let buffer: { _id: string, data: IndexedDoc }[] = []
    let resp: ApiResponse | null = null
    let finished = false
    // eslint-disable-next-line @typescript-eslint/naming-convention
    let scroll_id: string | undefined

    const stIterator = {
      next: async () => {
        try {
          if (!listRecieved) {
            const q = {
              index: indexName,
              type: '_doc',
              scroll: '23h',
              // search_type: 'scan', //if I use search_type then it requires size otherwise it shows 0 result
              size: 100,
              body: {
                query: {
                  bool: {
                    must: {
                      match: {
                        workspaceId: toWorkspaceString(this.workspaceId)
                      }
                    }
                  }
                }
              }
            }
            resp = await this.client.search(q)
            if (resp.statusCode !== 200) {
              if (resp.body?.error?.type === 'index_not_found_exception') {
                return undefined
              }
              console.error('failed elastic query', q, resp)
              throw new PlatformError(unknownStatus(`failed to elastic query ${JSON.stringify(resp)}`))
            }
            buffer = resp.body.hits.hits.map((hit: any) => ({ _id: hit._id, data: hit._source }))
            if (buffer.length === 0) {
              finished = true
              await stIterator.close()
            }
            scroll_id = (resp.body as SearchResponse)._scroll_id
            listRecieved = true
          }
          if (resp !== null && pos === buffer.length && !finished) {
            const params = {
              scroll_id,
              scroll: '23h'
            }
            resp = await this.client.scroll(params, { maxRetries: 5 })

            if (resp.statusCode !== 200) {
              console.error('failed elastic query scroll', scroll_id, resp)
              throw new PlatformError(unknownStatus(`failed to elastic query ${JSON.stringify(resp)}`))
            }
            buffer = resp.body.hits.hits.map((hit: any) => ({ _id: hit._id, data: hit._source }))
            if (buffer.length === 0) {
              finished = true
              await stIterator.close()
            }
            pos = 0
          }
          if (pos < buffer.length) {
            const item = buffer[pos]
            const hash = createHash('sha256')
            const json = JSON.stringify(item.data)
            hash.update(json)
            const digest = hash.digest('base64')
            const result = {
              id: item._id,
              hash: digest,
              size: json.length
            }
            pos++
            return result
          }
        } catch (e: any) {
          if (e?.meta?.body?.error?.type === 'index_not_found_exception') {
            return undefined
          }
          await stIterator.close()
          console.error('elastic error:', e)
          throw new PlatformError(e)
        }
      },
      close: async () => {
        if (scroll_id != null) {
          await this.client.clearScroll({ scroll_id })
          scroll_id = undefined
        }
      }
    }
    return stIterator
  }

  async load (domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    const result: Doc[] = []

    const resp = await this.client.search({
      index: indexName,
      type: '_doc',
      body: {
        query: {
          bool: {
            must: [
              {
                terms: {
                  _id: docs,
                  boost: 1.0
                }
              },
              {
                match: {
                  workspaceId: toWorkspaceString(this.workspaceId)
                }
              }
            ]
          }
        },
        size: docs.length
      }
    })
    const buffer = resp.body.hits.hits.map((hit: any) => ({ _id: hit._id, data: hit._source }))

    for (const item of buffer) {
      const dta: FullTextData = {
        _id: item._id as Ref<FullTextData>,
        _class: core.class.FulltextData,
        space: 'fulltext-blob' as Ref<Space>,
        modifiedOn: item.data.modifiedOn,
        modifiedBy: item.data.modifiedBy,
        data: item.data
      }
      result.push(dta)
    }
    return result
  }

  async upload (domain: Domain, docs: Doc[]): Promise<void> {
    while (docs.length > 0) {
      const part = docs.splice(0, 10000)
      try {
        await this.client.deleteByQuery(
          {
            type: '_doc',
            index: indexName,
            body: {
              query: {
                bool: {
                  must: [
                    {
                      terms: {
                        _id: Array.from(part.map((it) => it._id)),
                        boost: 1.0
                      }
                    },
                    {
                      match: {
                        workspaceId: toWorkspaceString(this.workspaceId)
                      }
                    }
                  ]
                }
              },
              size: part.length
            }
          },
          undefined
        )
      } catch (err: any) {
        console.error(err)
      }

      const operations = part.flatMap((doc) => [
        { index: { _index: indexName, _id: doc._id } },
        {
          workspaceId: toWorkspaceString(this.workspaceId),
          ...(doc as FullTextData).data
        }
      ])

      await this.client.bulk({ refresh: true, body: operations })
    }
  }

  async update (domain: Domain, operations: Map<Ref<Doc>, DocumentUpdate<Doc>>): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async clean (domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    while (docs.length > 0) {
      const part = docs.splice(0, 10000)
      await this.client.deleteByQuery(
        {
          type: '_doc',
          index: indexName,
          body: {
            query: {
              bool: {
                must: [
                  {
                    terms: {
                      _id: part,
                      boost: 1.0
                    }
                  },
                  {
                    match: {
                      workspaceId: toWorkspaceString(this.workspaceId)
                    }
                  }
                ]
              }
            },
            size: part.length
          }
        },
        undefined
      )
    }
  }
}

/**
 * @public
 */
export async function createElasticBackupDataAdapter (
  ctx: MeasureContext,
  hierarchy: Hierarchy,
  url: string,
  workspaceId: WorkspaceId
): Promise<DbAdapter> {
  const client = new Client({
    node: url
  })
  return new ElasticDataAdapter(workspaceId, client)
}
