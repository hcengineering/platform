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

import textEditor from '@hcengineering/text-editor'
import { type Editor } from '@tiptap/core'
import { CellSelection, TableMap } from '@tiptap/pm/tables'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

import { type TableNodeLocation } from '../types'
import { findTable, getSelectedRows, haveTableRelatedChanges, isRowSelected, selectRow } from '../utils'

import { Plugin, PluginKey } from '@tiptap/pm/state'
import DeleteRow from '../../../icons/table/DeleteRow.svelte'
import Duplicate from '../../../icons/table/Duplicate.svelte'
import { duplicateRows, moveSelectedRows } from './actions'
import { createCellsHandle, type OptionItem } from './cellsHandle'
import {
  dropMarkerWidthPx,
  getDropMarker,
  getRowDragMarker,
  hideDragMarker,
  hideDropMarker,
  updateRowDragMarker,
  updateRowDropMarker
} from './tableDragMarkerDecoration'
import { getTableCellWidgetDecorationPos, getTableHeightPx } from './utils'

interface TableRowHandlerDecorationPluginState {
  decorations?: DecorationSet
}

export const TableRowHandlerDecorationPlugin = (editor: Editor): Plugin<TableRowHandlerDecorationPluginState> => {
  const key = new PluginKey('tableRowHandlerDecorationPlugin')
  return new Plugin<TableRowHandlerDecorationPluginState>({
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

        let isStale = false
        const mapped = prev.decorations?.map(tr.mapping, tr.doc)
        for (let row = 0; row < tableMap.height; row++) {
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

        for (let row = 0; row < tableMap.height; row++) {
          const pos = getTableCellWidgetDecorationPos(table, tableMap, row * tableMap.width)

          const handler = new RowHandler(editor, { row })
          decorations.push(Decoration.widget(pos, () => handler.build(), { destroy: () => handler.destroy?.() }))
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

interface RowHandlerProps {
  row: number
}

class RowHandler {
  editor: Editor
  props: RowHandlerProps
  destroy?: () => void

  constructor (editor: Editor, props: RowHandlerProps) {
    this.editor = editor
    this.props = props
  }

  build (): HTMLElement {
    const editor = this.editor
    const selection = editor.state.selection
    const row = this.props.row

    const handle = createCellsHandle(createOptionItems(editor))
    handle.classList.add('table-row-handle')

    const selectionUpdate = (): boolean => {
      const isSelected = isRowSelected(row, editor.state.selection)
      if (isSelected) {
        handle.classList.add('table-row-handle__selected')
      } else {
        handle.classList.add('table-row-handle__selected')
      }
      return isSelected
    }

    editor.on('selectionUpdate', selectionUpdate)

    if (this.destroy !== undefined) {
      this.destroy()
    }
    this.destroy = (): void => {
      editor.off('selectionUpdate', selectionUpdate)
    }

    handle.addEventListener('mousedown', (event) => {
      event.stopPropagation()
      event.preventDefault()

      const table = findTable(editor.state.selection)
      if (table === undefined) {
        return
      }

      const isSelected = isRowSelected(row, selection)

      // select row
      if (!isSelected) {
        editor.view.dispatch(selectRow(table, row, editor.state.tr))
      }

      // drag row
      const tableHeightPx = getTableHeightPx(table, editor)
      const rows = getTableRows(table, editor)
      console.log(rows)

      let dropIndex = row
      const startTop = rows[row].topPx ?? 0
      const startY = event.clientY

      const dropMarker = getDropMarker()
      const dragMarker = getRowDragMarker()

      const handleFinish = (): void => {
        if (dropMarker !== null) hideDropMarker(dropMarker)
        if (dragMarker !== null) hideDragMarker(dragMarker)

        if (row !== dropIndex) {
          let tr = editor.state.tr
          const selection = editor.state.selection
          if (selection instanceof CellSelection) {
            const table = findTable(selection)
            if (table !== undefined) {
              tr = moveSelectedRows(editor, table, selection, dropIndex, tr)
            }
          }
          editor.view.dispatch(tr)
        }
        window.removeEventListener('mouseup', handleFinish)
        window.removeEventListener('mousemove', handleMove)
      }

      const handleMove = (event: MouseEvent): void => {
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
    })

    return handle
  }
}

interface TableRow {
  topPx: number
  heightPx: number
}

const createOptionItems = (editor: Editor): OptionItem[] => [
  {
    id: 'delete',
    icon: DeleteRow,
    label: textEditor.string.DeleteRow,
    action: () => editor.commands.deleteRow()
  },
  {
    id: 'duplicate',
    icon: Duplicate,
    label: textEditor.string.Duplicate,
    action: () => {
      const table = findTable(editor.state.selection)
      if (table !== undefined) {
        let tr = editor.state.tr
        const selectedRows = getSelectedRows(editor.state.selection, TableMap.get(table.node))
        tr = duplicateRows(table, selectedRows, tr)
        editor.view.dispatch(tr)
      }
    }
  }
]

function calculateRowDropIndex (row: number, rows: TableRow[], top: number): number {
  const rowCenterPx = top + rows[row].heightPx / 2
  const index = rows.findIndex((p) => rowCenterPx <= p.topPx + p.heightPx)
  return index !== -1 ? (index > row ? index - 1 : index) : rows.length - 1
}

function getTableRows (table: TableNodeLocation, editor: Editor): TableRow[] {
  const result = []
  let topPx = 0

  const tableMap = TableMap.get(table.node)
  for (let row = 0; row < tableMap.height; row++) {
    const dom = editor.view.domAtPos(table.start + tableMap.map[row * tableMap.width])
    if (dom.node instanceof HTMLElement) {
      const heightPx = dom.node.offsetHeight
      result.push({ topPx, heightPx })
      topPx += heightPx
    }
  }
  return result
}
