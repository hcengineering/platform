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

import { Markup } from '@hcengineering/core'
import { markupToJSON } from '@hcengineering/text'
import { jsonToYDocNoSchema, markupToYDoc, markupToYDocNoSchema, yDocToMarkup } from '../ydoc'

describe('ydoc', () => {
  const markups: Markup[] = [
    // just text
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello world"}]}]}',
    // just text with bold mark
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold","attrs":{}}],"text":"hello world"}]}]}',
    // separate paragraphs with bold mark
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold","attrs":{}}],"text":"hello"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold","attrs":{}}],"text":"world"}]}]}',
    // mixed text and text with bold mark
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello "},{"type":"text","marks":[{"type":"bold","attrs":{}}],"text":"world"}]}]}',
    // mixed text with italic and text with bold and italic marks
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"italic","attrs":{}}],"text":"hello "},{"type":"text","marks":[{"type":"bold","attrs":{}},{"type":"italic","attrs":{}}],"text":"world"}]}]}',
    // text with link and italic marks
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello "},{"type":"text","text":"hello world","marks":[{"type":"link","attrs":{"href":"http://example.com","target":"_blank","rel":"noopener noreferrer","class":"cursor-pointer"}},{"type":"italic","attrs":{}}]}]}]}',
    // an image
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"image","attrs":{"src":"http://example.com/image.jpg","alt":"image"}}]}]}',
    // a table with formatting inside
    '{"type":"doc","content":[{"type":"table","content":[{"type":"tableRow","content":[{"type":"tableCell","attrs":{"colspan":1,"rowspan":1},"content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold","attrs":{}}],"text":"1"}]}]},{"type":"tableCell","attrs":{"colspan":1,"rowspan":1},"content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"italic","attrs":{}}],"text":"2"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","attrs":{"colspan":1,"rowspan":1},"content":[{"type":"codeBlock","content":[{"type":"text","text":"3"}]}]},{"type":"tableCell","attrs":{"colspan":1,"rowspan":1},"content":[{"type":"paragraph","content":[{"type":"text","text":"4"}]}]}]}]}]}'
  ]

  describe.each(markups)('markupToYDoc', (markup) => {
    it('converts markup to ydoc and back', () => {
      const ydoc = markupToYDoc(markup, 'test')
      const back = yDocToMarkup(ydoc, 'test')

      expect(JSON.parse(back)).toEqual(JSON.parse(markup))
    })
  })

  describe.each(markups)('markupToYDocNoSchema', (markup) => {
    it('converts markup to ydoc', () => {
      const ydoc1 = markupToYDoc(markup, 'test')
      const ydoc2 = markupToYDocNoSchema(markup, 'test')

      expect(ydoc2.getXmlFragment('test').toJSON()).toEqual(ydoc1.getXmlFragment('test').toJSON())
    })

    it('converts markup to ydoc and back', () => {
      const ydoc = markupToYDocNoSchema(markup, 'test')
      const back = yDocToMarkup(ydoc, 'test')

      expect(JSON.parse(back)).toEqual(JSON.parse(markup))
    })
  })

  describe.each(markups)('jsonToYDocNoSchema', (markup) => {
    it('converts json to ydoc', () => {
      const json = markupToJSON(markup)
      const ydoc1 = jsonToYDocNoSchema(json, 'test')
      const ydoc2 = markupToYDoc(markup, 'test')

      expect(ydoc1.getXmlFragment('test').toJSON()).toEqual(ydoc2.getXmlFragment('test').toJSON())
    })
  })
})
