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

import { type Doc as YDoc, XmlElement as YXmlElement, XmlText as YXmlText } from 'yjs'
import { yDocToProsemirrorJSON } from 'y-prosemirror'

/** ProseMirror Mark JSON representation */
export interface JMark {
  type: string
  attrs?: Record<string, any>
}

/** ProseMirror Node JSON representation */
interface JNode {
  type: string
  content?: JNode[]
  marks?: JMark[]
  attrs?: Record<string, string | number | boolean>
  text?: string
}

/**
 * Converts YDoc to ProseMirror JSON object
 * @param ydoc YDoc
 * @param field YDoc field name
 * */
export function yDocToJSON (ydoc: YDoc, field: string): Record<string, any> {
  return yDocToProsemirrorJSON(ydoc, field)
}

/**
 * Converts ProseMirror JSON object to YDoc without ProseMirror schema
 * @param json ProseMirror JSON object
 * @param field YDoc field name
 * */
export function jsonToYDoc (json: Record<string, any>, ydoc: YDoc, field: string): void {
  const nodes = json.type === 'doc' ? json.content ?? [] : [json]
  const content = nodes.map(nodeToYXmlElement)

  const fragment = ydoc.getXmlFragment(field)
  fragment.delete(0, fragment.length)
  fragment.push(content)
}

/** Convert ProseMirror JSON Node representation to YXmlElement */
function nodeToYXmlElement (node: JNode): YXmlElement | YXmlText {
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
