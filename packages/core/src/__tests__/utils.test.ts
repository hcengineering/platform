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

import { estimateDocSize } from '../utils'

describe('estimateDocSize', () => {
  describe('primitive types', () => {
    it('should estimate undefined', () => {
      const obj = { a: undefined }
      const size = estimateDocSize(obj)
      expect(size).toBe(2) // 'a' (1) + undefined (1)
    })

    it('should estimate null', () => {
      const obj = { a: null }
      const size = estimateDocSize(obj)
      expect(size).toBe(2) // 'a' (1) + null (1)
    })

    it('should estimate boolean', () => {
      const obj = { flag: true }
      const size = estimateDocSize(obj)
      expect(size).toBe(5) // 'flag' (4) + boolean (1)
    })

    it('should estimate number', () => {
      const obj = { count: 42 }
      const size = estimateDocSize(obj)
      expect(size).toBe(13) // 'count' (5) + number (8)
    })

    it('should estimate string', () => {
      const obj = { name: 'hello' }
      const size = estimateDocSize(obj)
      expect(size).toBe(9) // 'name' (4) + 'hello' (5)
    })

    it('should estimate symbol', () => {
      const sym = Symbol('test')
      const obj = { sym }
      const size = estimateDocSize(obj)
      // 'sym' (3) + Symbol(test).toString() length
      expect(size).toBeGreaterThan(3)
    })

    it('should estimate bigint', () => {
      const obj = { big: BigInt(12345) }
      const size = estimateDocSize(obj)
      expect(size).toBe(8) // 'big' (3) + '12345' (5)
    })

    it('should estimate Date', () => {
      const obj = { date: new Date('2025-01-01') }
      const size = estimateDocSize(obj)
      expect(size).toBe(28) // 'date' (4) + Date estimation (24)
    })
  })

  describe('complex types', () => {
    it('should estimate empty object', () => {
      const obj = {}
      const size = estimateDocSize(obj)
      expect(size).toBe(0)
    })

    it('should estimate nested object', () => {
      const obj = {
        user: {
          name: 'John',
          age: 30
        }
      }
      const size = estimateDocSize(obj)
      // 'user' (4) + 'name' (4) + 'John' (4) + 'age' (3) + 8 (number)
      expect(size).toBe(23)
    })

    it('should estimate empty array', () => {
      const obj = { items: [] }
      const size = estimateDocSize(obj)
      expect(size).toBe(9) // 'items' (5) + array overhead (4)
    })

    it('should estimate array with primitives', () => {
      const obj = { numbers: [1, 2, 3] }
      const size = estimateDocSize(obj)
      // 'numbers' (7) + array (4) + '0' (1) + 8 + '1' (1) + 8 + '2' (1) + 8 = 38
      expect(size).toBe(38)
    })

    it('should estimate array with objects', () => {
      const obj = {
        users: [{ name: 'Alice' }, { name: 'Bob' }]
      }
      const size = estimateDocSize(obj)
      // 'users' (5) + array (4) + '0' (1) + 'name' (4) + 'Alice' (5) + '1' (1) + 'name' (4) + 'Bob' (3)
      expect(size).toBe(27)
    })

    it('should estimate deeply nested structures', () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        }
      }
      const size = estimateDocSize(obj)
      // 'level1' (6) + 'level2' (6) + 'level3' (6) + 'value' (5) + 'deep' (4)
      expect(size).toBe(27)
    })
  })

  describe('mixed types', () => {
    it('should estimate complex document', () => {
      const obj = {
        _id: 'doc123',
        _class: 'contact.class.Person',
        name: 'John Doe',
        age: 30,
        active: true,
        tags: ['developer', 'manager'],
        address: {
          street: '123 Main St',
          city: 'New York',
          zip: 10001
        },
        createdOn: new Date('2025-01-01')
      }
      const size = estimateDocSize(obj)
      expect(size).toBeGreaterThan(100)
      expect(size).toBeLessThan(300)
    })

    it('should handle mixed arrays', () => {
      const obj = {
        mixed: [1, 'two', true, null, { key: 'value' }]
      }
      const size = estimateDocSize(obj)
      // 'mixed' (5) + array (4)
      // '0' (1) + number (8)
      // '1' (1) + 'two' (3)
      // '2' (1) + boolean (1)
      // '3' (1) + null (1)
      // '4' (1) + 'key' (3) + 'value' (5)
      expect(size).toBe(35)
    })
  })

  describe('edge cases', () => {
    it('should handle circular references gracefully', () => {
      const obj: any = { a: 1 }
      obj.self = obj
      // Should not crash with optimized version
      const size = estimateDocSize(obj)
      // Should count 'a' (1) + number (8) + 'self' (4) = 13
      // The circular reference is detected and not processed again
      expect(size).toBe(13)
    })

    it('should handle complex circular references', () => {
      const obj1: any = { name: 'obj1' }
      const obj2: any = { name: 'obj2' }
      obj1.ref = obj2
      obj2.ref = obj1
      const size = estimateDocSize(obj1)
      // Should not crash and should count both objects only once
      expect(size).toBeGreaterThan(0)
      expect(size).toBeLessThan(50)
    })

    it('should skip functions', () => {
      const obj = {
        name: 'test',
        method: () => 'hello' // Use arrow function to avoid function properties
      }
      const size = estimateDocSize(obj)
      // 'name' (4) + 'test' (4) + 'method' (6) + function properties
      // Arrow functions have properties like 'length' and 'name'
      expect(size).toBeGreaterThan(14)
      expect(size).toBeLessThan(50)
    })

    it('should handle objects with null prototype', () => {
      const obj = Object.create(null)
      obj.key = 'value'
      const size = estimateDocSize(obj)
      expect(size).toBe(8) // 'key' (3) + 'value' (5)
    })

    it('should not count inherited properties', () => {
      const proto = { inherited: 'value' }
      const obj = Object.create(proto)
      obj.own = 'test'
      const size = estimateDocSize(obj)
      // Should only count 'own' (3) + 'test' (4) = 7
      // Should NOT count 'inherited' from prototype
      expect(size).toBe(7)
    })

    it('should handle arrays with holes', () => {
      const obj = { arr: [1, , 3] } // eslint-disable-line no-sparse-arrays
      const size = estimateDocSize(obj)
      // 'arr' (3) + array (4) + '0' (1) + number (8) + '2' (1) + number (8)
      // Note: hole at index 1 is not counted as it doesn't exist
      expect(size).toBe(25)
    })

    it('should handle large strings', () => {
      const largeString = 'x'.repeat(10000)
      const obj = { data: largeString }
      const size = estimateDocSize(obj)
      expect(size).toBe(10004) // 'data' (4) + 10000 characters
    })
  })

  describe('realistic document scenarios', () => {
    it('should estimate typical MongoDB-like document', () => {
      const doc = {
        _id: '507f1f77bcf86cd799439011',
        _class: 'contact.class.Person',
        space: 'space:contacts',
        modifiedBy: 'user:admin',
        modifiedOn: 1704067200000,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-0123',
        avatar: null,
        channels: ['email', 'phone'],
        metadata: {
          source: 'import',
          verified: true,
          score: 95
        }
      }
      const size = estimateDocSize(doc)
      expect(size).toBeGreaterThan(200)
      expect(size).toBeLessThan(500)
    })

    it('should estimate transaction document', () => {
      const tx = {
        _id: 'tx:123',
        _class: 'core.class.TxCreateDoc',
        space: 'core.space.Tx',
        modifiedBy: 'user:admin',
        modifiedOn: Date.now(),
        objectId: 'doc:456',
        objectClass: 'contact.class.Person',
        objectSpace: 'space:contacts',
        attributes: {
          name: 'New Person',
          email: 'new@example.com'
        }
      }
      const size = estimateDocSize(tx)
      expect(size).toBeGreaterThan(150)
      expect(size).toBeLessThan(400)
    })
  })

  describe('performance', () => {
    it('should handle large flat objects efficiently', () => {
      const obj: any = {}
      for (let i = 0; i < 1000; i++) {
        obj[`key${i}`] = `value${i}`
      }
      const start = Date.now()
      const size = estimateDocSize(obj)
      const elapsed = Date.now() - start
      expect(size).toBeGreaterThan(8000)
      expect(elapsed).toBeLessThan(100) // Should complete in <100ms
    })

    it('should handle deeply nested objects', () => {
      let obj: any = { value: 'end' }
      for (let i = 0; i < 100; i++) {
        obj = { nested: obj }
      }
      const start = Date.now()
      const size = estimateDocSize(obj)
      const elapsed = Date.now() - start
      expect(size).toBeGreaterThan(600)
      expect(elapsed).toBeLessThan(50)
    })

    it('should handle large arrays efficiently', () => {
      const obj = {
        items: Array(1000)
          .fill(0)
          .map((_, i) => ({
            id: i,
            name: `Item ${i}`,
            active: true
          }))
      }
      const start = Date.now()
      const size = estimateDocSize(obj)
      const elapsed = Date.now() - start
      expect(size).toBeGreaterThan(10000)
      expect(elapsed).toBeLessThan(100)
    })
  })

  describe('consistency', () => {
    it('should return same size for equivalent objects', () => {
      const obj1 = { a: 1, b: 'test', c: true }
      const obj2 = { a: 1, b: 'test', c: true }
      expect(estimateDocSize(obj1)).toBe(estimateDocSize(obj2))
    })

    it('should be order independent for object keys', () => {
      const obj1 = { a: 1, b: 2, c: 3 }
      const obj2 = { c: 3, a: 1, b: 2 }
      // Note: The current implementation iterates over keys via 'for..in'
      // which may have order-dependent behavior, but for estimation purposes
      // the total size should be the same
      expect(estimateDocSize(obj1)).toBe(estimateDocSize(obj2))
    })
  })
})
