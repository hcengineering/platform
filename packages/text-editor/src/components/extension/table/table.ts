//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { Editor } from '@tiptap/core'
import TiptapTable from '@tiptap/extension-table'
import { EditorState, Plugin, PluginKey, Selection } from '@tiptap/pm/state'
import { TableMap } from '@tiptap/pm/tables'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { TableNodeLocation } from './types'
import { insertColumn, insertRow, findTable } from './utils'

export const Table = TiptapTable.extend({
  addProseMirrorPlugins () {
    return [
      ...(this.parent?.() ?? []),
      tableDecorationPlugin(this.editor)
    ]
  }
})

interface TableDecorationPluginState {
  decorations?: DecorationSet
  selection?: Selection
}

const tableDecorationPlugin = (editor: Editor) => {
  const key = new PluginKey('table-decoration-plugin')
  return new Plugin({
    key,
    state: {
      init: (): TableDecorationPluginState => {
        return {}
      },
      apply(tr, prev, oldState, newState) {
        const oldTable = findTable(oldState.selection)
        const newTable = findTable(newState.selection)

        if (newTable === undefined) {
          return {}
        }

        if (oldTable?.start === newTable.start) {
          return prev
        }

        const decorations = DecorationSet.create(newState.doc, [
          selectionDecoration(newState, newTable),
          addColDecoration(newState, newTable, editor),
          addRowDecoration(newState, newTable, editor)
        ])
        return { selection: newState.selection, decorations }
      }
    },
    props: {
      decorations (state) {
        return key.getState(state).decorations
      }
    }
  })
}

const selectionDecoration = (_state: EditorState, table: TableNodeLocation): Decoration => {
  const from = table.pos
  const to = table.pos + table.node.nodeSize
  return Decoration.node(from, to, { class: 'table-selected' })
}

const addColDecoration = (_state: EditorState, table: TableNodeLocation, editor: Editor): Decoration => {
  const tableMap = TableMap.get(table.node)

  const div = document.createElement('div')
  div.classList.add('table-col-add-handle')
  div.addEventListener('mousedown', e => handleColAddMouseDown(tableMap.width, table, e, editor))

  return Decoration.widget(table.pos, div)
}

const addRowDecoration = (_state: EditorState, table: TableNodeLocation, editor: Editor): Decoration => {
  const tableMap = TableMap.get(table.node)

  const div = document.createElement('div')
  div.classList.add('table-row-add-handle')
  div.addEventListener('mousedown', e => handleRowAddMouseDown(tableMap.width, table, e, editor))

  return Decoration.widget(table.pos, div)
}

const handleColAddMouseDown = (col: number, table: TableNodeLocation, event: Event, editor: Editor): void => {
  event.stopPropagation()
  event.preventDefault()

  editor.view.dispatch(insertColumn(table, col, editor.state.tr))
}

const handleRowAddMouseDown = (col: number, table: TableNodeLocation, event: Event, editor: Editor): void => {
  event.stopPropagation()
  event.preventDefault()

  editor.view.dispatch(insertRow(table, col, editor.state.tr))
}
