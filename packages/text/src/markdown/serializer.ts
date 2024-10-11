import { generateHTML } from '@tiptap/html'
import { isInSet, markEq } from './marks'
import { messageContent, nodeAttrs } from './node'
import { MarkupMark, MarkupNode, MarkupNodeType } from '../markup/model'
import { defaultExtensions } from '../extensions'

type FirstDelim = (i: number, attrs?: Record<string, any>, parentAttrs?: Record<string, any>) => string
interface IState {
  wrapBlock: (delim: string, firstDelim: string | null, node: MarkupNode, f: () => void) => void
  flushClose: (size: number) => void
  atBlank: () => void
  ensureNewLine: () => void
  write: (content: string) => void
  closeBlock: (node: any) => void
  text: (text: string, escape?: boolean) => void
  render: (node: MarkupNode, parent: MarkupNode, index: number) => void
  renderContent: (parent: MarkupNode) => void
  renderInline: (parent: MarkupNode) => void
  renderList: (node: MarkupNode, delim: string, firstDelim: FirstDelim) => void
  esc: (str: string, startOfLine?: boolean) => string
  quote: (str: string) => string
  repeat: (str: string, n: number) => string
  markString: (mark: MarkupMark, open: boolean, parent: MarkupNode, index: number) => string
  refUrl: string
  imageUrl: string
  inAutolink?: boolean
  renderAHref?: boolean
}

type NodeProcessor = (state: IState, node: MarkupNode, parent: MarkupNode, index: number) => void

interface InlineState {
  active: MarkupMark[]
  trailing: string
  parent: MarkupNode
  node?: MarkupNode
  marks: MarkupMark[]
}

// *************************************************************

function backticksFor (side: boolean): string {
  return side ? '`' : '`'
}

function isPlainURL (link: MarkupMark, parent: MarkupNode, index: number): boolean {
  if (link.attrs.title !== undefined || !/^\w+:/.test(link.attrs.href)) return false
  const content = parent.content?.[index]
  if (content === undefined) {
    return false
  }
  if (
    content.type !== MarkupNodeType.text ||
    content.text !== link.attrs.href ||
    content.marks?.[content.marks.length - 1] !== link
  ) {
    return false
  }
  return index === (parent.content?.length ?? 0) - 1 || !isInSet(link, parent.content?.[index + 1]?.marks ?? [])
}

const formatTodoItem: FirstDelim = (i, attrs, parentAttrs?: Record<string, any>) => {
  const meta =
    attrs?.todoid !== undefined && attrs?.userid !== undefined
      ? `<!-- todoid=${attrs?.todoid},userid=${attrs?.userid} -->`
      : ''

  const bullet = parentAttrs?.bullet ?? '*'
  return `${bullet} [${attrs?.checked === true ? 'x' : ' '}] ${meta}`
}

// *************************************************************

export const storeNodes: Record<string, NodeProcessor> = {
  blockquote: (state, node) => {
    state.wrapBlock('> ', null, node, () => {
      state.renderContent(node)
    })
  },
  codeBlock: (state, node) => {
    state.write('```' + `${nodeAttrs(node).language ?? ''}` + '\n')
    // TODO: Check for node.textContent
    state.renderInline(node)
    // state.text(node.text ?? '', false)
    state.ensureNewLine()
    state.write('```')
    state.closeBlock(node)
  },
  heading: (state, node) => {
    const attrs = nodeAttrs(node)
    state.write(state.repeat('#', attrs.level !== undefined ? Number(attrs.level) : 1) + ' ')
    state.renderInline(node)
    state.closeBlock(node)
  },
  horizontalRule: (state, node) => {
    state.write(`${nodeAttrs(node).markup ?? '---'}`)
    state.closeBlock(node)
  },
  bulletList: (state, node) => {
    state.renderList(node, '  ', () => `${nodeAttrs(node).bullet ?? '*'}` + ' ')
  },
  taskList: (state, node) => {
    state.renderList(node, '  ', () => '* [ ]' + ' ')
  },
  todoList: (state, node) => {
    state.renderList(node, '  ', formatTodoItem)
  },
  orderedList: (state, node) => {
    let start = 1
    if (nodeAttrs(node).order !== undefined) {
      start = Number(nodeAttrs(node).order)
    }
    const maxW = String(start + messageContent(node).length - 1).length
    const space = state.repeat(' ', maxW + 2)
    state.renderList(node, space, (i: number) => {
      const nStr = String(start + i)
      return state.repeat(' ', maxW - nStr.length) + nStr + '. '
    })
  },
  listItem: (state, node) => {
    state.renderContent(node)
  },
  taskItem: (state, node) => {
    state.renderContent(node)
  },
  todoItem: (state, node) => {
    state.renderContent(node)
  },
  paragraph: (state, node) => {
    state.renderInline(node)
    state.closeBlock(node)
  },
  subLink: (state, node) => {
    state.write('<sub>')
    state.renderAHref = true
    state.renderInline(node)
    state.renderAHref = false
    state.write('</sub>')
  },

  image: (state, node) => {
    const attrs = nodeAttrs(node)
    if (attrs['file-id'] != null) {
      // Convert image to fileid format
      state.write(
        '![' +
          state.esc(`${attrs.alt ?? ''}`) +
          '](' +
          (state.imageUrl +
            `${attrs['file-id']}` +
            (attrs.width != null ? '&width=' + state.esc(`${attrs.width}`) : '') +
            (attrs.height != null ? '&height=' + state.esc(`${attrs.height}`) : '')) +
          (attrs.title != null ? ' ' + state.quote(`${attrs.title}`) : '') +
          ')'
      )
    } else {
      if (attrs.width != null || attrs.height != null) {
        // state.write(`<img width="446" alt="{alt}" src="{src}">`)
        state.write(
          '<img' +
            (attrs.width != null ? ` width="${state.esc(`${attrs.width}`)}"` : '') +
            (attrs.height != null ? ` height="${state.esc(`${attrs.height}`)}"` : '') +
            ` src="${state.esc(`${attrs.src}`)}"` +
            (attrs.alt != null ? ` alt="${state.esc(`${attrs.alt}`)}"` : '') +
            (attrs.title != null ? '>' + state.quote(`${attrs.title}`) + '</img>' : '>')
        )
      } else {
        state.write(
          '![' +
            state.esc(`${attrs.alt ?? ''}`) +
            '](' +
            state.esc(`${attrs.src}`) +
            (attrs.title != null ? ' ' + state.quote(`${attrs.title}`) : '') +
            ')'
        )
      }
    }
  },
  reference: (state, node) => {
    const attrs = nodeAttrs(node)
    let url = state.refUrl
    if (!url.includes('?')) {
      url += '?'
    } else {
      url += '&'
    }
    state.write(
      '[' +
        state.esc(`${attrs.label ?? ''}`) +
        '](' +
        `${url}${makeQuery({
          _class: attrs.objectclass,
          _id: attrs.id,
          label: attrs.label
        })}` +
        (attrs.title !== undefined ? ' ' + state.quote(`${attrs.title}`) : '') +
        ')'
    )
  },
  comment: (state, node) => {
    state.write('<!--')
    state.renderInline(node)
    state.write('-->')
  },
  hardBreak: (state, node, parent, index) => {
    const content = messageContent(parent)
    for (let i = index + 1; i < content.length; i++) {
      if (content[i].type !== node.type) {
        state.write('\\\n')
        return
      }
    }
  },
  text: (state, node) => {
    // Check if test has reference mark, in this case we need to remove [[]]
    state.text(node.text ?? '')
  },
  table: (state, node) => {
    const html = generateHTML(node, defaultExtensions)
    state.write('<table><tbody>' + html + '</tbody></table>')
    state.closeBlock(node)
  }
}

interface MarkProcessor {
  open: ((_state: IState, mark: MarkupMark, parent: MarkupNode, index: number) => string) | string
  close: ((_state: IState, mark: MarkupMark, parent: MarkupNode, index: number) => string) | string
  mixable: boolean
  expelEnclosingWhitespace: boolean
  escape: boolean
}

export const storeMarks: Record<string, MarkProcessor> = {
  em: {
    open: '*',
    close: '*',
    mixable: true,
    expelEnclosingWhitespace: true,
    escape: true
  },
  italic: {
    open: '*',
    close: '*',
    mixable: true,
    expelEnclosingWhitespace: true,
    escape: true
  },
  bold: {
    open: '**',
    close: '**',
    mixable: true,
    expelEnclosingWhitespace: true,
    escape: true
  },
  strong: {
    open: '**',
    close: '**',
    mixable: true,
    expelEnclosingWhitespace: true,
    escape: true
  },
  strike: {
    open: '~~',
    close: '~~',
    mixable: true,
    expelEnclosingWhitespace: true,
    escape: true
  },
  underline: {
    open: '<ins>',
    close: '</ins>',
    mixable: true,
    expelEnclosingWhitespace: true,
    escape: true
  },
  link: {
    open: (state, mark, parent, index) => {
      if (state.renderAHref === true) {
        return `<a href="${encodeURI(mark.attrs.href)}">`
      } else {
        state.inAutolink = isPlainURL(mark, parent, index)
        return state.inAutolink ? '<' : '['
      }
    },
    close: (state, mark, parent, index) => {
      if (state.renderAHref === true) {
        return '</a>'
      } else {
        const { inAutolink } = state
        state.inAutolink = undefined
        return inAutolink === true
          ? '>'
          : '](' +
              // eslint-disable-next-line
              (mark.attrs.href as string).replace(/[\(\)"]/g, '\\$&') +
              (mark.attrs.title !== undefined ? ` "${(mark.attrs.title as string).replace(/"/g, '\\"')}"` : '') +
              ')'
      }
    },
    mixable: false,
    expelEnclosingWhitespace: false,
    escape: true
  },
  code: {
    open: (state, mark, parent, index) => {
      return backticksFor(false)
    },
    close: (state, mark, parent, index) => {
      return backticksFor(true)
    },
    mixable: false,
    expelEnclosingWhitespace: false,
    escape: false
  }
}

export interface StateOptions {
  tightLists: boolean
  refUrl: string
  imageUrl: string
}
export class MarkdownState implements IState {
  nodes: Record<string, NodeProcessor>
  marks: Record<string, MarkProcessor>
  delim: string
  out: string
  closed: boolean
  closedNode?: MarkupNode
  inTightList: boolean
  options: StateOptions
  refUrl: string
  imageUrl: string

  constructor (
    nodes = storeNodes,
    marks = storeMarks,
    options: StateOptions = { tightLists: true, refUrl: 'ref://', imageUrl: 'http://' }
  ) {
    this.nodes = nodes
    this.marks = marks
    this.delim = this.out = ''
    this.closed = false
    this.inTightList = false
    this.refUrl = options.refUrl
    this.imageUrl = options.imageUrl

    this.options = options
  }

  flushClose (size: number): void {
    if (this.closed) {
      if (!this.atBlank()) this.out += '\n'
      if (size > 1) {
        this.addDelim(size)
      }
      this.closed = false
    }
  }

  private addDelim (size: number): void {
    let delimMin = this.delim
    const trim = /\s+$/.exec(delimMin)
    if (trim !== null) {
      delimMin = delimMin.slice(0, delimMin.length - trim[0].length)
    }
    for (let i = 1; i < size; i++) {
      this.out += delimMin + '\n'
    }
  }

  wrapBlock (delim: string, firstDelim: string | null, node: MarkupNode, f: () => void): void {
    const old = this.delim
    this.write(firstDelim ?? delim)
    this.delim += delim
    f()
    this.delim = old
    this.closeBlock(node)
  }

  atBlank (): boolean {
    return /(^|\n)$/.test(this.out)
  }

  // :: ()
  // Ensure the current content ends with a newline.
  ensureNewLine (): void {
    if (!this.atBlank()) this.out += '\n'
  }

  // :: (?string)
  // Prepare the state for writing output (closing closed paragraphs,
  // adding delimiters, and so on), and then optionally add content
  // (unescaped) to the output.
  write (content: string): void {
    this.flushClose(2)
    if (this.delim !== undefined && this.atBlank()) this.out += this.delim
    if (content.length > 0) this.out += content
  }

  // :: (Node)
  // Close the block for the given node.
  closeBlock (node: MarkupNode): void {
    this.closedNode = node
    this.closed = true
  }

  // :: (string, ?bool)
  // Add the given text to the document. When escape is not `false`,
  // it will be escaped.
  text (text: string, escape = false): void {
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const startOfLine = this.atBlank() || this.closed
      this.write('')
      this.out += escape ? this.esc(lines[i], startOfLine) : lines[i]
      if (i !== lines.length - 1) this.out += '\n'
    }
  }

  // :: (Node)
  // Render the given node as a block.
  render (node: MarkupNode, parent: MarkupNode, index: number): void {
    if (this.nodes[node.type] === undefined) {
      throw new Error('Token type `' + node.type + '` not supported by Markdown renderer')
    }
    this.nodes[node.type](this, node, parent, index)
  }

  // :: (Node)
  // Render the contents of `parent` as block nodes.
  renderContent (parent: MarkupNode): void {
    messageContent(parent).forEach((node: MarkupNode, i: number) => {
      this.render(node, parent, i)
    })
  }

  reorderMixableMark (state: InlineState, mark: MarkupMark, i: number, len: number): void {
    for (let j = 0; j < state.active.length; j++) {
      const other = state.active[j]
      if (!this.marks[other.type].mixable || this.checkSwitchMarks(i, j, state, mark, other, len)) {
        break
      }
    }
  }

  reorderMixableMarks (state: InlineState, len: number): void {
    // Try to reorder 'mixable' marks, such as em and strong, which
    // in Markdown may be opened and closed in different order, so
    // that order of the marks for the token matches the order in
    // active.

    for (let i = 0; i < len; i++) {
      const mark = state.marks[i]
      if (!this.marks[mark.type].mixable) break
      this.reorderMixableMark(state, mark, i, len)
    }
  }

  private checkSwitchMarks (
    i: number,
    j: number,
    state: InlineState,
    mark: MarkupMark,
    other: MarkupMark,
    len: number
  ): boolean {
    if (!markEq(mark, other) || i === j) {
      return false
    }
    this.switchMarks(i, j, state, mark, len)
    return true
  }

  private switchMarks (i: number, j: number, state: InlineState, mark: MarkupMark, len: number): void {
    if (i > j) {
      state.marks = state.marks
        .slice(0, j)
        .concat(mark)
        .concat(state.marks.slice(j, i))
        .concat(state.marks.slice(i + 1, len))
    }
    if (j > i) {
      state.marks = state.marks
        .slice(0, i)
        .concat(state.marks.slice(i + 1, j))
        .concat(mark)
        .concat(state.marks.slice(j, len))
    }
  }

  renderNodeInline (state: InlineState, index: number): void {
    state.marks = state.node?.marks ?? []
    this.updateHardBreakMarks(state, index)

    const leading = this.adjustLeading(state)

    const inner: MarkupMark | undefined = state.marks.length > 0 ? state.marks[state.marks.length - 1] : undefined
    const noEsc = inner !== undefined && !(this.marks[inner.type]?.escape ?? false)
    const len = state.marks.length - (noEsc ? 1 : 0)

    this.reorderMixableMarks(state, len)

    // Find the prefix of the mark set that didn't change
    this.checkCloseMarks(state, len, index)

    // Output any previously expelled trailing whitespace outside the marks
    if (leading !== '') this.text(leading)

    // Open the marks that need to be opened
    this.checkOpenMarks(state, len, index, inner, noEsc)
  }

  private checkOpenMarks (
    state: InlineState,
    len: number,
    index: number,
    inner: MarkupMark | undefined,
    noEsc: boolean
  ): void {
    if (state.node !== undefined) {
      this.updateActiveMarks(state, len, index)

      // Render the node. Special case code marks, since their content
      // may not be escaped.
      if (this.isNoEscapeRequire(state.node, inner, noEsc, state)) {
        this.renderMarkText(inner as MarkupMark, state, index)
      } else {
        this.render(state.node, state.parent, index)
      }
    }
  }

  private isNoEscapeRequire (
    node: MarkupNode,
    inner: MarkupMark | undefined,
    noEsc: boolean,
    state: InlineState
  ): boolean {
    return inner !== undefined && noEsc && node.type === MarkupNodeType.text
  }

  private renderMarkText (inner: MarkupMark, state: InlineState, index: number): void {
    this.text(
      this.markString(inner, true, state.parent, index) +
        (state.node?.text as string) +
        this.markString(inner, false, state.parent, index + 1),
      false
    )
  }

  private updateActiveMarks (state: InlineState, len: number, index: number): void {
    while (state.active.length < len) {
      const add = state.marks[state.active.length]
      state.active.push(add)
      this.text(this.markString(add, true, state.parent, index), false)
    }
  }

  private checkCloseMarks (state: InlineState, len: number, index: number): void {
    let keep = 0
    while (keep < Math.min(state.active.length, len) && markEq(state.marks[keep], state.active[keep])) {
      ++keep
    }

    // Close the marks that need to be closed
    while (keep < state.active.length) {
      const mark = state.active.pop()
      if (mark !== undefined) {
        this.text(this.markString(mark, false, state.parent, index), false)
      }
    }
  }

  private adjustLeading (state: InlineState): string {
    let leading = state.trailing
    state.trailing = ''
    // If whitespace has to be expelled from the node, adjust
    // leading and trailing accordingly.
    const node = state?.node
    if (this.isText(node) && this.isMarksHasExpelEnclosingWhitespace(state)) {
      const match = /^(\s*)(.*?)(\s*)$/m.exec(node?.text ?? '')
      if (match !== null) {
        const [leadMatch, innerMatch, trailMatch] = [match[1], match[2], match[3]]
        leading += leadMatch
        state.trailing = trailMatch
        this.adjustLeadingTextNode(leadMatch, trailMatch, state, innerMatch, node as MarkupNode)
      }
    }
    return leading
  }

  private isMarksHasExpelEnclosingWhitespace (state: InlineState): boolean {
    return state.marks.some((mark) => this.marks[mark.type]?.expelEnclosingWhitespace)
  }

  private adjustLeadingTextNode (
    lead: string,
    trail: string,
    state: InlineState,
    inner: string,
    node: MarkupNode
  ): void {
    if (lead !== '' || trail !== '') {
      state.node = inner !== undefined ? { ...node, text: inner } : undefined
      if (state.node === undefined) {
        state.marks = state.active
      }
    }
  }

  private updateHardBreakMarks (state: InlineState, index: number): void {
    if (state.node !== undefined && state.node.type === MarkupNodeType.hard_break) {
      state.marks = this.filterHardBreakMarks(state.marks, index, state)
    }
  }

  private filterHardBreakMarks (marks: MarkupMark[], index: number, state: InlineState): MarkupMark[] {
    const content = state.parent.content ?? []
    const next = content[index + 1]
    if (!this.isHardbreakText(next)) {
      return []
    }
    return marks.filter((m) => isInSet(m, next.marks ?? []))
  }

  private isHardbreakText (next?: MarkupNode): boolean {
    return (
      next !== undefined && (next.type !== MarkupNodeType.text || (next.text !== undefined && /\S/.test(next.text)))
    )
  }

  private isText (node?: MarkupNode): boolean {
    return node !== undefined && node.type === MarkupNodeType.text && node.text !== undefined
  }

  // :: (Node)
  // Render the contents of `parent` as inline content.
  renderInline (parent: MarkupNode): void {
    const state: InlineState = { active: [], trailing: '', parent, marks: [] }
    messageContent(parent).forEach((nde, index) => {
      state.node = nde
      this.renderNodeInline(state, index)
    })
    state.node = undefined
    this.renderNodeInline(state, 0)
  }

  // :: (Node, string, (number) → string)
  // Render a node's content as a list. `delim` should be the extra
  // indentation added to all lines except the first in an item,
  // `firstDelim` is a function going from an item index to a
  // delimiter for the first line of the item.
  renderList (node: MarkupNode, delim: string, firstDelim: FirstDelim): void {
    this.flushListClose(node)

    const isTight: boolean =
      typeof node.attrs?.tight !== 'undefined' ? node.attrs.tight === 'true' : this.options.tightLists
    const prevTight = this.inTightList
    this.inTightList = isTight

    messageContent(node).forEach((child, i) => {
      this.renderListItem(node, child, i, isTight, delim, firstDelim)
    })
    this.inTightList = prevTight
  }

  renderListItem (
    node: MarkupNode,
    child: MarkupNode,
    i: number,
    isTight: boolean,
    delim: string,
    firstDelim: FirstDelim
  ): void {
    if (i > 0 && isTight) this.flushClose(1)
    this.wrapBlock(delim, firstDelim(i, node.content?.[i].attrs, node.attrs), node, () => {
      this.render(child, node, i)
    })
  }

  private flushListClose (node: MarkupNode): void {
    if (this.closed && this.closedNode?.type === node.type) {
      this.flushClose(3)
    } else if (this.inTightList) {
      this.flushClose(1)
    }
  }

  // :: (string, ?bool) → string
  // Escape the given string so that it can safely appear in Markdown
  // content. If `startOfLine` is true, also escape characters that
  // has special meaning only at the start of the line.
  esc (str: string, startOfLine = false): string {
    if (str == null) {
      return ''
    }
    str = str.replace(/[`*\\~\[\]]/g, '\\$&') // eslint-disable-line
    if (startOfLine) {
      str = str.replace(/^[:#\-*+]/, '\\$&').replace(/^(\d+)\./, '$1\\.')
    }
    return str
  }

  quote (str: string): string {
    const wrap = !(str?.includes('"') ?? false) ? '""' : !(str?.includes("'") ?? false) ? "''" : '()'
    return wrap[0] + str + wrap[1]
  }

  // :: (string, number) → string
  // Repeat the given string `n` times.
  repeat (str: string, n: number): string {
    let out = ''
    for (let i = 0; i < n; i++) out += str
    return out
  }

  // : (Mark, bool, string?) → string
  // Get the markdown string for a given opening or closing mark.
  markString (mark: MarkupMark, open: boolean, parent: MarkupNode, index: number): string {
    let value = mark.attrs?.marker
    if (value === undefined) {
      const info = this.marks[mark.type]
      value = open ? info.open : info.close
    }
    return typeof value === 'string' ? value : value(this, mark, parent, index) ?? ''
  }
}

function makeQuery (obj: Record<string, string | number | boolean | undefined>): string {
  return Object.keys(obj)
    .filter((it) => it[1] != null)
    .map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k] as string | number | boolean)
    })
    .join('&')
}
