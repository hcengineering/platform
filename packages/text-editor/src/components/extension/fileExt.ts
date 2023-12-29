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
import { getFileUrl, PDFViewer } from '@hcengineering/presentation'
import { FileNode, type FileOptions as FileNodeOptions } from '@hcengineering/text'
import { showPopup } from '@hcengineering/ui'
import { nodeInputRule } from '@tiptap/core'
import { type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { type EditorView } from '@tiptap/pm/view'
import filesize from 'filesize'

import { type FileAttachFunction } from './types'

const attachIcon =
  '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.5 1C9.10603 1 8.71593 1.0776 8.35195 1.22836C7.98797 1.37913 7.65726 1.6001 7.37868 1.87868L1.35355 7.90381C1.15829 8.09907 0.841709 8.09907 0.646447 7.90381C0.451184 7.70854 0.451184 7.39196 0.646447 7.1967L6.67157 1.17157C7.04301 0.800138 7.48396 0.5055 7.96927 0.304482C8.45457 0.103463 8.97471 0 9.5 0C10.0253 0 10.5454 0.103463 11.0307 0.304482C11.516 0.505501 11.957 0.800139 12.3284 1.17157C12.6999 1.54301 12.9945 1.98396 13.1955 2.46927C13.3965 2.95457 13.5 3.47471 13.5 4C13.5 4.52529 13.3965 5.04543 13.1955 5.53073C12.9945 6.01604 12.6999 6.45699 12.3284 6.82843L12.3251 6.83173L5.76601 13.2695C5.53423 13.5008 5.25926 13.6844 4.95671 13.8097C4.65339 13.9353 4.3283 14 4 14C3.6717 14 3.34661 13.9353 3.04329 13.8097C2.73998 13.6841 2.46438 13.4999 2.23223 13.2678C2.00009 13.0356 1.81594 12.76 1.6903 12.4567C1.56466 12.1534 1.5 11.8283 1.5 11.5C1.5 11.1717 1.56466 10.8466 1.6903 10.5433C1.81594 10.24 2.00009 9.96438 2.23223 9.73223L8.14645 3.81802C8.34171 3.62276 8.65829 3.62276 8.85355 3.81802C9.04882 4.01328 9.04882 4.32986 8.85355 4.52513L2.93934 10.4393C2.80005 10.5786 2.68956 10.744 2.61418 10.926C2.5388 11.108 2.5 11.303 2.5 11.5C2.5 11.697 2.5388 11.892 2.61418 12.074C2.68956 12.256 2.80005 12.4214 2.93934 12.5607C3.07863 12.6999 3.24399 12.8104 3.42598 12.8858C3.60796 12.9612 3.80302 13 4 13C4.19698 13 4.39204 12.9612 4.57402 12.8858C4.75601 12.8104 4.92137 12.6999 5.06066 12.5607L5.06396 12.5574L11.6229 6.11972C11.9007 5.84148 12.1212 5.51133 12.2716 5.14805C12.4224 4.78407 12.5 4.39397 12.5 4C12.5 3.60603 12.4224 3.21593 12.2716 2.85195C12.1209 2.48797 11.8999 2.15726 11.6213 1.87868C11.3427 1.6001 11.012 1.37913 10.6481 1.22836C10.2841 1.0776 9.89396 1 9.5 1Z" fill="currentColor"/></svg>'
const imageIcon =
  '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.33335 4.7472C8.08668 4.91203 7.79667 5 7.5 5C7.10218 5 6.72064 4.84197 6.43934 4.56066C6.15804 4.27936 6 3.89783 6 3.5C6 3.20333 6.08797 2.91332 6.2528 2.66665C6.41762 2.41997 6.65189 2.22771 6.92597 2.11418C7.20006 2.00065 7.50166 1.97094 7.79264 2.02882C8.08361 2.0867 8.35088 2.22956 8.56066 2.43934C8.77044 2.64912 8.9133 2.91639 8.97118 3.20737C9.02906 3.49834 8.99935 3.79994 8.88582 4.07403C8.77229 4.34811 8.58003 4.58238 8.33335 4.7472ZM7.77779 3.08427C7.69556 3.02933 7.59889 3 7.5 3C7.36739 3 7.24021 3.05268 7.14645 3.14645C7.05268 3.24022 7 3.36739 7 3.5C7 3.59889 7.02932 3.69556 7.08426 3.77779C7.13921 3.86001 7.2173 3.9241 7.30866 3.96194C7.40002 3.99978 7.50056 4.00969 7.59755 3.99039C7.69454 3.9711 7.78363 3.92348 7.85355 3.85355C7.92348 3.78363 7.9711 3.69454 7.99039 3.59755C8.00969 3.50056 7.99978 3.40002 7.96194 3.30866C7.9241 3.2173 7.86001 3.13921 7.77779 3.08427Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M0 2C0 0.895431 0.89543 0 2 0H10C11.1046 0 12 0.89543 12 2V10C12 11.1046 11.1046 12 10 12H2C0.895431 12 0 11.1046 0 10V2ZM2 1C1.44772 1 1 1.44772 1 2V6.58574L2.79285 4.79289C3.18337 4.40237 3.81654 4.40237 4.20706 4.79289L6.99995 7.58579L7.79285 6.79289C8.18337 6.40237 8.81653 6.40237 9.20706 6.79289L11 8.58583V2C11 1.44772 10.5523 1 10 1H2ZM1 10V7.99995L3.49995 5.5L6.29285 8.29289C6.68337 8.68342 7.31654 8.68342 7.70706 8.29289L8.49995 7.5L11 10C11 10.5523 10.5523 11 10 11H2C1.44772 11 1 10.5523 1 10Z" fill="currentColor"/></svg>'

/**
 * @public
 */
export interface FileOptions extends FileNodeOptions {
  attachFile?: FileAttachFunction
  reportNode?: (id: string, node: ProseMirrorNode) => void
}

/**
 * @public
 */
export const inputRegex = /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/

/**
 * @public
 */
export const FileExtension = FileNode.extend<FileOptions>({
  addOptions () {
    return {
      inline: false,
      HTMLAttributes: {}
    }
  },

  parseHTML () {
    return [
      {
        tag: `div[data-type="${this.name}"]`
      },
      {
        tag: 'div[data-file-name]'
      },
      {
        tag: 'div[data-file-size]'
      },
      {
        tag: 'div[data-file-type]'
      }
    ]
  },

  priority: 1100,

  renderHTML ({ node, HTMLAttributes }) {
    const nodeAttributes = {
      class: 'text-editor-file-container',
      'data-type': this.name
    }

    const id = HTMLAttributes['file-id']
    const fileName = HTMLAttributes['data-file-name']
    const size = HTMLAttributes['data-file-size']
    const fileType = HTMLAttributes['data-file-type']
    let href: string = ''
    if (id != null) {
      href = getFileUrl(id, 'full', fileName)
      this.options.reportNode?.(id, node)
    }
    const linkAttributes = {
      class: 'file-name',
      href,
      type: fileType,
      download: fileName,
      target: '_blank'
    }
    const icon = document.createElement('div')
    icon.classList.add('icon')
    icon.innerHTML = fileType.startsWith('image') === true ? imageIcon : attachIcon

    return [
      'div',
      nodeAttributes,
      ['div', { class: 'file-name-container' }, icon, ['a', linkAttributes, `${fileName}`]],
      ['div', { class: 'file-size' }, `${filesize(size)}`]
    ]
  },

  addInputRules () {
    return [
      nodeInputRule({
        find: inputRegex,
        type: this.type
      })
    ]
  },

  addProseMirrorPlugins () {
    const opt = this.options
    function handleDrop (
      view: EditorView,
      pos: { pos: number, inside: number } | null,
      dataTransfer: DataTransfer
    ): any {
      let result = false

      const files = dataTransfer?.files
      if (files !== undefined && opt.attachFile !== undefined) {
        let hasNotImageFile: boolean = false
        for (let i = 0; i < files.length; i++) {
          const file = files.item(i)
          if (file != null) {
            if (!file.type.startsWith('image')) {
              hasNotImageFile = true
            }
          }
        }
        if (!hasNotImageFile) {
          return false
        }

        for (let i = 0; i < files.length; i++) {
          const file = files.item(i)
          if (file != null) {
            result = true
            void opt.attachFile(file).then((id) => {
              if (id !== undefined) {
                const node = view.state.schema.nodes.file.create({
                  'file-id': id.file,
                  'data-file-name': file.name,
                  'data-file-type': file.type,
                  'data-file-size': file.size
                })
                const transaction = view.state.tr.insert(pos?.pos ?? 0, node)
                view.dispatch(transaction)
              }
            })
          }
        }
      }
      return result
    }
    return [
      new Plugin({
        key: new PluginKey('handle-file-paste'),
        props: {
          handlePaste (view, event) {
            const dataTransfer = event.clipboardData
            if (dataTransfer !== null) {
              const res = handleDrop(view, { pos: view.state.selection.$from.pos, inside: 0 }, dataTransfer)
              if (res === true) {
                event.preventDefault()
                event.stopPropagation()
              }
              return res
            }
          },
          handleDrop (view, event) {
            event.preventDefault()
            event.stopPropagation()
            const dataTransfer = event.dataTransfer
            if (dataTransfer !== null) {
              return handleDrop(view, view.posAtCoords({ left: event.x, top: event.y }), dataTransfer)
            }
          },
          handleDoubleClickOn (view, pos, node, nodePos, event) {
            const fileId = node.attrs['file-id'] ?? ''
            if (fileId === '') return
            const fileName = node.attrs['data-file-name'] ?? ''
            const fileType: string = node.attrs['data-file-type'] ?? ''
            if (!(fileType.startsWith('image/') || fileType === 'text/plain' || fileType === 'application/pdf')) return

            showPopup(
              PDFViewer,
              {
                file: fileId,
                name: fileName,
                contentType: fileType,
                fullSize: true,
                showIcon: false
              },
              'centered'
            )
          }
        }
      })
    ]
  }
})
