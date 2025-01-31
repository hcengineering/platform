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

import textEditor, { type ActionContext } from '@hcengineering/text-editor'
import { getEventPositionElement, SelectPopup, showPopup } from '@hcengineering/ui'
import { type Editor } from '@tiptap/core'
import TiptapTable from '@tiptap/extension-table'
import { CellSelection, TableMap } from '@tiptap/pm/tables'

import { Plugin, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import AddColAfter from '../../icons/table/AddColAfter.svelte'
import AddColBefore from '../../icons/table/AddColBefore.svelte'
import AddRowAfter from '../../icons/table/AddRowAfter.svelte'
import AddRowBefore from '../../icons/table/AddRowBefore.svelte'
import DeleteCol from '../../icons/table/DeleteCol.svelte'
import DeleteRow from '../../icons/table/DeleteRow.svelte'
import DeleteTable from '../../icons/table/DeleteTable.svelte'
import { SvelteNodeViewRenderer } from '../../node-view'
import TableNodeView from './TableNodeView.svelte'
import { TableSelection } from './types'
import { findTable, isTableSelected, selectTable as selectTableNode } from './utils'

export const Table = TiptapTable.extend({
  draggable: true,

  addKeyboardShortcuts () {
    return {
      Backspace: () => handleDelete(this.editor),
      Delete: () => handleDelete(this.editor),
      'Mod-Backspace': () => handleModDelete(this.editor),
      'Mod-Delete': () => handleModDelete(this.editor)
    }
  },
  addNodeView () {
    return SvelteNodeViewRenderer(TableNodeView, {})
  },
  addProseMirrorPlugins () {
    return [...(this.parent?.() ?? []), tableSelectionHighlight(), cleanupBrokenTables()]
  }
})

function handleDelete (editor: Editor): boolean {
  const { selection } = editor.state.tr
  if (selection instanceof TableSelection && isTableSelected(selection)) {
    return editor.commands.deleteTable()
  }
  return false
}

export const tableSelectionHighlight = (): Plugin<DecorationSet> => {
  return new Plugin<DecorationSet>({
    props: {
      decorations (state) {
        return this.getState(state)
      }
    },
    state: {
      init: () => {
        return DecorationSet.empty
      },
      apply (tr, value, oldState, newState) {
        const selection = newState.selection
        if (!(selection instanceof TableSelection)) return DecorationSet.empty

        const table = findTable(newState.selection)
        if (table === undefined) return DecorationSet.empty

        const decorations: Decoration[] = [
          Decoration.node(table.pos, table.pos + table.node.nodeSize, { class: 'table-node-selected' })
        ]
        return DecorationSet.create(newState.doc, decorations)
      }
    }
  })
}

export const cleanupBrokenTables = (): Plugin<DecorationSet> => {
  return new Plugin<DecorationSet>({
    appendTransaction: (transactions, oldState, newState) => {
      const lastTx = transactions[0]
      if (!lastTx?.docChanged) return

      let tr: Transaction | undefined
      newState.doc.descendants((node, pos) => {
        if (node.type.name !== 'table') return

        const map = TableMap.get(node)

        const isBroken = map.width === 0 || map.height === 0
        if (!isBroken) return

        tr = tr ?? newState.tr
        const mpos = tr.mapping.map(pos)

        tr = tr.delete(mpos, mpos + node.nodeSize)
      })

      return tr
    }
  })
}

function handleModDelete (editor: Editor): boolean {
  const { selection } = editor.state.tr
  if (selection instanceof CellSelection) {
    if (isTableSelected(selection)) {
      return editor.commands.deleteTable()
    } else if (selection.isColSelection()) {
      return editor.commands.deleteColumn()
    } else if (selection.isRowSelection()) {
      return editor.commands.deleteRow()
    }
  }

  return false
}

export async function openTableOptions (editor: Editor, event: MouseEvent): Promise<void> {
  const ops = [
    {
      id: '#addColumnBefore',
      icon: AddColBefore,
      label: textEditor.string.AddColumnBefore,
      action: () => editor.commands.addColumnBefore(),
      category: {
        label: textEditor.string.CategoryColumn
      }
    },
    {
      id: '#addColumnAfter',
      icon: AddColAfter,
      label: textEditor.string.AddColumnAfter,
      action: () => editor.commands.addColumnAfter(),
      category: {
        label: textEditor.string.CategoryColumn
      }
    },

    {
      id: '#deleteColumn',
      icon: DeleteCol,
      label: textEditor.string.DeleteColumn,
      action: () => editor.commands.deleteColumn(),
      category: {
        label: textEditor.string.CategoryColumn
      }
    },
    {
      id: '#addRowBefore',
      icon: AddRowBefore,
      label: textEditor.string.AddRowBefore,
      action: () => editor.commands.addRowBefore(),
      category: {
        label: textEditor.string.CategoryRow
      }
    },
    {
      id: '#addRowAfter',
      icon: AddRowAfter,
      label: textEditor.string.AddRowAfter,
      action: () => editor.commands.addRowAfter(),
      category: {
        label: textEditor.string.CategoryRow
      }
    },
    {
      id: '#deleteRow',
      icon: DeleteRow,
      label: textEditor.string.DeleteRow,
      action: () => editor.commands.deleteRow(),
      category: {
        label: textEditor.string.CategoryRow
      }
    },
    {
      id: '#mergeCells',
      icon: textEditor.icon.MergeCells,
      label: textEditor.string.MergeCells,
      action: () => editor.commands.mergeCells(),
      category: {
        label: textEditor.string.CategoryCell
      }
    },
    {
      id: '#splitCell',
      icon: textEditor.icon.SplitCells,
      label: textEditor.string.SplitCells,
      action: () => editor.commands.splitCell(),
      category: {
        label: textEditor.string.CategoryCell
      }
    },
    {
      id: '#deleteTable',
      icon: DeleteTable,
      label: textEditor.string.DeleteTable,
      action: () => editor.commands.deleteTable(),
      category: {
        label: textEditor.string.Table
      }
    }
  ]

  await new Promise<void>((resolve) => {
    showPopup(
      SelectPopup,
      {
        value: ops
      },
      getEventPositionElement(event),
      (val) => {
        if (val !== undefined) {
          const op = ops.find((it) => it.id === val)
          if (op !== undefined) {
            op.action()
          }
        }
        resolve()
      }
    )
  })
}

export async function selectTable (editor: Editor, event: MouseEvent): Promise<void> {
  const table = findTable(editor.state.selection)
  if (table === undefined) return

  event.preventDefault()

  editor.view.dispatch(selectTableNode(table, editor.state.tr))
}

export async function isEditableTableActive (editor: Editor): Promise<boolean> {
  return editor.isEditable && editor.isActive('table')
}

export async function isTableToolbarContext (editor: Editor, context: ActionContext): Promise<boolean> {
  return editor.isEditable && editor.isActive('table') && context.tag === 'table-toolbar'
}
