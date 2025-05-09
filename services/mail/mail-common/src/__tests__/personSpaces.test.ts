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

import {
  MeasureContext,
  PersonUuid,
  TxOperations,
  WorkspaceUuid,
  Ref,
  Doc,
  Space,
  toFindResult
} from '@hcengineering/core'
import contact, { PersonSpace } from '@hcengineering/contact'
import { PersonSpacesCache, PersonSpacesCacheFactory } from '../personSpaces'

/* eslint-disable @typescript-eslint/unbound-method */
describe('PersonSpacesCache', () => {
  let mockCtx: jest.Mocked<MeasureContext>
  let mockClient: jest.Mocked<TxOperations>
  let personSpacesCache: PersonSpacesCache

  const workspace = 'test-workspace' as WorkspaceUuid
  const mailId = 'test-mail-id'
  const personUuid = 'test-person-uuid' as PersonUuid
  const email = 'test@example.com'

  const mockPerson: Doc<Space> = { _id: 'person1' as Ref<any> } as any
  const mockPersonSpaces: PersonSpace[] = [
    { _id: 'space1', person: mockPerson._id } as unknown as PersonSpace,
    { _id: 'space2', person: mockPerson._id } as unknown as PersonSpace
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    mockCtx = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<MeasureContext>

    mockClient = {
      findAll: jest.fn()
    } as unknown as jest.Mocked<TxOperations>

    mockClient.findAll.mockImplementation((_class, _query, _options) => {
      if (_class === contact.class.Person) {
        return Promise.resolve(toFindResult([mockPerson]))
      }
      if (_class === contact.class.PersonSpace) {
        return Promise.resolve(toFindResult(mockPersonSpaces))
      }
      return Promise.resolve(toFindResult([]))
    })

    personSpacesCache = new PersonSpacesCache(mockCtx, mockClient, workspace)
  })

  describe('getPersonSpaces', () => {
    it('should fetch person spaces from the database on first call', async () => {
      const spaces = await personSpacesCache.getPersonSpaces(mailId, personUuid, email)

      expect(spaces).toEqual(mockPersonSpaces)
      expect(mockClient.findAll).toHaveBeenCalledTimes(2)
      expect(mockClient.findAll).toHaveBeenCalledWith(contact.class.Person, { personUuid }, { projection: { _id: 1 } })
      expect(mockClient.findAll).toHaveBeenCalledWith(contact.class.PersonSpace, { person: { $in: [mockPerson._id] } })
    })

    it('should return cached spaces on subsequent calls', async () => {
      await personSpacesCache.getPersonSpaces(mailId, personUuid, email)
      mockClient.findAll.mockClear()

      const spaces = await personSpacesCache.getPersonSpaces(mailId, personUuid, email)

      expect(spaces).toEqual(mockPersonSpaces)
      expect(mockClient.findAll).not.toHaveBeenCalled()
    })

    it('should warn when no spaces are found', async () => {
      mockClient.findAll.mockImplementation((clazz) => {
        if (clazz === contact.class.Person) {
          return Promise.resolve(toFindResult([mockPerson]))
        }
        if (clazz === contact.class.PersonSpace) {
          return Promise.resolve(toFindResult([]))
        }
        return Promise.resolve(toFindResult([]))
      })

      const spaces = await personSpacesCache.getPersonSpaces(mailId, personUuid, email)

      expect(spaces.length).toEqual(0)
      expect(mockCtx.warn).toHaveBeenCalledWith('No personal space found, skip', {
        mailId,
        personUuid,
        email,
        workspace
      })
    })

    it('should handle errors and remove failed lookups from cache', async () => {
      const error = new Error('Database error')
      mockClient.findAll.mockRejectedValueOnce(error)

      await expect(personSpacesCache.getPersonSpaces(mailId, personUuid, email)).rejects.toThrow(error)

      expect(mockCtx.error).toHaveBeenCalledWith('Error fetching person spaces', {
        mailId,
        personUuid,
        email,
        workspace,
        error: error.message
      })

      // Verify the cache entry was removed
      mockClient.findAll.mockImplementation((clazz) => {
        if (clazz === contact.class.Person) {
          return Promise.resolve(toFindResult([mockPerson]))
        }
        if (clazz === contact.class.PersonSpace) {
          return Promise.resolve(toFindResult(mockPersonSpaces))
        }
        return Promise.resolve(toFindResult([]))
      })

      // Next call should try again
      await personSpacesCache.getPersonSpaces(mailId, personUuid, email)
      expect(mockClient.findAll).toHaveBeenCalledTimes(3)
    })
  })

  describe('clearPersonCache', () => {
    it('should clear the cache for a specific person', async () => {
      // Populate cache
      await personSpacesCache.getPersonSpaces(mailId, personUuid, email)
      mockClient.findAll.mockClear()

      // Clear cache for this person
      personSpacesCache.clearPersonCache(personUuid)

      // Next call should fetch from database again
      await personSpacesCache.getPersonSpaces(mailId, personUuid, email)
      expect(mockClient.findAll).toHaveBeenCalledTimes(2)
    })
  })

  describe('clearCache', () => {
    it('should clear the entire cache', async () => {
      // Populate cache
      await personSpacesCache.getPersonSpaces(mailId, personUuid, email)
      mockClient.findAll.mockClear()

      // Clear all cache
      personSpacesCache.clearCache()

      // Next call should fetch from database again
      await personSpacesCache.getPersonSpaces(mailId, personUuid, email)
      expect(mockClient.findAll).toHaveBeenCalledTimes(2)
    })
  })

  describe('size', () => {
    it('should return the number of cached entries', async () => {
      expect(personSpacesCache.size).toBe(0)

      await personSpacesCache.getPersonSpaces(mailId, personUuid, email)
      expect(personSpacesCache.size).toBe(1)

      const anotherPersonUuid = 'another-person-uuid' as PersonUuid
      await personSpacesCache.getPersonSpaces(mailId, anotherPersonUuid, 'another@example.com')
      expect(personSpacesCache.size).toBe(2)

      personSpacesCache.clearPersonCache(personUuid)
      expect(personSpacesCache.size).toBe(1)

      personSpacesCache.clearCache()
      expect(personSpacesCache.size).toBe(0)
    })
  })
})

describe('PersonSpacesCacheFactory', () => {
  let mockCtx1: jest.Mocked<MeasureContext>
  let mockCtx2: jest.Mocked<MeasureContext>
  let mockClient1: jest.Mocked<TxOperations>
  let mockClient2: jest.Mocked<TxOperations>

  const workspace1 = 'workspace-1' as WorkspaceUuid
  const workspace2 = 'workspace-2' as WorkspaceUuid

  beforeEach(() => {
    PersonSpacesCacheFactory.resetAllInstances()

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

    mockClient1 = {
      findAll: jest.fn().mockResolvedValue([])
    } as unknown as jest.Mocked<TxOperations>

    mockClient2 = {
      findAll: jest.fn().mockResolvedValue([])
    } as unknown as jest.Mocked<TxOperations>
  })

  describe('getInstance', () => {
    it('should create a new instance for a workspace', () => {
      expect(PersonSpacesCacheFactory.instanceCount).toBe(0)

      const cache = PersonSpacesCacheFactory.getInstance(mockCtx1, mockClient1, workspace1)

      expect(cache).toBeInstanceOf(PersonSpacesCache)
      expect(PersonSpacesCacheFactory.instanceCount).toBe(1)
    })

    it('should return the same instance for the same workspace', () => {
      const cache1 = PersonSpacesCacheFactory.getInstance(mockCtx1, mockClient1, workspace1)
      const cache2 = PersonSpacesCacheFactory.getInstance(mockCtx1, mockClient1, workspace1)

      expect(cache1).toBe(cache2)
      expect(PersonSpacesCacheFactory.instanceCount).toBe(1)
    })

    it('should create different instances for different workspaces', () => {
      const cache1 = PersonSpacesCacheFactory.getInstance(mockCtx1, mockClient1, workspace1)
      const cache2 = PersonSpacesCacheFactory.getInstance(mockCtx1, mockClient1, workspace2)

      expect(cache1).not.toBe(cache2)
      expect(PersonSpacesCacheFactory.instanceCount).toBe(2)
    })

    it('should use the first context and client for subsequent calls with the same workspace', async () => {
      const mailId = 'test-mail-id'
      const personUuid = 'test-person-uuid' as PersonUuid
      const email = 'test@example.com'

      // First instance with first context and client
      const cache1 = PersonSpacesCacheFactory.getInstance(mockCtx1, mockClient1, workspace1)

      // Try to get instance with different context and client, but same workspace
      const cache2 = PersonSpacesCacheFactory.getInstance(mockCtx2, mockClient2, workspace1)

      // Should be the same instance
      expect(cache1).toBe(cache2)

      // Test that it uses the first client, not the second
      await cache2.getPersonSpaces(mailId, personUuid, email)
      expect(mockClient1.findAll).toHaveBeenCalled()
      expect(mockClient2.findAll).not.toHaveBeenCalled()
    })
  })

  describe('resetInstance', () => {
    it('should remove the instance for a specific workspace', () => {
      const cache1 = PersonSpacesCacheFactory.getInstance(mockCtx1, mockClient1, workspace1)
      PersonSpacesCacheFactory.getInstance(mockCtx1, mockClient1, workspace2)

      expect(PersonSpacesCacheFactory.instanceCount).toBe(2)

      PersonSpacesCacheFactory.resetInstance(workspace1)

      expect(PersonSpacesCacheFactory.instanceCount).toBe(1)

      // Getting workspace1 again should create a new instance
      const cache1New = PersonSpacesCacheFactory.getInstance(mockCtx1, mockClient1, workspace1)
      expect(cache1New).not.toBe(cache1)
    })
  })

  describe('resetAllInstances', () => {
    it('should remove all workspace instances', () => {
      PersonSpacesCacheFactory.getInstance(mockCtx1, mockClient1, workspace1)
      PersonSpacesCacheFactory.getInstance(mockCtx1, mockClient1, workspace2)
      expect(PersonSpacesCacheFactory.instanceCount).toBe(2)

      PersonSpacesCacheFactory.resetAllInstances()

      expect(PersonSpacesCacheFactory.instanceCount).toBe(0)
    })
  })

  describe('instanceCount', () => {
    it('should return the number of workspace instances', () => {
      expect(PersonSpacesCacheFactory.instanceCount).toBe(0)

      PersonSpacesCacheFactory.getInstance(mockCtx1, mockClient1, workspace1)
      expect(PersonSpacesCacheFactory.instanceCount).toBe(1)

      PersonSpacesCacheFactory.getInstance(mockCtx1, mockClient1, workspace2)
      expect(PersonSpacesCacheFactory.instanceCount).toBe(2)

      PersonSpacesCacheFactory.resetInstance(workspace1)
      expect(PersonSpacesCacheFactory.instanceCount).toBe(1)

      PersonSpacesCacheFactory.resetAllInstances()
      expect(PersonSpacesCacheFactory.instanceCount).toBe(0)
    })
  })
})
