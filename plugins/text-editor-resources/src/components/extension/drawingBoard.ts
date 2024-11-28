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

import { type DrawingCmd, type DrawingProps, drawing } from '@hcengineering/presentation'
import { showPopup } from '@hcengineering/ui'
import { type Editor, mergeAttributes, Node } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import type { Array as YArray, Doc as YDoc, Map as YMap } from 'yjs'
import DrawingBoardPopup from '../DrawingBoardPopup.svelte'

const defaultHeight = 500

export interface DrawingBoardOptions {
  ydoc?: YDoc
}

const iconDrawingEdit = `<svg width="20" height="20" viewBox="0 0 15 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="m1.07 4.9-1.07-.54c2.22-4.44 8.42-5.88 7.08-2.5-.94 2.35-5.16 5.95-5.44 8.11-.2 1.51 2.63 2.18 5.69 1.33.47-4.95 4.09-7.4 6.01-6.27 2.17 1.28.85 5.17-4.83 7.15.38 2.86 3.93 1.06 5.53.29l.54 1.07c-6.13 3.07-7.1.29-7.24-1.01-3.72.93-7.21-.14-6.88-2.72.34-2.66 4.66-6.26 5.51-8.4.37-.87-3.43.54-4.9 3.49zm7.53 5.98c4.03-1.59 5.28-4.14 4.13-4.81-.64-.38-3.36.35-4.13 4.81z" />
</svg>`

interface SavedBoard {
  commands: YArray<DrawingCmd>
  props: YMap<any>
}

function getSavedBoard (ydoc: YDoc | undefined, id: string): SavedBoard {
  const board = ydoc?.getMap(`drawing-board-${id}`)
  const commands = board?.get('commands') as YArray<DrawingCmd>
  const props = board?.get('props') as YMap<any>
  return { commands, props }
}

function showBoardPopup (board: SavedBoard, editor: Editor): void {
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

export const DrawingBoardExtension = Node.create<DrawingBoardOptions>({
  name: 'drawingBoard',

  group: 'block',

  renderHTML ({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': this.name }, HTMLAttributes)]
  },

  addOptions () {
    return {
      ydoc: undefined
    }
  },

  addAttributes () {
    return {
      id: {
        renderHTML: (attrs) => ({ 'data-id': attrs.id })
      },
      height: {
        renderHTML: (attrs) => ({ 'data-height': attrs.height })
      }
    }
  },

  addKeyboardShortcuts () {
    return {
      Enter: () => {
        if (this.editor.state.selection instanceof NodeSelection) {
          const node = this.editor.state.selection.node
          if (node?.type.name === this.name) {
            const board = getSavedBoard(this.options.ydoc, node.attrs.id)
            showBoardPopup(board, this.editor)
            return true
          }
        }
        return false
      }
    }
  },

  addNodeView () {
    return ({ node }) => {
      const board = getSavedBoard(this.options.ydoc, node.attrs.id)
      if (board.commands === undefined || board.props === undefined) {
        return {}
      }

      const normalBorder = '1px solid var(--theme-navpanel-border)'
      const selectedBorder = '1px solid var(--theme-editbox-focus-border)'

      const dom = document.createElement('div')
      dom.id = node.attrs.id
      dom.contentEditable = 'false'
      dom.style.width = '100%'
      dom.style.position = 'relative'
      dom.style.minHeight = `${node.attrs.height ?? defaultHeight}px`
      dom.style.border = normalBorder
      dom.style.borderRadius = 'var(--small-BorderRadius)'
      dom.style.backgroundColor = 'var(--theme-navpanel-color)'
      dom.ondblclick = () => {
        showBoardPopup(board, this.editor)
      }

      const drawingProps: DrawingProps = {
        readonly: true,
        autoSize: true,
        commands: board.commands.toArray(),
        commandCount: board.commands.length,
        offset: board.props.get('offset')
      }

      const { canvas, update: updateDrawing } = drawing(dom, drawingProps)
      if (canvas === undefined || updateDrawing === undefined) {
        return {}
      }
      dom.appendChild(canvas)

      const listenSavedCommands = (): void => {
        let update = false
        if (board.commands.length === 0) {
          update = true
          drawingProps.commands = []
        } else if (board.commands.length > drawingProps.commands.length) {
          update = true
          for (let i = drawingProps.commands.length; i < board.commands.length; i++) {
            drawingProps.commands.push(board.commands.get(i))
          }
        }
        if (update) {
          drawingProps.commandCount = board.commands.length
          updateDrawing(drawingProps)
        }
      }
      const listenSavedProps = (): void => {
        drawingProps.offset = board.props.get('offset')
        updateDrawing(drawingProps)
      }
      board.commands.observe(listenSavedCommands)
      board.props.observe(listenSavedProps)

      const button = document.createElement('div')
      button.style.visibility = 'hidden'
      button.style.cursor = 'pointer'
      button.style.position = 'absolute'
      button.style.top = '0.3rem'
      button.style.right = '0.3rem'
      button.style.width = '2.2rem'
      button.style.height = '2.2rem'
      button.style.color = 'var(--primary-button-color)'
      button.style.backgroundColor = 'var(--primary-button-default)'
      button.style.borderRadius = 'var(--extra-small-BorderRadius)'
      button.style.border = normalBorder
      button.style.display = 'flex'
      button.style.alignItems = 'center'
      button.style.justifyContent = 'center'
      button.innerHTML = iconDrawingEdit
      button.onclick = () => {
        showBoardPopup(board, this.editor)
      }
      dom.appendChild(button)

      return {
        dom,
        selectNode: () => {
          dom.style.border = selectedBorder
          button.style.visibility = 'visible'
        },
        deselectNode: () => {
          dom.style.border = normalBorder
          button.style.visibility = 'hidden'
        },
        destroy: () => {
          board.commands.unobserve(listenSavedCommands)
          board.props.unobserve(listenSavedProps)
        }
      }
    }
  }
})
