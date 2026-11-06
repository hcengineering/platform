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

import type { Enum } from '@hcengineering/core'
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

  it('discards a canceled reorder when stored options are unchanged', () => {
    const draft = new EnumValuesDraft()
    draft.sync(['a', 'b'])
    draft.beginEdit()
    draft.values = ['b', 'a']
    draft.endEdit(['a', 'b'])
    expect(draft.values).toEqual(['a', 'b'])

    draft.beginEdit()
    draft.values[1] = 'b2'
    expect(draft.finishEdit(['a', 'b'])).toEqual({ values: ['a', 'b2'] })
  })

  it('keeps a submitted drop if dragend occurs before acknowledgement', () => {
    const draft = new EnumValuesDraft()
    draft.sync(['a', 'b'])
    draft.beginEdit()
    draft.values = ['b', 'a']
    expect(draft.finishEdit(['a', 'b'], false)).toEqual({ values: ['b', 'a'] })
    draft.endEdit(['a', 'b'])
    expect(draft.values).toEqual(['b', 'a'])
    draft.sync(['b', 'a'])
    expect(draft.values).toEqual(['b', 'a'])
  })
})

function deferred (): { promise: Promise<void>, resolve: () => void } {
  let complete: (() => void) | undefined
  const promise = new Promise<void>((resolve) => {
    complete = resolve
  })
  return {
    promise,
    resolve: () => {
      if (complete === undefined) throw new Error('Missing deferred resolver')
      complete()
    }
  }
}

function enumDocument (): Enum {
  // Synthetic document with the same fields and string-array payload as a live Enum.
  return {
    _id: 'enum' as Enum['_id'],
    _class: 'core:class:Enum' as Enum['_class'],
    space: 'core:space:Model' as Enum['space'],
    modifiedBy: 'person' as Enum['modifiedBy'],
    modifiedOn: 0,
    name: 'Example',
    enumValues: ['a', 'b']
  }
}

describe('EnumValuesDraft.save', () => {
  it('sends one client.update for Enter followed by blur before acknowledgement', async () => {
    const pending = deferred()
    const update = jest.fn(async () => {
      await pending.promise
    })
    const value = enumDocument()
    const draft = new EnumValuesDraft()
    draft.sync(value.enumValues)
    draft.beginEdit()
    draft.values[1] = ' first '
    const enter = draft.save({ update }, value)
    const blur = draft.save({ update }, value)

    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith(value, { enumValues: ['a', 'first'] })
    expect(draft.values).toEqual(['a', 'first'])
    pending.resolve()
    await Promise.all([enter, blur])
  })

  it.each([false, true])('keeps two pending saves across an earlier acknowledgement with typing=%s', async (typing) => {
    const firstUpdate = deferred()
    const secondUpdate = deferred()
    const thirdUpdate = deferred()
    const update = jest
      .fn()
      .mockReturnValueOnce(firstUpdate.promise)
      .mockReturnValueOnce(secondUpdate.promise)
      .mockReturnValueOnce(thirdUpdate.promise)
    const value = enumDocument()
    const draft = new EnumValuesDraft()
    draft.sync(value.enumValues)
    draft.beginEdit()
    draft.values[1] = 'first'
    const first = draft.save({ update }, value)
    draft.beginEdit()
    draft.values[1] = 'second'
    const second = draft.save({ update }, value)
    if (typing) {
      draft.beginEdit()
      draft.values[0] = 'third'
    }

    value.enumValues = ['a', 'first']
    draft.sync(value.enumValues)
    firstUpdate.resolve()
    await first
    expect(draft.values).toEqual([typing ? 'third' : 'a', 'second'])
    const third = draft.save({ update }, value)
    expect(update).toHaveBeenCalledTimes(typing ? 3 : 2)
    expect(update).toHaveBeenNthCalledWith(1, value, { enumValues: ['a', 'first'] })
    expect(update).toHaveBeenNthCalledWith(2, value, { enumValues: ['a', 'second'] })
    if (typing) {
      expect(update).toHaveBeenNthCalledWith(3, value, { enumValues: ['third', 'second'] })
    }

    value.enumValues = ['a', 'second']
    draft.sync(value.enumValues)
    expect(draft.values).toEqual([typing ? 'third' : 'a', 'second'])
    secondUpdate.resolve()
    thirdUpdate.resolve()
    await Promise.all([first, second, third])
  })

  it('keeps a newer draft when update promises complete in reverse order', async () => {
    const firstUpdate = deferred()
    const secondUpdate = deferred()
    const update = jest.fn().mockReturnValueOnce(firstUpdate.promise).mockReturnValueOnce(secondUpdate.promise)
    const value = enumDocument()
    const draft = new EnumValuesDraft()
    draft.sync(value.enumValues)
    draft.beginEdit()
    draft.values[1] = 'first'
    const first = draft.save({ update }, value)
    draft.beginEdit()
    draft.values[1] = 'second'
    const second = draft.save({ update }, value)
    secondUpdate.resolve()
    await second
    draft.beginEdit()
    draft.values[0] = 'typing'
    firstUpdate.resolve()
    await first

    expect(draft.values).toEqual(['typing', 'second'])
    expect(update).toHaveBeenNthCalledWith(1, value, { enumValues: ['a', 'first'] })
    expect(update).toHaveBeenNthCalledWith(2, value, { enumValues: ['a', 'second'] })
  })

  it('restores the last accepted local list when validation fails with a pending save', async () => {
    const pending = deferred()
    const update = jest.fn(async () => {
      await pending.promise
    })
    const value = enumDocument()
    const draft = new EnumValuesDraft()
    draft.sync(value.enumValues)
    draft.beginEdit()
    draft.values[1] = 'first'
    const first = draft.save({ update }, value)
    draft.beginEdit()
    draft.values[0] = ' '
    expect(await draft.save({ update }, value)).toEqual({ error: 'empty' })
    expect(draft.values).toEqual(['a', 'first'])
    expect(update).toHaveBeenCalledTimes(1)
    pending.resolve()
    await first
  })

  it('allows retrying a failed write instead of deduplicating it as a pending save', async () => {
    const update = jest.fn().mockRejectedValueOnce(new Error('Save failed')).mockResolvedValue(undefined)
    const value = enumDocument()
    const draft = new EnumValuesDraft()
    draft.sync(value.enumValues)
    draft.beginEdit()
    draft.values[1] = 'first'
    await expect(draft.save({ update }, value)).rejects.toThrow('Save failed')
    expect(draft.values).toEqual(['a', 'first'])
    await draft.save({ update }, value)
    expect(update).toHaveBeenCalledTimes(2)
    expect(update).toHaveBeenLastCalledWith(value, { enumValues: ['a', 'first'] })
  })
})
