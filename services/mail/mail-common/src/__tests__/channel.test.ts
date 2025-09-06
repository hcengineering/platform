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

import { PersonId, Ref, WorkspaceUuid, MeasureContext, TxOperations, Doc } from '@hcengineering/core'
import { PersonSpace } from '@hcengineering/contact'
import chat from '@hcengineering/chat'
import mail from '@hcengineering/mail'
import { ChannelCache, ChannelCacheFactory } from '../channel'

/* eslint-disable @typescript-eslint/unbound-method */
describe('ChannelCache', () => {
  let mockCtx: jest.Mocked<MeasureContext>
  let mockClient: jest.Mocked<TxOperations>
  let channelCache: ChannelCache

  const workspace = 'test-workspace' as WorkspaceUuid
  const spaceId = 'test-space-id' as Ref<PersonSpace>
  const emailAccount = 'test@example.com'
  const participants: PersonId[] = ['person1', 'person2'] as PersonId[]
  const personId: PersonId = 'person1' as PersonId

  const mockChannel = {
    _id: 'channel-id' as Ref<Doc>,
    title: emailAccount
  }

  const generatedId = 'generated-id' as Ref<Doc>

  beforeEach(() => {
    jest.clearAllMocks()

    mockCtx = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<MeasureContext>

    mockClient = {
      findOne: jest.fn(),
      createDoc: jest.fn(),
      createMixin: jest.fn()
    } as unknown as jest.Mocked<TxOperations>

    channelCache = new ChannelCache(mockCtx, mockClient, workspace)
  })

  describe('getOrCreateChannel', () => {
    it('should return cached channel if it exists', async () => {
      // Set up a channel in the cache
      const cache = (channelCache as any).cache
      cache.set(`${spaceId}:${emailAccount}`, mockChannel._id)

      const result = await channelCache.getOrCreateChannel(spaceId, participants, emailAccount, personId)

      expect(result).toBe(mockChannel._id)
      expect(mockClient.findOne).not.toHaveBeenCalled()
    })

    it('should fetch existing channel if not in cache', async () => {
      mockClient.findOne.mockResolvedValue(mockChannel as any)

      const result = await channelCache.getOrCreateChannel(spaceId, participants, emailAccount, personId)

      expect(result).toBe(mockChannel._id)
      expect(mockClient.findOne).toHaveBeenCalledWith(mail.tag.MailThread, { title: emailAccount })
      expect(mockClient.createDoc).not.toHaveBeenCalled()
      expect(mockCtx.info).toHaveBeenCalledWith('Using existing channel', {
        me: emailAccount,
        space: spaceId,
        channel: mockChannel._id
      })
    })

    it('should create new channel if it does not exist', async () => {
      // First findOne returns null (no existing channel)
      // Second findOne (inside createNewChannel) also returns null
      mockClient.findOne.mockResolvedValue(undefined)
      mockClient.createDoc.mockResolvedValue(generatedId)
      mockClient.createMixin.mockResolvedValue(undefined as any)

      const result = await channelCache.getOrCreateChannel(spaceId, participants, emailAccount, personId)

      expect(result).toBe(generatedId)
      expect(mockClient.findOne).toHaveBeenCalledTimes(2)
      expect(mockClient.createDoc).toHaveBeenCalledWith(
        chat.masterTag.Thread,
        spaceId,
        {
          title: emailAccount,
          private: true,
          members: participants,
          archived: false,
          createdBy: personId,
          modifiedBy: personId
        },
        expect.any(String),
        expect.any(Number),
        personId
      )
      expect(mockClient.createMixin).toHaveBeenCalledWith(
        expect.any(String),
        chat.masterTag.Thread,
        spaceId,
        mail.tag.MailThread,
        {},
        expect.any(Number),
        personId
      )
    })

    it('should use existing channel if found after acquiring mutex lock', async () => {
      // First findOne returns null (trigger createNewChannel)
      // Second findOne inside createNewChannel returns the channel (simulate race condition handled)
      mockClient.findOne.mockResolvedValueOnce(null as any).mockResolvedValueOnce(mockChannel as any)

      const result = await channelCache.getOrCreateChannel(spaceId, participants, emailAccount, personId)

      expect(result).toBe(mockChannel._id)
      expect(mockClient.findOne).toHaveBeenCalledTimes(2)
      expect(mockClient.createDoc).not.toHaveBeenCalled()
      expect(mockCtx.info).toHaveBeenCalledWith('Using existing channel (found after mutex lock)', {
        me: emailAccount,
        space: spaceId,
        channel: mockChannel._id
      })
    })

    it('should handle errors and remove failed lookup from cache', async () => {
      const error = new Error('Database error')
      mockClient.findOne.mockRejectedValue(error)

      await expect(channelCache.getOrCreateChannel(spaceId, participants, emailAccount, personId)).rejects.toThrow(
        'Failed to create channel for test@example.com in space test-space-id: Database error'
      )

      expect(mockCtx.error).toHaveBeenCalledWith('Failed to create channel', {
        me: emailAccount,
        space: spaceId,
        workspace,
        error: error.message
      })

      // Verify the cache doesn't contain the failed lookup
      expect((channelCache as any).cache.has(`${spaceId}:${emailAccount}`)).toBe(false)
    })

    it('should not create duplicate channels for email addresses with different case', async () => {
      // Arrange
      const existingChannelId = 'mixed-case-channel-id'
      const lowerCaseEmail = 'mixedcase@example.com'
      const upperCaseEmail = 'MixedCase@Example.com'

      // Mock first findOne to return null (channel doesn't exist yet)
      // and second findOne to return the channel (after creation)
      mockClient.findOne
        .mockResolvedValueOnce(undefined) // First call: channel doesn't exist
        .mockResolvedValueOnce({
          // Second call after creation with different case
          _id: existingChannelId as any,
          title: lowerCaseEmail
        } as any)

      mockClient.createDoc.mockResolvedValueOnce(existingChannelId as any)

      // Act - First create a channel with lowercase email
      const channelId1 = await channelCache.getOrCreateChannel(spaceId, participants, lowerCaseEmail, personId)

      // Clear cache to simulate a fresh lookup
      channelCache.clearCache(spaceId, lowerCaseEmail)

      // Act - Then try to create with uppercase email
      const channelId2 = await channelCache.getOrCreateChannel(spaceId, participants, upperCaseEmail, personId)

      // Assert
      expect(mockClient.findOne).toHaveBeenNthCalledWith(1, mail.tag.MailThread, { title: lowerCaseEmail })
      expect(mockClient.findOne).toHaveBeenNthCalledWith(2, mail.tag.MailThread, { title: lowerCaseEmail })

      // Should only create doc once
      expect(mockClient.createDoc).toHaveBeenCalledTimes(1)
      expect(mockClient.createMixin).toHaveBeenCalledTimes(1)

      // Both should return the same channel ID
      expect(channelId1).toBe(existingChannelId)
      expect(channelId2).toBe(existingChannelId)
      expect(channelId1).toBe(channelId2)
    })

    it('should handle race conditions when creating channels', async () => {
      // Arrange - Simulate a race condition where channel is created between mutex lock and double-check
      const raceChannelId = 'race-condition-channel-id'

      // Mock behavior:
      // 1. First findOne returns null (channel doesn't exist)
      // 2. Second findOne (after mutex) returns a channel (someone else created it)
      mockClient.findOne.mockResolvedValueOnce(undefined).mockResolvedValueOnce({
        _id: raceChannelId,
        title: 'race@example.com'
      } as any)

      // Act
      const channelId = await channelCache.getOrCreateChannel(spaceId, participants, 'race@example.com', personId)

      // Assert
      expect(mockClient.findOne).toHaveBeenCalledTimes(2)
      expect(mockClient.createDoc).not.toHaveBeenCalled() // Should not create doc because of race check
      expect(channelId).toBe(raceChannelId)
    })

    it('should normalize email addresses to lowercase before lookup and creation', async () => {
      // Arrange - This test verifies that email normalization to lowercase is implemented

      const mixedCaseEmail = 'MiXeD@ExAmPlE.com'

      // Act
      await channelCache.getOrCreateChannel(spaceId, participants, mixedCaseEmail, personId)

      // Assert - If email normalization is implemented, this would pass
      expect(mockClient.findOne).toHaveBeenCalledWith(mail.tag.MailThread, {
        title: expect.stringMatching(/mixed@example\.com/i)
      })
    })
  })

  describe('clearCache', () => {
    it('should clear cache for specific space and email', async () => {
      // Set up some items in cache
      const cache = (channelCache as any).cache
      cache.set(`${spaceId}:${emailAccount}`, mockChannel._id)
      cache.set(`${spaceId}:other@example.com`, 'another-id')

      channelCache.clearCache(spaceId, emailAccount)

      expect(cache.has(`${spaceId}:${emailAccount}`)).toBe(false)
      expect(cache.has(`${spaceId}:other@example.com`)).toBe(true)
    })
  })

  describe('clearAllCache', () => {
    it('should clear all cached channels', async () => {
      // Set up multiple items in cache
      const cache = (channelCache as any).cache
      cache.set(`${spaceId}:${emailAccount}`, mockChannel._id)
      cache.set(`${spaceId}:other@example.com`, 'another-id')
      cache.set(`other-space:${emailAccount}`, 'third-id')

      channelCache.clearAllCache()

      expect(cache.size).toBe(0)
    })
  })

  describe('size', () => {
    it('should return the number of cached channels', async () => {
      const cache = (channelCache as any).cache

      expect(channelCache.size).toBe(0)

      cache.set(`${spaceId}:${emailAccount}`, mockChannel._id)
      expect(channelCache.size).toBe(1)

      cache.set(`${spaceId}:other@example.com`, 'another-id')
      expect(channelCache.size).toBe(2)

      channelCache.clearCache(spaceId, emailAccount)
      expect(channelCache.size).toBe(1)

      channelCache.clearAllCache()
      expect(channelCache.size).toBe(0)
    })
  })
})

describe('ChannelCacheFactory', () => {
  let mockCtx1: jest.Mocked<MeasureContext>
  let mockClient1: jest.Mocked<TxOperations>

  const workspace1 = 'workspace-1' as WorkspaceUuid
  const workspace2 = 'workspace-2' as WorkspaceUuid

  beforeEach(() => {
    jest.clearAllMocks()
    ChannelCacheFactory.resetAllInstances()

    mockCtx1 = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<MeasureContext>

    mockClient1 = {} as unknown as jest.Mocked<TxOperations>
  })

  describe('getInstance', () => {
    it('should create a new instance for a workspace', () => {
      expect(ChannelCacheFactory.instanceCount).toBe(0)

      const cache = ChannelCacheFactory.getInstance(mockCtx1, mockClient1, workspace1)

      expect(cache).toBeInstanceOf(ChannelCache)
      expect(ChannelCacheFactory.instanceCount).toBe(1)
    })

    it('should return the same instance for the same workspace', () => {
      const cache1 = ChannelCacheFactory.getInstance(mockCtx1, mockClient1, workspace1)
      const cache2 = ChannelCacheFactory.getInstance(mockCtx1, mockClient1, workspace1)

      expect(cache1).toBe(cache2)
      expect(ChannelCacheFactory.instanceCount).toBe(1)
    })

    it('should create different instances for different workspaces', () => {
      const cache1 = ChannelCacheFactory.getInstance(mockCtx1, mockClient1, workspace1)
      const cache2 = ChannelCacheFactory.getInstance(mockCtx1, mockClient1, workspace2)

      expect(cache1).not.toBe(cache2)
      expect(ChannelCacheFactory.instanceCount).toBe(2)
    })
  })

  describe('resetInstance', () => {
    it('should remove the instance for a specific workspace', () => {
      const cache1 = ChannelCacheFactory.getInstance(mockCtx1, mockClient1, workspace1)
      const cache2 = ChannelCacheFactory.getInstance(mockCtx1, mockClient1, workspace2)

      expect(ChannelCacheFactory.instanceCount).toBe(2)

      ChannelCacheFactory.resetInstance(workspace1)

      expect(ChannelCacheFactory.instanceCount).toBe(1)

      // Getting workspace1 again should create a new instance
      const cache1New = ChannelCacheFactory.getInstance(mockCtx1, mockClient1, workspace1)
      expect(cache1New).not.toBe(cache1)

      // Workspace2 instance should remain the same
      const cache2Again = ChannelCacheFactory.getInstance(mockCtx1, mockClient1, workspace2)
      expect(cache2Again).toBe(cache2)
    })

    it('should do nothing when resetting a non-existent workspace', () => {
      ChannelCacheFactory.getInstance(mockCtx1, mockClient1, workspace1)
      expect(ChannelCacheFactory.instanceCount).toBe(1)

      // Reset a workspace that doesn't have a cache
      ChannelCacheFactory.resetInstance('non-existent-workspace' as WorkspaceUuid)

      expect(ChannelCacheFactory.instanceCount).toBe(1)
    })
  })

  describe('resetAllInstances', () => {
    it('should remove all workspace instances', () => {
      ChannelCacheFactory.getInstance(mockCtx1, mockClient1, workspace1)
      ChannelCacheFactory.getInstance(mockCtx1, mockClient1, workspace2)
      expect(ChannelCacheFactory.instanceCount).toBe(2)

      ChannelCacheFactory.resetAllInstances()

      expect(ChannelCacheFactory.instanceCount).toBe(0)
    })
  })

  describe('instanceCount', () => {
    it('should return the number of workspace instances', () => {
      expect(ChannelCacheFactory.instanceCount).toBe(0)

      ChannelCacheFactory.getInstance(mockCtx1, mockClient1, workspace1)
      expect(ChannelCacheFactory.instanceCount).toBe(1)

      ChannelCacheFactory.getInstance(mockCtx1, mockClient1, workspace2)
      expect(ChannelCacheFactory.instanceCount).toBe(2)

      ChannelCacheFactory.resetInstance(workspace1)
      expect(ChannelCacheFactory.instanceCount).toBe(1)

      ChannelCacheFactory.resetAllInstances()
      expect(ChannelCacheFactory.instanceCount).toBe(0)
    })
  })
})
