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
import { type EditorState } from '@tiptap/pm/state'
import { TableMap } from '@tiptap/pm/tables'
import { Decoration } from '@tiptap/pm/view'

import { addSvg } from './icons'
import { type TableNodeLocation } from '../types'
import { insertRow, isRowSelected } from '../utils'

import { getTableCellWidgetDecorationPos, getTableWidthPx } from './utils'

export const rowInsertDecoration = (state: EditorState, table: TableNodeLocation, editor: Editor): Decoration[] => {
  const decorations: Decoration[] = []

  const { selection } = state

  const tableMap = TableMap.get(table.node)
  const { height } = tableMap

  const tableWidthPx = getTableWidthPx(table, editor)

  for (let row = 0; row < height; row++) {
    const show = row < height - 1 && !isRowSelected(row, selection) && !isRowSelected(row + 1, selection)

    if (show) {
      const dot = document.createElement('div')
      dot.classList.add('table-row-insert')

      const button = document.createElement('button')
      button.className = 'table-insert-button'
      button.innerHTML = addSvg
      button.addEventListener('mousedown', (e) => {
        handleMouseDown(row, table, e, editor)
      })
      dot.appendChild(button)

      const marker = document.createElement('div')
      marker.className = 'table-insert-marker'
      marker.style.width = tableWidthPx + 'px'
      dot.appendChild(marker)

      const pos = getTableCellWidgetDecorationPos(table, tableMap, row * tableMap.width)
      decorations.push(Decoration.widget(pos, dot))
    }
  }

  return decorations
}

const handleMouseDown = (row: number, table: TableNodeLocation, event: Event, editor: Editor): void => {
  event.stopPropagation()
  event.preventDefault()

  editor.view.dispatch(insertRow(table, row + 1, editor.state.tr))
}
