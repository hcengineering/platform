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

import { PersonId } from '@hcengineering/core'
import { KeyValueClient } from '@hcengineering/kvs-client'

import { SyncStateManager } from '../message/syncState'
import { IntegrationVersion } from '../types'
import { History } from '../message/types'

describe('SyncStateManager', () => {
  const workspace = 'test-workspace'
  const userId = 'test-user-id' as PersonId
  const historyId = 'test-history-id'
  const pageToken = 'test-page-token'

  let mockKeyValueClient: jest.Mocked<KeyValueClient>
  let v1StateManager: SyncStateManager
  let v2StateManager: SyncStateManager

  beforeEach(() => {
    // Reset mocks before each test
    mockKeyValueClient = {
      getValue: jest.fn(),
      setValue: jest.fn().mockResolvedValue(undefined),
      deleteKey: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<KeyValueClient>

    // Create state managers for both versions
    v1StateManager = new SyncStateManager(mockKeyValueClient, workspace, IntegrationVersion.V1)
    v2StateManager = new SyncStateManager(mockKeyValueClient, workspace, IntegrationVersion.V2)
  })

  describe('getHistory', () => {
    it('should call getValue with correct key for V1', async () => {
      const expectedHistory: History = {
        historyId,
        userId,
        workspace
      }

      mockKeyValueClient.getValue.mockResolvedValue(expectedHistory)

      const result = await v1StateManager.getHistory(userId)

      expect(mockKeyValueClient.getValue).toHaveBeenCalledWith(`history:${workspace}:${userId}`)
      expect(result).toEqual(expectedHistory)
    })

    it('should call getValue with correct key for V2', async () => {
      const expectedHistory: History = {
        historyId,
        userId,
        workspace
      }

      mockKeyValueClient.getValue.mockResolvedValue(expectedHistory)

      const result = await v2StateManager.getHistory(userId)

      expect(mockKeyValueClient.getValue).toHaveBeenCalledWith(`history-v2:${workspace}:${userId}`)
      expect(result).toEqual(expectedHistory)
    })

    it('should return null when no history exists', async () => {
      mockKeyValueClient.getValue.mockResolvedValue(null)

      const result = await v1StateManager.getHistory(userId)

      expect(result).toBeNull()
    })

    it('should propagate errors from KeyValueClient', async () => {
      const error = new Error('Database error')
      mockKeyValueClient.getValue.mockRejectedValue(error)

      await expect(v1StateManager.getHistory(userId)).rejects.toThrow(error)
    })
  })

  describe('clearHistory', () => {
    it('should call deleteKey with correct key for V1', async () => {
      await v1StateManager.clearHistory(userId)

      expect(mockKeyValueClient.deleteKey).toHaveBeenCalledWith(`history:${workspace}:${userId}`)
    })

    it('should call deleteKey with correct key for V2', async () => {
      await v2StateManager.clearHistory(userId)

      expect(mockKeyValueClient.deleteKey).toHaveBeenCalledWith(`history-v2:${workspace}:${userId}`)
    })

    it('should propagate errors from KeyValueClient', async () => {
      const error = new Error('Database error')
      mockKeyValueClient.deleteKey.mockRejectedValue(error)

      await expect(v1StateManager.clearHistory(userId)).rejects.toThrow(error)
    })
  })

  describe('setHistoryId', () => {
    it('should call setValue with correct key and value for V1', async () => {
      await v1StateManager.setHistoryId(userId, historyId)

      expect(mockKeyValueClient.setValue).toHaveBeenCalledWith(`history:${workspace}:${userId}`, {
        historyId,
        userId,
        workspace
      })
    })

    it('should call setValue with correct key and value for V2', async () => {
      await v2StateManager.setHistoryId(userId, historyId)

      expect(mockKeyValueClient.setValue).toHaveBeenCalledWith(`history-v2:${workspace}:${userId}`, {
        historyId,
        userId,
        workspace
      })
    })

    it('should propagate errors from KeyValueClient', async () => {
      const error = new Error('Database error')
      mockKeyValueClient.setValue.mockRejectedValue(error)

      await expect(v1StateManager.setHistoryId(userId, historyId)).rejects.toThrow(error)
    })
  })

  describe('getPageToken', () => {
    it('should call getValue with correct key for V1', async () => {
      mockKeyValueClient.getValue.mockResolvedValue(pageToken)

      const result = await v1StateManager.getPageToken(userId)

      expect(mockKeyValueClient.getValue).toHaveBeenCalledWith(`page-token:${workspace}:${userId}`)
      expect(result).toEqual(pageToken)
    })

    it('should call getValue with correct key for V2', async () => {
      mockKeyValueClient.getValue.mockResolvedValue(pageToken)

      const result = await v2StateManager.getPageToken(userId)

      expect(mockKeyValueClient.getValue).toHaveBeenCalledWith(`page-token-v2:${workspace}:${userId}`)
      expect(result).toEqual(pageToken)
    })

    it('should return null when no page token exists', async () => {
      mockKeyValueClient.getValue.mockResolvedValue(null)

      const result = await v1StateManager.getPageToken(userId)

      expect(result).toBeNull()
    })

    it('should propagate errors from KeyValueClient', async () => {
      const error = new Error('Database error')
      mockKeyValueClient.getValue.mockRejectedValue(error)

      await expect(v1StateManager.getPageToken(userId)).rejects.toThrow(error)
    })
  })

  describe('setPageToken', () => {
    it('should call setValue with correct key and value for V1', async () => {
      await v1StateManager.setPageToken(userId, pageToken)

      expect(mockKeyValueClient.setValue).toHaveBeenCalledWith(`page-token:${workspace}:${userId}`, pageToken)
    })

    it('should call setValue with correct key and value for V2', async () => {
      await v2StateManager.setPageToken(userId, pageToken)

      expect(mockKeyValueClient.setValue).toHaveBeenCalledWith(`page-token-v2:${workspace}:${userId}`, pageToken)
    })

    it('should propagate errors from KeyValueClient', async () => {
      const error = new Error('Database error')
      mockKeyValueClient.setValue.mockRejectedValue(error)

      await expect(v1StateManager.setPageToken(userId, pageToken)).rejects.toThrow(error)
    })
  })

  describe('key generation', () => {
    it('should generate different keys for V1 and V2', async () => {
      // Test through the public methods to verify the keys are different
      mockKeyValueClient.getValue.mockResolvedValue(null)

      await v1StateManager.getHistory(userId)
      await v2StateManager.getHistory(userId)

      expect(mockKeyValueClient.getValue).toHaveBeenCalledWith(`history:${workspace}:${userId}`)
      expect(mockKeyValueClient.getValue).toHaveBeenCalledWith(`history-v2:${workspace}:${userId}`)

      mockKeyValueClient.getValue.mockClear()

      await v1StateManager.getPageToken(userId)
      await v2StateManager.getPageToken(userId)

      expect(mockKeyValueClient.getValue).toHaveBeenCalledWith(`page-token:${workspace}:${userId}`)
      expect(mockKeyValueClient.getValue).toHaveBeenCalledWith(`page-token-v2:${workspace}:${userId}`)
    })
  })

  describe('version migration scenario', () => {
    it('should allow migrating from V1 to V2', async () => {
      // Simulate V1 data existing
      const v1History: History = { historyId: 'v1-history', userId, workspace }
      mockKeyValueClient.getValue.mockImplementation((key: string) => {
        if (key === `history:${workspace}:${userId}`) {
          return Promise.resolve(v1History)
        }
        if (key === `history-v2:${workspace}:${userId}`) {
          return Promise.resolve(null)
        }
        return Promise.resolve(null)
      })

      // V1 manager should find history
      const historyFromV1 = await v1StateManager.getHistory(userId)
      expect(historyFromV1).toEqual(v1History)

      // V2 manager should not find history yet
      const historyFromV2 = await v2StateManager.getHistory(userId)
      expect(historyFromV2).toBeNull()

      // Migrate by setting V2 history
      await v2StateManager.setHistoryId(userId, 'v2-history')

      // Verify the call to set V2 history
      expect(mockKeyValueClient.setValue).toHaveBeenCalledWith(`history-v2:${workspace}:${userId}`, {
        historyId: 'v2-history',
        userId,
        workspace
      })
    })
  })
})
