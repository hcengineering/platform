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
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { type EditorView } from '@tiptap/pm/view'

import { type FileAttachFunction } from './types'

/**
 * @public
 */
export interface FileUploadOptions {
  attachFile?: FileAttachFunction
}

/**
 * @public
 */
export const FileUploadExtension = Extension.create<FileUploadOptions>({
  name: 'file-upload-ext',

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
            if (!file.type.startsWith('image/')) {
              hasNotImageFile = true
            }
          }
        }
        if (!hasNotImageFile) {
          return false
        }

        for (let i = 0; i < files.length; i++) {
          const file = files.item(i)
          if (file != null && !file.type.startsWith('image/')) {
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
            const dataTransfer = event.dataTransfer
            if (dataTransfer !== null) {
              const res = handleDrop(view, view.posAtCoords({ left: event.x, top: event.y }), dataTransfer)
              if (res === true) {
                event.preventDefault()
                event.stopPropagation()
              }
              return res
            }
          }
        }
      })
    ]
  }
})
