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

import { MeasureContext, WorkspaceUuid, PersonUuid, Account } from '@hcengineering/core'
import { HulylakeWorkspaceClient, getWorkspaceClient } from '@hcengineering/hulylake-client'
import { getClient as getAccountClient } from '@hcengineering/account-client'
import { loadMessages } from '@hcengineering/communication-shared'
import {
  CardID,
  MessageID,
  MessageMeta,
  Message,
  SocialID,
  FindMessagesOptions,
  BlobID
} from '@hcengineering/communication-types'
import { DbAdapter } from '@hcengineering/communication-sdk-types'
import { LowLevelClient } from '../client'
import { Blob } from '../blob'
import { Metadata } from '../types'

// Mock dependencies
jest.mock('@hcengineering/hulylake-client')
jest.mock('@hcengineering/account-client')
jest.mock('@hcengineering/communication-shared')
jest.mock('@hcengineering/server-token', () => ({
  generateToken: jest.fn(() => 'mock-token')
}))

describe('LowLevelClient', () => {
  let client: LowLevelClient
  let mockDbAdapter: jest.Mocked<DbAdapter>
  let mockBlob: jest.Mocked<Blob>
  let mockMetadata: Metadata
  let mockLakeClient: jest.Mocked<HulylakeWorkspaceClient>
  let mockAccountClient: any
  let mockCtx: jest.Mocked<MeasureContext>
  let mockAccount: Account

  const workspace = 'test-workspace' as WorkspaceUuid
  const cardId = 'test-card-id' as CardID
  const messageId = 'test-message-id' as MessageID
  const blobId = 'test-blob-id' as BlobID
  const socialId = 'social-id-123' as SocialID
  const personUuid = 'person-uuid-123' as PersonUuid

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Mock DbAdapter
    mockDbAdapter = {
      findMessagesMeta: jest.fn(),
      removeMessageMeta: jest.fn()
    } as any

    // Mock Blob
    mockBlob = {} as any

    // Mock Metadata
    mockMetadata = {
      accountsUrl: 'http://accounts-url',
      hulylakeUrl: 'http://hulylake-url',
      secret: 'test-secret',
      messagesPerBlob: 100
    }

    // Mock HulylakeWorkspaceClient
    mockLakeClient = {
      find: jest.fn(),
      update: jest.fn()
    } as any

    // Mock getWorkspaceClient
    ;(getWorkspaceClient as jest.Mock).mockReturnValue(mockLakeClient)

    // Mock AccountClient
    mockAccountClient = {
      findPersonBySocialId: jest.fn()
    }
    ;(getAccountClient as jest.Mock).mockReturnValue(mockAccountClient)

    // Mock loadMessages
    ;(loadMessages as jest.Mock).mockResolvedValue([])

    // Mock MeasureContext
    mockCtx = {
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn()
    } as any

    // Mock Account
    mockAccount = {
      uuid: personUuid,
      socialIds: []
    } as any

    // Create client instance
    client = new LowLevelClient(mockDbAdapter, mockBlob, mockMetadata, workspace)
  })

  describe('constructor', () => {
    it('should initialize LowLevelClient with correct parameters', () => {
      expect(client.db).toBe(mockDbAdapter)
      expect(client.blob).toBe(mockBlob)
      expect(getWorkspaceClient).toHaveBeenCalledWith(mockMetadata.hulylakeUrl, workspace, 'mock-token')
    })
  })

  describe('findMessage', () => {
    it('should return undefined when message meta is not found', async () => {
      mockDbAdapter.findMessagesMeta.mockResolvedValue([])

      const result = await client.findMessage(cardId, messageId)

      expect(result).toBeUndefined()
      expect(mockDbAdapter.findMessagesMeta).toHaveBeenCalledWith({
        cardId,
        id: messageId
      })
      expect(loadMessages).not.toHaveBeenCalled()
    })

    it('should return message when meta is found', async () => {
      const mockMeta: MessageMeta = {
        cardId,
        id: messageId,
        blobId,
        createdOn: Date.now()
      } as any

      const mockMessage: Message = {
        cardId,
        id: messageId,
        createdOn: Date.now(),
        createdBy: personUuid
      } as any

      mockDbAdapter.findMessagesMeta.mockResolvedValue([mockMeta])
      ;(loadMessages as jest.Mock).mockResolvedValue([mockMessage])

      const result = await client.findMessage(cardId, messageId)

      expect(result).toEqual(mockMessage)
      expect(mockDbAdapter.findMessagesMeta).toHaveBeenCalledWith({
        cardId,
        id: messageId
      })
      expect(loadMessages).toHaveBeenCalledWith(mockLakeClient, blobId, { cardId, id: messageId }, undefined)
    })

    it('should pass options to loadMessages', async () => {
      const mockMeta: MessageMeta = {
        cardId,
        id: messageId,
        blobId,
        createdOn: Date.now()
      } as any

      const options: FindMessagesOptions = {
        attachments: true
      }

      mockDbAdapter.findMessagesMeta.mockResolvedValue([mockMeta])
      ;(loadMessages as jest.Mock).mockResolvedValue([])

      await client.findMessage(cardId, messageId, options)

      expect(loadMessages).toHaveBeenCalledWith(mockLakeClient, blobId, { cardId, id: messageId }, options)
    })

    it('should use cached message meta on subsequent calls', async () => {
      const mockMeta: MessageMeta = {
        cardId,
        id: messageId,
        blobId,
        createdOn: Date.now()
      } as any

      mockDbAdapter.findMessagesMeta.mockResolvedValue([mockMeta])
      ;(loadMessages as jest.Mock).mockResolvedValue([])

      // First call
      await client.findMessage(cardId, messageId)
      expect(mockDbAdapter.findMessagesMeta).toHaveBeenCalledTimes(1)

      // Second call - should use cache
      await client.findMessage(cardId, messageId)
      expect(mockDbAdapter.findMessagesMeta).toHaveBeenCalledTimes(1)
    })
  })

  describe('findPersonUuid', () => {
    it('should return account uuid if socialId is in account socialIds', async () => {
      mockAccount.socialIds = [socialId]

      const result = await client.findPersonUuid({ ctx: mockCtx, account: mockAccount }, socialId)

      expect(result).toBe(personUuid)
      expect(mockAccountClient.findPersonBySocialId).not.toHaveBeenCalled()
    })

    it('should return cached person uuid if available', async () => {
      // First call to populate cache
      mockAccountClient.findPersonBySocialId.mockResolvedValue(personUuid)

      await client.findPersonUuid({ ctx: mockCtx, account: mockAccount }, socialId)

      expect(mockAccountClient.findPersonBySocialId).toHaveBeenCalledTimes(1)

      // Second call - should use cache
      const result = await client.findPersonUuid({ ctx: mockCtx, account: mockAccount }, socialId)

      expect(result).toBe(personUuid)
      expect(mockAccountClient.findPersonBySocialId).toHaveBeenCalledTimes(1)
    })

    it('should return undefined if accountsUrl is empty', async () => {
      const clientWithoutUrl = new LowLevelClient(
        mockDbAdapter,
        mockBlob,
        { ...mockMetadata, accountsUrl: '' },
        workspace
      )

      const result = await clientWithoutUrl.findPersonUuid({ ctx: mockCtx, account: mockAccount }, socialId)

      expect(result).toBeUndefined()
      expect(mockAccountClient.findPersonBySocialId).not.toHaveBeenCalled()
    })

    it('should fetch person uuid from account client', async () => {
      mockAccountClient.findPersonBySocialId.mockResolvedValue(personUuid)

      const result = await client.findPersonUuid({ ctx: mockCtx, account: mockAccount }, socialId)

      expect(result).toBe(personUuid)
      expect(getAccountClient).toHaveBeenCalledWith(mockMetadata.accountsUrl, 'mock-token')
      expect(mockAccountClient.findPersonBySocialId).toHaveBeenCalledWith(socialId, false)
    })

    it('should pass requireAccount parameter to account client', async () => {
      mockAccountClient.findPersonBySocialId.mockResolvedValue(personUuid)

      await client.findPersonUuid({ ctx: mockCtx, account: mockAccount }, socialId, true)

      expect(mockAccountClient.findPersonBySocialId).toHaveBeenCalledWith(socialId, true)
    })

    it('should cache person uuid when found', async () => {
      mockAccountClient.findPersonBySocialId.mockResolvedValue(personUuid)

      await client.findPersonUuid({ ctx: mockCtx, account: mockAccount }, socialId)

      // Second call should use cache
      await client.findPersonUuid({ ctx: mockCtx, account: mockAccount }, socialId)

      expect(mockAccountClient.findPersonBySocialId).toHaveBeenCalledTimes(1)
    })

    it('should not cache when person uuid is undefined', async () => {
      mockAccountClient.findPersonBySocialId.mockResolvedValue(undefined)

      await client.findPersonUuid({ ctx: mockCtx, account: mockAccount }, socialId)

      // Second call should try again
      await client.findPersonUuid({ ctx: mockCtx, account: mockAccount }, socialId)

      expect(mockAccountClient.findPersonBySocialId).toHaveBeenCalledTimes(2)
    })

    it('should handle errors and log warning', async () => {
      const error = new Error('Network error')
      mockAccountClient.findPersonBySocialId.mockRejectedValue(error)

      const result = await client.findPersonUuid({ ctx: mockCtx, account: mockAccount }, socialId)

      expect(result).toBeUndefined()
      expect(mockCtx.warn).toHaveBeenCalledWith('Cannot find person uuid', {
        socialString: socialId,
        err: error
      })
    })
  })

  describe('getMessageMeta', () => {
    it('should return cached message meta if available', async () => {
      const mockMeta: MessageMeta = {
        cardId,
        id: messageId,
        blobId,
        createdOn: Date.now()
      } as any

      mockDbAdapter.findMessagesMeta.mockResolvedValue([mockMeta])

      // First call
      const result1 = await client.getMessageMeta(cardId, messageId)
      expect(result1).toEqual(mockMeta)
      expect(mockDbAdapter.findMessagesMeta).toHaveBeenCalledTimes(1)

      // Second call - should use cache
      const result2 = await client.getMessageMeta(cardId, messageId)
      expect(result2).toEqual(mockMeta)
      expect(mockDbAdapter.findMessagesMeta).toHaveBeenCalledTimes(1)
    })

    it('should fetch message meta from db if not cached', async () => {
      const mockMeta: MessageMeta = {
        cardId,
        id: messageId,
        blobId,
        createdOn: Date.now()
      } as any

      mockDbAdapter.findMessagesMeta.mockResolvedValue([mockMeta])

      const result = await client.getMessageMeta(cardId, messageId)

      expect(result).toEqual(mockMeta)
      expect(mockDbAdapter.findMessagesMeta).toHaveBeenCalledWith({
        cardId,
        id: messageId
      })
    })

    it('should return undefined if message meta not found', async () => {
      mockDbAdapter.findMessagesMeta.mockResolvedValue([])

      const result = await client.getMessageMeta(cardId, messageId)

      expect(result).toBeUndefined()
    })

    it('should cache message meta after fetching', async () => {
      const mockMeta: MessageMeta = {
        cardId,
        id: messageId,
        blobId,
        createdOn: Date.now()
      } as any

      mockDbAdapter.findMessagesMeta.mockResolvedValue([mockMeta])

      await client.getMessageMeta(cardId, messageId)
      await client.getMessageMeta(cardId, messageId)

      expect(mockDbAdapter.findMessagesMeta).toHaveBeenCalledTimes(1)
    })

    it('should handle different cardId and messageId combinations separately', async () => {
      const cardId2 = 'card-2' as CardID
      const messageId2 = 'message-2' as MessageID

      const mockMeta1: MessageMeta = {
        cardId,
        id: messageId,
        blobId,
        createdOn: Date.now()
      } as any

      const mockMeta2: MessageMeta = {
        cardId: cardId2,
        id: messageId2,
        blobId: 'blob-2' as BlobID,
        createdOn: Date.now()
      } as any

      mockDbAdapter.findMessagesMeta.mockResolvedValueOnce([mockMeta1]).mockResolvedValueOnce([mockMeta2])

      const result1 = await client.getMessageMeta(cardId, messageId)
      const result2 = await client.getMessageMeta(cardId2, messageId2)

      expect(result1).toEqual(mockMeta1)
      expect(result2).toEqual(mockMeta2)
      expect(mockDbAdapter.findMessagesMeta).toHaveBeenCalledTimes(2)
    })
  })

  describe('removeMessageMeta', () => {
    it('should remove message meta from db and cache', async () => {
      const mockMeta: MessageMeta = {
        cardId,
        id: messageId,
        blobId,
        createdOn: Date.now()
      } as any

      // First, add to cache
      mockDbAdapter.findMessagesMeta.mockResolvedValue([mockMeta])
      await client.getMessageMeta(cardId, messageId)

      // Remove
      await client.removeMessageMeta(cardId, messageId)

      expect(mockDbAdapter.removeMessageMeta).toHaveBeenCalledWith(cardId, messageId)

      // Verify cache is cleared by checking if db is called again
      mockDbAdapter.findMessagesMeta.mockResolvedValue([mockMeta])
      await client.getMessageMeta(cardId, messageId)
      expect(mockDbAdapter.findMessagesMeta).toHaveBeenCalledTimes(2)
    })

    it('should call db removeMessageMeta even if not in cache', async () => {
      await client.removeMessageMeta(cardId, messageId)

      expect(mockDbAdapter.removeMessageMeta).toHaveBeenCalledWith(cardId, messageId)
    })

    it('should only remove specific message from cache', async () => {
      const cardId2 = 'card-2' as CardID
      const messageId2 = 'message-2' as MessageID

      const mockMeta1: MessageMeta = {
        cardId,
        id: messageId,
        blobId,
        createdOn: Date.now()
      } as any

      const mockMeta2: MessageMeta = {
        cardId: cardId2,
        id: messageId2,
        blobId: 'blob-2' as BlobID,
        createdOn: Date.now()
      } as any

      // Add both to cache
      mockDbAdapter.findMessagesMeta.mockResolvedValueOnce([mockMeta1]).mockResolvedValueOnce([mockMeta2])

      await client.getMessageMeta(cardId, messageId)
      await client.getMessageMeta(cardId2, messageId2)

      // Remove first one
      await client.removeMessageMeta(cardId, messageId)

      // First should be removed from cache
      mockDbAdapter.findMessagesMeta.mockResolvedValueOnce([mockMeta1])
      await client.getMessageMeta(cardId, messageId)
      expect(mockDbAdapter.findMessagesMeta).toHaveBeenCalledTimes(3)

      // Second should still be cached
      await client.getMessageMeta(cardId2, messageId2)
      expect(mockDbAdapter.findMessagesMeta).toHaveBeenCalledTimes(3)
    })
  })
})
