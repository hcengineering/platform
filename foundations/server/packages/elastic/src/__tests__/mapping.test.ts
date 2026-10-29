//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { Client } from '@elastic/elasticsearch'
import { Analytics } from '@hcengineering/analytics'
import type { Class, Doc, MeasureContext, PersonId, Ref, Space, WorkspaceUuid } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import type { IndexedDoc } from '@hcengineering/server-core'
import { createElasticAdapter } from '../adapter'

jest.mock('@elastic/elasticsearch', () => ({ Client: jest.fn(), errors: {} }), { virtual: true })
jest.mock('@hcengineering/analytics', () => ({ Analytics: { handleError: jest.fn() } }), { virtual: true })
jest.mock('@hcengineering/core', () => ({}), { virtual: true })
jest.mock('@hcengineering/platform', () => ({ getMetadata: jest.fn() }), { virtual: true })
jest.mock(
  '@hcengineering/server-core',
  () => ({ metadata: { ElasticIndexName: 'index-name', ElasticIndexVersion: 'index-version' } }),
  { virtual: true }
)

interface TestSetup {
  client: {
    indices: Record<'get' | 'getMapping' | 'create' | 'analyze' | 'delete' | 'putMapping', jest.Mock>
    index: jest.Mock
    bulk: jest.Mock
    search: jest.Mock
  }
  context: Record<'with' | 'withSync' | 'error' | 'warn', jest.Mock>
  ctx: MeasureContext
}

function setup (indexes: Record<string, any> = {}): TestSetup {
  const client = {
    indices: {
      get: jest.fn().mockResolvedValue({ body: indexes }),
      getMapping: jest.fn(),
      create: jest.fn().mockResolvedValue({ body: { acknowledged: true } }),
      analyze: jest.fn().mockResolvedValue({ body: { tokens: [] } }),
      delete: jest.fn().mockResolvedValue({ body: { acknowledged: true } }),
      putMapping: jest.fn().mockResolvedValue({ body: { acknowledged: true } })
    },
    index: jest.fn().mockResolvedValue({}),
    bulk: jest.fn().mockResolvedValue({ body: { errors: false } }),
    search: jest.fn().mockResolvedValue({ body: { hits: { hits: [] } } })
  }
  const context = {
    with: jest.fn(async (_name: string, _params: any, op: () => Promise<any>) => await op()),
    withSync: jest.fn((_name: string, _params: any, op: () => any) => op()),
    error: jest.fn(),
    warn: jest.fn()
  }
  ;(Client as unknown as jest.Mock).mockImplementation(() => client)
  return { client, context, ctx: context as unknown as MeasureContext }
}

function rejectedAnalyzer (analyzer: string): Error {
  const reason = `analyzer [${analyzer}] has not been configured in mappings`
  return Object.assign(new Error(reason), {
    meta: { statusCode: 400, body: { error: { type: 'mapper_parsing_exception', reason } } }
  })
}

const workspace = 'ws1' as WorkspaceUuid
const doc: IndexedDoc = {
  id: 'doc1' as Ref<Doc>,
  _class: ['class1' as Ref<Class<Doc>>],
  space: 'space1' as Ref<Space>,
  modifiedOn: 0,
  modifiedBy: 'andrey' as PersonId,
  fulltextSummary: 'continued indexing'
}

describe('fulltext index initialization', () => {
  const originalAnalyzer = process.env.ELASTIC_ANALYZER

  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.ELASTIC_ANALYZER
    ;(getMetadata as jest.Mock).mockReturnValue(undefined)
  })

  afterEach(() => {
    if (originalAnalyzer === undefined) {
      delete process.env.ELASTIC_ANALYZER
    } else {
      process.env.ELASTIC_ANALYZER = originalAnalyzer
    }
  })

  it('keeps the default name and defines the English analyzer when used', async () => {
    const { client, ctx } = setup()
    const adapter = await createElasticAdapter('http://localhost:9200')
    expect(await adapter.initMapping(ctx)).toBe(true)
    expect(client.indices.create).toHaveBeenCalledWith({
      index: 'storage_index_v2',
      body: {
        settings: expect.objectContaining({
          analysis: expect.objectContaining({ analyzer: { rebuilt_english: expect.any(Object) } })
        }),
        mappings: expect.objectContaining({
          properties: expect.objectContaining({ fulltextSummary: { type: 'text', analyzer: 'rebuilt_english' } })
        })
      }
    })
    expect(client.indices.delete).not.toHaveBeenCalled()
  })

  it.each(['russian', 'german'])(
    'creates the %s index before cleaning up previous versions and analyzers',
    async (analyzer) => {
      process.env.ELASTIC_ANALYZER = analyzer
      ;(getMetadata as jest.Mock).mockImplementation((key: string) => (key === 'index-name' ? 'custom_index' : 'v3'))
      const { client, context, ctx } = setup({
        custom_index_v2: {},
        custom_index_v3: {},
        custom_index_v3_french: {}
      })
      const adapter = await createElasticAdapter('http://localhost:9200')
      expect(await adapter.initMapping(ctx)).toBe(true)
      expect(client.indices.create).toHaveBeenCalledWith({
        index: `custom_index_v3_${analyzer}`,
        body: {
          settings: undefined,
          mappings: expect.objectContaining({
            properties: expect.objectContaining({ fulltextSummary: { type: 'text', analyzer } })
          })
        }
      })
      expect(client.indices.create.mock.invocationCallOrder[0]).toBeLessThan(
        client.indices.delete.mock.invocationCallOrder[0]
      )
      expect(client.indices.delete).toHaveBeenCalledWith({
        index: ['custom_index_v2', 'custom_index_v3', 'custom_index_v3_french']
      })
      expect(context.warn).toHaveBeenCalledWith(expect.stringContaining('fulltext-reindex-all'), {
        indexName: `custom_index_v3_${analyzer}`
      })
    }
  )

  it.each(['unknown_analyzer', 'icu_analyzer'])(
    'keeps the old index and continues reads and writes when %s is unavailable',
    async (analyzer) => {
      process.env.ELASTIC_ANALYZER = analyzer
      const { client, context, ctx } = setup({ storage_index_v1: {}, storage_index_v2: {} })
      client.indices.create.mockRejectedValue(rejectedAnalyzer(analyzer))
      const adapter = await createElasticAdapter('http://localhost:9200')
      // Returning true lets WorkspaceManager's startup loop finish and its consumers start.
      expect(await adapter.initMapping(ctx)).toBe(true)
      expect(await adapter.initMapping(ctx)).toBe(true)
      await adapter.index(ctx, workspace, doc)
      await adapter.updateMany(ctx, workspace, [doc])
      await adapter.searchString(ctx, workspace, { query: 'continued' }, {})
      expect(client.index).toHaveBeenCalledWith(expect.objectContaining({ index: 'storage_index_v2' }))
      expect(client.bulk.mock.calls[0][0].body[0].index._index).toBe('storage_index_v2')
      expect(client.search).toHaveBeenCalledWith(expect.objectContaining({ index: 'storage_index_v2' }))
      expect(client.indices.delete).not.toHaveBeenCalled()
      expect(client.indices.putMapping).not.toHaveBeenCalled()
      expect(client.indices.create).toHaveBeenCalledTimes(1)
      expect(context.error).toHaveBeenCalledTimes(1)
      expect(context.error).toHaveBeenCalledWith(expect.stringContaining('keeping existing index'), {
        analyzer,
        indexName: 'storage_index_v2',
        error: expect.any(Error)
      })
    }
  )

  it('retains the newest existing analyzer index when there is no default index', async () => {
    process.env.ELASTIC_ANALYZER = 'unknown_analyzer'
    const { client, ctx } = setup({
      storage_index_v2_french: { settings: { index: { creation_date: '20' } } },
      storage_index_v2_german: { settings: { index: { creation_date: '10' } } }
    })
    client.indices.create.mockRejectedValue(rejectedAnalyzer('unknown_analyzer'))
    const adapter = await createElasticAdapter('http://localhost:9200')
    expect(await adapter.initMapping(ctx)).toBe(true)
    await adapter.index(ctx, workspace, doc)
    expect(client.index).toHaveBeenCalledWith(expect.objectContaining({ index: 'storage_index_v2_french' }))
    expect(client.indices.delete).not.toHaveBeenCalled()
  })

  it.each(['rebuilt_english', 'russian'])(
    'uses the new %s index when another pod wins concurrent creation without repeating cleanup',
    async (analyzer) => {
      process.env.ELASTIC_ANALYZER = analyzer
      ;(getMetadata as jest.Mock).mockImplementation((key: string) => (key === 'index-version' ? 'v3' : undefined))
      const indexName = `storage_index_v3${analyzer === 'rebuilt_english' ? '' : `_${analyzer}`}`
      const { client, context, ctx } = setup({ storage_index_v2: {} })
      client.indices.create.mockResolvedValueOnce({ body: { acknowledged: true } }).mockRejectedValueOnce(
        Object.assign(new Error('index already exists'), {
          meta: { statusCode: 400, body: { error: { type: 'resource_already_exists_exception' } } }
        })
      )
      const first = await createElasticAdapter('http://localhost:9200')
      const second = await createElasticAdapter('http://localhost:9200')
      // Both pods discover the old index before either finishes creating the new one.
      expect(await Promise.all([first.initMapping(ctx), second.initMapping(ctx)])).toEqual([true, true])
      expect(client.indices.create).toHaveBeenCalledTimes(2)
      expect(client.indices.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ index: indexName }))
      expect(client.indices.delete).toHaveBeenCalledTimes(1)
      expect(client.indices.delete).toHaveBeenCalledWith({ index: ['storage_index_v2'] })
      expect(context.error).not.toHaveBeenCalled()
      await second.index(ctx, workspace, doc)
      await second.updateMany(ctx, workspace, [doc])
      await second.searchString(ctx, workspace, { query: 'continued' }, {})
      expect(client.index).toHaveBeenCalledWith(expect.objectContaining({ index: indexName }))
      expect(client.bulk.mock.calls[0][0].body[0].index._index).toBe(indexName)
      expect(client.search).toHaveBeenCalledWith(expect.objectContaining({ index: indexName }))
    }
  )

  it.each(['mapper_parsing_exception', 'illegal_argument_exception'])(
    'retains the existing index when the analyzer rejection is reported as a %s root cause',
    async (type) => {
      process.env.ELASTIC_ANALYZER = 'icu_analyzer'
      const { client, context, ctx } = setup({ storage_index_v2: {} })
      client.indices.create.mockRejectedValue(
        Object.assign(new Error('failed to create index'), {
          meta: {
            statusCode: 400,
            body: {
              error: {
                type: 'index_creation_exception',
                root_cause: [{ type, reason: 'analyzer [icu_analyzer] has not been configured in mappings' }]
              }
            }
          }
        })
      )
      const adapter = await createElasticAdapter('http://localhost:9200')
      expect(await adapter.initMapping(ctx)).toBe(true)
      expect(await adapter.initMapping(ctx)).toBe(true)
      expect(client.indices.create).toHaveBeenCalledTimes(1)
      expect(client.indices.delete).not.toHaveBeenCalled()
      expect(context.error).toHaveBeenCalledTimes(1)
      await adapter.index(ctx, workspace, doc)
      expect(client.index).toHaveBeenCalledWith(expect.objectContaining({ index: 'storage_index_v2' }))
    }
  )

  it.each(['security_exception', 'illegal_argument_exception', undefined])(
    'retries an unrelated HTTP 400 (%s) without pinning to an old index',
    async (type) => {
      process.env.ELASTIC_ANALYZER = 'russian'
      const { client, context, ctx } = setup({ storage_index_v2: {} })
      const error = Object.assign(new Error('invalid request'), {
        meta: { statusCode: 400, body: { error: { type, reason: 'invalid request' } } }
      })
      client.indices.create.mockRejectedValue(error)
      const adapter = await createElasticAdapter('http://localhost:9200')
      expect(await adapter.initMapping(ctx)).toBe(false)
      expect(await adapter.initMapping(ctx)).toBe(false)
      expect(client.indices.create).toHaveBeenCalledTimes(2)
      expect(client.indices.delete).not.toHaveBeenCalled()
      expect(context.error).toHaveBeenCalledTimes(2)
      expect(context.error).toHaveBeenLastCalledWith(error)
    }
  )

  it('retries and logs each analyzer rejection when there is no existing index', async () => {
    process.env.ELASTIC_ANALYZER = 'icu_analyzer'
    const { client, context, ctx } = setup()
    const error = rejectedAnalyzer('icu_analyzer')
    client.indices.create.mockRejectedValueOnce(error).mockRejectedValueOnce(error)
    const adapter = await createElasticAdapter('http://localhost:9200')
    expect(await adapter.initMapping(ctx)).toBe(false)
    expect(await adapter.initMapping(ctx)).toBe(false)
    expect(client.indices.create).toHaveBeenCalledTimes(2)
    expect(client.indices.delete).not.toHaveBeenCalled()
    expect(context.error).toHaveBeenCalledTimes(2)
    expect(context.error).toHaveBeenLastCalledWith(error)
    // A later retry can start indexing once the cluster accepts the analyzer.
    expect(await adapter.initMapping(ctx)).toBe(true)
    await adapter.index(ctx, workspace, doc)
    expect(client.index).toHaveBeenCalledWith(expect.objectContaining({ index: 'storage_index_v2_icu_analyzer' }))
  })

  it('leaves old indexes untouched on a transient creation failure and allows a retry', async () => {
    process.env.ELASTIC_ANALYZER = 'russian'
    const { client, ctx } = setup({ storage_index_v2: {} })
    const handleError = jest.spyOn(Analytics, 'handleError')
    client.indices.create.mockRejectedValueOnce(Object.assign(new Error('unavailable'), { meta: { statusCode: 503 } }))
    const adapter = await createElasticAdapter('http://localhost:9200')
    expect(await adapter.initMapping(ctx)).toBe(false)
    expect(client.indices.delete).not.toHaveBeenCalled()
    expect(handleError).toHaveBeenCalledTimes(1)
    expect(await adapter.initMapping(ctx)).toBe(true)
    expect(client.indices.delete).toHaveBeenCalledWith({ index: ['storage_index_v2'] })
  })

  it('reuses a compatible index and cleans up only older indexes', async () => {
    process.env.ELASTIC_ANALYZER = 'russian'
    const { client, ctx } = setup()
    const first = await createElasticAdapter('http://localhost:9200')
    await first.initMapping(ctx)
    const mappings = client.indices.create.mock.calls[0][0].body.mappings
    client.indices.get.mockResolvedValue({ body: { storage_index_v2: {}, storage_index_v2_russian: {} } })
    client.indices.getMapping.mockResolvedValue({ body: { storage_index_v2_russian: { mappings } } })
    client.indices.create.mockClear()
    const second = await createElasticAdapter('http://localhost:9200')
    expect(await second.initMapping(ctx)).toBe(true)
    expect(client.indices.create).not.toHaveBeenCalled()
    expect(client.indices.putMapping).toHaveBeenCalledWith({ index: 'storage_index_v2_russian', body: mappings })
    expect(client.indices.delete).toHaveBeenCalledWith({ index: ['storage_index_v2'] })
  })

  it('waits for successful creation before deleting any old index', async () => {
    process.env.ELASTIC_ANALYZER = 'russian'
    const { client, ctx } = setup({ storage_index_v2: {} })
    let finishCreation!: () => void
    let notifyCreation!: () => void
    const creationStarted = new Promise<void>((resolve) => {
      notifyCreation = resolve
    })
    const creationFinished = new Promise<void>((resolve) => {
      finishCreation = resolve
    })
    client.indices.create.mockImplementation(async () => {
      notifyCreation()
      await creationFinished
      return { body: { acknowledged: true } }
    })
    const adapter = await createElasticAdapter('http://localhost:9200')
    const initializing = adapter.initMapping(ctx)
    await creationStarted
    expect(client.indices.delete).not.toHaveBeenCalled()
    finishCreation()
    expect(await initializing).toBe(true)
    expect(client.indices.delete).toHaveBeenCalledWith({ index: ['storage_index_v2'] })
  })

  it('cleans up the previous analyzer when switching back to the default', async () => {
    const { client, ctx } = setup({ storage_index_v2_russian: {} })
    const adapter = await createElasticAdapter('http://localhost:9200')
    expect(await adapter.initMapping(ctx)).toBe(true)
    expect(client.indices.create).toHaveBeenCalledWith(expect.objectContaining({ index: 'storage_index_v2' }))
    expect(client.indices.delete).toHaveBeenCalledWith({ index: ['storage_index_v2_russian'] })
    expect(client.indices.create.mock.invocationCallOrder[0]).toBeLessThan(
      client.indices.delete.mock.invocationCallOrder[0]
    )
  })

  it('validates a same-name mapping migration before deleting the current index', async () => {
    const { client, context, ctx } = setup({ storage_index_v2: {} })
    client.indices.getMapping.mockResolvedValue({ body: { storage_index_v2: { mappings: { properties: {} } } } })
    const adapter = await createElasticAdapter('http://localhost:9200')
    expect(await adapter.initMapping(ctx)).toBe(true)
    expect(client.indices.analyze).toHaveBeenCalledWith({
      index: 'storage_index_v2',
      body: { analyzer: 'rebuilt_english', text: 'test' }
    })
    expect(client.indices.analyze.mock.invocationCallOrder[0]).toBeLessThan(
      client.indices.delete.mock.invocationCallOrder[0]
    )
    expect(client.indices.delete).toHaveBeenCalledWith({ index: 'storage_index_v2' })
    expect(client.indices.create).toHaveBeenCalledWith(expect.objectContaining({ index: 'storage_index_v2' }))
    expect(context.warn).toHaveBeenCalledWith(expect.stringContaining('fulltext-reindex-all'), {
      indexName: 'storage_index_v2'
    })
  })

  it('keeps a same-name index when analyzer validation fails during mapping migration', async () => {
    process.env.ELASTIC_ANALYZER = 'icu_analyzer'
    const { client, context, ctx } = setup({ storage_index_v2: {}, storage_index_v2_icu_analyzer: {} })
    client.indices.getMapping.mockResolvedValue({
      body: { storage_index_v2_icu_analyzer: { mappings: { properties: {} } } }
    })
    client.indices.analyze.mockRejectedValue(rejectedAnalyzer('icu_analyzer'))
    const adapter = await createElasticAdapter('http://localhost:9200')
    expect(await adapter.initMapping(ctx)).toBe(true)
    expect(await adapter.initMapping(ctx)).toBe(true)
    expect(client.indices.analyze).toHaveBeenCalledWith({
      index: 'storage_index_v2_icu_analyzer',
      body: { analyzer: 'icu_analyzer', text: 'test' }
    })
    expect(client.indices.delete).not.toHaveBeenCalled()
    expect(client.indices.create).not.toHaveBeenCalled()
    expect(context.error).toHaveBeenCalledTimes(1)
    await adapter.index(ctx, workspace, doc)
    expect(client.index).toHaveBeenCalledWith(expect.objectContaining({ index: 'storage_index_v2_icu_analyzer' }))
  })
})
