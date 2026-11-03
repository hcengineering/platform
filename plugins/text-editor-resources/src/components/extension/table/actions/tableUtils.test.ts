//
// Copyright © 2026 TraceX SAS.
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

import { Node, Schema } from '@tiptap/pm/model'
import { extractTableMarkdown } from './tableUtils'

jest.mock('@hcengineering/presentation', () => ({
  getClient: jest.fn()
}))

const schema = new Schema({
  nodes: {
    doc: { content: 'table' },
    table: { content: 'tableRow+', tableRole: 'table' },
    tableRow: { content: 'tableCell+', tableRole: 'row' },
    tableCell: {
      content: 'paragraph+',
      tableRole: 'cell',
      attrs: {
        colspan: { default: 1 },
        rowspan: { default: 1 },
        colwidth: { default: null }
      }
    },
    paragraph: { content: 'text*' },
    text: {}
  },
  marks: {
    link: { attrs: { href: {} } }
  }
})

function createTable (rows: object[]): Node {
  const doc = Node.fromJSON(schema, {
    type: 'doc',
    content: [
      {
        type: 'table',
        content: rows
      }
    ]
  })
  return doc.firstChild as Node
}

function cell (text: string, rowspan: number = 1, href?: string): object {
  return {
    type: 'tableCell',
    attrs: { colspan: 1, rowspan, colwidth: null },
    content: [
      {
        type: 'paragraph',
        content:
          text.length > 0
            ? [{ type: 'text', text, marks: href === undefined ? [] : [{ type: 'link', attrs: { href } }] }]
            : []
      }
    ]
  }
}

function row (...cells: object[]): object {
  return {
    type: 'tableRow',
    content: cells
  }
}

describe('extractTableMarkdown', () => {
  it('preserves merged cells as an HTML table', () => {
    const table = createTable([
      row(cell('Requirement'), cell('Test case')),
      row(cell('REQ-1', 2), cell('First test')),
      row(cell('Second test'))
    ])

    const markdown = extractTableMarkdown(table)

    expect(markdown).toContain('<td rowspan="2">')
    expect(markdown.match(/REQ-1/g)).toHaveLength(1)
  })

  it('keeps flat tables in pipe markdown format', () => {
    const table = createTable([row(cell('Header')), row(cell('Value'))])

    const markdown = extractTableMarkdown(table)

    expect(markdown).toBe('| Header |\n| --- |\n| Value |\n')
  })

  it('escapes a pipe in a flat table cell', () => {
    const table = createTable([row(cell('Header')), row(cell('A | B'))])

    expect(extractTableMarkdown(table)).toBe('| Header |\n| --- |\n| A \\| B |\n')
  })

  it('preserves a link target in a flat table cell', () => {
    const table = createTable([row(cell('Header')), row(cell('Alpha', 1, 'https://example.com/old'))])

    expect(extractTableMarkdown(table)).toContain('[Alpha](https://example.com/old)')
  })
})
