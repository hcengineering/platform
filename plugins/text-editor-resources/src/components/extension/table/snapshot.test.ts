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

import { type AttributeSpec, Node, Schema } from '@tiptap/pm/model'
import { EditorState, TextSelection } from '@tiptap/pm/state'
import { addColumnBefore, addRowBefore, TableMap } from '@tiptap/pm/tables'
import { ySyncPluginKey } from 'y-prosemirror'
import { MarkupNodeType } from '@hcengineering/text'
import { markdownToMarkup } from '@hcengineering/text-markdown'
import { tableColumnIds, tableSnapshotFromMarkup, type TableMetadata, type TableSnapshot } from '@hcengineering/view'
import { attachTableSnapshot, editorTableSnapshot, editorTableState, summarizeTableEdits } from './snapshot'
import { tableIdentities } from './identities'
import { buildTableDiff } from './actions/tableDiff'

jest.mock('@hcengineering/view', () => ({
  __esModule: true,
  ...jest.requireActual('../../../../../view/src/table')
}))
jest.mock('@hcengineering/presentation', () => ({ getClient: jest.fn() }))

const cellAttrs: Record<string, AttributeSpec> = {
  sourceColumnId: { default: null },
  sourceHash: { default: null },
  colspan: { default: 1 },
  rowspan: { default: 1 },
  colwidth: { default: null }
}
const schema = new Schema({
  nodes: {
    doc: { content: 'table+' },
    text: {},
    paragraph: { content: 'text*' },
    table: { content: 'tableRow+', tableRole: 'table', attrs: { tableMetadata: { default: null } } },
    tableRow: { content: '(tableHeader|tableCell)+', tableRole: 'row', attrs: { sourceRowId: { default: null } } },
    tableHeader: { content: 'paragraph+', tableRole: 'header_cell', attrs: cellAttrs },
    tableCell: { content: 'paragraph+', tableRole: 'cell', attrs: cellAttrs }
  },
  marks: { link: { attrs: { href: {}, target: { default: null }, rel: { default: null } } }, bold: {} }
})

function snapshot (markdown: string, rowIds = ['a'], columnIds = COLUMNS): TableSnapshot {
  const table = markdownToMarkup(markdown).content?.find((node) => node.type === MarkupNodeType.table)
  if (table === undefined) throw new Error('no table')
  return tableSnapshotFromMarkup(table, rowIds, columnIds)
}

const COLUMNS = tableColumnIds(['name', 'state'])
const STATE = COLUMNS[1]
const markdown = '| Name | State |\n| --- | --- |\n| Alpha | Open |\n'
const metadata: TableMetadata = {
  version: '2.0',
  cardClass: 'test:class:Doc',
  documentIds: ['a'],
  config: ['name', 'state'],
  timestamp: 1,
  source: { kind: 'table', mode: 'frozen' }
}
function table (source = markdown, meta: TableMetadata = metadata): Node {
  return attachTableSnapshot(Node.fromJSON(schema, markdownToMarkup(source)).firstChild as Node, meta)
}
/** The pasted table with one cell's text replaced, keeping every attribute: a manual edit. */
function edited (node: Node, row: number, column: number, text: string): Node {
  const rows: Node[] = []
  node.forEach((current, _offset, rowIndex) => {
    const cells: Node[] = []
    current.forEach((cell, _cellOffset, cellIndex) => {
      cells.push(
        rowIndex === row && cellIndex === column
          ? cell.type.create(cell.attrs, schema.node('paragraph', null, schema.text(text)))
          : cell
      )
    })
    rows.push(current.type.create(current.attrs, cells))
  })
  return node.type.create(node.attrs, rows)
}
function stateWith (...tables: Node[]): EditorState {
  return EditorState.create({ schema, doc: schema.node('doc', null, tables), plugins: [tableIdentities()] })
}

describe('table snapshots', () => {
  it('stores identities and fingerprints on the nodes, not a copy of the values', () => {
    const node = table()
    const stored = JSON.parse(node.attrs.tableMetadata)
    expect(stored).not.toHaveProperty('snapshot')
    expect(editorTableSnapshot(node)).toEqual(snapshot(markdown))
    expect(
      editorTableState(node)
        .hashes.flat()
        .every((hash) => typeof hash === 'string')
    ).toBe(true)
  })

  it('reads the pasted table back without reporting local edits', () => {
    const state = editorTableState(table())
    expect(summarizeTableEdits(state, snapshot(markdown))).toEqual({ localChanges: false, conflicts: false })
  })

  it('compares links, escaped pipes and formatting by content, not by Markdown', () => {
    const rich = '| Name | State |\n| --- | --- |\n| [A \\| B](https://example.com/item) | **Open** |\n'
    const current = editorTableState(table(rich))
    expect(summarizeTableEdits(current, snapshot(rich)).localChanges).toBe(false)
    const diff = buildTableDiff(current.snapshot, snapshot(rich))
    expect(diff?.rows).toHaveLength(1)
    expect(
      diff?.rows[0].cells.every(
        (cell) => cell.oldValue === cell.newValue && cell.oldHref === cell.newHref && cell.oldMarkup === undefined
      )
    ).toBe(true)
  })

  it('tells manual edits, source changes and conflicts apart on the same stable cell', () => {
    const local = editorTableState(edited(table(), 1, 1, 'Local'))
    const remote = snapshot(markdown.replace('Open', 'Remote'))
    expect(summarizeTableEdits(local, remote)).toEqual({
      localChanges: true,
      conflicts: true,
      conflictCells: [{ rowId: 'a', columnId: STATE }]
    })
    // Same change on both sides, or a source that did not change: no conflict.
    expect(summarizeTableEdits(local, snapshot(markdown.replace('Open', 'Local'))).conflicts).toBe(false)
    expect(summarizeTableEdits(local, snapshot(markdown))).toEqual({ localChanges: true, conflicts: false })
    // Source change alone is not a manual edit.
    expect(summarizeTableEdits(editorTableState(table()), remote)).toEqual({ localChanges: false, conflicts: false })
  })

  it('treats a header renamed on both sides as a conflict', () => {
    const local = editorTableState(edited(table(), 0, 1, 'Mine'))
    const fresh = snapshot(markdown.replace('State', 'Status'))
    expect(summarizeTableEdits(local, fresh).conflictCells).toEqual([{ rowId: '', columnId: STATE }])
  })

  it('counts rows removed by hand as manual changes', () => {
    const header = table('| Name | State |\n| --- | --- |\n', { ...metadata, documentIds: [] })
    const state = editorTableState(header)
    expect(summarizeTableEdits(state, snapshot(markdown), { rowIds: ['a'], columnIds: COLUMNS }).localChanges).toBe(
      true
    )
    expect(summarizeTableEdits(state, snapshot('| Name | State |\n| --- | --- |\n', [])).localChanges).toBe(false)
  })

  it('takes a merged header column id from a plain cell below it', () => {
    const merged = table()
    const header = merged.child(0)
    const wide = header.child(0).type.create({ ...header.child(0).attrs, colspan: 2 }, header.child(0).content)
    const node = merged.type.create(merged.attrs, [header.type.create(header.attrs, [wide]), merged.child(1)])
    let state = stateWith(node)
    state = state.applyTransaction(state.tr.insertText('x', 4)).state
    expect(editorTableSnapshot(state.doc.firstChild as Node).columnIds).toEqual(COLUMNS)
  })

  it('keeps transit row ids out of the stored metadata', () => {
    const node = table(markdown, { ...metadata, source: { kind: 'relationship', mode: 'fixed' }, rowIds: ['path-1'] })
    expect(JSON.parse(node.attrs.tableMetadata)).not.toHaveProperty('rowIds')
    expect(editorTableSnapshot(node).rowIds).toEqual(['path-1'])
  })
})

describe('table identities', () => {
  it('does not give an inserted row its neighbour source identity', () => {
    let state = stateWith(table())
    const firstDataCell = 2 + (state.doc.firstChild?.firstChild?.nodeSize ?? 0) + 1
    state = state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(firstDataCell))))
    addRowBefore(state, (tr) => {
      state = state.applyTransaction(tr).state
    })
    const ids = editorTableSnapshot(state.doc.firstChild as Node).rowIds
    expect(ids).toHaveLength(2)
    expect(ids[1]).toBe('a')
    expect(ids[0]).toMatch(/^local:/)
  })

  it('keeps the original column identity when inserting before it', () => {
    let state = stateWith(table())
    state = state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(3))))
    addColumnBefore(state, (tr) => {
      state = state.applyTransaction(tr).state
    })
    const ids = editorTableSnapshot(state.doc.firstChild as Node).columnIds
    expect(ids.slice(1)).toEqual(COLUMNS)
    expect(ids[0]).toMatch(/^local:/)
  })

  it('leaves remote collaborative changes to their author', () => {
    let state = stateWith(table())
    const duplicate = state.doc.firstChild?.child(1) as Node
    const tr = state.tr.insert(1 + (state.doc.firstChild?.content.size ?? 0), duplicate)
    tr.setMeta(ySyncPluginKey, { isChangeOrigin: true })
    state = state.applyTransaction(tr).state
    expect(editorTableSnapshot(state.doc.firstChild as Node).rowIds).toEqual(['a', 'a'])
  })

  it('only normalizes the table that was edited', () => {
    let state = stateWith(table(), table())
    // A duplicate identity arrives in the first table through sync; the local edit is in the second table.
    const duplicateRow = (state.doc.firstChild as Node).child(1)
    const firstTableEnd = 1 + (state.doc.firstChild?.content.size ?? 0)
    state = state.apply(state.tr.insert(firstTableEnd, duplicateRow).setMeta(ySyncPluginKey, {}))
    const secondTableStart = state.doc.firstChild?.nodeSize ?? 0
    state = state.applyTransaction(state.tr.insertText('x', secondTableStart + 5)).state
    expect(editorTableSnapshot(state.doc.firstChild as Node).rowIds).toEqual(['a', 'a'])
  })

  it('stays linear in the number of cells for large tables', () => {
    const rows = Array.from({ length: 2000 }, (_, i) => `| Row ${i} | Open |`).join('\n')
    const big = `| Name | State |\n| --- | --- |\n${rows}\n`
    const ids = Array.from({ length: 2000 }, (_, i) => `doc-${i}`)
    const findCell = jest.spyOn(TableMap.prototype, 'findCell')
    try {
      let state = stateWith(table(big, { ...metadata, documentIds: ids }))
      state = state.applyTransaction(state.tr.insertText('x', 4)).state
      expect(editorTableSnapshot(state.doc.firstChild as Node).rowIds).toEqual(ids)
      // findCell scans the whole map; calling it per cell made every keystroke quadratic.
      expect(findCell).not.toHaveBeenCalled()
    } finally {
      findCell.mockRestore()
    }
  })
})
