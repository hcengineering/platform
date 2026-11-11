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

import { getNameSearch, getNameSearchTokens } from '../nameSearch'

describe('getNameSearchTokens', () => {
  it('splits on whitespace and commas', () => {
    expect(getNameSearchTokens('John Doe')).toEqual(['John', 'Doe'])
    expect(getNameSearchTokens('  Doe,John ')).toEqual(['Doe', 'John'])
    expect(getNameSearchTokens('Doe, \tJohn')).toEqual(['Doe', 'John'])
  })

  it('returns no tokens for empty input', () => {
    expect(getNameSearchTokens('')).toEqual([])
    expect(getNameSearchTokens(' , ')).toEqual([])
  })
})

describe('getNameSearch', () => {
  it('keeps single word search unchanged', () => {
    for (const search of ['', 'John', 'Jo', ' John', 'Doe,']) {
      const s = getNameSearch(search)
      expect(s.like).toBe('%' + search + '%')
      expect(s.matches('anything')).toBe(true)
      expect(s.matches(undefined)).toBe(true)
    }
  })

  it('queries by the longest word', () => {
    expect(getNameSearch('Jo Doeson').like).toBe('%Doeson%')
    expect(getNameSearch('Johnny Doe').like).toBe('%Johnny%')
  })

  it('matches full name in any order', () => {
    // Person names are stored as `Last,First`, see combineName
    const stored = 'Doe,John'
    expect(getNameSearch('John Doe').matches(stored)).toBe(true)
    expect(getNameSearch('Doe John').matches(stored)).toBe(true)
    expect(getNameSearch('Doe, John').matches(stored)).toBe(true)
    expect(getNameSearch('john doe').matches(stored)).toBe(true)
    expect(getNameSearch('Jo Do').matches(stored)).toBe(true)
  })

  it('requires every word to match', () => {
    const stored = 'Doe,John'
    expect(getNameSearch('John Smith').matches(stored)).toBe(false)
    expect(getNameSearch('Jane Doe').matches(stored)).toBe(false)
    expect(getNameSearch('John Doe').matches(undefined)).toBe(false)
  })
})
