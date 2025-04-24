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
import { MeasureContext, PersonId } from '@hcengineering/core'
import { SyncManager, SyncMutex } from '../message/sync'
import { MessageManager } from '../message/message'
import { RateLimiter } from '../rateLimiter'

jest.mock('../config')
jest.mock('../message/message')
jest.mock('../utils', () => {
  const originalModule = jest.requireActual('../utils')
  return {
    ...originalModule,
    getKvsClient: jest.fn().mockImplementation(() => mockKeyValueClientInstance)
  }
})

// Create mock types
interface MockKeyValueClient {
  getValue: jest.Mock
  setValue: jest.Mock
  deleteKey: jest.Mock
  listKeys: jest.Mock
}

// Create a shared mock instance that can be referenced in the mock above
const mockKeyValueClientInstance = {
  getValue: jest.fn(),
  setValue: jest.fn().mockImplementation(() => Promise.resolve(undefined)),
  deleteKey: jest.fn().mockImplementation(() => Promise.resolve(undefined)),
  listKeys: jest.fn()
}

describe('SyncManager', () => {
  // Mocked dependencies
  let mockCtx: MeasureContext
  let mockMessageManager: jest.Mocked<MessageManager>
  let mockGmail: any // Using any for easier mocking
  let mockKeyValueClient: MockKeyValueClient

  // Test constants
  const workspace = 'test-workspace'
  const userId = 'user1' as PersonId
  const userEmail = 'user1@example.com'
  const historyId = '12345'

  // Initialize SyncManager instance for each test
  let syncManager: SyncManager

  beforeEach(() => {
    // Setup mocks
    mockCtx = {
      info: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<MeasureContext>

    mockMessageManager = {
      saveMessage: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<MessageManager>

    mockGmail = {
      history: {
        list: jest.fn().mockImplementation(() =>
          Promise.resolve({
            data: {
              history: [],
              nextPageToken: undefined
            }
          })
        )
      },
      messages: {
        list: jest.fn().mockImplementation(() =>
          Promise.resolve({
            data: {
              messages: [],
              nextPageToken: undefined
            }
          })
        ),
        get: jest.fn().mockImplementation(() =>
          Promise.resolve({
            data: {
              id: 'test-id',
              historyId
            }
          })
        )
      }
    }

    mockKeyValueClient = {
      getValue: jest.fn(),
      setValue: jest.fn().mockImplementation(() => Promise.resolve(undefined)),
      deleteKey: jest.fn().mockImplementation(() => Promise.resolve(undefined)),
      listKeys: jest.fn()
    }

    // Create SyncManager instance
    syncManager = new SyncManager(mockCtx, mockMessageManager, mockGmail, workspace, mockKeyValueClient as any, new RateLimiter(100, 100))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getHistory', () => {
    it('should retrieve history from key-value store', async () => {
      // Arrange
      const mockHistory = {
        historyId,
        userId,
        workspace
      }
      mockKeyValueClient.getValue.mockResolvedValue(mockHistory)

      // Act
      const result = await (syncManager as any).getHistory(userId)

      // Assert
      expect(mockKeyValueClient.getValue).toHaveBeenCalledWith(`history:${workspace}:${userId}`)
      expect(result).toEqual(mockHistory)
    })

    it('should return null when history not found', async () => {
      // Arrange
      mockKeyValueClient.getValue.mockResolvedValue(null)

      // Act
      const result = await (syncManager as any).getHistory(userId)

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('setHistoryId', () => {
    it('should store history in key-value store', async () => {
      // Act
      await (syncManager as any).setHistoryId(userId, historyId)

      // Assert
      expect(mockKeyValueClient.setValue).toHaveBeenCalledWith(`history:${workspace}:${userId}`, {
        historyId,
        userId,
        workspace
      })
    })
  })

  describe('clearHistory', () => {
    it('should delete history from key-value store', async () => {
      // Act
      await (syncManager as any).clearHistory(userId)

      // Assert
      expect(mockKeyValueClient.deleteKey).toHaveBeenCalledWith(`history:${workspace}:${userId}`)
    })
  })

  describe('sync', () => {
    it('should perform full sync when no history exists', async () => {
      // Arrange
      mockKeyValueClient.getValue.mockResolvedValue(null)
      const spyFullSync = jest.spyOn(syncManager, 'fullSync').mockResolvedValue(undefined)

      // Act
      await syncManager.sync(userId, userEmail)

      // Assert
      expect(spyFullSync).toHaveBeenCalledWith(userId, userEmail)
    })

    it('should perform part sync when history exists', async () => {
      // Arrange
      mockKeyValueClient.getValue.mockResolvedValue({
        historyId,
        userId,
        workspace
      })

      // Act
      await syncManager.sync(userId, userEmail)

      // Assert
      expect(mockGmail.history.list).toHaveBeenCalledWith({
        userId: 'me',
        historyTypes: ['messageAdded'],
        startHistoryId: historyId,
        pageToken: undefined
      })
    })
  })

  describe('getMessage', () => {
    it('should retrieve a message by ID', async () => {
      // Arrange
      const messageId = 'msg123'
      const mockResponse = {
        data: {
          id: messageId,
          historyId
        }
      }

      mockGmail.messages.get.mockImplementation(() => Promise.resolve(mockResponse))

      // Act
      const result = await (syncManager as any).getMessage(messageId)

      // Assert
      expect(mockGmail.messages.get).toHaveBeenCalledWith({
        id: messageId,
        userId: 'me',
        format: 'FULL'
      })
      expect(result).toEqual(mockResponse)
    })
  })
})

describe('SyncMutex', () => {
  let syncMutex: SyncMutex

  beforeEach(() => {
    syncMutex = new SyncMutex()
  })

  it('should allow sequential locking and unlocking', async () => {
    // Lock first time
    const release1 = await syncMutex.lock('test-key')
    release1()

    // Lock second time
    const release2 = await syncMutex.lock('test-key')
    release2()

    // If we got here without hanging, the test passes
    expect(true).toBe(true)
  })

  it('should queue up multiple requests for the same key', async () => {
    const results: number[] = []

    // Start 3 concurrent lock operations
    const promise1 = (async () => {
      const release = await syncMutex.lock('test-key')
      results.push(1)
      await new Promise((resolve) => setTimeout(resolve, 10))
      release()
    })()

    const promise2 = (async () => {
      const release = await syncMutex.lock('test-key')
      results.push(2)
      await new Promise((resolve) => setTimeout(resolve, 5))
      release()
    })()

    const promise3 = (async () => {
      const release = await syncMutex.lock('test-key')
      results.push(3)
      release()
    })()

    // Wait for all promises to resolve
    await Promise.all([promise1, promise2, promise3])

    // The operations should have happened in order
    expect(results).toEqual([1, 2, 3])
  })

  it('should allow concurrent operations on different keys', async () => {
    const results: string[] = []

    // Lock two different keys concurrently
    const promise1 = (async () => {
      const release = await syncMutex.lock('key1')
      results.push('key1-locked')
      await new Promise((resolve) => setTimeout(resolve, 20))
      results.push('key1-unlocked')
      release()
    })()

    const promise2 = (async () => {
      const release = await syncMutex.lock('key2')
      results.push('key2-locked')
      await new Promise((resolve) => setTimeout(resolve, 10))
      results.push('key2-unlocked')
      release()
    })()

    // Wait for both promises to resolve
    await Promise.all([promise1, promise2])

    // key2 operations should complete before key1 due to shorter timeout
    expect(results.indexOf('key2-locked')).toBeLessThan(results.indexOf('key1-unlocked'))
  })

  it('should release the lock properly even if an error occurs', async () => {
    try {
      const release = await syncMutex.lock('test-key')
      try {
        throw new Error('Test error')
      } finally {
        release()
      }
    } catch (error) {
      // Ignore the error
    }

    // Should be able to acquire the lock again
    const release = await syncMutex.lock('test-key')
    release()

    expect(true).toBe(true)
  })
})
