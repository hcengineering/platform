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

import type { Card, MasterTag, ParentInfo } from '@hcengineering/card'
import type { Ref } from '@hcengineering/core'

// Import after mocking
import { performParentInfoMigration } from '../migration'

// Mock the chat plugin
jest.mock('../plugin', () => ({
  masterTag: {
    Thread: 'chat:masterTag:Thread' as Ref<MasterTag>
  }
}))

// Mock card plugin
jest.mock('@hcengineering/card', () => ({
  class: {
    Card: 'card:class:Card'
  },
  DOMAIN_CARD: 'card'
}))

// Helper function to create mock cards
function createMockCard (id: string, parentInfo?: ParentInfo[]): Card {
  const card: Card = {
    _id: id as any,
    _class: 'card:class:Card' as any,
    title: `Card ${id}`,
    content: { __ref: 'blob1' } as any,
    blobs: {} as any,
    rank: '1',
    space: 'space1' as any,
    modifiedBy: 'user1' as any,
    modifiedOn: Date.now(),
    createdBy: 'user1' as any,
    createdOn: Date.now(),
    parentInfo: parentInfo ?? []
  }
  return card
}

describe('migrateParentInfo', () => {
  let mockClient: any
  let mockIterator: any
  let mockLogger: any

  const channelMasterTag = 'chat:masterTag:Channel' as Ref<MasterTag>

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn()
    }

    mockIterator = {
      next: jest.fn(),
      close: jest.fn()
    }

    mockClient = {
      traverse: jest.fn().mockResolvedValue(mockIterator),
      bulk: jest.fn(),
      logger: mockLogger
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should migrate cards with channel master tag in parentInfo using custom bulk size', async () => {
    const cardsWithChannelParent: Card[] = [
      createMockCard('card1', [
        {
          _class: channelMasterTag,
          title: 'Channel 1',
          _id: 'channel1' as Ref<Card>
        }
      ]),
      createMockCard('card2', [
        {
          _id: 'channel2' as Ref<Card>,
          _class: channelMasterTag,
          title: 'Channel 2'
        }
      ])
    ]

    // Mock iterator to return cards in first call, then empty
    mockIterator.next.mockResolvedValueOnce(cardsWithChannelParent).mockResolvedValueOnce([])

    // Use smaller bulk size for testing
    await performParentInfoMigration(mockClient, 2)

    // Verify iterator.next was called with the correct bulk size
    expect(mockIterator.next).toHaveBeenCalledWith(2)

    const mockChatMasterTag = 'chat:masterTag:Thread' as Ref<MasterTag>

    // Verify bulk update was called with correct operations
    expect(mockClient.bulk).toHaveBeenCalledWith('card', [
      {
        filter: { _id: 'card1' },
        update: {
          parentInfo: [
            {
              _class: mockChatMasterTag,
              title: 'Channel 1',
              _id: 'channel1' as Ref<Card>
            }
          ]
        }
      },
      {
        filter: { _id: 'card2' },
        update: {
          parentInfo: [
            {
              _class: mockChatMasterTag,
              title: 'Channel 2',
              _id: 'channel2' as Ref<Card>
            }
          ]
        }
      }
    ])

    // Verify iterator was closed
    expect(mockIterator.close).toHaveBeenCalled()

    // Verify logging
    expect(mockLogger.log).toHaveBeenCalledWith('Migrated cards', { count: 2 })
  })

  it('should process multiple small batches with custom bulk size', async () => {
    const batch1: Card[] = [
      createMockCard('card1', [{ _class: channelMasterTag, title: 'Channel 1', _id: 'channel1' as any }]),
      createMockCard('card2', [{ _class: channelMasterTag, title: 'Channel 2', _id: 'channel2' as any }])
    ]

    const batch2: Card[] = [
      createMockCard('card3', [{ _class: channelMasterTag, title: 'Channel 3', _id: 'channel3' as any }])
    ]

    mockIterator.next.mockResolvedValueOnce(batch1).mockResolvedValueOnce(batch2).mockResolvedValueOnce([])

    // Use small bulk size for testing
    await performParentInfoMigration(mockClient, 2)

    // Verify iterator.next was called with correct bulk size
    expect(mockIterator.next).toHaveBeenCalledWith(2)

    // Verify bulk was called twice
    expect(mockClient.bulk).toHaveBeenCalledTimes(2)

    // Verify logging for both batches
    expect(mockLogger.log).toHaveBeenNthCalledWith(1, 'Migrated cards', { count: 2 })
    expect(mockLogger.log).toHaveBeenNthCalledWith(2, 'Migrated cards', { count: 3 })

    // Verify iterator was closed
    expect(mockIterator.close).toHaveBeenCalled()
  })

  it('should skip cards without parentInfo', async () => {
    const cardsWithoutParentInfo: Card[] = [createMockCard('card1', undefined), createMockCard('card2', [])]

    mockIterator.next.mockResolvedValueOnce(cardsWithoutParentInfo).mockResolvedValueOnce([])

    await performParentInfoMigration(mockClient, 5)

    // Verify no bulk operations were performed
    expect(mockClient.bulk).not.toHaveBeenCalled()

    // Verify logging shows processed cards but no updates
    expect(mockLogger.log).toHaveBeenCalledWith('Migrated cards', { count: 2 })
  })

  it('should ensure iterator is closed even if an error occurs', async () => {
    mockIterator.next.mockRejectedValue(new Error('Database error'))

    await expect(performParentInfoMigration(mockClient, 10)).rejects.toThrow('Database error')

    // Verify iterator was still closed
    expect(mockIterator.close).toHaveBeenCalled()
  })

  it('should use default bulk size of 1000 when not specified', async () => {
    const cards: Card[] = [createMockCard('card1', [])]

    mockIterator.next.mockResolvedValueOnce(cards).mockResolvedValueOnce([])

    await performParentInfoMigration(mockClient)

    // Verify iterator.next was called with default bulk size
    expect(mockIterator.next).toHaveBeenCalledWith(1000)
  })
})
