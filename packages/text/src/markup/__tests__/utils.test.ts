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
import { MarkupNode, MarkupNodeType } from '../model'
import { EmptyMarkup, getMarkup, isEmptyMarkup, jsonToMarkup, markupToJSON } from '../utils'
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
})
