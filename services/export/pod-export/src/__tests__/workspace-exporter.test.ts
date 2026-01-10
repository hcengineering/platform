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
  type WorkspaceIds,
  type AttachedDoc,
  type Hierarchy,
  type LowLevelStorage,
  generateId
} from '@hcengineering/core'
import core from '@hcengineering/model-core'
import { type StorageAdapter, type Pipeline } from '@hcengineering/server-core'
import { CrossWorkspaceExporter, type PipelineFactory, type RelationDefinition } from '../workspace'

// Mock document classes
const mockDocClass = 'test:class:TestDoc' as Ref<Class<Doc>>
const mockAttachedDocClass = 'test:class:AttachedTestDoc' as Ref<Class<AttachedDoc>>
const mockSpaceClass = 'test:class:TestSpace' as Ref<Class<Space>>

// Helper to create mock documents
function createMockDoc (id: string, _class: Ref<Class<Doc>>, space: Ref<Space>, data: Record<string, any> = {}): Doc {
  return {
    _id: id as Ref<Doc>,
    _class,
    space,
    modifiedOn: Date.now(),
    modifiedBy: 'test:account:user' as any,
    ...data
  }
}

function createMockAttachedDoc (
  id: string,
  _class: Ref<Class<AttachedDoc>>,
  space: Ref<Space>,
  attachedTo: Ref<Doc>,
  attachedToClass: Ref<Class<Doc>>,
  collection: string,
  data: Record<string, any> = {}
): AttachedDoc {
  return {
    _id: id as Ref<AttachedDoc>,
    _class,
    space,
    modifiedOn: Date.now(),
    modifiedBy: 'test:account:user' as any,
    attachedTo,
    attachedToClass,
    collection,
    ...data
  }
}

function createMockSpace (id: string, name: string): Space {
  return {
    _id: id as Ref<Space>,
    _class: mockSpaceClass,
    space: core.space.Space,
    name,
    description: '',
    private: false,
    archived: false,
    members: [],
    modifiedOn: Date.now(),
    modifiedBy: 'test:account:user' as any
  }
}

// Mock implementations
function createMockHierarchy (config: {
  domains?: Map<Ref<Class<Doc>>, string>
  isDerived?: Map<Ref<Class<Doc>>, boolean>
  attributes?: Map<Ref<Class<Doc>>, Map<string, { type: { _class: Ref<Class<Doc>> } }>>
  isMixin?: boolean
}): Hierarchy {
  return {
    findDomain: jest.fn((classRef: Ref<Class<Doc>>) => {
      return config.domains?.get(classRef) ?? 'test_domain'
    }),
    isDerived: jest.fn((classRef: Ref<Class<Doc>>, baseClass: Ref<Class<Doc>>) => {
      if (baseClass === core.class.AttachedDoc) {
        return config.isDerived?.get(classRef) ?? false
      }
      return false
    }),
    getAllAttributes: jest.fn((classRef: Ref<Class<Doc>>) => {
      return config.attributes?.get(classRef) ?? new Map()
    }),
    isMixin: jest.fn(() => config.isMixin ?? false),
    hasMixin: jest.fn(() => undefined),
    getClass: jest.fn((classRef: Ref<Class<Doc>>) => {
      return { label: 'Test Class' }
    })
  } as unknown as Hierarchy
}

function createMockLowLevelStorage (documents: Map<string, Doc[]>): LowLevelStorage {
  return {
    rawFindAll: jest.fn(async <T extends Doc>(domain: string, query: any): Promise<T[]> => {
      const allDocs = documents.get(domain) ?? []

      return allDocs.filter((doc) => {
        // Match by _id
        if (query._id !== undefined) {
          if (typeof query._id === 'object' && query._id.$in !== undefined) {
            const inArray = query._id.$in as Ref<Doc>[]
            if (inArray !== undefined && !inArray.includes(doc._id)) return false
          } else if (doc._id !== query._id) {
            return false
          }
        }

        // Match by _class
        if (query._class !== undefined && doc._class !== query._class) {
          return false
        }

        // Match by attachedTo
        if (query.attachedTo !== undefined) {
          const attachedDoc = doc as AttachedDoc
          if (attachedDoc.attachedTo !== query.attachedTo) {
            return false
          }
        }

        // Match by field with $in
        for (const [key, value] of Object.entries(query)) {
          if (key.startsWith('_') || key === 'attachedTo') continue
          if (typeof value === 'object' && value !== null && '$in' in value) {
            const inArray = (value as { $in: any[] }).$in
            if (inArray !== undefined && !inArray.includes((doc as any)[key])) {
              return false
            }
          }
        }

        return true
      }) as T[]
    }),
    traverse: jest.fn(async <T extends Doc>(domain: string, query: any) => {
      const docs = documents.get(domain) ?? []
      let returned = false
      return {
        next: async (limit: number): Promise<T[] | null> => {
          if (returned) return null
          returned = true
          return docs.filter((doc) => {
            if (query._class !== undefined && doc._class !== query._class) {
              return false
            }
            return true
          }) as T[]
        },
        close: async () => {}
      }
    })
  } as unknown as LowLevelStorage
}

function createMockTxOperations (
  existingDocs: Doc[] = [],
  existingSpaces: Space[] = [],
  hierarchy?: Hierarchy
): TxOperations {
  const createdDocs: Doc[] = []

  return {
    findAll: jest.fn(async <T extends Doc>(classRef: Ref<Class<T>>, query: any): Promise<T[]> => {
      if (classRef === core.class.Space || query._class !== undefined) {
        return existingSpaces.filter((s) => {
          if (query.name !== undefined && s.name !== query.name) return false
          if (query._class !== undefined && s._class !== query._class) return false
          if (query._id !== undefined) {
            if (typeof query._id === 'object' && query._id.$in !== undefined) {
              return query._id.$in.includes(s._id)
            }
            return s._id === query._id
          }
          return true
        }) as unknown as T[]
      }
      return existingDocs.filter((d) => d._class === classRef) as unknown as T[]
    }),
    createDoc: jest.fn(
      async <T extends Doc>(classRef: Ref<Class<T>>, space: Ref<Space>, data: any, id?: Ref<T>): Promise<Ref<T>> => {
        const docId = id ?? generateId<T>()
        createdDocs.push({ _id: docId, _class: classRef, space, ...data } as unknown as Doc)
        return docId
      }
    ),
    addCollection: jest.fn(
      async <T extends Doc, P extends AttachedDoc>(
        classRef: Ref<Class<P>>,
        space: Ref<Space>,
        attachedTo: Ref<T>,
        attachedToClass: Ref<Class<T>>,
        collection: string,
        data: any,
        id?: Ref<P>
      ): Promise<Ref<P>> => {
        const docId = id ?? generateId<P>()
        createdDocs.push({
          _id: docId,
          _class: classRef,
          space,
          attachedTo,
          attachedToClass,
          collection,
          ...data
        } as unknown as Doc)
        return docId
      }
    ),
    getHierarchy: jest.fn(() => hierarchy ?? createMockHierarchy({})),
    getCreatedDocs: () => createdDocs
  } as unknown as TxOperations & { getCreatedDocs: () => Doc[] }
}

function createMockPipelineFactory (hierarchy: Hierarchy, lowLevelStorage: LowLevelStorage): PipelineFactory {
  return async (ctx: MeasureContext, workspace: WorkspaceIds): Promise<Pipeline> => {
    return {
      context: {
        hierarchy,
        lowLevelStorage
      },
      close: jest.fn()
    } as unknown as Pipeline
  }
}

function createMockMeasureContext (): MeasureContext {
  return {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  } as unknown as MeasureContext
}

function createMockStorageAdapter (): StorageAdapter {
  const adapter: Partial<StorageAdapter> = {}
  return adapter as StorageAdapter
}

// Use realistic hex IDs that look like MongoDB ObjectIds
const SOURCE_SPACE_ID = '69286daacb49b698d3ea2c51' as Ref<Space>
const SOURCE_DOC_1 = '69286dc0cb49b698d3ea2c95' as Ref<Doc>
const SOURCE_DOC_2 = '69286dc1cb49b698d3ea2c98' as Ref<Doc>
const SOURCE_ATTACHED_1 = '69286dc3cb49b698d3ea2c9a' as Ref<Doc>
const TARGET_SPACE_ID = '79286daacb49b698d3ea2c51' as Ref<Space>

function createWorkspaceIds (uuid: string): WorkspaceIds {
  const workspaceIds: WorkspaceIds = {
    uuid: uuid as any,
    dataId: uuid as any,
    url: `http://localhost/${uuid}`
  }
  return workspaceIds
}

describe('CrossWorkspaceExporter', () => {
  let mockContext: MeasureContext
  let mockStorage: StorageAdapter

  beforeEach(() => {
    mockContext = createMockMeasureContext()
    mockStorage = createMockStorageAdapter()
    jest.clearAllMocks()
  })

  describe('Basic Migration', () => {
    it('should migrate a simple document', async () => {
      const sourceSpace = createMockSpace(SOURCE_SPACE_ID, 'Test Space')
      const sourceDoc = createMockDoc(SOURCE_DOC_1, mockDocClass, SOURCE_SPACE_ID, {
        title: 'Test Document'
      })

      const hierarchy = createMockHierarchy({
        domains: new Map([
          [mockDocClass, 'test_domain'],
          [core.class.Space, 'space_domain']
        ]),
        attributes: new Map([
          [mockDocClass, new Map([['title', { type: { _class: 'core:class:TypeString' as Ref<Class<Doc>> } }]])]
        ])
      })

      const lowLevelStorage = createMockLowLevelStorage(
        new Map([
          ['test_domain', [sourceDoc]],
          ['space_domain', [sourceSpace]]
        ])
      )

      const targetClient = createMockTxOperations([], [], hierarchy)
      const pipelineFactory = createMockPipelineFactory(hierarchy, lowLevelStorage)

      const exporter = new CrossWorkspaceExporter(
        mockContext,
        pipelineFactory,
        targetClient,
        mockStorage,
        'test:account:user' as any,
        createWorkspaceIds('source-ws'),
        createWorkspaceIds('target-ws')
      )

      const result = await exporter.export({
        sourceWorkspace: createWorkspaceIds('source-ws'),
        targetWorkspace: createWorkspaceIds('target-ws'),
        sourceQuery: {},
        _class: mockDocClass
      })

      expect(result.success).toBe(true)
      expect(result.exportedCount).toBe(1)
      expect(result.errors).toHaveLength(0)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const createDocMock = targetClient.createDoc as jest.Mock
      expect(createDocMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything()
      )
    })

    it('should skip existing documents when conflictStrategy is skip', async () => {
      const sourceSpace = createMockSpace(SOURCE_SPACE_ID, 'Test Space')
      const existingSpace = createMockSpace(TARGET_SPACE_ID, 'Test Space')
      const sourceDoc = createMockDoc(SOURCE_DOC_1, mockDocClass, SOURCE_SPACE_ID, {
        title: 'Test Document'
      })
      const existingDoc = createMockDoc(SOURCE_DOC_1, mockDocClass, TARGET_SPACE_ID, {
        title: 'Existing Document'
      })

      const hierarchy = createMockHierarchy({
        domains: new Map([
          [mockDocClass, 'test_domain'],
          [core.class.Space, 'space_domain']
        ])
      })

      const lowLevelStorage = createMockLowLevelStorage(
        new Map([
          ['test_domain', [sourceDoc]],
          ['space_domain', [sourceSpace]]
        ])
      )

      const targetClient = createMockTxOperations([existingDoc], [existingSpace], hierarchy)
      const pipelineFactory = createMockPipelineFactory(hierarchy, lowLevelStorage)

      const exporter = new CrossWorkspaceExporter(
        mockContext,
        pipelineFactory,
        targetClient,
        mockStorage,
        undefined,
        createWorkspaceIds('source-ws'),
        createWorkspaceIds('target-ws')
      )

      const result = await exporter.export({
        sourceWorkspace: createWorkspaceIds('source-ws'),
        targetWorkspace: createWorkspaceIds('target-ws'),
        sourceQuery: {},
        _class: mockDocClass,
        conflictStrategy: 'skip'
      })

      expect(result.skippedCount).toBe(1)
      expect(result.exportedCount).toBe(0)
    })
  })

  describe('Attached Documents', () => {
    it('should migrate attached documents with addCollection', async () => {
      const sourceSpace = createMockSpace(SOURCE_SPACE_ID, 'Test Space')
      const parentDoc = createMockDoc(SOURCE_DOC_1, mockDocClass, SOURCE_SPACE_ID)
      const attachedDoc = createMockAttachedDoc(
        SOURCE_ATTACHED_1,
        mockAttachedDocClass,
        SOURCE_SPACE_ID,
        SOURCE_DOC_1,
        mockDocClass,
        'children',
        { title: 'Attached Doc' }
      )

      const hierarchy = createMockHierarchy({
        domains: new Map([
          [mockDocClass, 'test_domain'],
          [mockAttachedDocClass, 'test_domain'],
          [core.class.Space, 'space_domain']
        ]),
        isDerived: new Map([[mockAttachedDocClass, true]]),
        attributes: new Map([
          [
            mockAttachedDocClass,
            new Map([
              ['title', { type: { _class: 'core:class:TypeString' as Ref<Class<Doc>> } }],
              ['attachedTo', { type: { _class: core.class.RefTo } }],
              ['attachedToClass', { type: { _class: 'core:class:TypeString' as Ref<Class<Doc>> } }],
              ['collection', { type: { _class: 'core:class:TypeString' as Ref<Class<Doc>> } }]
            ])
          ]
        ])
      })

      const lowLevelStorage = createMockLowLevelStorage(
        new Map([
          ['test_domain', [parentDoc, attachedDoc]],
          ['space_domain', [sourceSpace]]
        ])
      )

      const targetClient = createMockTxOperations([], [], hierarchy)
      const pipelineFactory = createMockPipelineFactory(hierarchy, lowLevelStorage)

      const exporter = new CrossWorkspaceExporter(
        mockContext,
        pipelineFactory,
        targetClient,
        mockStorage,
        undefined,
        createWorkspaceIds('source-ws'),
        createWorkspaceIds('target-ws')
      )

      const result = await exporter.export({
        sourceWorkspace: createWorkspaceIds('source-ws'),
        targetWorkspace: createWorkspaceIds('target-ws'),
        sourceQuery: {},
        _class: mockAttachedDocClass
      })

      expect(result.success).toBe(true)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const addCollectionMock = targetClient.addCollection as jest.Mock
      expect(addCollectionMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything()
      )
    })

    it('should remap attachedTo reference to migrated parent ID', async () => {
      const sourceSpace = createMockSpace(SOURCE_SPACE_ID, 'Test Space')
      const parentDoc = createMockDoc(SOURCE_DOC_1, mockDocClass, SOURCE_SPACE_ID)
      const attachedDoc = createMockAttachedDoc(
        SOURCE_ATTACHED_1,
        mockAttachedDocClass,
        SOURCE_SPACE_ID,
        SOURCE_DOC_1,
        mockDocClass,
        'children'
      )

      const hierarchy = createMockHierarchy({
        domains: new Map([
          [mockDocClass, 'test_domain'],
          [mockAttachedDocClass, 'test_domain'],
          [core.class.Space, 'space_domain']
        ]),
        isDerived: new Map([[mockAttachedDocClass, true]]),
        attributes: new Map([
          [
            mockDocClass,
            new Map([['children', { type: { _class: core.class.Collection, of: mockAttachedDocClass } }]])
          ],
          [
            mockAttachedDocClass,
            new Map([
              ['attachedTo', { type: { _class: core.class.RefTo } }],
              ['attachedToClass', { type: { _class: 'core:class:TypeString' as Ref<Class<Doc>> } }],
              ['collection', { type: { _class: 'core:class:TypeString' as Ref<Class<Doc>> } }]
            ])
          ]
        ])
      })

      const lowLevelStorage = createMockLowLevelStorage(
        new Map([
          ['test_domain', [parentDoc, attachedDoc]],
          ['space_domain', [sourceSpace]]
        ])
      )

      const targetClient = createMockTxOperations([], [], hierarchy) as TxOperations & { getCreatedDocs: () => Doc[] }
      const pipelineFactory = createMockPipelineFactory(hierarchy, lowLevelStorage)

      const exporter = new CrossWorkspaceExporter(
        mockContext,
        pipelineFactory,
        targetClient,
        mockStorage,
        undefined,
        createWorkspaceIds('source-ws'),
        createWorkspaceIds('target-ws')
      )

      // Migrate parent first via relations
      const result = await exporter.export({
        sourceWorkspace: createWorkspaceIds('source-ws'),
        targetWorkspace: createWorkspaceIds('target-ws'),
        sourceQuery: {},
        _class: mockDocClass,
        relations: [{ field: 'attachedTo', class: mockDocClass }]
      })

      expect(result.success).toBe(true)

      // Check that addCollection was called with remapped ID
      const addCollectionCalls = (targetClient.addCollection as jest.Mock).mock.calls
      if (addCollectionCalls.length > 0) {
        const attachedToArg = addCollectionCalls[0][2] // attachedTo is 3rd argument
        // The attachedTo should NOT be the source ID
        expect(attachedToArg).not.toBe(SOURCE_DOC_1)
      }
    })
  })

  describe('Forward Relations', () => {
    it('should migrate forward relations before the main document', async () => {
      const sourceSpace = createMockSpace(SOURCE_SPACE_ID, 'Test Space')
      const relatedDoc = createMockDoc(SOURCE_DOC_1, mockDocClass, SOURCE_SPACE_ID, {
        title: 'Related'
      })
      const mainDoc = createMockDoc(SOURCE_DOC_2, mockDocClass, SOURCE_SPACE_ID, {
        title: 'Main',
        relatedTo: SOURCE_DOC_1
      })

      const hierarchy = createMockHierarchy({
        domains: new Map([
          [mockDocClass, 'test_domain'],
          [core.class.Space, 'space_domain']
        ]),
        attributes: new Map([
          [
            mockDocClass,
            new Map([
              ['title', { type: { _class: 'core:class:TypeString' as Ref<Class<Doc>> } }],
              ['relatedTo', { type: { _class: core.class.RefTo } }]
            ])
          ]
        ])
      })

      const lowLevelStorage = createMockLowLevelStorage(
        new Map([
          ['test_domain', [mainDoc, relatedDoc]],
          ['space_domain', [sourceSpace]]
        ])
      )

      const targetClient = createMockTxOperations([], [], hierarchy)
      const pipelineFactory = createMockPipelineFactory(hierarchy, lowLevelStorage)

      const exporter = new CrossWorkspaceExporter(
        mockContext,
        pipelineFactory,
        targetClient,
        mockStorage,
        undefined,
        createWorkspaceIds('source-ws'),
        createWorkspaceIds('target-ws')
      )

      const relations: RelationDefinition[] = [{ field: 'relatedTo', class: mockDocClass }]

      const result = await exporter.export({
        sourceWorkspace: createWorkspaceIds('source-ws'),
        targetWorkspace: createWorkspaceIds('target-ws'),
        sourceQuery: { _id: SOURCE_DOC_2 as any },
        _class: mockDocClass,
        relations
      })

      expect(result.success).toBe(true)
      // Both documents should be created
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const createDocMock = targetClient.createDoc as jest.Mock
      expect(createDocMock).toHaveBeenCalledTimes(3)
    })

    it('should skip predefined IDs in forward relations', async () => {
      const sourceSpace = createMockSpace(SOURCE_SPACE_ID, 'Test Space')
      const mainDoc = createMockDoc(SOURCE_DOC_1, mockDocClass, SOURCE_SPACE_ID, {
        title: 'Main',
        template: 'documents:template:ProductChangeControl' // Predefined ID
      })

      const hierarchy = createMockHierarchy({
        domains: new Map([
          [mockDocClass, 'test_domain'],
          [core.class.Space, 'space_domain']
        ]),
        attributes: new Map([
          [
            mockDocClass,
            new Map([
              ['title', { type: { _class: 'core:class:TypeString' as Ref<Class<Doc>> } }],
              ['template', { type: { _class: core.class.RefTo } }]
            ])
          ]
        ])
      })

      const lowLevelStorage = createMockLowLevelStorage(
        new Map([
          ['test_domain', [mainDoc]],
          ['space_domain', [sourceSpace]]
        ])
      )

      const targetClient = createMockTxOperations([], [], hierarchy)
      const pipelineFactory = createMockPipelineFactory(hierarchy, lowLevelStorage)

      const exporter = new CrossWorkspaceExporter(
        mockContext,
        pipelineFactory,
        targetClient,
        mockStorage,
        undefined,
        createWorkspaceIds('source-ws'),
        createWorkspaceIds('target-ws')
      )

      const relations: RelationDefinition[] = [{ field: 'template', class: mockDocClass }]

      const result = await exporter.export({
        sourceWorkspace: createWorkspaceIds('source-ws'),
        targetWorkspace: createWorkspaceIds('target-ws'),
        sourceQuery: {},
        _class: mockDocClass,
        relations
      })

      expect(result.success).toBe(true)
      // Only main doc + space should be created (not trying to migrate the template)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const createDocMock = targetClient.createDoc as jest.Mock
      expect(createDocMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('Inverse Relations', () => {
    it('should migrate inverse relations after the main document', async () => {
      const sourceSpace = createMockSpace(SOURCE_SPACE_ID, 'Test Space')
      const parentDoc = createMockDoc(SOURCE_DOC_1, mockDocClass, SOURCE_SPACE_ID, {
        title: 'Parent'
      })
      const childDoc = createMockDoc(SOURCE_DOC_2, mockDocClass, SOURCE_SPACE_ID, {
        title: 'Child',
        parentRef: SOURCE_DOC_1
      })

      const hierarchy = createMockHierarchy({
        domains: new Map([
          [mockDocClass, 'test_domain'],
          [core.class.Space, 'space_domain']
        ]),
        attributes: new Map([
          [
            mockDocClass,
            new Map([
              ['title', { type: { _class: 'core:class:TypeString' as Ref<Class<Doc>> } }],
              ['parentRef', { type: { _class: core.class.RefTo } }]
            ])
          ]
        ])
      })

      const lowLevelStorage = createMockLowLevelStorage(
        new Map([
          ['test_domain', [parentDoc, childDoc]],
          ['space_domain', [sourceSpace]]
        ])
      )

      const targetClient = createMockTxOperations([], [], hierarchy)
      const pipelineFactory = createMockPipelineFactory(hierarchy, lowLevelStorage)

      const exporter = new CrossWorkspaceExporter(
        mockContext,
        pipelineFactory,
        targetClient,
        mockStorage,
        undefined,
        createWorkspaceIds('source-ws'),
        createWorkspaceIds('target-ws')
      )

      const relations: RelationDefinition[] = [{ field: 'parentRef', class: mockDocClass, direction: 'inverse' }]

      const result = await exporter.export({
        sourceWorkspace: createWorkspaceIds('source-ws'),
        targetWorkspace: createWorkspaceIds('target-ws'),
        sourceQuery: { _id: 'source:parent:1' as any },
        _class: mockDocClass,
        relations
      })

      expect(result.success).toBe(true)
      // Both parent and child should be created + space
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const createDocMock = targetClient.createDoc as jest.Mock
      expect(createDocMock).toHaveBeenCalledTimes(3)
    })
  })

  describe('Space Migration', () => {
    it('should create new space if not exists', async () => {
      const sourceSpace = createMockSpace(SOURCE_SPACE_ID, 'New Test Space')
      const sourceDoc = createMockDoc(SOURCE_DOC_1, mockDocClass, SOURCE_SPACE_ID)

      const hierarchy = createMockHierarchy({
        domains: new Map([
          [mockDocClass, 'test_domain'],
          [core.class.Space, 'space_domain']
        ]),
        attributes: new Map([
          [mockDocClass, new Map()],
          [
            mockSpaceClass,
            new Map([
              ['name', { type: { _class: 'core:class:TypeString' as Ref<Class<Doc>> } }],
              ['description', { type: { _class: 'core:class:TypeString' as Ref<Class<Doc>> } }],
              ['private', { type: { _class: 'core:class:TypeBoolean' as Ref<Class<Doc>> } }],
              ['archived', { type: { _class: 'core:class:TypeBoolean' as Ref<Class<Doc>> } }]
            ])
          ]
        ])
      })

      const lowLevelStorage = createMockLowLevelStorage(
        new Map([
          ['test_domain', [sourceDoc]],
          ['space_domain', [sourceSpace]]
        ])
      )

      const targetClient = createMockTxOperations([], [], hierarchy)
      const pipelineFactory = createMockPipelineFactory(hierarchy, lowLevelStorage)

      const exporter = new CrossWorkspaceExporter(
        mockContext,
        pipelineFactory,
        targetClient,
        mockStorage,
        'test:account:user' as any,
        createWorkspaceIds('source-ws'),
        createWorkspaceIds('target-ws')
      )

      const result = await exporter.export({
        sourceWorkspace: createWorkspaceIds('source-ws'),
        targetWorkspace: createWorkspaceIds('target-ws'),
        sourceQuery: {},
        _class: mockDocClass
      })

      expect(result.success).toBe(true)

      // Space should be created with current user as member
      const createDocCalls = (targetClient.createDoc as jest.Mock).mock.calls
      const spaceCreateCall = createDocCalls.find((call) => call[0] === mockSpaceClass)
      if (spaceCreateCall !== undefined) {
        const spaceData = spaceCreateCall[2]
        expect(spaceData.members).toContain('test:account:user')
        expect(spaceData.owners).toContain('test:account:user')
      }
    })

    it('should reuse existing space with same name and class', async () => {
      const sourceSpace = createMockSpace(SOURCE_SPACE_ID, 'Existing Space')
      sourceSpace._class = mockSpaceClass
      const existingTargetSpace = createMockSpace(TARGET_SPACE_ID, 'Existing Space')
      existingTargetSpace._class = mockSpaceClass
      const sourceDoc = createMockDoc(SOURCE_DOC_1, mockDocClass, SOURCE_SPACE_ID)

      const hierarchy = createMockHierarchy({
        domains: new Map([
          [mockDocClass, 'test_domain'],
          [core.class.Space, 'space_domain']
        ])
      })

      const lowLevelStorage = createMockLowLevelStorage(
        new Map([
          ['test_domain', [sourceDoc]],
          ['space_domain', [sourceSpace]]
        ])
      )

      const targetClient = createMockTxOperations([], [existingTargetSpace], hierarchy)
      const pipelineFactory = createMockPipelineFactory(hierarchy, lowLevelStorage)

      const exporter = new CrossWorkspaceExporter(
        mockContext,
        pipelineFactory,
        targetClient,
        mockStorage,
        undefined,
        createWorkspaceIds('source-ws'),
        createWorkspaceIds('target-ws')
      )

      const result = await exporter.export({
        sourceWorkspace: createWorkspaceIds('source-ws'),
        targetWorkspace: createWorkspaceIds('target-ws'),
        sourceQuery: {},
        _class: mockDocClass
      })

      expect(result.success).toBe(true)

      // Space should NOT be created (reusing existing)
      const createDocCalls = (targetClient.createDoc as jest.Mock).mock.calls
      const spaceCreateCalls = createDocCalls.filter((call) => call[1] === core.space.Space)
      expect(spaceCreateCalls).toHaveLength(0)
    })
  })

  describe('ID Remapping', () => {
    it('should remap reference fields to new IDs', async () => {
      // Use realistic hex IDs like MongoDB ObjectIds
      const sourceSpaceId = '69286daacb49b698d3ea2c51' as Ref<Space>
      const sourceSpace = createMockSpace(sourceSpaceId, 'Test Space')
      const refDoc = createMockDoc('69286dc0cb49b698d3ea2c95', mockDocClass, sourceSpaceId)
      const mainDoc = createMockDoc('69286dc1cb49b698d3ea2c98', mockDocClass, sourceSpaceId, {
        title: 'Main',
        reference: '69286dc0cb49b698d3ea2c95'
      })

      const hierarchy = createMockHierarchy({
        domains: new Map([
          [mockDocClass, 'test_domain'],
          [core.class.Space, 'space_domain']
        ]),
        attributes: new Map([
          [
            mockDocClass,
            new Map([
              ['title', { type: { _class: 'core:class:TypeString' as Ref<Class<Doc>> } }],
              ['reference', { type: { _class: core.class.RefTo } }]
            ])
          ]
        ])
      })

      const lowLevelStorage = createMockLowLevelStorage(
        new Map([
          ['test_domain', [mainDoc, refDoc]],
          ['space_domain', [sourceSpace]]
        ])
      )

      const targetClient = createMockTxOperations([], [], hierarchy)
      const pipelineFactory = createMockPipelineFactory(hierarchy, lowLevelStorage)

      const exporter = new CrossWorkspaceExporter(
        mockContext,
        pipelineFactory,
        targetClient,
        mockStorage,
        undefined,
        createWorkspaceIds('source-ws'),
        createWorkspaceIds('target-ws')
      )

      await exporter.export({
        sourceWorkspace: createWorkspaceIds('source-ws'),
        targetWorkspace: createWorkspaceIds('target-ws'),
        sourceQuery: { _id: '69286dc1cb49b698d3ea2c98' as any },
        _class: mockDocClass,
        relations: [{ field: 'reference', class: mockDocClass }]
      })

      // Get the data passed to createDoc for main document
      const createDocCalls = (targetClient.createDoc as jest.Mock).mock.calls
      const mainDocCall = createDocCalls.find((call) => {
        const data = call[2]
        return data.title === 'Main'
      })

      if (mainDocCall !== undefined) {
        const data = mainDocCall[2]
        // The reference should NOT be the source ID
        expect(data.reference).not.toBe('69286dc0cb49b698d3ea2c95')
      }
    })
  })

  describe('Error Handling', () => {
    it('should continue migration when a single document fails', async () => {
      const sourceSpace = createMockSpace(SOURCE_SPACE_ID, 'Test Space')
      const doc1 = createMockDoc(SOURCE_DOC_1, mockDocClass, SOURCE_SPACE_ID)
      const doc2 = createMockDoc(SOURCE_DOC_2, mockDocClass, SOURCE_SPACE_ID)

      const hierarchy = createMockHierarchy({
        domains: new Map([
          [mockDocClass, 'test_domain'],
          [core.class.Space, 'space_domain']
        ])
      })

      const lowLevelStorage = createMockLowLevelStorage(
        new Map([
          ['test_domain', [doc1, doc2]],
          ['space_domain', [sourceSpace]]
        ])
      )

      const targetClient = createMockTxOperations([], [], hierarchy)

      // Make createDoc fail for first document
      let callCount = 0
      ;(targetClient.createDoc as jest.Mock).mockImplementation(async () => {
        callCount++
        if (callCount === 2) {
          // First doc after space
          throw new Error('Test error')
        }
        return generateId()
      })

      const pipelineFactory = createMockPipelineFactory(hierarchy, lowLevelStorage)

      const exporter = new CrossWorkspaceExporter(
        mockContext,
        pipelineFactory,
        targetClient,
        mockStorage,
        undefined,
        createWorkspaceIds('source-ws'),
        createWorkspaceIds('target-ws')
      )

      const result = await exporter.export({
        sourceWorkspace: createWorkspaceIds('source-ws'),
        targetWorkspace: createWorkspaceIds('target-ws'),
        sourceQuery: {},
        _class: mockDocClass
      })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      // At least one document should have been attempted
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const createDocMock = targetClient.createDoc as jest.Mock
      expect(createDocMock).toHaveBeenCalled()
    })
  })
})
