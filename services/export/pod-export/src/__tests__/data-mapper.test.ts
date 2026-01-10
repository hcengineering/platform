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

import {
  type Class,
  type Doc,
  type Ref,
  type Space,
  type TxOperations,
  type MeasureContext,
  type Hierarchy,
  generateId,
  platformNow
} from '@hcengineering/core'
import { DataMapper } from '../workspace/data-mapper'
import { type ExportState } from '../workspace/types'

// Mock document classes
const mockDocClass = 'test:class:ControlledDocument' as Ref<Class<Doc>>
const mockSpaceId = 'test:space:1' as Ref<Space>

function createMockHierarchy (): Hierarchy {
  return {
    findDomain: jest.fn(() => 'test_domain'),
    isDerived: jest.fn(() => false),
    getAllAttributes: jest.fn(() => new Map()),
    isMixin: jest.fn(() => false),
    hasMixin: jest.fn(() => undefined),
    getClass: jest.fn((classRef: Ref<Class<Doc>>) => ({
      _id: classRef,
      label: 'Test Class',
      extends: undefined
    })),
    findAttribute: jest.fn(() => ({
      _id: 'test:attr:code' as any,
      label: 'Code',
      type: { _class: 'core:class:TypeString' as Ref<Class<Doc>> }
    }))
  } as unknown as Hierarchy
}

function createMockTxOperations (existingDocs: Array<Record<string, any>> = []): TxOperations {
  const docsMap = new Map<string, Doc>()
  for (const doc of existingDocs) {
    docsMap.set(doc._id, doc as Doc)
  }

  return {
    findAll: jest.fn(async <T extends Doc>(classRef: Ref<Class<T>>, query: any, options?: any): Promise<T[]> => {
      const results: T[] = []
      for (const doc of docsMap.values()) {
        if (doc._class !== classRef) continue

        // Match query
        let matches = true
        for (const [key, value] of Object.entries(query)) {
          if (key === '_class') continue

          const docValue = (doc as any)[key]

          const queryValue = value as any
          if (queryValue?.$like !== undefined) {
            // Simple LIKE pattern matching (prefix-%)
            const pattern = queryValue.$like as string
            if (typeof docValue === 'string') {
              if (pattern.endsWith('%')) {
                const prefix = pattern.slice(0, -1)
                // Unescape prefix (remove backslashes used for escaping)
                const unescapedPrefix = prefix.replace(/\\(.)/g, '$1')
                if (!docValue.startsWith(unescapedPrefix)) {
                  matches = false
                  break
                }
              } else {
                matches = false
                break
              }
            } else {
              matches = false
              break
            }
          } else if (queryValue?.$gte !== undefined) {
            if (typeof docValue === 'number' && docValue < queryValue.$gte) {
              matches = false
              break
            }
          } else if (docValue !== value) {
            matches = false
            break
          }
        }

        if (matches) {
          // Apply projection if specified
          if (options?.projection !== undefined) {
            const projected: any = { _id: doc._id, _class: doc._class }
            for (const key in options.projection) {
              if (options.projection[key] === 1) {
                projected[key] = (doc as any)[key]
              }
            }
            results.push(projected as T)
          } else {
            results.push(doc as T)
          }
        }
      }
      return results
    }),
    findOne: jest.fn(async function <T extends Doc>(
      this: any,
      classRef: Ref<Class<T>>,
      query: any,
      options?: any
    ): Promise<T | undefined> {
      const results = await this.findAll(classRef, query, options)
      return results.length > 0 ? results[0] : undefined
    }),
    getHierarchy: jest.fn(() => createMockHierarchy()),
    createDoc: jest.fn(),
    addCollection: jest.fn(),
    updateDoc: jest.fn()
  } as unknown as TxOperations
}

function createMockMeasureContext (): MeasureContext {
  return {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  } as unknown as MeasureContext
}

describe('DataMapper - ensureFieldUnique', () => {
  let mockContext: MeasureContext
  let mockClient: TxOperations
  let state: ExportState

  beforeEach(() => {
    mockContext = createMockMeasureContext()
    state = {
      idMapping: new Map(),
      spaceMapping: new Map(),
      processingDocs: new Set(),
      uniqueFieldValues: new Map()
    }
    jest.clearAllMocks()
  })

  describe('String values with prefix pattern', () => {
    it('should find unique value by querying all prefix values at once', async () => {
      // Setup: existing docs with codes DOC-1, DOC-2, DOC-5, all with same prefix
      const testPrefix = 'DOC'
      const existingDocs = [
        {
          _id: generateId(),
          _class: mockDocClass,
          code: 'DOC-1',
          prefix: testPrefix,
          space: mockSpaceId,
          modifiedOn: platformNow(),
          modifiedBy: generateId()
        },
        {
          _id: generateId(),
          _class: mockDocClass,
          code: 'DOC-2',
          prefix: testPrefix,
          space: mockSpaceId,
          modifiedOn: platformNow(),
          modifiedBy: generateId()
        },
        {
          _id: generateId(),
          _class: mockDocClass,
          code: 'DOC-5',
          prefix: testPrefix,
          space: mockSpaceId,
          modifiedOn: platformNow(),
          modifiedBy: generateId()
        }
      ]
      mockClient = createMockTxOperations(existingDocs)

      const dataMapper = new DataMapper(
        mockContext,
        mockClient,
        state,
        {
          [mockDocClass]: {
            code: '$ensureUnique'
          }
        },
        undefined
      )

      const doc = {
        _id: generateId(),
        _class: mockDocClass,
        code: 'DOC-1',
        prefix: testPrefix,
        space: mockSpaceId,
        modifiedOn: platformNow(),
        modifiedBy: generateId() as any
      }

      const result = await dataMapper.prepareDocumentData(doc, mockSpaceId, false)

      // DOC-1 conflicts with existing, should use max(1,2,5) + 1 = 6
      expect(result.code).toBe('DOC-6')
      // Should query by prefix field (global, no space filter)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockClient.findAll).toHaveBeenCalledWith(
        mockDocClass,
        { prefix: testPrefix },
        { projection: { code: 1, prefix: 1 } }
      )
    })

    it('should handle prefix with special characters', async () => {
      const testPrefix = 'DOC-TEST'
      const existingDocs = [
        {
          _id: generateId(),
          _class: mockDocClass,
          code: 'DOC-TEST-1',
          prefix: testPrefix,
          space: mockSpaceId,
          modifiedOn: platformNow(),
          modifiedBy: generateId()
        },
        {
          _id: generateId(),
          _class: mockDocClass,
          code: 'DOC-TEST-2',
          prefix: testPrefix,
          space: mockSpaceId,
          modifiedOn: platformNow(),
          modifiedBy: generateId()
        }
      ]
      mockClient = createMockTxOperations(existingDocs)

      const dataMapper = new DataMapper(
        mockContext,
        mockClient,
        state,
        {
          [mockDocClass]: {
            code: '$ensureUnique'
          }
        },
        undefined
      )

      const doc = {
        _id: generateId(),
        _class: mockDocClass,
        code: 'DOC-TEST-1',
        prefix: testPrefix,
        space: mockSpaceId,
        modifiedOn: platformNow(),
        modifiedBy: generateId() as any
      }

      const result = await dataMapper.prepareDocumentData(doc, mockSpaceId, false)

      // Should use max(1,2) + 1 = 3
      expect(result.code).toBe('DOC-TEST-3')
    })

    it('should handle values already used in export batch', async () => {
      const testPrefix = 'DOC'
      const existingDocs: any[] = []
      mockClient = createMockTxOperations(existingDocs)

      const dataMapper = new DataMapper(
        mockContext,
        mockClient,
        state,
        {
          [mockDocClass]: {
            code: '$ensureUnique'
          }
        },
        undefined
      )

      // First document
      const doc1 = {
        _id: generateId(),
        _class: mockDocClass,
        code: 'DOC-1',
        prefix: testPrefix,
        space: mockSpaceId,
        modifiedOn: platformNow(),
        modifiedBy: generateId() as any
      }
      const result1 = await dataMapper.prepareDocumentData(doc1, mockSpaceId, false)
      expect(result1.code).toBe('DOC-1')

      // Second document with same code
      const doc2 = {
        _id: generateId(),
        _class: mockDocClass,
        code: 'DOC-1',
        prefix: testPrefix,
        space: mockSpaceId,
        modifiedOn: platformNow(),
        modifiedBy: generateId() as any
      }
      const result2 = await dataMapper.prepareDocumentData(doc2, mockSpaceId, false)

      // Should increment to DOC-2 since DOC-1 is already used in batch
      expect(result2.code).toBe('DOC-2')
    })

    it('should handle string without prefix pattern', async () => {
      const existingDocs = [
        {
          _id: generateId(),
          _class: mockDocClass,
          code: 'SIMPLE',
          space: mockSpaceId,
          modifiedOn: platformNow(),
          modifiedBy: generateId()
        }
      ]
      mockClient = createMockTxOperations(existingDocs)

      const dataMapper = new DataMapper(
        mockContext,
        mockClient,
        state,
        {
          [mockDocClass]: {
            code: '$ensureUnique'
          }
        },
        undefined
      )

      const doc = {
        _id: generateId(),
        _class: mockDocClass,
        code: 'SIMPLE',
        space: mockSpaceId,
        modifiedOn: platformNow(),
        modifiedBy: generateId() as any
      }

      const result = await dataMapper.prepareDocumentData(doc, mockSpaceId, false)

      // Should append suffix
      expect(result.code).toBe('SIMPLE-1')
      // Should use findOne for exact match (global, no space filter)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockClient.findOne).toHaveBeenCalledWith(mockDocClass, { code: 'SIMPLE' }, { projection: { code: 1 } })
    })
  })

  describe('Numeric values', () => {
    it('should find unique value by querying all values >= current', async () => {
      // Setup: existing docs with seqNumber 10, 11, 15
      const existingDocs = [
        {
          _id: generateId(),
          _class: mockDocClass,
          seqNumber: 10,
          space: mockSpaceId,
          modifiedOn: platformNow(),
          modifiedBy: generateId()
        },
        {
          _id: generateId(),
          _class: mockDocClass,
          seqNumber: 11,
          space: mockSpaceId,
          modifiedOn: platformNow(),
          modifiedBy: generateId()
        },
        {
          _id: generateId(),
          _class: mockDocClass,
          seqNumber: 15,
          space: mockSpaceId,
          modifiedOn: platformNow(),
          modifiedBy: generateId()
        }
      ]
      mockClient = createMockTxOperations(existingDocs)

      const dataMapper = new DataMapper(
        mockContext,
        mockClient,
        state,
        {
          [mockDocClass]: {
            seqNumber: '$ensureUnique'
          }
        },
        undefined
      )

      const doc = {
        _id: generateId(),
        _class: mockDocClass,
        seqNumber: 10,
        space: mockSpaceId,
        modifiedOn: platformNow(),
        modifiedBy: generateId() as any
      }

      const result = await dataMapper.prepareDocumentData(doc, mockSpaceId, false)

      // Should use max(10,11,15) + 1 = 16
      expect(result.seqNumber).toBe(16)
      // Should query with $gte (global, no space filter)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockClient.findAll).toHaveBeenCalledWith(
        mockDocClass,
        { seqNumber: { $gte: 10 } },
        { projection: { seqNumber: 1 } }
      )
    })

    it('should handle numeric values already used in export batch', async () => {
      const existingDocs: any[] = []
      mockClient = createMockTxOperations(existingDocs)

      const dataMapper = new DataMapper(
        mockContext,
        mockClient,
        state,
        {
          [mockDocClass]: {
            seqNumber: '$ensureUnique'
          }
        },
        undefined
      )

      // First document
      const doc1 = {
        _id: generateId(),
        _class: mockDocClass,
        seqNumber: 5,
        space: mockSpaceId,
        modifiedOn: platformNow(),
        modifiedBy: generateId() as any
      }
      const result1 = await dataMapper.prepareDocumentData(doc1, mockSpaceId, false)
      expect(result1.seqNumber).toBe(5)

      // Second document with same seqNumber
      const doc2 = {
        _id: generateId(),
        _class: mockDocClass,
        seqNumber: 5,
        space: mockSpaceId,
        modifiedOn: platformNow(),
        modifiedBy: generateId() as any
      }
      const result2 = await dataMapper.prepareDocumentData(doc2, mockSpaceId, false)

      // Should increment to 6 since 5 is already used in batch
      expect(result2.seqNumber).toBe(6)
    })

    it('should handle numeric value when no conflicts exist', async () => {
      const existingDocs: any[] = []
      mockClient = createMockTxOperations(existingDocs)

      const dataMapper = new DataMapper(
        mockContext,
        mockClient,
        state,
        {
          [mockDocClass]: {
            seqNumber: '$ensureUnique'
          }
        },
        undefined
      )

      const doc = {
        _id: generateId(),
        _class: mockDocClass,
        seqNumber: 1,
        space: mockSpaceId,
        modifiedOn: platformNow(),
        modifiedBy: generateId() as any
      }

      const result = await dataMapper.prepareDocumentData(doc, mockSpaceId, false)

      // Should keep original value if unique
      expect(result.seqNumber).toBe(1)
    })
  })

  describe('Projection usage', () => {
    it('should use projection to only load the field being checked', async () => {
      const existingDocs = [
        {
          _id: generateId(),
          _class: mockDocClass,
          code: 'DOC-1',
          title: 'Title 1',
          space: mockSpaceId,
          modifiedOn: platformNow(),
          modifiedBy: generateId()
        }
      ]
      mockClient = createMockTxOperations(existingDocs)

      const dataMapper = new DataMapper(
        mockContext,
        mockClient,
        state,
        {
          [mockDocClass]: {
            code: '$ensureUnique'
          }
        },
        undefined
      )

      const doc = {
        _id: generateId(),
        _class: mockDocClass,
        code: 'DOC-2',
        title: 'Title 2',
        space: mockSpaceId,
        modifiedOn: platformNow(),
        modifiedBy: generateId() as any
      }

      await dataMapper.prepareDocumentData(doc, mockSpaceId, false)

      // Verify projection was used
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockClient.findAll).toHaveBeenCalledWith(mockDocClass, expect.anything(), { projection: { code: 1 } })
    })
  })

  describe('Edge cases', () => {
    it('should handle null/undefined values gracefully', async () => {
      mockClient = createMockTxOperations([])

      const dataMapper = new DataMapper(
        mockContext,
        mockClient,
        state,
        {
          [mockDocClass]: {
            code: '$ensureUnique'
          }
        },
        undefined
      )

      const doc = {
        _id: generateId(),
        _class: mockDocClass,
        code: null,
        space: mockSpaceId,
        modifiedOn: platformNow(),
        modifiedBy: generateId() as any
      }

      const result = await dataMapper.prepareDocumentData(doc, mockSpaceId, false)

      // Should not modify null values
      expect(result.code).toBeNull()
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockClient.findAll).not.toHaveBeenCalled()
    })

    it('should handle unsupported types', async () => {
      mockClient = createMockTxOperations([])

      const dataMapper = new DataMapper(
        mockContext,
        mockClient,
        state,
        {
          [mockDocClass]: {
            code: '$ensureUnique'
          }
        },
        undefined
      )

      const doc = {
        _id: generateId(),
        _class: mockDocClass,
        code: { complex: 'object' },
        space: mockSpaceId,
        modifiedOn: platformNow(),
        modifiedBy: generateId() as any
      }

      const result = await dataMapper.prepareDocumentData(doc, mockSpaceId, false)

      // Should not modify unsupported types
      expect(result.code).toEqual({ complex: 'object' })
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockContext.warn).toHaveBeenCalledWith(expect.stringContaining('Cannot ensure uniqueness'))
    })

    it('should handle empty database with prefix pattern', async () => {
      mockClient = createMockTxOperations([])

      const dataMapper = new DataMapper(
        mockContext,
        mockClient,
        state,
        {
          [mockDocClass]: {
            code: '$ensureUnique'
          }
        },
        undefined
      )

      const doc = {
        _id: generateId(),
        _class: mockDocClass,
        code: 'DOC-5',
        space: mockSpaceId,
        modifiedOn: platformNow(),
        modifiedBy: generateId() as any
      }

      const result = await dataMapper.prepareDocumentData(doc, mockSpaceId, false)

      expect(result.code).toBe('DOC-5')
    })

    it('should handle multiple fields with $ensureUnique', async () => {
      const testPrefix = 'DOC'
      const existingDocs = [
        {
          _id: generateId(),
          _class: mockDocClass,
          code: 'DOC-1',
          seqNumber: 10,
          prefix: testPrefix,
          space: mockSpaceId,
          modifiedOn: platformNow(),
          modifiedBy: generateId()
        }
      ]
      mockClient = createMockTxOperations(existingDocs)

      const dataMapper = new DataMapper(
        mockContext,
        mockClient,
        state,
        {
          [mockDocClass]: {
            code: '$ensureUnique',
            seqNumber: '$ensureUnique'
          }
        },
        undefined
      )

      const doc = {
        _id: generateId(),
        _class: mockDocClass,
        code: 'DOC-1',
        seqNumber: 10,
        prefix: testPrefix,
        space: mockSpaceId,
        modifiedOn: platformNow(),
        modifiedBy: generateId() as any
      }

      const result = await dataMapper.prepareDocumentData(doc, mockSpaceId, false)

      // Both fields should be made unique
      expect(result.code).toBe('DOC-2')
      expect(result.seqNumber).toBe(11)
    })
  })
})
