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
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { Schema } from '@tiptap/pm/model'
import { EditorState, NodeSelection, TextSelection } from '@tiptap/pm/state'

import { PasteTextAsMarkdownPlugin } from '../smartPaste'

jest.mock('@hcengineering/text', () => ({
  __esModule: true,
  MarkupNodeType: {
    doc: 'doc',
    text: 'text',
    paragraph: 'paragraph',
    heading: 'heading',
    code_block: 'codeBlock',
    bullet_list: 'bulletList',
    list_item: 'listItem',
    table: 'table',
    todoList: 'todoList',
    ordered_list: 'orderedList',
    reference: 'reference',
    image: 'image',
    mermaid: 'mermaid'
  },
  MarkupMarkType: {
    bold: 'bold',
    em: 'em',
    code: 'code',
    link: 'link'
  }
}))

jest.mock('@hcengineering/text-markdown', () => ({
  __esModule: true,
  markdownToMarkup: (markdown: string) => ({
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: markdown.trim().length > 0 ? markdown.trim() : 'title' }]
      }
    ]
  })
}))

jest.mock('../../codeSnippets/codeblock', () => ({
  __esModule: true,
  CodeBlockHighlighExtension: { name: 'codeBlock' }
}))

function makeSchema (): Schema {
  return new Schema({
    nodes: {
      doc: { content: 'block+' },
      text: { group: 'inline' },
      heading: {
        group: 'block',
        content: 'inline*',
        attrs: { level: { default: 1 } },
        toDOM: (node) => ['h' + node.attrs.level, 0],
        parseDOM: [
          { tag: 'h1', attrs: { level: 1 } },
          { tag: 'h2', attrs: { level: 2 } },
          { tag: 'h3', attrs: { level: 3 } }
        ]
      },
      paragraph: {
        group: 'block',
        content: 'inline*',
        toDOM: () => ['p', 0],
        parseDOM: [{ tag: 'p' }]
      },
      codeBlock: {
        group: 'block',
        content: 'text*',
        marks: '',
        attrs: { language: { default: null } },
        toDOM: () => ['pre', ['code', 0]],
        parseDOM: [{ tag: 'pre', preserveWhitespace: 'full' }]
      },
      mermaid: {
        group: 'block',
        content: 'text*',
        marks: '',
        attrs: { language: { default: 'mermaid' } },
        toDOM: () => ['div', { class: 'mermaid-diagram' }, ['code', 0]],
        parseDOM: [{ tag: 'div.mermaid-diagram', preserveWhitespace: 'full' }]
      }
    },
    marks: {}
  })
}

function makeClipboardData (data: { plain?: string, markdown?: string, types?: string[] }): any {
  const plain = data.plain ?? ''
  const markdown = data.markdown ?? ''
  const types = data.types ?? ['text/plain']
  return {
    types,
    getData: (t: string) => {
      if (t === 'text/plain') return plain
      if (t === 'text/markdown') return markdown
      return ''
    }
  } as any
}

describe('SmartPaste handlePaste ignore contexts', () => {
  it('ignores smart paste when selection is inside a codeBlock', () => {
    const schema = makeSchema()
    const doc = schema.node('doc', undefined, [
      schema.node('codeBlock', { language: 'mermaid' }, schema.text('graph TD\nA-->B'))
    ])
    const state = EditorState.create({
      schema,
      doc,
      selection: TextSelection.create(doc, 2)
    })

    const plugin = PasteTextAsMarkdownPlugin()
    const handled = (plugin.props as any).handlePaste(
      { state, dispatch: jest.fn() },
      { clipboardData: makeClipboardData({ plain: '# title' }) },
      null
    )
    expect(handled).toBe(false)
  })

  it('ignores smart paste when selection is inside a mermaid block', () => {
    const schema = makeSchema()
    const doc = schema.node('doc', undefined, [schema.node('mermaid', undefined, schema.text('graph TD\nA-->B'))])
    const state = EditorState.create({
      schema,
      doc,
      selection: TextSelection.create(doc, 2)
    })

    const plugin = PasteTextAsMarkdownPlugin()
    const handled = (plugin.props as any).handlePaste(
      { state, dispatch: jest.fn() },
      { clipboardData: makeClipboardData({ plain: '# title' }) },
      null
    )
    expect(handled).toBe(false)
  })

  it('ignores smart paste when NodeSelection is a codeBlock', () => {
    const schema = makeSchema()
    const doc = schema.node('doc', undefined, [schema.node('codeBlock', undefined, schema.text('x'))])
    const state = EditorState.create({
      schema,
      doc,
      selection: NodeSelection.create(doc, 0)
    })

    const plugin = PasteTextAsMarkdownPlugin()
    const handled = (plugin.props as any).handlePaste(
      { state, dispatch: jest.fn() },
      { clipboardData: makeClipboardData({ plain: '# title' }) },
      null
    )
    expect(handled).toBe(false)
  })

  it('ignores smart paste when NodeSelection is a mermaid node', () => {
    const schema = makeSchema()
    const doc = schema.node('doc', undefined, [schema.node('mermaid', undefined, schema.text('x'))])
    const state = EditorState.create({
      schema,
      doc,
      selection: NodeSelection.create(doc, 0)
    })

    const plugin = PasteTextAsMarkdownPlugin()
    const handled = (plugin.props as any).handlePaste(
      { state, dispatch: jest.fn() },
      { clipboardData: makeClipboardData({ plain: '# title' }) },
      null
    )
    expect(handled).toBe(false)
  })
})

describe('SmartPaste handlePaste transform scenarios', () => {
  it('transforms plain text paste into markdown output in normal text selection', () => {
    const schema = makeSchema()
    const doc = schema.node('doc', undefined, [schema.node('paragraph', undefined, schema.text('hello'))])
    const state = EditorState.create({
      schema,
      doc,
      selection: TextSelection.create(doc, 2)
    })

    const dispatch = jest.fn()
    const plugin = PasteTextAsMarkdownPlugin()
    const handled = (plugin.props as any).handlePaste(
      { state, dispatch },
      { clipboardData: makeClipboardData({ plain: '# Title', types: ['text/plain'] }) },
      null
    )

    expect(handled).toBe(true)
    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  it('transforms when explicit markdown is present even with rich clipboard types', () => {
    const schema = makeSchema()
    const doc = schema.node('doc', undefined, [schema.node('paragraph', undefined, schema.text('hello'))])
    const state = EditorState.create({
      schema,
      doc,
      selection: TextSelection.create(doc, 2)
    })

    const dispatch = jest.fn()
    const plugin = PasteTextAsMarkdownPlugin()
    const handled = (plugin.props as any).handlePaste(
      { state, dispatch },
      {
        clipboardData: makeClipboardData({
          plain: 'fallback',
          markdown: '## Heading',
          types: ['text/html', 'text/markdown']
        })
      },
      null
    )

    expect(handled).toBe(true)
    expect(dispatch).toHaveBeenCalledTimes(1)
  })
})
