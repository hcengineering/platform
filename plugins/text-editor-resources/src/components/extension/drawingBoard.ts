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
import { mergeAttributes, Node } from '@tiptap/core'
import type { Array as YArray, Doc as YDoc } from 'yjs'
import DrawingBoardPopup from '../DrawingBoardPopup.svelte'

const defaultHeight = 500

export interface DrawingBoardOptions {
  ydoc?: YDoc
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    insertDrawingBoard: (options?: { id: string, getContent: () => string }) => ReturnType
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
      },
      getContent: {
        default: undefined
      }
    }
  },

  addNodeView () {
    return ({ node }) => {
      const savedCmds = this.options.ydoc
        ?.getMap(`drawing-board-${node.attrs.id}`)
        .get('commands') as YArray<DrawingCmd>
      if (savedCmds === undefined) {
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
        showPopup(
          DrawingBoardPopup,
          {
            id: node.attrs.id,
            ydoc: this.options.ydoc
          },
          'centered'
        )
      }

      const drawingProps: DrawingProps = {
        readonly: true,
        autoSize: true,
        drawingCmds: savedCmds.toArray(),
        commandCount: savedCmds.length,
        defaultCursor: 'pointer'
      }

      const { canvas, update: updateDrawing } = drawing(dom, drawingProps)
      if (canvas === undefined || updateDrawing === undefined) {
        return {}
      }
      dom.appendChild(canvas)

      const listenSavedCommands = (): void => {
        let update = false
        if (savedCmds.length === 0) {
          update = true
          drawingProps.drawingCmds = []
        } else if (savedCmds.length > drawingProps.drawingCmds.length) {
          update = true
          for (let i = drawingProps.drawingCmds.length; i < savedCmds.length; i++) {
            drawingProps.drawingCmds.push(savedCmds.get(i))
          }
        }
        if (update) {
          drawingProps.commandCount = savedCmds.length
          updateDrawing(drawingProps)
        }
      }
      savedCmds.observe(listenSavedCommands)

      return {
        dom,
        selectNode: () => {
          dom.style.border = selectedBorder
        },
        deselectNode: () => {
          dom.style.border = normalBorder
        },
        setSelection: (anchor, head, root) => {
          console.log('setSelection', anchor, head, root)
        },
        destroy: () => {
          savedCmds.unobserve(listenSavedCommands)
        }
      }
    }
  }
})
