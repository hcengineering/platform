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

import { Extension } from '@tiptap/core'
import { type Node } from '@tiptap/pm/model'
import { type EditorState, Plugin, TextSelection, type Transaction } from '@tiptap/pm/state'

export interface IndendOptions {
  indentUnit: string
  allowedNodes: string[]
}

export const indentExtensionOptions: IndendOptions = {
  indentUnit: '  ',
  allowedNodes: ['mermaid', 'codeBlock']
}

export const IndentExtension = Extension.create<IndendOptions>({
  name: 'huly-indent',
  addKeyboardShortcuts () {
    return {
      Tab: ({ editor }) => {
        if (!editor.isEditable) return false
        return this.editor.commands.command(({ state, dispatch }) => {
          return dispatch?.(adjustIndent(state, 1, this.options))
        })
      },
      'Shift-Tab': ({ editor }) => {
        if (!editor.isEditable) return false
        return this.editor.commands.command(({ state, dispatch }) => {
          return dispatch?.(adjustIndent(state, -1, this.options))
        })
      }
    }
  },

  addProseMirrorPlugins () {
    return [...(this.parent?.() ?? []), IndentTabFocusFixer(this.options)]
  }
})

function IndentTabFocusFixer (options: IndendOptions): Plugin {
  return new Plugin({
    props: {
      handleKeyDown: (view, event) => {
        const selection = view.state.selection
        if (event.key !== 'Tab' || !(selection instanceof TextSelection)) return false

        const lines = getLinesInSelection(view.state, selection)
        const haveForbiddenNode = lines.some((line) => !options.allowedNodes.some((n) => n === line.node.type.name))

        const shouldBlockEvent = lines.length > 0 && !haveForbiddenNode
        if (shouldBlockEvent) {
          event.preventDefault()
          event.stopPropagation()
        }

        return shouldBlockEvent
      }
    }
  })
}

export function adjustIndent (state: EditorState, direction: -1 | 1, options: IndendOptions): Transaction | undefined {
  const { selection } = state
  if (selection instanceof TextSelection) {
    return adjustSelectionIndent(state, selection, direction, options)
  }
}

export function adjustSelectionIndent (
  state: EditorState,
  selection: TextSelection,
  direction: -1 | 1,
  options: IndendOptions
): Transaction | undefined {
  const ranges = getLinesInSelection(state, selection).filter((range) =>
    options.allowedNodes.some((n) => n === range.node.type.name)
  )

  if (ranges.length === 0) return

  const { indentUnit } = options

  const indentLevelOffset = (pos: number, direction: -1 | 1): number => {
    const unitSize = indentUnit.length
    const levelAdjustment = direction === -1 && pos % unitSize !== 0 ? 0 : direction
    const indentPos = Math.floor((pos + levelAdjustment * unitSize) / unitSize) * unitSize
    return indentPos - pos
  }

  const tr = state.tr

  if (ranges.length === 1) {
    const range = ranges[0]
    const withinIndent = selection.from >= range.from && selection.to <= range.from + range.indent && range.indent > 0
    const containsLine = selection.from <= range.from && selection.to >= range.to
    if (!withinIndent && !containsLine && direction > 0) {
      const indentOffset = indentLevelOffset(selection.from - range.from, direction)
      tr.insertText(indentUnit.slice(0, indentOffset), selection.from, selection.to)
      return
    }
  }

  const isSelectionCollapsed = selection.from === selection.to
  const affectedFromIndentStart = selection.from <= ranges[0].from + ranges[0].indent
  const affectedFrom =
    affectedFromIndentStart && !isSelectionCollapsed
      ? selection.from
      : selection.from + indentLevelOffset(ranges[0].indent, direction)
  let affectedTo = selection.to

  let insertionOffset = 0

  for (const range of ranges) {
    if (direction > 0 ? (range.text === '' && ranges.length > 1) : range.indent === 0) {
      continue
    }
    const indentOffset = indentLevelOffset(range.indent, direction)
    const from = range.from + insertionOffset
    if (indentOffset > 0) {
      tr.insertText(indentUnit.slice(0, indentOffset), from)
    } else {
      tr.insertText('', from, from - indentOffset)
    }

    insertionOffset += indentOffset
    affectedTo = selection.to + insertionOffset
  }

  const newSelection = new TextSelection(tr.doc.resolve(affectedFrom), tr.doc.resolve(affectedTo))
  tr.setSelection(newSelection)

  return tr
}

function countLeadingSpace (str: string): number {
  const match = str.match(/^(\s*)/)
  return match !== null ? match[0].length : 0
}

interface LineRange {
  node: Node
  text: string
  from: number
  indent: number
  to: number
}

function getLinesInSelection (state: EditorState, selection: TextSelection): LineRange[] {
  const { from, to } = selection // Selection start and end positions
  const ranges: LineRange[] = []

  state.doc.nodesBetween(from, to, (node: Node, pos: number) => {
    if (!node.isTextblock) return

    let currentPos = pos + 1
    const lines = node.textContent.split('\n')

    for (const line of lines) {
      const lineStart = currentPos
      const lineEnd = currentPos + line.length

      if (lineStart <= to && lineEnd >= from) {
        ranges.push({
          node,
          from: lineStart,
          indent: countLeadingSpace(line),
          to: lineEnd,
          text: line
        })
      }

      currentPos = lineEnd + 1
    }
  })

  return ranges
}
