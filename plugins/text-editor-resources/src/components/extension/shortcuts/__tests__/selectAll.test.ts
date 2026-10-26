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
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { type Node, Schema } from '@tiptap/pm/model'
import { AllSelection, EditorState, type Selection, TextSelection } from '@tiptap/pm/state'

import { getScopedSelectAll } from '../selectAll'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    text: { group: 'inline' },
    paragraph: { group: 'block', content: 'inline*' },
    codeBlock: { group: 'block', content: 'text*', code: true },
    table: { group: 'block', content: 'tableRow+', tableRole: 'table' },
    tableRow: { content: '(tableCell | tableHeader)+', tableRole: 'row' },
    tableCell: { content: 'block+', tableRole: 'cell' },
    tableHeader: { content: 'block+', tableRole: 'header_cell' }
  }
})

const p = (text: string): Node => schema.node('paragraph', null, text !== '' ? [schema.text(text)] : [])
const code = (text: string): Node => schema.node('codeBlock', null, text !== '' ? [schema.text(text)] : [])
const cell = (...content: Node[]): Node => schema.node('tableCell', null, content)
const header = (...content: Node[]): Node => schema.node('tableHeader', null, content)
const table = (...cells: Node[]): Node => schema.node('table', null, [schema.node('tableRow', null, cells)])

function findText (doc: Node, text: string): { from: number, to: number } {
  let result: { from: number, to: number } | undefined
  doc.descendants((node, pos) => {
    if (result === undefined && node.isText && node.text === text) {
      result = { from: pos, to: pos + text.length }
    }
  })
  if (result === undefined) throw new Error(`Text not found: ${text}`)
  return result
}

function stateAt (doc: Node, from: number, to: number = from): EditorState {
  return EditorState.create({ schema, doc, selection: TextSelection.create(doc, from, to) })
}

function apply (state: EditorState, selection: Selection | undefined): EditorState {
  if (selection === undefined) throw new Error('Expected a scoped selection')
  return state.apply(state.tr.setSelection(selection))
}

describe('getScopedSelectAll', () => {
  it('falls back to the whole document in a plain paragraph', () => {
    const doc = schema.node('doc', null, [p('hello'), p('world')])
    expect(getScopedSelectAll(stateAt(doc, 2))).toBeUndefined()
  })

  it('selects the code block content first and the document on the next press', () => {
    const doc = schema.node('doc', null, [p('before'), code('let a = 1\nlet b = 2'), p('after')])
    const range = findText(doc, 'let a = 1\nlet b = 2')

    let state = stateAt(doc, range.from + 3)
    state = apply(state, getScopedSelectAll(state))
    expect(state.selection.from).toBe(range.from)
    expect(state.selection.to).toBe(range.to)

    expect(getScopedSelectAll(state)).toBeUndefined()
  })

  it('selects the table cell content first and the document on the next press', () => {
    const doc = schema.node('doc', null, [p('before'), table(cell(p('a1'), p('a2')), cell(p('b1'))), p('after')])
    const a1 = findText(doc, 'a1')
    const a2 = findText(doc, 'a2')

    let state = stateAt(doc, a2.from + 1)
    state = apply(state, getScopedSelectAll(state))
    expect(state.selection.from).toBe(a1.from)
    expect(state.selection.to).toBe(a2.to)
    expect(state.doc.textBetween(state.selection.from, state.selection.to)).not.toContain('b1')

    expect(getScopedSelectAll(state)).toBeUndefined()
  })

  it('handles header cells', () => {
    const doc = schema.node('doc', null, [table(header(p('title')), header(p('other')))])
    const title = findText(doc, 'title')

    const state = apply(stateAt(doc, title.from), getScopedSelectAll(stateAt(doc, title.from)))
    expect(state.selection.from).toBe(title.from)
    expect(state.selection.to).toBe(title.to)
  })

  it('widens from a code block to its table cell and then to the document', () => {
    const doc = schema.node('doc', null, [table(cell(p('intro'), code('x = 1'))), p('after')])
    const intro = findText(doc, 'intro')
    const snippet = findText(doc, 'x = 1')

    let state = stateAt(doc, snippet.from + 1)
    state = apply(state, getScopedSelectAll(state))
    expect(state.selection.from).toBe(snippet.from)
    expect(state.selection.to).toBe(snippet.to)

    state = apply(state, getScopedSelectAll(state))
    expect(state.selection.from).toBe(intro.from)
    expect(state.selection.to).toBe(snippet.to)

    expect(getScopedSelectAll(state)).toBeUndefined()
  })

  it('selects the document when the selection spans several cells or an empty code block', () => {
    const doc = schema.node('doc', null, [table(cell(p('a')), cell(p('b'))), code('')])
    const a = findText(doc, 'a')
    const b = findText(doc, 'b')
    expect(getScopedSelectAll(stateAt(doc, a.from, b.to))).toBeUndefined()

    const emptyCodeStart = doc.content.size - 1
    expect(getScopedSelectAll(stateAt(doc, emptyCodeStart))).toBeUndefined()
  })

  it('does not narrow an existing all selection', () => {
    const doc = schema.node('doc', null, [table(cell(p('a')))])
    const state = EditorState.create({ schema, doc, selection: new AllSelection(doc) })
    expect(getScopedSelectAll(state)).toBeUndefined()
  })
})
