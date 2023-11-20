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

import { Extension } from '@tiptap/core'
import { type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { type EditorState, Plugin, PluginKey, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import slugify from 'slugify'
import { type Heading } from '../../types'

export interface HeadingsOptions {
  prefixId?: string
  onChange?: (headings: Heading[]) => void
}

export interface HeadingsStorage {
  headings: Heading[]
}

export const HeadingsExtension: Extension<HeadingsOptions, HeadingsStorage> = Extension.create<HeadingsOptions>({
  name: 'headings-extension',

  addStorage () {
    return {
      headings: []
    }
  },

  onDestroy () {
    this.storage.headings = []
    this.options.onChange?.(this.storage.headings)
  },

  addProseMirrorPlugins () {
    const options = this.options
    const storage = this.storage

    const prefixId = options.prefixId ?? ''

    const plugins = [
      new Plugin({
        key: new PluginKey('heading-id-decoration-plugin'),
        state: {
          init (config, state) {
            const decorations = getHeadingDecorations(state, prefixId)
            const headings = extractHeadingsFromDecorations(decorations)

            options.onChange?.(headings)

            return { decorations: DecorationSet.create(state.doc, decorations) }
          },

          apply (tr, value, oldState, newState) {
            const headingUpdate = hasHeadingUpdate(tr)

            if (!headingUpdate) {
              const { decorations } = value
              return { decorations: decorations.map(tr.mapping, tr.doc) }
            }

            const decorations = getHeadingDecorations(newState, prefixId)
            const headings = extractHeadingsFromDecorations(decorations)

            options.onChange?.(headings)
            storage.headings = headings

            return { decorations: DecorationSet.create(tr.doc, decorations) }
          }
        },
        props: {
          decorations (state) {
            const pluginState = this.getState(state)
            if (pluginState !== undefined) {
              const { decorations } = pluginState
              return decorations
            }

            return DecorationSet.empty
          }
        }
      })
    ]

    return plugins
  }
})

function hasHeadingUpdate (tr: Transaction): boolean {
  if (!tr.docChanged) {
    return false
  }

  let found = false

  tr.mapping.maps.forEach((map, index) => {
    map.forEach((oldStart, oldEnd, newStart, newEnd) => {
      const oldDoc = tr.docs[index]
      const newDoc = tr.docs[index + 1] ?? tr.doc

      oldDoc.nodesBetween(oldStart, oldEnd, (node) => {
        if (found) {
          return false
        } else if (node.type.name === 'heading') {
          found = true
        }
        return true
      })
      newDoc.nodesBetween(newStart, newEnd, (node) => {
        if (found) {
          return false
        } else if (node.type.name === 'heading') {
          found = true
        }
        return true
      })
    })
  })

  return found
}

function getHeadingDecorations (state: EditorState, idPrefix: string): Decoration[] {
  const decorations: Decoration[] = []
  const alreadySeen: Map<string, number> = new Map<string, number>()

  const { doc } = state
  doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      const id = getHeadingId(node, idPrefix, alreadySeen)
      const title = node.textContent
      const level = node.attrs.level

      if (title !== '') {
        const heading: Heading = { id, title, level }
        decorations.push(Decoration.node(pos, pos + node.nodeSize, { id }, { heading }))
      }
    }
  })

  return decorations
}

function extractHeadingsFromDecorations (decorations: Decoration[]): Heading[] {
  return decorations.map((it) => it.spec.heading).filter((it) => it !== undefined)
}

function getHeadingId (node: ProseMirrorNode, prefix: string, ids: Map<string, number>): string {
  const name = prefix !== '' ? `${prefix}-${node.textContent}` : node.textContent
  const id: string = slugify(name, { lower: true })

  let uniqueId = id
  let index = 0

  while (ids.has(uniqueId)) {
    index += 1
    uniqueId = `${id}-${index}`
  }

  ids.set(id, index)
  if (id !== uniqueId) {
    ids.set(uniqueId, 0)
  }

  return uniqueId
}
