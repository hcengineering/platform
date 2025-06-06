//
// Copyright © 2023, 2024 Hardcore Engineering Inc.
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

import { type Editor } from '@tiptap/core'
import { TableMap } from '@tiptap/pm/tables'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

import { findTable, haveTableRelatedChanges, insertRow } from '../utils'
import { addSvg } from './icons'

import { getTableCellWidgetDecorationPos, getTableWidthPx } from './utils'

import { Plugin, PluginKey } from '@tiptap/pm/state'

interface TableRowInsertDecorationPluginState {
  decorations?: DecorationSet
}

export const TableRowInsertDecorationPlugin = (editor: Editor): Plugin<TableRowInsertDecorationPluginState> => {
  const key = new PluginKey('tableRowInsertDecorationPlugin')
  return new Plugin<TableRowInsertDecorationPluginState>({
    key,
    state: {
      init: () => {
        return {}
      },
      apply (tr, prev, oldState, newState) {
        const table = findTable(newState.selection)
        if (!haveTableRelatedChanges(editor, table, oldState, newState, tr)) {
          return table !== undefined ? prev : {}
        }

        const tableMap = TableMap.get(table.node)
        const { height } = tableMap

        let isStale = false
        const mapped = prev.decorations?.map(tr.mapping, tr.doc)
        for (let row = 0; row < height - 1; row++) {
          const pos = getTableCellWidgetDecorationPos(table, tableMap, row * tableMap.width)
          if (mapped?.find(pos, pos + 1)?.length !== 1) {
            isStale = true
            break
          }
        }

        if (!isStale) {
          return { decorations: mapped }
        }

        const decorations: Decoration[] = []

        for (let row = 0; row < height - 1; row++) {
          const pos = getTableCellWidgetDecorationPos(table, tableMap, row * tableMap.width)
          const handler = new RowInsertHandler(editor, { row })
          decorations.push(Decoration.widget(pos, () => handler.build(), { destroy: handler.destroy }))
        }

        return { decorations: DecorationSet.create(newState.doc, decorations) }
      }
    },
    props: {
      decorations (state) {
        return key.getState(state).decorations
      }
    }
  })
}

interface RowInsertHandlerProps {
  row: number
}

class RowInsertHandler {
  editor: Editor
  props: RowInsertHandlerProps
  destroy?: () => void

  constructor (editor: Editor, props: RowInsertHandlerProps) {
    this.editor = editor
    this.props = props
  }

  build (): HTMLElement {
    const editor = this.editor
    const row = this.props.row

    const handle = document.createElement('div')
    handle.classList.add('table-row-insert')

    const button = document.createElement('button')
    button.className = 'table-insert-button'
    button.innerHTML = addSvg
    button.addEventListener('mousedown', (event) => {
      const table = findTable(editor.state.selection)
      if (table === undefined) {
        return
      }
      event.stopPropagation()
      event.preventDefault()

      editor.view.dispatch(insertRow(table, row + 1, editor.state.tr))
    })
    handle.appendChild(button)

    const marker = document.createElement('div')
    marker.className = 'table-insert-marker'
    handle.appendChild(marker)

    const updateMarkerHeight = (): void => {
      const table = findTable(editor.state.selection)
      if (table === undefined) {
        return
      }
      const tableWidthPx = getTableWidthPx(table, editor)
      marker.style.width = tableWidthPx + 'px'
    }

    updateMarkerHeight()
    editor.on('update', updateMarkerHeight)

    if (this.destroy !== undefined) {
      this.destroy()
    }
    this.destroy = () => {
      editor.off('update', updateMarkerHeight)
    }

    return handle
  }
}
