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

import {
  MarkupNode,
  emptyMarkupNode,
  jsonToMarkup,
  markupToJSON,
  nodeDoc,
  nodeParagraph,
  nodeText
} from '@hcengineering/text-core'
import { defaultExtensions } from '../extensions'

/** @public */
const defaultSchema = getSchema(defaultExtensions)

/** @public */
export function getMarkup (editor?: Editor): Markup {
  return jsonToMarkup(editor?.getJSON() as MarkupNode)
}

// Markup

/** @public */
export function pmNodeToMarkup (node: ProseMirrorNode): Markup {
  return jsonToMarkup(pmNodeToJSON(node))
}

/** @public */
export function markupToPmNode (markup: Markup, schema?: Schema, extensions?: Extensions): ProseMirrorNode {
  const json = markupToJSON(markup)
  return jsonToPmNode(json, schema, extensions)
}

/** @public */
export function markupHtmlToJSON (markup: Markup): MarkupNode {
  if (markup == null || markup === '') {
    return emptyMarkupNode()
  }

  try {
    // Ideally Markup should contain only serialized JSON
    // But there seem to be some cases when it contains HTML or plain text
    // So we need to handle those cases and produce valid MarkupNode
    if (markup.startsWith('{')) {
      return JSON.parse(markup) as MarkupNode
    } else if (markup.startsWith('<')) {
      return htmlToJSON(markup, defaultExtensions)
    } else {
      return nodeDoc(nodeParagraph(nodeText(markup)))
    }
  } catch (error) {
    return emptyMarkupNode()
  }
}

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

/** @public */
export function pmNodeToText (node: ProseMirrorNode): string {
  return jsonToText(node.toJSON())
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

/** @public */
export function htmlToPmNode (html: string, schema?: Schema, extensions?: Extensions): ProseMirrorNode {
  schema ??= extensions == null ? defaultSchema : getSchema(extensions ?? defaultExtensions)
  const json = htmlToJSON(html, extensions)
  return ProseMirrorNode.fromJSON(schema, json)
}

/** @public */
export function pmNodeToHTML (node: ProseMirrorNode, extensions?: Extensions): string {
  extensions ??= defaultExtensions
  return generateHTML(node.toJSON(), extensions)
}
