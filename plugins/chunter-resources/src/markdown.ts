//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { concatLink, type Markup } from '@hcengineering/core'
import {
  EmptyMarkup,
  jsonToMarkup,
  MarkupMarkType,
  markupToJSON,
  MarkupNodeType,
  type MarkupNode
} from '@hcengineering/text'
import { markdownToMarkup } from '@hcengineering/text-markdown'

const markdownSyntaxPatterns = [
  /^\s{0,3}(#{1,6}\s+\S|[-*+]\s+\S|\d+[.)]\s+\S|>\s+\S|```|~~~)/m,
  /^\s{0,3}([-*_]\s*){3,}$/m,
  /`[^`\n]+`/,
  /(\*\*|__)[^\n]+(\*\*|__)/,
  /(^|[^*])\*[^*\n]+\*(?!\*)/,
  /(^|[^_])_[^_\n]+_(?!_)/,
  /~~[^~\n]+~~/,
  /\[[^\]\n]+\]\([^)]+\)/
]

const plainNodeTypes = new Set<MarkupNodeType>([
  MarkupNodeType.doc,
  MarkupNodeType.paragraph,
  MarkupNodeType.text,
  MarkupNodeType.hard_break
])

const issueIdentifierPattern = /(^|[^A-Za-z0-9_/-])([A-Za-z][A-Za-z0-9_]{1,9}-\d+)(?=$|[^A-Za-z0-9_/-])/gi
const urlPattern = /\bhttps?:\/\/[^\s<>()]+/gi
const workbenchAppId = 'workbench'
const trackerAppId = 'tracker'

interface ChatDisplayMarkupOptions {
  issueHrefProvider?: (identifier: string) => string | undefined
}

export function toChatDisplayMarkup (markup: Markup | undefined, options: ChatDisplayMarkupOptions = {}): Markup {
  if (markup === undefined || markup === null || markup === '') {
    return EmptyMarkup
  }

  const node = markupToJSON(markup)
  if (!isPlainMarkup(node)) {
    return markup
  }

  const text = plainTextFromNode(node)
  const hasMarkdown = hasMarkdownSyntax(text)
  const hasIssueIdentifiers = hasIssueIdentifier(text)
  if (!hasMarkdown && !hasIssueIdentifiers) {
    return markup
  }

  try {
    const displayNode = hasMarkdown ? normalizeChatMarkdownNodes(markdownToMarkup(text)) : node
    return jsonToMarkup(linkIssueIdentifiers(displayNode, options.issueHrefProvider ?? getIssueHref))
  } catch {
    return markup
  }
}

function hasMarkdownSyntax (text: string): boolean {
  return markdownSyntaxPatterns.some((pattern) => pattern.test(text))
}

function hasIssueIdentifier (text: string): boolean {
  issueIdentifierPattern.lastIndex = 0
  const result = issueIdentifierPattern.test(text)
  issueIdentifierPattern.lastIndex = 0
  return result
}

function isPlainMarkup (node: MarkupNode): boolean {
  if (!plainNodeTypes.has(node.type)) {
    return false
  }

  if ((node.marks?.length ?? 0) > 0) {
    return false
  }

  return (node.content ?? []).every(isPlainMarkup)
}

function plainTextFromNode (node: MarkupNode): string {
  if (node.type === MarkupNodeType.text) {
    return node.text ?? ''
  }

  if (node.type === MarkupNodeType.hard_break) {
    return '\n'
  }

  const fragments = (node.content ?? []).map(plainTextFromNode)
  if (node.type === MarkupNodeType.doc) {
    return fragments.join('\n\n').trim()
  }

  if (node.type === MarkupNodeType.paragraph) {
    return fragments.join('')
  }

  return fragments.join('')
}

function linkIssueIdentifiers (
  node: MarkupNode,
  issueHrefProvider: (identifier: string) => string | undefined
): MarkupNode {
  const content = node.content
    ?.flatMap((child) => linkIssueIdentifierNodes(child, issueHrefProvider))
    .filter((child) => child.text !== '')

  return content !== undefined ? { ...node, content } : node
}

function linkIssueIdentifierNodes (
  node: MarkupNode,
  issueHrefProvider: (identifier: string) => string | undefined
): MarkupNode[] {
  if (node.type !== MarkupNodeType.text || node.text === undefined || shouldSkipIssueLinking(node)) {
    return [linkIssueIdentifiers(node, issueHrefProvider)]
  }

  return issueIdentifierTextNodes(node, issueHrefProvider)
}

function issueIdentifierTextNodes (
  node: MarkupNode,
  issueHrefProvider: (identifier: string) => string | undefined
): MarkupNode[] {
  const text = node.text ?? ''
  const nodes: MarkupNode[] = []
  const urlRanges = textRanges(text, urlPattern)
  let lastIndex = 0

  issueIdentifierPattern.lastIndex = 0
  for (let match = issueIdentifierPattern.exec(text); match !== null; match = issueIdentifierPattern.exec(text)) {
    const leading = match[1] ?? ''
    const identifier = match[2]
    const identifierStart = match.index + leading.length

    if (identifier === undefined) {
      continue
    }

    if (isInTextRanges(identifierStart, urlRanges)) {
      continue
    }

    appendTextNode(nodes, node, text.slice(lastIndex, identifierStart))

    const normalizedIdentifier = identifier.toUpperCase()
    const href = issueHrefProvider(normalizedIdentifier)
    appendTextNode(nodes, node, identifier, href, normalizedIdentifier)

    lastIndex = identifierStart + identifier.length
  }
  issueIdentifierPattern.lastIndex = 0

  appendTextNode(nodes, node, text.slice(lastIndex))
  return nodes.length > 0 ? nodes : [node]
}

function textRanges (text: string, pattern: RegExp): Array<[number, number]> {
  pattern.lastIndex = 0
  const ranges: Array<[number, number]> = []

  for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
    ranges.push([match.index, match.index + match[0].length])
  }
  pattern.lastIndex = 0

  return ranges
}

function isInTextRanges (index: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([start, end]) => index >= start && index < end)
}

function appendTextNode (
  nodes: MarkupNode[],
  source: MarkupNode,
  text: string,
  href?: string,
  title?: string
): void {
  if (text === '') {
    return
  }

  const marks = source.marks ?? []
  nodes.push({
    ...source,
    text,
    marks:
      href !== undefined && href !== ''
        ? [...marks, { type: MarkupMarkType.link, attrs: { href, title: title ?? text } }]
        : marks
  })
}

function shouldSkipIssueLinking (node: MarkupNode): boolean {
  return (node.marks ?? []).some((mark) => mark.type === MarkupMarkType.link || mark.type === MarkupMarkType.code)
}

function getIssueHref (identifier: string): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  const workspace = getCurrentWorkspace()
  if (workspace === undefined || workspace === '') {
    return undefined
  }

  const protocolAndHost = `${window.location.protocol}//${window.location.host}`
  const path = [workbenchAppId, workspace, trackerAppId, identifier].map(encodeURIComponent).join('/')
  return concatLink(protocolAndHost, path)
}

function getCurrentWorkspace (): string | undefined {
  return window.location.pathname.split('/').filter(Boolean).map(decodeURIComponent)[1]
}

function normalizeChatMarkdownNodes (node: MarkupNode): MarkupNode {
  const content = node.content?.map(normalizeChatMarkdownNodes)

  if (node.type === MarkupNodeType.todoList || node.type === MarkupNodeType.taskList) {
    return {
      type: MarkupNodeType.bullet_list,
      attrs: { bullet: '-' },
      content
    }
  }

  if (node.type === MarkupNodeType.todoItem || node.type === MarkupNodeType.taskItem) {
    return withChecklistMarker(node, content)
  }

  return content !== undefined ? { ...node, content } : node
}

function withChecklistMarker (node: MarkupNode, content: MarkupNode[] | undefined): MarkupNode {
  const marker = node.attrs?.checked === true ? '[x] ' : '[ ] '
  const nodes = content ?? []
  const first = nodes[0]

  if (first?.type === MarkupNodeType.paragraph) {
    return {
      type: MarkupNodeType.list_item,
      content: [
        {
          ...first,
          content: [{ type: MarkupNodeType.text, text: marker }, ...(first.content ?? [])]
        },
        ...nodes.slice(1)
      ]
    }
  }

  return {
    type: MarkupNodeType.list_item,
    content: [{ type: MarkupNodeType.paragraph, content: [{ type: MarkupNodeType.text, text: marker }] }, ...nodes]
  }
}
