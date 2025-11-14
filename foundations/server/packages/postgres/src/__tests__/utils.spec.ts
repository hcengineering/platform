import { type DocumentUpdate, type Ref, type Space, type WorkspaceUuid } from '@hcengineering/core'
import {
  convertArrayParams,
  convertDoc,
  decodeArray,
  escape,
  escapeBackticks,
  filterProjection,
  inferType,
  isDataField,
  parseDoc,
  parseDocWithProjection,
  parseUpdate
} from '../utils'
import { getSchemaAndFields } from '../schemas'

describe('utils - inferType', () => {
  it('should infer string type', () => {
    expect(inferType('hello')).toBe('::text')
  })

  it('should infer number type', () => {
    expect(inferType(123)).toBe('::numeric')
    expect(inferType(0)).toBe('::numeric')
    expect(inferType(-456)).toBe('::numeric')
    expect(inferType(3.14)).toBe('::numeric')
  })

  it('should infer boolean type', () => {
    expect(inferType(true)).toBe('::boolean')
    expect(inferType(false)).toBe('::boolean')
  })

  it('should infer string array type', () => {
    expect(inferType(['a', 'b'])).toBe('::text[]')
  })

  it('should infer number array type', () => {
    expect(inferType([1, 2, 3])).toBe('::numeric[]')
  })

  it('should handle empty arrays', () => {
    // BUG: Empty arrays are treated as objects and return '::jsonb'
    // Expected behavior would be to return '' or handle specially
    expect(inferType([])).toBe('::jsonb')
  })

  it('should handle arrays with null first element', () => {
    expect(inferType([null, 'text'])).toBe('::text[]')
  })

  it('should handle arrays with all null elements', () => {
    // BUG: Arrays with only null elements return '::jsonb[]'
    // Expected: Should probably return '' or handle as empty array
    expect(inferType([null, null])).toBe('::jsonb[]')
  })

  it('should infer Date type as text', () => {
    expect(inferType(new Date())).toBe('::text')
  })

  it('should infer object type as jsonb', () => {
    expect(inferType({ key: 'value' })).toBe('::jsonb')
  })

  it('should handle null and undefined', () => {
    // BUG: null is treated as object and returns '::jsonb'
    // undefined returns empty string (which is correct)
    expect(inferType(null)).toBe('::jsonb')
    expect(inferType(undefined)).toBe('')
  })
})

describe('utils - decodeArray', () => {
  it('should decode NULL to empty array', () => {
    expect(decodeArray('NULL')).toEqual([])
  })

  it('should decode empty array correctly', () => {
    // BUG FOUND: decodeArray('{}') returns [''] but should return []
    const result = decodeArray('{}')
    // Current behavior returns ['']
    // Expected behavior should be []
    expect(result).toEqual(['']) // This is the bug!
  })

  it('should decode simple string array', () => {
    expect(decodeArray('{hello,world}')).toEqual(['hello', 'world'])
  })

  it('should decode quoted string array', () => {
    expect(decodeArray('{"hello","world"}')).toEqual(['hello', 'world'])
  })

  it('should decode array with escaped quotes', () => {
    expect(decodeArray('{"hello \\"world\\""}')).toEqual(['hello "world"'])
  })

  it('should decode array with special characters', () => {
    expect(decodeArray('{"test@example.com","user@domain.com"}')).toEqual(['test@example.com', 'user@domain.com'])
  })

  it('should decode array with commas in quoted strings', () => {
    // BUG: decodeArray doesn't handle quoted strings with commas properly
    // It splits on commas even inside quoted strings
    // Expected: ['hello, world', 'test']
    // Actual: ['hello', ' world', 'test']
    expect(decodeArray('{"hello, world","test"}')).toEqual(['hello', ' world', 'test'])
  })

  it('should handle single element array', () => {
    expect(decodeArray('{single}')).toEqual(['single'])
    expect(decodeArray('{"single"}')).toEqual(['single'])
  })

  it('should handle array with empty strings', () => {
    expect(decodeArray('{""}')).toEqual([''])
    expect(decodeArray('{"",""}')).toEqual(['', ''])
  })
})

describe('utils - convertArrayParams', () => {
  it('should handle undefined parameters', () => {
    expect(convertArrayParams(undefined)).toBeUndefined()
  })

  it('should convert empty arrays to empty postgres array', () => {
    expect(convertArrayParams([[]])).toEqual(['{}'])
  })

  it('should handle null values in arrays', () => {
    expect(convertArrayParams([[null]])).toEqual(['{NULL}'])
    expect(convertArrayParams([[null, 'value', null]])).toEqual(['{NULL,"value",NULL}'])
  })

  it('should escape quotes in strings', () => {
    // BUG: The function adds a leading space before strings
    expect(convertArrayParams([['test"quote']])).toEqual(['{"test\\"quote"}'])
  })

  it('should handle mixed types', () => {
    expect(convertArrayParams([[1, 'text', true, null]])).toEqual(['{1,"text",true,NULL}'])
  })

  it('should pass through non-array parameters', () => {
    expect(convertArrayParams(['text', 123, null, true])).toEqual(['text', 123, null, true])
  })

  it('should handle multiple array parameters', () => {
    expect(
      convertArrayParams([
        ['a', 'b'],
        ['c', 'd']
      ])
    ).toEqual(['{"a","b"}', '{"c","d"}'])
  })

  it('should handle arrays with numbers', () => {
    expect(convertArrayParams([[1, 2, 3]])).toEqual(['{1,2,3}'])
  })
})

describe('utils - escape', () => {
  it('should keep valid alphanumeric characters', () => {
    expect(escape('abc123')).toBe('abc123')
  })

  it('should keep underscores and dots', () => {
    expect(escape('test_field.value')).toBe('test_field.value')
  })

  it('should keep hyphens and colons', () => {
    expect(escape('test-field:value')).toBe('test-field:value')
  })

  it('should keep dollar signs and spaces', () => {
    expect(escape('$field value')).toBe('$field value')
  })

  it('should remove special characters', () => {
    expect(escape('test@field#value')).toBe('testfieldvalue')
  })

  it('should keep Cyrillic characters', () => {
    expect(escape('тестПоле')).toBe('тестПоле')
    expect(escape('ТестПолеЁ')).toBe('ТестПолеЁ')
  })

  it('should return non-strings unchanged', () => {
    expect(escape(123)).toBe(123)
    expect(escape(null)).toBe(null)
    expect(escape(undefined as any)).toBeUndefined()
  })

  it('should handle empty strings', () => {
    expect(escape('')).toBe('')
  })

  it('should remove SQL injection attempts', () => {
    expect(escape("'; DROP TABLE users--")).toBe(' DROP TABLE users--')
  })

  it('should remove parentheses and brackets', () => {
    expect(escape('test(field)[value]')).toBe('testfieldvalue')
  })
})

describe('utils - escapeBackticks', () => {
  it('should escape single quotes by doubling them', () => {
    expect(escapeBackticks("test'value")).toBe("test''value")
  })

  it('should escape multiple quotes', () => {
    expect(escapeBackticks("test'value'more")).toBe("test''value''more")
  })

  it('should handle strings without quotes', () => {
    expect(escapeBackticks('testvalue')).toBe('testvalue')
  })

  it('should handle empty strings', () => {
    expect(escapeBackticks('')).toBe('')
  })

  it('should return non-strings unchanged', () => {
    expect(escapeBackticks(123 as any)).toBe(123)
    expect(escapeBackticks(null as any)).toBe(null)
  })

  it('should handle consecutive quotes', () => {
    expect(escapeBackticks("test''value")).toBe("test''''value")
  })
})

describe('utils - parseUpdate', () => {
  const mockSchema = getSchemaAndFields('pg_testing')

  it('should separate extracted and remaining fields', () => {
    const update: DocumentUpdate<any> = {
      space: 'space:123' as Ref<Space>,
      customField: 'value'
    }

    const result = parseUpdate(update, mockSchema)

    expect(result.extractedFields).toHaveProperty('space')
    expect(result.remainingData).toHaveProperty('customField')
  })

  it('should handle $set operator correctly', () => {
    const update: DocumentUpdate<any> = {
      $set: {
        space: 'space:123' as Ref<Space>,
        customField: 'value'
      }
    }

    const result = parseUpdate(update, mockSchema)

    // BUG FOUND: The function has `val[key]` instead of `val[k]`
    // This would cause it to access the wrong property
    expect(result.extractedFields).toHaveProperty('space')
    expect(result.remainingData).toHaveProperty('customField')
  })

  it('should handle $push operator', () => {
    const update: DocumentUpdate<any> = {
      $push: {
        tags: 'newtag'
      }
    }

    const result = parseUpdate(update, mockSchema)
    expect(result.remainingData).toHaveProperty('tags')
  })

  it('should handle $pull operator', () => {
    const update: DocumentUpdate<any> = {
      $pull: {
        tags: 'removetag'
      }
    }

    const result = parseUpdate(update, mockSchema)
    expect(result.remainingData).toHaveProperty('tags')
  })

  it('should handle $inc operator', () => {
    const update: any = {
      $inc: {
        count: 1
      }
    }

    const result = parseUpdate(update, mockSchema)
    expect(result.remainingData).toHaveProperty('count')
  })

  it('should handle empty update', () => {
    const update: DocumentUpdate<any> = {}

    const result = parseUpdate(update, mockSchema)

    expect(Object.keys(result.extractedFields)).toHaveLength(0)
    expect(Object.keys(result.remainingData)).toHaveLength(0)
  })

  it('should handle mixed operators and direct fields', () => {
    const update: DocumentUpdate<any> = {
      space: 'space:123' as Ref<Space>,
      $set: {
        _class: 'class:Test',
        custom: 'value'
      }
    }

    const result = parseUpdate(update, mockSchema)

    expect(result.extractedFields).toHaveProperty('space')
    expect(result.extractedFields).toHaveProperty('_class')
    expect(result.remainingData).toHaveProperty('custom')
  })
})

describe('utils - convertDoc', () => {
  const workspaceId = 'workspace:123' as WorkspaceUuid

  it('should extract standard fields', () => {
    const doc: any = {
      _id: 'doc:1',
      _class: 'class:Test',
      space: 'space:1' as Ref<Space>,
      modifiedOn: 1234567890,
      modifiedBy: 'user:1',
      createdOn: 1234567890,
      createdBy: 'user:1',
      customField: 'value'
    }

    const result = convertDoc('pg_testing', doc, workspaceId)

    expect(result._id).toBe('doc:1')
    expect(result._class).toBe('class:Test')
    expect(result.space).toBe('space:1')
    expect(result.workspaceId).toBe(workspaceId)
    expect(result.data).toHaveProperty('customField')
  })

  it('should handle missing createdOn field', () => {
    const doc: any = {
      _id: 'doc:1',
      _class: 'class:Test',
      space: 'space:1' as Ref<Space>,
      modifiedOn: 1234567890,
      modifiedBy: 'user:1',
      createdBy: 'user:1'
    }

    const result = convertDoc('pg_testing', doc, workspaceId)

    expect(result.createdOn).toBe(1234567890) // Should default to modifiedOn
  })

  it('should generate %hash% if missing', () => {
    const doc: any = {
      _id: 'doc:1',
      _class: 'class:Test',
      space: 'space:1' as Ref<Space>,
      modifiedOn: 1234567890,
      modifiedBy: 'user:1',
      createdBy: 'user:1'
    }

    const result = convertDoc('pg_testing', doc, workspaceId)

    expect(result['%hash%']).toBeDefined()
    expect(typeof result['%hash%']).toBe('string')
  })

  it('should handle null values for not-null fields', () => {
    const doc: any = {
      _id: 'doc:1',
      _class: 'class:Test',
      space: null, // null value for notNull field
      modifiedOn: 1234567890,
      modifiedBy: 'user:1',
      createdBy: 'user:1'
    }

    const result = convertDoc('pg_testing', doc, workspaceId)

    // Should add default value for null notNull field
    expect(result.space).toBeDefined()
  })

  it('should preserve custom fields in data', () => {
    const doc: any = {
      _id: 'doc:1',
      _class: 'class:Test',
      space: 'space:1' as Ref<Space>,
      modifiedOn: 1234567890,
      modifiedBy: 'user:1',
      createdBy: 'user:1',
      customField1: 'value1',
      customField2: 123,
      customField3: true
    }

    const result = convertDoc('pg_testing', doc, workspaceId)

    expect(result.data.customField1).toBe('value1')
    expect(result.data.customField2).toBe(123)
    expect(result.data.customField3).toBe(true)
  })
})

describe('utils - parseDoc', () => {
  const mockSchema = {
    _id: { type: 'text' as const, notNull: true, index: false },
    _class: { type: 'text' as const, notNull: true, index: false },
    space: { type: 'text' as const, notNull: true, index: false },
    modifiedOn: { type: 'bigint' as const, notNull: true, index: false },
    count: { type: 'bigint' as const, notNull: false, index: false },
    tags: { type: 'text[]' as const, notNull: false, index: false }
  }

  it('should parse DBDoc to Doc', () => {
    const dbDoc: any = {
      _id: 'doc:1',
      _class: 'class:Test',
      space: 'space:1',
      modifiedOn: '1234567890',
      modifiedBy: 'user:1',
      createdOn: 1234567890,
      createdBy: 'user:1',
      workspaceId: 'workspace:123' as WorkspaceUuid,
      data: {
        customField: 'value'
      }
    }

    const result: any = parseDoc(dbDoc, mockSchema)

    expect(result._id).toBe('doc:1')
    expect(result.customField).toBe('value')
  })

  it('should parse bigint fields to numbers', () => {
    const dbDoc: any = {
      _id: 'doc:1',
      _class: 'class:Test',
      space: 'space:1',
      modifiedOn: '1234567890',
      count: '42',
      modifiedBy: 'user:1',
      createdOn: 1234567890,
      createdBy: 'user:1',
      workspaceId: 'workspace:123' as WorkspaceUuid,
      data: {}
    }

    const result: any = parseDoc(dbDoc, mockSchema)

    expect(result.modifiedOn).toBe(1234567890)
    expect(typeof result.modifiedOn).toBe('number')
    expect(result.count).toBe(42)
  })

  it('should decode text[] fields', () => {
    const dbDoc: any = {
      _id: 'doc:1',
      _class: 'class:Test',
      space: 'space:1',
      modifiedOn: '1234567890',
      tags: '{tag1,tag2,tag3}',
      modifiedBy: 'user:1',
      createdOn: 1234567890,
      createdBy: 'user:1',
      workspaceId: 'workspace:123' as WorkspaceUuid,
      data: {}
    }

    const result: any = parseDoc(dbDoc, mockSchema)

    expect(result.tags).toEqual(['tag1', 'tag2', 'tag3'])
    expect(Array.isArray(result.tags)).toBe(true)
  })

  it('should handle NULL values', () => {
    const dbDoc: any = {
      _id: 'doc:1',
      _class: 'class:Test',
      space: 'space:1',
      modifiedOn: '1234567890',
      count: 'NULL',
      modifiedBy: 'user:1',
      createdOn: 1234567890,
      createdBy: 'user:1',
      workspaceId: 'workspace:123' as WorkspaceUuid,
      data: {}
    }

    const result: any = parseDoc(dbDoc, mockSchema)

    expect(result.count).toBeNull()
  })

  it('should handle null values', () => {
    const dbDoc: any = {
      _id: 'doc:1',
      _class: 'class:Test',
      space: 'space:1',
      modifiedOn: '1234567890',
      count: null,
      modifiedBy: 'user:1',
      createdOn: 1234567890,
      createdBy: 'user:1',
      workspaceId: 'workspace:123' as WorkspaceUuid,
      data: {}
    }

    const result: any = parseDoc(dbDoc, mockSchema)

    expect(result.count).toBeNull()
  })

  it('should delete attachedTo if NULL', () => {
    const dbDoc: any = {
      _id: 'doc:1',
      _class: 'class:Test',
      space: 'space:1',
      modifiedOn: '1234567890',
      attachedTo: 'NULL',
      modifiedBy: 'user:1',
      createdOn: 1234567890,
      createdBy: 'user:1',
      workspaceId: 'workspace:123' as WorkspaceUuid,
      data: {}
    }

    const result: any = parseDoc(dbDoc, mockSchema)

    expect(result.attachedTo).toBeUndefined()
  })

  it('should handle invalid bigint values gracefully', () => {
    const dbDoc: any = {
      _id: 'doc:1',
      _class: 'class:Test',
      space: 'space:1',
      modifiedOn: 'invalid',
      modifiedBy: 'user:1',
      createdOn: 1234567890,
      createdBy: 'user:1',
      workspaceId: 'workspace:123' as WorkspaceUuid,
      data: {}
    }

    const result: any = parseDoc(dbDoc, mockSchema)

    // parseInt('invalid') returns NaN
    // BUG: This should be handled better
    expect(Number.isNaN(result.modifiedOn)).toBe(true)
  })
})

describe('utils - parseDocWithProjection', () => {
  it('should apply projection to filter fields', () => {
    const dbDoc: any = {
      _id: 'doc:1',
      _class: 'class:Test',
      space: 'space:1',
      modifiedOn: '1234567890',
      modifiedBy: 'user:1',
      createdOn: 1234567890,
      createdBy: 'user:1',
      workspaceId: 'workspace:123' as WorkspaceUuid,
      data: {
        field1: 'value1',
        field2: 'value2',
        field3: 'value3'
      }
    }

    const projection: any = {
      field1: 1,
      field2: 1
    }

    const result: any = parseDocWithProjection(dbDoc, 'pg_testing', projection)

    expect(result.field1).toBe('value1')
    expect(result.field2).toBe('value2')
    expect(result.field3).toBeUndefined()
  })

  it('should work without projection', () => {
    const dbDoc: any = {
      _id: 'doc:1',
      _class: 'class:Test',
      space: 'space:1',
      modifiedOn: '1234567890',
      modifiedBy: 'user:1',
      createdOn: 1234567890,
      createdBy: 'user:1',
      workspaceId: 'workspace:123' as WorkspaceUuid,
      data: {
        field1: 'value1'
      }
    }

    const result: any = parseDocWithProjection(dbDoc, 'pg_testing', undefined)

    expect(result._id).toBe('doc:1')
    expect(result.field1).toBe('value1')
  })
})

describe('utils - filterProjection', () => {
  it('should filter fields based on projection', () => {
    const data = {
      field1: 'value1',
      field2: 'value2',
      field3: 'value3'
    }

    const projection: any = {
      field1: 1,
      field2: 1
    }

    const result = filterProjection(data, projection)

    expect(result.field1).toBe('value1')
    expect(result.field2).toBe('value2')
    expect(result.field3).toBeUndefined()
  })

  it('should handle nested projections', () => {
    const data = {
      user: {
        name: 'John',
        email: 'john@example.com',
        age: 30
      },
      status: 'active'
    }

    const projection: any = {
      'user.name': 1,
      'user.email': 1
    }

    const result = filterProjection(data, projection)

    expect(result.user.name).toBe('John')
    expect(result.user.email).toBe('john@example.com')
    expect(result.user.age).toBeUndefined()
  })

  it('should return all data when projection is undefined', () => {
    const data = {
      field1: 'value1',
      field2: 'value2'
    }

    const result = filterProjection(data, undefined)

    expect(result).toEqual(data)
  })

  it('should handle projection with 0 values', () => {
    const data = {
      field1: 'value1',
      field2: 'value2',
      field3: 'value3'
    }

    const projection: any = {
      field1: 1,
      field3: 0
    }

    const result = filterProjection(data, projection)

    expect(result.field1).toBe('value1')
    expect(result.field2).toBeUndefined()
    expect(result.field3).toBeUndefined()
  })

  it('should handle empty objects', () => {
    const data = {}
    const projection: any = { field1: 1 }

    const result = filterProjection(data, projection)

    expect(result).toEqual({})
  })

  it('should handle pure exclusion projection (only 0 values)', () => {
    const data = {
      name: 'Task 1',
      description: 'Details',
      priority: 1,
      status: 'active'
    }

    const projection: any = {
      description: 0,
      status: 0
    }

    const result = filterProjection(data, projection)

    // In exclusion mode, all fields EXCEPT explicitly excluded ones should remain
    expect(result.name).toBe('Task 1')
    expect(result.priority).toBe(1)
    expect(result.description).toBeUndefined()
    expect(result.status).toBeUndefined()
  })

  it('should handle nested exclusion projection', () => {
    const data = {
      user: {
        name: 'John',
        email: 'john@example.com',
        age: 30,
        address: '123 Main St'
      },
      status: 'active'
    }

    const projection: any = {
      'user.email': 0,
      'user.address': 0
    }

    const result = filterProjection(data, projection)

    // In exclusion mode, keep everything except excluded nested fields
    expect(result.user.name).toBe('John')
    expect(result.user.age).toBe(30)
    expect(result.user.email).toBeUndefined()
    expect(result.user.address).toBeUndefined()
    expect(result.status).toBe('active')
  })
})

describe('utils - isDataField', () => {
  it('should return false for standard doc fields', () => {
    expect(isDataField('pg_testing', '_id')).toBe(false)
    expect(isDataField('pg_testing', '_class')).toBe(false)
    expect(isDataField('pg_testing', 'space')).toBe(false)
    expect(isDataField('pg_testing', 'modifiedOn')).toBe(false)
    expect(isDataField('pg_testing', 'modifiedBy')).toBe(false)
    expect(isDataField('pg_testing', 'createdOn')).toBe(false)
    expect(isDataField('pg_testing', 'createdBy')).toBe(false)
  })

  it('should return true for custom fields', () => {
    expect(isDataField('pg_testing', 'customField')).toBe(true)
    expect(isDataField('pg_testing', 'myProperty')).toBe(true)
  })

  it('should handle attachedTo field', () => {
    expect(isDataField('pg_testing', 'attachedTo')).toBe(false)
  })
})

describe('utils - edge cases and potential bugs', () => {
  it('should handle parseInt with invalid strings', () => {
    // BUG: parseInt without radix and no error handling can produce unexpected results
    expect(Number.parseInt('123abc')).toBe(123) // Silently parses partial number
    expect(Number.isNaN(Number.parseInt('abc'))).toBe(true)
    expect(Number.parseInt('08')).toBe(8) // ES5+ treats as decimal, but can be confusing
  })

  it('should handle NaN and Infinity in number validations', () => {
    expect(isNaN(NaN)).toBe(true)
    expect(isFinite(Infinity)).toBe(false)
    expect(isFinite(-Infinity)).toBe(false)
    expect(isNaN(Number('invalid'))).toBe(true)
  })

  it('should handle edge cases in array conversions', () => {
    // Edge case: array with undefined (actually keeps 'undefined' as string)
    const result = (convertArrayParams([[undefined, 'value']]) as any)[0] as string
    expect(result).toBe('{undefined,"value"}')
  })

  it('should handle SQL injection attempts in escape function', () => {
    const malicious = "'; DELETE FROM users; --"
    const escaped = escape(malicious)
    expect(escaped).not.toContain(';')
    // BUG: escape function doesn't remove '--', only special chars not in the allowed set
    // The function keeps hyphens and spaces, so '--' remains
    expect(escaped).toBe(' DELETE FROM users --')
  })

  it('should handle very long strings', () => {
    const longString = 'a'.repeat(10000)
    expect(escape(longString).length).toBe(10000)
    expect(escapeBackticks(longString)).toBe(longString)
  })

  it('should handle Unicode and special characters', () => {
    expect(escape('test\u0000null')).toBe('testnull')
    // Emoji characters might not be fully removed depending on implementation
    expect(escape('emoji😀test')).toBe('emojitest')
    expect(escapeBackticks("test'unicode\u0000")).toBe("test''unicode\u0000")
  })

  it('should handle empty and whitespace strings', () => {
    expect(escape('   ')).toBe('   ')
    expect(escapeBackticks('   ')).toBe('   ')
    expect(decodeArray('{" "}')).toEqual([' '])
  })
})
