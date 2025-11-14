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

import { MeasureContext, SortingOrder, WorkspaceUuid, PersonUuid } from '@hcengineering/core'
import { HulylakeWorkspaceClient, getWorkspaceClient } from '@hcengineering/hulylake-client'
import {
  CardID,
  BlobID,
  MessageID,
  MessagesGroup,
  Message,
  Markdown,
  MessageExtra,
  Attachment,
  AttachmentID,
  Thread,
  CardType,
  AttachmentUpdateData,
  MessageType,
  SocialID
} from '@hcengineering/communication-types'
import { Blob } from '../blob'
import { Metadata } from '../types'

// Mock dependencies
jest.mock('@hcengineering/hulylake-client')
jest.mock('@hcengineering/server-token', () => ({
  generateToken: jest.fn(() => 'mock-token')
}))
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid')
}))

describe('Blob', () => {
  let blob: Blob
  let mockClient: jest.Mocked<HulylakeWorkspaceClient>
  let mockCtx: jest.Mocked<MeasureContext>
  let mockMetadata: Metadata

  const workspace = 'test-workspace' as WorkspaceUuid
  const cardId = 'test-card-id' as CardID
  const blobId = 'test-blob-id' as BlobID
  const messageId = 'test-message-id' as MessageID

  beforeEach(() => {
    // Setup mock context
    mockCtx = {
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn()
    } as any

    // Setup mock metadata
    mockMetadata = {
      accountsUrl: 'http://accounts.test',
      hulylakeUrl: 'http://hulylake.test',
      secret: 'test-secret',
      messagesPerBlob: 100
    }

    // Setup mock client
    mockClient = {
      getJson: jest.fn(),
      putJson: jest.fn(),
      patchJson: jest.fn()
    } as any

    // Mock getWorkspaceClient to return our mock client
    ;(getWorkspaceClient as jest.Mock).mockReturnValue(mockClient)

    blob = new Blob(mockCtx, workspace, mockMetadata)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findMessagesGroups', () => {
    beforeEach(() => {
      mockClient.getJson.mockResolvedValue({
        status: 200,
        body: {
          'blob-1': {
            cardId,
            blobId: 'blob-1' as BlobID,
            fromDate: '2025-01-01T00:00:00.000Z',
            toDate: '2025-01-02T00:00:00.000Z',
            count: 10
          },
          'blob-2': {
            cardId,
            blobId: 'blob-2' as BlobID,
            fromDate: '2025-01-03T00:00:00.000Z',
            toDate: '2025-01-04T00:00:00.000Z',
            count: 20
          },
          'blob-3': {
            cardId,
            blobId: 'blob-3' as BlobID,
            fromDate: '2025-01-05T00:00:00.000Z',
            toDate: '2025-01-06T00:00:00.000Z',
            count: 30
          }
        }
      } as any)
    })

    it('should return all groups when no filters are provided', async () => {
      const result = await blob.findMessagesGroups({ cardId })

      expect(result).toHaveLength(3)
      expect(result[0].blobId).toBe('blob-1')
      expect(result[1].blobId).toBe('blob-2')
      expect(result[2].blobId).toBe('blob-3')
    })

    it('should sort groups in ascending order', async () => {
      const result = await blob.findMessagesGroups({
        cardId,
        order: SortingOrder.Ascending
      })

      expect(result[0].fromDate.getTime()).toBeLessThan(result[1].fromDate.getTime())
      expect(result[1].fromDate.getTime()).toBeLessThan(result[2].fromDate.getTime())
    })

    it('should sort groups in descending order', async () => {
      const result = await blob.findMessagesGroups({
        cardId,
        order: SortingOrder.Descending
      })

      expect(result[0].fromDate.getTime()).toBeGreaterThan(result[1].fromDate.getTime())
      expect(result[1].fromDate.getTime()).toBeGreaterThan(result[2].fromDate.getTime())
    })

    it('should filter groups by blobId', async () => {
      const result = await blob.findMessagesGroups({
        cardId,
        blobId: 'blob-2' as BlobID
      })

      expect(result).toHaveLength(1)
      expect(result[0].blobId).toBe('blob-2')
    })

    it('should filter groups by fromDate', async () => {
      const result = await blob.findMessagesGroups({
        cardId,
        fromDate: new Date('2025-01-03')
      })

      expect(result).toHaveLength(1)
      expect(result[0].blobId).toBe('blob-2')
    })

    it('should filter groups by toDate', async () => {
      const result = await blob.findMessagesGroups({
        cardId,
        toDate: new Date('2025-01-04')
      })

      expect(result).toHaveLength(1)
      expect(result[0].blobId).toBe('blob-2')
    })

    it('should limit the number of returned groups', async () => {
      const result = await blob.findMessagesGroups({
        cardId,
        limit: 2
      })

      expect(result).toHaveLength(2)
    })

    it('should create groups blob when not found (404)', async () => {
      mockClient.getJson.mockResolvedValue({
        status: 404,
        body: null
      } as any)

      const result = await blob.findMessagesGroups({ cardId })

      expect(result).toHaveLength(0)
      expect(mockClient.putJson).toHaveBeenCalledWith(`${cardId}/messages/groups`, {}, undefined, expect.any(Object))
    })
  })

  describe('getMessageGroupByDate', () => {
    beforeEach(() => {
      mockClient.getJson.mockResolvedValue({
        status: 200,
        body: {
          'blob-1': {
            cardId,
            blobId: 'blob-1' as BlobID,
            fromDate: '2025-01-01T00:00:00.000Z',
            toDate: '2025-01-10T00:00:00.000Z',
            count: 10
          }
        }
      } as any)
    })

    it('should return matching group when date is within range', async () => {
      const result = await blob.getMessageGroupByDate(cardId, new Date('2025-01-05'), false)

      expect(result).toBeDefined()
      expect(result?.blobId).toBe('blob-1')
    })

    it('should return last group if date is after and group is not full', async () => {
      const result = await blob.getMessageGroupByDate(cardId, new Date('2025-01-15'), false)

      expect(result).toBeDefined()
      expect(result?.blobId).toBe('blob-1')
    })

    it('should return undefined when no match and create is false', async () => {
      mockClient.getJson.mockResolvedValue({
        status: 200,
        body: {
          'blob-1': {
            cardId,
            blobId: 'blob-1' as BlobID,
            fromDate: '2025-01-01T00:00:00.000Z',
            toDate: '2025-01-10T00:00:00.000Z',
            count: 100 // Full group
          }
        }
      } as any)

      const result = await blob.getMessageGroupByDate(cardId, new Date('2025-01-15'), false)

      expect(result).toBeUndefined()
    })

    it('should create new group when no match and create is true', async () => {
      mockClient.getJson.mockResolvedValue({
        status: 200,
        body: {}
      } as any)

      mockClient.patchJson.mockResolvedValue({ status: 200 } as any)
      mockClient.putJson.mockResolvedValue({ status: 200 } as any)

      const result = await blob.getMessageGroupByDate(cardId, new Date('2025-01-15'), true)

      expect(result).toBeDefined()
      expect(mockClient.patchJson).toHaveBeenCalled()
      expect(mockClient.putJson).toHaveBeenCalled()
    })
  })

  describe('insertMessage', () => {
    const mockGroup: MessagesGroup = {
      cardId,
      blobId,
      fromDate: new Date('2025-01-01'),
      toDate: new Date('2025-01-10'),
      count: 5
    }

    const mockMessage: Message = {
      id: messageId,
      created: new Date('2025-01-05'),
      creator: 'user-1' as SocialID,
      content: 'Test message' as Markdown,
      cardId,
      type: MessageType.Text,
      reactions: {},
      attachments: [],
      threads: []
    }

    beforeEach(() => {
      mockClient.patchJson.mockResolvedValue({ status: 200 } as any)
      mockClient.getJson.mockResolvedValue({
        status: 200,
        body: {
          [blobId]: {
            cardId,
            blobId,
            fromDate: '2025-01-01T00:00:00.000Z',
            toDate: '2025-01-10T00:00:00.000Z',
            count: 5
          }
        }
      } as any)
    })

    it('should insert message with correct patches', async () => {
      await blob.insertMessage(cardId, mockGroup, mockMessage)

      expect(mockClient.patchJson).toHaveBeenCalledWith(
        `${cardId}/messages/${blobId}`,
        expect.arrayContaining([
          expect.objectContaining({
            hop: 'add',
            path: `/messages/${messageId}`
          })
        ]),
        undefined,
        expect.any(Object)
      )
    })

    it('should update toDate when message is newer', async () => {
      const newerMessage = {
        ...mockMessage,
        created: new Date('2025-01-15')
      }

      await blob.insertMessage(cardId, mockGroup, newerMessage)

      const patches = mockClient.patchJson.mock.calls[0][1]
      const toDatePatch = patches.find((p) => p.path === '/toDate')
      expect(toDatePatch).toBeDefined()
    })

    it('should update fromDate when message is older', async () => {
      const olderMessage = {
        ...mockMessage,
        created: new Date('2024-12-31')
      }

      await blob.insertMessage(cardId, mockGroup, olderMessage)

      const patches = mockClient.patchJson.mock.calls[0][1]
      const fromDatePatch = patches.find((p) => p.path === '/fromDate')
      expect(fromDatePatch).toBeDefined()
    })
  })

  describe('updateMessage', () => {
    const date = new Date('2025-01-05')

    beforeEach(() => {
      mockClient.patchJson.mockResolvedValue({ status: 200 } as any)
    })

    it('should update message content', async () => {
      await blob.updateMessage(cardId, blobId, messageId, { content: 'Updated content' as Markdown }, date)

      const patches = mockClient.patchJson.mock.calls[0][1]
      expect(patches.some((p) => p.path === `/messages/${messageId}/content`)).toBe(true)
      expect(patches.some((p) => p.path === `/messages/${messageId}/modified`)).toBe(true)
    })

    it('should update message extra', async () => {
      const extra: MessageExtra = { key: 'value' }
      await blob.updateMessage(cardId, blobId, messageId, { extra }, date)

      const patches = mockClient.patchJson.mock.calls[0][1]
      expect(patches.some((p) => p.path === `/messages/${messageId}/extra`)).toBe(true)
    })

    it('should update message language without modifying modified field', async () => {
      await blob.updateMessage(cardId, blobId, messageId, { language: 'en' }, date)

      const patches = mockClient.patchJson.mock.calls[0][1]
      expect(patches.some((p) => p.path === `/messages/${messageId}/language`)).toBe(true)
      expect(patches.some((p) => p.path === `/messages/${messageId}/modified`)).toBe(false)
    })

    it('should not call patchJson when no updates provided', async () => {
      await blob.updateMessage(cardId, blobId, messageId, {}, date)

      expect(mockClient.patchJson).not.toHaveBeenCalled()
    })
  })

  describe('removeMessage', () => {
    beforeEach(() => {
      mockClient.patchJson.mockResolvedValue({ status: 200 } as any)
      mockClient.getJson.mockResolvedValue({
        status: 200,
        body: {
          [blobId]: {
            cardId,
            blobId,
            fromDate: '2025-01-01T00:00:00.000Z',
            toDate: '2025-01-10T00:00:00.000Z',
            count: 5
          }
        }
      } as any)
    })

    it('should remove message with correct patch', async () => {
      await blob.removeMessage(cardId, blobId, messageId)

      expect(mockClient.patchJson).toHaveBeenCalledWith(
        `${cardId}/messages/${blobId}`,
        expect.arrayContaining([
          expect.objectContaining({
            hop: 'remove',
            path: `/messages/${messageId}`,
            safe: true
          })
        ]),
        undefined,
        expect.any(Object)
      )
    })
  })

  describe('addReaction', () => {
    const person = 'user-1' as PersonUuid
    const emoji = '👍'
    const date = new Date('2025-01-05')

    beforeEach(() => {
      mockClient.patchJson.mockResolvedValue({ status: 200 } as any)
    })

    it('should add reaction with correct patches', async () => {
      await blob.addReaction(cardId, blobId, messageId, emoji, person, date)

      expect(mockClient.patchJson).toHaveBeenCalledWith(
        `${cardId}/messages/${blobId}`,
        expect.arrayContaining([
          expect.objectContaining({
            hop: 'add',
            path: `/messages/${messageId}/reactions/${emoji}`
          }),
          expect.objectContaining({
            hop: 'add',
            path: `/messages/${messageId}/reactions/${emoji}/${person}`
          })
        ]),
        undefined,
        expect.any(Object)
      )
    })
  })

  describe('removeReaction', () => {
    const person = 'user-1' as PersonUuid
    const emoji = '👍'

    beforeEach(() => {
      mockClient.patchJson.mockResolvedValue({ status: 200 } as any)
    })

    it('should remove reaction with correct patch', async () => {
      await blob.removeReaction(cardId, blobId, messageId, emoji, person)

      expect(mockClient.patchJson).toHaveBeenCalledWith(
        `${cardId}/messages/${blobId}`,
        expect.arrayContaining([
          expect.objectContaining({
            hop: 'remove',
            path: `/messages/${messageId}/reactions/${emoji}/${person}`,
            safe: true
          })
        ]),
        undefined,
        expect.any(Object)
      )
    })
  })

  describe('addAttachments', () => {
    const attachments: Attachment[] = [
      {
        id: 'att-1' as AttachmentID,
        mimeType: 'text/plain',
        params: { blobId: 'blob-1' as BlobID, fileName: 'file1.txt', size: 1024 },
        creator: 'user-1' as SocialID,
        created: new Date('2025-01-05')
      },
      {
        id: 'att-2' as AttachmentID,
        mimeType: 'text/plain',
        params: { blobId: 'blob-2' as BlobID, fileName: 'file2.txt', size: 2048 },
        creator: 'user-1' as SocialID,
        created: new Date('2025-01-05')
      }
    ]

    beforeEach(() => {
      mockClient.patchJson.mockResolvedValue({ status: 200 } as any)
    })

    it('should add multiple attachments', async () => {
      await blob.addAttachments(cardId, blobId, messageId, attachments)

      const patches = mockClient.patchJson.mock.calls[0][1]
      expect(patches).toHaveLength(2)
      expect(patches[0].path).toBe(`/messages/${messageId}/attachments/att-1`)
      expect(patches[1].path).toBe(`/messages/${messageId}/attachments/att-2`)
    })
  })

  describe('removeAttachments', () => {
    const attachmentIds: AttachmentID[] = ['att-1' as AttachmentID, 'att-2' as AttachmentID]

    beforeEach(() => {
      mockClient.patchJson.mockResolvedValue({ status: 200 } as any)
    })

    it('should remove multiple attachments', async () => {
      await blob.removeAttachments(cardId, blobId, messageId, attachmentIds)

      const patches = mockClient.patchJson.mock.calls[0][1]
      expect(patches).toHaveLength(2)
      expect(patches[0].path).toBe(`/messages/${messageId}/attachments/att-1`)
      expect(patches[1].path).toBe(`/messages/${messageId}/attachments/att-2`)
    })
  })

  describe('setAttachments', () => {
    const attachments: Attachment[] = [
      {
        id: 'att-1' as AttachmentID,
        mimeType: 'text/plain',
        params: { blobId: 'blob-1' as BlobID, fileName: 'file1.txt', size: 1024 },
        creator: 'user-1' as SocialID,
        created: new Date('2025-01-05')
      }
    ]

    beforeEach(() => {
      mockClient.patchJson.mockResolvedValue({ status: 200 } as any)
    })

    it('should replace all attachments', async () => {
      await blob.setAttachments(cardId, blobId, messageId, attachments)

      const patches = mockClient.patchJson.mock.calls[0][1]
      expect(patches[0].path).toBe(`/messages/${messageId}/attachments`)
    })
  })

  describe('updateAttachments', () => {
    const updates: AttachmentUpdateData[] = [
      {
        id: 'att-1' as AttachmentID,
        params: { status: 'processed' }
      }
    ]
    const date = new Date('2025-01-05')

    beforeEach(() => {
      mockClient.patchJson.mockResolvedValue({ status: 200 } as any)
    })

    it('should update attachment parameters', async () => {
      await blob.updateAttachments(cardId, blobId, messageId, updates, date)

      const patches = mockClient.patchJson.mock.calls[0][1]
      expect(patches.some((p) => p.path.includes('/params/status'))).toBe(true)
      expect(patches.some((p) => p.path.includes('/modified'))).toBe(true)
    })

    it('should skip updates with empty params', async () => {
      const emptyUpdates: AttachmentUpdateData[] = [
        {
          id: 'att-1' as AttachmentID,
          params: {}
        }
      ]

      await blob.updateAttachments(cardId, blobId, messageId, emptyUpdates, date)

      expect(mockClient.patchJson).toHaveBeenCalledWith(expect.any(String), [], undefined, expect.any(Object))
    })
  })

  describe('attachThread', () => {
    const thread: Thread = {
      cardId,
      messageId,
      threadId: 'thread-1' as CardID,
      threadType: 'discussion' as CardType,
      repliesCount: 0,
      lastReplyDate: undefined,
      repliedPersons: {}
    }

    beforeEach(() => {
      mockClient.patchJson.mockResolvedValue({ status: 200 } as any)
    })

    it('should attach thread to message', async () => {
      await blob.attachThread(cardId, blobId, messageId, thread)

      expect(mockClient.patchJson).toHaveBeenCalledWith(
        `${cardId}/messages/${blobId}`,
        expect.arrayContaining([
          expect.objectContaining({
            op: 'add',
            path: `/messages/${messageId}/threads/${thread.threadId}`
          })
        ]),
        undefined,
        expect.any(Object)
      )
    })
  })

  describe('updateThread', () => {
    const threadId = 'thread-1' as CardID

    beforeEach(() => {
      mockClient.patchJson.mockResolvedValue({ status: 200 } as any)
    })

    it('should update thread type', async () => {
      await blob.updateThread(cardId, blobId, messageId, threadId, {
        threadType: 'task' as CardType
      })

      expect(mockClient.patchJson).toHaveBeenCalledWith(
        `${cardId}/messages/${blobId}`,
        expect.arrayContaining([
          expect.objectContaining({
            op: 'add',
            path: `/messages/${messageId}/threads/${threadId}/threadType`,
            value: 'task'
          })
        ]),
        undefined,
        expect.any(Object)
      )
    })
  })

  describe('addThreadReply', () => {
    const threadId = 'thread-1' as CardID
    const person = 'user-1' as PersonUuid
    const date = new Date('2025-01-05')

    beforeEach(() => {
      mockClient.patchJson.mockResolvedValue({ status: 200 } as any)
    })

    it('should increment replies count and update last reply', async () => {
      await blob.addThreadReply(cardId, blobId, messageId, threadId, person, date)

      const patches = mockClient.patchJson.mock.calls[0][1]
      expect(patches.some((p) => p.path.includes('/repliesCount'))).toBe(true)
      expect(patches.some((p) => p.path.includes('/lastReply'))).toBe(true)
      expect(patches.some((p) => p.path.includes('/repliedPersons'))).toBe(true)
    })
  })

  describe('removeThreadReply', () => {
    const threadId = 'thread-1' as CardID
    const person = 'user-1' as PersonUuid

    beforeEach(() => {
      mockClient.patchJson.mockResolvedValue({ status: 200 } as any)
    })

    it('should decrement replies count', async () => {
      await blob.removeThreadReply(cardId, blobId, messageId, threadId, person)

      const patches = mockClient.patchJson.mock.calls[0][1]
      const repliesCountPatch = patches.find((p) => p.path.includes('/repliesCount'))
      expect(repliesCountPatch).toBeDefined()
      expect((repliesCountPatch as any).value).toBe(-1)
    })
  })

  describe('removeThread', () => {
    const threadId = 'thread-1' as CardID

    beforeEach(() => {
      mockClient.patchJson.mockResolvedValue({ status: 200 } as any)
    })

    it('should remove thread from message', async () => {
      await blob.removeThread(cardId, blobId, messageId, threadId)

      expect(mockClient.patchJson).toHaveBeenCalledWith(
        `${cardId}/messages/${blobId}`,
        expect.arrayContaining([
          expect.objectContaining({
            hop: 'remove',
            path: `/messages/${messageId}/threads/${threadId}`,
            safe: true
          })
        ]),
        undefined,
        expect.any(Object)
      )
    })
  })

  describe('Message group selection logic', () => {
    beforeEach(() => {
      mockClient.patchJson.mockResolvedValue({ status: 200 } as any)
      mockClient.putJson.mockResolvedValue({ status: 200 } as any)
    })

    it('should insert message into group that matches date range', async () => {
      // Setup: three groups with different date ranges
      mockClient.getJson.mockResolvedValue({
        status: 200,
        body: {
          'blob-1': {
            cardId,
            blobId: 'blob-1' as BlobID,
            fromDate: '2025-01-01T00:00:00.000Z',
            toDate: '2025-01-05T00:00:00.000Z',
            count: 10
          },
          'blob-2': {
            cardId,
            blobId: 'blob-2' as BlobID,
            fromDate: '2025-01-06T00:00:00.000Z',
            toDate: '2025-01-10T00:00:00.000Z',
            count: 20
          },
          'blob-3': {
            cardId,
            blobId: 'blob-3' as BlobID,
            fromDate: '2025-01-11T00:00:00.000Z',
            toDate: '2025-01-15T00:00:00.000Z',
            count: 30
          }
        }
      } as any)

      // Message with date in the range of the second group
      const messageDate = new Date('2025-01-08T12:00:00.000Z')
      const group = await blob.getMessageGroupByDate(cardId, messageDate, false)

      expect(group).toBeDefined()
      expect(group?.blobId).toBe('blob-2')
      expect(group?.fromDate.getTime()).toBeLessThanOrEqual(messageDate.getTime())
      expect(group?.toDate.getTime()).toBeGreaterThanOrEqual(messageDate.getTime())
    })

    it('should insert message into last group if date is after all groups and group is not full', async () => {
      mockClient.getJson.mockResolvedValue({
        status: 200,
        body: {
          'blob-1': {
            cardId,
            blobId: 'blob-1' as BlobID,
            fromDate: '2025-01-01T00:00:00.000Z',
            toDate: '2025-01-05T00:00:00.000Z',
            count: 50 // Not full (< 100)
          }
        }
      } as any)

      // Message with date after the last group
      const messageDate = new Date('2025-01-10T12:00:00.000Z')
      const group = await blob.getMessageGroupByDate(cardId, messageDate, false)

      expect(group).toBeDefined()
      expect(group?.blobId).toBe('blob-1')
      expect(group?.count).toBeLessThan(mockMetadata.messagesPerBlob)
    })

    it('should insert message into first group if date is before all groups and group is not full', async () => {
      mockClient.getJson.mockResolvedValue({
        status: 200,
        body: {
          'blob-1': {
            cardId,
            blobId: 'blob-1' as BlobID,
            fromDate: '2025-01-10T00:00:00.000Z',
            toDate: '2025-01-15T00:00:00.000Z',
            count: 50 // Not full
          }
        }
      } as any)

      // Message with date before the first group
      const messageDate = new Date('2025-01-05T12:00:00.000Z')
      const group = await blob.getMessageGroupByDate(cardId, messageDate, false)

      expect(group).toBeDefined()
      expect(group?.blobId).toBe('blob-1')
      expect(group?.count).toBeLessThan(mockMetadata.messagesPerBlob)
    })

    it('should NOT use last group if it is full', async () => {
      mockClient.getJson.mockResolvedValue({
        status: 200,
        body: {
          'blob-1': {
            cardId,
            blobId: 'blob-1' as BlobID,
            fromDate: '2025-01-01T00:00:00.000Z',
            toDate: '2025-01-05T00:00:00.000Z',
            count: 100 // Full group
          }
        }
      } as any)

      // Message with date after the last group
      const messageDate = new Date('2025-01-10T12:00:00.000Z')
      const group = await blob.getMessageGroupByDate(cardId, messageDate, false)

      // Should not find a group since the only group is full
      expect(group).toBeUndefined()
    })

    it('should NOT use first group if it is full', async () => {
      mockClient.getJson.mockResolvedValue({
        status: 200,
        body: {
          'blob-1': {
            cardId,
            blobId: 'blob-1' as BlobID,
            fromDate: '2025-01-10T00:00:00.000Z',
            toDate: '2025-01-15T00:00:00.000Z',
            count: 100 // Full group
          }
        }
      } as any)

      // Message with date before the first group
      const messageDate = new Date('2025-01-05T12:00:00.000Z')
      const group = await blob.getMessageGroupByDate(cardId, messageDate, false)

      // Should not find a group since the only group is full
      expect(group).toBeUndefined()
    })

    it('should create new group when no suitable group exists and create=true', async () => {
      mockClient.getJson.mockResolvedValue({
        status: 200,
        body: {
          'blob-1': {
            cardId,
            blobId: 'blob-1' as BlobID,
            fromDate: '2025-01-01T00:00:00.000Z',
            toDate: '2025-01-05T00:00:00.000Z',
            count: 100 // Full group
          }
        }
      } as any)

      const messageDate = new Date('2025-01-10T12:00:00.000Z')
      const group = await blob.getMessageGroupByDate(cardId, messageDate, true)

      expect(group).toBeDefined()
      expect(mockClient.patchJson).toHaveBeenCalled()
      expect(mockClient.putJson).toHaveBeenCalled()
    })

    it('should select correct group among multiple groups', async () => {
      mockClient.getJson.mockResolvedValue({
        status: 200,
        body: {
          'blob-1': {
            cardId,
            blobId: 'blob-1' as BlobID,
            fromDate: '2025-01-01T00:00:00.000Z',
            toDate: '2025-01-03T00:00:00.000Z',
            count: 100 // Full
          },
          'blob-2': {
            cardId,
            blobId: 'blob-2' as BlobID,
            fromDate: '2025-01-04T00:00:00.000Z',
            toDate: '2025-01-06T00:00:00.000Z',
            count: 50 // Not full
          },
          'blob-3': {
            cardId,
            blobId: 'blob-3' as BlobID,
            fromDate: '2025-01-07T00:00:00.000Z',
            toDate: '2025-01-09T00:00:00.000Z',
            count: 100 // Full
          }
        }
      } as any)

      // Message should go into blob-2 since its date is in range
      const messageDate = new Date('2025-01-05T12:00:00.000Z')
      const group = await blob.getMessageGroupByDate(cardId, messageDate, false)

      expect(group).toBeDefined()
      expect(group?.blobId).toBe('blob-2')
    })

    it('should use last non-full group for date after all groups', async () => {
      mockClient.getJson.mockResolvedValue({
        status: 200,
        body: {
          'blob-1': {
            cardId,
            blobId: 'blob-1' as BlobID,
            fromDate: '2025-01-01T00:00:00.000Z',
            toDate: '2025-01-03T00:00:00.000Z',
            count: 100 // Full
          },
          'blob-2': {
            cardId,
            blobId: 'blob-2' as BlobID,
            fromDate: '2025-01-04T00:00:00.000Z',
            toDate: '2025-01-06T00:00:00.000Z',
            count: 50 // Not full - last group
          }
        }
      } as any)

      // Message with date after all groups
      const messageDate = new Date('2025-01-10T12:00:00.000Z')
      const group = await blob.getMessageGroupByDate(cardId, messageDate, false)

      expect(group).toBeDefined()
      expect(group?.blobId).toBe('blob-2')
      expect(group?.count).toBeLessThan(mockMetadata.messagesPerBlob)
    })

    it('should handle exact boundary dates correctly', async () => {
      mockClient.getJson.mockResolvedValue({
        status: 200,
        body: {
          'blob-1': {
            cardId,
            blobId: 'blob-1' as BlobID,
            fromDate: '2025-01-01T00:00:00.000Z',
            toDate: '2025-01-05T23:59:59.999Z',
            count: 50
          }
        }
      } as any)

      // Message exactly at the toDate boundary
      const messageDate = new Date('2025-01-05T23:59:59.999Z')
      const group = await blob.getMessageGroupByDate(cardId, messageDate, false)

      expect(group).toBeDefined()
      expect(group?.blobId).toBe('blob-1')
    })
  })
})
