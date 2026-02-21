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

import { isIntlString, extractObjectTitleOrName } from '../formatter/utils'

jest.mock('@hcengineering/platform', () => {
  const actual = jest.requireActual('@hcengineering/platform')
  return {
    ...actual,
    plugin: jest.fn((_id: string, def: unknown) => def),
    translate: jest.fn(async (str: unknown) => `translated:${String(str)}`)
  }
})

describe('formatter/utils', () => {
  describe('isIntlString', () => {
    it('returns true for plugin:resource:key format', () => {
      expect(isIntlString('card:string:Card')).toBe(true)
      expect(isIntlString('contact:class:UserProfile')).toBe(true)
      expect(isIntlString('a:b:c')).toBe(true)
    })

    it('returns false for empty string', () => {
      expect(isIntlString('')).toBe(false)
    })

    it('returns false for string with fewer than 3 parts', () => {
      expect(isIntlString('plugin:key')).toBe(false)
      expect(isIntlString('single')).toBe(false)
    })

    it('returns false for string with empty segment', () => {
      expect(isIntlString('plugin::key')).toBe(false)
      expect(isIntlString(':resource:key')).toBe(false)
      expect(isIntlString('plugin:resource:')).toBe(false)
    })

    it('returns false for non-string', () => {
      expect(isIntlString(null as any)).toBe(false)
      expect(isIntlString(undefined as any)).toBe(false)
    })
  })

  describe('extractObjectTitleOrName', () => {
    it('returns title when present and not IntlString', async () => {
      expect(await extractObjectTitleOrName({ title: 'My Title' }, undefined)).toBe('My Title')
    })

    it('returns name when present and title absent', async () => {
      expect(await extractObjectTitleOrName({ name: 'My Name' }, undefined)).toBe('My Name')
    })

    it('prefers title over name', async () => {
      expect(await extractObjectTitleOrName({ title: 'Title', name: 'Name' }, undefined)).toBe('Title')
    })

    it('returns translated value for IntlString title', async () => {
      expect(await extractObjectTitleOrName({ title: 'card:string:Card' }, 'en')).toBe('translated:card:string:Card')
    })

    it('returns empty string when neither title nor name', async () => {
      expect(await extractObjectTitleOrName({}, undefined)).toBe('')
      expect(await extractObjectTitleOrName({ other: 'x' }, undefined)).toBe('')
    })
  })
})
