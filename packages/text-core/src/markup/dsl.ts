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

import { MarkupMark, MarkupMarkType, MarkupNode, MarkupNodeType } from './model'

// Nodes

export function nodeDoc (...content: MarkupNode[]): MarkupNode {
  return node(MarkupNodeType.doc, ...content)
}

export function nodeParagraph (...content: MarkupNode[]): MarkupNode {
  return node(MarkupNodeType.paragraph, ...content)
}

export function nodeText (text: string): MarkupNode {
  return { type: MarkupNodeType.text, text }
}

export function nodeImage (attrs: { src: string, alt?: string, width?: number, height?: number }): MarkupNode {
  return { type: MarkupNodeType.image, attrs }
}

export function nodeReference (attrs: { id: string, label: string, objectclass: string }): MarkupNode {
  return { type: MarkupNodeType.reference, attrs }
}

// Marks

export function markBold (node: MarkupNode): MarkupNode {
  return withMarks(node, mark(MarkupMarkType.bold))
}

export function markCode (node: MarkupNode): MarkupNode {
  return withMarks(node, mark(MarkupMarkType.code))
}

export function markItalic (node: MarkupNode): MarkupNode {
  return withMarks(node, mark(MarkupMarkType.em))
}

export function markStrike (node: MarkupNode): MarkupNode {
  return withMarks(node, mark(MarkupMarkType.strike))
}

export function markUnderline (node: MarkupNode): MarkupNode {
  return withMarks(node, mark(MarkupMarkType.underline))
}

export function markLink (attrs: { href: string, title: string }, node: MarkupNode): MarkupNode {
  return withMarks(node, mark(MarkupMarkType.link, attrs))
}

// Utility

function node (type: MarkupNodeType, ...content: MarkupNode[]): MarkupNode {
  return { type, content }
}

function mark (type: MarkupMarkType, attrs?: Record<string, any>): MarkupMark {
  return { type, attrs: attrs ?? {} }
}

function withMarks (node: MarkupNode, ...marks: MarkupMark[]): MarkupNode {
  const current = node.marks ?? []
  current.push(...marks)

  return { ...node, marks: current }
}
