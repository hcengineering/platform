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
import BuiltinTableCell from '@tiptap/extension-table-cell'
import { EditorState, Plugin, PluginKey, Selection } from '@tiptap/pm/state'
import { CellSelection, TableMap } from '@tiptap/pm/tables'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

import { addSvg, handleSvg } from './icons'
import { TableNodeLocation } from './types'
import { insertColumn, insertRow, findTable, isColumnSelected, isRowSelected, selectColumn, selectRow } from './utils'

export const TableCell = BuiltinTableCell.extend({
  addProseMirrorPlugins () {
    return [
      tableCellDecorationPlugin(this.editor)
    ]
  }
})

interface TableCellDecorationPluginState {
  decorations?: DecorationSet
  selection?: Selection
}

const tableCellDecorationPlugin = (editor: Editor) => {
  const key = new PluginKey('table-cell-decoration-plugin')
  return new Plugin({
    key,
    state: {
      init: (): TableCellDecorationPluginState => {
        return {}
      },
      apply(tr, prev, oldState, newState) {
        const oldTable = findTable(oldState.selection)
        const newTable = findTable(newState.selection)

        if (newTable === undefined) {
          return {}
        }

        if (prev.selection === newState.selection) {
          return prev
        }

        const decorations = DecorationSet.create(newState.doc, [
          ...columnHandlerDecoration(newState, newTable, editor),
          ...columnInsertDecoration(newState, newTable, editor),
          ...rowHandlerDecoration(newState, newTable, editor),
          ...rowInsertDecoration(newState, newTable, editor),
          ...selectionDecoration(newState, newTable)
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

const columnHandlerDecoration = (state: EditorState, table: TableNodeLocation, editor: Editor): Decoration[] => {
  const decorations: Decoration[] = []

  const { selection } = state

  const tableMap = TableMap.get(table.node)
  for (let col = 0; col < tableMap.width; col++) {
    const pos = getTableCellWidgetDecorationPos(table, tableMap, col)

    const handle = document.createElement('div')
    handle.classList.add('table-col-handle')
    if (isColumnSelected(col, selection)) {
      handle.classList.add('table-col-handle__selected')
    }
    handle.innerHTML = handleSvg
    handle.addEventListener('mousedown', e => handleColHandleMouseDown(col, table, e, editor))
    decorations.push(Decoration.widget(pos, handle))
  }

  return decorations
}

const columnInsertDecoration = (state: EditorState, table: TableNodeLocation, editor: Editor): Decoration[] => {
  const decorations: Decoration[] = []

  const { selection } = state

  const tableMap = TableMap.get(table.node)
  const { width } = tableMap

  const dom = editor.view.domAtPos(table.start)
  const tableHeightPx = dom.node.parentElement?.clientHeight ?? 0

  for (let col = 0; col < width; col++) {
    const show = (col < width - 1) && !isColumnSelected(col, selection) && !isColumnSelected(col + 1, selection)

    if (show) {
      const insert = document.createElement('div')
      insert.classList.add('table-col-insert')

      const button = document.createElement('button')
      button.className = 'table-insert-button'
      button.innerHTML = addSvg
      button.addEventListener('mousedown', e => handleColInsertMouseDown(col, table, e, editor))
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

const handleColHandleMouseDown = (col: number, table: TableNodeLocation, event: Event, editor: Editor): void => {
  event.stopPropagation()
  event.preventDefault()

  editor.view.dispatch(selectColumn(table, col, editor.state.tr))
}

const handleColInsertMouseDown = (col: number, table: TableNodeLocation, event: Event, editor: Editor): void => {
  event.stopPropagation()
  event.preventDefault()

  editor.view.dispatch(insertColumn(table, col + 1, editor.state.tr))
}

const rowHandlerDecoration = (state: EditorState, table: TableNodeLocation, editor: Editor): Decoration[] => {
  const decorations: Decoration[] = []

  const { selection } = state

  const tableMap = TableMap.get(table.node)
  for (let row = 0; row < tableMap.height; row++) {
    const pos = getTableCellWidgetDecorationPos(table, tableMap, row * tableMap.width)

    const handle = document.createElement('div')
    handle.classList.add('table-row-handle')
    if (isRowSelected(row, selection)) {
      handle.classList.add('table-row-handle__selected')
    }
    handle.innerHTML = handleSvg
    handle.addEventListener('mousedown', e => handleRowHandleMouseDown(row, table, e, editor))
    decorations.push(Decoration.widget(pos, handle))
  }

  return decorations
}

const rowInsertDecoration = (state: EditorState, table: TableNodeLocation, editor: Editor): Decoration[] => {
  const decorations: Decoration[] = []

  const { selection } = state

  const tableMap = TableMap.get(table.node)
  const { height } = tableMap

  const dom = editor.view.domAtPos(table.start)
  const tableWidthPx = dom.node.parentElement?.clientWidth ?? 0

  for (let row = 0; row < height; row++) {
    const show = (row < height - 1) && !isRowSelected(row, selection) && !isRowSelected(row + 1, selection)

    if (show) {
      const dot = document.createElement('div')
      dot.classList.add('table-row-insert')

      const button = document.createElement('button')
      button.className = 'table-insert-button'
      button.innerHTML = addSvg
      button.addEventListener('mousedown', e => handleRowInsertMouseDown(row, table, e, editor))
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

const handleRowHandleMouseDown = (row: number, table: TableNodeLocation, event: Event, editor: Editor): void => {
  event.stopPropagation()
  event.preventDefault()

  editor.view.dispatch(selectRow(table, row, editor.state.tr))
}

const handleRowInsertMouseDown = (row: number, table: TableNodeLocation, event: Event, editor: Editor): void => {
  event.stopPropagation()
  event.preventDefault()

  editor.view.dispatch(insertRow(table, row + 1, editor.state.tr))
}

const selectionDecoration = (state: EditorState, table: TableNodeLocation) => {
  const decorations: Decoration[] = []

  const { selection } = state

  const tableMap = TableMap.get(table.node)

  if (selection instanceof CellSelection) {
    const selected: number[] = []

    selection.forEachCell((_node, pos) => {
      const start = pos - table.pos - 1
      selected.push(start)
    })

    selection.forEachCell((node, pos) => {
      const start = pos - table.pos - 1
      const borders = getTableCellBorders(start, selected, tableMap)

      const classes = ['table-cell-selected']

      if (borders.top) classes.push('table-cell-selected__border-top')
      if (borders.bottom) classes.push('table-cell-selected__border-bottom')
      if (borders.left) classes.push('table-cell-selected__border-left')
      if (borders.right) classes.push('table-cell-selected__border-right')

      decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: classes.join(' ') }))
    })
  }

  return decorations
}

function getTableCellDecorationPos (table: TableNodeLocation, map: TableMap, index: number): { from: number, to: number } {
  const pos = table.node.resolve(map.map[index] + 1)
  return { from: table.start + pos.start() - 1, to: table.start + pos.end() + 1 }
}

function getTableCellWidgetDecorationPos (table: TableNodeLocation, map: TableMap, index: number): number {
  const pos = table.node.resolve(map.map[index] + 1)
  return table.start + pos.start()
}


function getTableCellBorders (cell: number, selection: number[], tableMap: TableMap): { top: boolean, bottom: boolean, left: boolean, right: boolean } {
  const { width, height } = tableMap
  const cellIndex = tableMap.map.indexOf(cell)

  const topCell = cellIndex >= width ? tableMap.map[cellIndex - width] : undefined
  const bottomCell = cellIndex < (width * height - width) ? tableMap.map[cellIndex + width] : undefined
  const leftCell = cellIndex % width !== 0 ? tableMap.map[cellIndex - 1] : undefined
  const rightCell = cellIndex % width !== width - 1 ? tableMap.map[cellIndex + 1] : undefined

  return {
    top: topCell === undefined || !selection.includes(topCell),
    bottom: bottomCell === undefined || !selection.includes(bottomCell),
    left: leftCell === undefined || !selection.includes(leftCell),
    right: rightCell === undefined || !selection.includes(rightCell)
  }
}
