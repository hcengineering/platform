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
import { Node, Schema } from 'prosemirror-model'
import { yDocToProsemirrorJSON, prosemirrorToYDoc } from 'y-prosemirror'
import { Doc as YDoc, applyUpdate } from 'yjs'
import { defaultExtensions } from './extensions'
import { MarkupNode } from './markup/model'
import { jsonToMarkup, markupToPmNode } from './markup/utils'

/**
 * @public
 */
export function markupToYDoc (markup: Markup, field: string): YDoc {
  const node = markupToPmNode(markup)
  return prosemirrorToYDoc(node, field)
}

/**
 * @public
 */
export function yDocToMarkup (ydoc: YDoc, field: string): Markup {
  const json = yDocToProsemirrorJSON(ydoc, field)
  return jsonToMarkup(json as MarkupNode)
}

/**
 * Get ProseMirror node from Y.Doc content
 *
 * @public
 */
export function yDocContentToNode (
  content: ArrayBuffer,
  field?: string,
  schema?: Schema,
  extensions?: Extensions
): Node {
  const ydoc = new YDoc()
  const uint8arr = new Uint8Array(content)
  applyUpdate(ydoc, uint8arr)

  return yDocToNode(ydoc, field, schema, extensions)
}

/**
 * Get ProseMirror node from Y.Doc
 *
 * @public
 */
export function yDocToNode (ydoc: YDoc, field?: string, schema?: Schema, extensions?: Extensions): Node {
  schema ??= getSchema(extensions ?? defaultExtensions)

  try {
    const body = yDocToProsemirrorJSON(ydoc, field)
    return schema.nodeFromJSON(body)
  } catch (err: any) {
    console.error(err)
    return schema.node(schema.topNodeType)
  }
}

/**
 * Get ProseMirror nodes from Y.Doc content
 *
 * @public
 */
export function yDocContentToNodes (content: ArrayBuffer, schema?: Schema, extensions?: Extensions): Node[] {
  schema ??= getSchema(extensions ?? defaultExtensions)

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
