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

import { isSameEnumValues, normalizeEditedEnumValues } from '../enumValuesUtils'

describe('normalizeEditedEnumValues', () => {
  const original = ['a', 'b', 'c']

  it('keeps unchanged values', () => {
    expect(normalizeEditedEnumValues(original, ['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
  })

  it('accepts and trims an edited value', () => {
    expect(normalizeEditedEnumValues(original, ['a', 'b2', 'c'])).toEqual(['a', 'b2', 'c'])
    expect(normalizeEditedEnumValues(original, ['a', '  b2 ', 'c'])).toEqual(['a', 'b2', 'c'])
  })

  it('rejects an empty value', () => {
    expect(normalizeEditedEnumValues(original, ['a', '', 'c'])).toBeUndefined()
    expect(normalizeEditedEnumValues(original, ['a', '   ', 'c'])).toBeUndefined()
  })

  it('rejects a duplicate value', () => {
    expect(normalizeEditedEnumValues(original, ['a', 'c', 'c'])).toBeUndefined()
    expect(normalizeEditedEnumValues(original, ['a', ' a', 'c'])).toBeUndefined()
  })

  it('does not reject an edit because of pre-existing invalid values', () => {
    expect(normalizeEditedEnumValues(['a', 'a', '', 'x'], ['a', 'a', '', 'y'])).toEqual(['a', 'a', '', 'y'])
  })
})

describe('isSameEnumValues', () => {
  it('compares values and order', () => {
    expect(isSameEnumValues(['a', 'b'], ['a', 'b'])).toBe(true)
    expect(isSameEnumValues(['a', 'b'], ['b', 'a'])).toBe(false)
    expect(isSameEnumValues(['a'], ['a', 'b'])).toBe(false)
  })
})
