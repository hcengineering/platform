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

/* eslint-disable @typescript-eslint/unbound-method */

import {
  type Class,
  type Doc,
  type Ref,
  type Space,
  type TxOperations,
  type WorkspaceIds,
  type MeasureContext,
  type LowLevelStorage,
  type Hierarchy,
  type AttachedDoc,
  DOMAIN_TX
} from '@hcengineering/core'
import { type StorageAdapter, type PipelineFactory } from '@hcengineering/server-core'
import { WorkspaceMigrator, type MigrationOptions } from '../migrator'

describe('WorkspaceMigrator', () => {
  let mockContext: jest.Mocked<MeasureContext>
  let mockSourcePipelineFactory: jest.MockedFunction<PipelineFactory>
  let mockTargetClient: jest.Mocked<TxOperations>
  let mockStorageAdapter: jest.Mocked<StorageAdapter>
  let mockSourcePipeline: any
  let mockLowLevelStorage: jest.Mocked<LowLevelStorage>
  let mockHierarchy: jest.Mocked<Hierarchy>
  let migrator: WorkspaceMigrator

  const sourceWorkspace: WorkspaceIds = {
    uuid: 'source-uuid' as any,
    url: 'source-url',
    dataId: 'source-data-id' as any
  }

  const targetWorkspace: WorkspaceIds = {
    uuid: 'target-uuid' as any,
    url: 'target-url',
    dataId: 'target-data-id' as any
  }

  beforeEach(() => {
    // Mock MeasureContext
    mockContext = {
      newChild: jest.fn().mockReturnThis(),
      with: jest.fn().mockReturnThis(),
      end: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn()
    } as any

    // Mock LowLevelStorage
    const mockIterator = {
      next: jest.fn(),
      close: jest.fn()
    }
    mockLowLevelStorage = {
      traverse: jest.fn().mockResolvedValue(mockIterator),
      rawFindAll: jest.fn().mockResolvedValue([]),
      rawUpdate: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      clean: jest.fn()
    } as any

    // Mock Hierarchy
    mockHierarchy = {
      findDomain: jest.fn().mockReturnValue(DOMAIN_TX),
      isMixin: jest.fn().mockReturnValue(false),
      getAllAttributes: jest.fn().mockReturnValue(new Map()),
      isDerived: jest.fn().mockReturnValue(false),
      hasMixin: jest.fn()
    } as any

    // Mock source pipeline
    mockSourcePipeline = {
      context: {
        lowLevelStorage: mockLowLevelStorage,
        hierarchy: mockHierarchy
      },
      close: jest.fn()
    }

    // Mock PipelineFactory
    mockSourcePipelineFactory = jest.fn().mockImplementation(async (ctx: any, workspace: any) => mockSourcePipeline)

    // Mock TxOperations (target client)
    const emptyFindResult: any = []
    emptyFindResult.total = 0
    mockTargetClient = {
      findOne: jest.fn(),
      findAll: jest.fn().mockResolvedValue(emptyFindResult),
      createDoc: jest.fn().mockImplementation(async (cl, space, data, id) => id ?? ('generated-id' as any)),
      addCollection: jest.fn(),
      update: jest.fn(),
      getHierarchy: jest.fn().mockReturnValue(mockHierarchy)
    } as any

    // Mock StorageAdapter
    mockStorageAdapter = {
      stat: jest.fn(),
      read: jest.fn(),
      write: jest.fn(),
      put: jest.fn(),
      remove: jest.fn(),
      make: jest.fn(),
      delete: jest.fn(),
      close: jest.fn()
    } as any

    migrator = new WorkspaceMigrator(mockContext, mockSourcePipelineFactory, mockTargetClient, mockStorageAdapter)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  // Helper function to setup space mocks
  const setupSpaceMocks = (spaceId: Ref<Space> = 'space1' as Ref<Space>): Space => {
    const mockSpace: Space = {
      _id: spaceId,
      _class: 'core:class:Space' as Ref<Class<Space>>,
      space: spaceId,
      modifiedBy: 'user1' as any,
      modifiedOn: Date.now(),
      name: 'Test Space',
      description: '',
      private: false,
      archived: false,
      members: []
    }

    // Reset rawFindAll and use mockImplementation to handle different query patterns
    mockLowLevelStorage.rawFindAll.mockReset()
    mockLowLevelStorage.rawFindAll.mockImplementation(async (domain: any, query: any) => {
      // Query for all spaces (during migrateSpaces)
      if (query._class?.$ne !== undefined) {
        return [mockSpace]
      }
      // Query for specific space by ID (during getOrCreateTargetSpace)
      if (query._id !== undefined && query._id === spaceId) {
        return [mockSpace]
      }
      // Default: return empty array
      return []
    })

    // Reset and mock target client findAll using implementation
    mockTargetClient.findAll.mockReset()
    mockTargetClient.findAll.mockImplementation(async (_class: any, query: any) => {
      // Space existence check - space doesn't exist in target by default
      const result: any = []
      result.total = 0
      return result
    })

    return mockSpace
  }

  describe('migrate', () => {
    it('should successfully migrate documents in batches', async () => {
      const _class = 'test:class:Document' as Ref<Class<Doc>>

      const mockDocs: Doc[] = [
        {
          _id: 'doc1' as Ref<Doc>,
          _class,
          space: 'space1' as Ref<Space>,
          modifiedBy: 'user1' as any,
          modifiedOn: Date.now()
        },
        {
          _id: 'doc2' as Ref<Doc>,
          _class,
          space: 'space1' as Ref<Space>,
          modifiedBy: 'user1' as any,
          modifiedOn: Date.now()
        }
      ]

      // Setup iterator mock
      const mockIterator = {
        next: jest
          .fn()
          .mockResolvedValueOnce(mockDocs) // First batch
          .mockResolvedValueOnce([]), // No more documents
        close: jest.fn()
      }
      mockLowLevelStorage.traverse.mockResolvedValue(mockIterator as any)

      // Setup space mocks
      setupSpaceMocks()

      const options: MigrationOptions = {
        sourceWorkspace,
        targetWorkspace,
        sourceQuery: {},
        _class,
        conflictStrategy: 'duplicate',
        includeAttachments: false
      }

      const result = await migrator.migrate(options)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBe(2)
      expect(result.skippedCount).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(mockSourcePipelineFactory).toHaveBeenCalledWith(mockContext, sourceWorkspace, {}, null)
      expect(mockLowLevelStorage.traverse).toHaveBeenCalledWith(DOMAIN_TX, { _class, ...{} })
      expect(mockTargetClient.createDoc).toHaveBeenCalledTimes(3) // 1 space + 2 docs
      expect(mockSourcePipeline.close).toHaveBeenCalled()
    })

    it('should handle errors during migration', async () => {
      const _class = 'test:class:Document' as Ref<Class<Doc>>

      const mockDocs: Doc[] = [
        {
          _id: 'doc1' as Ref<Doc>,
          _class,
          space: 'space1' as Ref<Space>,
          modifiedBy: 'user1' as any,
          modifiedOn: Date.now()
        }
      ]

      const mockIterator = {
        next: jest.fn().mockResolvedValueOnce(mockDocs).mockResolvedValueOnce([]),
        close: jest.fn()
      }
      mockLowLevelStorage.traverse.mockResolvedValue(mockIterator as any)

      // Setup space mocks
      setupSpaceMocks()

      // Make createDoc throw an error (after space creation succeeds)
      mockTargetClient.createDoc
        .mockResolvedValueOnce('space1' as any) // Space creation
        .mockRejectedValueOnce(new Error('Database error')) // Document creation

      const options: MigrationOptions = {
        sourceWorkspace,
        targetWorkspace,
        sourceQuery: {},
        _class,
        conflictStrategy: 'duplicate',
        includeAttachments: false
      }

      const result = await migrator.migrate(options)

      expect(result.success).toBe(false)
      expect(result.migratedCount).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].docId).toBe('doc1')
      expect(result.errors[0].error).toBe('Database error')
    })

    it('should skip existing documents when conflictStrategy is skip', async () => {
      const _class = 'test:class:Document' as Ref<Class<Doc>>

      const mockDocs: Doc[] = [
        {
          _id: 'doc1' as Ref<Doc>,
          _class,
          space: 'space1' as Ref<Space>,
          modifiedBy: 'user1' as any,
          modifiedOn: Date.now()
        },
        {
          _id: 'doc2' as Ref<Doc>,
          _class,
          space: 'space1' as Ref<Space>,
          modifiedBy: 'user1' as any,
          modifiedOn: Date.now()
        }
      ]

      const mockIterator = {
        next: jest.fn().mockResolvedValueOnce(mockDocs).mockResolvedValueOnce([]),
        close: jest.fn()
      }
      mockLowLevelStorage.traverse.mockResolvedValue(mockIterator as any)

      // Setup space mocks
      setupSpaceMocks()

      // Override findAll to return doc1 as existing
      mockTargetClient.findAll.mockImplementation(async (cl: any, query: any) => {
        if (query._id?.$in !== undefined) {
          const result: any = [mockDocs[0]] // doc1 exists
          result.total = 1
          return result
        }
        const empty: any = []
        empty.total = 0
        return empty
      })

      const options: MigrationOptions = {
        sourceWorkspace,
        targetWorkspace,
        sourceQuery: {},
        _class,
        conflictStrategy: 'skip',
        includeAttachments: false
      }

      const result = await migrator.migrate(options)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBe(1) // Only doc2 migrated
      expect(mockTargetClient.findAll).toHaveBeenCalledWith(_class, { _id: { $in: ['doc1', 'doc2'] } })
      expect(mockTargetClient.createDoc).toHaveBeenCalledTimes(2) // 1 space + 1 doc
    })

    it('should handle mixin classes correctly', async () => {
      const _class = 'test:mixin:Special' as Ref<Class<Doc>>

      mockHierarchy.isMixin.mockReturnValue(true)

      const mockDocs: Doc[] = [
        {
          _id: 'doc1' as Ref<Doc>,
          _class: 'test:class:Base' as Ref<Class<Doc>>,
          space: 'space1' as Ref<Space>,
          modifiedBy: 'user1' as any,
          modifiedOn: Date.now()
        }
      ]

      const mockIterator = {
        next: jest.fn().mockResolvedValueOnce(mockDocs).mockResolvedValueOnce([]),
        close: jest.fn()
      }
      mockLowLevelStorage.traverse.mockResolvedValue(mockIterator as any)

      // Setup space mocks
      setupSpaceMocks()

      const options: MigrationOptions = {
        sourceWorkspace,
        targetWorkspace,
        sourceQuery: {},
        _class,
        conflictStrategy: 'duplicate',
        includeAttachments: false
      }

      await migrator.migrate(options)

      // Verify mixin query was built correctly
      expect(mockLowLevelStorage.traverse).toHaveBeenCalledWith(DOMAIN_TX, { [_class]: { $exists: true }, ...{} })
    })

    it('should throw error when domain not found', async () => {
      const _class = 'test:class:Unknown' as Ref<Class<Doc>>

      mockHierarchy.findDomain.mockReturnValue(undefined)

      const options: MigrationOptions = {
        sourceWorkspace,
        targetWorkspace,
        sourceQuery: {},
        _class,
        conflictStrategy: 'duplicate',
        includeAttachments: false
      }

      const result = await migrator.migrate(options)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('Domain not found')
    })

    it('should throw error when lowLevelStorage not available', async () => {
      const _class = 'test:class:Document' as Ref<Class<Doc>>

      // Mock pipeline without lowLevelStorage
      mockSourcePipeline.context.lowLevelStorage = undefined

      const options: MigrationOptions = {
        sourceWorkspace,
        targetWorkspace,
        sourceQuery: {},
        _class,
        conflictStrategy: 'duplicate',
        includeAttachments: false
      }

      const result = await migrator.migrate(options)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toBe('Low level storage not available')
    })
  })

  describe('migrateDocument', () => {
    it('should handle attached documents correctly', async () => {
      const _class = 'test:class:Comment' as Ref<Class<Doc>>

      mockHierarchy.isDerived.mockReturnValue(true) // Is AttachedDoc

      const mockDoc: AttachedDoc = {
        _id: 'comment1' as Ref<AttachedDoc>,
        _class,
        space: 'space1' as Ref<Space>,
        modifiedBy: 'user1' as any,
        modifiedOn: Date.now(),
        attachedTo: 'parent1' as Ref<Doc>,
        attachedToClass: 'test:class:Task' as Ref<Class<Doc>>,
        collection: 'comments'
      }

      const mockIterator = {
        next: jest.fn().mockResolvedValueOnce([mockDoc]).mockResolvedValueOnce([]),
        close: jest.fn()
      }
      mockLowLevelStorage.traverse.mockResolvedValue(mockIterator as any)

      // Setup space mocks
      setupSpaceMocks()

      const options: MigrationOptions = {
        sourceWorkspace,
        targetWorkspace,
        sourceQuery: {},
        _class,
        conflictStrategy: 'duplicate',
        includeAttachments: false
      }

      await migrator.migrate(options)

      expect(mockTargetClient.addCollection).toHaveBeenCalled()
      // createDoc is called once for space creation
      expect(mockTargetClient.createDoc).toHaveBeenCalledTimes(1)
    })
  })

  describe('migrateAttachments', () => {
    it('should skip migration when no attachment mixin', async () => {
      const _class = 'test:class:Document' as Ref<Class<Doc>>

      mockHierarchy.hasMixin.mockReturnValue(false as any)

      const mockDoc: Doc = {
        _id: 'doc1' as Ref<Doc>,
        _class,
        space: 'space1' as Ref<Space>,
        modifiedBy: 'user1' as any,
        modifiedOn: Date.now()
      }

      const mockIterator = {
        next: jest.fn().mockResolvedValueOnce([mockDoc]).mockResolvedValueOnce([]),
        close: jest.fn()
      }
      mockLowLevelStorage.traverse.mockResolvedValue(mockIterator as any)

      // Setup space mocks
      setupSpaceMocks()

      const options: MigrationOptions = {
        sourceWorkspace,
        targetWorkspace,
        sourceQuery: {},
        _class,
        conflictStrategy: 'duplicate',
        includeAttachments: true
      }

      await migrator.migrate(options)

      // Since hasMixin returns false, attachments won't be migrated
      // We verify that migration completed and document was created
      expect(mockTargetClient.createDoc).toHaveBeenCalled()
    })

    it('should migrate attachments when present', async () => {
      const _class = 'test:class:Document' as Ref<Class<Doc>>

      mockHierarchy.hasMixin.mockReturnValue(true)

      const mockDoc: Doc = {
        _id: 'doc1' as Ref<Doc>,
        _class,
        space: 'space1' as Ref<Space>,
        modifiedBy: 'user1' as any,
        modifiedOn: Date.now()
      }

      const mockAttachment: Doc = {
        _id: 'attachment1' as Ref<Doc>,
        _class: 'attachment:class:Attachment' as Ref<Class<Doc>>,
        space: 'space1' as Ref<Space>,
        modifiedBy: 'user1' as any,
        modifiedOn: Date.now()
      }

      const mockIterator = {
        next: jest.fn().mockResolvedValueOnce([mockDoc]).mockResolvedValueOnce([]),
        close: jest.fn()
      }
      mockLowLevelStorage.traverse.mockResolvedValue(mockIterator as any)

      // Setup space mocks
      const mockSpace = setupSpaceMocks()

      // Override rawFindAll to handle attachment queries
      mockLowLevelStorage.rawFindAll.mockImplementation(async (domain: any, query: any) => {
        if (query._class?.$ne !== undefined) return [mockSpace]
        if (query._id !== undefined && query._id === 'space1') return [mockSpace]
        if (query._class === 'attachment:class:Attachment' && query.attachedTo === 'doc1') {
          return [mockAttachment]
        }
        return []
      })

      const options: MigrationOptions = {
        sourceWorkspace,
        targetWorkspace,
        sourceQuery: {},
        _class,
        conflictStrategy: 'duplicate',
        includeAttachments: true
      }

      await migrator.migrate(options)

      expect(mockLowLevelStorage.rawFindAll).toHaveBeenCalledWith(
        DOMAIN_TX,
        expect.objectContaining({
          _class: 'attachment:class:Attachment',
          attachedTo: 'doc1'
        })
      )
      expect(mockTargetClient.addCollection).toHaveBeenCalled()
    })
  })

  describe('migrateCollections', () => {
    it('should migrate collection items', async () => {
      const _class = 'test:class:Task' as Ref<Class<Doc>>

      const mockAttributes = new Map([
        [
          'comments',
          {
            name: 'comments',
            type: { _class: 'core:class:Collection' as any, of: 'test:class:Comment' as any },
            attributeOf: _class
          }
        ]
      ])
      mockHierarchy.getAllAttributes.mockReturnValue(mockAttributes as any)

      const mockDoc: Doc = {
        _id: 'task1' as Ref<Doc>,
        _class,
        space: 'space1' as Ref<Space>,
        modifiedBy: 'user1' as any,
        modifiedOn: Date.now()
      }

      const mockComment: AttachedDoc = {
        _id: 'comment1' as Ref<AttachedDoc>,
        _class: 'test:class:Comment' as Ref<Class<Doc>>,
        space: 'space1' as Ref<Space>,
        modifiedBy: 'user1' as any,
        modifiedOn: Date.now(),
        attachedTo: 'task1' as Ref<Doc>,
        attachedToClass: _class,
        collection: 'comments'
      }

      const mockIterator = {
        next: jest.fn().mockResolvedValueOnce([mockDoc]).mockResolvedValueOnce([]),
        close: jest.fn()
      }
      mockLowLevelStorage.traverse.mockResolvedValue(mockIterator as any)

      // Setup space mocks
      const mockSpace = setupSpaceMocks()

      // Override rawFindAll to handle collection queries
      mockLowLevelStorage.rawFindAll.mockImplementation(async (domain: any, query: any) => {
        if (query._class?.$ne !== undefined) return [mockSpace]
        if (query._id !== undefined && query._id === 'space1') return [mockSpace]
        if (query._class === 'test:class:Comment' && query.attachedTo === 'task1') {
          return [mockComment]
        }
        return []
      })

      const options: MigrationOptions = {
        sourceWorkspace,
        targetWorkspace,
        sourceQuery: {},
        _class,
        conflictStrategy: 'duplicate',
        includeAttachments: false
      }

      await migrator.migrate(options)

      expect(mockLowLevelStorage.rawFindAll).toHaveBeenCalledWith(
        DOMAIN_TX,
        expect.objectContaining({
          _class: 'test:class:Comment',
          attachedTo: 'task1',
          attachedToClass: _class,
          collection: 'comments'
        })
      )
    })
  })

  describe('bulk operations', () => {
    it('should query existing documents in bulk with skip strategy', async () => {
      const _class = 'test:class:Document' as Ref<Class<Doc>>

      const mockDocs: Doc[] = Array.from({ length: 50 }, (_, i) => ({
        _id: `doc${i}` as Ref<Doc>,
        _class,
        space: 'space1' as Ref<Space>,
        modifiedBy: 'user1' as any,
        modifiedOn: Date.now()
      }))

      const mockIterator = {
        next: jest.fn().mockResolvedValueOnce(mockDocs).mockResolvedValueOnce([]),
        close: jest.fn()
      }
      mockLowLevelStorage.traverse.mockResolvedValue(mockIterator as any)

      // Setup space mocks
      setupSpaceMocks()

      // Override findAll to return first 10 as existing
      mockTargetClient.findAll.mockImplementation(async (cl: any, query: any) => {
        if (query._id?.$in !== undefined) {
          const result: any = mockDocs.slice(0, 10) // First 10 exist
          result.total = 10
          return result
        }
        const empty: any = []
        empty.total = 0
        return empty
      })

      const options: MigrationOptions = {
        sourceWorkspace,
        targetWorkspace,
        sourceQuery: {},
        _class,
        conflictStrategy: 'skip',
        includeAttachments: false
      }

      const result = await migrator.migrate(options)

      expect(result.migratedCount).toBe(40) // 50 - 10 skipped
      expect(mockTargetClient.findAll).toHaveBeenCalledTimes(2) // 1 for space + 1 for bulk docs
      expect(mockTargetClient.findAll).toHaveBeenCalledWith(_class, { _id: { $in: mockDocs.map((d) => d._id) } })
    })

    it('should not query existing documents with duplicate strategy', async () => {
      const _class = 'test:class:Document' as Ref<Class<Doc>>

      const mockDocs: Doc[] = [
        {
          _id: 'doc1' as Ref<Doc>,
          _class,
          space: 'space1' as Ref<Space>,
          modifiedBy: 'user1' as any,
          modifiedOn: Date.now()
        }
      ]

      const mockIterator = {
        next: jest.fn().mockResolvedValueOnce(mockDocs).mockResolvedValueOnce([]),
        close: jest.fn()
      }
      mockLowLevelStorage.traverse.mockResolvedValue(mockIterator as any)

      // Setup space mocks
      setupSpaceMocks()

      const options: MigrationOptions = {
        sourceWorkspace,
        targetWorkspace,
        sourceQuery: {},
        _class,
        conflictStrategy: 'duplicate',
        includeAttachments: false
      }

      await migrator.migrate(options)

      // findAll should only be called once for space check, not for document existence check
      expect(mockTargetClient.findAll).toHaveBeenCalledTimes(1) // Only for space check
    })
  })

  describe('mapper function', () => {
    it('should apply mapper function to transform documents', async () => {
      const _class = 'documents:class:ControlledDocument' as Ref<Class<Doc>>

      const mockDoc: Doc & { status: string } = {
        _id: 'doc1' as any,
        _class,
        space: 'space1' as Ref<Space>,
        modifiedBy: 'user1' as any,
        modifiedOn: Date.now(),
        status: 'approved'
      }

      const mockIterator = {
        next: jest.fn().mockResolvedValueOnce([mockDoc]).mockResolvedValueOnce([]),
        close: jest.fn()
      }
      mockLowLevelStorage.traverse.mockResolvedValue(mockIterator as any)

      // Setup space mocks
      setupSpaceMocks()

      // Mapper function that sets status to draft
      const mapper = jest.fn((doc: Doc) => ({
        ...doc,
        status: 'draft'
      }))

      const options: MigrationOptions = {
        sourceWorkspace,
        targetWorkspace,
        sourceQuery: {},
        _class,
        conflictStrategy: 'duplicate',
        includeAttachments: false,
        mapper
      }

      await migrator.migrate(options)

      // Verify mapper was called
      expect(mapper).toHaveBeenCalledTimes(1)
      expect(mapper).toHaveBeenCalledWith(mockDoc)

      // Verify createDoc was called (with transformed document data)
      expect(mockTargetClient.createDoc).toHaveBeenCalled()
    })

    it('should handle async mapper function', async () => {
      const _class = 'documents:class:ControlledDocument' as Ref<Class<Doc>>

      const mockDoc: Doc & { title: string } = {
        _id: 'doc1' as any,
        _class,
        space: 'space1' as Ref<Space>,
        modifiedBy: 'user1' as any,
        modifiedOn: Date.now(),
        title: 'Original Title'
      }

      const mockIterator = {
        next: jest.fn().mockResolvedValueOnce([mockDoc]).mockResolvedValueOnce([]),
        close: jest.fn()
      }
      mockLowLevelStorage.traverse.mockResolvedValue(mockIterator as any)

      // Setup space mocks
      setupSpaceMocks()

      // Async mapper function that transforms the document
      const mapper = jest.fn(async (doc: Doc) => {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 1))
        return {
          ...doc,
          title: 'Modified Title',
          migrated: true
        }
      })

      const options: MigrationOptions = {
        sourceWorkspace,
        targetWorkspace,
        sourceQuery: {},
        _class,
        conflictStrategy: 'duplicate',
        includeAttachments: false,
        mapper
      }

      const result = await migrator.migrate(options)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBe(1)
      expect(mapper).toHaveBeenCalledTimes(1)
      expect(mapper).toHaveBeenCalledWith(mockDoc)
    })

    it('should handle mapper errors gracefully', async () => {
      const _class = 'test:class:Document' as Ref<Class<Doc>>

      const mockDoc: Doc = {
        _id: 'doc1' as Ref<Doc>,
        _class,
        space: 'space1' as Ref<Space>,
        modifiedBy: 'user1' as any,
        modifiedOn: Date.now()
      }

      const mockIterator = {
        next: jest.fn().mockResolvedValueOnce([mockDoc]).mockResolvedValueOnce([]),
        close: jest.fn()
      }
      mockLowLevelStorage.traverse.mockResolvedValue(mockIterator as any)

      // Setup space mocks
      setupSpaceMocks()

      // Mapper that throws an error
      const mapper = jest.fn(() => {
        throw new Error('Mapper transformation failed')
      })

      const options: MigrationOptions = {
        sourceWorkspace,
        targetWorkspace,
        sourceQuery: {},
        _class,
        conflictStrategy: 'duplicate',
        includeAttachments: false,
        mapper
      }

      const result = await migrator.migrate(options)

      expect(result.success).toBe(false)
      expect(result.migratedCount).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toBe('Mapper transformation failed')
      expect(mapper).toHaveBeenCalledTimes(1)
    })

    it('should work without mapper function', async () => {
      const _class = 'test:class:Document' as Ref<Class<Doc>>

      const mockDoc: Doc = {
        _id: 'doc1' as Ref<Doc>,
        _class,
        space: 'space1' as Ref<Space>,
        modifiedBy: 'user1' as any,
        modifiedOn: Date.now()
      }

      const mockIterator = {
        next: jest.fn().mockResolvedValueOnce([mockDoc]).mockResolvedValueOnce([]),
        close: jest.fn()
      }
      mockLowLevelStorage.traverse.mockResolvedValue(mockIterator as any)

      // Setup space mocks
      setupSpaceMocks()

      const options: MigrationOptions = {
        sourceWorkspace,
        targetWorkspace,
        sourceQuery: {},
        _class,
        conflictStrategy: 'duplicate',
        includeAttachments: false
        // No mapper provided
      }

      const result = await migrator.migrate(options)

      expect(result.success).toBe(true)
      expect(result.migratedCount).toBe(1)
      expect(mockTargetClient.createDoc).toHaveBeenCalled()
    })
  })
})
