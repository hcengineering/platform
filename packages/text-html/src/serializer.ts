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
  type Attrs,
  type AttrValue,
  type MarkupMark,
  type MarkupNode,
  MarkupMarkType,
  MarkupNodeType
} from '@hcengineering/text-core'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface HtmlSerializerOptions {}

export class HtmlSerializer {
  constructor (private readonly options: HtmlSerializerOptions = {}) {}

  serialize (markup: MarkupNode): string {
    const builder = new NodeBuilder(true)
    addNode(builder, markup)
    return builder.toText()
  }
}

class NodeBuilder {
  textParts: string[] = []

  constructor (private readonly addTags: boolean) {}

  addText (text: string): void {
    this.textParts.push(text)
  }

  openTag (
    tag: string,
    attributes: Record<string, string | number | boolean | null | undefined> = {},
    options?: { newLine?: boolean, selfClosing?: boolean }
  ): void {
    if (this.addTags) {
      this.textParts.push('<')
      this.textParts.push(tag)

      for (const [key, value] of Object.entries(attributes)) {
        if (value == null) continue

        if (typeof value === 'boolean') {
          if (value) {
            this.textParts.push(` ${key}`)
          }
        } else {
          this.textParts.push(` ${key}="${escapeHtml(String(value))}"`)
        }
      }

      this.textParts.push(options?.selfClosing === true ? '/>' : '>')
    } else {
      if (options?.newLine === true) {
        this.textParts.push('\n')
      }
    }
  }

  closeTag (tag: string, options?: { newLine: boolean }): void {
    if (this.addTags) {
      this.textParts.push(`</${tag}>`)
    } else if (options?.newLine === true) {
      this.textParts.push('\n')
    }
  }

  toText (): string {
    return this.textParts.join('')
  }
}

// Helper function to escape HTML special characters
function escapeHtml (text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\r/g, '&#13;')
    .replace(/\n/g, '&#10;')
}

function addMark (builder: NodeBuilder, mark?: MarkupMark, next?: () => void): void {
  if (mark != null) {
    const attrs = mark.attrs ?? {}

    if (mark.type === MarkupMarkType.bold) {
      builder.openTag('strong')
      next?.()
      builder.closeTag('strong')
    } else if (mark.type === MarkupMarkType.code) {
      builder.openTag('code')
      next?.()
      builder.closeTag('code')
    } else if (mark.type === MarkupMarkType.em) {
      builder.openTag('em')
      next?.()
      builder.closeTag('em')
    } else if (mark.type === MarkupMarkType.link) {
      builder.openTag('a', {
        target: attrs.target,
        rel: attrs.rel,
        class: attrs.class,
        href: attrs.href,
        title: attrs.title
      })
      next?.()
      builder.closeTag('a')
    } else if (mark.type === MarkupMarkType.strike) {
      builder.openTag('s')
      next?.()
      builder.closeTag('s')
    } else if (mark.type === MarkupMarkType.underline) {
      builder.openTag('u')
      next?.()
      builder.closeTag('u')
    } else {
      // Handle unknown mark as span with data attribute
      builder.openTag('span', { 'data-mark-type': mark.type as string })
      next?.()
      builder.closeTag('span')
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

function addNodes (builder: NodeBuilder, nodes: MarkupNode[]): void {
  nodes.forEach((childNode) => {
    addNode(builder, childNode)
  })
}

function addNodeContent (builder: NodeBuilder, node?: MarkupNode): void {
  if (node == null) return

  const attrs = node.attrs ?? {}
  const nodes = node.content ?? []
  const style = toStyleAttr(attrs)

  if (node.type === MarkupNodeType.doc) {
    addNodes(builder, nodes)
  } else if (node.type === MarkupNodeType.paragraph) {
    builder.openTag('p', { style })
    addNodes(builder, nodes)
    builder.closeTag('p')
  } else if (node.type === MarkupNodeType.blockquote) {
    builder.openTag('blockquote')
    addNodes(builder, nodes)
    builder.closeTag('blockquote')
  } else if (node.type === MarkupNodeType.horizontal_rule) {
    builder.openTag('hr', {}, { selfClosing: true })
  } else if (node.type === MarkupNodeType.heading) {
    const level = toNumber(attrs.level) ?? 1
    const tag = `h${level}`
    builder.openTag(tag, { style })
    addNodes(builder, nodes)
    builder.closeTag(tag)
  } else if (node.type === MarkupNodeType.code_block) {
    const attrs = node.attrs?.language !== undefined ? { class: `language-${node.attrs.language}` } : {}
    builder.openTag('pre')
    builder.openTag('code', attrs)
    addNodes(builder, nodes)
    builder.closeTag('code')
    builder.closeTag('pre')
  } else if (node.type === MarkupNodeType.text) {
    builder.addText(node.text ?? '')
  } else if (node.type === MarkupNodeType.image) {
    const src = toString(attrs.src)
    const alt = toString(attrs.alt)
    const width = toString(attrs.width)
    const height = toString(attrs.height)
    builder.openTag('img', { src, alt, width, height }, { selfClosing: true })
  } else if (node.type === MarkupNodeType.reference) {
    const label = toString(attrs.label)
    builder.openTag('span', {
      'data-type': 'reference',
      'data-id': attrs.id,
      'data-objectclass': attrs.objectclass,
      'data-label': attrs.label
    })
    builder.addText(label !== undefined ? `@${label}` : '')
    builder.closeTag('span')
  } else if (node.type === MarkupNodeType.hard_break) {
    builder.openTag('br', {}, { selfClosing: true })
  } else if (node.type === MarkupNodeType.ordered_list) {
    builder.openTag('ol')
    addNodes(builder, nodes)
    builder.closeTag('ol')
  } else if (node.type === MarkupNodeType.bullet_list) {
    builder.openTag('ul')
    addNodes(builder, nodes)
    builder.closeTag('ul')
  } else if (node.type === MarkupNodeType.list_item) {
    builder.openTag('li')
    addNodes(builder, nodes)
    builder.closeTag('li')
  } else if (node.type === MarkupNodeType.todoList) {
    builder.openTag('ul', { 'data-type': MarkupNodeType.todoList })
    addNodes(builder, nodes)
    builder.closeTag('ul')
  } else if (node.type === MarkupNodeType.todoItem) {
    const checked = node.attrs?.checked === true || node.attrs?.checked === 'true'
    const disabled = node.attrs?.disabled === true || node.attrs?.disabled === 'true'

    builder.openTag('li', {
      'data-type': MarkupNodeType.todoItem,
      'data-todoid': node.attrs?.todoid,
      'data-userid': node.attrs?.userid,
      'data-checked': checked
    })

    builder.openTag('input', { type: 'checkbox', checked, disabled }, { selfClosing: true })

    addNodes(builder, nodes)

    builder.closeTag('li')
  } else if (node.type === MarkupNodeType.taskList) {
    builder.openTag('ul', { 'data-type': MarkupNodeType.taskList })
    addNodes(builder, nodes)
    builder.closeTag('ul')
  } else if (node.type === MarkupNodeType.taskItem) {
    const checked = node.attrs?.checked === true || node.attrs?.checked === 'true'
    const disabled = node.attrs?.disabled === true || node.attrs?.disabled === 'true'

    builder.openTag('li', {
      'data-type': MarkupNodeType.taskItem,
      'data-checked': checked
    })
    builder.openTag('input', { type: 'checkbox', checked, disabled }, { selfClosing: true })

    addNodes(builder, nodes)

    builder.closeTag('li')
  } else if (node.type === MarkupNodeType.subLink) {
    builder.openTag('sub')
    addNodes(builder, nodes)
    builder.closeTag('sub')
  } else if (node.type === MarkupNodeType.table) {
    builder.openTag('table')
    builder.openTag('tbody')
    addNodes(builder, nodes)
    builder.closeTag('tbody')
    builder.closeTag('table')
  } else if (node.type === MarkupNodeType.table_row) {
    builder.openTag('tr')
    addNodes(builder, nodes)
    builder.closeTag('tr')
  } else if (node.type === MarkupNodeType.table_cell) {
    const colspan = toNumber(attrs.colspan) ?? 1
    const rowspan = toNumber(attrs.rowspan) ?? 1
    const colwidth = toNumber(attrs.colwidth)
    builder.openTag('td', {
      colspan: colspan !== 1 ? colspan : undefined,
      rowspan: rowspan !== 1 ? rowspan : undefined,
      colwidth: colwidth !== undefined && colwidth > 0 ? colwidth : undefined
    })
    addNodes(builder, nodes)
    builder.closeTag('td')
  } else if (node.type === MarkupNodeType.table_header) {
    const colspan = toNumber(attrs.colspan) ?? 1
    const rowspan = toNumber(attrs.rowspan) ?? 1
    const colwidth = toNumber(attrs.colwidth)
    builder.openTag('th', {
      colspan: colspan !== 1 ? colspan : undefined,
      rowspan: rowspan !== 1 ? rowspan : undefined,
      colwidth: colwidth !== undefined && colwidth > 0 ? colwidth : undefined
    })
    addNodes(builder, nodes)
    builder.closeTag('th')
  } else if (node.type === MarkupNodeType.comment) {
    builder.addText('<!-- ')
    addNodes(builder, nodes)
    builder.addText(' -->')
  } else if (node.type === MarkupNodeType.embed) {
    const src = toString(attrs.src) ?? ''
    builder.openTag('a', { href: encodeURI(src), 'data-type': 'embed' })
    builder.addText(escapeHtml(src))
    builder.closeTag('a')
  } else {
    // Handle unknown node types as div with data attribute
    builder.openTag('div', { 'data-node-type': node.type })
    addNodes(builder, nodes)
    builder.closeTag('div')
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

  return value != null ? (typeof value === 'string' ? parseInt(value) : value) : undefined
}

function toStyleAttr (attrs: Attrs): string | undefined {
  const styles: string[] = []

  if (attrs.textAlign != null) {
    styles.push(`text-align: ${attrs.textAlign}`)
  }

  return styles.length > 0 ? styles.join('; ') : undefined
}
