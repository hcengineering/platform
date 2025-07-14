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
})
