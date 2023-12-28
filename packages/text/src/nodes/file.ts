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
import { Node } from '@tiptap/core'
import { getDataAttribute } from './utils'

/**
 * @public
 */
export interface FileOptions {
  inline: boolean
  HTMLAttributes: Record<string, any>
}

/**
 * @public
 */
export const FileNode = Node.create<FileOptions>({
  name: 'file',

  addOptions () {
    return {
      inline: true,
      HTMLAttributes: {}
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
      'file-name': {
        default: null
      },
      'file-size': {
        default: null
      },
      'file-type': {
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
        tag: `div[data-type="${this.name}"]`
      },
      {
        tag: 'div[file-name]'
      },
      {
        tag: 'div[file-size]'
      },
      {
        tag: 'div[file-type]'
      },
      {
        tag: 'div[src]'
      }
    ]
  },

  renderHTML ({ node, HTMLAttributes }) {
    const nodeAttributes = {
      'data-type': this.name
    }

    const fileName = HTMLAttributes['file-name']
    const size = HTMLAttributes['file-size']
    const fileType = HTMLAttributes['file-type']
    const linkAttributes = {
      class: 'file-name',
      href: node.attrs.src,
      type: fileType,
      download: fileName,
      target: '_blank'
    }

    return [
      'div',
      nodeAttributes,
      ['div', {}, ['a', linkAttributes, `${fileName} (${fileType})`]],
      ['div', {}, `${size}`]
    ]
  }
})
