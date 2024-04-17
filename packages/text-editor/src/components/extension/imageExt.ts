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
import { PDFViewer, getImageSize } from '@hcengineering/presentation'
import { ImageNode, type ImageOptions as ImageNodeOptions } from '@hcengineering/text'
import { type IconSize, getIconSize2x, showPopup } from '@hcengineering/ui'
import { mergeAttributes, nodeInputRule } from '@tiptap/core'
import { type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { type EditorView } from '@tiptap/pm/view'
import { setPlatformStatus, unknownError } from '@hcengineering/platform'

import { type FileAttachFunction } from './types'

/**
 * @public
 */
export type ImageAlignment = 'center' | 'left' | 'right'

/**
 * @public
 */
export interface ImageOptions extends ImageNodeOptions {
  attachFile?: FileAttachFunction
  reportNode?: (id: string, node: ProseMirrorNode) => void
  uploadUrl: string
}

export interface ImageAlignmentOptions {
  align?: ImageAlignment
}

export interface ImageSizeOptions {
  height?: number | string
  width?: number | string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      /**
       * Add an image
       */
      setImage: (options: { src: string, alt?: string, title?: string }) => ReturnType
      /**
       * Set image alignment
       */
      setImageAlignment: (options: ImageAlignmentOptions) => ReturnType
      /**
       * Set image size
       */
      setImageSize: (options: ImageSizeOptions) => ReturnType
    }
  }
}

/**
 * @public
 */
export const inputRegex = /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/

function getType (type: string): 'image' | 'other' {
  if (type.startsWith('image/')) {
    return 'image'
  }

  return 'other'
}

// This is a simplified version of getFileUrl from presentation plugin, which we cannot use
function getFileUrl (fileId: string, size: IconSize = 'full', uploadUrl: string): string {
  return `${uploadUrl}?file=${fileId}&size=${size as string}`
}

/**
 * @public
 */
export const ImageExtension = ImageNode.extend<ImageOptions>({
  addOptions () {
    return {
      inline: true,
      HTMLAttributes: {},
      uploadUrl: ''
    }
  },

  parseHTML () {
    return [
      {
        tag: `img[data-type="${this.name}"]`
      },
      {
        tag: 'img[src]'
      }
    ]
  },

  renderHTML ({ node, HTMLAttributes }) {
    const divAttributes = {
      class: 'text-editor-image-container',
      'data-type': this.name,
      'data-align': node.attrs.align
    }

    const imgAttributes = mergeAttributes(
      {
        'data-type': this.name
      },
      this.options.HTMLAttributes,
      HTMLAttributes
    )

    const uploadUrl = this.options.uploadUrl ?? ''

    const id = imgAttributes['file-id']
    if (id != null) {
      imgAttributes.src = getFileUrl(id, 'full', uploadUrl)
      let width: IconSize | undefined
      switch (imgAttributes.width) {
        case '32px':
          width = 'small'
          break
        case '64px':
          width = 'medium'
          break
        case '128px':
        case '256px':
          width = 'large'
          break
        case '512px':
          width = 'x-large'
          break
      }
      if (width !== undefined) {
        imgAttributes.src = getFileUrl(id, width, uploadUrl)
        imgAttributes.srcset =
          getFileUrl(id, width, uploadUrl) + ' 1x,' + getFileUrl(id, getIconSize2x(width), uploadUrl) + ' 2x'
      }
      imgAttributes.class = 'text-editor-image'
      imgAttributes.contentEditable = false
      this.options.reportNode?.(id, node)
    }

    return ['div', divAttributes, ['img', imgAttributes]]
  },

  addCommands () {
    return {
      setImage:
        (options) =>
          ({ commands }) => {
            return commands.insertContent({
              type: this.name,
              attrs: options
            })
          },

      setImageAlignment:
        (options) =>
          ({ chain, tr }) => {
            const { from } = tr.selection
            return chain()
              .updateAttributes(this.name, { ...options })
              .setNodeSelection(from)
              .run()
          },

      setImageSize:
        (options) =>
          ({ chain, tr }) => {
            const { from } = tr.selection
            return chain()
              .updateAttributes(this.name, { ...options })
              .setNodeSelection(from)
              .run()
          }
    }
  },

  addInputRules () {
    return [
      nodeInputRule({
        find: inputRegex,
        type: this.type,
        getAttributes: (match) => {
          const [, , alt, src, title] = match

          return { src, alt, title }
        }
      })
    ]
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
          if (file != null) {
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
            event.preventDefault()
            event.stopPropagation()
            const dataTransfer = event.dataTransfer
            if (dataTransfer !== null) {
              return handleDrop(view, view.posAtCoords({ left: event.x, top: event.y }), dataTransfer)
            }
          }
        }
      }),
      new Plugin({
        key: new PluginKey('handle-image-open'),
        props: {
          handleDoubleClickOn (view, pos, node, nodePos, event) {
            if (node.type.name !== 'image') {
              return
            }

            const fileId = node.attrs['file-id'] ?? node.attrs.src
            const fileName = node.attrs.alt ?? ''

            showPopup(
              PDFViewer,
              {
                file: fileId,
                name: fileName,
                contentType: 'image/*',
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
