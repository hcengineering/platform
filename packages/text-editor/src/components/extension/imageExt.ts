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
import { FilePreviewPopup } from '@hcengineering/presentation'
import { ImageNode, type ImageOptions as ImageNodeOptions } from '@hcengineering/text'
import { type IconSize, getIconSize2x, showPopup } from '@hcengineering/ui'
import { mergeAttributes, nodeInputRule } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

/**
 * @public
 */
export type ImageAlignment = 'center' | 'left' | 'right'

/**
 * @public
 */
export interface ImageOptions extends ImageNodeOptions {
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

// This is a simplified version of getFileUrl from presentation plugin, which we cannot use
export function getFileUrl (fileId: string, size: IconSize = 'full', uploadUrl: string): string {
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
    return [
      new Plugin({
        key: new PluginKey('handle-image-open'),
        props: {
          handleDoubleClickOn (view, pos, node, nodePos, event) {
            if (node.type.name !== ImageExtension.name) {
              return
            }

            const fileId = node.attrs['file-id'] ?? node.attrs.src
            const fileName = node.attrs.alt ?? ''

            showPopup(
              FilePreviewPopup,
              {
                value: fileId,
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
