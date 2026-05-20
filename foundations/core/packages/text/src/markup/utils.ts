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
import { MarkupNode, jsonToMarkup } from '@hcengineering/text-core'

import { Editor, Extensions, getSchema, JSONContent } from '@tiptap/core'
import { DOMParser, DOMSerializer, ParseOptions, Node as ProseMirrorNode, Schema } from '@tiptap/pm/model'
import { VHTMLDocument, createHTMLDocument, parseHTML } from 'zeed-dom'

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

//  Tiptap 2.x.x utils

export function generateHTML (doc: JSONContent, extensions: Extensions): string {
  const schema = getSchema(extensions)
  const contentNode = ProseMirrorNode.fromJSON(schema, doc)

  return getHTMLFromFragment(contentNode, schema)
}

/**
 * Generates a JSON object from the given HTML string and converts it into a Prosemirror node with content.
 * @param {string} html - The HTML string to be converted into a Prosemirror node.
 * @param {Extensions} extensions - The extensions to be used for generating the schema.
 * @param {ParseOptions} options - The options to be supplied to the parser.
 * @returns {Record<string, any>} - The generated JSON object.
 * @example
 * const html = '<p>Hello, world!</p>'
 * const extensions = [...]
 * const json = generateJSON(html, extensions)
 * console.log(json) // { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello, world!' }] }] }
 */
export function generateJSON (html: string, extensions: Extensions, options?: ParseOptions): Record<string, any> {
  const schema = getSchema(extensions)
  const dom = parseHTML(html) as unknown as Node

  return DOMParser.fromSchema(schema).parse(dom, options).toJSON()
}

/**
 * Returns the HTML string representation of a given document node.
 *
 * @param doc - The document node to serialize.
 * @param schema - The Prosemirror schema to use for serialization.
 * @returns The HTML string representation of the document fragment.
 *
 * @example
 * ```typescript
 * const html = getHTMLFromFragment(doc, schema)
 * ```
 */
export function getHTMLFromFragment (doc: ProseMirrorNode, schema: Schema, options?: { document?: Document }): string {
  if (options?.document != null) {
    // The caller is relying on their own document implementation. Use this
    // instead of the default zeed-dom.
    const wrap = options.document.createElement('div')

    DOMSerializer.fromSchema(schema).serializeFragment(doc.content, { document: options.document }, wrap)
    return wrap.innerHTML
  }

  // Use zeed-dom for serialization.
  const zeedDocument = DOMSerializer.fromSchema(schema).serializeFragment(doc.content, {
    document: createHTMLDocument() as unknown as Document
  }) as unknown as VHTMLDocument

  return zeedDocument.render()
}
