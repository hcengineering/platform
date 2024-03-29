/**
 * @jest-environment jsdom
 */

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

import { Editor } from '@tiptap/core'
import { MarkupMarkType, MarkupNode, MarkupNodeType } from '../model'
import {
  EmptyMarkup,
  areEqualMarkups,
  getMarkup,
  htmlToMarkup,
  isEmptyMarkup,
  jsonToMarkup,
  jsonToText,
  makeSingleParagraphDoc,
  markupToHTML,
  markupToJSON
} from '../utils'
import { ServerKit } from '../../kits/server-kit'

const extensions = [ServerKit]

describe('markup', () => {
  it('EmptyMarkup', async () => {
    const editor = new Editor({ extensions })
    expect(getMarkup(editor)).toEqual(EmptyMarkup)
  })
  describe('getMarkup', () => {
    it('with empty content', async () => {
      const editor = new Editor({ extensions })
      expect(getMarkup(editor)).toEqual('{"type":"doc","content":[{"type":"paragraph"}]}')
    })
    it('with some content', async () => {
      const editor = new Editor({ extensions, content: '<p>hello</p>' })
      expect(getMarkup(editor)).toEqual(
        '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello"}]}]}'
      )
    })
    it('with empty paragraphs as content', async () => {
      const editor = new Editor({ extensions, content: '<p></p><p></p>' })
      expect(getMarkup(editor)).toEqual('{"type":"doc","content":[{"type":"paragraph"},{"type":"paragraph"}]}')
    })
  })
  describe('markupToJSON', () => {
    it('with empty content', async () => {
      expect(markupToJSON('')).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
    })
    it('with some content', async () => {
      const markup = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello"}]}]}'
      expect(markupToJSON(markup)).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }]
      })
    })
  })
  describe('jsonToMarkup', () => {
    it('with some content', async () => {
      const json: MarkupNode = {
        type: MarkupNodeType.doc,
        content: [
          {
            type: MarkupNodeType.paragraph,
            content: [
              {
                type: MarkupNodeType.text,
                text: 'hello'
              }
            ]
          }
        ]
      }
      expect(jsonToMarkup(json)).toEqual(
        '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello"}]}]}'
      )
    })
  })
  describe('htmlToMarkup', () => {
    it('converts HTML to Markup', () => {
      const html = '<p>Hello, world!</p>'
      const expectedMarkup =
        '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello, world!"}]}]}'
      expect(htmlToMarkup(html)).toEqual(expectedMarkup)
    })
  })
  describe('markupToHTML', () => {
    it('converts markup to HTML', () => {
      const markup =
        '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello, world!"}]}]}'
      const expectedHtml = '<p>Hello, World!</p>'
      expect(markupToHTML(markup)).toEqual(expectedHtml)
    })
  })
  describe('jsonToText', () => {
    it('returns empty string for text node with no text', () => {
      const node: MarkupNode = {
        type: MarkupNodeType.text,
        text: undefined
      }
      expect(jsonToText(node)).toEqual('')
    })
    it('returns text for text node', () => {
      const node: MarkupNode = {
        type: MarkupNodeType.text,
        text: 'Hello, world!'
      }
      expect(jsonToText(node)).toEqual('Hello, world!')
    })
    it('returns concatenated text for block node with multiple children', () => {
      const node: MarkupNode = {
        type: MarkupNodeType.paragraph,
        content: [
          {
            type: MarkupNodeType.text,
            text: 'Hello '
          },
          {
            type: MarkupNodeType.text,
            text: 'world!'
          }
        ]
      }
      expect(jsonToText(node)).toEqual('Hello world!')
    })
    it('returns text for node with link', () => {
      const node: MarkupNode = {
        type: MarkupNodeType.paragraph,
        content: [
          {
            type: MarkupNodeType.text,
            text: 'Hello! Check out '
          },
          {
            type: MarkupNodeType.text,
            text: 'this page',
            marks: [
              {
                type: MarkupMarkType.link,
                attrs: {
                  href: 'http://example.com/'
                }
              }
            ]
          },
          {
            type: MarkupNodeType.text,
            text: '!'
          }
        ]
      }
      expect(jsonToText(node)).toEqual('Hello! Check out this page!')
    })
    it('returns empty string for block node with no children', () => {
      const node: MarkupNode = {
        type: MarkupNodeType.paragraph,
        content: []
      }
      expect(jsonToText(node)).toEqual('')
    })
    it('returns empty string for block node with empty children', () => {
      const node: MarkupNode = {
        type: MarkupNodeType.paragraph,
        content: [
          {
            type: MarkupNodeType.text,
            text: ''
          },
          {
            type: MarkupNodeType.text,
            text: ''
          }
        ]
      }
      expect(jsonToText(node)).toEqual('')
    })
  })
  describe('isEmptyMarkup', () => {
    it('returns true for undefined content', async () => {
      expect(isEmptyMarkup(undefined)).toBeTruthy()
      expect(isEmptyMarkup('')).toBeTruthy()
    })
    it('returns true for empty content', async () => {
      const editor = new Editor({ extensions })
      expect(isEmptyMarkup(getMarkup(editor))).toBeTruthy()
    })
    it('returns true for empty paragraphs content', async () => {
      const editor = new Editor({ extensions, content: '<p></p><p></p><p></p>' })
      expect(isEmptyMarkup(getMarkup(editor))).toBeTruthy()
    })
    it('returns true for empty paragraphs content with spaces', async () => {
      const editor = new Editor({ extensions, content: '<p> </p><p> </p><p> </p>' })
      expect(isEmptyMarkup(getMarkup(editor))).toBeTruthy()
    })
    it('returns false for not empty content', async () => {
      const editor = new Editor({ extensions, content: '<p>hello</p>' })
      expect(isEmptyMarkup(getMarkup(editor))).toBeFalsy()
    })
  })
  describe('areEqualMarkups', () => {
    it('returns true for the same content', async () => {
      const markup = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello"}]}]}'
      expect(areEqualMarkups(markup, markup)).toBeTruthy()
    })
    it('returns true for the same content with different spaces', async () => {
      const markup1 = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello"}]}]}'
      const markup2 =
        '{"type":"doc","content":[{"type":"hardBreak"},{"type":"paragraph","content":[{"type":"text","text":"hello"}]},{"type":"hardBreak"}]}'
      expect(areEqualMarkups(markup1, markup2)).toBeTruthy()
    })
    it('returns false for different content', async () => {
      const markup1 = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello"}]}]}'
      const markup2 = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"world"}]}]}'
      expect(areEqualMarkups(markup1, markup2)).toBeFalsy()
    })
  })
  describe('makeSingleParagraphDoc', () => {
    it('returns a single paragraph doc', async () => {
      expect(jsonToMarkup(makeSingleParagraphDoc('hello'))).toEqual(
        '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello"}]}]}'
      )
    })
  })
})
