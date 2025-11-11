//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { _getOperator, isOperator } from '../operator'
import type { Doc } from '../classes'

describe('operator', () => {
  describe('isOperator', () => {
    it('should return true for operator objects', () => {
      expect(isOperator({ $push: { arr: 1 } })).toBe(true)
      expect(isOperator({ $pull: { arr: 1 } })).toBe(true)
      expect(isOperator({ $inc: { count: 1 } })).toBe(true)
      expect(isOperator({ $unset: { field: '' } })).toBe(true)
      expect(isOperator({ $rename: { oldField: 'newField' } })).toBe(true)
      expect(isOperator({ $update: { arr: {} } })).toBe(true)
    })

    it('should return true for multiple operators', () => {
      expect(isOperator({ $push: { arr: 1 }, $inc: { count: 1 } })).toBe(true)
    })

    it('should return false for non-operator objects', () => {
      expect(isOperator({ field: 'value' })).toBe(false)
      expect(isOperator({ _id: '123' })).toBe(false)
      expect(isOperator({ name: 'test', value: 123 })).toBe(false)
    })

    it('should return false for empty objects', () => {
      expect(isOperator({})).toBe(false)
    })

    it('should return false for null or non-objects', () => {
      expect(isOperator(null as any)).toBe(false)
      expect(isOperator(undefined as any)).toBe(false)
      expect(isOperator('string' as any)).toBe(false)
      expect(isOperator(123 as any)).toBe(false)
      expect(isOperator([] as any)).toBe(false)
    })

    it('should return false for mixed operator and non-operator keys', () => {
      expect(isOperator({ $push: { arr: 1 }, field: 'value' })).toBe(false)
    })
  })

  describe('$push operator', () => {
    it('should push a single value to an array', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any } as unknown as Doc
      const operator = _getOperator('$push')
      operator(doc, { arr: 'value' })
      expect((doc as any).arr).toEqual(['value'])
    })

    it('should push multiple values with $each', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, arr: [1, 2] } as unknown as Doc
      const operator = _getOperator('$push')
      operator(doc, { arr: { $each: [3, 4, 5] } })
      expect((doc as any).arr).toEqual([3, 4, 5, 1, 2])
    })

    it('should push with $position', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, arr: [1, 2, 3] } as unknown as Doc
      const operator = _getOperator('$push')
      operator(doc, { arr: { $each: [10, 20], $position: 1 } })
      expect((doc as any).arr).toEqual([1, 10, 20, 2, 3])
    })

    it('should push object to array', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, arr: [] } as unknown as Doc
      const operator = _getOperator('$push')
      const obj = { name: 'test', value: 123 }
      operator(doc, { arr: obj })
      expect((doc as any).arr).toEqual([obj])
    })

    it('should initialize undefined field as array', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any } as unknown as Doc
      const operator = _getOperator('$push')
      operator(doc, { newArr: 'value' })
      expect((doc as any).newArr).toEqual(['value'])
    })

    it('should handle null array field', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, arr: null } as any
      const operator = _getOperator('$push')
      operator(doc, { arr: 'value' })
      expect((doc as any).arr).toEqual(['value'])
    })

    it('should handle pushing to non-array field', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, field: 'string' } as unknown as Doc
      const operator = _getOperator('$push')
      operator(doc, { field: 'value' })
      // Should replace non-array with array
      expect((doc as any).field).toEqual(['value'])
    })
  })

  describe('$pull operator', () => {
    it('should pull a single value from array', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, arr: [1, 2, 3, 2] } as unknown as Doc
      const operator = _getOperator('$pull')
      operator(doc, { arr: 2 })
      expect((doc as any).arr).toEqual([1, 3])
    })

    it('should pull multiple values with $in', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, arr: [1, 2, 3, 4, 5] } as unknown as Doc
      const operator = _getOperator('$pull')
      operator(doc, { arr: { $in: [2, 4] } })
      expect((doc as any).arr).toEqual([1, 3, 5])
    })

    it('should pull objects matching all fields', () => {
      const doc: Doc = {
        _id: '1' as any,
        _class: 'test' as any,
        arr: [
          { name: 'a', value: 1 },
          { name: 'b', value: 2 },
          { name: 'a', value: 3 }
        ]
      } as unknown as Doc
      const operator = _getOperator('$pull')
      operator(doc, { arr: { name: 'a', value: 1 } })
      expect((doc as any).arr).toEqual([
        { name: 'b', value: 2 },
        { name: 'a', value: 3 }
      ])
    })

    it('should handle undefined field', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any } as unknown as Doc
      const operator = _getOperator('$pull')
      operator(doc, { arr: 'value' })
      expect((doc as any).arr).toEqual([])
    })

    it('should handle null array', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, arr: null } as any
      const operator = _getOperator('$pull')
      operator(doc, { arr: 'value' })
      expect((doc as any).arr).toEqual([])
    })

    it('should not pull when object fields do not all match', () => {
      const doc: Doc = {
        _id: '1' as any,
        _class: 'test' as any,
        arr: [
          { name: 'a', value: 1 },
          { name: 'b', value: 2 }
        ]
      } as unknown as Doc
      const operator = _getOperator('$pull')
      operator(doc, { arr: { name: 'a', value: 999 } })
      expect((doc as any).arr).toEqual([
        { name: 'a', value: 1 },
        { name: 'b', value: 2 }
      ])
    })
  })

  describe('$update operator', () => {
    it('should update matching array elements', () => {
      const doc: Doc = {
        _id: '1' as any,
        _class: 'test' as any,
        arr: [
          { name: 'a', value: 1 },
          { name: 'b', value: 2 },
          { name: 'a', value: 3 }
        ]
      } as unknown as Doc
      const operator = _getOperator('$update')
      operator(doc, {
        arr: {
          $query: { name: 'a' },
          $update: { value: 100 }
        }
      })
      expect((doc as any).arr).toEqual([
        { name: 'a', value: 100 },
        { name: 'b', value: 2 },
        { name: 'a', value: 100 }
      ])
    })

    it('should handle empty array', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, arr: [] } as unknown as Doc
      const operator = _getOperator('$update')
      operator(doc, {
        arr: {
          $query: { name: 'a' },
          $update: { value: 100 }
        }
      })
      expect((doc as any).arr).toEqual([])
    })

    it('should handle undefined field', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any } as unknown as Doc
      const operator = _getOperator('$update')
      operator(doc, {
        arr: {
          $query: { name: 'a' },
          $update: { value: 100 }
        }
      })
      expect((doc as any).arr).toEqual([])
    })

    it('should update multiple fields', () => {
      const doc: Doc = {
        _id: '1' as any,
        _class: 'test' as any,
        arr: [{ name: 'a', value: 1, extra: 'old' }]
      } as unknown as Doc
      const operator = _getOperator('$update')
      operator(doc, {
        arr: {
          $query: { name: 'a' },
          $update: { value: 100, extra: 'new' }
        }
      })
      expect((doc as any).arr).toEqual([{ name: 'a', value: 100, extra: 'new' }])
    })

    it('should not update non-matching elements', () => {
      const doc: Doc = {
        _id: '1' as any,
        _class: 'test' as any,
        arr: [
          { name: 'a', value: 1 },
          { name: 'b', value: 2 }
        ]
      } as unknown as Doc
      const operator = _getOperator('$update')
      operator(doc, {
        arr: {
          $query: { name: 'c' },
          $update: { value: 100 }
        }
      })
      expect((doc as any).arr).toEqual([
        { name: 'a', value: 1 },
        { name: 'b', value: 2 }
      ])
    })
  })

  describe('$inc operator', () => {
    it('should increment existing number', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, count: 5 } as unknown as Doc
      const operator = _getOperator('$inc')
      operator(doc, { count: 3 })
      expect((doc as any).count).toBe(8)
    })

    it('should initialize undefined field to increment value', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any } as unknown as Doc
      const operator = _getOperator('$inc')
      operator(doc, { count: 10 })
      expect((doc as any).count).toBe(10)
    })

    it('should handle negative increment', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, count: 10 } as unknown as Doc
      const operator = _getOperator('$inc')
      operator(doc, { count: -3 })
      expect((doc as any).count).toBe(7)
    })

    it('should increment multiple fields', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, a: 1, b: 2 } as unknown as Doc
      const operator = _getOperator('$inc')
      operator(doc, { a: 10, b: 20 })
      expect((doc as any).a).toBe(11)
      expect((doc as any).b).toBe(22)
    })

    it('should handle zero increment', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, count: 5 } as unknown as Doc
      const operator = _getOperator('$inc')
      operator(doc, { count: 0 })
      expect((doc as any).count).toBe(5)
    })
  })

  describe('$unset operator', () => {
    it('should remove existing field', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, field: 'value' } as unknown as Doc
      const operator = _getOperator('$unset')
      operator(doc, { field: '' })
      expect((doc as any).field).toBeUndefined()
    })

    it('should handle undefined field', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any } as unknown as Doc
      const operator = _getOperator('$unset')
      operator(doc, { field: '' })
      expect((doc as any).field).toBeUndefined()
    })

    it('should unset multiple fields', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, a: 1, b: 2, c: 3 } as unknown as Doc
      const operator = _getOperator('$unset')
      operator(doc, { a: '', c: '' })
      expect((doc as any).a).toBeUndefined()
      expect((doc as any).b).toBe(2)
      expect((doc as any).c).toBeUndefined()
    })

    it('should unset nested objects', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, obj: { nested: 'value' } } as unknown as Doc
      const operator = _getOperator('$unset')
      operator(doc, { obj: '' })
      expect((doc as any).obj).toBeUndefined()
    })
  })

  describe('$rename operator', () => {
    it('should rename existing field', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, oldName: 'value' } as unknown as Doc
      const operator = _getOperator('$rename')
      operator(doc, { oldName: 'newName' })
      expect((doc as any).oldName).toBeUndefined()
      expect((doc as any).newName).toBe('value')
    })

    it('should handle undefined field', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any } as unknown as Doc
      const operator = _getOperator('$rename')
      operator(doc, { oldName: 'newName' })
      expect((doc as any).oldName).toBeUndefined()
      expect((doc as any).newName).toBeUndefined()
    })

    it('should rename multiple fields', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, a: 1, b: 2 } as unknown as Doc
      const operator = _getOperator('$rename')
      operator(doc, { a: 'x', b: 'y' })
      expect((doc as any).a).toBeUndefined()
      expect((doc as any).b).toBeUndefined()
      expect((doc as any).x).toBe(1)
      expect((doc as any).y).toBe(2)
    })

    it('should overwrite existing field with same name', () => {
      const doc: Doc = {
        _id: '1' as any,
        _class: 'test' as any,
        old: 'oldValue',
        new: 'existingValue'
      } as unknown as Doc
      const operator = _getOperator('$rename')
      operator(doc, { old: 'new' })
      expect((doc as any).old).toBeUndefined()
      expect((doc as any).new).toBe('oldValue')
    })

    it('should preserve object references when renaming', () => {
      const obj = { nested: 'value' }
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, oldName: obj } as unknown as Doc
      const operator = _getOperator('$rename')
      operator(doc, { oldName: 'newName' })
      expect((doc as any).newName).toBe(obj)
    })
  })

  describe('_getOperator', () => {
    it('should return correct operator functions', () => {
      expect(_getOperator('$push')).toBeDefined()
      expect(_getOperator('$pull')).toBeDefined()
      expect(_getOperator('$update')).toBeDefined()
      expect(_getOperator('$inc')).toBeDefined()
      expect(_getOperator('$unset')).toBeDefined()
      expect(_getOperator('$rename')).toBeDefined()
    })

    it('should throw error for unknown operator', () => {
      expect(() => _getOperator('$unknown')).toThrow('unknown operator: $unknown')
      expect(() => _getOperator('$invalid')).toThrow('unknown operator: $invalid')
    })
  })
})
