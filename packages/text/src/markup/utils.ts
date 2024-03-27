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

import { Markup } from '@hcengineering/core'
import { Editor, Extensions, getSchema } from '@tiptap/core'
import { Node as ProseMirrorNode, Schema } from '@tiptap/pm/model'

import { ServerKit } from '../kits/server-kit'
import { MarkupNode, emptyMarkupNode } from './model'

const defaultExtensions = [ServerKit]

/** @public */
export const EmptyMarkup: Markup = jsonToMarkup(emptyMarkupNode())

/** @public */
export function getMarkup (editor: Editor): Markup {
  return jsonToMarkup(editor.getJSON() as MarkupNode)
}

/** @public */
export function markupToJSON (markup: Markup): MarkupNode {
  try {
    return JSON.parse(markup) as MarkupNode
  } catch (error) {
    return emptyMarkupNode()
  }
}

/** @public */
export function jsonToMarkup (json: MarkupNode): Markup {
  return JSON.stringify(json)
}

/** @public */
export function isEmptyMarkup (markup: Markup | undefined): boolean {
  if (markup === undefined || markup === null || markup === '') {
    return true
  }
  const node = markupToPmNode(markup)
  return node.textContent.trim() === ''
}

/** @public */
export function areEqualMarkups (markup1: Markup, markup2: Markup): boolean {
  if (markup1 === markup2) {
    return true
  }
  const node1 = markupToPmNode(markup1)
  const node2 = markupToPmNode(markup2)

  return node1.textContent.trim() === node2.textContent.trim()
}

/** @public */
export function pmNodeToMarkup (node: ProseMirrorNode): Markup {
  return jsonToMarkup(pmNodeToJSON(node))
}

/** @public */
export function pmNodeToJSON (node: ProseMirrorNode): MarkupNode {
  return node.toJSON()
}

/** @public */
export function markupToPmNode (markup: Markup, schema?: Schema, extensions?: Extensions): ProseMirrorNode {
  const json = markupToJSON(markup)
  return jsonToPmNode(json, schema, extensions)
}

/** @public */
export function jsonToPmNode (json: MarkupNode, schema?: Schema, extensions?: Extensions): ProseMirrorNode {
  schema ??= getSchema(extensions ?? defaultExtensions)
  return ProseMirrorNode.fromJSON(schema, json)
}

const ELLIPSIS_CHAR = '…'
const WHITESPACE = ' '

/** @public */
export function stripTags (markup: Markup, textLimit = 0, extensions: Extensions | undefined = undefined): string {
  const schema = getSchema(extensions ?? defaultExtensions)
  const parsed = markupToPmNode(markup, schema)

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
