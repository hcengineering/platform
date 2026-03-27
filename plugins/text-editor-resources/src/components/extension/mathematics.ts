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

import { type Editor } from '@tiptap/core'
import Mathematics from '@tiptap/extension-mathematics'
import katex from 'katex'
import { type Node } from '@tiptap/pm/model'
import { type EditorState, Plugin, PluginKey, type Transaction, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { hasTableMetadataMarker } from './shortcuts/tableMetadata'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathematics: {
      insertMathInline: () => ReturnType
      insertMathBlock: () => ReturnType
    }
  }
}

function renderKatex (content: string, element: HTMLElement, options: katex.KatexOptions): void {
  try {
    katex.render(content, element, options)
  } catch {
    element.innerHTML = content
  }
}

function findInlineMathBoundaries (state: EditorState): { before: number, after: number } | null {
  const { from } = state.selection
  const $pos = state.doc.resolve(from)
  const parentStart = $pos.start()
  const parent = $pos.parent
  const text = parent.textBetween(0, parent.content.size, null, '\n')
  const posInParent = from - parentStart
  const before = text.lastIndexOf('$', posInParent - 1)
  if (before === -1) return null
  if (before > 0 && text[before - 1] === '$') return null
  const after = text.indexOf('$', posInParent)
  if (after === -1 || after < posInParent) return null
  if (after + 1 < text.length && text[after + 1] === '$') return null
  return { before: parentStart + before, after: parentStart + after }
}

function wrapWithMath (
  state: EditorState,
  dispatch: ((tr: Transaction) => void) | undefined,
  delimiter: string
): boolean {
  const { selection } = state
  const { from, to } = selection
  const dLen = delimiter.length

  const text = state.doc.textBetween(from, to)
  const charsBefore = from >= dLen ? state.doc.textBetween(from - dLen, from) : ''
  const charsAfter = to + dLen <= state.doc.content.size ? state.doc.textBetween(to, to + dLen) : ''

  if (charsBefore === delimiter && charsAfter === delimiter) {
    if (dispatch !== undefined) dispatch(state.tr.delete(to, to + dLen).delete(from - dLen, from))
    return true
  }

  const longerDelimiter = delimiter.repeat(2)
  if (
    text.startsWith(delimiter) &&
    text.endsWith(delimiter) &&
    !text.startsWith(longerDelimiter) &&
    !text.endsWith(longerDelimiter)
  ) {
    if (dispatch !== undefined) dispatch(state.tr.delete(to - dLen, to).delete(from, from + dLen))
    return true
  }

  if (dispatch !== undefined) dispatch(state.tr.insertText(delimiter, to).insertText(delimiter, from))
  return true
}

export async function isMathInlineActive (editor: Editor): Promise<boolean> {
  const { state } = editor
  const { selection } = state
  const { from, to } = selection
  if (!selection.empty) {
    const text = state.doc.textBetween(from, to)
    if (text.startsWith('$') && !text.startsWith('$$') && text.endsWith('$') && !text.endsWith('$$')) return true
    const before = from > 0 ? state.doc.textBetween(from - 1, from) : ''
    const after = to < state.doc.content.size ? state.doc.textBetween(to, to + 1) : ''
    if (before === '$' && after === '$') {
      const charBefore2 = from > 1 ? state.doc.textBetween(from - 2, from - 1) : ''
      const charAfter2 = to + 1 < state.doc.content.size ? state.doc.textBetween(to + 1, to + 2) : ''
      return charBefore2 !== '$' && charAfter2 !== '$'
    }
    return false
  }
  return findInlineMathBoundaries(state) !== null
}

export async function isMathBlockActive (editor: Editor): Promise<boolean> {
  const { state } = editor
  const { selection } = state
  const { from, to } = selection
  if (!selection.empty) {
    const text = state.doc.textBetween(from, to)
    if (text.startsWith('$$') && text.endsWith('$$')) return true
    const before = from >= 2 ? state.doc.textBetween(from - 2, from) : ''
    const after = to + 2 <= state.doc.content.size ? state.doc.textBetween(to, to + 2) : ''
    return before === '$$' && after === '$$'
  }
  const $pos = state.doc.resolve(from)
  const parentStart = $pos.start()
  const parent = $pos.parent
  const text = parent.textBetween(0, parent.content.size, null, '\n')
  const posInParent = from - parentStart
  const before = text.lastIndexOf('$$', posInParent - 1)
  if (before === -1) return false
  const after = text.indexOf('$$', posInParent)
  return after !== -1 && after >= posInParent
}

function createMathPlugin (
  regex: RegExp,
  katexOptions: katex.KatexOptions,
  editor: Editor,
  shouldRender: (state: EditorState, pos: number, node: Node) => boolean
): Plugin {
  return new Plugin({
    key: new PluginKey('mathematics-' + regex.source),
    state: {
      init () {
        return { decorations: undefined as DecorationSet | undefined }
      },
      apply (tr, prev, _oldState, newState) {
        if (!tr.docChanged && !tr.selectionSet && prev.decorations !== undefined) {
          return prev
        }

        const { selection } = newState
        const isEditable = editor.isEditable
        const decorations: Decoration[] = []

        newState.doc.nodesBetween(0, newState.doc.content.size, (node, pos) => {
          if (!node.inlineContent) return true
          if (!shouldRender(newState, pos, node)) return false

          const text = node.textBetween(0, node.content.size, null, '\n')
          regex.lastIndex = 0
          let match: RegExpExecArray | null

          while ((match = regex.exec(text)) !== null) {
            const from = pos + 1 + match.index
            const to = from + match[0].length
            const content = match.slice(1).find(Boolean)
            if (content === undefined) continue

            const isCollapsed = selection.from === selection.to
            const anchorIsInside = selection.anchor >= from && selection.anchor <= to
            const rangeIsInside = selection.from >= from && selection.to <= to
            const isEditing = (isCollapsed && anchorIsInside) || rangeIsInside

            decorations.push(
              Decoration.inline(
                from,
                to,
                {
                  class:
                    isEditing && isEditable
                      ? 'Tiptap-mathematics-editor'
                      : 'Tiptap-mathematics-editor Tiptap-mathematics-editor--hidden',
                  style:
                    !isEditing || !isEditable
                      ? 'display: inline-block; height: 0; opacity: 0; overflow: hidden; position: absolute; width: 0;'
                      : undefined
                },
                { content, isEditable, isEditing }
              )
            )

            if (!isEditable || !isEditing) {
              decorations.push(
                Decoration.widget(
                  from,
                  () => {
                    const element = document.createElement('span')
                    element.classList.add('Tiptap-mathematics-render')
                    if (isEditable) element.classList.add('Tiptap-mathematics-render--editable')
                    renderKatex(content, element, katexOptions)
                    return element
                  },
                  { content, isEditable, isEditing }
                )
              )
            }
          }

          return false
        })

        return { decorations: DecorationSet.create(newState.doc, decorations) }
      }
    },
    props: {
      decorations (state) {
        return this.getState(state)?.decorations ?? DecorationSet.empty
      }
    }
  })
}

function MathPastePlugin (): Plugin {
  const LATEX_RE = /\$\$?[^$]+\$\$?/
  return new Plugin({
    props: {
      handleDOMEvents: {
        paste (view, event) {
          const clipboardData = event.clipboardData
          if (clipboardData === null) return false

          // Let table metadata paste handlers process this payload.
          const plainText = clipboardData.getData('text/plain')
          const markdownText = clipboardData.getData('text/markdown')
          if (hasTableMetadataMarker(plainText) || hasTableMetadataMarker(markdownText)) {
            return false
          }

          const text = plainText
          if (text === '' || !LATEX_RE.test(text)) return false

          event.preventDefault()
          view.dispatch(view.state.tr.insertText(text))
          return true
        }
      }
    }
  })
}

const shouldRender = (_state: EditorState, _pos: number, node: Node): boolean => {
  return node.type.name !== 'codeBlock'
}

export const MathematicsExtension = Mathematics.extend({
  addCommands () {
    return {
      insertMathInline:
        () =>
          ({ state, dispatch }) => {
            const { selection } = state
            const { from } = selection

            if (selection.empty) {
              const boundaries = findInlineMathBoundaries(state)
              if (boundaries !== null) {
                if (dispatch !== undefined) {
                  dispatch(
                    state.tr
                      .delete(boundaries.after, boundaries.after + 1)
                      .delete(boundaries.before, boundaries.before + 1)
                  )
                }
                return true
              }
              const tr = state.tr.insertText('$  $', from)
              if (dispatch !== undefined) dispatch(tr.setSelection(TextSelection.create(tr.doc, from + 2)))
              return true
            }

            return wrapWithMath(state, dispatch, '$')
          },

      insertMathBlock:
        () =>
          ({ state, dispatch }) => {
            const { selection } = state
            const { from } = selection

            if (selection.empty) {
              const tr = state.tr.insertText('$$  $$', from)
              if (dispatch !== undefined) dispatch(tr.setSelection(TextSelection.create(tr.doc, from + 3)))
              return true
            }

            return wrapWithMath(state, dispatch, '$$')
          }
    }
  },
  addProseMirrorPlugins () {
    return [
      createMathPlugin(/\$\$([\s\S]+?)\$\$/g, { displayMode: true, throwOnError: false }, this.editor, shouldRender),
      createMathPlugin(
        /(?<!\$)\$((?:[^$]|\n)+?)\$(?!\$)/g,
        { displayMode: false, throwOnError: false },
        this.editor,
        shouldRender
      ),
      MathPastePlugin()
    ]
  }
})
