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
import { CellSelection, TableMap } from '@tiptap/pm/tables'
import { Decoration } from '@tiptap/pm/view'
import textEditor from '@hcengineering/text-editor'

import { type TableNodeLocation } from '../types'
import { findTable, getSelectedColumns, isColumnSelected, selectColumn } from '../utils'

import { duplicateColumns, moveSelectedColumns } from './actions'
import DeleteCol from '../../../icons/table/DeleteCol.svelte'
import Duplicate from '../../../icons/table/Duplicate.svelte'
import { createCellsHandle, type OptionItem } from './cellsHandle'
import {
  dropMarkerWidthPx,
  getColDragMarker,
  getDropMarker,
  hideDragMarker,
  hideDropMarker,
  updateColDropMarker,
  updateColDragMarker
} from './tableDragMarkerDecoration'
import { getTableCellWidgetDecorationPos, getTableWidthPx } from './utils'

interface TableColumn {
  leftPx: number
  widthPx: number
}

const createOptionItems = (editor: Editor): OptionItem[] => [
  {
    id: 'delete',
    icon: DeleteCol,
    label: textEditor.string.DeleteColumn,
    action: () => editor.commands.deleteColumn()
  },
  {
    id: 'duplicate',
    icon: Duplicate,
    label: textEditor.string.Duplicate,
    action: () => {
      const table = findTable(editor.state.selection)
      if (table !== undefined) {
        let tr = editor.state.tr
        const selectedColumns = getSelectedColumns(editor.state.selection, TableMap.get(table.node))
        tr = duplicateColumns(table, selectedColumns, tr)
        editor.view.dispatch(tr)
      }
    }
  }
]

export const columnHandlerDecoration = (state: EditorState, table: TableNodeLocation, editor: Editor): Decoration[] => {
  const decorations: Decoration[] = []

  const tableMap = TableMap.get(table.node)
  for (let col = 0; col < tableMap.width; col++) {
    const pos = getTableCellWidgetDecorationPos(table, tableMap, col)
    const isSelected = isColumnSelected(col, state.selection)

    const handle = createCellsHandle(createOptionItems(editor))
    handle.classList.add('table-col-handle')
    if (isSelected) {
      handle.classList.add('table-col-handle__selected')
    }
    handle.addEventListener('mousedown', (e) => {
      handleMouseDown(col, table, e, editor, isSelected)
    })

    decorations.push(Decoration.widget(pos, handle))
  }

  return decorations
}

const handleMouseDown = (
  col: number,
  table: TableNodeLocation,
  event: MouseEvent,
  editor: Editor,
  isSelected: boolean
): void => {
  event.stopPropagation()
  event.preventDefault()

  // select column
  if (!isSelected) {
    editor.view.dispatch(selectColumn(table, col, editor.state.tr))
  }

  // drag column
  const tableWidthPx = getTableWidthPx(table, editor)
  const columns = getTableColumns(table, editor)

  let dropIndex = col
  const startLeft = columns[col].leftPx ?? 0
  const startX = event.clientX

  const dropMarker = getDropMarker()
  const dragMarker = getColDragMarker()

  function handleFinish (): void {
    if (dropMarker !== null) hideDropMarker(dropMarker)
    if (dragMarker !== null) hideDragMarker(dragMarker)

    if (col !== dropIndex) {
      let tr = editor.state.tr
      const selection = editor.state.selection
      if (selection instanceof CellSelection) {
        tr = moveSelectedColumns(editor, table, selection, dropIndex, tr)
      }
      editor.view.dispatch(tr)
    }
    window.removeEventListener('mouseup', handleFinish)
    window.removeEventListener('mousemove', handleMove)
  }

  function handleMove (event: MouseEvent): void {
    if (dropMarker !== null && dragMarker !== null) {
      const currentLeft = startLeft + event.clientX - startX
      dropIndex = calculateColumnDropIndex(col, columns, currentLeft)

      const dragMarkerWidthPx = columns[col].widthPx
      const dragMarkerLeftPx = Math.max(0, Math.min(currentLeft, tableWidthPx - dragMarkerWidthPx))
      const dropMarkerLeftPx =
        dropIndex <= col ? columns[dropIndex].leftPx : columns[dropIndex].leftPx + columns[dropIndex].widthPx

      updateColDropMarker(dropMarker, dropMarkerLeftPx - Math.floor(dropMarkerWidthPx / 2) - 1, dropMarkerWidthPx)
      updateColDragMarker(dragMarker, dragMarkerLeftPx, dragMarkerWidthPx)
    }
  }

  window.addEventListener('mouseup', handleFinish)
  window.addEventListener('mousemove', handleMove)
}

function calculateColumnDropIndex (col: number, columns: TableColumn[], left: number): number {
  const colCenterPx = left + columns[col].widthPx / 2
  const index = columns.findIndex((p) => colCenterPx < p.leftPx + p.widthPx / 2)
  return index !== -1 ? (index > col ? index - 1 : index) : columns.length - 1
}

function getTableColumns (table: TableNodeLocation, editor: Editor): TableColumn[] {
  const result = []
  let leftPx = 0

  const { map, width } = TableMap.get(table.node)
  for (let col = 0; col < width; col++) {
    const dom = editor.view.domAtPos(table.start + map[col] + 1)
    if (dom.node instanceof HTMLElement) {
      if (col === 0) {
        leftPx = dom.node.offsetLeft
      }
      result.push({
        leftPx: dom.node.offsetLeft - leftPx,
        widthPx: dom.node.offsetWidth
      })
    }
  }
  return result
}
