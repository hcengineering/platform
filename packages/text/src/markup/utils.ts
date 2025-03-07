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
import { generateHTML, generateJSON } from '@tiptap/html'
import { Node as ProseMirrorNode, Schema } from '@tiptap/pm/model'

import { MarkupNode, jsonToMarkup } from '@hcengineering/text-core'
import { defaultExtensions } from '../extensions'

/** @public */
const defaultSchema = getSchema(defaultExtensions)

/** @public */
export function getMarkup (editor?: Editor): Markup {
  return jsonToMarkup(editor?.getJSON() as MarkupNode)
}

// Markup

/** @public */
export function jsonToPmNode (json: MarkupNode, schema?: Schema, extensions?: Extensions): ProseMirrorNode {
  schema ??= extensions == null ? defaultSchema : getSchema(extensions ?? defaultExtensions)
  return ProseMirrorNode.fromJSON(schema, json)
}

/** @public */
export function pmNodeToJSON (node: ProseMirrorNode): MarkupNode {
  return node.toJSON()
}

/** @public */
export function jsonToText (node: MarkupNode, schema?: Schema, extensions?: Extensions): string {
  const pmNode = jsonToPmNode(node, schema, extensions)
  return pmNode.textBetween(0, pmNode.content.size, '\n', '')
}

// export function markupToText (markup: Markup, schema?: Schema, extensions?: Extensions): string {
//   const pmNode = markupToPmNode(markup, schema, extensions)
//   return pmNode.textBetween(0, pmNode.content.size, '\n', '')
// }

// HTML

/** @public */
export function htmlToMarkup (html: string, extensions?: Extensions): Markup {
  const json = htmlToJSON(html, extensions)
  return jsonToMarkup(json)
}

// /** @public */
// export function markupToHTML (markup: Markup, extensions?: Extensions): string {
//   const json = markupToJSON(markup)
//   return jsonToHTML(json, extensions)
// }

/** @public */
export function htmlToJSON (html: string, extensions?: Extensions): MarkupNode {
  extensions = extensions ?? defaultExtensions
  return generateJSON(html, extensions, { preserveWhitespace: 'full' }) as MarkupNode
}

/** @public */
export function jsonToHTML (json: MarkupNode, extensions?: Extensions): string {
  extensions = extensions ?? defaultExtensions
  return generateHTML(json, extensions)
}
