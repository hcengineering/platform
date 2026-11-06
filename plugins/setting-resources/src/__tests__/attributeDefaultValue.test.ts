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

import { defaultValueUpdate, nextDefaultValue } from '../attributeDefaultValue'

describe('nextDefaultValue', () => {
  it('takes a new value from the editor', () => {
    expect(nextDefaultValue({ defaultValue: 'b' }, 'a')).toBe('b')
  })

  it('clears the value when the editor sends undefined', () => {
    expect(nextDefaultValue({ type: {}, defaultValue: undefined }, 'a')).toBeUndefined()
  })

  it('keeps the value when the editor does not send it', () => {
    expect(nextDefaultValue({ extra: { showInPresenter: true } }, 'a')).toBe('a')
    expect(nextDefaultValue(undefined, 'a')).toBe('a')
  })

  it('keeps falsy values', () => {
    expect(nextDefaultValue({ defaultValue: false }, true)).toBe(false)
    expect(nextDefaultValue({ defaultValue: 0 }, 5)).toBe(0)
  })
})

describe('defaultValueUpdate', () => {
  it('returns nothing when unchanged', () => {
    expect(defaultValueUpdate('a', 'a')).toEqual({})
    expect(defaultValueUpdate(undefined, undefined)).toEqual({})
  })

  it('sets a new value', () => {
    expect(defaultValueUpdate('b', 'a')).toEqual({ defaultValue: 'b' })
    expect(defaultValueUpdate('a', undefined)).toEqual({ defaultValue: 'a' })
    expect(defaultValueUpdate(false, true)).toEqual({ defaultValue: false })
  })

  it('unsets a cleared value instead of writing undefined', () => {
    expect(defaultValueUpdate(undefined, 'a')).toEqual({ $unset: { defaultValue: true } })
    expect(defaultValueUpdate(null, 'a')).toEqual({ $unset: { defaultValue: true } })
  })
})
