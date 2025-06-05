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
import type { Blob, Ref } from '@hcengineering/core'
import { Node, mergeAttributes } from '@tiptap/core'
import { getDataAttribute } from './utils'

/**
 * @public
 */
export type ImageAlignment = 'center' | 'left' | 'right'

export interface ImageAlignmentOptions {
  align?: ImageAlignment
}

export interface ImageSizeOptions {
  height?: number | string
  width?: number | string
}

declare module '@tiptap/core' {
  export interface Commands<ReturnType> {
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
export interface ImageOptions {
  inline: boolean
  HTMLAttributes: Record<string, any>

  loadingImgSrc?: string
  getBlobRef: (fileId: Ref<Blob>, filename?: string, size?: number) => Promise<{ src: string, srcset: string }>
}

/**
 * @public
 */
export const ImageNode = Node.create<ImageOptions>({
  name: 'image',

  addOptions () {
    return {
      inline: true,
      HTMLAttributes: {},
      getBlobRef: async () => ({ src: '', srcset: '' })
    }
  },

  inline () {
    return this.options.inline
  },

  group () {
    return this.options.inline ? 'inline' : 'block'
  },

  draggable: true,

  selectable: true,

  addAttributes () {
    return {
      'file-id': {
        default: null
      },
      width: {
        default: null
      },
      height: {
        default: null
      },
      src: {
        default: null
      },
      alt: {
        default: null
      },
      title: {
        default: null
      },
      align: getDataAttribute('align'),
      'data-file-type': {
        default: null
      }
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
    const fileId = imgAttributes['file-id']
    if (fileId != null) {
      imgAttributes.src = `platform://platform/files/workspace/?file=${fileId}`
    }

    return ['div', divAttributes, ['img', imgAttributes]]
  }
})
