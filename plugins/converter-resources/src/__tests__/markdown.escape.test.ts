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

import { escapeMarkdownLinkText, escapeMarkdownLinkUrl } from '../markdown/escape'

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

    it('returns plain URL unchanged when no special chars', () => {
      expect(escapeMarkdownLinkUrl('https://example.com')).toBe('https://example.com')
    })
  })
})
