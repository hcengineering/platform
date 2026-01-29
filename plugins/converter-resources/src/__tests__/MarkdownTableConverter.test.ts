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

import { MarkdownTableConverter } from '../types'

describe('MarkdownTableConverter', () => {
  const converter = new MarkdownTableConverter()

  it('has format "markdown"', () => {
    expect(converter.format).toBe('markdown')
  })

  describe('buildTable', () => {
    it('builds markdown table from headers and rows', () => {
      const headers = ['Name', 'Status']
      const rows = [
        ['Task A', 'Done'],
        ['Task B', 'In Progress']
      ]
      const result = converter.buildTable(headers, rows)
      expect(result).toBe(
        '| Name | Status |\n' + '| --- | --- |\n' + '| Task A | Done |\n' + '| Task B | In Progress |\n'
      )
    })

    it('handles empty rows', () => {
      const headers = ['Col1']
      const result = converter.buildTable(headers, [])
      expect(result).toBe('| Col1 |\n| --- |\n')
    })
  })

  describe('escapeValue', () => {
    it('escapes pipe in text', () => {
      expect(converter.escapeValue('a|b')).toBe('a\\|b')
    })

    it('escapes brackets in text', () => {
      expect(converter.escapeValue('[link]')).toBe('\\[link\\]')
    })
  })

  describe('createLink', () => {
    it('produces markdown link syntax', () => {
      const result = converter.createLink('https://example.com', 'Example')
      expect(result).toBe('[Example](https://example.com)')
    })

    it('escapes link text and url', () => {
      const result = converter.createLink('https://example.com/path)', 'Text|here')
      expect(result).toContain('\\|')
      expect(result).toContain('\\)')
    })
  })
})
