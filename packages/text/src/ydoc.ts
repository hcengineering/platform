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
import { Node, Schema } from 'prosemirror-model'
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from 'y-prosemirror'
import { Doc, applyUpdate, encodeStateAsUpdate } from 'yjs'
import { defaultExtensions } from './extensions'

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
  const ydoc = new Doc()
  const uint8arr = new Uint8Array(content)
  applyUpdate(ydoc, uint8arr)

  return yDocToNode(ydoc, field, schema, extensions)
}

/**
 * Get ProseMirror node from Y.Doc
 *
 * @public
 */
export function yDocToNode (ydoc: Doc, field?: string, schema?: Schema, extensions?: Extensions): Node {
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
    const ydoc = new Doc()
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
): Doc | undefined {
  schema ??= getSchema(extensions ?? defaultExtensions)

  try {
    const ydoc = new Doc()
    const res = new Doc({ gc: false })
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
