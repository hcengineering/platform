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

import { deepEqual } from 'fast-equals'
import { nodeDoc, nodeParagraph, nodeText } from './dsl'
import { MarkupMark, MarkupMarkType, MarkupNode, MarkupNodeType, emptyMarkupNode, type AttrValue } from './model'
import { traverseNode } from './traverse'

/** @public */
export const EmptyMarkup: Markup = jsonToMarkup(emptyMarkupNode())

/** @public */
export function isEmptyMarkup (markup: Markup | undefined): boolean {
  if (markup === undefined || markup === null || markup === '') {
    return true
  }
  return isEmptyNode(markupToJSON(markup))
}

/** @public */
export function areEqualMarkups (markup1: Markup, markup2: Markup): boolean {
  if (markup1 === markup2) {
    return true
  }

  const node1 = markupToJSON(markup1)
  const node2 = markupToJSON(markup2)

  if (isEmptyNode(node1) && isEmptyNode(node2)) {
    return true
  }

  return equalNodes(node1, node2)
}

/** @public */
export function areEqualJson (json1: MarkupNode, json2: MarkupNode): boolean {
  return equalNodes(json1, json2)
}

function equalNodes (node1: MarkupNode, node2: MarkupNode): boolean {
  if (node1.type !== node2.type) return false

  const text1 = node1.text ?? ''
  const text2 = node2.text ?? ''
  if (text1 !== text2) return false

  if (!equalArrays(node1.content, node2.content, equalNodes)) return false
  if (!equalArrays(node1.marks, node2.marks, equalMarks)) return false
  if (!equalRecords(node1.attrs, node2.attrs)) return false

  return true
}

function equalArrays<T> (a: T[] | undefined, b: T[] | undefined, equal: (a: T, b: T) => boolean): boolean {
  if (a === b) return true
  const arr1 = a ?? []
  const arr2 = b ?? []
  if (arr1.length !== arr2.length) return false
  return arr1.every((item1, i) => equal(item1, arr2[i]))
}

function equalRecords (a: Record<string, any> | undefined, b: Record<string, any> | undefined): boolean {
  if (a === b) return true
  a = Object.fromEntries(Object.entries(a ?? {}).filter(([_, v]) => v != null))
  b = Object.fromEntries(Object.entries(b ?? {}).filter(([_, v]) => v != null))
  return deepEqual(a, b)
}

export function equalMarks (a: MarkupMark, b: MarkupMark): boolean {
  return a.type === b.type && equalRecords(a.attrs, b.attrs)
}

const emptyNodes = [MarkupNodeType.hard_break]

const nonEmptyNodes = [
  MarkupNodeType.horizontal_rule,
  MarkupNodeType.image,
  MarkupNodeType.reference,
  MarkupNodeType.subLink,
  MarkupNodeType.table
]

/** @public */
export function isEmptyNode (node: MarkupNode): boolean {
  if (emptyNodes.includes(node.type)) return true
  if (nonEmptyNodes.includes(node.type)) return false
  if (node.text !== undefined && node.text?.trim().length > 0) return false

  const content = node.content ?? []
  return content.every(isEmptyNode)
}

// Markup

/** @public */
export function jsonToMarkup (json: MarkupNode): Markup {
  return JSON.stringify(json)
}

/** @public */
export function markupToJSON (markup: Markup): MarkupNode {
  if (markup == null || markup === '') {
    return emptyMarkupNode()
  }

  try {
    // Ideally Markup should contain only serialized JSON
    // But there seem to be some cases when it contains HTML or plain text
    // So we need to handle those cases and produce valid MarkupNode
    if (markup.startsWith('{')) {
      return JSON.parse(markup) as MarkupNode
    } else {
      return nodeDoc(nodeParagraph(nodeText(markup)))
    }
  } catch (error) {
    return emptyMarkupNode()
  }
}

// UTILS

const ELLIPSIS_CHAR = '…'
const WHITESPACE = ' '

/** @public */
export function stripTags (markup: Markup, textLimit = 0): string {
  const parsed = markupToJSON(markup)

  const textParts: string[] = []
  let charCount = 0
  let isHardStop = false

  const pushText = (text: string): void => {
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
  }

  traverseNode(parsed, (node, parent): boolean => {
    if (isHardStop) {
      return false
    }

    if (node.type === MarkupNodeType.text) {
      const text = node.text ?? ''
      pushText(text)
      return false
    } else if (
      node.type === MarkupNodeType.paragraph ||
      node.type === MarkupNodeType.table ||
      node.type === MarkupNodeType.doc ||
      node.type === MarkupNodeType.blockquote
    ) {
      if (textParts.length > 0 && textParts[textParts.length - 1] !== WHITESPACE) {
        textParts.push(WHITESPACE)
        charCount++
      }
    } else if (node.type === MarkupNodeType.reference) {
      const label = `${node.attrs?.label ?? ''}`
      pushText(label.length > 0 ? `@${label}` : '')
    }
    return true
  })

  const result = textParts.join('')
  return result
}

class NodeBuilder {
  textParts: string[] = []

  constructor (private readonly addTags: boolean) {}

  addText (text: string): void {
    this.textParts.push(text)
  }

  addTag (text: string, newLine: boolean = false): void {
    if (this.addTags) {
      this.textParts.push(text)
    }
    if (!this.addTags && newLine) {
      this.textParts.push('\n')
    }
  }

  toText (): string {
    return this.textParts.join('')
  }
}

function addMark (builder: NodeBuilder, mark?: MarkupMark, next?: () => void): void {
  if (mark != null) {
    const attrs = mark.attrs ?? {}

    if (mark.type === MarkupMarkType.bold) {
      builder.addTag('<strong>')
      next?.()
      builder.addTag('</strong>')
    } else if (mark.type === MarkupMarkType.code) {
      builder.addTag('<code class="proseCode">')
      next?.()
      builder.addTag('</code>')
    } else if (mark.type === MarkupMarkType.em) {
      builder.addTag('<em>')
      next?.()
      builder.addTag('</em>')
    } else if (mark.type === MarkupMarkType.link) {
      builder.addTag(`<a href=${attrs.href} target=${attrs.target}>`)
      next?.()
      builder.addTag('</a>')
    } else if (mark.type === MarkupMarkType.strike) {
      builder.addTag('<s>')
      next?.()
      builder.addTag('</s>')
    } else if (mark.type === MarkupMarkType.underline) {
      builder.addTag('<u>')
      next?.()
      builder.addTag('</u>')
    } else {
      builder.addTag(`unknown mark: "${mark.type as string}"`, false)
      next?.()
    }
  }
}

function addMarks (builder: NodeBuilder, marks: MarkupMark[], next?: () => void): void {
  if (marks.length > 0) {
    const mark = marks[0]
    const others = marks.slice(1)

    if (others.length > 0) {
      addMark(builder, mark, () => {
        addMarks(builder, others, next)
      })
    } else {
      addMark(builder, mark, next)
    }
  }
}

function addNodeContent (builder: NodeBuilder, node?: MarkupNode): void {
  if (node == null) return

  const attrs = node.attrs ?? {}
  const nodes = node.content ?? []

  if (node.type === MarkupNodeType.doc) {
    nodes.forEach((childNode) => {
      addNode(builder, childNode)
    })
  } else if (node.type === MarkupNodeType.text) {
    builder.addText(node.text ?? '')
  } else if (node.type === MarkupNodeType.paragraph) {
    builder.addTag('<p>')
    nodes.forEach((childNode) => {
      addNode(builder, childNode)
    })
    builder.addTag('</p>')
  } else if (node.type === MarkupNodeType.blockquote) {
    builder.addTag('<blockquote>')
    nodes.forEach((childNode) => {
      addNode(builder, childNode)
    })
    builder.addTag('</blockquote>')
  } else if (node.type === MarkupNodeType.horizontal_rule) {
    builder.addTag('<hr/>')
  } else if (node.type === MarkupNodeType.heading) {
    const level = toNumber(node.attrs?.level) ?? 1
    builder.addTag(`<h${level}>`)
    nodes.forEach((childNode) => {
      addNode(builder, childNode)
    })
    builder.addTag(`</h${level}>`)
  } else if (node.type === MarkupNodeType.code_block) {
    builder.addTag('<pre><code>')
    nodes.forEach((childNode) => {
      addNode(builder, childNode)
    })
    builder.addTag('</code></pre>')
  } else if (node.type === MarkupNodeType.image) {
    const src = toString(attrs.src)
    const alt = toString(attrs.alt)
    builder.addText(`<img src="${src}" alt="${alt}"/>`)
  } else if (node.type === MarkupNodeType.reference) {
    const label = toString(attrs.label)
    builder.addTag(
      `<span class="antiMention reference" data-type="reference" label="${attrs.label}" id="${attrs.id}" objectclass="${attrs.objectclass}">`
    )
    builder.addText(label !== undefined ? `@${label}` : '')
    builder.addTag('</span>')
  } else if (node.type === MarkupNodeType.hard_break) {
    builder.addTag('<br/>')
  } else if (node.type === MarkupNodeType.ordered_list) {
    builder.addTag('<ol>')
    nodes.forEach((childNode) => {
      addNode(builder, childNode)
    })
    builder.addTag('</ol>')
  } else if (node.type === MarkupNodeType.bullet_list) {
    builder.addTag('<ul>')
    nodes.forEach((childNode) => {
      addNode(builder, childNode)
    })
    builder.addTag('</ul>')
  } else if (node.type === MarkupNodeType.list_item) {
    builder.addTag('<li>')
    nodes.forEach((childNode) => {
      addNode(builder, childNode)
    })
    builder.addTag('</li>')
  } else if (node.type === MarkupNodeType.subLink) {
    builder.addTag('<sub>')
    nodes.forEach((childNode) => {
      addNode(builder, childNode)
    })
    builder.addTag('</sub>')
  } else if (node.type === MarkupNodeType.table) {
    builder.addTag('<table><tbody>')
    nodes.forEach((childNode) => {
      addNode(builder, childNode)
    })
    builder.addTag('</tbody></table>')
  } else if (node.type === MarkupNodeType.table_row) {
    builder.addTag('<tr>')
    nodes.forEach((childNode) => {
      addNode(builder, childNode)
    })
    builder.addTag('</tr>')
  } else if (node.type === MarkupNodeType.table_cell) {
    builder.addTag('<td>')
    nodes.forEach((childNode) => {
      addNode(builder, childNode)
    })
    builder.addTag('</td>')
  } else if (node.type === MarkupNodeType.table_header) {
    builder.addTag('<th>')
    nodes.forEach((childNode) => {
      addNode(builder, childNode)
    })
    builder.addTag('</th>')
  } else {
    builder.addText(`unknown node: "${node.type}"`)
    nodes.forEach((childNode) => {
      addNode(builder, childNode)
    })
  }
}

function addNode (builder: NodeBuilder, node: MarkupNode): void {
  const marks = node.marks ?? []

  if (marks.length > 0) {
    addMarks(builder, marks, () => {
      addNodeContent(builder, node)
    })
  } else {
    addNodeContent(builder, node)
  }
}

function toString (value: AttrValue | undefined): string | undefined {
  return value !== undefined ? `${value}` : undefined
}

function toNumber (value: AttrValue | undefined): number | undefined {
  if (typeof value === 'boolean') {
    return value ? 1 : 0
  }

  return value !== undefined ? (typeof value === 'string' ? parseInt(value) : value) : undefined
}

export function markupToHTML (markup: Markup): string {
  const jsonModel = markupToJSON(markup)
  const builder = new NodeBuilder(true)
  addNode(builder, jsonModel)
  return builder.toText()
}

export function markupToText (markup: Markup): string {
  const jsonModel = markupToJSON(markup)
  const builder = new NodeBuilder(false)
  addNode(builder, jsonModel)
  return builder.toText()
}
