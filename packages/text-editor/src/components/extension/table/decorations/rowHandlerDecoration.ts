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

import { type TableNodeLocation } from '../types'
import { isRowSelected, selectRow } from '../utils'

import { moveRow } from './actions'
import { handleSvg } from './icons'
import {
  dropMarkerWidthPx,
  getDropMarker,
  getRowDragMarker,
  hideDragMarker,
  hideDropMarker,
  updateRowDropMarker,
  updateRowDragMarker
} from './tableDragMarkerDecoration'
import { getTableCellWidgetDecorationPos, getTableHeightPx } from './utils'

interface TableRow {
  topPx: number
  heightPx: number
}

export const rowHandlerDecoration = (state: EditorState, table: TableNodeLocation, editor: Editor): Decoration[] => {
  const decorations: Decoration[] = []

  const tableMap = TableMap.get(table.node)
  for (let row = 0; row < tableMap.height; row++) {
    const pos = getTableCellWidgetDecorationPos(table, tableMap, row * tableMap.width)

    const handle = document.createElement('div')
    handle.classList.add('table-row-handle')
    if (isRowSelected(row, state.selection)) {
      handle.classList.add('table-row-handle__selected')
    }
    handle.innerHTML = handleSvg
    handle.addEventListener('mousedown', (e) => {
      handleMouseDown(row, table, e, editor)
    })
    decorations.push(Decoration.widget(pos, handle))
  }

  return decorations
}

const handleMouseDown = (row: number, table: TableNodeLocation, event: MouseEvent, editor: Editor): void => {
  event.stopPropagation()
  event.preventDefault()

  // select row
  editor.view.dispatch(selectRow(table, row, editor.state.tr))

  // drag row
  const tableHeightPx = getTableHeightPx(table, editor)
  const rows = getTableRows(table, editor)

  let dropIndex = row
  const startTop = rows[row].topPx ?? 0
  const startY = event.clientY

  const dropMarker = getDropMarker()
  const dragMarker = getRowDragMarker()

  function handleFinish (): void {
    if (dropMarker !== null) hideDropMarker(dropMarker)
    if (dragMarker !== null) hideDragMarker(dragMarker)

    if (row !== dropIndex) {
      let tr = editor.state.tr
      tr = selectRow(table, dropIndex, tr)
      tr = moveRow(table, row, dropIndex, tr)
      editor.view.dispatch(tr)
    }
    window.removeEventListener('mouseup', handleFinish)
    window.removeEventListener('mousemove', handleMove)
  }

  function handleMove (event: MouseEvent): void {
    if (dropMarker !== null && dragMarker !== null) {
      const cursorTop = startTop + event.clientY - startY
      dropIndex = calculateRowDropIndex(row, rows, cursorTop)

      const dragMarkerHeightPx = rows[row].heightPx
      const dragMarkerTopPx = Math.max(0, Math.min(cursorTop, tableHeightPx - dragMarkerHeightPx))
      const dropMarkerTopPx =
        dropIndex <= row ? rows[dropIndex].topPx : rows[dropIndex].topPx + rows[dropIndex].heightPx

      updateRowDropMarker(dropMarker, dropMarkerTopPx - dropMarkerWidthPx / 2, dropMarkerWidthPx)
      updateRowDragMarker(dragMarker, dragMarkerTopPx, dragMarkerHeightPx)
    }
  }

  window.addEventListener('mouseup', handleFinish)
  window.addEventListener('mousemove', handleMove)
}

function calculateRowDropIndex (row: number, rows: TableRow[], top: number): number {
  const rowCenterPx = top + rows[row].heightPx / 2
  const index = rows.findIndex((p) => rowCenterPx <= p.topPx + p.heightPx)
  return index !== -1 ? (index > row ? index - 1 : index) : rows.length - 1
}

function getTableRows (table: TableNodeLocation, editor: Editor): TableRow[] {
  const result = []
  let topPx = 0

  const { map, height } = TableMap.get(table.node)
  for (let row = 0; row < height; row++) {
    const dom = editor.view.domAtPos(table.start + map[row] + 1)
    if (dom.node instanceof HTMLElement) {
      const heightPx = dom.node.offsetHeight
      result.push({ topPx, heightPx })
      topPx += heightPx
    }
  }
  return result
}
