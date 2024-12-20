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
import TiptapTable from '@tiptap/extension-table'
import { CellSelection } from '@tiptap/pm/tables'
import { getEventPositionElement, SelectPopup, showPopup } from '@hcengineering/ui'
import textEditor, { type ActionContext } from '@hcengineering/text-editor'

import { SvelteNodeViewRenderer } from '../../node-view'
import TableNodeView from './TableNodeView.svelte'
import { findTable, isTableSelected, selectTable as selectTableNode } from './utils'
import AddColAfter from '../../icons/table/AddColAfter.svelte'
import AddColBefore from '../../icons/table/AddColBefore.svelte'
import AddRowAfter from '../../icons/table/AddRowAfter.svelte'
import AddRowBefore from '../../icons/table/AddRowBefore.svelte'
import DeleteCol from '../../icons/table/DeleteCol.svelte'
import DeleteRow from '../../icons/table/DeleteRow.svelte'
import DeleteTable from '../../icons/table/DeleteTable.svelte'

export const Table = TiptapTable.extend({
  draggable: true,

  addKeyboardShortcuts () {
    return {
      'Mod-Backspace': () => handleDelete(this.editor),
      'Mod-Delete': () => handleDelete(this.editor)
    }
  },
  addNodeView () {
    return SvelteNodeViewRenderer(TableNodeView, {})
  }
})

function handleDelete (editor: Editor): boolean {
  const { selection } = editor.state
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
