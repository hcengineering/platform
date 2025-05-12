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

import { MeasureContext, PersonId, PersonUuid, SocialIdType } from '@hcengineering/core'
import { RestClient } from '@hcengineering/api-client'
import { PersonCache, CachedPerson } from '../person'
import { EmailContact } from '../types'

describe('PersonCache', () => {
  let personCache: PersonCache
  let mockCtx: MeasureContext
  let mockRestClient: jest.Mocked<RestClient>

  const mockContact: EmailContact = {
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User'
  }

  const mockPerson: CachedPerson = {
    socialId: 'test-social-id' as PersonId,
    uuid: 'test-uuid' as PersonUuid,
    localPerson: 'test-local-person'
  }

  beforeEach(() => {
    // Set up mocks
    mockCtx = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<MeasureContext>

    mockRestClient = {
      ensurePerson: jest.fn().mockResolvedValue(mockPerson)
    } as unknown as jest.Mocked<RestClient>

    // Create the cache instance
    personCache = new PersonCache(mockCtx, mockRestClient)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('ensurePerson', () => {
    it('should call ensurePerson on the RestClient and return the result', async () => {
      const result = await personCache.ensurePerson(mockContact)

      expect(result).toEqual(mockPerson)
      expect(mockRestClient.ensurePerson).toHaveBeenCalledWith(
        SocialIdType.EMAIL,
        mockContact.email,
        mockContact.firstName,
        mockContact.lastName
      )
    })

    it('should normalize email addresses by trimming and lowercasing', async () => {
      const uppercaseContact: EmailContact = {
        email: '  TEST@EXAMPLE.COM ',
        firstName: 'Test',
        lastName: 'User'
      }

      await personCache.ensurePerson(uppercaseContact)

      expect(mockRestClient.ensurePerson).toHaveBeenCalledWith(
        SocialIdType.EMAIL,
        'test@example.com',
        uppercaseContact.firstName,
        uppercaseContact.lastName
      )
    })

    it('should return cached result for subsequent calls with the same email', async () => {
      await personCache.ensurePerson(mockContact)
      await personCache.ensurePerson(mockContact)

      expect(mockRestClient.ensurePerson).toHaveBeenCalledTimes(1)
    })

    it('should handle errors from ensurePerson and remove failed lookup from cache', async () => {
      const error = new Error('Network error')
      mockRestClient.ensurePerson.mockRejectedValueOnce(error)

      await expect(personCache.ensurePerson(mockContact)).rejects.toThrow(error)

      expect(mockCtx.error).toHaveBeenCalledWith('Error ensuring person exists', {
        email: mockContact.email,
        firstName: mockContact.firstName,
        lastName: mockContact.lastName,
        error: error.message
      })

      // The failed lookup should be removed from cache,
      // so a subsequent call should retry the API call
      mockRestClient.ensurePerson.mockResolvedValueOnce(mockPerson)
      await personCache.ensurePerson(mockContact)
      expect(mockRestClient.ensurePerson).toHaveBeenCalledTimes(2)
    })

    it('should cache different contacts separately', async () => {
      const contact1: EmailContact = {
        email: 'test1@example.com',
        firstName: 'Test1',
        lastName: 'User1'
      }

      const contact2: EmailContact = {
        email: 'test2@example.com',
        firstName: 'Test2',
        lastName: 'User2'
      }

      const mockPerson1: CachedPerson = {
        socialId: 'test-social-id-1' as PersonId,
        uuid: 'test-uuid-1' as PersonUuid,
        localPerson: 'test-local-person-1'
      }

      const mockPerson2: CachedPerson = {
        socialId: 'test-social-id-2' as PersonId,
        uuid: 'test-uuid-2' as PersonUuid,
        localPerson: 'test-local-person-2'
      }

      mockRestClient.ensurePerson.mockResolvedValueOnce(mockPerson1).mockResolvedValueOnce(mockPerson2)

      const result1 = await personCache.ensurePerson(contact1)
      const result2 = await personCache.ensurePerson(contact2)

      expect(result1).toEqual(mockPerson1)
      expect(result2).toEqual(mockPerson2)
      expect(mockRestClient.ensurePerson).toHaveBeenCalledTimes(2)
    })
  })

  describe('clearCache', () => {
    it('should clear the cache', async () => {
      await personCache.ensurePerson(mockContact)
      expect(personCache.size()).toBe(1)

      personCache.clearCache()
      expect(personCache.size()).toBe(0)

      // Subsequent call should call the API again
      await personCache.ensurePerson(mockContact)
      expect(mockRestClient.ensurePerson).toHaveBeenCalledTimes(2)
    })
  })

  describe('size', () => {
    it('should return the number of cached entries', async () => {
      expect(personCache.size()).toBe(0)

      await personCache.ensurePerson(mockContact)
      expect(personCache.size()).toBe(1)

      const anotherContact: EmailContact = {
        email: 'another@example.com',
        firstName: 'Another',
        lastName: 'User'
      }
      await personCache.ensurePerson(anotherContact)
      expect(personCache.size()).toBe(2)
    })
  })
})
