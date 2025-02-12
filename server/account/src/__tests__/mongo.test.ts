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
import { type WorkspaceUuid } from '@hcengineering/core'
import { MongoDbCollection, WorkspaceStatusMongoDbCollection } from '../collections/mongo'
import { WorkspaceInfoWithStatus, WorkspaceStatus } from '../types'

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
