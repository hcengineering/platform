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

import { matchesSearch } from '../search'

jest.mock('@hcengineering/platform', () => ({
  translate: jest.fn()
}))

jest.mock('@hcengineering/theme', () => ({
  themeStore: {
    language: 'en'
  }
}))

jest.mock('svelte/store', () => ({
  get: jest.fn((store) => store)
}))

describe('matchesSearch', () => {
  it('matches everything on an empty search term', () => {
    expect(matchesSearch('Separator line', undefined, '')).toBe(true)
    expect(matchesSearch('', undefined, '')).toBe(true)
  })

  it('matches the text case-insensitively', () => {
    expect(matchesSearch('Separator line', undefined, 'sep')).toBe(true)
    expect(matchesSearch('Separator line', undefined, 'LINE')).toBe(true)
    expect(matchesSearch('Separator line', undefined, 'table')).toBe(false)
  })

  it('matches keywords case-insensitively', () => {
    expect(matchesSearch('Separator line', ['divider', 'hr'], 'divider')).toBe(true)
    expect(matchesSearch('Separator line', ['divider', 'hr'], 'Div')).toBe(true)
    expect(matchesSearch('Separator line', ['divider', 'hr'], 'hr')).toBe(true)
    expect(matchesSearch('Separator line', ['divider', 'hr'], 'image')).toBe(false)
  })

  it('does not match keywords when none are given', () => {
    expect(matchesSearch('Separator line', [], 'divider')).toBe(false)
    expect(matchesSearch('Separator line', undefined, 'divider')).toBe(false)
  })
})
