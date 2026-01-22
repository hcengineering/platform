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

describe('DataMapper - generateSeqNumber', () => {
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

  it('should generate seqNumber 1 when no existing documents', async () => {
    const testPrefix = 'DOC'
    mockClient = createMockTxOperations([])

    const dataMapper = new DataMapper(
      mockContext,
      mockClient,
      state,
      {
        [mockDocClass]: {
          seqNumber: '$generateSeqNumber'
        }
      },
      undefined
    )

    const doc = {
      _id: generateId(),
      _class: mockDocClass,
      prefix: testPrefix,
      space: mockSpaceId,
      modifiedOn: platformNow(),
      modifiedBy: generateId() as any
    }

    const result = await dataMapper.prepareDocumentData(doc, mockSpaceId, false)

    expect(result.seqNumber).toBe(1)
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockClient.findAll).toHaveBeenCalledWith(
      mockDocClass,
      { prefix: testPrefix },
      { projection: { seqNumber: 1, prefix: 1 } }
    )
  })

  it('should generate seqNumber as max + 1 when existing documents exist', async () => {
    const testPrefix = 'DOC'
    const existingDocs = [
      {
        _id: generateId(),
        _class: mockDocClass,
        seqNumber: 5,
        prefix: testPrefix,
        space: mockSpaceId,
        modifiedOn: platformNow(),
        modifiedBy: generateId()
      },
      {
        _id: generateId(),
        _class: mockDocClass,
        seqNumber: 10,
        prefix: testPrefix,
        space: mockSpaceId,
        modifiedOn: platformNow(),
        modifiedBy: generateId()
      },
      {
        _id: generateId(),
        _class: mockDocClass,
        seqNumber: 3,
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
          seqNumber: '$generateSeqNumber'
        }
      },
      undefined
    )

    const doc = {
      _id: generateId(),
      _class: mockDocClass,
      prefix: testPrefix,
      space: mockSpaceId,
      modifiedOn: platformNow(),
      modifiedBy: generateId() as any
    }

    const result = await dataMapper.prepareDocumentData(doc, mockSpaceId, false)

    // Should use max(5, 10, 3) + 1 = 11
    expect(result.seqNumber).toBe(11)
  })

  it('should track seqNumbers used in export batch', async () => {
    const testPrefix = 'DOC'
    mockClient = createMockTxOperations([])

    const dataMapper = new DataMapper(
      mockContext,
      mockClient,
      state,
      {
        [mockDocClass]: {
          seqNumber: '$generateSeqNumber'
        }
      },
      undefined
    )

    // First document
    const doc1 = {
      _id: generateId(),
      _class: mockDocClass,
      prefix: testPrefix,
      space: mockSpaceId,
      modifiedOn: platformNow(),
      modifiedBy: generateId() as any
    }
    const result1 = await dataMapper.prepareDocumentData(doc1, mockSpaceId, false)
    expect(result1.seqNumber).toBe(1)

    // Second document should get seqNumber 2
    const doc2 = {
      _id: generateId(),
      _class: mockDocClass,
      prefix: testPrefix,
      space: mockSpaceId,
      modifiedOn: platformNow(),
      modifiedBy: generateId() as any
    }
    const result2 = await dataMapper.prepareDocumentData(doc2, mockSpaceId, false)
    expect(result2.seqNumber).toBe(2)
  })

  it('should handle documents with different prefixes separately', async () => {
    const existingDocs = [
      {
        _id: generateId(),
        _class: mockDocClass,
        seqNumber: 10,
        prefix: 'DOC-A',
        space: mockSpaceId,
        modifiedOn: platformNow(),
        modifiedBy: generateId()
      },
      {
        _id: generateId(),
        _class: mockDocClass,
        seqNumber: 5,
        prefix: 'DOC-B',
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
          seqNumber: '$generateSeqNumber'
        }
      },
      undefined
    )

    // Document with DOC-A prefix
    const docA = {
      _id: generateId(),
      _class: mockDocClass,
      prefix: 'DOC-A',
      space: mockSpaceId,
      modifiedOn: platformNow(),
      modifiedBy: generateId() as any
    }
    const resultA = await dataMapper.prepareDocumentData(docA, mockSpaceId, false)
    expect(resultA.seqNumber).toBe(11) // max(10) + 1

    // Document with DOC-B prefix
    const docB = {
      _id: generateId(),
      _class: mockDocClass,
      prefix: 'DOC-B',
      space: mockSpaceId,
      modifiedOn: platformNow(),
      modifiedBy: generateId() as any
    }
    const resultB = await dataMapper.prepareDocumentData(docB, mockSpaceId, false)
    expect(resultB.seqNumber).toBe(6) // max(5) + 1
  })

  it('should skip generation if prefix is missing', async () => {
    mockClient = createMockTxOperations([])

    const dataMapper = new DataMapper(
      mockContext,
      mockClient,
      state,
      {
        [mockDocClass]: {
          seqNumber: '$generateSeqNumber'
        }
      },
      undefined
    )

    const doc = {
      _id: generateId(),
      _class: mockDocClass,
      space: mockSpaceId,
      modifiedOn: platformNow(),
      modifiedBy: generateId() as any
    }

    const result = await dataMapper.prepareDocumentData(doc, mockSpaceId, false)

    expect(result.seqNumber).toBeUndefined()
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockContext.warn).toHaveBeenCalledWith(
      'generateSeqNumber: prefix is required but not found, skipping seqNumber generation'
    )
  })

  it('should skip generation if prefix is empty string', async () => {
    mockClient = createMockTxOperations([])

    const dataMapper = new DataMapper(
      mockContext,
      mockClient,
      state,
      {
        [mockDocClass]: {
          seqNumber: '$generateSeqNumber'
        }
      },
      undefined
    )

    const doc = {
      _id: generateId(),
      _class: mockDocClass,
      prefix: '',
      space: mockSpaceId,
      modifiedOn: platformNow(),
      modifiedBy: generateId() as any
    }

    const result = await dataMapper.prepareDocumentData(doc, mockSpaceId, false)

    expect(result.seqNumber).toBeUndefined()
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockContext.warn).toHaveBeenCalledWith(
      'generateSeqNumber: prefix is required but not found, skipping seqNumber generation'
    )
  })
})

describe('DataMapper - generateCode', () => {
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

  it('should generate code from prefix and seqNumber', async () => {
    const testPrefix = 'DOC'
    mockClient = createMockTxOperations([])

    const dataMapper = new DataMapper(
      mockContext,
      mockClient,
      state,
      {
        [mockDocClass]: {
          seqNumber: '$generateSeqNumber',
          code: '$generateCode'
        }
      },
      undefined
    )

    const doc = {
      _id: generateId(),
      _class: mockDocClass,
      prefix: testPrefix,
      space: mockSpaceId,
      modifiedOn: platformNow(),
      modifiedBy: generateId() as any
    }

    const result = await dataMapper.prepareDocumentData(doc, mockSpaceId, false)

    expect(result.seqNumber).toBe(1)
    expect(result.code).toBe('DOC-1')
  })

  it('should generate code with different seqNumbers', async () => {
    const testPrefix = 'DOC'
    const existingDocs = [
      {
        _id: generateId(),
        _class: mockDocClass,
        seqNumber: 5,
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
          seqNumber: '$generateSeqNumber',
          code: '$generateCode'
        }
      },
      undefined
    )

    const doc = {
      _id: generateId(),
      _class: mockDocClass,
      prefix: testPrefix,
      space: mockSpaceId,
      modifiedOn: platformNow(),
      modifiedBy: generateId() as any
    }

    const result = await dataMapper.prepareDocumentData(doc, mockSpaceId, false)

    expect(result.seqNumber).toBe(6)
    expect(result.code).toBe('DOC-6')
  })

  it('should skip generation if prefix is missing', async () => {
    mockClient = createMockTxOperations([])

    const dataMapper = new DataMapper(
      mockContext,
      mockClient,
      state,
      {
        [mockDocClass]: {
          code: '$generateCode'
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

    expect(result.code).toBeUndefined()
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockContext.warn).toHaveBeenCalledWith(
      'generateCode: prefix is required but not found, skipping code generation'
    )
  })

  it('should skip generation if seqNumber is missing', async () => {
    const testPrefix = 'DOC'
    mockClient = createMockTxOperations([])

    const dataMapper = new DataMapper(
      mockContext,
      mockClient,
      state,
      {
        [mockDocClass]: {
          code: '$generateCode'
        }
      },
      undefined
    )

    const doc = {
      _id: generateId(),
      _class: mockDocClass,
      prefix: testPrefix,
      space: mockSpaceId,
      modifiedOn: platformNow(),
      modifiedBy: generateId() as any
    }

    const result = await dataMapper.prepareDocumentData(doc, mockSpaceId, false)

    expect(result.code).toBeUndefined()
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockContext.warn).toHaveBeenCalledWith(
      'generateCode: seqNumber is required but not found, skipping code generation'
    )
  })

  it('should warn if generated code already exists', async () => {
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
      }
    ]
    mockClient = createMockTxOperations(existingDocs)

    const dataMapper = new DataMapper(
      mockContext,
      mockClient,
      state,
      {
        [mockDocClass]: {
          seqNumber: '$generateSeqNumber',
          code: '$generateCode'
        }
      },
      undefined
    )

    const doc = {
      _id: generateId(),
      _class: mockDocClass,
      prefix: testPrefix,
      space: mockSpaceId,
      modifiedOn: platformNow(),
      modifiedBy: generateId() as any
    }

    const result = await dataMapper.prepareDocumentData(doc, mockSpaceId, false)

    // Should still generate the code (seqNumber will be 1, code will be DOC-1)
    expect(result.seqNumber).toBe(1)
    expect(result.code).toBe('DOC-1')
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockContext.warn).toHaveBeenCalledWith(expect.stringContaining('Generated code DOC-1 already exists'))
  })

  it('should handle prefix with special characters', async () => {
    const testPrefix = 'DOC-TEST'
    mockClient = createMockTxOperations([])

    const dataMapper = new DataMapper(
      mockContext,
      mockClient,
      state,
      {
        [mockDocClass]: {
          seqNumber: '$generateSeqNumber',
          code: '$generateCode'
        }
      },
      undefined
    )

    const doc = {
      _id: generateId(),
      _class: mockDocClass,
      prefix: testPrefix,
      space: mockSpaceId,
      modifiedOn: platformNow(),
      modifiedBy: generateId() as any
    }

    const result = await dataMapper.prepareDocumentData(doc, mockSpaceId, false)

    expect(result.seqNumber).toBe(1)
    expect(result.code).toBe('DOC-TEST-1')
  })
})
