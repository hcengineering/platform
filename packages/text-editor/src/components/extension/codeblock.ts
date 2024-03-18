//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { isActive } from '@tiptap/core'
import CodeBlock from '@tiptap/extension-code-block'

export const CodeBlockExtension = CodeBlock.extend({
  addCommands () {
    return {
      setCodeBlock:
        (attributes) =>
          ({ commands }) => {
            return commands.setNode(this.name, attributes)
          },
      toggleCodeBlock:
        (attributes) =>
          ({ chain, commands, state }) => {
            const { from, to } = state.selection

            // merge multiple paragraphs into codeblock
            if (!isActive(state, this.name) && !state.selection.empty) {
              let hasParagraphsOnlySelected = true
              const textArr: string[] = []
              state.doc.nodesBetween(from, to, (node, pos) => {
                if (node.isInline) {
                  return false
                }
                if (node.type.name !== 'paragraph') {
                  if (pos + 1 <= from && pos + node.nodeSize - 1 >= to) {
                  // skip nodes outside of the selected range
                    return false
                  } else {
                  // cannot merge non-paragraph nodes inside selection
                    hasParagraphsOnlySelected = false
                    return false
                  }
                } else {
                  const selectedText = (node.textContent ?? '').slice(
                    pos + 1 > from ? 0 : from - pos - 1,
                    pos + node.nodeSize - 1 < to ? node.nodeSize - 1 : to - pos - 1
                  )
                  textArr.push(selectedText ?? '')
                }
              })
              if (hasParagraphsOnlySelected && textArr.length > 1) {
                return chain()
                  .command(({ state, tr }) => {
                    tr.replaceRangeWith(from, to, this.type.create(attributes, state.schema.text(textArr.join('\n'))))
                    return true
                  })
                  .setTextSelection({ from: from + 2, to: from + 2 })
                  .run()
              }
            }
            return commands.toggleNode(this.name, 'paragraph', attributes)
          }
    }
  }
})
