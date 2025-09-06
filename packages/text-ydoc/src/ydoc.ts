//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { generateId, Markup } from '@hcengineering/core'
import { jsonToMarkup, MarkupMarkType, MarkupNodeType, markupToJSON, type MarkupNode } from '@hcengineering/text'
import { Doc as YDoc, XmlElement as YXmlElement, XmlFragment as YXmlFragment, XmlText as YXmlText } from 'yjs'

/**
 * Convert Markup to Y.Doc
 *
 * @public
 */
export function markupToYDoc (markup: Markup, field: string): YDoc {
  return jsonToYDoc(markupToJSON(markup), field)
}

/**
 * Convert Markup JSON to Y.Doc
 *
 * @public
 */
export function jsonToYDoc (json: MarkupNode, field: string): YDoc {
  const ydoc = new YDoc({ guid: generateId() })
  const fragment = ydoc.getXmlFragment(field)

  const nodes = json.type === 'doc' ? json.content ?? [] : [json]
  nodes.map((p) => nodeToXmlElement(fragment, p))

  return ydoc
}

function nodeToXmlElement (parent: YXmlFragment, node: MarkupNode): YXmlElement | YXmlText {
  const elem = node.type === 'text' ? new YXmlText() : new YXmlElement(node.type)
  parent.push([elem])

  if (elem instanceof YXmlElement) {
    if (node.content !== undefined && node.content.length > 0) {
      node.content.map((p) => nodeToXmlElement(elem, p))
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
 * Convert Y.Doc to Markup
 *
 * @public
 */
export function yDocToMarkup (ydoc: YDoc, field: string): Markup {
  const fragment = ydoc.getXmlFragment(field)
  const json = xmlFragmentToNode(fragment)
  return jsonToMarkup({ type: MarkupNodeType.doc, content: json })
}

function xmlFragmentToNode (fragment: YXmlFragment): MarkupNode[] {
  const result: MarkupNode[] = []

  for (let i = 0; i < fragment.length; i++) {
    const item = fragment.get(i)
    if (item instanceof YXmlElement) {
      const node: MarkupNode = {
        type: item.nodeName as MarkupNodeType
      }

      // Handle attributes
      const attrs = item.getAttributes()
      if (Object.keys(attrs).length > 0) {
        node.attrs = attrs
      }

      // Handle content
      if (item.length > 0) {
        node.content = xmlFragmentToNode(item)
      }

      result.push(node)
    } else if (item instanceof YXmlText) {
      // Handle text with marks
      const delta = item.toDelta()
      for (const op of delta) {
        const textNode: MarkupNode = {
          type: MarkupNodeType.text,
          text: op.insert
        }

        // Convert attributes to marks
        if (op.attributes != null) {
          textNode.marks = Object.entries(op.attributes).map(([type, attrs]) => ({
            type: type as MarkupMarkType,
            attrs: attrs as Record<string, any>
          }))
        }

        result.push(textNode)
      }
    }
  }

  return result
}
