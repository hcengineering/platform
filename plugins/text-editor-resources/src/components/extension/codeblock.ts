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

import { backtickInputRegex, codeBlockOptions, tildeInputRegex } from '@hcengineering/text'
import { DropdownLabelsPopup, getEventPositionElement, showPopup } from '@hcengineering/ui'
import { isActive, textblockTypeInputRule } from '@tiptap/core'
import { type CodeBlockLowlightOptions, CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'
import { common, createLowlight } from 'lowlight'
import { isChangeEditable } from './editable'

type Lowlight = ReturnType<typeof createLowlight>

const chevronSvg = `<svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 22L6 12L7.4 10.6L16 19.2L24.6 10.6L26 12L16 22Z" />
</svg>`

export const codeBlockHighlightOptions: CodeBlockLowlightOptions = {
  ...codeBlockOptions,
  lowlight: createLowlight(common)
}

export const CodeBlockHighlighExtension = CodeBlockLowlight.extend<CodeBlockLowlightOptions>({
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
  },

  addInputRules () {
    return [
      textblockTypeInputRule({
        find: backtickInputRegex,
        type: this.type
      }),
      textblockTypeInputRule({
        find: tildeInputRegex,
        type: this.type
      })
    ]
  },

  addProseMirrorPlugins () {
    return [...(this.parent?.() ?? []), LanguageSelector(this.options)]
  }
})

export function LanguageSelector (options: CodeBlockLowlightOptions): Plugin {
  return new Plugin<DecorationSet>({
    key: new PluginKey('codeblock-language-selector'),
    props: {
      decorations (state) {
        return this.getState(state)
      }
    },
    state: {
      init (config, state) {
        return createDecorations(state.doc, options)
      },
      apply (tr, prev) {
        if (tr.docChanged || isChangeEditable(tr)) {
          return createDecorations(tr.doc, options)
        }

        return prev
      }
    }
  })
}

function createDecorations (doc: ProseMirrorNode, options: CodeBlockLowlightOptions): DecorationSet {
  const decorations: Decoration[] = []

  doc.descendants((node, pos) => {
    if (node.type.name === CodeBlockLowlight.name) {
      decorations.push(
        Decoration.widget(pos + node.nodeSize - 1, (view) => {
          const button = createLangButton(node.attrs.language)

          if (view.editable) {
            button.addEventListener('click', (e) => {
              e.preventDefault()
              e.stopPropagation()
              handleLangButtonClick(e, node, pos, view, options)
            })
          } else {
            button.disabled = true
          }

          return button
        })
      )
    }
  })

  return DecorationSet.create(doc, decorations)
}

function createLangButton (language: string | null): HTMLButtonElement {
  const button = document.createElement('button')
  button.className = 'antiButton link-bordered small sh-no-shape bs-none gap-medium iconR'
  button.style.position = 'absolute'
  button.style.top = '0.375rem'
  button.style.right = '0.375rem'
  button.style.zIndex = '1'

  const label = document.createElement('span')
  label.className = 'overflow-label label disabled mr-2'
  label.textContent = language ?? 'auto'

  const icon = document.createElement('div')
  icon.innerHTML = chevronSvg

  button.append(label, icon)

  return button
}

function handleLangButtonClick (
  evt: MouseEvent,
  node: ProseMirrorNode,
  pos: number,
  view: EditorView,
  options: CodeBlockLowlightOptions
): void {
  const language = node.attrs.language

  const lowlight: Lowlight = options.lowlight
  const items = lowlight.listLanguages().map((language) => ({
    id: language,
    label: language
  }))

  showPopup(
    DropdownLabelsPopup,
    {
      items,
      selected: language
    },
    getEventPositionElement(evt),
    (result) => {
      if (result != null) {
        const tr = view.state.tr.setNodeAttribute(pos, 'language', result)
        view.dispatch(tr)
      }
    }
  )
}
