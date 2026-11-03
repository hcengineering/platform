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
import { EditorState } from '@tiptap/pm/state'
import type { Transaction } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/core'
import { history, undo } from '@tiptap/pm/history'
import { MarkupNodeType } from '@hcengineering/text'
import { markdownToMarkup } from '@hcengineering/text-markdown'
import {
  tableColumnIds,
  tableSnapshotFromMarkup,
  type ResolvedTableSnapshot,
  type TableMetadata
} from '@hcengineering/view'
import { applyTableRefresh, trackTable } from './refreshTable'
import { attachTableSnapshot } from '../snapshot'
import { showTableMessage } from './errors'

jest.mock('./TableRefreshConfirmation.svelte', () => ({}))
jest.mock('./errors', () => ({ showTableError: jest.fn(), showTableMessage: jest.fn() }))
jest.mock('@hcengineering/presentation', () => ({ getClient: jest.fn() }))
jest.mock('@hcengineering/view', () => ({
  __esModule: true,
  ...jest.requireActual('../../../../../../view/src/table'),
  default: { string: { TableChangedDuringPreview: 'view:string:TableChangedDuringPreview' } }
}))
jest.mock('@hcengineering/ui', () => ({ showPopup: jest.fn() }))

const cellAttrs: Record<string, AttributeSpec> = {
  sourceColumnId: { default: null },
  sourceHash: { default: null },
  colspan: { default: 1 },
  rowspan: { default: 1 },
  colwidth: { default: null }
}
const schema = new Schema({
  nodes: {
    doc: { content: '(paragraph|table)+' },
    text: {},
    paragraph: { content: 'text*' },
    table: { content: 'tableRow+', tableRole: 'table', attrs: { tableMetadata: { default: null } } },
    tableRow: { content: '(tableCell|tableHeader)+', tableRole: 'row', attrs: { sourceRowId: { default: null } } },
    tableCell: { content: 'paragraph+', tableRole: 'cell', attrs: cellAttrs },
    tableHeader: { content: 'paragraph+', tableRole: 'header_cell', attrs: cellAttrs }
  }
})

function resolved (markdown: string): ResolvedTableSnapshot {
  const table = markdownToMarkup(markdown).content?.find((node) => node.type === MarkupNodeType.table)
  if (table === undefined) throw new Error('no table')
  const snapshot = tableSnapshotFromMarkup(table, ['a'], tableColumnIds(['name']))
  const metadata: TableMetadata = {
    version: '2.0',
    cardClass: 'test:class:Doc',
    documentIds: ['a'],
    config: ['name'],
    timestamp: 1,
    source: { kind: 'table', mode: 'fixed' }
  }
  return { markdown, snapshot, metadata }
}
const old = resolved('| Name |\n| --- |\n| Old |\n')
const fresh = resolved('| Name |\n| --- |\n| New |\n')

function fixture (...extra: Node[]): { original: Node, editor: Editor, dispatch: (tr: Transaction) => void } {
  const original = attachTableSnapshot(
    Node.fromJSON(schema, markdownToMarkup(old.markdown)).firstChild as Node,
    old.metadata
  )
  let state = EditorState.create({ schema, doc: schema.node('doc', null, [original, ...extra]), plugins: [history()] })
  const listeners = new Set<(props: { transaction: Transaction }) => void>()
  const dispatch = (tr: Transaction): void => {
    state = state.applyTransaction(tr).state
    listeners.forEach((listener) => {
      listener({ transaction: tr })
    })
  }
  const editor = {
    isDestroyed: false,
    get state () {
      return state
    },
    view: { dispatch },
    on: (_event: string, listener: (props: { transaction: Transaction }) => void) => listeners.add(listener),
    off: (_event: string, listener: (props: { transaction: Transaction }) => void) => listeners.delete(listener)
  } as unknown as Editor
  return { original, editor, dispatch }
}

const paragraph = (text: string): Node => schema.node('paragraph', null, schema.text(text))

describe('safe table refresh', () => {
  beforeEach(() => jest.clearAllMocks())

  it('follows the table when content is inserted before it, and can be undone', () => {
    const { editor, original, dispatch } = fixture()
    const bookmark = trackTable(editor, 0)
    dispatch(editor.state.tr.insert(0, paragraph('Before')))
    applyTableRefresh(editor, original, bookmark, fresh)
    expect(editor.state.doc.firstChild?.textContent).toBe('Before')
    expect(editor.state.doc.lastChild?.textContent).toContain('New')
    expect(undo(editor.state, dispatch)).toBe(true)
    expect(editor.state.doc.lastChild?.eq(original)).toBe(true)
  })

  it('replaces the previewed table, not an identical one elsewhere', () => {
    const { editor, original } = fixture(paragraph('gap'), original2())
    const secondPos = (editor.state.doc.firstChild?.nodeSize ?? 0) + editor.state.doc.child(1).nodeSize
    const bookmark = trackTable(editor, secondPos)
    applyTableRefresh(editor, original, bookmark, fresh)
    expect(editor.state.doc.firstChild?.textContent).toContain('Old')
    expect(editor.state.doc.lastChild?.textContent).toContain('New')
  })

  it('refuses when the previewed table was deleted, even if an identical table remains', () => {
    const { editor, original, dispatch } = fixture(original2())
    const bookmark = trackTable(editor, 0)
    dispatch(editor.state.tr.delete(0, original.nodeSize))
    const before = editor.state.doc
    expect(editor.state.doc.firstChild?.eq(original)).toBe(true)
    applyTableRefresh(editor, original, bookmark, fresh)
    expect(editor.state.doc.eq(before)).toBe(true)
    expect(showTableMessage).toHaveBeenCalledWith('view:string:TableChangedDuringPreview')
  })

  it('refuses to replace a table edited while the preview was open', () => {
    const { editor, original, dispatch } = fixture()
    const bookmark = trackTable(editor, 0)
    dispatch(editor.state.tr.insertText('Changed', 4))
    const before = editor.state.doc
    applyTableRefresh(editor, original, bookmark, fresh)
    expect(editor.state.doc.eq(before)).toBe(true)
    expect(showTableMessage).toHaveBeenCalledWith('view:string:TableChangedDuringPreview')
  })

  it('stops following the table once disposed', () => {
    const { editor, original, dispatch } = fixture()
    const bookmark = trackTable(editor, 0)
    bookmark.dispose()
    dispatch(editor.state.tr.insert(0, paragraph('Before')))
    applyTableRefresh(editor, original, bookmark, fresh)
  })
})

function original2 (): Node {
  return attachTableSnapshot(Node.fromJSON(schema, markdownToMarkup(old.markdown)).firstChild as Node, old.metadata)
}
