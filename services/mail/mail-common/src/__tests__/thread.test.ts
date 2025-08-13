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

import { MeasureContext, Ref } from '@hcengineering/core'
import { KeyValueClient } from '@hcengineering/kvs-client'
import { Card } from '@hcengineering/card'
import { PersonSpace } from '@hcengineering/contact'
import { ThreadLookupService, ThreadInfo } from '../thread'

describe('ThreadLookupService', () => {
  // Test constants
  const TOKEN = 'test-token'
  const MAIL_ID = 'test-mail-id'
  const SPACE_ID = 'test-space-id' as Ref<PersonSpace>
  const THREAD_ID = 'test-thread-id' as Ref<Card>
  const EMAIL = 'test@example.com'
  const KEY = `mail-thread-lookup:${MAIL_ID}:${SPACE_ID}:${EMAIL}`

  // Mocks
  let mockCtx: MeasureContext
  let mockKeyValueClient: jest.Mocked<KeyValueClient>

  beforeEach(() => {
    // Reset module between tests
    jest.resetModules()

    // Create mock context
    mockCtx = {
      info: jest.fn(),
      error: jest.fn()
    } as unknown as MeasureContext

    // Create mock KeyValueClient
    mockKeyValueClient = {
      getValue: jest.fn(),
      setValue: jest.fn(),
      deleteKey: jest.fn(),
      listKeys: jest.fn()
    } as unknown as jest.Mocked<KeyValueClient>
  })

  afterEach(() => {
    // Clear all mocks and restore Date.now
    jest.clearAllMocks()
    jest.restoreAllMocks()
    ThreadLookupService.resetAllInstances()
  })

  describe('getInstance', () => {
    it('should create a new instance when none exists for the token', () => {
      const service = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, TOKEN)

      expect(service).toBeInstanceOf(ThreadLookupService)
    })

    it('should reuse existing instance when called multiple times with same token', () => {
      const service1 = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, TOKEN)
      const service2 = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, TOKEN)

      expect(service1).toBe(service2)
    })

    it('should create different instances for different tokens', () => {
      const service1 = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, TOKEN)
      const service2 = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, 'different-token')

      expect(service1).not.toBe(service2)
    })

    it('should return new instance after resetting a specific instance', () => {
      const service1 = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, TOKEN)
      ThreadLookupService.resetInstance(TOKEN)
      const service2 = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, TOKEN)

      expect(service1).not.toBe(service2)
    })
  })

  describe('getThreadId', () => {
    it('should return thread ID when mapping exists', async () => {
      // Setup mock response
      const mockLookup: ThreadInfo = {
        threadId: THREAD_ID
      }

      mockKeyValueClient.getValue.mockResolvedValue(mockLookup)

      // Get service and call method
      const service = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, TOKEN)
      const result = await service.getThreadId(MAIL_ID, SPACE_ID, EMAIL)

      // Verify behavior
      expect(mockKeyValueClient.getValue).toHaveBeenCalledWith(KEY)
      expect(result).toBe(THREAD_ID)
      expect(mockCtx.info).toHaveBeenCalledWith(
        'Found existing thread mapping',
        expect.objectContaining({
          mailId: MAIL_ID,
          spaceId: SPACE_ID,
          threadId: THREAD_ID,
          email: EMAIL
        })
      )
    })

    it('should return undefined when mapping does not exist', async () => {
      // Setup mock response for no mapping
      mockKeyValueClient.getValue.mockResolvedValue(null)

      // Get service and call method
      const service = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, TOKEN)
      const result = await service.getThreadId(MAIL_ID, SPACE_ID, EMAIL)

      // Verify behavior
      expect(mockKeyValueClient.getValue).toHaveBeenCalledWith(KEY)
      expect(result).toBeUndefined()
      expect(mockCtx.info).not.toHaveBeenCalled()
    })

    it('should handle errors and return undefined', async () => {
      // Setup mock error
      const mockError = new Error('Test error')
      mockKeyValueClient.getValue.mockRejectedValue(mockError)

      // Get service and call method
      const service = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, TOKEN)
      const result = await service.getThreadId(MAIL_ID, SPACE_ID, EMAIL)

      // Verify behavior
      expect(mockKeyValueClient.getValue).toHaveBeenCalledWith(KEY)
      expect(result).toBeUndefined()
      expect(mockCtx.error).toHaveBeenCalledWith(
        'Failed to lookup thread for email',
        expect.objectContaining({
          mailId: MAIL_ID,
          spaceId: SPACE_ID,
          error: mockError
        })
      )
    })
  })

  describe('setThreadId', () => {
    it('should store thread mapping in KVS', async () => {
      // Get service and call method
      const service = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, TOKEN)
      await service.setThreadId(MAIL_ID, SPACE_ID, THREAD_ID, EMAIL)

      // Verify behavior
      expect(mockKeyValueClient.setValue).toHaveBeenCalledWith(KEY, {
        threadId: THREAD_ID
      })

      expect(mockCtx.info).toHaveBeenCalledWith(
        'Saved thread mapping',
        expect.objectContaining({
          mailId: MAIL_ID,
          spaceId: SPACE_ID,
          threadId: THREAD_ID
        })
      )
    })

    it('should handle errors when storing thread mapping', async () => {
      // Setup mock error
      const mockError = new Error('Test error')
      mockKeyValueClient.setValue.mockRejectedValue(mockError)

      // Get service and call method
      const service = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, TOKEN)
      await service.setThreadId(MAIL_ID, SPACE_ID, THREAD_ID, EMAIL)

      // Verify behavior
      expect(mockKeyValueClient.setValue).toHaveBeenCalledWith(KEY, expect.any(Object))
      expect(mockCtx.error).toHaveBeenCalledWith(
        'Failed to save thread mapping',
        expect.objectContaining({
          mailId: MAIL_ID,
          spaceId: SPACE_ID,
          threadId: THREAD_ID,
          error: mockError
        })
      )
    })
  })

  describe('getParentThreadId', () => {
    it('should return undefined when inReplyTo is undefined', async () => {
      // Get service and call method
      const service = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, TOKEN)
      const result = await service.getParentThreadId(undefined, SPACE_ID, EMAIL)

      // Verify behavior
      expect(result).toBeUndefined()
      expect(mockKeyValueClient.getValue).not.toHaveBeenCalled()
    })

    it('should call getThreadId with inReplyTo when defined', async () => {
      // Setup mock for getThreadId
      const REPLY_TO = 'parent-mail-id'
      const PARENT_THREAD_ID = 'parent-thread-id' as Ref<Card>

      mockKeyValueClient.getValue.mockResolvedValue({
        threadId: PARENT_THREAD_ID
      })

      // Get service and call method
      const service = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, TOKEN)
      const result = await service.getParentThreadId(REPLY_TO, SPACE_ID, EMAIL)

      // Verify behavior
      expect(mockKeyValueClient.getValue).toHaveBeenCalledWith(`mail-thread-lookup:${REPLY_TO}:${SPACE_ID}:${EMAIL}`)
      expect(result).toBe(PARENT_THREAD_ID)
    })
  })

  describe('deleteMapping', () => {
    it('should delete mapping from KVS', async () => {
      // Get service and call method
      const service = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, TOKEN)
      await service.deleteMapping(MAIL_ID, SPACE_ID, EMAIL)

      // Verify behavior
      expect(mockKeyValueClient.deleteKey).toHaveBeenCalledWith(KEY)
      expect(mockCtx.info).toHaveBeenCalledWith(
        'Deleted thread mapping',
        expect.objectContaining({
          mailId: MAIL_ID,
          spaceId: SPACE_ID
        })
      )
    })

    it('should handle errors when deleting mapping', async () => {
      // Setup mock error
      const mockError = new Error('Test error')
      mockKeyValueClient.deleteKey.mockRejectedValue(mockError)

      // Get service and call method
      const service = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, TOKEN)
      await service.deleteMapping(MAIL_ID, SPACE_ID, EMAIL)

      // Verify behavior
      expect(mockKeyValueClient.deleteKey).toHaveBeenCalledWith(KEY)
      expect(mockCtx.error).toHaveBeenCalledWith(
        'Failed to delete thread mapping',
        expect.objectContaining({
          mailId: MAIL_ID,
          spaceId: SPACE_ID,
          error: mockError
        })
      )
    })
  })

  describe('resetInstance and resetAllInstances', () => {
    it('should reset a specific instance', () => {
      const token1 = 'token1'
      const token2 = 'token2'

      // Create two instances with different tokens
      const service1 = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, token1)
      const service2 = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, token2)

      // Reset only one instance
      ThreadLookupService.resetInstance(token1)

      // Get instances again
      const service1After = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, token1)
      const service2After = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, token2)

      // First instance should be new, second should be the same
      expect(service1).not.toBe(service1After)
      expect(service2).toBe(service2After)
    })

    it('should reset all instances', () => {
      const token1 = 'token1'
      const token2 = 'token2'

      // Create two instances with different tokens
      const service1 = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, token1)
      const service2 = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, token2)

      // Reset all instances
      ThreadLookupService.resetAllInstances()

      // Get instances again
      const service1After = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, token1)
      const service2After = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient, token2)

      // Both instances should be new
      expect(service1).not.toBe(service1After)
      expect(service2).not.toBe(service2After)
    })
  })
})
