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
  EnumValuesDraft,
  isSameEnumValues,
  normalizeEditedEnumValues,
  validateEditedEnumValues
} from '../enumValuesUtils'

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

describe('validateEditedEnumValues', () => {
  it('distinguishes empty and duplicate validation messages', () => {
    expect(validateEditedEnumValues(['a', 'b'], ['a', '  '])).toEqual({ error: 'empty' })
    expect(validateEditedEnumValues(['a', 'b'], ['a', ' a '])).toEqual({ error: 'duplicate' })
  })
})

describe('EnumValuesDraft', () => {
  it('keeps edits separate from the live-query document', () => {
    const stored = ['a', 'b']
    const draft = new EnumValuesDraft()
    draft.sync(stored)
    draft.beginEdit()
    draft.values[1] = ' b2 '

    expect(stored).toEqual(['a', 'b'])
    expect(draft.finishEdit(stored)).toEqual({ values: ['a', 'b2'] })
    expect(draft.values).toEqual(['a', 'b2'])
    expect(stored).toEqual(['a', 'b'])
  })

  it.each([
    { edited: '', error: 'empty' },
    { edited: ' a ', error: 'duplicate' }
  ])('restores saved options and reports $error', ({ edited, error }) => {
    const stored = ['a', 'b']
    const draft = new EnumValuesDraft()
    draft.sync(stored)
    draft.beginEdit()
    draft.values[1] = edited

    expect(draft.finishEdit(stored)).toEqual({ error })
    expect(draft.values).toEqual(stored)
    expect(draft.values).not.toBe(stored)
    expect(draft.finishEdit(stored)).toEqual({ values: ['a', 'b'] })
  })

  it.each([
    { change: 'rename', stored: ['a', 'remote'] },
    { change: 'addition', stored: ['a', 'b', 'new'] },
    { change: 'reorder', stored: ['b', 'a'] },
    { change: 'removal', stored: ['a'] },
    { change: 'removal of all options', stored: [] }
  ])('preserves typing and rejects a stale edit after a remote $change', ({ stored }) => {
    const draft = new EnumValuesDraft()
    draft.sync(['a', 'b'])
    draft.beginEdit()
    draft.values[1] = 'local'
    draft.sync(stored)

    expect(draft.values).toEqual(['a', 'local'])
    expect(draft.finishEdit(stored)).toEqual({ error: 'conflict' })
    expect(draft.values).toEqual(stored)
    expect(stored).not.toContain('local')
  })

  it('defers remote options even before the first keystroke', () => {
    const draft = new EnumValuesDraft()
    draft.sync(['a', 'b'])
    draft.beginEdit()
    draft.sync(['a', 'remote'])

    expect(draft.values).toEqual(['a', 'b'])
    expect(draft.finishEdit(['a', 'remote'])).toEqual({ values: ['a', 'remote'] })
    expect(draft.values).toEqual(['a', 'remote'])
  })

  it('allows an edit after a live-query update with unchanged options', () => {
    const draft = new EnumValuesDraft()
    draft.sync(['a', 'b'])
    draft.beginEdit()
    draft.values[1] = 'local'
    draft.sync(['a', 'b'])

    expect(draft.values).toEqual(['a', 'local'])
    expect(draft.finishEdit(['a', 'b'])).toEqual({ values: ['a', 'local'] })
  })

  it('accepts its own save acknowledgement without overwriting the next edit', () => {
    const draft = new EnumValuesDraft()
    draft.sync(['a', 'b'])
    draft.beginEdit()
    draft.values[1] = 'first'
    expect(draft.finishEdit(['a', 'b'])).toEqual({ values: ['a', 'first'] })

    draft.beginEdit()
    draft.values[1] = 'second'
    draft.sync(['a', 'first'])

    expect(draft.values).toEqual(['a', 'second'])
    expect(draft.finishEdit(['a', 'first'])).toEqual({ values: ['a', 'second'] })
  })

  it('copies save results so later typing cannot change an in-flight update', () => {
    const draft = new EnumValuesDraft()
    draft.sync(['a', 'b'])
    draft.beginEdit()
    draft.values[1] = 'first'
    const result = draft.finishEdit(['a', 'b'])
    draft.beginEdit()
    draft.values[1] = 'second'

    expect(result).toEqual({ values: ['a', 'first'] })
  })

  it('synchronizes remote options when idle', () => {
    const draft = new EnumValuesDraft()
    draft.sync(['a', 'b'])
    draft.sync(['a', 'remote'])

    expect(draft.values).toEqual(['a', 'remote'])
  })

  it('keeps legacy values intact when reordering', () => {
    const stored = ['a', '', 'a', ' x ']
    const draft = new EnumValuesDraft()
    draft.sync(stored)
    draft.beginEdit()
    draft.values = [' x ', 'a', '', 'a']

    expect(draft.finishEdit(stored, false)).toEqual({ values: [' x ', 'a', '', 'a'] })
    expect(stored).toEqual(['a', '', 'a', ' x '])
  })

  it('rejects a stale reorder without overwriting remote options', () => {
    const draft = new EnumValuesDraft()
    draft.sync(['a', 'b'])
    draft.beginEdit()
    draft.values = ['b', 'a']
    draft.sync(['a', 'b', 'remote'])

    expect(draft.finishEdit(['a', 'b', 'remote'], false)).toEqual({ error: 'conflict' })
    expect(draft.values).toEqual(['a', 'b', 'remote'])
  })

  it('resumes synchronization after a drag ends without a drop', () => {
    const draft = new EnumValuesDraft()
    draft.sync(['a', 'b'])
    draft.beginEdit()
    draft.values = ['b', 'a']
    draft.sync(['a', 'remote'])
    expect(draft.values).toEqual(['b', 'a'])

    draft.endEdit(['a', 'remote'])
    expect(draft.values).toEqual(['a', 'remote'])
    draft.sync(['a', 'new'])
    expect(draft.values).toEqual(['a', 'new'])
  })
})
