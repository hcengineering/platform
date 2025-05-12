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

import { MeasureContext, PersonUuid, PersonId, WorkspaceUuid } from '@hcengineering/core'
import { RestClient } from '@hcengineering/api-client'
import { PersonCache, PersonCacheFactory, CachedPerson } from '../person'
import { EmailContact } from '../types'

describe('PersonCacheFactory', () => {
  let mockCtx1: jest.Mocked<MeasureContext>
  let mockCtx2: jest.Mocked<MeasureContext>
  let mockRestClient1: jest.Mocked<RestClient>
  let mockRestClient2: jest.Mocked<RestClient>

  const workspace1 = 'workspace-1' as WorkspaceUuid
  const workspace2 = 'workspace-2' as WorkspaceUuid

  const mockContact: EmailContact = {
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User'
  }

  const mockPerson: CachedPerson = {
    socialId: 'test-social-id' as PersonId,
    uuid: 'test-uuid' as PersonUuid,
    localPerson: 'test-local-id'
  }

  beforeEach(() => {
    // Reset all instances before each test
    PersonCacheFactory.resetAllInstances()

    // Set up mocks
    mockCtx1 = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<MeasureContext>

    mockCtx2 = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<MeasureContext>

    mockRestClient1 = {
      ensurePerson: jest.fn().mockResolvedValue(mockPerson)
    } as unknown as jest.Mocked<RestClient>

    mockRestClient2 = {
      ensurePerson: jest.fn().mockResolvedValue({
        ...mockPerson,
        uuid: 'different-uuid' as PersonUuid
      })
    } as unknown as jest.Mocked<RestClient>
  })

  describe('getInstance', () => {
    it('should create a new instance for a workspace', () => {
      expect(PersonCacheFactory.instanceCount).toBe(0)

      const cache = PersonCacheFactory.getInstance(mockCtx1, mockRestClient1, workspace1)

      expect(cache).toBeInstanceOf(PersonCache)
      expect(PersonCacheFactory.instanceCount).toBe(1)
    })

    it('should return the same instance for the same workspace', () => {
      const cache1 = PersonCacheFactory.getInstance(mockCtx1, mockRestClient1, workspace1)
      const cache2 = PersonCacheFactory.getInstance(mockCtx1, mockRestClient1, workspace1)

      expect(cache1).toBe(cache2)
      expect(PersonCacheFactory.instanceCount).toBe(1)
    })

    it('should create different instances for different workspaces', () => {
      const cache1 = PersonCacheFactory.getInstance(mockCtx1, mockRestClient1, workspace1)
      const cache2 = PersonCacheFactory.getInstance(mockCtx1, mockRestClient1, workspace2)

      expect(cache1).not.toBe(cache2)
      expect(PersonCacheFactory.instanceCount).toBe(2)
    })

    it('should use the first context and client for subsequent calls with the same workspace', async () => {
      // First instance with first context and client
      const cache1 = PersonCacheFactory.getInstance(mockCtx1, mockRestClient1, workspace1)

      // Try to get instance with different context and client, but same workspace
      const cache2 = PersonCacheFactory.getInstance(mockCtx2, mockRestClient2, workspace1)

      // Should be the same instance
      expect(cache1).toBe(cache2)

      // Test that it uses the first client, not the second
      await cache2.ensurePerson(mockContact)
      expect(mockRestClient1.ensurePerson).toHaveBeenCalled()
      expect(mockRestClient2.ensurePerson).not.toHaveBeenCalled()

      // Now get a different workspace with second client
      const cache3 = PersonCacheFactory.getInstance(mockCtx2, mockRestClient2, workspace2)
      await cache3.ensurePerson(mockContact)

      // Second client should be used for second workspace
      expect(mockRestClient2.ensurePerson).toHaveBeenCalled()
    })
  })

  describe('resetInstance', () => {
    it('should remove the instance for a specific workspace', () => {
      const cache1 = PersonCacheFactory.getInstance(mockCtx1, mockRestClient1, workspace1)
      const cache2 = PersonCacheFactory.getInstance(mockCtx1, mockRestClient1, workspace2)

      expect(PersonCacheFactory.instanceCount).toBe(2)

      PersonCacheFactory.resetInstance(workspace1)

      expect(PersonCacheFactory.instanceCount).toBe(1)

      // Getting workspace1 again should create a new instance
      const cache1New = PersonCacheFactory.getInstance(mockCtx1, mockRestClient1, workspace1)
      expect(cache1New).not.toBe(cache1)

      // Workspace2 instance should remain the same
      const cache2Again = PersonCacheFactory.getInstance(mockCtx1, mockRestClient1, workspace2)
      expect(cache2Again).toBe(cache2)
    })

    it('should do nothing when resetting a non-existent workspace', () => {
      PersonCacheFactory.getInstance(mockCtx1, mockRestClient1, workspace1)
      expect(PersonCacheFactory.instanceCount).toBe(1)

      // Reset a workspace that doesn't have a cache
      PersonCacheFactory.resetInstance('non-existent-workspace' as WorkspaceUuid)

      expect(PersonCacheFactory.instanceCount).toBe(1)
    })
  })

  describe('resetAllInstances', () => {
    it('should remove all workspace instances', () => {
      PersonCacheFactory.getInstance(mockCtx1, mockRestClient1, workspace1)
      PersonCacheFactory.getInstance(mockCtx1, mockRestClient1, workspace2)
      expect(PersonCacheFactory.instanceCount).toBe(2)

      PersonCacheFactory.resetAllInstances()

      expect(PersonCacheFactory.instanceCount).toBe(0)
    })
  })

  describe('instanceCount', () => {
    it('should return the number of workspace instances', () => {
      expect(PersonCacheFactory.instanceCount).toBe(0)

      PersonCacheFactory.getInstance(mockCtx1, mockRestClient1, workspace1)
      expect(PersonCacheFactory.instanceCount).toBe(1)

      PersonCacheFactory.getInstance(mockCtx1, mockRestClient1, workspace2)
      expect(PersonCacheFactory.instanceCount).toBe(2)

      PersonCacheFactory.resetInstance(workspace1)
      expect(PersonCacheFactory.instanceCount).toBe(1)

      PersonCacheFactory.resetAllInstances()
      expect(PersonCacheFactory.instanceCount).toBe(0)
    })
  })

  describe('integration with PersonCache', () => {
    it('should maintain separate caches for each workspace', async () => {
      const cache1 = PersonCacheFactory.getInstance(mockCtx1, mockRestClient1, workspace1)
      const cache2 = PersonCacheFactory.getInstance(mockCtx2, mockRestClient2, workspace2)

      // Populate cache for workspace1
      await cache1.ensurePerson(mockContact)
      expect(mockRestClient1.ensurePerson).toHaveBeenCalledTimes(1)
      mockRestClient1.ensurePerson.mockClear()

      // Accessing the same contact in workspace1 should use cache
      await cache1.ensurePerson(mockContact)
      expect(mockRestClient1.ensurePerson).toHaveBeenCalledTimes(0)

      // Accessing the same contact in workspace2 should make a new API call
      // since it has a separate cache
      await cache2.ensurePerson(mockContact)
      expect(mockRestClient2.ensurePerson).toHaveBeenCalledTimes(1)
    })

    it('should allow clearing cache for a specific workspace', async () => {
      const cache1 = PersonCacheFactory.getInstance(mockCtx1, mockRestClient1, workspace1)
      const cache2 = PersonCacheFactory.getInstance(mockCtx2, mockRestClient2, workspace2)

      // Populate caches
      await cache1.ensurePerson(mockContact)
      await cache2.ensurePerson(mockContact)

      mockRestClient1.ensurePerson.mockClear()
      mockRestClient2.ensurePerson.mockClear()

      // Clear cache for workspace1
      cache1.clearCache()

      // Accessing contact in workspace1 should make a new API call
      await cache1.ensurePerson(mockContact)
      expect(mockRestClient1.ensurePerson).toHaveBeenCalledTimes(1)

      // Accessing contact in workspace2 should still use cache
      await cache2.ensurePerson(mockContact)
      expect(mockRestClient2.ensurePerson).toHaveBeenCalledTimes(0)
    })
  })
})
