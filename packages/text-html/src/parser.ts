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

import {
  type AttrValue,
  type MarkupMark,
  type MarkupNode,
  MarkupMarkType,
  MarkupNodeType
} from '@hcengineering/text-core'
import { Parser } from 'htmlparser2'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface HtmlParserOptions {}

interface HtmlTagHandler {
  handleOpenTag: (state: HtmlParseState, tag: string, attributes: Record<string, string>) => void
  handleCloseTag: (state: HtmlParseState, tag: string) => void
}

interface HtmlNodeRule {
  node: MarkupNodeType
  getAttrs?: Record<string, AttrValue> | ((attrs: Record<string, string>) => Record<string, AttrValue> | undefined)
  wrapNode?: boolean
  wrapContent?: boolean
}

interface HtmlMarkRule {
  mark: MarkupMarkType
  getAttrs?: Record<string, AttrValue> | ((attrs: Record<string, string>) => Record<string, AttrValue> | undefined)
}

interface HtmlSpecialRule {
  handleOpenTag: (state: HtmlParseState, tag: string, attributes: Record<string, string>) => void
  handleCloseTag: (state: HtmlParseState, tag: string) => void
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface HtmlIgnoreRule {}

interface HtmlStyleRule {
  style: string
  getAttrs?: (value: string) => Record<string, string> | undefined
}

class HtmlParseState {
  private readonly stack: MarkupNode[] = []
  private readonly marks: MarkupMark[] = []

  constructor (
    readonly root: MarkupNode,
    readonly handlers: Record<string, HtmlTagHandler>
  ) {
    this.stack.push(root)
  }

  top (): MarkupNode | undefined {
    return this.stack[this.stack.length - 1]
  }

  addText (text: string): void {
    const top = this.top()
    if (top === undefined || text.length === 0 || top.type === MarkupNodeType.doc) {
      return
    }

    const node: MarkupNode =
      this.marks.length > 0
        ? { type: MarkupNodeType.text, text, marks: [...this.marks] }
        : { type: MarkupNodeType.text, text }

    this.push(node)
  }

  openMark (mark: MarkupMarkType, attrs?: Record<string, AttrValue>): void {
    this.marks.push(attrs !== undefined ? { type: mark, attrs } : { type: mark })
  }

  closeMark (mark: MarkupMarkType): void {
    if (this.marks[this.marks.length - 1]?.type === mark) {
      this.marks.pop()
    }
  }

  openNode (node: MarkupNodeType, attrs?: Record<string, AttrValue>): void {
    this.stack.push(attrs !== undefined ? { type: node, attrs } : { type: node })
  }

  closeNode (node: MarkupNodeType): void {
    this.marks.splice(0)
    const info = this.stack.pop()
    if (info !== undefined) {
      this.push(info)
    }
  }

  addNode (node: MarkupNode): void {
    this.push(node)
  }

  push (node: MarkupNode): void {
    const parent = this.top()
    if (parent !== undefined) {
      const content = parent.content ?? []
      content.push(node)
      parent.content = content
    }
  }
}

function nodeHandler ({ node, getAttrs, wrapContent, wrapNode }: HtmlNodeRule): HtmlTagHandler {
  const wrapStack: boolean[] = []

  return {
    handleOpenTag: (state: HtmlParseState, tag: string, attributes: Record<string, string>) => {
      const attrs =
        typeof getAttrs === 'function'
          ? getAttrs(attributes)
          : typeof getAttrs === 'object'
            ? { ...getAttrs }
            : undefined

      const shouldWrapNode = wrapNode === true && state.top()?.type !== MarkupNodeType.paragraph

      if (shouldWrapNode) {
        state.openNode(MarkupNodeType.paragraph)
      }
      wrapStack.push(shouldWrapNode)

      state.openNode(node, attrs)

      if (wrapContent === true) {
        state.openNode(MarkupNodeType.paragraph)
      }
    },
    handleCloseTag: (state: HtmlParseState, tag: string) => {
      if (wrapContent === true && state.top()?.type === MarkupNodeType.paragraph) {
        state.closeNode(MarkupNodeType.paragraph)
      }

      state.closeNode(node)
      if (wrapStack.pop() === true) {
        state.closeNode(MarkupNodeType.paragraph)
      }
    }
  }
}

function markHandler ({ mark, getAttrs }: HtmlMarkRule): HtmlTagHandler {
  return {
    handleOpenTag: (state: HtmlParseState, tag: string, attributes: Record<string, string>) => {
      const attrs =
        typeof getAttrs === 'function'
          ? getAttrs(attributes)
          : typeof getAttrs === 'object'
            ? { ...getAttrs }
            : undefined
      state.openMark(mark, attrs)
    },
    handleCloseTag: (state: HtmlParseState, tag: string) => {
      state.closeMark(mark)
    }
  }
}

function ignoreHandler (rule: HtmlIgnoreRule): HtmlTagHandler {
  return {
    handleOpenTag: () => {},
    handleCloseTag: () => {}
  }
}

function specialHandler (rule: HtmlSpecialRule): HtmlTagHandler {
  return {
    handleOpenTag: (state: HtmlParseState, tag: string, attributes: Record<string, string>) => {
      rule.handleOpenTag(state, tag, attributes)
    },
    handleCloseTag: (state: HtmlParseState, tag: string) => {
      rule.handleCloseTag(state, tag)
    }
  }
}

const styleRules: HtmlStyleRule[] = [
  {
    style: 'text-align',
    getAttrs: (value: string) => {
      return { textAlign: value ?? null }
    }
  }
]

const markRules: Record<string, HtmlMarkRule> = {
  b: {
    mark: MarkupMarkType.bold
  },
  em: {
    mark: MarkupMarkType.em
  },
  i: {
    mark: MarkupMarkType.em
  },
  s: {
    mark: MarkupMarkType.strike
  },
  strong: {
    mark: MarkupMarkType.bold
  },
  u: {
    mark: MarkupMarkType.underline
  }
}

const nodeRules: Record<string, HtmlNodeRule> = {
  h1: {
    node: MarkupNodeType.heading,
    getAttrs: (attributes: Record<string, string>) => {
      return {
        level: 1,
        textAlign: attributes.textAlign ?? null
      }
    }
  },
  h2: {
    node: MarkupNodeType.heading,
    getAttrs: (attributes: Record<string, string>) => {
      return {
        level: 2,
        textAlign: attributes.textAlign ?? null
      }
    }
  },
  h3: {
    node: MarkupNodeType.heading,
    getAttrs: (attributes: Record<string, string>) => {
      return {
        level: 3,
        textAlign: attributes.textAlign ?? null
      }
    }
  },
  h4: {
    node: MarkupNodeType.heading,
    getAttrs: (attributes: Record<string, string>) => {
      return {
        level: 4,
        textAlign: attributes.textAlign ?? null
      }
    }
  },
  h5: {
    node: MarkupNodeType.heading,
    getAttrs: (attributes: Record<string, string>) => {
      return {
        level: 5,
        textAlign: attributes.textAlign ?? null
      }
    }
  },
  h6: {
    node: MarkupNodeType.heading,
    getAttrs: (attributes: Record<string, string>) => {
      return {
        level: 6,
        textAlign: attributes.textAlign ?? null
      }
    }
  },
  blockquote: {
    node: MarkupNodeType.blockquote
  },
  pre: {
    node: MarkupNodeType.code_block
  },
  hr: {
    node: MarkupNodeType.horizontal_rule
  },
  br: {
    node: MarkupNodeType.hard_break
  },
  ol: {
    node: MarkupNodeType.ordered_list,
    getAttrs: (attributes: Record<string, string>) => {
      return {
        start: parseInt(attributes.starts ?? '1')
      }
    }
  },
  ul: {
    node: MarkupNodeType.bullet_list
  },
  li: {
    node: MarkupNodeType.list_item
  },
  img: {
    node: MarkupNodeType.image,
    wrapNode: true,
    getAttrs: (attributes: Record<string, string>) => {
      return {
        src: attributes.src,
        alt: attributes.alt,
        title: attributes.title ?? null,
        width: attributes.width !== undefined ? parseInt(attributes.width) : undefined,
        height: attributes.height !== undefined ? parseInt(attributes.height) : undefined,
        'file-id': attributes['file-id'] ?? null
      }
    }
  },
  sub: {
    node: MarkupNodeType.subLink
  },
  table: {
    node: MarkupNodeType.table
  },
  tr: {
    node: MarkupNodeType.table_row
  },
  th: {
    node: MarkupNodeType.table_header,
    getAttrs: (attributes: Record<string, string>) => {
      return {
        colspan: attributes.colspan !== undefined ? parseInt(attributes.colspan) : undefined,
        rowspan: attributes.rowspan !== undefined ? parseInt(attributes.rowspan) : undefined,
        colwidth: attributes.colwidth !== undefined ? parseInt(attributes.colwidth) : undefined
      }
    },
    wrapContent: true
  },
  td: {
    node: MarkupNodeType.table_cell,
    getAttrs: (attributes: Record<string, string>) => {
      return {
        colspan: attributes.colspan !== undefined ? parseInt(attributes.colspan) : undefined,
        rowspan: attributes.rowspan !== undefined ? parseInt(attributes.rowspan) : undefined,
        colwidth: attributes.colwidth !== undefined ? parseInt(attributes.colwidth) : undefined
      }
    },
    wrapContent: true
  },
  comment: {
    node: MarkupNodeType.comment
  }
}

const specialRules: Record<string, HtmlSpecialRule> = {
  p: {
    handleOpenTag: (state: HtmlParseState, tag: string, attributes: Record<string, string>) => {
      const top = state.top()
      if (top?.type !== MarkupNodeType.paragraph) {
        const attrs = { textAlign: attributes.textAlign ?? null }
        state.openNode(MarkupNodeType.paragraph, attrs)
      }
    },
    handleCloseTag: (state: HtmlParseState, tag: string) => {
      const top = state.top()
      if (top?.type === MarkupNodeType.paragraph) {
        state.closeNode(MarkupNodeType.paragraph)
      }
    }
  },
  span: {
    handleOpenTag: (state: HtmlParseState, tag: string, attributes: Record<string, string>) => {
      const dataType = attributes['data-type']
      if (dataType === 'reference') {
        state.openNode(MarkupNodeType.reference, {
          id: attributes['data-id'],
          objectclass: attributes['data-objectclass'],
          label: attributes['data-label']
        })
      }
    },
    handleCloseTag: (state: HtmlParseState, tag: string) => {
      const top = state.top()
      if (top?.type === MarkupNodeType.reference) {
        delete top.content
        state.closeNode(MarkupNodeType.reference)
      }
    }
  },
  code: {
    handleOpenTag: (state: HtmlParseState, tag: string, attributes: Record<string, string>) => {
      const top = state.top()
      if (top?.type === MarkupNodeType.code_block) {
        const classes = attributes.class?.split(' ') ?? []
        const language = classes.find((c) => c.startsWith('language-'))
        if (language !== undefined) {
          top.attrs = { language: language.substring(9) }
        }
      } else {
        state.openMark(MarkupMarkType.code)
      }
    },
    handleCloseTag: (state: HtmlParseState, tag: string) => {
      const top = state.top()
      if (top?.type === MarkupNodeType.code_block) {
        // do nothing
      } else {
        state.closeMark(MarkupMarkType.code)
      }
    }
  },
  a: {
    handleOpenTag: (state: HtmlParseState, tag: string, attributes: Record<string, string>) => {
      const dataType = attributes['data-type']
      if (dataType === 'embed') {
        state.openNode(MarkupNodeType.embed, {
          src: decodeURI(attributes.href)
        })
      } else {
        state.openMark(MarkupMarkType.link, {
          rel: attributes.rel,
          target: attributes.target,
          class: attributes.class,
          href: attributes.href,
          title: attributes.title
        })
      }
    },
    handleCloseTag: (state: HtmlParseState, tag: string) => {
      const top = state.top()
      if (top?.type === MarkupNodeType.embed) {
        delete top.content
        state.closeNode(MarkupNodeType.embed)
      } else {
        state.closeMark(MarkupMarkType.link)
      }
    }
  }
}

const ignoreRules: Record<string, HtmlIgnoreRule> = {
  html: {},
  head: {},
  body: {},
  thead: {},
  tbody: {}
}

export class HtmlParser {
  private readonly handlers: Record<string, HtmlTagHandler> = {}

  constructor (private readonly options: HtmlParserOptions = {}) {
    Object.entries(nodeRules).forEach(([tag, rule]) => {
      this.handlers[tag] = nodeHandler(rule)
    })

    Object.entries(markRules).forEach(([tag, rule]) => {
      this.handlers[tag] = markHandler(rule)
    })

    Object.entries(specialRules).forEach(([tag, rule]) => {
      this.handlers[tag] = specialHandler(rule)
    })

    Object.entries(ignoreRules).forEach(([tag, rule]) => {
      this.handlers[tag] = ignoreHandler(rule)
    })
  }

  parse (html: string): MarkupNode {
    const root: MarkupNode = { type: MarkupNodeType.doc, content: [] }
    const state = new HtmlParseState(root, this.handlers)

    let rawPos: number | undefined
    let rawDepth: number | undefined

    const parser = new Parser(
      {
        onopentag (tag: string, attributes: Record<string, string>) {
          if (rawDepth !== undefined) {
            rawDepth += 1
            return
          }

          if (attributes.style !== undefined) {
            const attrs = extractStyleAttrs(attributes, styleRules)
            if (attrs !== undefined) {
              attributes = { ...attributes, ...attrs }
            }
          }

          const handler = state.handlers[tag]
          if (handler !== undefined) {
            handler.handleOpenTag(state, tag, attributes)
          } else {
            rawPos = parser.startIndex
            rawDepth = 0
          }
        },

        ontext (text: string) {
          if (rawDepth !== undefined) {
            return
          }

          if (text.length === 0) {
            return
          }

          state.addText(text)
        },

        oncomment (text: string) {
          if (rawDepth !== undefined) {
            return
          }

          state.openNode(MarkupNodeType.comment)
          state.addText(text)
          state.closeNode(MarkupNodeType.comment)
        },

        onclosetag (tag: string) {
          if (rawDepth !== undefined) {
            rawDepth -= 1

            if (rawDepth === 0) {
              const start = rawPos ?? 0
              const end = parser.endIndex
              const text = html.substring(start, end)
              state.addText(text)
              rawPos = undefined
              rawDepth = undefined
            }
            return
          }

          const handler = state.handlers[tag]
          if (handler !== undefined) {
            handler.handleCloseTag(state, tag)
          } else {
            // do nothing
          }
        }
      },
      {
        decodeEntities: true,
        lowerCaseTags: true,
        recognizeSelfClosing: true
      }
    )

    parser.write(html)
    parser.end()

    return state.root
  }
}

function extractStyleAttrs (attrs: Record<string, string>, rules: HtmlStyleRule[]): Record<string, string> | undefined {
  const style = attrs.style
  if (style !== undefined) {
    const styles: Record<string, string> = {}

    // parse style attribute
    style.split(';').forEach((stylePart) => {
      const [key, value] = stylePart.split(':')
      styles[key.trim()] = value?.trim()
    })

    const result = {}

    rules.forEach((rule) => {
      if (styles[rule.style] !== undefined) {
        const attrs = rule.getAttrs?.(styles[rule.style])
        if (attrs !== undefined) {
          Object.assign(result, attrs)
        }
      }
    })

    return result
  }
}
