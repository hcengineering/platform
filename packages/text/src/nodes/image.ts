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
import { Node, mergeAttributes } from '@tiptap/core'
import { getDataAttribute } from './utils'

/**
 * @public
 */
export interface ImageOptions {
  inline: boolean
  HTMLAttributes: Record<string, any>
  uploadUrl?: string
}

// This is a simplified version of getFileUrl from presentation plugin, which we cannot use
function getFileUrl (uploadUrl: string, fileId: string, size: string = 'full'): string {
  return `${uploadUrl}?file=${fileId}&size=${size}`
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
      uploadUrl: ''
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
      align: getDataAttribute('align')
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
      const uploadUrl = this.options.uploadUrl ?? ''
      imgAttributes.src = getFileUrl(uploadUrl, fileId)
    }

    return ['div', divAttributes, ['img', imgAttributes]]
  }
})
