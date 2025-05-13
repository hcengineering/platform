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

import { findTable, haveTableRelatedChanges, insertColumn } from '../utils'
import { addSvg } from './icons'

import { getTableCellWidgetDecorationPos, getTableHeightPx } from './utils'

import { Plugin, PluginKey } from '@tiptap/pm/state'

interface TableColumnInsertDecorationPluginState {
  decorations?: DecorationSet
}

export const TableColumnInsertDecorationPlugin = (editor: Editor): Plugin<TableColumnInsertDecorationPluginState> => {
  const key = new PluginKey('tableColumnInsertDecorationPlugin')
  return new Plugin<TableColumnInsertDecorationPluginState>({
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

        const decorations: Decoration[] = []

        const tableMap = TableMap.get(table.node)
        const { width } = tableMap

        let isStale = false
        const mapped = prev.decorations?.map(tr.mapping, tr.doc)
        for (let col = 0; col < width - 1; col++) {
          const pos = getTableCellWidgetDecorationPos(table, tableMap, col)
          if (mapped?.find(pos, pos + 1)?.length !== 1) {
            isStale = true
            break
          }
        }

        if (!isStale) {
          return { decorations: mapped }
        }

        for (let col = 0; col < width - 1; col++) {
          const pos = getTableCellWidgetDecorationPos(table, tableMap, col)
          const handler = new ColumnInsertHandler(editor, { col })
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

interface ColumnInsertHandlerProps {
  col: number
}

class ColumnInsertHandler {
  editor: Editor
  props: ColumnInsertHandlerProps
  destroy?: () => void

  constructor (editor: Editor, props: ColumnInsertHandlerProps) {
    this.editor = editor
    this.props = props
  }

  build (): HTMLElement {
    const editor = this.editor
    const col = this.props.col

    const handle = document.createElement('div')
    handle.classList.add('table-col-insert')

    const button = document.createElement('button')
    button.className = 'table-insert-button'
    button.innerHTML = addSvg
    button.addEventListener('mousedown', (event) => {
      event.stopPropagation()
      event.preventDefault()

      const table = findTable(editor.state.selection)
      if (table === undefined) {
        return
      }
      editor.view.dispatch(insertColumn(table, col + 1, editor.state.tr))
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
      const tableHeightPx = getTableHeightPx(table, editor)
      marker.style.height = tableHeightPx + 'px'
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
