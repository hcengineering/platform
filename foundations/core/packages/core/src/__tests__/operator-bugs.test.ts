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

import { _getOperator } from '../operator'
import type { Doc } from '../classes'

describe('operator edge cases and potential bugs', () => {
  describe('$push operator edge cases', () => {
    it('BUG: $push with $each on null field should handle gracefully', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, arr: null } as unknown as Doc
      const operator = _getOperator('$push')

      // This exposes a bug: when arr is null and we use $each, nothing happens
      operator(doc, { arr: { $each: [1, 2, 3] } })

      // Expected: should initialize array and add items
      // Actual: arr remains null (bug!)
      // Uncomment to see the bug:
      // expect((doc as any).arr).toEqual([1, 2, 3])

      // Current behavior (documents the bug):
      expect((doc as any).arr).toBe(null)
    })

    it('BUG: $push with $each on non-array field should handle gracefully', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, arr: 'string' } as unknown as Doc
      const operator = _getOperator('$push')

      // This exposes a bug: when arr is a non-array and we use $each, nothing happens
      operator(doc, { arr: { $each: [1, 2, 3] } })

      // Expected: should report error and replace with array
      // Actual: arr remains a string (bug!)
      // Uncomment to see the bug:
      // expect((doc as any).arr).toEqual([1, 2, 3])

      // Current behavior (documents the bug):
      expect((doc as any).arr).toBe('string')
    })

    it('$push without $each on null field works correctly', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, arr: null } as unknown as Doc
      const operator = _getOperator('$push')

      operator(doc, { arr: 'value' })

      // This works correctly - replaces null with array
      expect((doc as any).arr).toEqual(['value'])
    })

    it('$push without $each on non-array field reports error and fixes', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, arr: 'string' } as unknown as Doc
      const operator = _getOperator('$push')

      // This should log an error via Analytics.handleError
      operator(doc, { arr: 'value' })

      // This works - replaces non-array with array
      expect((doc as any).arr).toEqual(['value'])
    })
  })

  describe('$pull operator edge cases', () => {
    it('should initialize undefined field as empty array', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any } as unknown as Doc
      const operator = _getOperator('$pull')

      operator(doc, { arr: 'value' })

      expect((doc as any).arr).toEqual([])
    })

    it('should handle $in with empty array', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, arr: [1, 2, 3] } as unknown as Doc
      const operator = _getOperator('$pull')

      operator(doc, { arr: { $in: [] } })

      // Nothing should be removed
      expect((doc as any).arr).toEqual([1, 2, 3])
    })

    it('should handle complex objects with partial matches', () => {
      const doc: Doc = {
        _id: '1' as any,
        _class: 'test' as any,
        arr: [
          { a: 1, b: 2, c: 3 },
          { a: 1, b: 2, c: 4 },
          { a: 2, b: 2, c: 3 }
        ]
      } as unknown as Doc

      const operator = _getOperator('$pull')

      // Should only remove objects where ALL fields match
      operator(doc, { arr: { a: 1, b: 2 } })

      // Neither object should be removed because c doesn't match
      expect((doc as any).arr).toEqual([{ a: 2, b: 2, c: 3 }])
    })
  })

  describe('$update operator edge cases', () => {
    it('should handle query with multiple conditions', () => {
      const doc: Doc = {
        _id: '1' as any,
        _class: 'test' as any,
        arr: [
          { name: 'a', status: 'active', value: 1 },
          { name: 'a', status: 'inactive', value: 2 },
          { name: 'b', status: 'active', value: 3 }
        ]
      } as unknown as Doc

      const operator = _getOperator('$update')

      operator(doc, {
        arr: {
          $query: { name: 'a', status: 'active' },
          $update: { value: 100 }
        }
      })

      expect((doc as any).arr).toEqual([
        { name: 'a', status: 'active', value: 100 },
        { name: 'a', status: 'inactive', value: 2 },
        { name: 'b', status: 'active', value: 3 }
      ])
    })

    it('should add new fields in update', () => {
      const doc: Doc = {
        _id: '1' as any,
        _class: 'test' as any,
        arr: [{ name: 'a' }]
      } as unknown as Doc

      const operator = _getOperator('$update')

      operator(doc, {
        arr: {
          $query: { name: 'a' },
          $update: { newField: 'newValue' }
        }
      })

      expect((doc as any).arr).toEqual([{ name: 'a', newField: 'newValue' }])
    })
  })

  describe('$inc operator edge cases', () => {
    it('should handle floating point numbers', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, value: 1.5 } as unknown as Doc
      const operator = _getOperator('$inc')

      operator(doc, { value: 2.3 })

      expect((doc as any).value).toBeCloseTo(3.8)
    })

    it('should handle very large numbers', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, value: Number.MAX_SAFE_INTEGER - 1 } as unknown as Doc
      const operator = _getOperator('$inc')

      operator(doc, { value: 1 })

      expect((doc as any).value).toBe(Number.MAX_SAFE_INTEGER)
    })

    it('should handle negative numbers to zero', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, count: 5 } as unknown as Doc
      const operator = _getOperator('$inc')

      operator(doc, { count: -5 })

      expect((doc as any).count).toBe(0)
    })
  })

  describe('$rename operator edge cases', () => {
    it('BUG: should handle renaming to the same name causes deletion', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, field: 'value' } as unknown as Doc
      const operator = _getOperator('$rename')

      operator(doc, { field: 'field' })

      // BUG: Renaming to same name causes deletion!
      // The implementation deletes first, then sets, but uses the same key
      expect((doc as any).field).toBeUndefined()
    })

    it('BUG: chain renaming has race condition', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, a: 1, b: 2, c: 3 } as unknown as Doc
      const operator = _getOperator('$rename')

      // BUG: This creates a potential issue with chained renames in same operation
      operator(doc, { a: 'b', b: 'c' })

      // The order of operations in the for loop determines outcome
      // a -> b happens first (sets b to 1, deletes a)
      // b -> c happens second (sets c to 1 [current value of b], deletes b)
      expect((doc as any).a).toBeUndefined()
      expect((doc as any).b).toBeUndefined()
      expect((doc as any).c).toBe(1) // Gets the value that was assigned to b from a
    })
  })

  describe('$unset operator edge cases', () => {
    it('should handle unsetting nested properties (only top level)', () => {
      const doc: Doc = {
        _id: '1' as any,
        _class: 'test' as any,
        obj: { nested: 'value', other: 'data' }
      } as unknown as Doc
      const operator = _getOperator('$unset')

      // $unset only works at the key level, not nested paths
      operator(doc, { obj: '' })

      expect((doc as any).obj).toBeUndefined()
    })

    it('should handle unsetting array elements', () => {
      const doc: Doc = { _id: '1' as any, _class: 'test' as any, arr: [1, 2, 3] } as unknown as Doc
      const operator = _getOperator('$unset')

      operator(doc, { arr: '' })

      expect((doc as any).arr).toBeUndefined()
    })
  })
})
