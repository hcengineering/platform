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

import {
  Class,
  Doc,
  DocumentQuery,
  IndexingConfiguration,
  MeasureContext,
  Ref,
  toWorkspaceString,
  TxResult,
  WorkspaceId
} from '@hcengineering/core'
import type { EmbeddingSearchOption, FullTextAdapter, IndexedDoc } from '@hcengineering/server-core'

import { Client, errors as esErr } from '@elastic/elasticsearch'
import { Domain } from 'node:domain'
class ElasticAdapter implements FullTextAdapter {
  constructor (
    private readonly client: Client,
    private readonly workspaceId: WorkspaceId,
    private readonly _metrics: MeasureContext
  ) {}

  async createIndexes (domain: Domain, config: Pick<IndexingConfiguration<Doc>, 'indexes'>): Promise<void> {}

  async initMapping (field?: { key: string, dims: number }): Promise<Record<string, number>> {
    // const current = await this.client.indices.getMapping({})
    // console.log('Mappings', current)
    // const mappings = current.body[toWorkspaceString(this.workspaceId)]
    const result: Record<string, number> = {}
    try {
      const existsIndex = await this.client.indices.exists({
        index: toWorkspaceString(this.workspaceId)
      })
      if (!existsIndex.body) {
        const createIndex = await this.client.indices.create({
          index: toWorkspaceString(this.workspaceId)
        })
        console.log(createIndex)
      }

      const mappings = await this.client.indices.getMapping({
        index: toWorkspaceString(this.workspaceId)
      })
      if (field !== undefined) {
        console.log('Mapping', mappings.body)
      }
      const wsMappings = mappings.body[toWorkspaceString(this.workspaceId)]

      // Collect old values.
      for (const [k, v] of Object.entries(wsMappings?.mappings?.properties ?? {})) {
        const va = v as any
        if (va?.type === 'dense_vector') {
          result[k] = va?.dims as number
        }
      }
      if (field?.key !== undefined) {
        if (!(wsMappings?.mappings?.properties?.[field.key]?.type === 'dense_vector')) {
          result[field.key] = field.dims
          await this.client.indices.putMapping({
            index: toWorkspaceString(this.workspaceId),
            allow_no_indices: true,
            body: {
              properties: {
                [field.key]: {
                  type: 'dense_vector',
                  dims: field.dims
                }
              }
            }
          })
        }
      }
    } catch (err: any) {
      console.error(err)
    }
    return result
  }

  async close (): Promise<void> {
    await this.client.close()
  }

  metrics (): MeasureContext {
    return this._metrics
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
              analyze_wildcard: true,
              flags: 'OR|PREFIX|PHRASE|FUZZY|NOT|ESCAPE',
              default_operator: 'and'
            }
          }
        ],
        should: [{ terms: this.getTerms(_classes, '_class', { boost: 10.0 }) }],
        filter: [
          {
            bool: {
              should: [
                { terms: this.getTerms(_classes, '_class') }
                // { terms: this.getTerms(_classes, 'attachedToClass') }
              ]
            }
          }
        ]
      }
    }

    if (query.space != null) {
      if (typeof query.space === 'object') {
        if (query.space.$in !== undefined) {
          request.bool.should.push({
            terms: {
              space: query.space.$in.map((c) => c.toLowerCase()),
              boost: 2.0
            }
          })
        }
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
      return hits.map((hit) => ({ ...hit._source, _score: hit._score }))
    } catch (err) {
      console.error(JSON.stringify(err, null, 2))
      return []
    }
  }

  private getTerms (_classes: Ref<Class<Doc>>[], field: string, extra: any = {}): any {
    return {
      [field]: _classes.map((c) => c.toLowerCase()),
      ...extra
    }
  }

  async searchEmbedding (
    _classes: Ref<Class<Doc>>[],
    search: DocumentQuery<Doc>,
    embedding: number[],
    options: EmbeddingSearchOption
  ): Promise<IndexedDoc[]> {
    if (embedding.length === 0) return []
    const request: any = {
      bool: {
        should: [
          {
            script_score: {
              query: {
                bool: {
                  filter: {
                    term: {
                      [options.field_enable]: true
                    }
                  }
                }
              },
              script: {
                source: `cosineSimilarity(params.queryVector, '${options.field}') + 1`,
                params: {
                  queryVector: embedding
                }
              },
              boost: options.embeddingBoost ?? 10.0
            }
          },
          {
            simple_query_string: {
              query: search.$search,
              flags: 'OR|PREFIX|PHRASE',
              default_operator: 'and',
              boost: options.fulltextBoost ?? 1
            }
          }
        ],
        filter: [
          {
            bool: {
              must: [{ terms: this.getTerms(_classes, '_class') }]
            }
          }
        ]
      }
    }

    try {
      const result = await this.client.search({
        index: toWorkspaceString(this.workspaceId),
        body: {
          query: request,
          size: options?.size ?? 200,
          from: options?.from ?? 0
        }
      })
      const sourceHits = result.body.hits.hits

      const min = options?.minScore ?? 75
      const embBoost = options.embeddingBoost ?? 10.0

      const hits: any[] = sourceHits.filter((it: any) => it._score - embBoost > min)
      return hits.map((hit) => ({ ...hit._source, _score: hit._score - embBoost }))
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

  async updateMany (docs: IndexedDoc[]): Promise<TxResult[]> {
    const parts = Array.from(docs)
    while (parts.length > 0) {
      const part = parts.splice(0, 1000)

      const operations = part.flatMap((doc) => [
        { index: { _index: toWorkspaceString(this.workspaceId), _id: doc.id } },
        { ...doc, type: '_doc' }
      ])

      const response = await this.client.bulk({ refresh: true, body: operations })
      if ((response as any).body.errors === true) {
        const errors = response.body.items.filter((it: any) => it.index.error !== undefined)
        const errorIds = new Set(errors.map((it: any) => it.index._id))
        const erroDocs = docs.filter((it) => errorIds.has(it.id))
        // Collect only errors
        const errs = Array.from(errors.map((it: any) => it.index.error.reason as string)).join('\n')
        console.error(`Failed to process bulk request: ${errs} ${JSON.stringify(erroDocs)}`)
      }
    }
    return []
  }

  async remove (docs: Ref<Doc>[]): Promise<void> {
    try {
      while (docs.length > 0) {
        const part = docs.splice(0, 10000)
        await this.client.deleteByQuery(
          {
            type: '_doc',
            index: toWorkspaceString(this.workspaceId),
            body: {
              query: {
                terms: {
                  _id: part,
                  boost: 1.0
                }
              },
              size: part.length
            }
          },
          undefined
        )
      }
    } catch (e: any) {
      if (e instanceof esErr.ResponseError && e.meta.statusCode === 404) {
        return
      }
      throw e
    }
  }

  async load (docs: Ref<Doc>[]): Promise<IndexedDoc[]> {
    const resp = await this.client.search({
      index: toWorkspaceString(this.workspaceId),
      type: '_doc',
      body: {
        query: {
          terms: {
            _id: docs,
            boost: 1.0
          }
        },
        size: docs.length
      }
    })
    return Array.from(resp.body.hits.hits.map((hit: any) => ({ ...hit._source, id: hit._id })))
  }
}

/**
 * @public
 */
export async function createElasticAdapter (
  url: string,
  workspaceId: WorkspaceId,
  metrics: MeasureContext
): Promise<FullTextAdapter & { close: () => Promise<void> }> {
  const client = new Client({
    node: url
  })

  return new ElasticAdapter(client, workspaceId, metrics)
}
