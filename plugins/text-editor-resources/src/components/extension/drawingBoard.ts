//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { type DrawingCmd } from '@hcengineering/presentation'
import { showPopup } from '@hcengineering/ui'
import { type Editor, mergeAttributes, Node } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import type { Array as YArray, Map as YMap } from 'yjs'
import DrawingBoardNodeView from '../DrawingBoardNodeView.svelte'
import DrawingBoardPopup from '../DrawingBoardPopup.svelte'
import { SvelteNodeViewRenderer } from '../node-view'

export interface DrawingBoardOptions {
  getSavedBoard: (id: string) => SavedBoard
}

export interface SavedBoard {
  commands: YArray<DrawingCmd>
  props: YMap<any>
  loading: boolean
}

export function showBoardPopup (board: SavedBoard, editor: Editor): void {
  if (board.commands !== undefined && board.props !== undefined) {
    showPopup(
      DrawingBoardPopup,
      {
        savedCmds: board.commands,
        savedProps: board.props
      },
      'centered',
      () => {
        editor.commands.focus()
      }
    )
  }
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
                  showBoardPopup(board, this.editor)
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
      Enter: () => this.editor.commands.showDrawingBoardPopup()
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
