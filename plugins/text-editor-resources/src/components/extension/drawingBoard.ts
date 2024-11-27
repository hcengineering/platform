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

import { showPopup } from '@hcengineering/ui'
import { mergeAttributes, Node } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import DrawingBoardPopup from '../DrawingBoardPopup.svelte'

export interface DrawingBoardOptions {
  defaultHeight?: number
}

export const DrawingBoardExtension = Node.create<DrawingBoardOptions>({
  name: 'drawingBoard',

  group: 'block',

  renderHTML ({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': this.name }, HTMLAttributes)]
  },

  addOptions () {
    return {
      defaultHeight: 500
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

  addNodeView () {
    return ({ node }) => {
      const content = document.createElement('div')
      content.id = node.attrs.id
      content.style.width = '100%'
      content.style.cursor = 'pointer'
      content.style.position = 'relative'
      content.style.minHeight = `${node.attrs.height ?? this.options.defaultHeight}px`
      content.style.border = '1px solid var(--theme-navpanel-border)'
      content.style.borderRadius = 'var(--small-BorderRadius)'
      content.style.backgroundColor = 'var(--theme-navpanel-color)'

      const canvas = document.createElement('canvas')
      canvas.style.position = 'absolute'
      canvas.style.top = '0'
      canvas.style.left = '0'
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      canvas.width = 500
      canvas.height = 500

      content.appendChild(canvas)

      return {
        dom: content,
        contentDOM: canvas
      }
    }
  },

  addProseMirrorPlugins () {
    return [
      new Plugin({
        key: new PluginKey('drawing-board-handle-click'),
        props: {
          handleClick: (view, pos, event) => {
            const node = view.state.doc.nodeAt(pos)
            if (node?.type.name === this.name) {
              openDrawingBoardPopup(node.attrs.id)
            }
          }
        }
      })
    ]
  }
})

function openDrawingBoardPopup (id: string): void {
  showPopup(
    DrawingBoardPopup,
    {
      id
    },
    'centered'
  )
}
