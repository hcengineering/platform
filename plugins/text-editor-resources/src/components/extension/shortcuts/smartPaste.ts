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

import { MarkupMarkType, MarkupNodeType, type MarkupNode } from '@hcengineering/text'
import { markdownToMarkup } from '@hcengineering/text-markdown'
import { Extension } from '@tiptap/core'
import { Node, type Schema } from '@tiptap/pm/model'
import { Plugin } from '@tiptap/pm/state'

export const SmartPasteExtension = Extension.create({
  name: 'transformPastedContent',

  addProseMirrorPlugins () {
    return [PasteTextAsMarkdownPlugin()]
  }
})

function PasteTextAsMarkdownPlugin (): Plugin {
  return new Plugin({
    props: {
      handlePaste (view, event, slice) {
        const clipboardData = event.clipboardData
        if (clipboardData === null) return false

        const pastedText = clipboardData.getData('text/plain')
        const isPlainPaste = clipboardData.types.length === 1 && clipboardData.types[0] === 'text/plain'

        if (!isPlainPaste) return false

        try {
          const markupNode = cleanUnknownContent(view.state.schema, markdownToMarkup(pastedText))
          if (shouldUseMarkdownOutput(markupNode)) {
            const content = Node.fromJSON(view.state.schema, markupNode)
            const transaction = view.state.tr.replaceSelectionWith(content)
            view.dispatch(transaction)
            return true
          }
        } catch (e) {
          console.log('Unable to convert plain text to markdown:', e)
        }

        return false
      }
    }
  })
}

const importantMarkupNodeTypes = new Set<MarkupNodeType>([
  MarkupNodeType.code_block,
  MarkupNodeType.bullet_list,
  MarkupNodeType.list_item,
  MarkupNodeType.table,
  MarkupNodeType.todoList,
  MarkupNodeType.ordered_list,
  MarkupNodeType.reference,
  MarkupNodeType.image,
  MarkupNodeType.heading,
  MarkupNodeType.mermaid
])

const importantMarkupMarkTypes = new Set<MarkupMarkType>([
  MarkupMarkType.bold,
  MarkupMarkType.em,
  MarkupMarkType.code,
  MarkupMarkType.link
])

export function cleanUnknownContent (schema: Schema, node: MarkupNode): MarkupNode {
  const traverse = (node: MarkupNode): void => {
    if (node.content === undefined) {
      return
    }
    node.content = node.content.filter((child) => schema.nodes[child.type] !== undefined)
    node.content.forEach((child) => {
      traverse(child)
    })
  }

  traverse(node)
  return node
}

export function shouldUseMarkdownOutput (node: MarkupNode): boolean {
  const counter = {
    importantNodes: 0,
    importantMarks: 0
  }

  const traverse = (node: MarkupNode): void => {
    if (importantMarkupNodeTypes.has(node.type)) {
      counter.importantNodes++
    }

    if (node.type === MarkupNodeType.text) {
      for (const mark of node.marks ?? []) {
        if (importantMarkupMarkTypes.has(mark.type)) {
          counter.importantMarks++
        }
      }
    }

    ;(node.content ?? []).forEach((child) => {
      traverse(child)
    })
  }

  traverse(node)
  return counter.importantNodes > 0 || counter.importantMarks > 0
}
