//
// Copyright © 2024-2025 Hardcore Engineering Inc.
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

import presentation, { type DrawingCmd, MessageBox } from '@hcengineering/presentation'
import { showPopup } from '@hcengineering/ui'
import { type Editor, mergeAttributes, Node } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import type { Array as YArray, Map as YMap, Doc as YDoc } from 'yjs'
import DrawingBoardNodeView from '../DrawingBoardNodeView.svelte'
import DrawingBoardPopup from '../DrawingBoardPopup.svelte'
import { SvelteNodeViewRenderer } from '../node-view'

export interface DrawingBoardOptions {
  getSavedBoard: (id: string) => SavedBoard
}

export interface SavedBoard {
  document: YDoc
  commands: YArray<DrawingCmd>
  props: YMap<any>
  loading: boolean
}

export function showBoardPopup (id: string, board: SavedBoard, editor: Editor): void {
  if (board.commands !== undefined && board.props !== undefined) {
    showPopup(
      DrawingBoardPopup,
      {
        boardId: id,
        document: board.document,
        savedCmds: board.commands,
        savedProps: board.props,
        readonly: !editor.isEditable
      },
      'centered',
      () => {
        editor.commands.focus()
      }
    )
  }
}

function confirmDeleteBoard (editor: Editor, nodeName: string): boolean {
  const { selection } = editor.state
  if (!editor.isEditable || !(selection instanceof NodeSelection) || selection.node.type.name !== nodeName) {
    return false
  }
  const boardId = selection.node.attrs.id
  showPopup(
    MessageBox,
    {
      label: presentation.string.DeleteDrawingBoard,
      message: presentation.string.DeleteDrawingBoardConfirm,
      okLabel: presentation.string.Delete,
      dangerous: true
    },
    undefined,
    (result?: boolean) => {
      if (editor.isDestroyed) return
      if (result !== true) {
        editor.commands.focus()
        return
      }
      // The document may have changed while the dialog was open, so look the board up again
      let from: number | undefined
      let to: number | undefined
      editor.state.doc.descendants((node, pos) => {
        if (from !== undefined) return false
        if (node.type.name === nodeName && node.attrs.id === boardId) {
          from = pos
          to = pos + node.nodeSize
          return false
        }
      })
      if (from !== undefined && to !== undefined) {
        editor.chain().focus().deleteRange({ from, to }).run()
      }
    }
  )
  return true
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    drawingBoard: {
      showDrawingBoardPopup: () => ReturnType
    }
  }
}

export const DrawingBoardExtension = Node.create<DrawingBoardOptions>({
  name: 'drawingBoard',

  group: 'block',

  draggable: true,

  renderHTML ({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': this.name }, HTMLAttributes)]
  },

  parseHTML () {
    return [
      {
        tag: 'div[data-type="drawingBoard"]'
      }
    ]
  },

  addOptions () {
    return {
      getSavedBoard: (id) => ({}) as any as SavedBoard
    }
  },

  addAttributes () {
    return {
      id: {
        renderHTML: (attrs) => ({ 'data-id': attrs.id }),
        parseHTML: (element) => element.getAttribute('data-id')
      },
      height: {
        renderHTML: (attrs) => ({ 'data-height': attrs.height }),
        parseHTML: (element) => parseInt(element.getAttribute('data-height') ?? '500')
      }
    }
  },

  addCommands () {
    return {
      showDrawingBoardPopup:
        () =>
          ({ state }) => {
            if (state.selection instanceof NodeSelection) {
              const node = state.selection.node
              if (node?.type.name === this.name) {
                const board = this.options.getSavedBoard(node.attrs.id)
                if (!board.loading) {
                  showBoardPopup(node.attrs.id, board, this.editor)
                }
                return true
              }
            }
            return false
          }
    }
  },

  addKeyboardShortcuts () {
    return {
      Enter: () => this.editor.commands.showDrawingBoardPopup(),
      Delete: () => confirmDeleteBoard(this.editor, this.name),
      Backspace: () => confirmDeleteBoard(this.editor, this.name),
      'Mod-Delete': () => confirmDeleteBoard(this.editor, this.name),
      'Mod-Backspace': () => confirmDeleteBoard(this.editor, this.name)
    }
  },

  addNodeView () {
    return SvelteNodeViewRenderer(DrawingBoardNodeView, {
      contentAs: 'div',
      componentProps: {
        getSavedBoard: this.options.getSavedBoard
      }
    })
  }
})
