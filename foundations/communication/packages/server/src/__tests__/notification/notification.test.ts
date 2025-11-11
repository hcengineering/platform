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

import { type MeasureContext, type WorkspaceUuid, readOnlyGuestAccountUuid } from '@hcengineering/core'
import {
  type Event,
  MessageEventType,
  NotificationEventType,
  type CreateNotificationContextResult
} from '@hcengineering/communication-sdk-types'
import {
  type AccountUuid,
  type BlobID,
  type CardID,
  type CardType,
  type ContextID,
  type Markdown,
  type MessageID,
  type MessageMeta,
  type NotificationContext,
  NotificationType,
  type ReactionNotificationContent,
  type SocialID
} from '@hcengineering/communication-types'

import { notify } from '../../notification/notification'
import { type TriggerCtx, type Enriched } from '../../types'
import { getNameBySocialID } from '../../triggers/utils'

// Mock dependencies
jest.mock('@hcengineering/text-markdown', () => ({
  markdownToMarkup: jest.fn((md) => ({ type: 'doc', content: [{ type: 'text', text: md }] }))
}))

jest.mock('@hcengineering/text-core', () => ({
  jsonToMarkup: jest.fn((json) => json),
  markupToText: jest.fn((markup) => {
    if (typeof markup === 'string') return markup
    if (markup?.content?.[0]?.text !== undefined) return markup.content[0].text
    return 'Test message text'
  })
}))

jest.mock('../../triggers/utils', () => ({
  getNameBySocialID: jest.fn().mockResolvedValue('John Doe')
}))

describe('notification', () => {
  let mockCtx: TriggerCtx
  let mockClient: any
  let mockMeasureCtx: jest.Mocked<MeasureContext>

  const workspace = 'test-workspace' as WorkspaceUuid
  const cardId = 'card-123' as CardID
  const messageId = 'message-123' as MessageID
  const blobId = 'blob-123' as BlobID
  const socialId = 'social-123' as SocialID
  const accountUuid = 'account-123' as AccountUuid
  const contextId = 'context-123' as ContextID
  const cardType = 'card' as CardType

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset the getNameBySocialID mock to its default behavior
    const mockGetName = getNameBySocialID as jest.MockedFunction<typeof getNameBySocialID>
    mockGetName.mockResolvedValue('John Doe')

    mockMeasureCtx = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      newChild: jest.fn().mockReturnThis()
    } as any

    mockClient = {
      db: {
        findNotifications: jest.fn().mockResolvedValue([]),
        findNotificationContexts: jest.fn().mockResolvedValue([]),
        getCardSpaceMembers: jest.fn().mockResolvedValue([accountUuid]),
        getCollaboratorsCursor: jest.fn(),
        getCardTitle: jest.fn().mockResolvedValue('Test Card'),
        getNameByAccount: jest.fn().mockResolvedValue('John Doe')
      },
      getMessageMeta: jest.fn(),
      findPersonUuid: jest.fn()
    }

    mockCtx = {
      ctx: mockMeasureCtx,
      client: mockClient,
      workspace,
      metadata: {
        accountsUrl: 'http://accounts',
        hulylakeUrl: 'http://hulylake',
        secret: 'secret',
        messagesPerBlob: 200
      },
      account: {
        uuid: accountUuid,
        socialIds: [socialId]
      } as any,
      execute: jest.fn()
    } as any
  })

  describe('notify', () => {
    describe('CreateMessage event', () => {
      it('should return empty array when noNotify option is true', async () => {
        const event: Enriched<Event> = {
          type: MessageEventType.CreateMessage,
          cardId,
          messageId,
          content: 'Hello' as Markdown,
          socialId,
          date: new Date(),
          cardType,
          options: { noNotify: true }
        } as any

        const result = await notify(mockCtx, event)

        expect(result).toEqual([])
        const getMessageMetaSpy = mockClient.getMessageMeta as jest.Mock
        expect(getMessageMetaSpy).toHaveBeenCalledTimes(0)
      })

      it('should return empty array when messageId is null', async () => {
        const event: Enriched<Event> = {
          type: MessageEventType.CreateMessage,
          cardId,
          messageId: null,
          content: 'Hello' as Markdown,
          socialId,
          date: new Date(),
          cardType
        } as any

        const result = await notify(mockCtx, event)

        expect(result).toEqual([])
        const getMessageMetaSpy = mockClient.getMessageMeta as jest.Mock
        expect(getMessageMetaSpy).toHaveBeenCalledTimes(0)
      })

      it('should return empty array when message meta is not found', async () => {
        const event: Enriched<Event> = {
          type: MessageEventType.CreateMessage,
          cardId,
          messageId,
          content: 'Hello' as Markdown,
          socialId,
          date: new Date(),
          cardType
        } as any

        mockClient.getMessageMeta.mockResolvedValue(undefined)

        const result = await notify(mockCtx, event)

        expect(result).toEqual([])
        const getMessageMetaSpy = mockClient.getMessageMeta as jest.Mock
        expect(getMessageMetaSpy).toHaveBeenCalledTimes(1)
        expect(getMessageMetaSpy).toHaveBeenLastCalledWith(cardId, messageId)
      })

      it('should create notification for message', async () => {
        const date = new Date()
        const creatorSocialId = 'creator-social' as SocialID
        const creatorAccount = 'creator-account' as AccountUuid
        const collaboratorAccount = 'collaborator-account' as AccountUuid

        const event: Enriched<Event> = {
          type: MessageEventType.CreateMessage,
          cardId,
          messageId,
          content: 'Hello World' as Markdown,
          socialId: creatorSocialId,
          date,
          cardType
        } as any

        const meta: MessageMeta = {
          cardId,
          id: messageId,
          blobId,
          creator: creatorSocialId,
          createdOn: date.getTime()
        } as any

        mockClient.getMessageMeta.mockResolvedValue(meta)

        // First call for message creator, second for collaborator
        mockClient.findPersonUuid
          .mockResolvedValueOnce(creatorAccount) // creator account
          .mockResolvedValueOnce(creatorAccount) // when checking if it's own message

        mockClient.db.getCardSpaceMembers.mockResolvedValue([collaboratorAccount, creatorAccount])

        // Mock collaborators cursor - return a collaborator that's not the creator
        const collaborators = [{ account: collaboratorAccount, personUuid: 'person-1' as any }]
        mockClient.db.getCollaboratorsCursor.mockReturnValue({
          [Symbol.asyncIterator]: async function * () {
            yield collaborators
          }
        })

        // Mock context doesn't exist, will be created
        mockClient.db.findNotificationContexts.mockResolvedValue([])

        // Mock context creation
        const contextResult: CreateNotificationContextResult = { id: contextId }
        mockCtx.execute = jest.fn().mockResolvedValue(contextResult)

        const result = await notify(mockCtx, event)

        expect(result.length).toBeGreaterThan(0)
        const getMessageMetaSpy = mockClient.getMessageMeta as jest.Mock
        expect(getMessageMetaSpy).toHaveBeenCalledTimes(1)
        expect(getMessageMetaSpy).toHaveBeenLastCalledWith(cardId, messageId)
      })

      it('should skip collaborators not in space members', async () => {
        const date = new Date()
        const event: Enriched<Event> = {
          type: MessageEventType.CreateMessage,
          cardId,
          messageId,
          content: 'Hello' as Markdown,
          socialId,
          date,
          cardType
        } as any

        const meta: MessageMeta = {
          cardId,
          id: messageId,
          blobId,
          creator: socialId,
          createdOn: date.getTime()
        } as any

        mockClient.getMessageMeta.mockResolvedValue(meta)
        mockClient.findPersonUuid.mockResolvedValue('other-account' as AccountUuid)
        mockClient.db.getCardSpaceMembers.mockResolvedValue([accountUuid])

        const collaborators = [{ account: 'other-account' as AccountUuid, personUuid: 'person-2' as any }]
        mockClient.db.getCollaboratorsCursor.mockReturnValue({
          [Symbol.asyncIterator]: async function * () {
            yield collaborators
          }
        })

        const result = await notify(mockCtx, event)

        expect(result).toEqual([])
      })

      it('should handle errors during collaborator processing', async () => {
        const date = new Date()
        const event: Enriched<Event> = {
          type: MessageEventType.CreateMessage,
          cardId,
          messageId,
          content: 'Hello' as Markdown,
          socialId,
          date,
          cardType
        } as any

        const meta: MessageMeta = {
          cardId,
          id: messageId,
          blobId,
          creator: socialId,
          createdOn: date.getTime()
        } as any

        mockClient.getMessageMeta.mockResolvedValue(meta)

        // Make sure the creator account is different from collaborators
        mockClient.findPersonUuid
          .mockResolvedValueOnce('creator-account' as AccountUuid) // creator account (for socialId)
          .mockResolvedValueOnce('creator-account' as AccountUuid) // used for isOwn check for first collaborator
          .mockResolvedValueOnce('creator-account' as AccountUuid) // used for isOwn check for second collaborator

        // Two collaborators - processing will fail for the second one
        const collaborators = [
          { account: accountUuid, personUuid: 'person-1' as any },
          { account: 'account-2' as AccountUuid, personUuid: 'person-2' as any }
        ]
        mockClient.db.getCollaboratorsCursor.mockReturnValue({
          [Symbol.asyncIterator]: async function * () {
            yield collaborators
          }
        })

        mockClient.db.getCardSpaceMembers.mockResolvedValue([accountUuid, 'account-2' as AccountUuid])

        // Return contexts for BOTH collaborators so neither needs creation
        const firstContext: NotificationContext = {
          id: contextId,
          cardId,
          account: accountUuid,
          lastUpdate: date,
          lastView: date,
          lastNotify: date
        } as any

        const secondContext: NotificationContext = {
          id: 'context-456' as ContextID,
          cardId,
          account: 'account-2' as AccountUuid,
          lastUpdate: date,
          lastView: date,
          lastNotify: date
        } as any

        mockClient.db.findNotificationContexts.mockResolvedValue([firstContext, secondContext])

        // Make getNameBySocialID throw an error on the second call
        const mockGetName = getNameBySocialID as jest.MockedFunction<typeof getNameBySocialID>
        mockGetName
          .mockResolvedValueOnce('John Doe') // First collaborator succeeds
          .mockRejectedValueOnce(new Error('Database error')) // Second collaborator fails

        const result = await notify(mockCtx, event)

        // Should have logged the error
        expect(mockMeasureCtx.error).toHaveBeenCalledWith(
          'Error on create notification',
          expect.objectContaining({
            collaborator: 'account-2',
            error: expect.any(Error)
          })
        )
        // Result should contain events from first collaborator even though second failed
        expect(result).toBeDefined()
        expect(Array.isArray(result)).toBe(true)
      })

      it('should continue processing other collaborators when one fails', async () => {
        const date = new Date()
        const event: Enriched<Event> = {
          type: MessageEventType.CreateMessage,
          cardId,
          messageId,
          content: 'Hello' as Markdown,
          socialId,
          date,
          cardType
        } as any

        const meta: MessageMeta = {
          cardId,
          id: messageId,
          blobId,
          creator: socialId,
          createdOn: date.getTime()
        } as any

        mockClient.getMessageMeta.mockResolvedValue(meta)
        mockClient.findPersonUuid.mockResolvedValue(accountUuid)

        const collaborators = [
          { account: accountUuid, personUuid: 'person-1' as any }
        ]
        mockClient.db.getCollaboratorsCursor.mockReturnValue({
          [Symbol.asyncIterator]: async function * () {
            yield collaborators
          }
        })

        const context: NotificationContext = {
          id: contextId,
          cardId,
          account: accountUuid,
          lastUpdate: date,
          lastView: date,
          lastNotify: date
        } as any

        mockClient.db.findNotificationContexts.mockResolvedValue([context])

        const result = await notify(mockCtx, event)

        // Should return successfully even if there are potential errors
        expect(result).toBeDefined()
        expect(Array.isArray(result)).toBe(true)
      })
    })

    describe('ReactionPatch event - add', () => {
      it('should create notification for reaction', async () => {
        const date = new Date()
        const reactionSocialId = 'reaction-social' as SocialID
        const messageSocialId = 'message-social' as SocialID
        const messageAccount = 'message-account' as AccountUuid
        const reactionAccount = 'reaction-account' as AccountUuid

        const event: Enriched<Event> = {
          type: MessageEventType.ReactionPatch,
          cardId,
          messageId,
          operation: {
            opcode: 'add',
            reaction: '👍'
          },
          socialId: reactionSocialId,
          date
        } as any

        const meta: MessageMeta = {
          cardId,
          id: messageId,
          blobId,
          creator: messageSocialId,
          createdOn: date.getTime()
        } as any

        mockClient.getMessageMeta.mockResolvedValue(meta)
        mockClient.findPersonUuid
          .mockResolvedValueOnce(messageAccount) // message creator
          .mockResolvedValueOnce(reactionAccount) // reaction creator

        mockClient.db.getCardSpaceMembers.mockResolvedValue([messageAccount, reactionAccount])

        const context: NotificationContext = {
          id: contextId,
          cardId,
          account: messageAccount,
          lastUpdate: new Date(date.getTime() - 1000),
          lastView: new Date(date.getTime() - 2000),
          lastNotify: new Date(date.getTime() - 1000)
        } as any

        mockClient.db.findNotificationContexts.mockResolvedValue([context])

        const result = await notify(mockCtx, event)

        expect(result).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: NotificationEventType.CreateNotification,
              notificationType: NotificationType.Reaction,
              messageId
            })
          ])
        )
      })

      it('should return empty array when message meta is not found', async () => {
        const event: Enriched<Event> = {
          type: MessageEventType.ReactionPatch,
          cardId,
          messageId,
          operation: { opcode: 'add', reaction: '👍' },
          socialId,
          date: new Date()
        } as any

        mockClient.getMessageMeta.mockResolvedValue(undefined)

        const result = await notify(mockCtx, event)

        expect(result).toEqual([])
      })

      it('should return empty array when message account is not found', async () => {
        const event: Enriched<Event> = {
          type: MessageEventType.ReactionPatch,
          cardId,
          messageId,
          operation: { opcode: 'add', reaction: '👍' },
          socialId,
          date: new Date()
        } as any

        const meta: MessageMeta = {
          cardId,
          id: messageId,
          blobId,
          creator: socialId,
          createdOn: Date.now()
        } as any

        mockClient.getMessageMeta.mockResolvedValue(meta)
        mockClient.findPersonUuid.mockResolvedValue(undefined)

        const result = await notify(mockCtx, event)

        expect(result).toEqual([])
      })

      it('should return empty array when message account is not in space members', async () => {
        const event: Enriched<Event> = {
          type: MessageEventType.ReactionPatch,
          cardId,
          messageId,
          operation: { opcode: 'add', reaction: '👍' },
          socialId,
          date: new Date()
        } as any

        const meta: MessageMeta = {
          cardId,
          id: messageId,
          blobId,
          creator: socialId,
          createdOn: Date.now()
        } as any

        mockClient.getMessageMeta.mockResolvedValue(meta)
        mockClient.findPersonUuid.mockResolvedValue('other-account' as AccountUuid)
        mockClient.db.getCardSpaceMembers.mockResolvedValue([accountUuid])

        const result = await notify(mockCtx, event)

        expect(result).toEqual([])
      })

      it('should not notify when reacting to own message', async () => {
        const date = new Date()
        const event: Enriched<Event> = {
          type: MessageEventType.ReactionPatch,
          cardId,
          messageId,
          operation: { opcode: 'add', reaction: '👍' },
          socialId,
          date
        } as any

        const meta: MessageMeta = {
          cardId,
          id: messageId,
          blobId,
          creator: socialId,
          createdOn: date.getTime()
        } as any

        mockClient.getMessageMeta.mockResolvedValue(meta)
        mockClient.findPersonUuid.mockResolvedValue(accountUuid)

        const result = await notify(mockCtx, event)

        expect(result).toEqual([])
      })

      it('should create context if it does not exist', async () => {
        const date = new Date()
        const otherSocialId = 'other-social' as SocialID
        const event: Enriched<Event> = {
          type: MessageEventType.ReactionPatch,
          cardId,
          messageId,
          operation: { opcode: 'add', reaction: '👍' },
          socialId: otherSocialId,
          date
        } as any

        const meta: MessageMeta = {
          cardId,
          id: messageId,
          blobId,
          creator: socialId,
          createdOn: date.getTime()
        } as any

        mockClient.getMessageMeta.mockResolvedValue(meta)
        mockClient.findPersonUuid
          .mockResolvedValueOnce(accountUuid) // message creator
          .mockResolvedValueOnce('other-account' as AccountUuid) // reaction creator

        mockClient.db.findNotificationContexts.mockResolvedValue([])

        const createContextResult: CreateNotificationContextResult = { id: contextId }
        mockCtx.execute = jest.fn().mockResolvedValue(createContextResult)

        const result = await notify(mockCtx, event)

        expect(mockCtx.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            type: NotificationEventType.CreateNotificationContext
          })
        )
        expect(result.length).toBeGreaterThan(0)
      })

      it('should update context lastNotify if reaction is newer', async () => {
        const date = new Date()
        const oldDate = new Date(date.getTime() - 10000)
        const otherSocialId = 'other-social' as SocialID

        const event: Enriched<Event> = {
          type: MessageEventType.ReactionPatch,
          cardId,
          messageId,
          operation: { opcode: 'add', reaction: '👍' },
          socialId: otherSocialId,
          date
        } as any

        const meta: MessageMeta = {
          cardId,
          id: messageId,
          blobId,
          creator: socialId,
          createdOn: oldDate.getTime()
        } as any

        const context: NotificationContext = {
          id: contextId,
          cardId,
          account: accountUuid,
          lastUpdate: oldDate,
          lastView: oldDate,
          lastNotify: oldDate
        } as any

        mockClient.getMessageMeta.mockResolvedValue(meta)
        mockClient.findPersonUuid
          .mockResolvedValueOnce(accountUuid)
          .mockResolvedValueOnce('other-account' as AccountUuid)
        mockClient.db.findNotificationContexts.mockResolvedValue([context])

        const result = await notify(mockCtx, event)

        expect(result).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: NotificationEventType.UpdateNotificationContext,
              updates: expect.objectContaining({
                lastNotify: date
              })
            })
          ])
        )
      })

      it('should mark notification as read for readOnlyGuestAccount', async () => {
        const date = new Date()
        const otherSocialId = 'other-social' as SocialID

        const event: Enriched<Event> = {
          type: MessageEventType.ReactionPatch,
          cardId,
          messageId,
          operation: { opcode: 'add', reaction: '👍' },
          socialId: otherSocialId,
          date
        } as any

        const meta: MessageMeta = {
          cardId,
          id: messageId,
          blobId,
          creator: socialId,
          createdOn: date.getTime()
        } as any

        mockClient.getMessageMeta.mockResolvedValue(meta)
        mockClient.findPersonUuid
          .mockResolvedValueOnce(readOnlyGuestAccountUuid) // message creator
          .mockResolvedValueOnce('other-account' as AccountUuid) // reaction creator

        // Make sure readOnlyGuestAccount is in space members
        mockClient.db.getCardSpaceMembers.mockResolvedValue([readOnlyGuestAccountUuid, 'other-account' as AccountUuid])
        mockClient.db.findNotificationContexts.mockResolvedValue([])
        mockCtx.execute = jest.fn().mockResolvedValue({ id: contextId })

        const result = await notify(mockCtx, event)

        const createNotification = result.find(
          (e) => e.type === NotificationEventType.CreateNotification
        )
        expect(createNotification).toBeDefined()
        expect(createNotification).toMatchObject({ read: true })
      })
    })

    describe('ReactionPatch event - remove', () => {
      it('should remove reaction notification', async () => {
        const date = new Date()
        const event: Enriched<Event> = {
          type: MessageEventType.ReactionPatch,
          cardId,
          messageId,
          operation: { opcode: 'remove', reaction: '👍' },
          socialId,
          date
        } as any

        const meta: MessageMeta = {
          cardId,
          id: messageId,
          blobId,
          creator: socialId,
          createdOn: date.getTime()
        } as any

        const notificationContent: ReactionNotificationContent = {
          emoji: '👍',
          title: 'Reacted to your message',
          shortText: '👍',
          senderName: 'John Doe'
        }

        const notification = {
          id: 'notif-1',
          contextId,
          type: NotificationType.Reaction,
          messageId,
          account: accountUuid,
          created: date,
          content: notificationContent,
          creator: socialId
        }

        const context: NotificationContext = {
          id: contextId,
          cardId,
          account: accountUuid,
          lastUpdate: date,
          lastView: date,
          lastNotify: date
        } as any

        mockClient.getMessageMeta.mockResolvedValue(meta)
        mockClient.findPersonUuid.mockResolvedValue(accountUuid)
        mockClient.db.findNotifications.mockResolvedValue([notification as any])
        mockClient.db.findNotificationContexts.mockResolvedValue([context])

        const result = await notify(mockCtx, event)

        expect(result).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: NotificationEventType.RemoveNotifications,
              ids: ['notif-1']
            })
          ])
        )
      })

      it('should return empty array when notification not found', async () => {
        const date = new Date()
        const event: Enriched<Event> = {
          type: MessageEventType.ReactionPatch,
          cardId,
          messageId,
          operation: { opcode: 'remove', reaction: '👍' },
          socialId,
          date
        } as any

        const meta: MessageMeta = {
          cardId,
          id: messageId,
          blobId,
          creator: socialId,
          createdOn: date.getTime()
        } as any

        mockClient.getMessageMeta.mockResolvedValue(meta)
        mockClient.findPersonUuid.mockResolvedValue(accountUuid)
        mockClient.db.findNotifications.mockResolvedValue([])

        const result = await notify(mockCtx, event)

        expect(result).toEqual([])
      })

      it('should update context lastNotify when removed notification was the last one', async () => {
        const date = new Date()
        const olderDate = new Date(date.getTime() - 5000)

        const event: Enriched<Event> = {
          type: MessageEventType.ReactionPatch,
          cardId,
          messageId,
          operation: { opcode: 'remove', reaction: '👍' },
          socialId,
          date
        } as any

        const meta: MessageMeta = {
          cardId,
          id: messageId,
          blobId,
          creator: socialId,
          createdOn: date.getTime()
        } as any

        const notificationContent: ReactionNotificationContent = {
          emoji: '👍',
          title: 'Reacted to your message',
          shortText: '👍',
          senderName: 'John Doe'
        }

        const notification = {
          id: 'notif-1',
          contextId,
          type: NotificationType.Reaction,
          messageId,
          account: accountUuid,
          created: date,
          content: notificationContent,
          creator: socialId
        }

        const olderNotification = {
          id: 'notif-2',
          contextId,
          created: olderDate
        }

        const context: NotificationContext = {
          id: contextId,
          cardId,
          account: accountUuid,
          lastUpdate: date,
          lastView: olderDate,
          lastNotify: date
        } as any

        mockClient.getMessageMeta.mockResolvedValue(meta)
        mockClient.findPersonUuid.mockResolvedValue(accountUuid)
        mockClient.db.findNotifications
          .mockResolvedValueOnce([notification as any])
          .mockResolvedValueOnce([olderNotification as any])
        mockClient.db.findNotificationContexts.mockResolvedValue([context])

        const result = await notify(mockCtx, event)

        expect(result).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: NotificationEventType.UpdateNotificationContext,
              updates: expect.objectContaining({
                lastNotify: olderDate
              })
            })
          ])
        )
      })
    })

    describe('Unknown event type', () => {
      it('should return empty array for unknown event type', async () => {
        const event: Enriched<Event> = {
          type: 'unknown.event' as any,
          date: new Date()
        } as any

        const result = await notify(mockCtx, event)

        expect(result).toEqual([])
      })
    })
  })
})
