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
  WorkspaceId,
  SearchQuery,
  SearchOptions
} from '@hcengineering/core'
import type {
  EmbeddingSearchOption,
  FullTextAdapter,
  SearchStringResult,
  SearchScoring,
  IndexedDoc
} from '@hcengineering/server-core'
import serverCore from '@hcengineering/server-core'

import { Client, errors as esErr } from '@elastic/elasticsearch'
import { Domain } from 'node:domain'
import { getMetadata } from '@hcengineering/platform'

const DEFAULT_LIMIT = 200
const indexName = getMetadata(serverCore.metadata.ElasticIndexName) ?? 'storage_index'
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
      const existsOldIndex = await this.client.indices.exists({
        index: toWorkspaceString(this.workspaceId)
      })
      if (existsOldIndex.body) {
        await this.client.indices.delete({
          index: toWorkspaceString(this.workspaceId)
        })
      }
      const existsIndex = await this.client.indices.exists({
        index: indexName
      })
      if (!existsIndex.body) {
        const createIndex = await this.client.indices.create({
          index: indexName,
          body: {
            settings: {
              analysis: {
                filter: {
                  english_stemmer: {
                    type: 'stemmer',
                    language: 'english'
                  },
                  english_possessive_stemmer: {
                    type: 'stemmer',
                    language: 'possessive_english'
                  }
                },
                analyzer: {
                  rebuilt_english: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['english_possessive_stemmer', 'lowercase', 'english_stemmer']
                  }
                }
              }
            }
          }
        })
        console.log(createIndex)
      }

      const mappings = await this.client.indices.getMapping({
        index: indexName
      })
      if (field !== undefined) {
        console.log('Mapping', mappings.body)
      }
      let wsMappings = mappings.body.storage_index
      if (Object.keys(wsMappings?.mappings?.properties ?? {}).some((k) => k.includes('->'))) {
        await this.client.indices.delete({
          index: indexName
        })
        const createIndex = await this.client.indices.create({
          index: indexName
        })
        console.log('recreate index', createIndex)
        const mappings = await this.client.indices.getMapping({
          index: indexName
        })
        wsMappings = mappings.body.storage_index
      }

      // Collect old values.
      for (const [k, v] of Object.entries(wsMappings?.mappings?.properties ?? {})) {
        const va = v as any
        if (va?.type === 'dense_vector') {
          result[k] = va?.dims as number
        }
      }
      await this.client.indices.putMapping({
        index: indexName,
        body: {
          properties: {
            fulltextSummary: {
              type: 'text',
              analyzer: 'rebuilt_english'
            }
          }
        }
      })
      if (field?.key !== undefined) {
        if (!(wsMappings?.mappings?.properties?.[field.key]?.type === 'dense_vector')) {
          result[field.key] = field.dims
          await this.client.indices.putMapping({
            index: indexName,
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

  async searchString (
    query: SearchQuery,
    options: SearchOptions & { scoring?: SearchScoring[] }
  ): Promise<SearchStringResult> {
    try {
      const elasticQuery: any = {
        query: {
          function_score: {
            query: {
              bool: {
                must: [
                  {
                    simple_query_string: {
                      query: query.query,
                      analyze_wildcard: true,
                      flags: 'OR|PREFIX|PHRASE|FUZZY|NOT|ESCAPE',
                      default_operator: 'and',
                      fields: [
                        'searchTitle^50', // boost
                        'searchShortTitle^50',
                        '*' // Search in all other fields without a boost
                      ]
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
            functions: [
              {
                script_score: {
                  script: {
                    source: "Math.max(0, ((doc['modifiedOn'].value / 1000 - 1672531200) / 2592000))"
                    /*
                      Give more score for more recent objects. 1672531200 is the start of 2023
                      2592000 is a month. The idea is go give 1 point for each month. For objects
                      older than Jan 2023 it will give just zero.
                      Better approach is to use gauss function, need to investigate futher how be
                      map modifiedOn, need to tell elastic that this is a date.

                      But linear function is perfect to conduct an experiment
                    */
                  }
                }
              }
            ],
            boost_mode: 'sum'
          }
        },
        size: options.limit ?? DEFAULT_LIMIT
      }

      const filter: any = [
        {
          exists: { field: 'searchTitle' }
        }
      ]

      if (query.spaces !== undefined) {
        filter.push({
          terms: { 'space.keyword': query.spaces }
        })
      }
      if (query.classes !== undefined) {
        filter.push({
          terms: { '_class.keyword': query.classes }
        })
      }

      if (filter.length > 0) {
        elasticQuery.query.function_score.query.bool.filter = filter
      }

      if (options.scoring !== undefined) {
        const scoringTerms: any[] = options.scoring.map((scoringOption): any => {
          return {
            term: {
              [`${scoringOption.attr}.keyword`]: {
                value: scoringOption.value,
                boost: scoringOption.boost
              }
            }
          }
        })
        elasticQuery.query.function_score.query.bool.should = scoringTerms
      }

      const result = await this.client.search({
        index: indexName,
        body: elasticQuery
      })

      const resp: SearchStringResult = { docs: [] }
      if (result.body.hits !== undefined) {
        if (result.body.hits.total?.value !== undefined) {
          resp.total = result.body.hits.total?.value
        }
        resp.docs = result.body.hits.hits.map((hit: any) => ({ ...hit._source, _score: hit._score }))
      }

      return resp
    } catch (err) {
      console.error('elastic error', JSON.stringify(err, null, 2))
      return { docs: [] }
    }
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
          },
          {
            match: {
              workspaceId: toWorkspaceString(this.workspaceId)
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

    for (const [q, v] of Object.entries(query)) {
      if (!q.startsWith('$')) {
        if (typeof v === 'object') {
          if (v.$in !== undefined) {
            request.bool.should.push({
              terms: {
                [q]: v.$in,
                boost: 100.0
              }
            })
          }
        } else {
          request.bool.should.push({
            term: {
              [q]: {
                value: v,
                boost: 100.0,
                case_insensitive: true
              }
            }
          })
        }
      }
    }

    try {
      const result = await this.client.search({
        index: indexName,
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
        must: {
          match: {
            workspaceId: toWorkspaceString(this.workspaceId)
          }
        },
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
        index: indexName,
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
    const wsDoc = {
      workspaceId: toWorkspaceString(this.workspaceId),
      ...doc
    }
    if (doc.data === undefined) {
      await this.client.index({
        index: indexName,
        id: doc.id,
        type: '_doc',
        body: wsDoc
      })
    } else {
      await this.client.index({
        index: indexName,
        id: doc.id,
        type: '_doc',
        pipeline: 'attachment',
        body: wsDoc
      })
    }
    return {}
  }

  async update (id: Ref<Doc>, update: Record<string, any>): Promise<TxResult> {
    await this.client.update({
      index: indexName,
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

      const operations = part.flatMap((doc) => {
        const wsDoc = { workspaceId: toWorkspaceString(this.workspaceId), ...doc }
        return [{ index: { _index: indexName, _id: doc.id } }, { ...wsDoc, type: '_doc' }]
      })

      const response = await this.client.bulk({ refresh: true, body: operations })
      if ((response as any).body.errors === true) {
        const errors = response.body.items.filter((it: any) => it.index.error !== undefined)
        const errorIds = new Set(errors.map((it: any) => it.index._id))
        const erroDocs = docs.filter((it) => errorIds.has(it.id))
        // Collect only errors
        const errs = Array.from(
          errors.map((it: any) => {
            return `${it.index.error.reason}: ${it.index.error.caused_by?.reason}`
          })
        ).join('\n')

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
    } catch (e: any) {
      if (e instanceof esErr.ResponseError && e.meta.statusCode === 404) {
        return
      }
      throw e
    }
  }

  async load (docs: Ref<Doc>[]): Promise<IndexedDoc[]> {
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
): Promise<FullTextAdapter> {
  const client = new Client({
    node: url
  })

  return new ElasticAdapter(client, workspaceId, metrics)
}
