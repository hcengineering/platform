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
import { MeasureContext, PersonId, WorkspaceUuid } from '@hcengineering/core'
import { SyncManager } from '../message/sync'
import { MessageManagerV2 } from '../message/v2/message'
import { RateLimiter } from '../rateLimiter'

jest.mock('../config')
jest.mock('../message/adapter')
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
  let mockMessageManager: jest.Mocked<MessageManagerV2>
  let mockGmail: any // Using any for easier mocking
  let mockKeyValueClient: MockKeyValueClient

  // Test constants
  const workspace = 'test-workspace' as WorkspaceUuid
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
    } as unknown as jest.Mocked<MessageManagerV2>

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
    syncManager = new SyncManager(
      mockCtx,
      mockMessageManager,
      mockGmail,
      workspace,
      mockKeyValueClient as any,
      new RateLimiter(100, 100)
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('sync', () => {
    it('should perform full sync when no history exists', async () => {
      // Arrange
      mockKeyValueClient.getValue.mockResolvedValue(null)
      const spyFullSync = jest.spyOn(syncManager, 'fullSync').mockResolvedValue(undefined)

      // Act
      await syncManager.sync(userId, { noNotify: true }, userEmail)

      // Assert
      expect(spyFullSync).toHaveBeenCalledWith(userId, userEmail, undefined, { noNotify: true })
    })

    it('should perform part sync when history exists', async () => {
      // Arrange
      mockKeyValueClient.getValue.mockResolvedValue({
        historyId,
        userId,
        workspace
      })

      // Act
      await syncManager.sync(userId, { noNotify: true }, userEmail)

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

  /* eslint-disable @typescript-eslint/unbound-method */

  describe('syncNewMessages', () => {
    it('should perform full sync when no stored history ID exists', async () => {
      // Arrange
      const spyGetHistory = jest.spyOn((syncManager as any).stateManager, 'getHistory').mockResolvedValue(null)
      const spyFullSync = jest.spyOn(syncManager, 'fullSync').mockResolvedValue(undefined)

      // Act
      await syncManager.syncNewMessages(userId, userEmail)

      // Assert
      expect(spyGetHistory).toHaveBeenCalledWith(userId)
      expect(mockCtx.info).toHaveBeenCalledWith('No stored history ID found, performing full sync instead', { userId })
      expect(spyFullSync).toHaveBeenCalledWith(userId, userEmail, undefined, undefined)
    })

    it('should throw error when userEmail is undefined', async () => {
      // Act & Assert
      await expect(syncManager.syncNewMessages(userId)).rejects.toThrow('Cannot sync without user email')
    })

    it('should sync new messages and update history ID when newer messages found', async () => {
      // Arrange
      const storedHistoryId = '12345'
      const newHistoryId = '12350'

      const spyGetHistory = jest.spyOn((syncManager as any).stateManager, 'getHistory').mockResolvedValue({
        historyId: storedHistoryId,
        userId,
        workspace
      })
      const spySetHistoryId = jest.spyOn((syncManager as any).stateManager, 'setHistoryId').mockResolvedValue(undefined)

      const mockMessages = [{ id: 'msg1' }, { id: 'msg2' }]

      mockGmail.messages.list.mockResolvedValue({
        data: {
          messages: mockMessages,
          nextPageToken: null
        }
      })

      mockGmail.messages.get
        .mockResolvedValueOnce({
          data: {
            id: 'msg1',
            historyId: newHistoryId
          }
        })
        .mockResolvedValueOnce({
          data: {
            id: 'msg2',
            historyId: '12348'
          }
        })

      // Act
      await syncManager.syncNewMessages(userId, userEmail)

      // Assert
      expect(spyGetHistory).toHaveBeenCalledWith(userId)
      expect(mockGmail.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        pageToken: undefined
      })
      expect(mockGmail.messages.get).toHaveBeenCalledTimes(2)
      expect(mockMessageManager.saveMessage).toHaveBeenCalledTimes(2)
      expect(spySetHistoryId).toHaveBeenCalledWith(userId, newHistoryId)
      expect(mockCtx.info).toHaveBeenCalledWith('Updated history ID after new messages sync', {
        userId,
        oldHistoryId: storedHistoryId,
        newHistoryId,
        messagesProcessed: 2
      })
    })

    it('should stop syncing when encountering message with older history ID', async () => {
      // Arrange
      const storedHistoryId = '12345'
      const olderHistoryId = '12340'

      const spyGetHistory = jest.spyOn((syncManager as any).stateManager, 'getHistory').mockResolvedValue({
        historyId: storedHistoryId,
        userId,
        workspace
      })

      const mockMessages = [{ id: 'msg1' }, { id: 'msg2' }]

      mockGmail.messages.list.mockResolvedValue({
        data: {
          messages: mockMessages,
          nextPageToken: null
        }
      })

      mockGmail.messages.get.mockResolvedValueOnce({
        data: {
          id: 'msg1',
          historyId: olderHistoryId
        }
      })

      // Act
      await syncManager.syncNewMessages(userId, userEmail)

      // Assert
      expect(spyGetHistory).toHaveBeenCalledWith(userId)
      expect(mockGmail.messages.get).toHaveBeenCalledTimes(1)
      expect(mockMessageManager.saveMessage).not.toHaveBeenCalled()
      expect(mockCtx.info).toHaveBeenCalledWith('Reached message with history ID <= stored history ID, stopping sync', {
        userId,
        messageHistoryId: olderHistoryId,
        storedHistoryId
      })
      expect(mockCtx.info).toHaveBeenCalledWith('No history ID update needed after new messages sync', {
        userId,
        storedHistoryId,
        maxHistoryId: undefined,
        messagesProcessed: 0
      })
    })

    it('should save messages without history ID', async () => {
      // Arrange
      const storedHistoryId = '12345'

      const spyGetHistory = jest.spyOn((syncManager as any).stateManager, 'getHistory').mockResolvedValue({
        historyId: storedHistoryId,
        userId,
        workspace
      })

      const mockMessages = [{ id: 'msg1' }]

      mockGmail.messages.list.mockResolvedValue({
        data: {
          messages: mockMessages,
          nextPageToken: null
        }
      })

      mockGmail.messages.get.mockResolvedValue({
        data: {
          id: 'msg1',
          historyId: null // No history ID
        }
      })

      // Act
      await syncManager.syncNewMessages(userId, userEmail)

      // Assert
      expect(spyGetHistory).toHaveBeenCalledWith(userId)
      expect(mockMessageManager.saveMessage).toHaveBeenCalledTimes(1)
      expect(mockCtx.info).toHaveBeenCalledWith('No history ID update needed after new messages sync', {
        userId,
        storedHistoryId,
        maxHistoryId: undefined,
        messagesProcessed: 1
      })
    })

    it('should handle pagination correctly', async () => {
      // Arrange
      const storedHistoryId = '12345'
      const newHistoryId = '12350'

      const spyGetHistory = jest.spyOn((syncManager as any).stateManager, 'getHistory').mockResolvedValue({
        historyId: storedHistoryId,
        userId,
        workspace
      })
      const spySetHistoryId = jest.spyOn((syncManager as any).stateManager, 'setHistoryId').mockResolvedValue(undefined)

      // First page
      mockGmail.messages.list
        .mockResolvedValueOnce({
          data: {
            messages: [{ id: 'msg1' }],
            nextPageToken: 'token123'
          }
        })
        .mockResolvedValueOnce({
          data: {
            messages: [{ id: 'msg2' }],
            nextPageToken: null
          }
        })

      mockGmail.messages.get
        .mockResolvedValueOnce({
          data: {
            id: 'msg1',
            historyId: newHistoryId
          }
        })
        .mockResolvedValueOnce({
          data: {
            id: 'msg2',
            historyId: '12348'
          }
        })

      // Act
      await syncManager.syncNewMessages(userId, userEmail)

      // Assert
      expect(spyGetHistory).toHaveBeenCalledWith(userId)
      expect(mockGmail.messages.list).toHaveBeenCalledTimes(2)
      // The first call gets the modified query object with pageToken from the second call
      // This is due to query object being reused and modified
      expect(mockGmail.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        pageToken: 'token123' // This will be the final state of the query object
      })
      expect(mockMessageManager.saveMessage).toHaveBeenCalledTimes(2)
      expect(spySetHistoryId).toHaveBeenCalledWith(userId, newHistoryId)
    })

    it('should handle errors during message processing', async () => {
      // Arrange
      const storedHistoryId = '12345'

      const spyGetHistory = jest.spyOn((syncManager as any).stateManager, 'getHistory').mockResolvedValue({
        historyId: storedHistoryId,
        userId,
        workspace
      })

      const mockMessages = [{ id: 'msg1' }]

      mockGmail.messages.list.mockResolvedValue({
        data: {
          messages: mockMessages,
          nextPageToken: null
        }
      })

      const error = new Error('Message fetch failed')
      mockGmail.messages.get.mockRejectedValue(error)

      // Act
      await syncManager.syncNewMessages(userId, userEmail)

      // Assert
      expect(spyGetHistory).toHaveBeenCalledWith(userId)
      expect(mockCtx.error).toHaveBeenCalledWith('Sync new messages error', {
        workspace,
        userId,
        messageId: 'msg1',
        err: error
      })
    })

    it('should return early when isClosing is true', async () => {
      // Arrange
      const storedHistoryId = '12345'

      const spyGetHistory = jest.spyOn((syncManager as any).stateManager, 'getHistory').mockResolvedValue({
        historyId: storedHistoryId,
        userId,
        workspace
      })

      const mockMessages = [{ id: 'msg1' }]

      mockGmail.messages.list.mockResolvedValue({
        data: {
          messages: mockMessages,
          nextPageToken: null
        }
      })

      // Set isClosing to true
      syncManager.close()

      // Act
      await syncManager.syncNewMessages(userId, userEmail)

      // Assert
      expect(spyGetHistory).toHaveBeenCalledWith(userId)
      expect(mockGmail.messages.get).not.toHaveBeenCalled()
      expect(mockMessageManager.saveMessage).not.toHaveBeenCalled()
    })

    it('should handle overall sync error', async () => {
      // Arrange
      const storedHistoryId = '12345'

      const spyGetHistory = jest.spyOn((syncManager as any).stateManager, 'getHistory').mockResolvedValue({
        historyId: storedHistoryId,
        userId,
        workspace
      })

      const error = new Error('Sync failed')
      mockGmail.messages.list.mockRejectedValue(error)

      // Act
      await syncManager.syncNewMessages(userId, userEmail)

      // Assert
      expect(spyGetHistory).toHaveBeenCalledWith(userId)
      expect(mockCtx.error).toHaveBeenCalledWith('New messages sync error', {
        workspace,
        userId,
        err: error
      })
    })
  })
})
