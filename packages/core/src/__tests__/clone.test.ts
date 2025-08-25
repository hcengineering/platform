//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { clone, getTypeOf } from '../clone'

describe('clone', () => {
  it('should handle primitive types', () => {
    expect(clone(undefined)).toBeUndefined()
    expect(clone(null)).toBeNull()
    expect(clone(123)).toBe(123)
    expect(clone('test')).toBe('test')
    expect(clone(true)).toBe(true)
  })

  it('should clone Date objects', () => {
    const date = new Date()
    const cloned = clone(date)
    expect(cloned).toBeInstanceOf(Date)
    expect(cloned.getTime()).toBe(date.getTime())
  })

  it('should clone Arrays', () => {
    const arr = [1, 'test', { a: 1 }, new Date()]
    const cloned = clone(arr)
    expect(cloned).toEqual(arr)
    expect(cloned).not.toBe(arr)
    expect(cloned[2]).not.toBe(arr[2])
    expect(cloned[3]).not.toBe(arr[3])
  })

  it('should clone Objects', () => {
    const obj = {
      num: 123,
      str: 'test',
      date: new Date(),
      nested: { a: 1 },
      arr: [1, 2, 3]
    }
    const cloned = clone(obj)
    expect(cloned).toEqual(obj)
    expect(cloned).not.toBe(obj)
    expect(cloned.nested).not.toBe(obj.nested)
    expect(cloned.arr).not.toBe(obj.arr)
    expect(cloned.date).not.toBe(obj.date)
  })

  it('should respect depth parameter', () => {
    const deep = { a: { b: { c: { d: 1 } } } }
    expect(clone(deep, undefined, undefined, 0)).toBe(deep)
    expect(clone(deep, undefined, undefined, 1)).toEqual({ a: { b: { c: { d: 1 } } } })
    expect(clone(deep, undefined, undefined, 2)).toEqual({ a: { b: { c: { d: 1 } } } })
    expect(clone(deep, undefined, undefined, 3)).toEqual({ a: { b: { c: { d: 1 } } } })
  })

  it('should handle functions', () => {
    const fn: () => any = () => {}
    expect(clone(fn)).toBe(fn)
  })
})

describe('getTypeOf', () => {
  it('should detect types correctly', () => {
    expect(getTypeOf(null)).toBe('null')
    expect(getTypeOf([])).toBe('Array')
    expect(getTypeOf({})).toBe('Object')
    expect(getTypeOf(new Date())).toBe('Date')
    expect(getTypeOf(/test/)).toBe('RegExp')
    expect(getTypeOf(123)).toBe('number')
    expect(getTypeOf('test')).toBe('string')
  })
})
