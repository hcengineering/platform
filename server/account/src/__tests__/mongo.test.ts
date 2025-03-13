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
import { Collection, Db } from 'mongodb'
import {
  type WorkspaceMode,
  type WorkspaceUuid,
  type PersonUuid,
  SocialIdType,
  AccountRole,
  type Version,
  type Data
} from '@hcengineering/core'
import {
  MongoDbCollection,
  AccountMongoDbCollection,
  SocialIdMongoDbCollection,
  WorkspaceStatusMongoDbCollection,
  MongoAccountDB
} from '../collections/mongo'
import { WorkspaceInfoWithStatus, WorkspaceStatus } from '../types'

interface TestWorkspace {
  _id?: string
  uuid: WorkspaceUuid
  mode: WorkspaceMode
  name: string
  processingAttempts?: number
  lastProcessingTime?: number
}

describe('MongoDbCollection', () => {
  let mockCollection: Partial<Collection<TestWorkspace>>
  let mockDb: Partial<Db>
  let collection: MongoDbCollection<TestWorkspace, 'uuid'>

  beforeEach(() => {
    mockCollection = {
      find: jest.fn(),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteMany: jest.fn(),
      createIndex: jest.fn(),
      dropIndex: jest.fn(),
      listIndexes: jest.fn()
    }

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection)
    }

    collection = new MongoDbCollection<TestWorkspace, 'uuid'>('workspace', mockDb as Db, 'uuid')
  })

  describe('find', () => {
    it('should find documents and remove _id field', async () => {
      const mockDocs = [
        { _id: 'id1', uuid: 'ws1' as WorkspaceUuid, mode: 'active' as const, name: 'Workspace 1' },
        { _id: 'id2', uuid: 'ws2' as WorkspaceUuid, mode: 'active' as const, name: 'Workspace 2' }
      ]

      // Define type for our mock cursor
      interface MockCursor {
        sort: jest.Mock
        limit: jest.Mock
        map: jest.Mock
        toArray: jest.Mock
        transform?: (doc: any) => any
      }

      // Create a mock cursor that properly implements the map functionality
      const mockCursor: MockCursor = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        map: jest.fn().mockImplementation(function (this: MockCursor, callback) {
          this.transform = callback
          return this
        }),
        toArray: jest.fn().mockImplementation(function (this: MockCursor) {
          return Promise.resolve(this.transform != null ? mockDocs.map(this.transform) : mockDocs)
        })
      }

      ;(mockCollection.find as jest.Mock).mockReturnValue(mockCursor)

      const result = await collection.find({ mode: 'active' as const })

      expect(mockCollection.find).toHaveBeenCalledWith({ mode: 'active' })
      expect(result).toEqual([
        { uuid: 'ws1' as WorkspaceUuid, mode: 'active' as const, name: 'Workspace 1' },
        { uuid: 'ws2' as WorkspaceUuid, mode: 'active' as const, name: 'Workspace 2' }
      ])
    })

    it('should apply sort and limit', async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
        map: jest.fn().mockReturnThis()
      }
      ;(mockCollection.find as jest.Mock).mockReturnValue(mockFind)

      await collection.find({ mode: 'active' as const }, { name: 'ascending', processingAttempts: 'descending' }, 10)

      expect(mockFind.sort).toHaveBeenCalledWith({
        name: 'ascending',
        processingAttempts: 'descending'
      })
      expect(mockFind.limit).toHaveBeenCalledWith(10)
    })
  })

  describe('findOne', () => {
    it('should find single document and remove _id field', async () => {
      const mockDoc = {
        _id: 'id1',
        uuid: 'ws1' as WorkspaceUuid,
        mode: 'active' as const,
        name: 'Workspace 1'
      }
      const expectedDoc = { ...mockDoc }
      delete (expectedDoc as any)._id
      ;(mockCollection.findOne as jest.Mock).mockResolvedValue(mockDoc)

      const result = await collection.findOne({ uuid: 'ws1' as WorkspaceUuid })

      expect(mockCollection.findOne).toHaveBeenCalledWith({ uuid: 'ws1' })
      expect(result).toEqual(expectedDoc)
    })
  })

  describe('insertOne', () => {
    it('should insert document with generated UUID', async () => {
      const doc = {
        mode: 'pending-creation' as const,
        name: 'New Workspace'
      }

      await collection.insertOne(doc)

      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'pending-creation',
          name: 'New Workspace'
        })
      )

      // Get the actual document passed to insertOne
      const insertedDoc = (mockCollection.insertOne as jest.Mock).mock.calls[0][0]

      // Check that uuid was generated
      expect(insertedDoc.uuid).toBeDefined()
      // Check that _id matches uuid
      expect(insertedDoc._id).toBe(insertedDoc.uuid)
    })

    it('should use provided UUID if available', async () => {
      const doc = {
        uuid: 'custom-uuid' as WorkspaceUuid,
        mode: 'pending-creation' as const,
        name: 'New Workspace'
      }

      await collection.insertOne(doc)

      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        ...doc,
        _id: 'custom-uuid'
      })
    })
  })

  describe('updateOne', () => {
    it('should handle simple field updates', async () => {
      await collection.updateOne({ uuid: 'ws1' as WorkspaceUuid }, { mode: 'creating' as const })

      expect(mockCollection.updateOne).toHaveBeenCalledWith({ uuid: 'ws1' }, { $set: { mode: 'creating' } })
    })

    it('should handle increment operations', async () => {
      await collection.updateOne(
        { uuid: 'ws1' as WorkspaceUuid },
        {
          $inc: { processingAttempts: 1 },
          mode: 'upgrading' as const
        }
      )

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { uuid: 'ws1' },
        {
          $inc: { processingAttempts: 1 },
          $set: { mode: 'upgrading' }
        }
      )
    })
  })

  describe('deleteMany', () => {
    it('should delete documents matching query', async () => {
      await collection.deleteMany({ mode: 'deleted' as const })

      expect(mockCollection.deleteMany).toHaveBeenCalledWith({ mode: 'deleted' })
    })
  })

  describe('ensureIndices', () => {
    it('should create new indices', async () => {
      ;(mockCollection.listIndexes as jest.Mock).mockReturnValue({
        toArray: jest.fn().mockResolvedValue([{ key: { _id: 1 }, name: '_id_' }])
      })

      const indices = [
        {
          key: { uuid: 1 },
          options: { unique: true, name: 'uuid_1' }
        },
        {
          key: { mode: 1 },
          options: { name: 'mode_1' }
        }
      ]

      await collection.ensureIndices(indices)

      expect(mockCollection.createIndex).toHaveBeenCalledTimes(2)
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ uuid: 1 }, { unique: true, name: 'uuid_1' })
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ mode: 1 }, { name: 'mode_1' })
    })

    it('should drop unused indices', async () => {
      ;(mockCollection.listIndexes as jest.Mock).mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          { key: { _id: 1 }, name: '_id_' },
          { key: { oldField: 1 }, name: 'oldField_1' }
        ])
      })

      const indices = [
        {
          key: { uuid: 1 },
          options: { unique: true, name: 'uuid_1' }
        }
      ]

      await collection.ensureIndices(indices)

      expect(mockCollection.dropIndex).toHaveBeenCalledWith('oldField_1')
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ uuid: 1 }, { unique: true, name: 'uuid_1' })
    })
  })
})

describe('AccountMongoDbCollection', () => {
  let mockCollection: any
  let mockDb: any
  let collection: AccountMongoDbCollection

  beforeEach(() => {
    mockCollection = {
      find: jest.fn(),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn()
    }

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection)
    }

    collection = new AccountMongoDbCollection(mockDb)
  })

  describe('find', () => {
    // Define type for our mock cursor
    interface MockCursor {
      sort: jest.Mock
      limit: jest.Mock
      map: jest.Mock
      toArray: jest.Mock
      transform?: (doc: any) => any
    }

    it('should convert Buffer fields in found documents', async () => {
      const mockDocs = [
        {
          _id: 'id1',
          uuid: 'acc1' as PersonUuid,
          hash: { buffer: new Uint8Array([1, 2, 3]) },
          salt: { buffer: new Uint8Array([4, 5, 6]) }
        }
      ]

      const mockCursor: MockCursor = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        map: jest.fn().mockImplementation(function (this: MockCursor, callback) {
          this.transform = callback
          return this
        }),
        toArray: jest.fn().mockImplementation(function (this: MockCursor) {
          return Promise.resolve(this.transform != null ? mockDocs.map(this.transform) : mockDocs)
        })
      }

      mockCollection.find.mockReturnValue(mockCursor)

      const results = await collection.find({ uuid: 'acc1' as PersonUuid })

      expect(results[0].hash).toBeInstanceOf(Buffer)
      expect(results[0].salt).toBeInstanceOf(Buffer)
      expect(Buffer.from(results[0].hash as any).toString('hex')).toBe(Buffer.from([1, 2, 3]).toString('hex'))
      expect(Buffer.from(results[0].salt as any).toString('hex')).toBe(Buffer.from([4, 5, 6]).toString('hex'))
    })

    it('should handle null hash and salt in found documents', async () => {
      const mockDocs = [
        {
          _id: 'id1',
          uuid: 'acc1' as PersonUuid,
          hash: null,
          salt: null
        }
      ]

      const mockCursor: MockCursor = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        map: jest.fn().mockImplementation(function (this: MockCursor, callback) {
          this.transform = callback
          return this
        }),
        toArray: jest.fn().mockImplementation(function (this: MockCursor) {
          return Promise.resolve(this.transform != null ? mockDocs.map(this.transform) : mockDocs)
        })
      }

      mockCollection.find.mockReturnValue(mockCursor)

      const results = await collection.find({ uuid: 'acc1' as PersonUuid })

      expect(results[0].hash).toBeNull()
      expect(results[0].salt).toBeNull()
    })
  })

  describe('findOne', () => {
    it('should convert Buffer fields in found document', async () => {
      const mockDoc = {
        _id: 'id1',
        uuid: 'acc1' as PersonUuid,
        hash: { buffer: new Uint8Array([1, 2, 3]) },
        salt: { buffer: new Uint8Array([4, 5, 6]) }
      }

      mockCollection.findOne.mockResolvedValue(mockDoc)

      const result = await collection.findOne({ uuid: 'acc1' as PersonUuid })

      expect(result?.hash).toBeInstanceOf(Buffer)
      expect(result?.salt).toBeInstanceOf(Buffer)
      expect(Buffer.from(result?.hash as any).toString('hex')).toBe(Buffer.from([1, 2, 3]).toString('hex'))
      expect(Buffer.from(result?.salt as any).toString('hex')).toBe(Buffer.from([4, 5, 6]).toString('hex'))
    })

    it('should handle null hash and salt in found document', async () => {
      const mockDoc = {
        _id: 'id1',
        uuid: 'acc1' as PersonUuid,
        hash: null,
        salt: null
      }

      mockCollection.findOne.mockResolvedValue(mockDoc)

      const result = await collection.findOne({ uuid: 'acc1' as PersonUuid })

      expect(result?.hash).toBeNull()
      expect(result?.salt).toBeNull()
    })

    it('should handle null result', async () => {
      mockCollection.findOne.mockResolvedValue(null)

      const result = await collection.findOne({ uuid: 'non-existent' as PersonUuid })

      expect(result).toBeNull()
    })
  })
})

describe('SocialIdMongoDbCollection', () => {
  let mockCollection: any
  let mockDb: any
  let collection: SocialIdMongoDbCollection

  beforeEach(() => {
    mockCollection = {
      insertOne: jest.fn()
    }

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection)
    }

    collection = new SocialIdMongoDbCollection(mockDb)
  })

  describe('insertOne', () => {
    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should throw error if type is missing', async () => {
      const socialId = {
        value: 'test@example.com',
        personUuid: 'person1' as PersonUuid
      }

      await expect(collection.insertOne(socialId)).rejects.toThrow('Type and value are required')
    })

    it('should throw error if value is missing', async () => {
      const socialId = {
        type: SocialIdType.EMAIL,
        personUuid: 'person1' as PersonUuid
      }

      await expect(collection.insertOne(socialId)).rejects.toThrow('Type and value are required')
    })

    it('should generate key', async () => {
      const socialId = {
        type: SocialIdType.EMAIL,
        value: 'test@example.com',
        personUuid: 'person1' as PersonUuid
      }

      await collection.insertOne(socialId)

      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          ...socialId,
          key: 'email:test@example.com'
        })
      )
    })
  })
})

describe('WorkspaceStatusMongoDbCollection', () => {
  let mockWsCollection: MongoDbCollection<WorkspaceInfoWithStatus, 'uuid'>
  let wsStatusCollection: WorkspaceStatusMongoDbCollection

  beforeEach(() => {
    mockWsCollection = {
      find: jest.fn(),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteMany: jest.fn()
    } as any

    wsStatusCollection = new WorkspaceStatusMongoDbCollection(mockWsCollection)
  })

  describe('find', () => {
    it('should transform query and return status results', async () => {
      const mockWorkspaces = [
        {
          uuid: 'ws1',
          status: {
            mode: 'active',
            versionMajor: 1,
            versionMinor: 0,
            versionPatch: 0,
            isDisabled: false
          }
        }
      ]

      ;(mockWsCollection.find as jest.Mock).mockResolvedValue(mockWorkspaces)

      const query: Partial<WorkspaceStatus> = {
        workspaceUuid: 'ws1' as WorkspaceUuid,
        mode: 'active'
      }

      const result = await wsStatusCollection.find(query)

      expect(mockWsCollection.find).toHaveBeenCalledWith(
        {
          uuid: 'ws1',
          status: {
            mode: 'active'
          }
        },
        undefined,
        undefined
      )

      expect(result).toEqual([
        {
          workspaceUuid: 'ws1' as WorkspaceUuid,
          mode: 'active',
          versionMajor: 1,
          versionMinor: 0,
          versionPatch: 0,
          isDisabled: false
        }
      ])
    })
  })

  describe('updateOne', () => {
    it('should transform operations correctly', async () => {
      const query = { workspaceUuid: 'ws1' as WorkspaceUuid }
      const ops = {
        $inc: { processingAttempts: 1 },
        $set: { mode: 'active' as const }
      }

      await wsStatusCollection.updateOne(query, ops)

      expect(mockWsCollection.updateOne).toHaveBeenCalledWith(
        { uuid: 'ws1' },
        {
          $inc: { 'status.processingAttempts': 1 },
          'status.mode': 'active'
        }
      )
    })

    it('should handle direct field updates', async () => {
      const query = { workspaceUuid: 'ws1' as WorkspaceUuid }
      const ops = {
        mode: 'active' as const,
        isDisabled: true,
        processingProgress: 75
      }

      await wsStatusCollection.updateOne(query, ops)

      expect(mockWsCollection.updateOne).toHaveBeenCalledWith(
        { uuid: 'ws1' },
        {
          'status.mode': 'active',
          'status.isDisabled': true,
          'status.processingProgress': 75
        }
      )
    })

    it('should handle complex query operators', async () => {
      const query = {
        workspaceUuid: 'ws1' as WorkspaceUuid,
        mode: { $in: ['active' as const, 'creating' as const] },
        processingProgress: { $lt: 50 },
        processingAttempts: { $gte: 3 }
      }

      const ops = {
        mode: 'active' as const
      }

      await wsStatusCollection.updateOne(query, ops)

      expect(mockWsCollection.updateOne).toHaveBeenCalledWith(
        {
          uuid: 'ws1',
          status: {
            mode: { $in: ['active', 'creating'] },
            processingProgress: { $lt: 50 },
            processingAttempts: { $gte: 3 }
          }
        },
        {
          'status.mode': 'active'
        }
      )
    })

    it('should handle mixed operations and complex queries', async () => {
      const query = {
        workspaceUuid: 'ws1' as WorkspaceUuid,
        mode: { $in: ['active' as const, 'creating' as const] }
      }

      const ops = {
        $inc: {
          processingAttempts: 1,
          processingProgress: 10
        },
        $set: {
          mode: 'active' as const,
          lastProcessingTime: 123456
        },
        isDisabled: true
      }

      await wsStatusCollection.updateOne(query, ops)

      expect(mockWsCollection.updateOne).toHaveBeenCalledWith(
        {
          uuid: 'ws1',
          status: {
            mode: { $in: ['active', 'creating'] }
          }
        },
        {
          $inc: {
            'status.processingAttempts': 1,
            'status.processingProgress': 10
          },
          'status.mode': 'active',
          'status.lastProcessingTime': 123456,
          'status.isDisabled': true
        }
      )
    })
  })

  describe('updateOne', () => {
    it('should transform operations correctly', async () => {
      const query = { workspaceUuid: 'ws1' as WorkspaceUuid }
      const ops = {
        $inc: { processingAttempts: 1 },
        $set: { mode: 'active' as const }
      }

      await wsStatusCollection.updateOne(query, ops)

      expect(mockWsCollection.updateOne).toHaveBeenCalledWith(
        { uuid: 'ws1' },
        {
          $inc: { 'status.processingAttempts': 1 },
          'status.mode': 'active'
        }
      )
    })
  })

  describe('deleteMany', () => {
    it('should transform query for deletion', async () => {
      const query = { workspaceUuid: 'ws1' as WorkspaceUuid, mode: 'active' as const }

      await wsStatusCollection.deleteMany(query)

      expect(mockWsCollection.deleteMany).toHaveBeenCalledWith({
        uuid: 'ws1',
        status: {
          mode: 'active'
        }
      })
    })
  })
})

describe('MongoAccountDB', () => {
  let mockDb: any
  let accountDb: MongoAccountDB
  let mockSocialId: any
  let mockAccount: any
  let mockWorkspace: any
  let mockWorkspaceMembers: any
  let mockWorkspaceStatus: any
  let mockMigration: any

  beforeEach(() => {
    mockDb = {}

    // Create mock collections with jest.fn()
    mockAccount = {
      updateOne: jest.fn(),
      ensureIndices: jest.fn()
    }

    mockSocialId = {
      find: jest.fn().mockResolvedValue([]),
      findCursor: jest.fn(() => ({
        hasNext: jest.fn().mockReturnValue(false),
        close: jest.fn()
      })),
      updateOne: jest.fn()
    }

    mockWorkspace = {
      updateOne: jest.fn(),
      insertOne: jest.fn(),
      find: jest.fn(),
      ensureIndices: jest.fn(),
      collection: {
        findOneAndUpdate: jest.fn()
      }
    }

    mockWorkspaceMembers = {
      insertOne: jest.fn(),
      deleteMany: jest.fn(),
      updateOne: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      ensureIndices: jest.fn()
    }

    mockWorkspaceStatus = {
      insertOne: jest.fn()
    }

    mockMigration = {
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      findOne: jest.fn()
    }

    accountDb = new MongoAccountDB(mockDb)

    // Override the getters to return our mocks
    Object.defineProperties(accountDb, {
      account: { get: () => mockAccount },
      socialId: { get: () => mockSocialId },
      workspace: { get: () => mockWorkspace },
      workspaceMembers: { get: () => mockWorkspaceMembers },
      workspaceStatus: { get: () => mockWorkspaceStatus },
      migration: { get: () => mockMigration }
    })
  })

  describe('init', () => {
    it('should create required indices', async () => {
      await accountDb.init()

      // Verify account indices
      expect(accountDb.account.ensureIndices).toHaveBeenCalledWith([
        {
          key: { uuid: 1 },
          options: { unique: true, name: 'hc_account_account_uuid_1' }
        }
      ])

      // Verify workspace indices
      expect(accountDb.workspace.ensureIndices).toHaveBeenCalledWith([
        {
          key: { uuid: 1 },
          options: {
            unique: true,
            name: 'hc_account_workspace_uuid_1'
          }
        },
        {
          key: { url: 1 },
          options: {
            unique: true,
            name: 'hc_account_workspace_url_1'
          }
        }
      ])

      // Verify workspace members indices
      expect(accountDb.workspaceMembers.ensureIndices).toHaveBeenCalledWith([
        {
          key: { workspaceUuid: 1 },
          options: {
            name: 'hc_account_workspace_members_workspace_uuid_1'
          }
        },
        {
          key: { accountUuid: 1 },
          options: {
            name: 'hc_account_workspace_members_account_uuid_1'
          }
        }
      ])
    })
  })

  describe('workspace operations', () => {
    const accountId = 'acc1' as PersonUuid
    const workspaceId = 'ws1' as WorkspaceUuid
    const role = AccountRole.Owner

    describe('assignWorkspace', () => {
      it('should insert workspace member', async () => {
        await accountDb.assignWorkspace(accountId, workspaceId, role)

        expect(accountDb.workspaceMembers.insertOne).toHaveBeenCalledWith({
          workspaceUuid: workspaceId,
          accountUuid: accountId,
          role
        })
      })
    })

    describe('unassignWorkspace', () => {
      it('should delete workspace member', async () => {
        await accountDb.unassignWorkspace(accountId, workspaceId)

        expect(accountDb.workspaceMembers.deleteMany).toHaveBeenCalledWith({
          workspaceUuid: workspaceId,
          accountUuid: accountId
        })
      })
    })

    describe('updateWorkspaceRole', () => {
      it('should update member role', async () => {
        await accountDb.updateWorkspaceRole(accountId, workspaceId, role)

        expect(accountDb.workspaceMembers.updateOne).toHaveBeenCalledWith(
          {
            workspaceUuid: workspaceId,
            accountUuid: accountId
          },
          { role }
        )
      })
    })

    describe('getWorkspaceRole', () => {
      it('should return role when member exists', async () => {
        ;(accountDb.workspaceMembers.findOne as jest.Mock).mockResolvedValue({ role })

        const result = await accountDb.getWorkspaceRole(accountId, workspaceId)

        expect(result).toBe(role)
      })

      it('should return null when member does not exist', async () => {
        ;(accountDb.workspaceMembers.findOne as jest.Mock).mockResolvedValue(null)

        const result = await accountDb.getWorkspaceRole(accountId, workspaceId)

        expect(result).toBeNull()
      })
    })

    describe('getWorkspaceMembers', () => {
      it('should return mapped member info', async () => {
        const members = [
          { accountUuid: 'acc1' as PersonUuid, role: AccountRole.Owner },
          { accountUuid: 'acc2' as PersonUuid, role: AccountRole.Maintainer }
        ]

        ;(accountDb.workspaceMembers.find as jest.Mock).mockResolvedValue(members)

        const result = await accountDb.getWorkspaceMembers(workspaceId)

        expect(result).toEqual([
          { person: 'acc1', role: AccountRole.Owner },
          { person: 'acc2', role: AccountRole.Maintainer }
        ])
      })
    })

    describe('getAccountWorkspaces', () => {
      it('should return workspaces for account', async () => {
        const members = [{ workspaceUuid: 'ws1' as WorkspaceUuid }, { workspaceUuid: 'ws2' as WorkspaceUuid }]
        const workspaces = [
          { uuid: 'ws1', name: 'Workspace 1' },
          { uuid: 'ws2', name: 'Workspace 2' }
        ]

        ;(accountDb.workspaceMembers.find as jest.Mock).mockResolvedValue(members)
        ;(accountDb.workspace.find as jest.Mock).mockResolvedValue(workspaces)

        const result = await accountDb.getAccountWorkspaces(accountId)

        expect(result).toEqual(workspaces)
        expect(accountDb.workspace.find).toHaveBeenCalledWith({
          uuid: { $in: ['ws1', 'ws2'] }
        })
      })
    })

    describe('getPendingWorkspace', () => {
      const version: Data<Version> = { major: 1, minor: 0, patch: 0 }
      const processingTimeoutMs = 5000
      const wsLivenessMs = 300000 // 5 minutes
      const NOW = 1234567890000 // Fixed timestamp

      beforeEach(() => {
        jest.spyOn(Date, 'now').mockReturnValue(NOW)
      })

      afterEach(() => {
        jest.restoreAllMocks()
      })

      it('should get pending creation workspace', async () => {
        await accountDb.getPendingWorkspace('', version, 'create', processingTimeoutMs)

        expect(accountDb.workspace.collection.findOneAndUpdate).toHaveBeenCalledWith(
          {
            $and: [
              { 'status.mode': { $ne: 'manual-creation' } },
              { $or: [{ 'status.mode': { $in: ['pending-creation', 'creating'] } }] },
              {
                $or: [{ 'status.processingAttempts': { $exists: false } }, { 'status.processingAttempts': { $lte: 3 } }]
              },
              { $or: [{ region: { $exists: false } }, { region: '' }] },
              {
                $or: [
                  { 'status.lastProcessingTime': { $exists: false } },
                  { 'status.lastProcessingTime': { $lt: NOW - processingTimeoutMs } }
                ]
              }
            ]
          },
          {
            $inc: {
              'status.processingAttempts': 1
            },
            $set: {
              'status.lastProcessingTime': NOW
            }
          },
          {
            returnDocument: 'after',
            sort: {
              'status.lastVisit': -1
            }
          }
        )
      })

      it('should get workspace pending upgrade', async () => {
        await accountDb.getPendingWorkspace('', version, 'upgrade', processingTimeoutMs, wsLivenessMs)

        expect(accountDb.workspace.collection.findOneAndUpdate).toHaveBeenCalledWith(
          {
            $and: [
              { 'status.mode': { $ne: 'manual-creation' } },
              {
                $or: [
                  {
                    $and: [
                      {
                        $or: [{ 'status.isDisabled': false }, { 'status.isDisabled': { $exists: false } }]
                      },
                      {
                        $or: [{ 'status.mode': 'active' }, { 'status.mode': { $exists: false } }]
                      },
                      {
                        $or: [
                          { 'status.versionMajor': { $lt: version.major } },
                          { 'status.versionMajor': version.major, 'status.versionMinor': { $lt: version.minor } },
                          {
                            'status.versionMajor': version.major,
                            'status.versionMinor': version.minor,
                            'status.versionPatch': { $lt: version.patch }
                          }
                        ]
                      },
                      {
                        'status.lastVisit': { $gt: NOW - wsLivenessMs }
                      }
                    ]
                  },
                  {
                    $or: [{ 'status.isDisabled': false }, { 'status.isDisabled': { $exists: false } }],
                    'status.mode': 'upgrading'
                  }
                ]
              },
              {
                $or: [{ 'status.processingAttempts': { $exists: false } }, { 'status.processingAttempts': { $lte: 3 } }]
              },
              { $or: [{ region: { $exists: false } }, { region: '' }] },
              {
                $or: [
                  { 'status.lastProcessingTime': { $exists: false } },
                  { 'status.lastProcessingTime': { $lt: NOW - processingTimeoutMs } }
                ]
              }
            ]
          },
          {
            $inc: {
              'status.processingAttempts': 1
            },
            $set: {
              'status.lastProcessingTime': NOW
            }
          },
          {
            returnDocument: 'after',
            sort: {
              'status.lastVisit': -1
            }
          }
        )
      })

      it('should get workspace for all+backup operations', async () => {
        await accountDb.getPendingWorkspace('', version, 'all+backup', processingTimeoutMs)

        expect(accountDb.workspace.collection.findOneAndUpdate).toHaveBeenCalledWith(
          {
            $and: [
              { 'status.mode': { $ne: 'manual-creation' } },
              {
                $or: [
                  { 'status.mode': { $in: ['pending-creation', 'creating'] } },
                  {
                    $and: [
                      {
                        $or: [{ 'status.isDisabled': false }, { 'status.isDisabled': { $exists: false } }]
                      },
                      {
                        $or: [{ 'status.mode': 'active' }, { 'status.mode': { $exists: false } }]
                      },
                      {
                        $or: [
                          { 'status.versionMajor': { $lt: version.major } },
                          { 'status.versionMajor': version.major, 'status.versionMinor': { $lt: version.minor } },
                          {
                            'status.versionMajor': version.major,
                            'status.versionMinor': version.minor,
                            'status.versionPatch': { $lt: version.patch }
                          }
                        ]
                      }
                    ]
                  },
                  {
                    $or: [{ 'status.isDisabled': false }, { 'status.isDisabled': { $exists: false } }],
                    'status.mode': 'upgrading'
                  },
                  {
                    'status.mode': {
                      $in: [
                        'migration-backup',
                        'migration-pending-backup',
                        'migration-clean',
                        'migration-pending-clean'
                      ]
                    }
                  },
                  {
                    'status.mode': {
                      $in: [
                        'archiving-pending-backup',
                        'archiving-backup',
                        'archiving-pending-clean',
                        'archiving-clean'
                      ]
                    }
                  },
                  { 'status.mode': { $in: ['pending-restore', 'restoring'] } },
                  { 'status.mode': { $in: ['pending-deletion', 'deleting'] } }
                ]
              },
              {
                $or: [{ 'status.processingAttempts': { $exists: false } }, { 'status.processingAttempts': { $lte: 3 } }]
              },
              { $or: [{ region: { $exists: false } }, { region: '' }] },
              {
                $or: [
                  { 'status.lastProcessingTime': { $exists: false } },
                  { 'status.lastProcessingTime': { $lt: NOW - processingTimeoutMs } }
                ]
              }
            ]
          },
          {
            $inc: {
              'status.processingAttempts': 1
            },
            $set: {
              'status.lastProcessingTime': NOW
            }
          },
          {
            returnDocument: 'after',
            sort: {
              'status.lastVisit': -1
            }
          }
        )
      })

      it('should filter by region when specified', async () => {
        const region = 'us-east-1'
        await accountDb.getPendingWorkspace(region, version, 'create', processingTimeoutMs)

        expect(accountDb.workspace.collection.findOneAndUpdate).toHaveBeenCalledWith(
          {
            $and: [
              { 'status.mode': { $ne: 'manual-creation' } },
              { $or: [{ 'status.mode': { $in: ['pending-creation', 'creating'] } }] },
              {
                $or: [{ 'status.processingAttempts': { $exists: false } }, { 'status.processingAttempts': { $lte: 3 } }]
              },
              { region },
              {
                $or: [
                  { 'status.lastProcessingTime': { $exists: false } },
                  { 'status.lastProcessingTime': { $lt: NOW - processingTimeoutMs } }
                ]
              }
            ]
          },
          {
            $inc: {
              'status.processingAttempts': 1
            },
            $set: {
              'status.lastProcessingTime': NOW
            }
          },
          {
            returnDocument: 'after',
            sort: {
              'status.lastVisit': -1
            }
          }
        )
      })

      it('should handle undefined result', async () => {
        ;(accountDb.workspace.collection.findOneAndUpdate as jest.Mock).mockResolvedValue(null)

        const result = await accountDb.getPendingWorkspace('', version, 'create', processingTimeoutMs)

        expect(result).toBeUndefined()
      })
    })

    describe('createWorkspace', () => {
      it('should create workspace and status', async () => {
        const workspaceData = {
          name: 'New Workspace',
          url: 'new-workspace'
        }
        const statusData = {
          mode: 'active' as const,
          versionMajor: 1,
          versionMinor: 0,
          versionPatch: 0,
          isDisabled: false
        }

        ;(accountDb.workspace.insertOne as jest.Mock).mockResolvedValue('ws1')

        const result = await accountDb.createWorkspace(workspaceData, statusData)

        expect(result).toBe('ws1')
        expect(accountDb.workspace.insertOne).toHaveBeenCalledWith(workspaceData)
        expect(accountDb.workspaceStatus.insertOne).toHaveBeenCalledWith({
          workspaceUuid: 'ws1',
          ...statusData
        })
      })
    })
  })

  describe('password operations', () => {
    const accountId = 'acc1' as PersonUuid
    const passwordHash = Buffer.from('hash')
    const salt = Buffer.from('salt')

    describe('setPassword', () => {
      it('should update account with password hash and salt', async () => {
        await accountDb.setPassword(accountId, passwordHash, salt)

        expect(accountDb.account.updateOne).toHaveBeenCalledWith({ uuid: accountId }, { hash: passwordHash, salt })
      })
    })

    describe('resetPassword', () => {
      it('should reset password hash and salt to null', async () => {
        await accountDb.resetPassword(accountId)

        expect(accountDb.account.updateOne).toHaveBeenCalledWith({ uuid: accountId }, { hash: null, salt: null })
      })
    })
  })
})
