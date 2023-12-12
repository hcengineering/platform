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

import { type Editor } from '@tiptap/core'
import { type EditorState } from '@tiptap/pm/state'
import { TableMap } from '@tiptap/pm/tables'
import { Decoration } from '@tiptap/pm/view'

import { addSvg } from './icons'
import { type TableNodeLocation } from '../types'
import { insertColumn, isColumnSelected } from '../utils'

import { getTableCellWidgetDecorationPos, getTableHeightPx } from './utils'

export const columnInsertDecoration = (state: EditorState, table: TableNodeLocation, editor: Editor): Decoration[] => {
  const decorations: Decoration[] = []

  const { selection } = state

  const tableMap = TableMap.get(table.node)
  const { width } = tableMap

  const tableHeightPx = getTableHeightPx(table, editor)

  for (let col = 0; col < width; col++) {
    const show = col < width - 1 && !isColumnSelected(col, selection) && !isColumnSelected(col + 1, selection)

    if (show) {
      const insert = document.createElement('div')
      insert.classList.add('table-col-insert')

      const button = document.createElement('button')
      button.className = 'table-insert-button'
      button.innerHTML = addSvg
      button.addEventListener('mousedown', (e) => {
        handleMouseDown(col, table, e, editor)
      })
      insert.appendChild(button)

      const marker = document.createElement('div')
      marker.className = 'table-insert-marker'
      marker.style.height = tableHeightPx + 'px'
      insert.appendChild(marker)

      const pos = getTableCellWidgetDecorationPos(table, tableMap, col)
      decorations.push(Decoration.widget(pos, insert))
    }
  }

  return decorations
}

const handleMouseDown = (col: number, table: TableNodeLocation, event: Event, editor: Editor): void => {
  event.stopPropagation()
  event.preventDefault()

  editor.view.dispatch(insertColumn(table, col + 1, editor.state.tr))
}
