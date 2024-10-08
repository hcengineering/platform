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

import { textblockTypeInputRule } from '@tiptap/core'
import CodeBlock, { CodeBlockOptions } from '@tiptap/extension-code-block'

export const codeBlockOptions: CodeBlockOptions = {
  defaultLanguage: 'plaintext',
  languageClassPrefix: 'language-',
  exitOnArrowDown: true,
  exitOnTripleEnter: true,
  HTMLAttributes: {
    class: 'proseCodeBlock'
  }
}

/**
 * Matches a code block with backticks.
 */
export const backtickInputRegex = /^```$/

/**
 * Matches a code block with tildes.
 */
export const tildeInputRegex = /^~~~$/

export const CodeBlockExtension = CodeBlock.extend({
  addAttributes () {
    return {
      language: {
        default: null,
        parseHTML: (element) => {
          const { languageClassPrefix } = this.options
          let fchild = element.firstElementChild
          if (fchild == null) {
            for (const c of element.childNodes) {
              if (c.nodeType === 1) {
                // According to https://developer.mozilla.org/en-US/docs/Web/API/Node
                fchild = c as Element
              }
            }
          }
          const classNames = [...Array.from(fchild?.classList ?? [])]
          if (classNames.length === 0 && fchild?.className !== undefined) {
            classNames.push(fchild?.className)
          }
          const languages = classNames
            .filter((className) => className.startsWith(languageClassPrefix))
            .map((className) => className.replace(languageClassPrefix, ''))
          const language = languages[0]

          if (language == null) {
            return null
          }

          return language
        },
        rendered: false
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
  }
})
