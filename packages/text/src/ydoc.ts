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

import { Markup } from '@hcengineering/core'
import { Extensions, getSchema } from '@tiptap/core'
import { Node, Schema } from '@tiptap/pm/model'
import { prosemirrorJSONToYDoc, prosemirrorToYDoc, yDocToProsemirrorJSON } from 'y-prosemirror'
import { Doc as YDoc, applyUpdate, encodeStateAsUpdate, XmlElement as YXmlElement, XmlText as YXmlText } from 'yjs'
import { defaultExtensions } from './extensions'
import { MarkupNode } from './markup/model'
import { jsonToMarkup, markupToJSON, markupToPmNode } from './markup/utils'

const defaultSchema = getSchema(defaultExtensions)

/**
 * @public
 */
export function markupToYDoc (markup: Markup, field: string, schema?: Schema, extensions?: Extensions): YDoc {
  const node = markupToPmNode(markup, schema, extensions)
  return prosemirrorToYDoc(node, field)
}

/**
 * Convert markup to Y.Doc without using ProseMirror schema
 *
 * @public
 */
export function markupToYDocNoSchema (markup: Markup, field: string): YDoc {
  return jsonToYDocNoSchema(markupToJSON(markup), field)
}

/**
 * Convert ProseMirror JSON to Y.Doc without using ProseMirror schema
 *
 * @public
 */
export function jsonToYDocNoSchema (json: MarkupNode, field: string): YDoc {
  const nodes = json.type === 'doc' ? json.content ?? [] : [json]
  const content = nodes.map(nodeToYXmlElement)

  const ydoc = new YDoc()

  const fragment = ydoc.getXmlFragment(field)
  fragment.push(content)

  return ydoc
}

/**
 * Convert ProseMirror JSON Node representation to YXmlElement
 * */
function nodeToYXmlElement (node: MarkupNode): YXmlElement | YXmlText {
  const elem = node.type === 'text' ? new YXmlText() : new YXmlElement(node.type)

  if (elem instanceof YXmlElement) {
    if (node.content !== undefined && node.content.length > 0) {
      const content = node.content.map(nodeToYXmlElement)
      elem.push(content)
    }
  } else {
    // https://github.com/yjs/y-prosemirror/blob/master/src/plugins/sync-plugin.js#L777
    const attributes: Record<string, any> = {}
    if (node.marks !== undefined) {
      node.marks.forEach((mark) => {
        attributes[mark.type] = mark.attrs ?? {}
      })
    }
    elem.applyDelta([
      {
        insert: node.text ?? '',
        attributes
      }
    ])
  }

  if (node.attrs !== undefined) {
    Object.entries(node.attrs).forEach(([key, value]) => {
      elem.setAttribute(key, value)
    })
  }

  return elem
}

/**
 * @public
 */
export function yDocToMarkup (ydoc: YDoc, field: string): Markup {
  const json = yDocToProsemirrorJSON(ydoc, field)
  return jsonToMarkup(json as MarkupNode)
}

/**
 * Get ProseMirror nodes from Y.Doc content
 *
 * @public
 */
export function yDocContentToNodes (content: ArrayBuffer, schema?: Schema, extensions?: Extensions): Node[] {
  schema ??= extensions === undefined ? defaultSchema : getSchema(extensions ?? defaultExtensions)

  const nodes: Node[] = []

  try {
    const ydoc = new YDoc()
    const uint8arr = new Uint8Array(content)
    applyUpdate(ydoc, uint8arr)

    for (const field of ydoc.share.keys()) {
      try {
        const body = yDocToProsemirrorJSON(ydoc, field)
        nodes.push(schema.nodeFromJSON(body))
      } catch {}
    }
  } catch (err: any) {
    console.error(err)
  }

  return nodes
}

/**
 * Update Y.Doc content
 *
 * @public
 */
export function updateYDocContent (
  content: ArrayBuffer,
  updateFn: (body: Record<string, any>) => Record<string, any>,
  schema?: Schema,
  extensions?: Extensions
): YDoc | undefined {
  schema ??= extensions === undefined ? defaultSchema : getSchema(extensions ?? defaultExtensions)

  try {
    const ydoc = new YDoc({ gc: false })
    const res = new YDoc({ gc: false })
    const uint8arr = new Uint8Array(content)
    applyUpdate(ydoc, uint8arr)

    for (const field of ydoc.share.keys()) {
      const body = yDocToProsemirrorJSON(ydoc, field)
      const updated = updateFn(body)
      const yDoc = prosemirrorJSONToYDoc(schema, updated, field)
      const update = encodeStateAsUpdate(yDoc)
      applyUpdate(res, update)
    }

    return res
  } catch (err: any) {
    console.error(err)
  }
}
