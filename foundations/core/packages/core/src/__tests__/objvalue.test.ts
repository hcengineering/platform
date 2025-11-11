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

import { getObjectValue, setObjectValue } from '../objvalue'
import type { Doc } from '../classes'

describe('objvalue', () => {
  describe('getObjectValue', () => {
    it('should return the document itself for empty key', () => {
      const doc = { _id: '1', name: 'test' } as unknown as Doc
      const result = getObjectValue('', doc)
      expect(result).toBe(doc)
    })

    it('should get simple property value', () => {
      const doc = { _id: '1', name: 'John', age: 30 } as unknown as Doc
      expect(getObjectValue('name', doc)).toBe('John')
      expect(getObjectValue('age', doc)).toBe(30)
    })

    it('should get nested property value with dot notation', () => {
      const doc = {
        _id: '1',
        user: {
          name: 'John',
          address: {
            city: 'New York',
            zip: '10001'
          }
        }
      } as unknown as Doc

      expect(getObjectValue('user.name', doc)).toBe('John')
      expect(getObjectValue('user.address.city', doc)).toBe('New York')
      expect(getObjectValue('user.address.zip', doc)).toBe('10001')
    })

    it('should handle escaped dollar signs', () => {
      const doc = {
        _id: '1',
        field$name: 'value',
        nested: {
          prop$test: 123
        }
      } as unknown as Doc

      expect(getObjectValue('field\\$name', doc)).toBe('value')
      expect(getObjectValue('nested.prop\\$test', doc)).toBe(123)
    })

    it('should return undefined for non-existent properties', () => {
      const doc = { _id: '1', name: 'test' } as unknown as Doc
      expect(getObjectValue('nonExistent', doc)).toBeUndefined()
      expect(getObjectValue('user.name', doc)).toBeUndefined()
    })

    it('should handle array index access', () => {
      const doc = {
        _id: '1',
        items: ['a', 'b', 'c']
      } as unknown as Doc

      expect(getObjectValue('items.0', doc)).toBe('a')
      expect(getObjectValue('items.1', doc)).toBe('b')
      expect(getObjectValue('items.2', doc)).toBe('c')
    })

    it('should handle nested arrays with named properties', () => {
      const doc = {
        _id: '1',
        users: [
          { name: 'Alice', age: 25 },
          { name: 'Bob', age: 30 }
        ]
      } as unknown as Doc

      const names = getObjectValue('users.name', doc)
      expect(names).toEqual(['Alice', 'Bob'])
    })

    it('should handle deeply nested array queries', () => {
      const doc = {
        _id: '1',
        departments: [
          {
            name: 'Engineering',
            employees: [
              { name: 'Alice', role: 'Dev' },
              { name: 'Bob', role: 'QA' }
            ]
          },
          {
            name: 'Sales',
            employees: [{ name: 'Charlie', role: 'Manager' }]
          }
        ]
      } as unknown as Doc

      const employeeNames = getObjectValue('departments.employees.name', doc)
      expect(employeeNames).toEqual(['Alice', 'Bob', 'Charlie'])
    })

    it('should handle null and undefined values in path', () => {
      const doc = {
        _id: '1',
        user: null,
        data: undefined
      } as unknown as Doc

      expect(getObjectValue('user.name', doc)).toBeUndefined()
      expect(getObjectValue('data.value', doc)).toBeUndefined()
    })

    it('should handle mixed nested structures', () => {
      const doc = {
        _id: '1',
        config: {
          settings: {
            theme: 'dark',
            notifications: true
          }
        }
      } as unknown as Doc

      expect(getObjectValue('config.settings.theme', doc)).toBe('dark')
      expect(getObjectValue('config.settings.notifications', doc)).toBe(true)
    })

    it('should return array for nested array property queries', () => {
      const doc = {
        _id: '1',
        teams: [{ members: [{ name: 'A' }, { name: 'B' }] }, { members: [{ name: 'C' }] }]
      } as unknown as Doc

      const memberNames = getObjectValue('teams.members.name', doc)
      expect(memberNames).toEqual(['A', 'B', 'C'])
    })
  })

  describe('setObjectValue', () => {
    it('should not do anything for empty key', () => {
      const doc = { _id: '1', name: 'test' } as unknown as Doc
      setObjectValue('', doc, 'newValue')
      expect(doc).toEqual({ _id: '1', name: 'test' })
    })

    it('should set simple property value', () => {
      const doc = { _id: '1', name: 'old' } as unknown as Doc
      setObjectValue('name', doc, 'new')
      expect((doc as any).name).toBe('new')
    })

    it('should set nested property value', () => {
      const doc = {
        _id: '1',
        user: {
          name: 'old'
        }
      } as unknown as Doc

      setObjectValue('user.name', doc, 'new')
      expect((doc as any).user.name).toBe('new')
    })

    it('should create nested objects if they do not exist', () => {
      const doc = { _id: '1' } as unknown as Doc
      setObjectValue('user.profile.name', doc, 'John')
      expect((doc as any).user.profile.name).toBe('John')
    })

    it('should handle escaped dollar signs', () => {
      const doc = { _id: '1' } as unknown as Doc
      setObjectValue('field\\$name', doc, 'value')
      expect((doc as any).field$name).toBe('value')
    })

    it('should clone the value before setting', () => {
      const doc = { _id: '1' } as unknown as Doc
      const value = { nested: 'object' }
      setObjectValue('data', doc, value)

      // Modify original value
      value.nested = 'modified'

      // Doc should have the original value (cloned)
      expect((doc as any).data.nested).toBe('object')
    })

    it('should create nested objects even when intermediate value is array', () => {
      const doc = {
        _id: '1',
        items: [{ name: 'a' }, { name: 'b' }]
      } as unknown as Doc

      // This actually doesn't throw - it creates a 'name' property on the array object
      setObjectValue('items.name', doc, 'new')
      expect((doc as any).items.name).toBe('new')
    })

    it('should set value in existing nested structure', () => {
      const doc = {
        _id: '1',
        config: {
          settings: {
            theme: 'dark'
          }
        }
      } as unknown as Doc

      setObjectValue('config.settings.theme', doc, 'light')
      expect((doc as any).config.settings.theme).toBe('light')
    })

    it('should handle setting multiple levels', () => {
      const doc = { _id: '1' } as unknown as Doc

      setObjectValue('a.b.c.d', doc, 'deep')
      expect((doc as any).a.b.c.d).toBe('deep')
    })

    it('should set numeric values', () => {
      const doc = { _id: '1' } as unknown as Doc
      setObjectValue('count', doc, 42)
      expect((doc as any).count).toBe(42)
    })

    it('should set boolean values', () => {
      const doc = { _id: '1' } as unknown as Doc
      setObjectValue('enabled', doc, true)
      expect((doc as any).enabled).toBe(true)
    })

    it('should set null values', () => {
      const doc = { _id: '1', data: 'old' } as unknown as Doc
      setObjectValue('data', doc, null)
      expect((doc as any).data).toBe(null)
    })

    it('should overwrite existing nested structures', () => {
      const doc = {
        _id: '1',
        config: {
          old: 'value',
          nested: { prop: 'test' }
        }
      } as unknown as Doc

      setObjectValue('config', doc, { new: 'structure' })
      expect((doc as any).config).toEqual({ new: 'structure' })
    })

    it('should handle array values', () => {
      const doc = { _id: '1' } as unknown as Doc
      const arrayValue = [1, 2, 3]
      setObjectValue('numbers', doc, arrayValue)

      // Modify original array
      arrayValue.push(4)

      // Doc should have cloned array
      expect((doc as any).numbers).toEqual([1, 2, 3])
    })

    it('should handle object values', () => {
      const doc = { _id: '1' } as unknown as Doc
      setObjectValue('data', doc, { key: 'value', nested: { prop: 123 } })
      expect((doc as any).data).toEqual({ key: 'value', nested: { prop: 123 } })
    })

    it('should create intermediate objects when needed', () => {
      const doc = { _id: '1', existing: 'prop' } as unknown as Doc
      setObjectValue('new.path.value', doc, 'data')
      expect((doc as any).new.path.value).toBe('data')
      expect((doc as any).existing).toBe('prop')
    })
  })
})
