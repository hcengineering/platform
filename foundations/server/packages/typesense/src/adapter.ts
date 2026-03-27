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
  type Class,
  type Doc,
  type DocumentQuery,
  type MeasureContext,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type TxResult,
  type WorkspaceUuid
} from '@hcengineering/core'
import type { FullTextAdapter, IndexedDoc, SearchScoring, SearchStringResult } from '@hcengineering/server-core'
import serverCore from '@hcengineering/server-core'

import { Client as TypesenseClient } from 'typesense'
import type { CollectionFieldSchema } from 'typesense/lib/Typesense/Collection'

import { getMetadata } from '@hcengineering/platform'

const DEFAULT_LIMIT = 200
const BATCH_SIZE = 500

function getIndexName (): string {
  return getMetadata(serverCore.metadata.ElasticIndexName) ?? 'storage_index'
}

function getIndexVersion (): string {
  return getMetadata(serverCore.metadata.ElasticIndexVersion) ?? 'v2'
}

/** Fields that are defined in the schema and are facet-capable (keyword-like). */
const FACET_FIELDS = new Set([
  'id',
  'workspaceId',
  '_class',
  'space',
  'attachedTo',
  'attachedToClass',
  'modifiedBy',
  'core:class:Doc%createdBy',
  'core:class:Doc%modifiedBy'
])

function buildCollectionSchema (collectionName: string): {
  name: string
  fields: CollectionFieldSchema[]
  enable_nested_fields: boolean
} {
  const fields: CollectionFieldSchema[] = [
    { name: 'id', type: 'string', facet: true },
    { name: 'workspaceId', type: 'string', facet: true },
    { name: '_class', type: 'string[]', facet: true },
    { name: 'space', type: 'string', facet: true },
    { name: 'attachedTo', type: 'string', facet: true, optional: true },
    { name: 'attachedToClass', type: 'string', facet: true, optional: true },
    { name: 'searchTitle', type: 'string', optional: true },
    { name: 'searchShortTitle', type: 'string', optional: true },
    { name: 'fulltextSummary', type: 'string', optional: true },
    { name: 'modifiedBy', type: 'string', facet: true, optional: true },
    { name: 'modifiedOn', type: 'int64', optional: true },
    { name: 'core:class:Doc%createdBy', type: 'string', facet: true, optional: true },
    { name: 'core:class:Doc%createdOn', type: 'int64', optional: true },
    { name: 'core:class:Doc%modifiedBy', type: 'string', facet: true, optional: true },
    { name: 'core:class:Doc%modifiedOn', type: 'int64', optional: true },
    // Catch-all for dynamic fields
    { name: '.*', type: 'auto' }
  ]

  return {
    name: collectionName,
    fields,
    enable_nested_fields: true
  }
}

function isTypesenseError (err: any): boolean {
  return err?.httpStatus !== undefined || err?.name === 'TypesenseError'
}

function isConnectionError (err: any): boolean {
  if (err?.name === 'ConnectionError') return true
  if (err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND') return true
  if (err?.message?.includes?.('ECONNREFUSED') === true) return true
  return false
}

/** Escape a value for use inside a Typesense filter_by backtick-quoted string. */
function escapeFilterValue (val: string): string {
  return val.replace(/`/g, '\\`')
}

/**
 * Build a Typesense filter_by string from a workspace ID and a Huly DocumentQuery.
 * Skips `$`-prefixed keys (like `$search`).
 */
function buildQueryFilter (workspaceId: WorkspaceUuid, query?: DocumentQuery<Doc>): string {
  const parts: string[] = [`workspaceId:=${workspaceId as string}`]

  if (query !== undefined) {
    for (const [q, v] of Object.entries(query)) {
      if (q.startsWith('$')) continue
      if (typeof v === 'object' && v !== null) {
        if (v.$in !== undefined && Array.isArray(v.$in)) {
          parts.push(`${q}:=[${v.$in.map((val: string) => `\`${escapeFilterValue(val)}\``).join(',')}]`)
        }
      } else {
        parts.push(`${q}:=\`${escapeFilterValue(String(v))}\``)
      }
    }
  }

  return parts.join(' && ')
}

class TypesenseAdapter implements FullTextAdapter {
  private readonly getFulltextDocId: (workspaceId: WorkspaceUuid, doc: Ref<Doc>) => string
  private readonly getDocId: (workspaceId: WorkspaceUuid, fulltext: string) => Ref<Doc>
  private readonly collectionName: string

  constructor (
    private readonly client: TypesenseClient,
    private readonly indexBaseName: string,
    readonly indexVersion: string
  ) {
    this.collectionName = `${indexBaseName}_${indexVersion}`
    this.getFulltextDocId = (workspaceId, doc) => `${doc as string}@${workspaceId as string}`
    this.getDocId = (workspaceId, fulltext) => fulltext.slice(0, -1 * ((workspaceId as string).length + 1)) as Ref<Doc>
  }

  async initMapping (ctx: MeasureContext, _field?: { key: string, dims: number }): Promise<boolean> {
    const collectionName = this.collectionName
    try {
      const collections = await this.client.collections().retrieve()
      const matchingCollections = collections.filter((c: any) => c.name.startsWith(`${this.indexBaseName}_`))
      const existingCollection = matchingCollections.find((c: any) => c.name === collectionName)
      const oldCollections = matchingCollections.filter((c: any) => c.name !== collectionName)

      for (const old of oldCollections) {
        await ctx.with('delete-old-collection', {}, async () => {
          await this.client.collections(old.name).delete()
        })
      }

      let shouldRecreate = false
      if (existingCollection !== undefined) {
        const existingFields = new Set((existingCollection as any).fields?.map((f: any) => f.name) ?? [])
        const schema = buildCollectionSchema(collectionName)
        for (const field of schema.fields) {
          if (field.name !== '.*' && !existingFields.has(field.name)) {
            shouldRecreate = true
            break
          }
        }
      }

      if (shouldRecreate && existingCollection !== undefined) {
        await ctx.with('delete-collection', {}, async () => {
          await this.client.collections(collectionName).delete()
        })
      }

      if (existingCollection === undefined || shouldRecreate) {
        const schema = buildCollectionSchema(collectionName)
        await ctx.with('create-collection', { collectionName }, async () => {
          await this.client.collections().create(schema as any)
        })
      }
    } catch (err: any) {
      if (isConnectionError(err)) {
        ctx.warn('Typesense DB is not available')
      }
      Analytics.handleError(err)
      ctx.error(err)
      return false
    }
    return true
  }

  async close (): Promise<void> {
    // Typesense client does not require explicit close
  }

  async searchString (
    ctx: MeasureContext,
    workspaceId: WorkspaceUuid,
    query: SearchQuery,
    options: SearchOptions & { scoring?: SearchScoring[] }
  ): Promise<SearchStringResult> {
    try {
      const filterParts: string[] = [`workspaceId:=${workspaceId as string}`]

      if (query.spaces !== undefined && query.spaces.length > 0) {
        filterParts.push(`space:=[${query.spaces.map((s) => `\`${escapeFilterValue(s)}\``).join(',')}]`)
      }
      if (query.classes !== undefined && query.classes.length > 0) {
        filterParts.push(`_class:=[${query.classes.map((c) => `\`${escapeFilterValue(c)}\``).join(',')}]`)
      }

      // Require searchTitle to exist (non-empty)
      filterParts.push('searchTitle:!=""')

      // Scoring: boost documents where a facet field matches a specific value.
      // Typesense doesn't support per-term boosting like ES function_score,
      // so we use optional filter clauses that prefer matching documents.
      if (options.scoring !== undefined && options.scoring.length > 0) {
        const optionalParts: string[] = []
        for (const scoring of options.scoring) {
          if (FACET_FIELDS.has(scoring.attr)) {
            optionalParts.push(`${scoring.attr}:=\`${escapeFilterValue(String(scoring.value))}\``)
          }
        }
        if (optionalParts.length > 0) {
          // Use optional filter_by syntax: main filters && (optional1 || optional2)
          // Documents matching optional filters rank higher via _text_match + filter proximity
          filterParts.push(`(${optionalParts.join(' || ')})`)
        }
      }

      const filterBy = filterParts.join(' && ')

      const searchParams: any = {
        q: query.query,
        query_by: 'searchTitle,searchShortTitle,fulltextSummary',
        query_by_weights: '50,50,1',
        filter_by: filterBy,
        limit: options.limit ?? DEFAULT_LIMIT,
        prefix: 'true,true,false',
        sort_by: '_text_match:desc'
      }

      const result = await this.client.collections(this.collectionName).documents().search(searchParams)

      const resp: SearchStringResult = { docs: [] }
      if (result.found !== undefined) {
        resp.total = result.found
      }
      if (result.hits !== undefined) {
        resp.docs = result.hits.map((hit: any) => {
          const doc = hit.document
          return {
            ...doc,
            id: this.getDocId(workspaceId, doc.id),
            _score: hit.text_match ?? 0
          }
        })
      }

      return resp
    } catch (err: any) {
      if (isConnectionError(err)) {
        ctx.warn('Typesense DB is not available')
        return { docs: [] }
      }
      Analytics.handleError(err)
      ctx.error('Typesense error', { error: err })
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
    try {
      const filterParts: string[] = [`workspaceId:=${workspaceId as string}`]

      if (_classes.length > 0) {
        filterParts.push(`_class:=[${_classes.map((c) => `\`${escapeFilterValue(c as string)}\``).join(',')}]`)
      }

      // In Elastic, additional query fields are soft boosts (should clauses).
      // Typesense has no direct equivalent, so we add them as optional filter
      // clauses — documents matching them rank higher but aren't excluded.
      const optionalParts: string[] = []
      for (const [q, v] of Object.entries(query)) {
        if (q.startsWith('$')) continue
        if (typeof v === 'object' && v !== null) {
          if (v.$in !== undefined && Array.isArray(v.$in)) {
            optionalParts.push(`${q}:=[${v.$in.map((val: string) => `\`${escapeFilterValue(val)}\``).join(',')}]`)
          }
        } else {
          optionalParts.push(`${q}:=\`${escapeFilterValue(String(v))}\``)
        }
      }
      if (optionalParts.length > 0) {
        filterParts.push(`(${optionalParts.join(' || ')})`)
      }

      const filterBy = filterParts.join(' && ')

      const searchParams: any = {
        q: query.$search,
        query_by: 'searchTitle,searchShortTitle,fulltextSummary',
        query_by_weights: '50,50,1',
        filter_by: filterBy,
        limit: size ?? DEFAULT_LIMIT,
        offset: from ?? 0,
        sort_by: '_text_match:desc',
        prefix: 'true,true,false'
      }

      const result = await ctx.with(
        'search',
        {},
        async () => await this.client.collections(this.collectionName).documents().search(searchParams),
        { _classes, size, from, query: searchParams }
      )

      if (result.hits === undefined) return []
      return result.hits.map((hit: any) => {
        const doc = hit.document
        return {
          ...doc,
          id: this.getDocId(workspaceId, doc.id),
          _score: hit.text_match ?? 0
        }
      })
    } catch (err: any) {
      if (isConnectionError(err)) {
        ctx.warn('Typesense DB is not available')
        return []
      }
      ctx.error('Typesense error', { error: err })
      Analytics.handleError(err)
      return []
    }
  }

  async index (ctx: MeasureContext, workspaceId: WorkspaceUuid, doc: IndexedDoc): Promise<TxResult> {
    if (doc.data !== undefined) {
      ctx.warn('Binary attachment content (doc.data) is not supported in Typesense; relying on Rekoni for extraction', {
        docId: doc.id
      })
    }

    const fulltextId = this.getFulltextDocId(workspaceId, doc.id)
    const tsDoc: Record<string, any> = {
      ...doc,
      id: fulltextId,
      workspaceId
    }
    // Remove binary data — Typesense cannot process it
    delete tsDoc.data

    try {
      await this.client.collections(this.collectionName).documents().upsert(tsDoc)
    } catch (err: any) {
      if (isConnectionError(err)) {
        ctx.warn('Typesense DB is not available')
      } else {
        Analytics.handleError(err)
        ctx.error('Typesense index error', { error: err, docId: doc.id })
      }
    }
    return {}
  }

  async update (
    ctx: MeasureContext,
    workspaceId: WorkspaceUuid,
    id: Ref<Doc>,
    update: Record<string, any>
  ): Promise<TxResult> {
    const fulltextId = this.getFulltextDocId(workspaceId, id)
    try {
      await this.client.collections(this.collectionName).documents(fulltextId).update(update)
    } catch (err: any) {
      if (isTypesenseError(err) && err.httpStatus === 404) {
        return {}
      }
      if (isConnectionError(err)) {
        ctx.warn('Typesense DB is not available')
      } else {
        Analytics.handleError(err)
        ctx.error('Typesense update error', { error: err, docId: id })
      }
    }
    return {}
  }

  async updateMany (ctx: MeasureContext, workspaceId: WorkspaceUuid, docs: IndexedDoc[]): Promise<TxResult[]> {
    const parts = Array.from(docs)
    while (parts.length > 0) {
      const batch = parts.splice(0, BATCH_SIZE)
      const jsonlLines = batch
        .map((doc) => {
          const tsDoc: Record<string, any> = {
            ...doc,
            id: this.getFulltextDocId(workspaceId, doc.id),
            workspaceId
          }
          delete tsDoc.data
          return JSON.stringify(tsDoc)
        })
        .join('\n')

      try {
        const results = await this.client
          .collections(this.collectionName)
          .documents()
          .import(jsonlLines, { action: 'upsert' })

        const errors = (
          typeof results === 'string' ? results.split('\n').map((l: string) => JSON.parse(l)) : results
        ).filter((r: any) => r.success === false)

        if (errors.length > 0) {
          const errorMessages = errors.map((e: any) => e.error).join('\n')
          const errorDocs = errors.map((e: any) => e.document)
          console.error(`Failed to process bulk request: ${errorMessages} ${JSON.stringify(errorDocs)}`)
        }
      } catch (err: any) {
        if (isConnectionError(err)) {
          ctx.warn('Typesense DB is not available')
        } else {
          Analytics.handleError(err)
          ctx.error('Typesense updateMany error', { error: err })
        }
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
    try {
      const filterBy = buildQueryFilter(workspaceId, query)

      // Paginate through all matching documents
      let page = 1
      const perPage = 250
      const allDocs: any[] = []

      for (;;) {
        const result = await this.client.collections(this.collectionName).documents().search({
          q: '*',
          filter_by: filterBy,
          per_page: perPage,
          page
        })
        const hits = result.hits ?? []
        if (hits.length === 0) break
        allDocs.push(...hits.map((h: any) => h.document))
        if (allDocs.length >= (result.found ?? 0)) break
        page++
      }

      if (allDocs.length === 0) return []

      // Apply update and batch upsert
      const updatedDocs = allDocs.map((doc: any) => ({ ...doc, ...update }))
      const remaining = Array.from(updatedDocs)
      while (remaining.length > 0) {
        const batch = remaining.splice(0, BATCH_SIZE)
        const jsonlLines = batch.map((doc: any) => JSON.stringify(doc)).join('\n')
        await this.client.collections(this.collectionName).documents().import(jsonlLines, { action: 'upsert' })
      }
    } catch (err: any) {
      if (isConnectionError(err)) {
        ctx.warn('Typesense DB is not available')
      } else {
        Analytics.handleError(err)
        ctx.error('Typesense updateByQuery error', { error: err })
      }
    }
    return []
  }

  async remove (ctx: MeasureContext, workspaceId: WorkspaceUuid, docs: Ref<Doc>[]): Promise<void> {
    try {
      const remaining = Array.from(docs)
      while (remaining.length > 0) {
        const batch = remaining.splice(0, 5000)
        const ids = batch.map((it) => this.getFulltextDocId(workspaceId, it))
        const filterBy = `id:=[${ids.map((id) => `\`${escapeFilterValue(id)}\``).join(',')}] && workspaceId:=${workspaceId as string}`
        await this.client.collections(this.collectionName).documents().delete({ filter_by: filterBy })
      }
    } catch (err: any) {
      if (isTypesenseError(err) && err.httpStatus === 404) {
        return
      }
      throw err
    }
  }

  async removeByQuery (ctx: MeasureContext, workspaceId: WorkspaceUuid, query: DocumentQuery<Doc>): Promise<void> {
    const filterBy = buildQueryFilter(workspaceId, query)
    try {
      await this.client.collections(this.collectionName).documents().delete({ filter_by: filterBy })
    } catch (err: any) {
      if (isTypesenseError(err) && err.httpStatus === 404) {
        return
      }
      throw err
    }
  }

  async clean (ctx: MeasureContext, workspaceId: WorkspaceUuid): Promise<void> {
    try {
      const filterBy = `workspaceId:=${workspaceId as string}`
      await this.client.collections(this.collectionName).documents().delete({ filter_by: filterBy })
    } catch (err: any) {
      if (isTypesenseError(err) && err.httpStatus === 404) {
        return
      }
      throw err
    }
  }

  async load (ctx: MeasureContext, workspaceId: WorkspaceUuid, docs: Ref<Doc>[]): Promise<IndexedDoc[]> {
    try {
      const ids = docs.map((it) => this.getFulltextDocId(workspaceId, it))
      const filterBy = `id:=[${ids.map((id) => `\`${escapeFilterValue(id)}\``).join(',')}] && workspaceId:=${workspaceId as string}`

      const result = await this.client.collections(this.collectionName).documents().search({
        q: '*',
        filter_by: filterBy,
        per_page: docs.length
      })

      if (result.hits === undefined) return []
      return result.hits.map((hit: any) => {
        const doc = hit.document
        return {
          ...doc,
          id: this.getDocId(workspaceId, doc.id)
        }
      })
    } catch (err: any) {
      if (isConnectionError(err)) {
        ctx.warn('Typesense DB is not available')
        return []
      }
      Analytics.handleError(err)
      ctx.error('Typesense load error', { error: err })
      return []
    }
  }
}

/**
 * @public
 *
 * Creates a Typesense fulltext adapter from a URL like:
 *   http://typesense:8108?apiKey=xyz
 */
export async function createTypesenseAdapter (url: string): Promise<FullTextAdapter> {
  const parsed = new URL(url)
  const apiKey = parsed.searchParams.get('apiKey') ?? parsed.searchParams.get('apikey') ?? ''
  const protocol = parsed.protocol.replace(':', '')
  const host = parsed.hostname
  const port = parsed.port !== '' ? parseInt(parsed.port, 10) : protocol === 'https' ? 443 : 8108

  const client = new TypesenseClient({
    nodes: [
      {
        host,
        port,
        protocol
      }
    ],
    apiKey,
    connectionTimeoutSeconds: 10,
    retryIntervalSeconds: 0.1,
    numRetries: 3
  })

  const indexBaseName = getIndexName()
  const indexVersion = getIndexVersion()

  return new TypesenseAdapter(client, indexBaseName, indexVersion)
}
