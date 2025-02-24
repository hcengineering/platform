//
// Copyright © 2025 Hardcore Engineering Inc.
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
import '@tiptap/extension-text-style'

export interface BackgroundColorOptions {
  types: string[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    colors: {
      setTextColor: (color: string) => ReturnType
      unsetTextColor: () => ReturnType
      setBackgroundColor: (color: string) => ReturnType
      unsetBackgroundColor: () => ReturnType
    }
  }
}

export const BackgroundColor = Extension.create<BackgroundColorOptions>({
  name: 'backgroundColor',

  addOptions () {
    return {
      types: []
    }
  },

  addGlobalAttributes () {
    return [
      {
        types: this.options.types,
        attributes: {
          backgroundColor: {
            parseHTML: (element) => {
              return element.getAttribute('data-background-color') ?? undefined
            },
            renderHTML: (attributes) => {
              if (typeof attributes.backgroundColor !== 'string') {
                return {}
              }

              return {
                'data-background-color': attributes.backgroundColor,
                style: `background-color: ${attributes.backgroundColor}`
              }
            }
          }
        }
      }
    ]
  },

  addCommands () {
    return {
      setBackgroundColor:
        (backgroundColor: string) =>
          ({ commands }) => {
            return this.options.types
              .map((type) => commands.updateAttributes(type, { backgroundColor }))
              .every((response) => response)
          },

      unsetBackgroundColor:
        () =>
          ({ commands }) => {
            return this.options.types
              .map((type) => commands.resetAttributes(type, 'backgroundColor'))
              .every((response) => response)
          }
    }
  }
})

export interface TextColorOptions {
  types: string[]
}

export const TextColor = Extension.create<TextColorOptions>({
  name: 'textColor',

  addOptions () {
    return {
      types: ['textStyle']
    }
  },

  addGlobalAttributes () {
    return [
      {
        types: this.options.types,
        attributes: {
          color: {
            parseHTML: (element) => {
              return element.getAttribute('data-color') ?? undefined
            },
            renderHTML: (attributes) => {
              if (typeof attributes.color !== 'string') {
                return {}
              }

              return {
                'data-color': attributes.color,
                style: `color: ${attributes.color}`
              }
            }
          }
        }
      }
    ]
  },

  addCommands () {
    return {
      setTextColor:
        (color: string) =>
          ({ chain }) => {
            return chain().setMark('textStyle', { color }).run()
          },

      unsetTextColor:
        () =>
          ({ chain }) => {
            return chain().setMark('textStyle', { color: null }).removeEmptyTextStyle().run()
          }
    }
  }
})
