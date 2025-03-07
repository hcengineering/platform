//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { type Markup, generateId } from '@hcengineering/core'
import { type MarkupNode, jsonToMarkup, jsonToPmNode, markupToJSON } from '@hcengineering/text'
import { prosemirrorToYXmlFragment, yDocToProsemirrorJSON } from 'y-prosemirror'
import { deepEqual } from 'fast-equals'
import { Doc as YDoc } from 'yjs'
import { markupToYDoc, yDocToMarkup } from '../ydoc'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toEqualMarkup: (expected: string) => R
    }
  }
}

expect.extend({
  toEqualMarkup (received: string, expected: string) {
    const pass = received === expected || deepEqual(JSON.parse(received), JSON.parse(expected))
    return {
      message: () =>
        pass
          ? `Expected markup strings NOT to be equal:\n Received: ${received}\n Expected: ${expected}`
          : `Expected markup strings to be equal:\n Received: ${received}\n Expected: ${expected}`,
      pass
    }
  }
})

function referenceMarkupToYDoc (markup: Markup, field: string): YDoc {
  const ydoc = new YDoc({ guid: generateId() })
  const fragment = ydoc.getXmlFragment(field)
  prosemirrorToYXmlFragment(jsonToPmNode(markupToJSON(markup)), fragment)
  return ydoc
}

function referenceYDocToMarkup (ydoc: YDoc, field: string): Markup {
  const json = yDocToProsemirrorJSON(ydoc, field)
  return jsonToMarkup(json as MarkupNode)
}

const markups: Array<[string, Markup]> = [
  ['text', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello world"}]}]}'],
  [
    'text with bold mark',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold","attrs":{}}],"text":"hello world"}]}]}'
  ],
  [
    'separate paragraphs with bold mark',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold","attrs":{}}],"text":"hello"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold","attrs":{}}],"text":"world"}]}]}'
  ],
  [
    'mixed text and text with bold mark',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello "},{"type":"text","marks":[{"type":"bold","attrs":{}}],"text":"world"}]}]}'
  ],
  [
    'mixed text with italic and text with bold and italic marks',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"italic","attrs":{}}],"text":"hello "},{"type":"text","marks":[{"type":"bold","attrs":{}},{"type":"italic","attrs":{}}],"text":"world"}]}]}'
  ],
  [
    'text with link and italic marks',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello "},{"type":"text","text":"hello world","marks":[{"type":"link","attrs":{"href":"http://example.com","target":"_blank","rel":"noopener noreferrer","class":"cursor-pointer"}},{"type":"italic","attrs":{}}]}]}]}'
  ],
  [
    'image',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"image","attrs":{"src":"http://example.com/image.jpg","alt":"image"}}]}]}'
  ],
  [
    'table with formatting inside',
    '{"type":"doc","content":[{"type":"table","content":[{"type":"tableRow","content":[{"type":"tableCell","attrs":{"colspan":1,"rowspan":1},"content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold","attrs":{}}],"text":"1"}]}]},{"type":"tableCell","attrs":{"colspan":1,"rowspan":1},"content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"italic","attrs":{}}],"text":"2"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","attrs":{"colspan":1,"rowspan":1},"content":[{"type":"codeBlock","content":[{"type":"text","text":"3"}]}]},{"type":"tableCell","attrs":{"colspan":1,"rowspan":1},"content":[{"type":"paragraph","content":[{"type":"text","text":"4"}]}]}]}]}]}'
  ]
]

describe('markupToYDoc', () => {
  describe.each(markups)('compare with reference', (name, markup) => {
    it(name, () => {
      const expected = referenceMarkupToYDoc(markup, 'test')
      const actual = markupToYDoc(markup, 'test')
      expect(actual.toJSON()).toEqual(expected.toJSON())
    })
  })

  describe.each(markups)('converts markup to ydoc and back', (name, markup) => {
    it(name, () => {
      console.log(markup, name)
      const ydoc = markupToYDoc(markup, 'test')
      const actual = referenceYDocToMarkup(ydoc, 'test')

      expect(actual).toEqualMarkup(markup)
    })
  })
})

describe('yDocToMarkup', () => {
  describe.each(markups)('compare with original', (name, markup) => {
    it(name, () => {
      const ydoc = referenceMarkupToYDoc(markup, 'test')
      const actual = yDocToMarkup(ydoc, 'test')

      expect(actual).toEqualMarkup(markup)
    })
  })

  describe.each(markups)('compare with reference', (name, markup) => {
    it(name, () => {
      const ydoc = referenceMarkupToYDoc(markup, 'test')
      const expected = referenceYDocToMarkup(ydoc, 'test')
      const actual = yDocToMarkup(ydoc, 'test')

      expect(actual).toEqualMarkup(expected)
    })
  })

  describe.each(markups)('converts ydoc to markup and back', (name, markup) => {
    it(name, () => {
      const expected = referenceMarkupToYDoc(markup, 'test')
      const actual = referenceMarkupToYDoc(yDocToMarkup(expected, 'test'), 'test')

      expect(actual.toJSON()).toEqual(expected.toJSON())
    })
  })
})
