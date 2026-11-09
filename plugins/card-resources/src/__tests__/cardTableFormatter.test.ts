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

import cardPlugin from '@hcengineering/card'
import core, { type Class, type Doc, type Hierarchy, type Ref } from '@hcengineering/core'
import { type AttributeModel } from '@hcengineering/view'
import { formatCardValue, formatMarkupForCell } from '../cardTableFormatter'

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

// converter-resources transitively pulls in svelte; only isIntlString is used by
// cardTableFormatter and only on code paths the markup tests do not exercise.
jest.mock('@hcengineering/converter-resources', () => ({
  isIntlString: (value: unknown) => typeof value === 'string' && /^[a-z][a-z0-9-]*:[a-zA-Z][a-zA-Z0-9_]*:.+/.test(value)
}))

function buildMarkupAttr (key: string): AttributeModel {
  return {
    key,
    sortingKey: key,
    _class: cardPlugin.class.Card,
    label: `card:string:${key}` as unknown,
    attribute: {
      name: key,
      type: { _class: core.class.TypeMarkup }
    },
    collectionAttr: false,
    isLookup: false
  } as unknown as AttributeModel
}

function buildHierarchy (): Hierarchy {
  return {
    isDerived: jest.fn((cls: Ref<Class<Doc>>, target: Ref<Class<Doc>>) => cls === target)
  } as unknown as Hierarchy
}

describe('cardTableFormatter.formatCardValue (markup)', () => {
  it('converts ProseMirror JSON markup to markdown text', async () => {
    const markup = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }]
        }
      ]
    })

    const card = {
      _class: cardPlugin.class.Card,
      richtext: markup
    } as unknown as Doc

    const result = await formatCardValue(
      buildMarkupAttr('richtext'),
      card,
      buildHierarchy(),
      cardPlugin.class.Card as Ref<Class<Doc>>,
      'en'
    )

    expect(result).toBe('Hello world')
  })

  it('preserves inline emphasis when serializing markup to markdown', async () => {
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

    const card = {
      _class: cardPlugin.class.Card,
      richtext: markup
    } as unknown as Doc

    const result = await formatCardValue(
      buildMarkupAttr('richtext'),
      card,
      buildHierarchy(),
      cardPlugin.class.Card as Ref<Class<Doc>>,
      'en'
    )

    expect(result).toBe('see **this**')
  })

  it('returns empty string when markup value is empty', async () => {
    const card = {
      _class: cardPlugin.class.Card,
      richtext: ''
    } as unknown as Doc

    const result = await formatCardValue(
      buildMarkupAttr('richtext'),
      card,
      buildHierarchy(),
      cardPlugin.class.Card as Ref<Class<Doc>>,
      'en'
    )

    expect(result).toBe('')
  })

  it('returns empty string when markup value is undefined', async () => {
    const card = {
      _class: cardPlugin.class.Card
    } as unknown as Doc

    const result = await formatCardValue(
      buildMarkupAttr('richtext'),
      card,
      buildHierarchy(),
      cardPlugin.class.Card as Ref<Class<Doc>>,
      'en'
    )

    expect(result).toBe('')
  })

  it('treats a plain (non-JSON) string markup value as a single paragraph', async () => {
    const card = {
      _class: cardPlugin.class.Card,
      richtext: 'just text'
    } as unknown as Doc

    const result = await formatCardValue(
      buildMarkupAttr('richtext'),
      card,
      buildHierarchy(),
      cardPlugin.class.Card as Ref<Class<Doc>>,
      'en'
    )

    expect(result).toBe('just text')
  })

  it('reads markup value from the cast mixin doc when castRequest is set', async () => {
    const markup = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'mixin value' }]
        }
      ]
    })

    // formatValue's resolveDisplayContext already passes the cast doc as displayDoc,
    // so formatCardValue receives the mixin-shaped object directly.
    const castDoc = {
      _class: cardPlugin.class.Card,
      richtext: markup
    } as unknown as Doc

    const attr = {
      key: 'card:mixin:MyTag.richtext',
      sortingKey: 'card:mixin:MyTag.richtext',
      _class: cardPlugin.class.Card,
      label: 'card:string:Richtext' as unknown,
      castRequest: 'card:mixin:MyTag',
      attribute: {
        name: 'richtext',
        type: { _class: core.class.TypeMarkup }
      },
      collectionAttr: false,
      isLookup: false
    } as unknown as AttributeModel

    const result = await formatCardValue(
      attr,
      castDoc,
      buildHierarchy(),
      cardPlugin.class.Card as Ref<Class<Doc>>,
      'en'
    )

    expect(result).toBe('mixin value')
  })

  it('flattens markup containing a table to inline text (no HTML in cell)', async () => {
    // markupToMarkdown serializes table nodes as raw HTML; if that HTML lands in
    // an outer markdown table cell it breaks paste round-trip in the editor.
    const markup = JSON.stringify({
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

    const card = {
      _class: cardPlugin.class.Card,
      richtext: markup
    } as unknown as Doc

    const result = await formatCardValue(
      buildMarkupAttr('richtext'),
      card,
      buildHierarchy(),
      cardPlugin.class.Card as Ref<Class<Doc>>,
      'en'
    )

    expect(result).not.toMatch(/<[^>]+>/)
    expect(result).not.toContain('\n')
    expect(result).toBe('h 1')
  })

  it('flattens multi-paragraph markup to a single line', async () => {
    const markup = JSON.stringify({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'first' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'second' }] }
      ]
    })

    const card = {
      _class: cardPlugin.class.Card,
      richtext: markup
    } as unknown as Doc

    const result = await formatCardValue(
      buildMarkupAttr('richtext'),
      card,
      buildHierarchy(),
      cardPlugin.class.Card as Ref<Class<Doc>>,
      'en'
    )

    expect(result).toBe('first second')
  })

  it('flattens markup for a custom-attribute column (attr.key === "" and label starts with "custom")', async () => {
    // Custom markup attribute: column has empty key and a "customXXX" label;
    // the value sits on the card under that same custom key. Without this
    // branch the customFormatter returns undefined and the fallback emits
    // raw <table> HTML for nested tables.
    const customKey = 'custom6a05575137207bd342d60f7c'
    const markup = JSON.stringify({
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

    const card = {
      _class: cardPlugin.class.Card,
      [customKey]: markup
    } as unknown as Doc

    const attr = {
      key: '',
      sortingKey: '',
      _class: cardPlugin.class.Card,
      label: customKey,
      collectionAttr: false,
      isLookup: false
    } as unknown as AttributeModel

    const markupAttribute = {
      name: customKey,
      type: { _class: core.class.TypeMarkup }
    }
    const hierarchy = {
      isDerived: jest.fn((cls: Ref<Class<Doc>>, target: Ref<Class<Doc>>) => cls === target),
      findAttribute: jest.fn((_cls: Ref<Class<Doc>>, key: string) => (key === customKey ? markupAttribute : undefined)),
      getAllAttributes: jest.fn(() => new Map())
    } as unknown as Hierarchy

    const result = await formatCardValue(attr, card, hierarchy, cardPlugin.class.Card as Ref<Class<Doc>>, 'en')

    expect(result).not.toMatch(/<[^>]+>/)
    expect(result).not.toContain('\n')
    expect(result).toBe('h 1')
  })

  it('falls through to undefined for a custom-attribute column that is NOT markup', async () => {
    const customKey = 'customStringField'
    const card = {
      _class: cardPlugin.class.Card,
      [customKey]: 'just a string'
    } as unknown as Doc

    const attr = {
      key: '',
      sortingKey: '',
      _class: cardPlugin.class.Card,
      label: customKey,
      collectionAttr: false,
      isLookup: false
    } as unknown as AttributeModel

    const hierarchy = {
      isDerived: jest.fn((cls: Ref<Class<Doc>>, target: Ref<Class<Doc>>) => cls === target),
      findAttribute: jest.fn(() => ({ name: customKey, type: { _class: core.class.TypeString } })),
      getAllAttributes: jest.fn(() => new Map())
    } as unknown as Hierarchy

    const result = await formatCardValue(attr, card, hierarchy, cardPlugin.class.Card as Ref<Class<Doc>>, 'en')
    expect(result).toBeUndefined()
  })

  it('returns undefined for non-markup attributes (falls through to default formatter)', async () => {
    const card = {
      _class: cardPlugin.class.Card,
      title: 'Some title'
    } as unknown as Doc

    const attr = {
      key: 'title',
      sortingKey: 'title',
      _class: cardPlugin.class.Card,
      label: 'card:string:Title',
      attribute: {
        name: 'title',
        type: { _class: core.class.TypeString }
      },
      collectionAttr: false,
      isLookup: false
    } as unknown as AttributeModel

    const result = await formatCardValue(attr, card, buildHierarchy(), cardPlugin.class.Card as Ref<Class<Doc>>, 'en')

    expect(result).toBeUndefined()
  })
})

describe('cardTableFormatter.formatMarkupForCell', () => {
  it('produces inline-only output for markup with a nested table (no HTML, no newlines)', () => {
    const markup = JSON.stringify({
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
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'header' }] }]
                }
              ]
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'body' }] }]
                }
              ]
            }
          ]
        }
      ]
    })

    const result = formatMarkupForCell(markup)

    // Critical invariants: no HTML tags survive, no embedded newlines, content preserved.
    expect(result).not.toMatch(/<[^>]+>/)
    expect(result).not.toContain('\n')
    expect(result).toBe('header body')
  })

  it('preserves inline emphasis in flat markup', () => {
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

    expect(formatMarkupForCell(markup)).toBe('see **this**')
  })

  it('preserves a regular markdown link', () => {
    const markup = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'docs',
              marks: [{ type: 'link', attrs: { href: 'https://example.com' } }]
            }
          ]
        }
      ]
    })

    expect(formatMarkupForCell(markup)).toBe('[docs](https://example.com)')
  })

  it('preserves an autolink (URL whose link text equals the href)', () => {
    // The serializer emits autolinks as <https://example.com>; the previous
    // /<[^>]*>/g strip was deleting them entirely.
    const markup = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'https://example.com',
              marks: [{ type: 'link', attrs: { href: 'https://example.com' } }]
            }
          ]
        }
      ]
    })

    expect(formatMarkupForCell(markup)).toContain('https://example.com')
  })

  it('preserves a link whose URL contains spaces (angle-bracket wrapped)', () => {
    const markup = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'doc',
              marks: [{ type: 'link', attrs: { href: 'https://example.com/path with space' } }]
            }
          ]
        }
      ]
    })

    expect(formatMarkupForCell(markup)).toContain('https://example.com/path with space')
  })

  it('flattens lists to a single line', () => {
    const markup = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }]
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'two' }] }]
            }
          ]
        }
      ]
    })

    const result = formatMarkupForCell(markup)
    expect(result).not.toContain('\n')
    expect(result).toContain('one')
    expect(result).toContain('two')
  })
})
