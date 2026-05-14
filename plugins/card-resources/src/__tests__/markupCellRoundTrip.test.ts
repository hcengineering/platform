//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import { markdownToMarkup } from '@hcengineering/text-markdown'
import { formatMarkupForCell } from '../cardTableFormatter'

jest.mock('@hcengineering/platform', () => {
  const actual = jest.requireActual('@hcengineering/platform')
  return {
    ...actual,
    translate: jest.fn(async (str: unknown) => String(str))
  }
})

jest.mock('@hcengineering/presentation', () => ({
  getClient: jest.fn()
}))

// converter-resources transitively pulls in svelte; only isIntlString is used
// by cardTableFormatter and is not exercised by these round-trip tests.
jest.mock('@hcengineering/converter-resources', () => ({
  isIntlString: (value: unknown) => typeof value === 'string' && /^[a-z][a-z0-9-]*:[a-zA-Z][a-zA-Z0-9_]*:.+/.test(value)
}))

// Mirror of escapeMarkdownTableCellContent / escapeMarkdownLinkText from
// @hcengineering/converter-resources so we don't pull svelte into Jest.
function escapeMarkdownTableCellContent (value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
}

// Walk a markup tree and assert no node violates ProseMirror's table schema:
// `tableHeader` / `tableCell` may only contain block content (paragraph, etc.),
// and a `paragraph` may not contain block-level nodes such as tableRow.
function assertNoInvalidTableNesting (node: any): void {
  if (node == null || typeof node !== 'object') return
  if (node.type === 'paragraph') {
    for (const child of node.content ?? []) {
      const ct = child?.type
      if (ct === 'tableRow' || ct === 'tableHeader' || ct === 'tableCell' || ct === 'table') {
        throw new Error(`paragraph contains block-level ${String(ct)}`)
      }
    }
  }
  for (const child of node.content ?? []) {
    assertNoInvalidTableNesting(child)
  }
}

describe('markup-in-cell round-trip', () => {
  it('a markup table flattens to inline text that re-parses without invalid nested-table structures', () => {
    const innerMarkup = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableHeader',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'h' }] }]
                }
              ]
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: '1' }] }]
                }
              ]
            }
          ]
        }
      ]
    })

    const cellValue = formatMarkupForCell(innerMarkup)
    const escaped = escapeMarkdownTableCellContent(cellValue)

    const outerTable =
      '| Title | RichText | Date |\n' + '| --- | --- | --- |\n' + `| Card 1 | ${escaped} | 2026-05-14 |\n`

    const parsed = markdownToMarkup(outerTable)
    expect(() => {
      assertNoInvalidTableNesting(parsed)
    }).not.toThrow()
  })

  it('reparses the exact failing user table (custom markup column with nested table) without violating the schema', () => {
    // This mirrors the actual table the user reported. The "TM 2" cell holds
    // a card markup attribute whose value is a markup-table. After the fix
    // that cell should be flat text, so re-parsing the outer table should
    // not produce a paragraph that wraps tableRow/tableHeader/tableCell.
    const inner = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'test' }] }] },
                { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Type' }] }] },
                { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tags' }] }] }
              ]
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'text',
                          text: 't2',
                          marks: [
                            {
                              type: 'link',
                              attrs: { href: 'http://huly.local:8080/workbench/t4/card/6a05579937207bd342d60ff8' }
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'test' }] }] },
                { type: 'tableCell', content: [{ type: 'paragraph' }] }
              ]
            }
          ]
        }
      ]
    })

    const cellValue = formatMarkupForCell(inner)

    // Critical invariants on the cell value:
    expect(cellValue).not.toMatch(/<[^>]+>/) // no HTML tags
    expect(cellValue).not.toContain('\n') // no embedded newlines
    expect(cellValue).toContain('test') // header text preserved
    // The inner link should still carry its URL.
    expect(cellValue).toContain('http://huly.local:8080/workbench/t4/card/6a05579937207bd342d60ff8')

    const escaped = escapeMarkdownTableCellContent(cellValue)
    const outerTable =
      '| test | Type | Tags | TM 2 |\n' +
      '| --- | --- | --- | --- |\n' +
      `| [new](http://huly.local:8087/workbench/t4/card/6a05606432d68883381bbeb6) | test |  | ${escaped} |\n`

    const parsed = markdownToMarkup(outerTable)
    expect(() => {
      assertNoInvalidTableNesting(parsed)
    }).not.toThrow()
  })

  it('inline emphasis survives the round-trip', () => {
    const markup = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'see ' },
            { type: 'text', marks: [{ type: 'bold' }], text: 'this' }
          ]
        }
      ]
    })

    const cellValue = formatMarkupForCell(markup)
    const outerTable = '| RichText |\n' + '| --- |\n' + `| ${escapeMarkdownTableCellContent(cellValue)} |\n`

    const parsed = markdownToMarkup(outerTable)
    expect(() => {
      assertNoInvalidTableNesting(parsed)
    }).not.toThrow()
    // The serialized cell should still carry the bold markdown.
    expect(cellValue).toBe('see **this**')
  })
})
