/* eslint-disable @typescript-eslint/unbound-method */
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

import { createMessages } from '../message'
import { WorkspaceLoginInfo } from '@hcengineering/account-client'
import { PersonSpace } from '@hcengineering/contact'
import { MeasureContext, PersonId, PersonUuid, Ref, TxOperations } from '@hcengineering/core'
import { KeyValueClient } from '@hcengineering/kvs-client'
import { Producer } from 'kafkajs'
import { Attachment, BaseConfig, EmailContact, EmailMessage } from '../types'
import { PersonCacheFactory } from '../person'
import { PersonSpacesCacheFactory } from '../personSpaces'
import { ChannelCacheFactory } from '../channel'
import { ThreadLookupService } from '../thread'

// Mock dependencies
jest.mock('../person')
jest.mock('../personSpaces')
jest.mock('../channel')
jest.mock('../thread')
jest.mock('kafkajs')

describe('createMessages', () => {
  // Setup test vars
  let mockConfig: BaseConfig
  let mockCtx: MeasureContext
  let mockTxClient: jest.Mocked<TxOperations>
  let mockKvsClient: jest.Mocked<KeyValueClient>
  let mockProducer: jest.Mocked<Producer>
  let mockToken: string
  let mockWsInfo: WorkspaceLoginInfo
  let mockMessage: EmailMessage
  let mockAttachments: Attachment[]

  // Mock person objects
  const mockFromPerson = {
    socialId: 'from-person-id' as PersonId,
    uuid: 'from-uuid' as PersonUuid,
    localPerson: 'from-local'
  }

  const mockToPerson1 = {
    socialId: 'to-person-id-1' as PersonId,
    uuid: 'to-uuid-1' as PersonUuid,
    localPerson: 'to-local-1'
  }

  const mockToPerson2 = {
    socialId: 'to-person-id-2' as PersonId,
    uuid: 'to-uuid-2' as PersonUuid,
    localPerson: 'to-local-2'
  }

  // Mock email contacts
  const mockFromContact: EmailContact = {
    email: 'from@example.com',
    firstName: 'From',
    lastName: 'User'
  }

  const mockToContact1: EmailContact = {
    email: 'to1@example.com',
    firstName: 'To1',
    lastName: 'User'
  }

  const mockToContact2: EmailContact = {
    email: 'to2@example.com',
    firstName: 'To2',
    lastName: 'User'
  }

  // Mock PersonCache class
  const mockPersonCache = {
    ensurePerson: jest.fn()
  }

  // Mock PersonSpaces class
  const mockPersonSpacesCache = {
    getPersonSpaces: jest.fn()
  }

  // Mock ChannelCache class
  const mockChannelCache = {
    getOrCreateChannel: jest.fn()
  }

  // Mock ThreadLookupService class
  const mockThreadLookup = {
    getThreadId: jest.fn(),
    getParentThreadId: jest.fn(),
    setThreadId: jest.fn()
  }

  // Mock space
  const mockSpace: PersonSpace = {
    _id: 'space-id' as Ref<PersonSpace>,
    _class: 'class.contact.PersonSpace' as any,
    person: 'person-id' as any,
    name: 'Test Space',
    private: true
  } as any

  beforeEach(() => {
    jest.resetAllMocks()

    // Setup mocks
    mockCtx = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    } as unknown as MeasureContext

    mockTxClient = {
      createDoc: jest.fn().mockResolvedValue('thread-id'),
      createMixin: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn()
    } as unknown as jest.Mocked<TxOperations>

    mockKvsClient = {} as unknown as jest.Mocked<KeyValueClient>

    mockProducer = {
      send: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<Producer>

    mockToken = 'test-token'

    mockWsInfo = {
      workspace: 'workspace-id',
      endpoint: 'wss://example.com',
      token: 'ws-token',
      workspaceUrl: 'https://example.com',
      workspaceDataId: 'data-id'
    } as any

    mockMessage = {
      mailId: 'test-mail-id',
      from: mockFromContact,
      to: [mockToContact1, mockToContact2],
      copy: [],
      subject: 'Test Subject',
      textContent: 'Test Content',
      htmlContent: '<p>Test Content</p>',
      sendOn: Date.now()
    } as any

    mockAttachments = []

    // Setup config
    mockConfig = {
      CommunicationTopic: 'communication-topic'
    } as any

    // Setup mock factories
    ;(PersonCacheFactory.getInstance as jest.Mock).mockReturnValue(mockPersonCache)
    ;(PersonSpacesCacheFactory.getInstance as jest.Mock).mockReturnValue(mockPersonSpacesCache)
    ;(ChannelCacheFactory.getInstance as jest.Mock).mockReturnValue(mockChannelCache)
    ;(ThreadLookupService.getInstance as jest.Mock).mockReturnValue(mockThreadLookup)

    // Setup mock return values
    mockPersonCache.ensurePerson
      .mockResolvedValueOnce(mockFromPerson) // For from person
      .mockResolvedValueOnce(mockToPerson1) // For first to person
      .mockResolvedValueOnce(mockToPerson2) // For second to person

    mockPersonSpacesCache.getPersonSpaces.mockResolvedValue([mockSpace])

    mockChannelCache.getOrCreateChannel.mockResolvedValue('channel-id')

    mockThreadLookup.getThreadId.mockResolvedValue(undefined)
    mockThreadLookup.getParentThreadId.mockResolvedValue(undefined)
  })

  it('should use default participants when targetPersons is not provided', async () => {
    // Act
    await createMessages(
      mockConfig,
      mockCtx,
      mockTxClient,
      mockKvsClient,
      mockProducer,
      mockToken,
      mockWsInfo,
      mockMessage,
      mockAttachments
    )

    // Assert
    // This checks that createDoc was called with the expected participants list
    // Default participants should include the sender and all recipients
    expect(mockTxClient.createDoc).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        members: [mockFromPerson.socialId, mockToPerson1.socialId, mockToPerson2.socialId]
      }),
      expect.any(String),
      expect.any(Number),
      expect.any(String)
    )

    // Also check that the channel was created with the same participants
    expect(mockChannelCache.getOrCreateChannel).toHaveBeenCalledWith(
      mockSpace._id,
      [mockFromPerson.socialId, mockToPerson1.socialId, mockToPerson2.socialId],
      mockToContact1.email,
      expect.any(String)
    )
  })

  it('should use provided targetPersons when specified', async () => {
    // Arrange
    const customTargetPersons = ['custom-person-1', 'custom-person-2'] as PersonId[]

    // Act
    await createMessages(
      mockConfig,
      mockCtx,
      mockTxClient,
      mockKvsClient,
      mockProducer,
      mockToken,
      mockWsInfo,
      mockMessage,
      mockAttachments,
      customTargetPersons
    )

    // Assert
    // Check that createDoc was called with the custom participants list
    expect(mockTxClient.createDoc).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        members: customTargetPersons
      }),
      expect.any(String),
      expect.any(Number),
      expect.any(String)
    )

    // Also check that the channel was created with the custom participants
    expect(mockChannelCache.getOrCreateChannel).toHaveBeenCalledWith(
      mockSpace._id,
      customTargetPersons,
      mockToContact1.email,
      expect.any(String)
    )
  })

  it('should handle empty targetPersons array', async () => {
    // Arrange
    const emptyTargetPersons: PersonId[] = []

    // Act
    await createMessages(
      mockConfig,
      mockCtx,
      mockTxClient,
      mockKvsClient,
      mockProducer,
      mockToken,
      mockWsInfo,
      mockMessage,
      mockAttachments,
      emptyTargetPersons
    )

    // Assert
    // Check that createDoc was called with the empty participants list
    expect(mockTxClient.createDoc).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        members: [] // Empty array
      }),
      expect.any(String),
      expect.any(Number),
      expect.any(String)
    )
  })

  it('should handle missing recipient persons gracefully', async () => {
    // Arrange - setup person cache to return undefined for the second recipient
    mockPersonCache.ensurePerson
      .mockReset()
      .mockResolvedValueOnce(mockFromPerson) // For from person
      .mockResolvedValueOnce(mockToPerson1) // For first to person
      .mockResolvedValueOnce(undefined) // For second to person (missing)

    // Act
    await createMessages(
      mockConfig,
      mockCtx,
      mockTxClient,
      mockKvsClient,
      mockProducer,
      mockToken,
      mockWsInfo,
      mockMessage,
      mockAttachments
    )

    // Assert
    // Only the available persons should be included in participants
    expect(mockTxClient.createDoc).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        members: [
          mockFromPerson.socialId,
          mockToPerson1.socialId
          // mockToPerson2.socialId should not be here
        ]
      }),
      expect.any(String),
      expect.any(Number),
      expect.any(String)
    )
  })

  it('should handle case where all recipients are missing', async () => {
    // Arrange - setup person cache to return undefined for all recipients
    mockPersonCache.ensurePerson
      .mockReset()
      .mockResolvedValueOnce(mockFromPerson) // For from person
      .mockResolvedValueOnce(undefined) // For first to person (missing)
      .mockResolvedValueOnce(undefined) // For second to person (missing)

    // Act
    await createMessages(
      mockConfig,
      mockCtx,
      mockTxClient,
      mockKvsClient,
      mockProducer,
      mockToken,
      mockWsInfo,
      mockMessage,
      mockAttachments
    )

    // Assert
    // Should log an error and not proceed with message creation
    expect(mockCtx.error).toHaveBeenCalledWith('Unable to create message without a proper TO', expect.any(Object))
    expect(mockTxClient.createDoc).not.toHaveBeenCalled()
  })

  it('should handle empty to list with copy recipients', async () => {
    // Arrange - setup message with empty 'to' but populated 'copy'
    const messageWithCopy: EmailMessage = {
      ...mockMessage,
      to: [],
      copy: [mockToContact1]
    }

    mockPersonCache.ensurePerson
      .mockReset()
      .mockResolvedValueOnce(mockFromPerson) // For from person
      .mockResolvedValueOnce(mockToPerson1) // For copy person

    // Act
    await createMessages(
      mockConfig,
      mockCtx,
      mockTxClient,
      mockKvsClient,
      mockProducer,
      mockToken,
      mockWsInfo,
      messageWithCopy,
      mockAttachments
    )

    // Assert
    // Should include the copy recipients in participants
    expect(mockTxClient.createDoc).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        members: [mockFromPerson.socialId, mockToPerson1.socialId]
      }),
      expect.any(String),
      expect.any(Number),
      expect.any(String)
    )
  })
})
