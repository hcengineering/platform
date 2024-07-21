import { Extensions } from '@tiptap/core'
import MarkdownIt, { type Token } from 'markdown-it'
import type { RuleCore } from 'markdown-it/lib/parser_core'
import type StateCore from 'markdown-it/lib/rules_core/state_core'

import { addToSet, removeFromSet, sameSet } from './marks'
import { messageContent } from './node'
import { Attrs, AttrValue, MarkupMark, MarkupMarkType, MarkupNode, MarkupNodeType } from '../markup/model'
import { htmlToJSON } from '../markup/utils'

interface ParsingBlockRule {
  block: MarkupNodeType
  getAttrs?: (tok: Token, state: MarkdownParseState) => Attrs
  wrapContent?: boolean
  noCloseToken?: boolean
}

interface ParsingNodeRule {
  node: MarkupNodeType
  getAttrs?: (tok: Token, state: MarkdownParseState) => Attrs
}

interface ParsingMarkRule {
  mark: MarkupMarkType
  getAttrs?: (tok: Token, state: MarkdownParseState) => Attrs
  noCloseToken?: boolean
}

interface ParsingSpecialRule {
  type: (state: MarkdownParseState, tok: Token) => { type: MarkupMarkType | MarkupNodeType, node: boolean }
  getAttrs?: (tok: Token, state: MarkdownParseState) => Attrs
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ParsingIgnoreRule {
  // empty
}

type HandlerRecord = (state: MarkdownParseState, tok: Token) => void
type HandlersRecord = Record<string, HandlerRecord>

// ****************************************************************
// Mark down parser
// ****************************************************************
function isText (a: MarkupNode, b: MarkupNode): boolean {
  return (a.type === MarkupNodeType.text || a.type === MarkupNodeType.reference) && b.type === MarkupNodeType.text
}
function maybeMerge (a: MarkupNode, b: MarkupNode): MarkupNode | undefined {
  if (isText(a, b) && (sameSet(a.marks, b.marks) || (a.text === '' && (a.marks?.length ?? 0) === 0))) {
    if (a.text === '' && (a.marks?.length ?? 0) === 0) {
      return { ...b }
    }
    return { ...a, text: (a.text ?? '') + (b.text ?? '') }
  }
  return undefined
}

interface StateElement {
  type: MarkupNodeType
  content: MarkupNode[]
  attrs: Attrs
}

// Object used to track the context of a running parse.
class MarkdownParseState {
  stack: StateElement[]
  marks: MarkupMark[]
  tokenHandlers: Record<string, (state: MarkdownParseState, tok: Token) => void>

  constructor (
    tokenHandlers: Record<string, (state: MarkdownParseState, tok: Token) => void>,
    readonly refUrl: string,
    readonly imageUrl: string
  ) {
    this.stack = [{ type: MarkupNodeType.doc, attrs: {}, content: [] }]
    this.marks = []
    this.tokenHandlers = tokenHandlers
  }

  top (): StateElement | undefined {
    return this.stack[this.stack.length - 1]
  }

  push (elt: MarkupNode): void {
    if (this.stack.length > 0) {
      const tt = this.top()
      tt?.content.push(elt)
    }
  }

  mergeWithLast (nodes: MarkupNode[], node: MarkupNode): boolean {
    const last = nodes[nodes.length - 1]
    let merged: MarkupNode | undefined
    if (last !== undefined && (merged = maybeMerge(last, node)) !== undefined) {
      nodes[nodes.length - 1] = merged
      return true
    }
    return false
  }

  // : (string)
  // Adds the given text to the current position in the document,
  // using the current marks as styling.
  addText (text?: string): void {
    const top = this.top()
    if (text === undefined || top === undefined || text.length === 0) {
      return
    }

    const node: MarkupNode = {
      type: MarkupNodeType.text,
      text
    }
    if (this.marks !== undefined) {
      node.marks = this.marks
    }

    const nodes = top.content

    if (!this.mergeWithLast(nodes, node)) {
      nodes.push(node)
    }
  }

  addAttr (key: string, value: AttrValue): void {
    const top = this.top()
    if (top === undefined) {
      return
    }

    top.attrs[key] = value
  }

  // : (Mark)
  // Adds the given mark to the set of active marks.
  openMark (mark: MarkupMark): void {
    this.marks = addToSet(mark, this.marks)
  }

  // : (Mark)
  // Removes the given mark from the set of active marks.
  closeMark (mark: MarkupMarkType): void {
    this.marks = removeFromSet(mark, this.marks)
  }

  parseTokens (toks: Token[] | null): void {
    const _toks = [...(toks ?? [])]
    while (_toks.length > 0) {
      const tok = _toks.shift()
      if (tok === undefined) {
        break
      }
      // Check if we need to merge some content into
      // Merge <sub> </sub> into one html token
      if (tok.type === 'html_inline' && tok.content.trim() === '<sub>') {
        while (_toks.length > 0) {
          const _tok = _toks.shift()
          if (_tok !== undefined) {
            tok.content += _tok.content
            if (_tok.type === 'html_inline' && _tok.content.trim() === '</sub>') {
              break
            }
          }
        }
      }

      const handler = this.tokenHandlers[tok.type]
      if (handler === undefined) {
        throw new Error(`Token type '${String(tok.type)} not supported by Markdown parser`)
      }
      handler(this, tok)
    }
  }

  // : (NodeType, ?Object, ?[Node]) → ?Node
  // Add a node at the current position.
  addNode (type: MarkupNodeType, attrs: Attrs, content: MarkupNode[] = []): MarkupNode {
    const node: MarkupNode = { type, content }

    if (Object.keys(attrs ?? {}).length > 0) {
      node.attrs = attrs
    }
    if (this.marks.length > 0) {
      node.marks = this.marks
    }
    this.push(node)
    return node
  }

  // : (NodeType, ?Object)
  // Wrap subsequent content in a node of the given type.
  openNode (type: MarkupNodeType, attrs: Attrs): void {
    this.stack.push({ type, attrs, content: [] })
  }

  // : () → ?Node
  // Close and return the node that is currently on top of the stack.
  closeNode (): MarkupNode {
    if (this.marks.length > 0) this.marks = []
    const info = this.stack.pop()
    if (info !== undefined) {
      return this.addNode(info.type, info.attrs, info.content)
    }
    return { type: MarkupNodeType.doc }
  }
}

function attrs (
  spec: ParsingBlockRule | ParsingMarkRule | ParsingNodeRule,
  token: Token,
  state: MarkdownParseState
): Attrs {
  return spec.getAttrs?.(token, state) ?? {}
}

// Code content is represented as a single token with a `content`
// property in Markdown-it.
function noCloseToken (spec: ParsingBlockRule | ParsingMarkRule, type: string): boolean {
  return (spec.noCloseToken ?? false) || ['code_inline', 'code_block', 'fence'].indexOf(type) > 0
}

function withoutTrailingNewline (str: string): string {
  return str[str.length - 1] === '\n' ? str.slice(0, str.length - 1) : str
}

function addSpecBlock (handlers: HandlersRecord, spec: ParsingBlockRule, type: string, specBlock: MarkupNodeType): void {
  if (noCloseToken(spec, type)) {
    handlers[type] = newSimpleBlockHandler(specBlock, spec)
  } else {
    handlers[type + '_open'] = (state, tok) => {
      state.openNode(specBlock, attrs(spec, tok, state))
      if (spec.wrapContent === true) {
        state.openNode(MarkupNodeType.paragraph, {})
      }
    }
    handlers[type + '_close'] = (state) => {
      if (spec.wrapContent === true) {
        state.closeNode()
      }
      state.closeNode()
    }
  }
}
function newSimpleBlockHandler (specBlock: MarkupNodeType, spec: ParsingBlockRule): HandlerRecord {
  return (state, tok) => {
    state.openNode(specBlock, attrs(spec, tok, state))
    state.addText(withoutTrailingNewline(tok.content))
    state.closeNode()
  }
}

function addSpecMark (handlers: HandlersRecord, spec: ParsingMarkRule, type: string, specMark: MarkupMarkType): void {
  if (noCloseToken(spec, type)) {
    handlers[type] = newSimpleMarkHandler(spec, specMark)
  } else {
    handlers[type + '_open'] = (state, tok) => {
      state.openMark({ type: specMark, attrs: attrs(spec, tok, state) })
    }
    handlers[type + '_close'] = (state) => {
      state.closeMark(specMark)
    }
  }
}
function addSpecialRule (handlers: HandlersRecord, spec: ParsingSpecialRule, type: string): void {
  handlers[type + '_open'] = (state, tok) => {
    const type = spec.type(state, tok)
    if (type.node) {
      state.openNode(type.type as MarkupNodeType, spec.getAttrs?.(tok, state) ?? {})
    } else {
      state.openMark({ type: type.type as MarkupMarkType, attrs: spec.getAttrs?.(tok, state) ?? {} })
    }
  }
  handlers[type + '_close'] = (state, tok) => {
    const type = spec.type(state, tok)
    if (type.node) {
      state.closeNode()
    } else {
      state.closeMark(type.type as MarkupMarkType)
    }
  }
}
function addIgnoreRule (handlers: HandlersRecord, spec: ParsingIgnoreRule, type: string): void {
  handlers[type + '_open'] = (state, tok) => {}
  handlers[type + '_close'] = (state, tok) => {}
}
function newSimpleMarkHandler (spec: ParsingMarkRule, specMark: MarkupMarkType): HandlerRecord {
  return (state: MarkdownParseState, tok: Token): void => {
    state.openMark({ attrs: attrs(spec, tok, state), type: specMark })
    state.addText(withoutTrailingNewline(tok.content))
    state.closeMark(specMark)
  }
}

function tokenHandlers (
  tokensBlock: Record<string, ParsingBlockRule>,
  tokensNode: Record<string, ParsingNodeRule>,
  tokensMark: Record<string, ParsingMarkRule>,
  specialRules: Record<string, ParsingSpecialRule>,
  ignoreRules: Record<string, ParsingIgnoreRule>,
  extensions: Extensions
): HandlersRecord {
  const handlers: HandlersRecord = {}

  Object.entries(tokensBlock).forEach(([type, spec]) => {
    addSpecBlock(handlers, spec, type, spec.block)
  })
  Object.entries(tokensNode).forEach(([type, spec]) => {
    addSpecNode(handlers, type, spec)
  })
  Object.entries(tokensMark).forEach(([type, spec]) => {
    addSpecMark(handlers, spec, type, spec.mark)
  })
  Object.entries(specialRules).forEach(([type, spec]) => {
    addSpecialRule(handlers, spec, type)
  })
  Object.entries(ignoreRules).forEach(([type, spec]) => {
    addIgnoreRule(handlers, spec, type)
  })

  handlers.html_inline = (state: MarkdownParseState, tok: Token) => {
    try {
      const model = htmlToJSON(tok.content, extensions)
      if (model.content !== undefined) {
        // unwrap content from wrapping paragraph
        const shouldUnwrap =
          model.content.length === 1 &&
          model.content[0].type === MarkupNodeType.paragraph &&
          state.top()?.type === MarkupNodeType.paragraph

        const content = messageContent(shouldUnwrap ? model.content[0] : model)
        for (const c of content) {
          state.push(c)
        }
      }
    } catch (err: any) {
      console.error(err)
      state.addText(tok.content)
    }
  }
  handlers.html_block = (state: MarkdownParseState, tok: Token) => {
    try {
      const model = htmlToJSON(tok.content, extensions)
      const content = messageContent(model)
      for (const c of content) {
        state.push(c)
      }
    } catch (err: any) {
      console.error(err)
      state.addText(tok.content)
    }
  }

  addTextHandlers(handlers)

  return handlers
}

function addTextHandlers (handlers: HandlersRecord): void {
  handlers.text = (state, tok) => {
    state.addText(tok.content)
  }
  handlers.inline = (state, tok) => {
    state.parseTokens(tok.children)
  }
  handlers.softbreak = (state) => {
    state.addText('\n')
  }
}

function addSpecNode (handlers: HandlersRecord, type: string, spec: ParsingNodeRule): void {
  handlers[type] = (state: MarkdownParseState, tok: Token) => state.addNode(spec.node, attrs(spec, tok, state))
}

function tokAttrGet (token: Token, name: string): string | undefined {
  const attr = token.attrGet(name)
  if (attr != null) {
    return attr
  }
  // try iterate attrs
  for (const [k, v] of token.attrs ?? []) {
    if (k === name) {
      return v
    }
  }
}

function tokToAttrs (token: Token, ...names: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const name of names) {
    const attr = token.attrGet(name)
    if (attr !== null) {
      result[name] = attr
    }
  }
  return result
}

function todoItemMetaAttrsGet (tok: Token): Record<string, string> {
  const userid = tokAttrGet(tok, 'userid')
  const todoid = tokAttrGet(tok, 'todoid')

  const result: Record<string, string> = {}

  if (userid !== undefined) {
    result.userid = userid
  }
  if (todoid !== undefined) {
    result.todoid = todoid
  }

  return result
}

// ::- A configuration of a Markdown parser. Such a parser uses
const tokensBlock: Record<string, ParsingBlockRule> = {
  blockquote: { block: MarkupNodeType.blockquote },
  paragraph: { block: MarkupNodeType.paragraph },
  list_item: { block: MarkupNodeType.list_item },
  task_item: { block: MarkupNodeType.taskItem, getAttrs: (tok) => ({ 'data-type': 'taskItem' }) },
  bullet_list: { block: MarkupNodeType.bullet_list },
  todo_list: { block: MarkupNodeType.todoList },
  todo_item: {
    block: MarkupNodeType.todoItem,
    getAttrs: (tok) => ({
      checked: tokAttrGet(tok, 'checked') === 'true',
      ...todoItemMetaAttrsGet(tok)
    })
  },
  ordered_list: {
    block: MarkupNodeType.ordered_list,
    getAttrs: (tok: Token) => ({ order: tokAttrGet(tok, 'start') ?? '1' })
  },
  task_list: {
    block: MarkupNodeType.taskList,
    getAttrs: (tok: Token) => ({ order: tokAttrGet(tok, 'start') ?? '1', 'data-type': 'taskList' })
  },
  heading: {
    block: MarkupNodeType.heading,
    getAttrs: (tok: Token) => ({ level: Number(tok.tag.slice(1)) })
  },
  code_block: {
    block: MarkupNodeType.code_block,
    getAttrs: (tok: Token) => {
      return { language: tok.info ?? '' }
    },
    noCloseToken: true
  },
  fence: {
    block: MarkupNodeType.code_block,
    getAttrs: (tok: Token) => {
      return { language: tok.info ?? '' }
    },
    noCloseToken: true
  },
  sub: {
    block: MarkupNodeType.code_block,
    getAttrs: (tok: Token) => {
      return { language: tok.info ?? '' }
    },
    noCloseToken: false
  },
  table: {
    block: MarkupNodeType.table,
    noCloseToken: false
  },
  th: {
    block: MarkupNodeType.table_header,
    getAttrs: (tok: Token) => {
      return {
        colspan: Number(tok.attrGet('colspan') ?? '1'),
        rowspan: Number(tok.attrGet('rowspan') ?? '1')
      }
    },
    wrapContent: true,
    noCloseToken: false
  },
  tr: {
    block: MarkupNodeType.table_row,
    noCloseToken: false
  },
  td: {
    block: MarkupNodeType.table_cell,
    getAttrs: (tok: Token) => {
      return {
        colspan: Number(tok.attrGet('colspan') ?? '1'),
        rowspan: Number(tok.attrGet('rowspan') ?? '1')
      }
    },
    wrapContent: true,
    noCloseToken: false
  }
}
const tokensNode: Record<string, ParsingNodeRule> = {
  hr: { node: MarkupNodeType.horizontal_rule },
  image: {
    node: MarkupNodeType.image,
    getAttrs: (tok: Token, state) => {
      const result = tokToAttrs(tok, 'src', 'title', 'alt', 'data')
      if (tok.content !== '' && (result.alt === '' || result.alt == null)) {
        result.alt = tok.content
      }
      if (result.src.startsWith(state.imageUrl)) {
        const url = new URL(result.src)
        result['data-type'] = 'image'
        const file = url.searchParams.get('file')
        if (file != null) {
          result['file-id'] = file
        }

        const width = url.searchParams.get('width')
        if (width != null) {
          result.width = width
        }

        const height = url.searchParams.get('height')
        if (height != null) {
          result.height = height
        }
      }
      return result
    }
  },
  hardbreak: { node: MarkupNodeType.hard_break }
}
const tokensMark: Record<string, ParsingMarkRule> = {
  em: { mark: MarkupMarkType.em },
  bold: { mark: MarkupMarkType.bold },
  strong: { mark: MarkupMarkType.bold },
  s: { mark: MarkupMarkType.strike },
  u: { mark: MarkupMarkType.underline },
  code_inline: {
    mark: MarkupMarkType.code,
    noCloseToken: true
  }
}

const specialRule: Record<string, ParsingSpecialRule> = {
  link: {
    type: (state, tok) => {
      const href = tok.attrGet('href')
      if ((href?.startsWith(state.refUrl) ?? false) || state.stack[state.stack.length - 1]?.type === 'reference') {
        return { type: MarkupNodeType.reference, node: true }
      }
      return { type: MarkupMarkType.link, node: false, close: true }
    },
    getAttrs: (tok: Token, state) => {
      const attrs = tokToAttrs(tok, 'href', 'title')
      if (attrs.href !== undefined) {
        try {
          const url = new URL(attrs.href)
          if (attrs.href.startsWith(state.refUrl) ?? false) {
            return {
              label: url.searchParams?.get('label') ?? '',
              id: url.searchParams?.get('_id') ?? '',
              objectclass: url.searchParams?.get('_class') ?? ''
            }
          }
        } catch (err: any) {
          // ignore
        }
      }
      return attrs
    }
  }
}

const ignoreRule: Record<string, ParsingIgnoreRule> = {
  thead: {},
  tbody: {}
}

export const isInlineToken = (token?: Token): boolean => token?.type === 'inline'

export const isParagraphToken = (token?: Token): boolean => token?.type === 'paragraph_open'

export const isListItemToken = (token?: Token): boolean => token?.type === 'list_item_open'

export interface TaskListEnv {
  tasklists: number
}

interface TaskListStateCore extends StateCore {
  env: TaskListEnv
}

// The leading whitespace in a list item (token.content) is already trimmed off by markdown-it.
// The regex below checks for '[ ] ' or '[x] ' or '[X] ' at the start of the string token.content,
// where the space is either a normal space or a non-breaking space (character 160 = \u00A0).
const startsWithTodoMarkdown = (token: Token): boolean => /^\[[xX \u00A0]\][ \u00A0]/.test(token.content)
const isCheckedTodoItem = (token: Token): boolean => /^\[[xX]\][ \u00A0]/.test(token.content)

const isTodoListItemInline = (tokens: Token[], index: number): boolean =>
  isInlineToken(tokens[index]) &&
  isParagraphToken(tokens[index - 1]) &&
  isListItemToken(tokens[index - 2]) &&
  startsWithTodoMarkdown(tokens[index])

export class MarkdownParser {
  tokenizer: MarkdownIt
  tokenHandlers: Record<string, (state: MarkdownParseState, tok: Token) => void>

  constructor (
    readonly extensions: Extensions,
    readonly refUrl: string,
    readonly imageUrl: string
  ) {
    this.tokenizer = MarkdownIt('default', {
      html: true
    })
    this.tokenizer.core.ruler.after('inline', 'task_list', this.taskListRule)

    this.tokenHandlers = tokenHandlers(tokensBlock, tokensNode, tokensMark, specialRule, ignoreRule, extensions)
  }

  parse (text: string): MarkupNode {
    const state = new MarkdownParseState(this.tokenHandlers, this.refUrl, this.imageUrl)
    let doc: MarkupNode

    const tokens = this.tokenizer.parse(text, {})

    state.parseTokens(tokens)
    do {
      doc = state.closeNode()
    } while (state.stack.length > 0)
    return doc
  }

  taskListRule: RuleCore = (state: TaskListStateCore): boolean => {
    const tokens = state.tokens

    interface TodoListItemDescriptor {
      start?: number
      end?: number
    }

    let todoListStartIdx: number | undefined
    let todoListItems: TodoListItemDescriptor[] = []
    let todoListItem: TodoListItemDescriptor | undefined
    let isTodoList = false
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === 'bullet_list_open') {
        todoListStartIdx = i
        isTodoList = true
      }

      if (tokens[i].type === 'list_item_open') {
        todoListItem = {
          start: i
        }
      }

      if (tokens[i].type === 'inline') {
        if (todoListItem === undefined || !isTodoListItemInline(tokens, i)) {
          isTodoList = false
        }
      }

      if (tokens[i].type === 'list_item_close' && todoListItem !== undefined) {
        todoListItem.end = i
        if (isTodoList) {
          todoListItems.push(todoListItem)
        }
        todoListItem = undefined
      }

      if (tokens[i].type === 'bullet_list_close') {
        if (isTodoList && todoListStartIdx !== undefined) {
          // Transform tokens
          tokens[todoListStartIdx].type = 'todo_list_open'
          tokens[i].type = 'todo_list_close'

          for (const item of todoListItems) {
            if (item.start !== undefined && item.end !== undefined) {
              tokens[item.start].type = 'todo_item_open'
              tokens[item.end].type = 'todo_item_close'

              const inline = tokens[item.start + 2]

              if (tokens[item.start].attrs == null) {
                tokens[item.start].attrs = []
              }

              if (isCheckedTodoItem(inline)) {
                ;(tokens[item.start].attrs as any).push(['checked', 'true'])
              }

              if (inline.children !== null) {
                const newContent = inline.children[0].content.slice(4)
                if (newContent.length > 0) {
                  inline.children[0].content = newContent
                } else {
                  inline.children = inline.children.slice(1)
                }

                const metaTok = inline.children.find(
                  (tok) => tok.type === 'html_inline' && tok.content.startsWith('<!--') && tok.content.endsWith('-->')
                )
                if (metaTok !== undefined) {
                  const metaValues = metaTok.content.slice(5, -4).split(',')
                  for (const mv of metaValues) {
                    if (mv.startsWith('todoid')) {
                      ;(tokens[item.start].attrs as any).push(['todoid', mv.slice(7)])
                    }
                    if (mv.startsWith('userid')) {
                      ;(tokens[item.start].attrs as any).push(['userid', mv.slice(7)])
                    }
                  }
                }
              }
            }
          }
        }

        todoListStartIdx = undefined
        todoListItems = []
        isTodoList = false
      }
    }

    return true
  }
}
