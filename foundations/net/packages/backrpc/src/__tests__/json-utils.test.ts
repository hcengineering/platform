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

import { parseJSON, stringifyJSON } from '../json-utils'

describe('json-utils', () => {
  describe('stringifyJSON', () => {
    it('should convert undefined to null in objects', () => {
      const data = { a: 1, b: undefined, c: 'test' }
      const result = stringifyJSON(data)
      expect(result).toBe('{"a":1,"b":null,"c":"test"}')
    })

    it('should convert undefined to null in arrays', () => {
      const data = [1, undefined, 'test', undefined]
      const result = stringifyJSON(data)
      expect(result).toBe('[1,null,"test",null]')
    })

    it('should handle nested objects with undefined', () => {
      const data = { a: { b: undefined, c: 1 }, d: [undefined, 2] }
      const result = stringifyJSON(data)
      expect(result).toBe('{"a":{"b":null,"c":1},"d":[null,2]}')
    })

    it('should handle null values correctly', () => {
      const data = { a: null, b: undefined }
      const result = stringifyJSON(data)
      expect(result).toBe('{"a":null,"b":null}')
    })

    it('should handle primitive values', () => {
      expect(stringifyJSON(42)).toBe('42')
      expect(stringifyJSON('test')).toBe('"test"')
      expect(stringifyJSON(true)).toBe('true')
      expect(stringifyJSON(null)).toBe('null')
    })
  })

  describe('parseJSON', () => {
    it('should parse JSON string correctly', () => {
      const json = '{"a":1,"b":null,"c":"test"}'
      const result = parseJSON(json)
      expect(result).toEqual({ a: 1, b: null, c: 'test' })
    })

    it('should parse arrays correctly', () => {
      const json = '[1,null,"test",null]'
      const result = parseJSON(json)
      expect(result).toEqual([1, null, 'test', null])
    })

    it('should parse nested structures', () => {
      const json = '{"a":{"b":null,"c":1},"d":[null,2]}'
      const result = parseJSON(json)
      expect(result).toEqual({ a: { b: null, c: 1 }, d: [null, 2] })
    })
  })

  describe('round-trip', () => {
    it('should handle round-trip with undefined values', () => {
      const original = { a: 1, b: undefined, c: 'test', d: [1, undefined, 3] }
      const stringified = stringifyJSON(original)
      const parsed = parseJSON(stringified)

      // After round-trip, undefined becomes null
      expect(parsed).toEqual({ a: 1, b: null, c: 'test', d: [1, null, 3] })
    })

    it('should preserve null values in round-trip', () => {
      const original = { a: 1, b: null, c: 'test', d: [1, null, 3] }
      const stringified = stringifyJSON(original)
      const parsed = parseJSON(stringified)

      expect(parsed).toEqual(original)
    })
  })
})
