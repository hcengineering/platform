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

import { type Node, Schema } from '@tiptap/pm/model'
import { EditorState, TextSelection, type Transaction } from '@tiptap/pm/state'
import { CellSelection, TableMap, tableNodes } from '@tiptap/pm/tables'

import { addRows, getSelectedRowCount } from './addRows'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'text*', group: 'block' },
    text: {},
    ...tableNodes({ tableGroup: 'block', cellContent: 'paragraph+', cellAttributes: {} })
  }
})

function createDoc (rows: string[][]): Node {
  const { table, table_row: row, table_cell: cell, paragraph } = schema.nodes
  return schema.node('doc', null, [
    table.create(
      null,
      rows.map((cells) =>
        row.create(
          null,
          cells.map((text) => cell.create(null, paragraph.create(null, schema.text(text))))
        )
      )
    )
  ])
}

const rows = [
  ['a1', 'b1'],
  ['a2', 'b2'],
  ['a3', 'b3'],
  ['a4', 'b4']
]

function cellPos (doc: Node, row: number, col: number): number {
  const table = doc.child(0)
  const map = TableMap.get(table)
  return 1 + map.map[row * map.width + col]
}

function selectRows (doc: Node, from: number, to: number): EditorState {
  const state = EditorState.create({ doc })
  const selection = CellSelection.rowSelection(doc.resolve(cellPos(doc, from, 0)), doc.resolve(cellPos(doc, to, 0)))
  return state.apply(state.tr.setSelection(selection))
}

function tableText (doc: Node): string[] {
  const result: string[] = []
  doc.child(0).forEach((row) => {
    const cells: string[] = []
    row.forEach((cell) => cells.push(cell.textContent))
    result.push(cells.join('|'))
  })
  return result
}

function run (state: EditorState, side: 'before' | 'after'): { state: EditorState, transactions: Transaction[] } {
  const transactions: Transaction[] = []
  const result = addRows(side)(state, (tr) => transactions.push(tr))
  expect(result).toBe(true)
  expect(transactions).toHaveLength(1)
  return { state: state.apply(transactions[0]), transactions }
}

describe('getSelectedRowCount', () => {
  it('returns 0 outside of a table', () => {
    const doc = schema.node('doc', null, [schema.nodes.paragraph.create(null, schema.text('text'))])
    expect(getSelectedRowCount(EditorState.create({ doc }))).toBe(0)
  })

  it('returns 1 for a cursor inside a cell', () => {
    const doc = createDoc(rows)
    const state = EditorState.create({ doc, selection: TextSelection.create(doc, cellPos(doc, 1, 0) + 2) })
    expect(getSelectedRowCount(state)).toBe(1)
  })

  it('returns the number of selected rows', () => {
    const doc = createDoc(rows)
    expect(getSelectedRowCount(selectRows(doc, 1, 1))).toBe(1)
    expect(getSelectedRowCount(selectRows(doc, 1, 2))).toBe(2)
    expect(getSelectedRowCount(selectRows(doc, 3, 0))).toBe(4)
  })
})

describe('addRows', () => {
  it('does nothing outside of a table', () => {
    const doc = schema.node('doc', null, [schema.nodes.paragraph.create(null, schema.text('text'))])
    expect(addRows('before')(EditorState.create({ doc }))).toBe(false)
  })

  it('inserts one row for a cursor inside a cell', () => {
    const doc = createDoc(rows)
    const state = EditorState.create({ doc, selection: TextSelection.create(doc, cellPos(doc, 1, 0) + 2) })
    expect(tableText(run(state, 'after').state.doc)).toEqual(['a1|b1', 'a2|b2', '|', 'a3|b3', 'a4|b4'])
  })

  it('inserts as many rows as selected before the selection in one transaction', () => {
    const { state } = run(selectRows(createDoc(rows), 1, 2), 'before')
    expect(tableText(state.doc)).toEqual(['a1|b1', '|', '|', 'a2|b2', 'a3|b3', 'a4|b4'])
    // the selection stays on the originally selected rows
    expect(getSelectedRowCount(state)).toBe(2)
    const selection = state.selection
    expect(selection).toBeInstanceOf(CellSelection)
    if (!(selection instanceof CellSelection)) return
    expect(selection.$anchorCell.parent.textContent).toBe('a2b2')
    expect(selection.$headCell.parent.textContent).toBe('a3b3')
  })

  it('inserts as many rows as selected after the selection', () => {
    const { state } = run(selectRows(createDoc(rows), 2, 3), 'after')
    expect(tableText(state.doc)).toEqual(['a1|b1', 'a2|b2', 'a3|b3', 'a4|b4', '|', '|'])
  })

  it('extends cells spanning over the insertion point', () => {
    const { table, table_row: row, table_cell: cell, paragraph } = schema.nodes
    const p = (text: string): Node => paragraph.create(null, schema.text(text))
    const doc = schema.node('doc', null, [
      table.create(null, [
        row.create(null, [cell.create({ rowspan: 2 }, p('a1')), cell.create(null, p('b1'))]),
        row.create(null, [cell.create(null, p('b2'))]),
        row.create(null, [cell.create(null, p('a3')), cell.create(null, p('b3'))])
      ])
    ])
    const state = EditorState.create({ doc })
    const selection = CellSelection.create(doc, cellPos(doc, 0, 1), cellPos(doc, 0, 1))
    const { state: next } = run(state.apply(state.tr.setSelection(selection)), 'after')
    const map = TableMap.get(next.doc.child(0))
    expect(map.height).toBe(4)
    expect(next.doc.child(0).child(0).child(0).attrs.rowspan).toBe(3)
  })
})
