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

import {
  MAX_TABLE_ROWS,
  tableRowLimitError,
  parseTableMetadata,
  tableCellHash,
  tableMetadataProblem,
  tableCellHref,
  tableCellRich,
  tableCellText,
  tableCellValue,
  tableColumnIds,
  tableSnapshotFromMarkup,
  tableSnapshotToMarkup
} from './table'

const p = (...content: any[]): any => ({ type: 'paragraph', content })
const t = (text: string, ...marks: any[]): any => ({ type: 'text', text, ...(marks.length > 0 ? { marks } : {}) })
const cell = (...content: any[]): any => ({ type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content })

const metadata = {
  version: '2.0',
  cardClass: 'doc',
  documentIds: ['a'],
  timestamp: 1,
  source: { kind: 'table', mode: 'frozen' }
}

describe('table metadata contract', () => {
  it('validates the clipboard payload and rejects malformed current metadata', () => {
    expect(parseTableMetadata(metadata)).toEqual(metadata)
    const withFilters = { ...metadata, source: { ...metadata.source, filters: '[]' } }
    expect(parseTableMetadata(withFilters)).toEqual(withFilters)
    expect(parseTableMetadata({ ...metadata, rowIds: ['x', 'y'] })).toEqual({ ...metadata, rowIds: ['x', 'y'] })
    for (const invalid of [
      null,
      {},
      { ...metadata, version: '3.0' },
      { ...metadata, source: null },
      { ...metadata, source: { kind: 'table', mode: 'dynamic' } },
      { ...metadata, source: { kind: 'table', mode: 'savedView' } },
      { ...metadata, source: { kind: 'table', mode: 'frozen', filters: [] } },
      { ...metadata, query: null },
      { ...metadata, rowIds: ['a', 'a'] }
    ]) {
      expect(parseTableMetadata(invalid)).toBeUndefined()
    }
  })

  it('drops the value snapshot that early copies carried', () => {
    expect(parseTableMetadata({ ...metadata, snapshot: { cells: [] } })).toEqual(metadata)
  })

  it('keeps legacy metadata usable even when parts of it are malformed', () => {
    const legacy = { version: '1.0', cardClass: 'doc', documentIds: ['a'], timestamp: 1 }
    expect(parseTableMetadata(legacy)).toEqual(legacy)
    expect(parseTableMetadata({ ...legacy, query: null, config: 'bad', viewletId: 5 })).toEqual(legacy)
    expect(parseTableMetadata({ version: '1.0', cardClass: 'doc' })).toEqual({
      version: '1.0',
      cardClass: 'doc',
      documentIds: [],
      timestamp: 0
    })
  })

  it('tells newer versions from damaged metadata', () => {
    expect(tableMetadataProblem({ version: '3.0' })).toBe('unsupported')
    expect(tableMetadataProblem({ version: '2.0' })).toBe('damaged')
    expect(tableMetadataProblem('not json')).toBe('damaged')
  })

  it('fingerprints cell values compactly and deterministically', () => {
    expect(tableCellHash([['Alpha']])).toBe(tableCellHash([['Alpha']]))
    expect(tableCellHash([['Alpha']])).not.toBe(tableCellHash([['Alpha', 'bold']]))
    expect(tableCellHash([['Alpha']]).length).toBeLessThanOrEqual(7)
  })

  it('keeps column identity stable through renaming, restyling and property changes', () => {
    expect(tableColumnIds([{ key: 'name', label: 'A' as any, props: { a: 1 } }])).toEqual(
      tableColumnIds([{ key: 'name', label: 'B' as any, props: { b: 2 } }])
    )
    expect(tableColumnIds(['name'])).toEqual(tableColumnIds([{ key: 'name' }]))
    expect(new Set(tableColumnIds(['name', 'name'])).size).toBe(2)
    const objects = tableColumnIds([
      { key: '', presenter: 'a' as any },
      { key: '', presenter: 'b' as any }
    ])
    expect(
      tableColumnIds([
        { key: '', presenter: 'b' as any },
        { key: '', presenter: 'a' as any }
      ])
    ).toEqual([...objects].reverse())
  })
})

describe('canonical cell values', () => {
  it('keeps text, links and meaningful formatting but ignores colors and spacing', () => {
    const link = { type: 'link', attrs: { href: 'https://example.com', target: '_blank' } }
    const value = tableCellValue(
      cell(
        p(
          t('  A ', link),
          t('| B', link, { type: 'textColor', attrs: { color: 'red' } }),
          t(' bold ', { type: 'bold' })
        )
      )
    )
    expect(value).toEqual([
      ['A | B', 'link:https://example.com'],
      [' bold', 'bold']
    ])
    expect(tableCellText(value)).toBe('A | B bold')
    expect(tableCellRich(value)).toBe(true)
    expect(tableCellHref(tableCellValue(cell(p(t('A', link)))))).toBe('https://example.com')
    expect(tableCellHref(value)).toBeUndefined()
  })

  it('treats paragraphs and hard breaks as the same line break', () => {
    expect(tableCellValue(cell(p(t('a')), p(t('b'))))).toEqual(
      tableCellValue(cell(p(t('a'), { type: 'hardBreak' }, t('b'))))
    )
  })

  it('expands merged cells and round-trips through display markup', () => {
    const table = {
      type: 'table',
      content: [
        { type: 'tableRow', content: [cell(p(t('H1'))), cell(p(t('H2')))] },
        { type: 'tableRow', content: [{ ...cell(p(t('x'))), attrs: { colspan: 1, rowspan: 2 } }, cell(p(t('1')))] },
        { type: 'tableRow', content: [cell(p(t('2')))] }
      ]
    }
    const snapshot = tableSnapshotFromMarkup(table, ['r1', 'r2'], ['c1', 'c2'])
    expect(snapshot.cells.map((row) => row.map(tableCellText))).toEqual([
      ['H1', 'H2'],
      ['x', '1'],
      ['x', '2']
    ])
    const again = tableSnapshotFromMarkup(tableSnapshotToMarkup(snapshot), snapshot.rowIds, snapshot.columnIds)
    expect(again).toEqual(snapshot)
  })
})

describe('row limit', () => {
  it('refuses only tables above the limit, with the count and the limit', () => {
    expect(tableRowLimitError(MAX_TABLE_ROWS)).toBeUndefined()
    expect(tableRowLimitError(MAX_TABLE_ROWS + 1)).toMatchObject({
      code: 'tooLarge',
      params: { count: MAX_TABLE_ROWS + 1, limit: MAX_TABLE_ROWS }
    })
  })
})
