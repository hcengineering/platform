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

import { MeasureContext, Ref, PersonId } from '@hcengineering/core'
import { KeyValueClient } from '@hcengineering/kvs-client'
import { Card } from '@hcengineering/card'
import { PersonSpace } from '@hcengineering/contact'
import { ThreadLookupService, ThreadLookupInfo } from '../thread'

describe('ThreadLookupService', () => {
  // Test constants
  const WORKSPACE = 'test-workspace'
  const MAIL_ID = 'test-mail-id'
  const SPACE_ID = 'test-space-id' as Ref<PersonSpace>
  const THREAD_ID = 'test-thread-id' as Ref<Card>
  const OWNER_ID = 'test-owner-id' as PersonId
  const TIMESTAMP = 1620000000000
  const KEY = `mail-thread-lookup:${WORKSPACE}:${MAIL_ID}:${SPACE_ID}`

  // Mocks
  let mockCtx: MeasureContext
  let mockKeyValueClient: jest.Mocked<KeyValueClient>

  beforeEach(() => {
    // Reset module between tests
    jest.resetModules()

    // Mock Date.now() to return a consistent timestamp
    jest.spyOn(Date, 'now').mockImplementation(() => TIMESTAMP)

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
  })

  describe('getInstance', () => {
    it('should create a new instance when none exists', () => {
      const service = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient)

      expect(service).toBeInstanceOf(ThreadLookupService)
    })

    it('should reuse existing instance when called multiple times', () => {
      const service1 = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient)
      const service2 = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient)

      expect(service1).toBe(service2)
    })
  })

  describe('getThreadId', () => {
    it('should return thread ID when mapping exists', async () => {
      // Setup mock response
      const mockLookup: ThreadLookupInfo = {
        mailId: MAIL_ID,
        spaceId: SPACE_ID,
        threadId: THREAD_ID,
        timestamp: TIMESTAMP
      }

      mockKeyValueClient.getValue.mockResolvedValue(mockLookup)

      // Get service and call method
      const service = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient)
      const result = await service.getThreadId(WORKSPACE, MAIL_ID, SPACE_ID)

      // Verify behavior
      expect(mockKeyValueClient.getValue).toHaveBeenCalledWith(KEY)
      expect(result).toBe(THREAD_ID)
      expect(mockCtx.info).toHaveBeenCalledWith(
        'Found existing thread mapping',
        expect.objectContaining({
          workspace: WORKSPACE,
          mailId: MAIL_ID,
          threadId: THREAD_ID
        })
      )
    })

    it('should return undefined when mapping does not exist', async () => {
      // Setup mock response for no mapping
      mockKeyValueClient.getValue.mockResolvedValue(null)

      // Get service and call method
      const service = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient)
      const result = await service.getThreadId(WORKSPACE, MAIL_ID, SPACE_ID)

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
      const service = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient)
      const result = await service.getThreadId(WORKSPACE, MAIL_ID, SPACE_ID)

      // Verify behavior
      expect(mockKeyValueClient.getValue).toHaveBeenCalledWith(KEY)
      expect(result).toBeUndefined()
      expect(mockCtx.error).toHaveBeenCalledWith(
        'Failed to lookup thread for email',
        expect.objectContaining({
          workspace: WORKSPACE,
          mailId: MAIL_ID,
          error: mockError
        })
      )
    })
  })

  describe('setThreadId', () => {
    it('should store thread mapping in KVS', async () => {
      // Get service and call method
      const service = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient)
      await service.setThreadId(WORKSPACE, MAIL_ID, SPACE_ID, THREAD_ID, OWNER_ID)

      // Verify behavior
      expect(mockKeyValueClient.setValue).toHaveBeenCalledWith(KEY, {
        mailId: MAIL_ID,
        spaceId: SPACE_ID,
        threadId: THREAD_ID,
        timestamp: TIMESTAMP
      })

      expect(mockCtx.info).toHaveBeenCalledWith(
        'Saved thread mapping',
        expect.objectContaining({
          workspace: WORKSPACE,
          mailId: MAIL_ID,
          spaceId: SPACE_ID,
          threadId: THREAD_ID,
          timestamp: TIMESTAMP
        })
      )
    })

    it('should handle errors when storing thread mapping', async () => {
      // Setup mock error
      const mockError = new Error('Test error')
      mockKeyValueClient.setValue.mockRejectedValue(mockError)

      // Get service and call method
      const service = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient)
      await service.setThreadId(WORKSPACE, MAIL_ID, SPACE_ID, THREAD_ID, OWNER_ID)

      // Verify behavior
      expect(mockKeyValueClient.setValue).toHaveBeenCalledWith(KEY, expect.any(Object))
      expect(mockCtx.error).toHaveBeenCalledWith(
        'Failed to save thread mapping',
        expect.objectContaining({
          workspace: WORKSPACE,
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
      const service = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient)
      const result = await service.getParentThreadId(WORKSPACE, undefined, SPACE_ID)

      // Verify behavior
      expect(result).toBeUndefined()
      expect(mockKeyValueClient.getValue).not.toHaveBeenCalled()
    })

    it('should call getThreadId with inReplyTo when defined', async () => {
      // Setup mock for getThreadId
      const REPLY_TO = 'parent-mail-id'
      const PARENT_THREAD_ID = 'parent-thread-id' as Ref<Card>

      mockKeyValueClient.getValue.mockResolvedValue({
        mailId: REPLY_TO,
        spaceId: SPACE_ID,
        threadId: PARENT_THREAD_ID,
        timestamp: TIMESTAMP
      })

      // Get service and call method
      const service = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient)
      const result = await service.getParentThreadId(WORKSPACE, REPLY_TO, SPACE_ID)

      // Verify behavior
      expect(mockKeyValueClient.getValue).toHaveBeenCalledWith(
        `mail-thread-lookup:${WORKSPACE}:${REPLY_TO}:${SPACE_ID}`
      )
      expect(result).toBe(PARENT_THREAD_ID)
    })
  })

  describe('deleteMapping', () => {
    it('should delete mapping from KVS', async () => {
      // Get service and call method
      const service = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient)
      await service.deleteMapping(WORKSPACE, MAIL_ID, SPACE_ID)

      // Verify behavior
      expect(mockKeyValueClient.deleteKey).toHaveBeenCalledWith(KEY)
      expect(mockCtx.info).toHaveBeenCalledWith(
        'Deleted thread mapping',
        expect.objectContaining({
          workspace: WORKSPACE,
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
      const service = ThreadLookupService.getInstance(mockCtx, mockKeyValueClient)
      await service.deleteMapping(WORKSPACE, MAIL_ID, SPACE_ID)

      // Verify behavior
      expect(mockKeyValueClient.deleteKey).toHaveBeenCalledWith(KEY)
      expect(mockCtx.error).toHaveBeenCalledWith(
        'Failed to delete thread mapping',
        expect.objectContaining({
          workspace: WORKSPACE,
          mailId: MAIL_ID,
          spaceId: SPACE_ID,
          error: mockError
        })
      )
    })
  })
})
