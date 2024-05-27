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
import { getImageSize } from '@hcengineering/presentation'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { type EditorView } from '@tiptap/pm/view'
import { setPlatformStatus, unknownError } from '@hcengineering/platform'

import { getFileUrl } from './imageExt'
import { type FileAttachFunction } from './types'

/**
 * @public
 */
export interface ImageUploadOptions {
  attachFile?: FileAttachFunction
  uploadUrl: string
}

function getType (type: string): 'image' | 'other' {
  if (type.startsWith('image/')) {
    return 'image'
  }

  return 'other'
}

/**
 * @public
 */
export const ImageUploadExtension = Extension.create<ImageUploadOptions>({
  addOptions () {
    return {
      uploadUrl: ''
    }
  },

  addProseMirrorPlugins () {
    const attachFile = this.options.attachFile
    const uploadUrl = this.options.uploadUrl

    function handleDrop (
      view: EditorView,
      pos: { pos: number, inside: number } | null,
      dataTransfer: DataTransfer
    ): any {
      const uris = (dataTransfer.getData('text/uri-list') ?? '').split('\r\n').filter((it) => !it.startsWith('#'))
      let result = false
      for (const uri of uris) {
        if (uri !== '') {
          const url = new URL(uri)
          if (uploadUrl === undefined || !url.href.includes(uploadUrl)) {
            continue
          }

          const _file = (url.searchParams.get('file') ?? '').split('/').join('')

          if (_file.trim().length === 0) {
            continue
          }

          const ctype = dataTransfer.getData('application/contentType')
          const type = getType(ctype ?? 'other')

          if (type === 'image') {
            const node = view.state.schema.nodes.image.create({
              'file-id': _file,
              src: getFileUrl(_file, 'full', uploadUrl)
            })
            const transaction = view.state.tr.insert(pos?.pos ?? 0, node)
            view.dispatch(transaction)
            result = true
          }
        }
      }
      if (result) {
        return result
      }

      const files = dataTransfer?.files
      if (files !== undefined && attachFile !== undefined) {
        for (let i = 0; i < files.length; i++) {
          const file = files.item(i)
          if (file != null && file.type.startsWith('image/')) {
            result = true
            void handleImageUpload(file, view, pos, attachFile, uploadUrl)
          }
        }
      }
      return result
    }

    return [
      new Plugin({
        key: new PluginKey('handle-image-paste'),
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

async function handleImageUpload (
  file: File,
  view: EditorView,
  pos: { pos: number, inside: number } | null,
  attachFile: FileAttachFunction,
  uploadUrl: string
): Promise<void> {
  const attached = await attachFile(file)

  if (attached === undefined) {
    return
  }

  if (!attached.type.includes('image')) {
    return
  }

  try {
    const url = getFileUrl(attached.file, 'full', uploadUrl)
    const size = await getImageSize(file, url)
    const node = view.state.schema.nodes.image.create({
      'file-id': attached.file,
      src: url,
      width: Math.round(size.width / size.pixelRatio)
    })

    const transaction = view.state.tr.insert(pos?.pos ?? 0, node)

    view.dispatch(transaction)
  } catch (e) {
    void setPlatformStatus(unknownError(e))
  }
}
