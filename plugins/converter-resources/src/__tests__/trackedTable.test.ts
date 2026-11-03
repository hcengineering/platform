//
// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import type { Client, Doc, Ref, Class, Space } from '@hcengineering/core'
import type { FilteredView, TableMetadata, Viewlet } from '@hcengineering/view'
import { loadFullRows, resolveTableSnapshot } from '../trackedTable'
import { filtersToQuery } from '@hcengineering/view-resources'
import { loadViewletConfig } from '../model/viewletLoader'

jest.mock('@hcengineering/view', () => ({
  __esModule: true,
  ...jest.requireActual('../../../view/src/table'),
  default: {
    class: { FilteredView: 'view:class:FilteredView', Viewlet: 'view:class:Viewlet' },
    viewlet: { Table: 'view:viewlet:Table', RelationshipTable: 'view:viewlet:RelationshipTable' }
  }
}))
jest.mock('@hcengineering/platform', () => ({
  ...jest.requireActual('@hcengineering/platform'),
  getMetadata: jest.fn()
}))
jest.mock('@hcengineering/presentation', () => ({
  __esModule: true,
  default: { metadata: { WorkspaceUuid: 'workspace' } }
}))
jest.mock('@hcengineering/theme', () => ({ getCurrentLanguage: () => 'en' }))
jest.mock('@hcengineering/view-resources', () => ({
  filtersToQuery: jest.fn(async (_filters, base) => ({ ...base, state: 'new' })),
  getResultQuery: async (_hierarchy: unknown, query: unknown) => query,
  getResultOptions: async (options: unknown) => options
}))
jest.mock('../model/viewletLoader', () => ({ loadViewletConfig: jest.fn() }))
jest.mock('../data/metadataBuilder', () => ({
  isRelationshipTable: () => false,
  buildTableMetadata: async (props: Record<string, unknown>, docs: Doc[]) => ({
    ...props,
    documentIds: docs.map((doc) => doc._id),
    version: '1.0',
    timestamp: 1
  })
}))
jest.mock('../markdown/tableBuilder', () => ({
  buildTableData: async (docs: Doc[], props: { config: string[] }) => ({
    headers: props.config,
    config: props.config,
    columnIds: props.config,
    rows: docs.map((doc) => [doc._id]),
    docs
  }),
  renderMarkdownTable: async (data: { headers: string[], docs: Doc[] }) =>
    '| ' +
    data.headers.join(' | ') +
    ' |\n| ' +
    data.headers.map(() => '---').join(' | ') +
    ' |\n' +
    data.docs.map((doc) => '| ' + data.headers.map(() => doc._id).join(' | ') + ' |\n').join('')
}))

const cardClass = 'test:class:Doc' as Ref<Class<Doc>>
const viewletId = 'viewlet' as Ref<Viewlet>
const space = 's' as Ref<Space>

function metadata (mode: 'fixed' | 'savedView' | 'frozen'): TableMetadata {
  return {
    version: '2.0',
    cardClass,
    viewletId,
    config: ['name'],
    documentIds: ['b', 'a'],
    query: { space, state: 'old' },
    timestamp: 1,
    source: {
      kind: 'table',
      mode,
      options: { sort: { name: 1 } },
      ...(mode === 'savedView' ? { filteredViewId: 'saved' as Ref<FilteredView>, baseQuery: { space } } : {})
    }
  }
}

function fixture (ids: string[], total = ids.length): { client: Client, findAll: jest.Mock, findOne: jest.Mock } {
  const findAll = jest.fn(async () =>
    Object.assign(
      ids.map((_id) => ({ _id, _class: cardClass })),
      { total }
    )
  )
  const findOne = jest.fn(async (_class: string) =>
    _class === 'view:class:FilteredView'
      ? { _id: 'saved', filters: '[]', filterClass: cardClass, viewletId }
      : { _id: viewletId, descriptor: 'view:viewlet:Table' }
  )
  const client = { findAll, findOne, getHierarchy: () => ({ findClass: () => ({ _id: cardClass }) }) }
  return { client: client as unknown as Client, findAll, findOne }
}

describe('table source resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(loadViewletConfig as jest.Mock).mockResolvedValue({ config: ['name', 'state'] })
  })

  it('fixed: refreshes the copied documents in copied order with copied columns', async () => {
    const { client, findAll } = fixture(['a', 'b'])
    const result = await resolveTableSnapshot(metadata('fixed'), client)
    expect(findAll.mock.calls[0][1]).toEqual({ _id: { $in: ['b', 'a'] } })
    expect(result.snapshot.rowIds).toEqual(['b', 'a'])
    expect(result.metadata.config).toEqual(['name'])
    expect(loadViewletConfig).not.toHaveBeenCalled()
  })

  it('frozen: repeats the captured query, columns and sorting', async () => {
    const { client, findAll } = fixture(['a', 'c'])
    const result = await resolveTableSnapshot(metadata('frozen'), client)
    expect(findAll.mock.calls[0][1]).toEqual({ space, state: 'old' })
    expect(findAll.mock.calls[0][2].sort).toEqual({ name: 1 })
    expect(result.snapshot.rowIds).toEqual(['a', 'c'])
    expect(result.metadata.config).toEqual(['name'])
  })

  it('savedView: re-reads the saved filters from the base query and the current columns', async () => {
    const { client, findAll } = fixture(['c'])
    const result = await resolveTableSnapshot(metadata('savedView'), client)
    expect(filtersToQuery).toHaveBeenCalledWith([], { space }, true)
    expect(findAll.mock.calls[0][1]).toEqual({ space, state: 'new' })
    expect(result.metadata.config).toEqual(['name', 'state'])
    expect(result.metadata.query).toEqual({ space, state: 'new' })
    expect(result.metadata.source?.filters).toBe('[]')
  })

  it('frozen: repeats archived visibility, lookups and associations but not view-only options', async () => {
    const { client, findAll } = fixture(['a'])
    const source = metadata('frozen')
    source.source = {
      ...source.source!,
      options: {
        sort: { name: 1 },
        showArchived: true,
        lookup: { space: 'core:class:Space' } as any,
        limit: 50,
        projection: { name: 1 }
      } as any
    }
    await resolveTableSnapshot(source, client)
    const options = findAll.mock.calls[0][2]
    expect(options).toMatchObject({
      showArchived: true,
      lookup: { space: 'core:class:Space' },
      sort: { name: 1 },
      limit: 5000
    })
    expect(options.projection).toBeUndefined()
  })

  it('fixed: finds explicitly chosen documents even after they are archived', async () => {
    const { client, findAll } = fixture(['a'])
    await resolveTableSnapshot(metadata('fixed'), client)
    expect(findAll.mock.calls[0][2].showArchived).toBe(true)
  })

  it('frozen: keeps the filters captured at copy time for display', async () => {
    const { client } = fixture(['a'])
    const source = metadata('frozen')
    source.source = { ...source.source!, filters: '[{"index":1}]' }
    expect((await resolveTableSnapshot(source, client)).metadata.source?.filters).toBe('[{"index":1}]')
  })

  it('returns a header-only snapshot when no rows match', async () => {
    const { client } = fixture([])
    const result = await resolveTableSnapshot(metadata('frozen'), client)
    expect(result.snapshot.rowIds).toEqual([])
    expect(result.snapshot.cells).toEqual([[[['name']]]])
  })

  it('refuses sources above the row limit instead of truncating them', async () => {
    const { client, findAll } = fixture(['a'], 9000)
    await expect(resolveTableSnapshot(metadata('frozen'), client)).rejects.toMatchObject({
      code: 'tooLarge',
      params: { count: 9000, limit: 5000 }
    })
    expect(findAll.mock.calls[0][2].limit).toBe(5000)
  })

  it('reports deleted saved views and invalid filters separately', async () => {
    const { client, findOne } = fixture(['a'])
    findOne.mockResolvedValueOnce(undefined)
    await expect(resolveTableSnapshot(metadata('savedView'), client)).rejects.toMatchObject({ code: 'savedView' })
    findOne.mockResolvedValueOnce({ _id: 'saved', filters: 'not json', filterClass: cardClass })
    await expect(resolveTableSnapshot(metadata('savedView'), client)).rejects.toMatchObject({ code: 'filters' })
  })

  it('falls back to the copied viewlet when the saved view points to a viewlet that no longer exists', async () => {
    const { client, findOne, findAll } = fixture(['c'])
    findOne.mockImplementation(async (_class: string, query: { _id: string }) => {
      if (_class === 'view:class:FilteredView') {
        return { _id: 'saved', filters: '[]', filterClass: cardClass, viewletId: 'gone' }
      }
      return query._id === viewletId ? { _id: viewletId, descriptor: 'view:viewlet:Table' } : undefined
    })
    const result = await resolveTableSnapshot(metadata('savedView'), client)
    expect(findAll.mock.calls[0][1]).toEqual({ space, state: 'new' })
    expect(result.metadata.viewletId).toBe(viewletId)
    expect(result.metadata.config).toEqual(['name', 'state'])
  })

  it('reports an unavailable viewlet only when no viewlet or columns are left to build the table', async () => {
    const { client, findOne } = fixture(['c'])
    findOne.mockImplementation(async (_class: string) =>
      _class === 'view:class:FilteredView'
        ? { _id: 'saved', filters: '[]', filterClass: cardClass, viewletId: 'gone' }
        : undefined
    )
    const source: TableMetadata = { ...metadata('savedView'), config: undefined }
    await expect(resolveTableSnapshot(source, client)).rejects.toMatchObject({ code: 'viewlet' })
  })

  it('rejects tables from another workspace and missing classes', async () => {
    const { client } = fixture(['a'])
    await expect(resolveTableSnapshot({ ...metadata('fixed'), workspace: 'other' }, client)).resolves.toBeDefined()
    const { getMetadata } = jest.requireMock('@hcengineering/platform')
    getMetadata.mockReturnValueOnce('current')
    await expect(resolveTableSnapshot({ ...metadata('fixed'), workspace: 'other' }, client)).rejects.toMatchObject({
      code: 'workspace'
    })
    const missing = { ...client, getHierarchy: () => ({ findClass: (): undefined => undefined }) } as unknown as Client
    await expect(resolveTableSnapshot(metadata('fixed'), missing)).rejects.toMatchObject({ code: 'unavailable' })
  })

  it('keeps legacy tables on their fixed set without upgrading them', async () => {
    const legacy = { ...metadata('fixed'), version: '1.0' }
    delete legacy.source
    const { client, findAll } = fixture(['a'])
    const result = await resolveTableSnapshot(legacy, client)
    expect(findAll.mock.calls[0][1]).toEqual({ _id: { $in: ['b', 'a'] } })
    expect(result.metadata.version).toBe('1.0')
    expect(result.metadata.source).toBeUndefined()
  })

  it('never keeps a value snapshot in the metadata and drops stale transit row ids', async () => {
    const { client } = fixture(['a'])
    const result = await resolveTableSnapshot({ ...metadata('fixed'), rowIds: ['old'] }, client)
    expect(result.metadata).not.toHaveProperty('snapshot')
    expect(result.metadata.rowIds).toBeUndefined()
    expect(result.snapshot.rowIds).toEqual(['a'])
  })
})

describe('rows chosen in a view', () => {
  it('are read in full, in the chosen order, without deleted ones', async () => {
    const { client, findAll } = fixture(['c', 'a'])
    // A list hands over projected documents: only _id, _class and the grouping fields.
    const partial = ['a', 'gone', 'c'].map((_id) => ({ _id, _class: cardClass }) as unknown as Doc)
    const rows = await loadFullRows(client, cardClass, partial)
    expect(rows.map((doc) => doc._id)).toEqual(['a', 'c'])
    expect(findAll).toHaveBeenCalledWith(
      cardClass,
      { _id: { $in: ['a', 'gone', 'c'] } },
      { showArchived: true, limit: 3 }
    )
    expect(await loadFullRows(client, cardClass, [])).toEqual([])
  })
})
