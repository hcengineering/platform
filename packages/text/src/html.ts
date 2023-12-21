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

import { Extensions, getSchema } from '@tiptap/core'
import { generateJSON, generateHTML } from '@tiptap/html'
import { Node as ProseMirrorNode } from '@tiptap/pm/model'

import { defaultExtensions } from './extensions'
/**
 * @public
 */
export function getHTML (node: ProseMirrorNode, extensions: Extensions): string {
  return generateHTML(node.toJSON(), extensions)
}

/**
 * @public
 */
export function parseHTML (content: string, extensions?: Extensions): ProseMirrorNode {
  extensions = extensions ?? defaultExtensions

  const schema = getSchema(extensions)
  const json = generateJSON(content, extensions)

  return ProseMirrorNode.fromJSON(schema, json)
}

const ELLIPSIS_CHAR = '…'
const WHITESPACE = ' '

/**
 * @public
 */
export function stripTags (htmlString: string, textLimit = 0, extensions: Extensions | undefined = undefined): string {
  const effectiveExtensions = extensions ?? defaultExtensions
  const parsed = parseHTML(htmlString, effectiveExtensions)

  const textParts: string[] = []
  let charCount = 0
  let isHardStop = false

  parsed.descendants((node, _pos, parent): boolean => {
    if (isHardStop) {
      return false
    }

    if (node.type.isText) {
      const text = node.text ?? ''
      if (textLimit > 0 && charCount + text.length > textLimit) {
        const toAddCount = textLimit - charCount
        const textPart = text.substring(0, toAddCount)
        textParts.push(textPart)
        textParts.push(ELLIPSIS_CHAR)
        isHardStop = true
      } else {
        textParts.push(text)
        charCount += text.length
      }
      return false
    } else if (node.type.isBlock) {
      if (textParts.length > 0 && textParts[textParts.length - 1] !== WHITESPACE) {
        textParts.push(WHITESPACE)
        charCount++
      }
    }
    return true
  })

  const result = textParts.join('')
  return result
}
