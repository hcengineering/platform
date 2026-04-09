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

import {
  escapeMarkdownLinkText,
  escapeMarkdownLinkUrl,
  escapeMarkdownTableCellContent,
  looksLikeHttpOrRefMarkdownLink
} from '../markdown/escape'

describe('markdown/escape', () => {
  describe('escapeMarkdownLinkText', () => {
    it('escapes backslashes', () => {
      expect(escapeMarkdownLinkText('a\\b')).toBe('a\\\\b')
    })

    it('escapes square brackets', () => {
      expect(escapeMarkdownLinkText('[text]')).toBe('\\[text\\]')
    })

    it('escapes pipe', () => {
      expect(escapeMarkdownLinkText('a|b')).toBe('a\\|b')
    })

    it('replaces newlines with space', () => {
      expect(escapeMarkdownLinkText('a\nb')).toBe('a b')
      expect(escapeMarkdownLinkText('a\r\nb')).toBe('a b')
    })

    it('returns plain text unchanged when no special chars', () => {
      expect(escapeMarkdownLinkText('Hello World')).toBe('Hello World')
    })
  })

  describe('escapeMarkdownLinkUrl', () => {
    it('escapes backslashes', () => {
      expect(escapeMarkdownLinkUrl('path\\to')).toBe('path\\\\to')
    })

    it('escapes closing parenthesis', () => {
      expect(escapeMarkdownLinkUrl('https://example.com/path)')).toBe('https://example.com/path\\)')
    })

    it('escapes pipe', () => {
      expect(escapeMarkdownLinkUrl('https://example.com/x|y')).toBe('https://example.com/x\\|y')
    })

    it('returns plain URL unchanged when no special chars', () => {
      expect(escapeMarkdownLinkUrl('https://example.com')).toBe('https://example.com')
    })
  })

  describe('looksLikeHttpOrRefMarkdownLink', () => {
    it('returns true for http and https document links', () => {
      expect(looksLikeHttpOrRefMarkdownLink('[t](http://x/y)')).toBe(true)
      expect(looksLikeHttpOrRefMarkdownLink('[t](https://x/y)')).toBe(true)
    })

    it('returns true for ref:// links', () => {
      expect(looksLikeHttpOrRefMarkdownLink('[t](ref://?a=1)')).toBe(true)
    })

    it('trims whitespace before matching', () => {
      expect(looksLikeHttpOrRefMarkdownLink('  [t](http://x)  ')).toBe(true)
    })

    it('returns false for mailto and relative URLs', () => {
      expect(looksLikeHttpOrRefMarkdownLink('[e](mailto:a@b.c)')).toBe(false)
      expect(looksLikeHttpOrRefMarkdownLink('[p](/path)')).toBe(false)
    })

    it('returns false when extra text wraps a link', () => {
      expect(looksLikeHttpOrRefMarkdownLink('see [t](http://x)')).toBe(false)
    })
  })

  describe('escapeMarkdownTableCellContent', () => {
    it('leaves http markdown link from formatValue/createMarkdownLink intact', () => {
      const cell = '[Suite A](http://huly.local:8080/workbench/test/card/69d3cfb2a78c161c977dd6a0)'
      expect(escapeMarkdownTableCellContent(cell)).toBe(cell)
    })

    it('leaves ref:// markdown link intact', () => {
      const cell = '[Doc](ref://?_class=c&_id=i&label=Doc)'
      expect(escapeMarkdownTableCellContent(cell)).toBe(cell)
    })

    it('still escapes plain text that is not a full link', () => {
      expect(escapeMarkdownTableCellContent('[not a link]')).toBe('\\[not a link\\]')
    })

    it('escapes title text with pipes', () => {
      expect(escapeMarkdownTableCellContent('a|b')).toBe('a\\|b')
    })
  })
})
