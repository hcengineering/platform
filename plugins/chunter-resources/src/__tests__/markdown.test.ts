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

import { type Markup } from '@hcengineering/core'
import { jsonToMarkup, MarkupMarkType, MarkupNodeType, markupToJSON, type MarkupNode } from '@hcengineering/text'

import { toChatDisplayMarkup } from '../markdown'

describe('toChatDisplayMarkup', () => {
  it('renders plain markdown lists as structured markup', () => {
    const markup = toChatDisplayMarkup('Branch Name:\n\n- `project-123-chat-markdown`' as Markup)
    const node = markupToJSON(markup)

    expect(node.content?.[1]?.type).toBe(MarkupNodeType.bullet_list)

    const itemText = node.content?.[1]?.content?.[0]?.content?.[0]?.content?.[0]
    expect(itemText?.type).toBe(MarkupNodeType.text)
    expect(itemText?.marks?.[0]?.type).toBe(MarkupMarkType.code)
  })

  it('leaves plain text without markdown markers unchanged', () => {
    const text = 'Deploy frontend v1.0.0 and backend v2.2.1' as Markup

    expect(toChatDisplayMarkup(text)).toBe(text)
  })

  it('links standalone tracker issue identifiers from plain chat text', () => {
    const markup = toChatDisplayMarkup('Ticket(s): APP-2291, ops_qa-8 and ENG-389' as Markup, {
      issueHrefProvider: (identifier) => `/workbench/acme/tracker/${identifier}`
    })
    const links = collectTextNodes(markupToJSON(markup)).filter((node) =>
      node.marks?.some((mark) => mark.type === MarkupMarkType.link)
    )

    expect(links.map((node) => node.text)).toEqual(['APP-2291', 'ops_qa-8', 'ENG-389'])
    expect(links.map((node) => node.marks?.find((mark) => mark.type === MarkupMarkType.link)?.attrs?.href)).toEqual([
      '/workbench/acme/tracker/APP-2291',
      '/workbench/acme/tracker/OPS_QA-8',
      '/workbench/acme/tracker/ENG-389'
    ])
  })

  it('links issue identifiers after markdown formatting is parsed', () => {
    const markup = toChatDisplayMarkup('1. Work on APP-2291' as Markup, {
      issueHrefProvider: (identifier) => `/workbench/acme/tracker/${identifier}`
    })
    const links = collectTextNodes(markupToJSON(markup)).filter((node) =>
      node.marks?.some((mark) => mark.type === MarkupMarkType.link)
    )

    expect(markupToJSON(markup).content?.[0]?.type).toBe(MarkupNodeType.ordered_list)
    expect(links.map((node) => node.text)).toEqual(['APP-2291'])
  })

  it('does not link issue-like text inside branch names, urls, or existing code marks', () => {
    const markup = toChatDisplayMarkup(
      'See https://example.test/workbench/acme/tracker/APP-2291?related=OPS-2398 and feature/app-2291-chat plus `APP-2398`' as Markup,
      {
        issueHrefProvider: (identifier) => `/workbench/acme/tracker/${identifier}`
      }
    )
    const links = collectTextNodes(markupToJSON(markup)).filter((node) =>
      node.marks?.some((mark) => mark.type === MarkupMarkType.link)
    )

    expect(links).toHaveLength(0)
  })

  it('does not reparse existing rich editor markup', () => {
    const richMarkup = jsonToMarkup({
      type: MarkupNodeType.doc,
      content: [
        {
          type: MarkupNodeType.paragraph,
          content: [
            {
              type: MarkupNodeType.text,
              text: '**already rich**',
              marks: [{ type: MarkupMarkType.bold }]
            }
          ]
        }
      ]
    })

    expect(toChatDisplayMarkup(richMarkup)).toBe(richMarkup)
  })

  it('keeps checklist markers visible when markdown is parsed for chat display', () => {
    const markup = toChatDisplayMarkup('- [x] done' as Markup)
    const node = markupToJSON(markup)

    const firstItem = node.content?.[0]?.content?.[0]
    expect(firstItem?.type).toBe(MarkupNodeType.list_item)
    expect(collectText(firstItem)).toBe('[x] done')
  })
})

function collectText (node: MarkupNode | undefined): string {
  if (node === undefined) {
    return ''
  }

  return `${node.text ?? ''}${(node.content ?? []).map(collectText).join('')}`
}

function collectTextNodes (node: MarkupNode | undefined): MarkupNode[] {
  if (node === undefined) {
    return []
  }

  return [
    ...(node.type === MarkupNodeType.text ? [node] : []),
    ...(node.content ?? []).flatMap((child) => collectTextNodes(child))
  ]
}
