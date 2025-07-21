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

import { Analytics } from '@hcengineering/analytics'
import {
  Class,
  Doc,
  DocumentQuery,
  MeasureContext,
  Ref,
  SearchOptions,
  SearchQuery,
  TxResult,
  WorkspaceUuid
} from '@hcengineering/core'
import type { FullTextAdapter, IndexedDoc, SearchScoring, SearchStringResult } from '@hcengineering/server-core'
import serverCore from '@hcengineering/server-core'

import { Client, errors as esErr } from '@elastic/elasticsearch'
import { getMetadata } from '@hcengineering/platform'

const DEFAULT_LIMIT = 200

function getIndexName (): string {
  return getMetadata(serverCore.metadata.ElasticIndexName) ?? 'storage_index'
}

function getIndexVersion (): string {
  return getMetadata(serverCore.metadata.ElasticIndexVersion) ?? 'v2'
}

const mappings = {
  properties: {
    fulltextSummary: {
      type: 'text',
      analyzer: 'rebuilt_english'
    },
    workspaceId: {
      type: 'keyword',
      index: true
    },
    id: {
      type: 'keyword',
      index: true
    },
    _class: {
      type: 'keyword',
      index: true
    },
    attachedTo: {
      type: 'keyword',
      index: true
    },
    attachedToClass: {
      type: 'keyword',
      index: true
    },
    space: {
      type: 'keyword',
      index: true
    },
    'core:class:Doc%createdBy': {
      type: 'keyword',
      index: true
    },
    'core:class:Doc%createdOn': {
      type: 'date',
      format: 'epoch_millis',
      index: true
    },
    modifiedBy: {
      type: 'keyword',
      index: true
    },
    modifiedOn: {
      type: 'date',
      format: 'epoch_millis',
      index: true
    },
    'core:class:Doc%modifiedBy': {
      type: 'keyword',
      index: true
    },
    'core:class:Doc%modifiedOn': {
      type: 'date',
      format: 'epoch_millis',
      index: true
    }
  }
}

class ElasticAdapter implements FullTextAdapter {
  private readonly getFulltextDocId: (workspaceId: WorkspaceUuid, doc: Ref<Doc>) => Ref<Doc>
  private readonly getDocId: (workspaceId: WorkspaceUuid, fulltext: Ref<Doc>) => Ref<Doc>
  private readonly indexName: string

  constructor (
    private readonly client: Client,
    private readonly indexBaseName: string,
    readonly indexVersion: string
  ) {
    this.indexName = `${indexBaseName}_${indexVersion}`
    this.getFulltextDocId = (workspaceId, doc) => `${doc}@${workspaceId}` as Ref<Doc>
    this.getDocId = (workspaceId, fulltext) => fulltext.slice(0, -1 * (workspaceId.length + 1)) as Ref<Doc>
  }

  async initMapping (ctx: MeasureContext): Promise<boolean> {
    const indexName = this.indexName
    try {
      const existingVersions = await ctx.withSync('get-indexes', {}, () =>
        this.client.indices.get({
          index: [`${this.indexBaseName}_*`]
        })
      )
      const allIndexes = Object.keys(existingVersions.body)
      const existingOldVersionIndices = allIndexes.filter((name) => name !== indexName)
      const existsIndex = allIndexes.find((it) => it === indexName) !== undefined
      let shouldDropExistingIndex = false
      if (existsIndex) {
        const mapping = await ctx.with('get-mapping', { indexName }, () =>
          this.client.indices.getMapping({
            index: indexName
          })
        )
        for (const [propName, propType] of Object.entries(mappings.properties)) {
          if (mapping.body[indexName]?.mappings.properties?.[propName]?.type !== propType.type) {
            shouldDropExistingIndex = true
            break
          }
        }
      }
      if (existingOldVersionIndices.length > 0 || shouldDropExistingIndex) {
        await ctx.with('delete-old-index', {}, () =>
          this.client.indices.delete({
            index: shouldDropExistingIndex ? allIndexes : existingOldVersionIndices
          })
        )
      }
      if (!existsIndex || shouldDropExistingIndex) {
        await ctx.with('create-index', { indexName }, () =>
          this.client.indices.create({
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
              },
              mappings
            }
          })
        )
      } else {
        await ctx.with('put-mapping', {}, () =>
          this.client.indices.putMapping({
            index: indexName,
            body: mappings
          })
        )
      }
    } catch (err: any) {
      if (err.name === 'ConnectionError') {
        ctx.warn('Elastic DB is not available')
      }
      Analytics.handleError(err)
      ctx.error(err)
      return false
    }
    return true
  }

  async close (): Promise<void> {
    await this.client.close()
  }

  async searchString (
    ctx: MeasureContext,
    workspaceId: WorkspaceUuid,
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
                    term: {
                      workspaceId
                    }
                  }
                ]
              }
            },
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
          terms: this.getTerms(query.spaces, 'space')
        })
      }
      if (query.classes !== undefined) {
        filter.push({
          terms: this.getTerms(query.classes, '_class')
        })
      }

      if (filter.length > 0) {
        elasticQuery.query.function_score.query.bool.filter = filter
      }

      if (options.scoring !== undefined) {
        const scoringTerms: any[] = options.scoring.map((scoringOption): any => {
          const field = Object.hasOwn(mappings.properties, scoringOption.attr)
            ? scoringOption.attr
            : `${scoringOption.attr}.keyword`
          return {
            term: {
              [field]: {
                value: scoringOption.value,
                boost: scoringOption.boost
              }
            }
          }
        })
        elasticQuery.query.function_score.query.bool.should = scoringTerms
      }

      const result = await this.client.search({
        index: this.indexName,
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
    } catch (err: any) {
      if (err.name === 'ConnectionError') {
        ctx.warn('Elastic DB is not available')
        return { docs: [] }
      }
      Analytics.handleError(err)
      ctx.error('Elastic error', { error: err })
      return { docs: [] }
    }
  }

  async search (
    ctx: MeasureContext,
    workspaceId: WorkspaceUuid,
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
            term: {
              workspaceId
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
        const field = Object.hasOwn(mappings.properties, q) ? q : `${q}.keyword`
        if (typeof v === 'object') {
          if (v.$in !== undefined) {
            request.bool.should.push({
              terms: {
                [field]: v.$in,
                boost: 100.0
              }
            })
          }
        } else {
          request.bool.should.push({
            term: {
              [field]: {
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
      const result = await ctx.with(
        'search',
        {},
        () =>
          this.client.search({
            index: this.indexName,
            body: {
              query: request,
              size: size ?? 200,
              from: from ?? 0
            }
          }),
        {
          _classes,
          size,
          from,
          query: request
        }
      )
      const hits = result.body.hits.hits as any[]
      return hits.map((hit) => ({ ...hit._source, _score: hit._score }))
    } catch (err: any) {
      if (err.name === 'ConnectionError') {
        ctx.warn('Elastic DB is not available')
        return []
      }
      ctx.error('Elastic error', { error: err })
      Analytics.handleError(err)
      return []
    }
  }

  private getTerms (values: string[], field: string, extra: any = {}): any {
    return {
      [Object.hasOwn(mappings.properties, field) ? field : `${field}.keyword`]: values,
      ...extra
    }
  }

  async index (ctx: MeasureContext, workspaceId: WorkspaceUuid, doc: IndexedDoc): Promise<TxResult> {
    const wsDoc = {
      workspaceId,
      ...doc
    }
    const fulltextId = this.getFulltextDocId(workspaceId, doc.id)
    if (doc.data === undefined) {
      await this.client.index({
        index: this.indexName,
        id: fulltextId,
        type: '_doc',
        body: wsDoc
      })
    } else {
      await this.client.index({
        index: this.indexName,
        id: fulltextId,
        type: '_doc',
        pipeline: 'attachment',
        body: wsDoc
      })
    }
    return {}
  }

  async update (
    ctx: MeasureContext,
    workspaceId: WorkspaceUuid,
    id: Ref<Doc>,
    update: Record<string, any>
  ): Promise<TxResult> {
    await this.client.update({
      index: this.indexName,
      id: this.getFulltextDocId(workspaceId, id),
      body: {
        doc: update
      }
    })

    return {}
  }

  async updateMany (ctx: MeasureContext, workspaceId: WorkspaceUuid, docs: IndexedDoc[]): Promise<TxResult[]> {
    const parts = Array.from(docs)
    while (parts.length > 0) {
      const part = parts.splice(0, 500)

      const operations = part.flatMap((doc) => {
        const wsDoc = { workspaceId, ...doc }
        return [
          { index: { _index: this.indexName, _id: this.getFulltextDocId(workspaceId, doc.id) } },
          { ...wsDoc, type: '_doc' }
        ]
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

  async updateByQuery (
    ctx: MeasureContext,
    workspaceId: WorkspaceUuid,
    query: DocumentQuery<Doc>,
    update: Record<string, any>
  ): Promise<TxResult[]> {
    const elasticQuery: any = {
      bool: {
        must: [
          {
            term: {
              workspaceId
            }
          }
        ]
      }
    }

    for (const [q, v] of Object.entries(query)) {
      if (!q.startsWith('$')) {
        if (typeof v === 'object') {
          if (v.$in !== undefined) {
            elasticQuery.bool.must.push({
              terms: {
                [Object.hasOwn(mappings.properties, q) ? q : `${q}.keyword`]: v.$in
              }
            })
          }
        } else {
          elasticQuery.bool.must.push({
            term: {
              [Object.hasOwn(mappings.properties, q) ? q : `${q}.keyword`]: {
                value: v
              }
            }
          })
        }
      }
    }

    await this.client.updateByQuery({
      type: '_doc',
      index: this.indexName,
      body: {
        query: elasticQuery,
        script: {
          source:
            'for(int i = 0; i < params.updateFields.size(); i++) { ctx._source[params.updateFields[i].key] = params.updateFields[i].value }',
          params: {
            updateFields: Object.entries(update).map(([key, value]) => ({ key, value }))
          },
          lang: 'painless'
        }
      }
    })
    return []
  }

  async remove (ctx: MeasureContext, workspaceId: WorkspaceUuid, docs: Ref<Doc>[]): Promise<void> {
    try {
      while (docs.length > 0) {
        const part = docs.splice(0, 5000)
        await this.client.deleteByQuery(
          {
            type: '_doc',
            index: this.indexName,
            body: {
              query: {
                bool: {
                  must: [
                    {
                      terms: {
                        _id: part.map((it) => this.getFulltextDocId(workspaceId, it)),
                        boost: 1.0
                      }
                    },
                    {
                      term: {
                        workspaceId
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

  async removeByQuery (ctx: MeasureContext, workspaceId: WorkspaceUuid, query: DocumentQuery<Doc>): Promise<void> {
    const elasticQuery: any = {
      bool: {
        must: [
          {
            term: {
              workspaceId
            }
          }
        ]
      }
    }

    for (const [q, v] of Object.entries(query)) {
      if (!q.startsWith('$')) {
        if (typeof v === 'object') {
          if (v.$in !== undefined) {
            elasticQuery.bool.must.push({
              terms: {
                [Object.hasOwn(mappings.properties, q) ? q : `${q}.keyword`]: v.$in
              }
            })
          }
        } else {
          elasticQuery.bool.must.push({
            term: {
              [Object.hasOwn(mappings.properties, q) ? q : `${q}.keyword`]: {
                value: v
              }
            }
          })
        }
      }
    }
    try {
      await this.client.deleteByQuery({
        type: '_doc',
        index: this.indexName,
        body: {
          query: elasticQuery
        }
      })
    } catch (e: any) {
      if (e instanceof esErr.ResponseError && e.meta.statusCode === 404) {
        return
      }
      throw e
    }
  }

  async clean (ctx: MeasureContext, workspaceId: WorkspaceUuid): Promise<void> {
    try {
      await this.client.deleteByQuery(
        {
          type: '_doc',
          index: this.indexName,
          body: {
            query: {
              bool: {
                must: [
                  {
                    term: {
                      workspaceId
                    }
                  }
                ]
              }
            }
          }
        },
        undefined
      )
    } catch (e: any) {
      if (e instanceof esErr.ResponseError && e.meta.statusCode === 404) {
        return
      }
      throw e
    }
  }

  async load (ctx: MeasureContext, workspaceId: WorkspaceUuid, docs: Ref<Doc>[]): Promise<IndexedDoc[]> {
    const resp = await this.client.search({
      index: this.indexName,
      type: '_doc',
      body: {
        query: {
          bool: {
            must: [
              {
                terms: {
                  _id: docs.map((it) => this.getFulltextDocId(workspaceId, it)),
                  boost: 1.0
                }
              },
              {
                term: {
                  workspaceId
                }
              }
            ]
          }
        },
        size: docs.length
      }
    })
    return Array.from(
      resp.body.hits.hits.map((hit: any) => ({ ...hit._source, id: this.getDocId(workspaceId, hit._id) }))
    )
  }
}

/**
 * @public
 */
export async function createElasticAdapter (url: string): Promise<FullTextAdapter> {
  const client = new Client({
    node: url
  })
  const indexBaseName = getIndexName()
  const indexVersion = getIndexVersion()

  return new ElasticAdapter(client, indexBaseName, indexVersion)
}
