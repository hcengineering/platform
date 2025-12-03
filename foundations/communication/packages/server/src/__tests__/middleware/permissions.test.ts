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

import { AccountRole, MeasureContext, systemAccountUuid, WorkspaceUuid } from '@hcengineering/core'
import {
  Event,
  MessageEventType,
  NotificationEventType,
  PeerEventType,
  SessionData
} from '@hcengineering/communication-sdk-types'
import {
  AccountUuid,
  CardID,
  CardType, ContextID, Emoji,
  Markdown,
  MessageID,
  MessageType, NotificationID,
  SocialID
} from '@hcengineering/communication-types'

import { PermissionsMiddleware } from '../../middleware/permissions'
import { Enriched, Middleware, MiddlewareContext } from '../../types'
import { LowLevelClient } from '../../client'

describe('PermissionsMiddleware', () => {
  let mockContext: MiddlewareContext
  let mockClient: jest.Mocked<LowLevelClient>
  let mockMeasureCtx: jest.Mocked<MeasureContext>
  let mockNext: any
  let session: SessionData
  let middleware: PermissionsMiddleware
  let getMessageMetaMock: jest.MockedFunction<typeof mockClient.getMessageMeta>

  const workspace = 'test-workspace' as WorkspaceUuid
  const accountUuid = 'account-123' as AccountUuid
  const socialId = 'social-123' as SocialID
  const cardId = 'card-123' as CardID

  const basicEvent = {
    _id: 'event-123',
    _eventExtra: {},
    socialId,
    date: new Date()
  } as const

  beforeEach(() => {
    jest.clearAllMocks()

    mockMeasureCtx = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      newChild: jest.fn().mockReturnThis()
    } as any as jest.Mocked<MeasureContext>

    const getMessageMetaFn = jest.fn()

    mockClient = {
      db: {},
      blob: {},
      getMessageMeta: getMessageMetaFn
    } as any as jest.Mocked<LowLevelClient>

    getMessageMetaMock = getMessageMetaFn

    mockNext = {
      event: jest.fn().mockResolvedValue({}),
      findMessagesMeta: jest.fn().mockResolvedValue([]),
      findMessagesGroups: jest.fn().mockResolvedValue([]),
      findNotificationContexts: jest.fn().mockResolvedValue([]),
      findNotifications: jest.fn().mockResolvedValue([]),
      findLabels: jest.fn().mockResolvedValue([]),
      findCollaborators: jest.fn().mockResolvedValue([]),
      findPeers: jest.fn().mockResolvedValue([]),
      subscribeCard: jest.fn(),
      unsubscribeCard: jest.fn(),
      handleBroadcast: jest.fn(),
      closeSession: jest.fn(),
      close: jest.fn()
    } as any as jest.Mocked<Middleware>

    mockContext = {
      ctx: mockMeasureCtx,
      client: mockClient,
      workspace,
      metadata: {
        accountsUrl: 'http://accounts',
        hulylakeUrl: 'http://hulylake',
        secret: 'secret',
        messagesPerBlob: 100
      },
      cadsWithPeers: new Set()
    }

    session = {
      account: {
        uuid: accountUuid,
        socialIds: [socialId],
        role: AccountRole.User
      },
      sessionId: 'session-123'
    } as any as SessionData

    middleware = new PermissionsMiddleware(mockContext, mockNext)
  })

  describe('Derived events', () => {
    it('should skip permission checks for derived events', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId,
        cardType: 'task' as CardType,
        content: 'Test' as Markdown,
        messageType: MessageType.Text,
        socialId: 'other-social' as SocialID
      }

      await middleware.event(session, event, true)

      expect(mockNext.event).toHaveBeenCalledWith(session, event, true)
    })

    it('should allow any operation for derived events', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.UpdatePatch,
        cardId,
        messageId: 'msg-123' as MessageID,
        content: 'Updated' as Markdown,
        socialId: 'other-social' as SocialID
      }

      await middleware.event(session, event, true)

      expect(getMessageMetaMock).not.toHaveBeenCalled()
      expect(mockNext.event).toHaveBeenCalledWith(session, event, true)
    })
  })

  describe('System account', () => {
    it('should allow all operations for system account', async () => {
      const systemSession: SessionData = {
        ...session,
        account: {
          uuid: systemAccountUuid,
          socialIds: [socialId],
          role: AccountRole.User
        }
      } as any as SessionData

      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId,
        cardType: 'task' as CardType,
        content: 'Test' as Markdown,
        messageType: MessageType.Text,
        socialId: 'any-social' as SocialID
      }

      await middleware.event(systemSession, event, false)

      expect(mockNext.event).toHaveBeenCalledWith(systemSession, event, false)
    })

    it('should allow system account to use any socialId', async () => {
      const systemSession: SessionData = {
        ...session,
        account: {
          uuid: systemAccountUuid,
          socialIds: [socialId],
          role: AccountRole.User
        }
      } as any as SessionData

      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.ReactionPatch,
        cardId,
        messageId: 'msg-123' as MessageID,
        operation: { opcode: 'add', reaction: '👍' as Emoji },
        socialId: 'different-social' as SocialID
      }

      await middleware.event(systemSession, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })
  })

  describe('CreateMessage events', () => {
    it('should allow CreateMessage with correct socialId', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId,
        cardType: 'task' as CardType,
        content: 'Test' as Markdown,
        messageType: MessageType.Text
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should reject CreateMessage with incorrect socialId', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId,
        cardType: 'task' as CardType,
        content: 'Test' as Markdown,
        messageType: MessageType.Text,
        socialId: 'other-social' as SocialID
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow()
    })

    it('should force noNotify to false for non-system accounts', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId,
        cardType: 'task' as CardType,
        content: 'Test' as Markdown,
        messageType: MessageType.Text,
        options: { noNotify: true }
      }

      await middleware.event(session, event, false)

      expect(event.options?.noNotify).toBe(false)
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should allow noNotify for system account', async () => {
      const systemSession: SessionData = {
        ...session,
        account: {
          uuid: systemAccountUuid,
          socialIds: [socialId],
          role: AccountRole.User
        }
      } as any as SessionData

      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId,
        cardType: 'task' as CardType,
        content: 'Test' as Markdown,
        messageType: MessageType.Text,
        options: { noNotify: true }
      }

      await middleware.event(systemSession, event, false)

      expect(event.options?.noNotify).toBe(true)
      expect(mockNext.event).toHaveBeenCalledWith(systemSession, event, false)
    })
  })

  describe('UpdatePatch events', () => {
    it('should allow UpdatePatch when user is message author', async () => {
      const messageId = 'msg-123' as MessageID
      getMessageMetaMock.mockResolvedValue({
        creator: socialId,
        cardId,
        id: messageId
      } as any)

      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.UpdatePatch,
        cardId,
        messageId,
        content: 'Updated' as Markdown
      }

      await middleware.event(session, event, false)

      expect(getMessageMetaMock).toHaveBeenCalledWith(cardId, messageId)
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should reject UpdatePatch when user is not message author', async () => {
      const messageId = 'msg-123' as MessageID
      getMessageMetaMock.mockResolvedValue({
        creator: 'other-social' as SocialID,
        cardId,
        id: messageId
      } as any)

      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.UpdatePatch,
        cardId,
        messageId,
        content: 'Updated' as Markdown
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow('message author is not allowed')
    })

    it('should reject UpdatePatch when message not found', async () => {
      getMessageMetaMock.mockResolvedValue(undefined)

      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.UpdatePatch,
        cardId,
        messageId: 'msg-123' as MessageID,
        content: 'Updated' as Markdown
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow('message not found')
    })

    it('should reject UpdatePatch with incorrect socialId', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.UpdatePatch,
        cardId,
        messageId: 'msg-123' as MessageID,
        content: 'Updated' as Markdown,
        socialId: 'other-social' as SocialID
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow()
    })
  })

  describe('RemovePatch events', () => {
    it('should allow RemovePatch when user is message author', async () => {
      const messageId = 'msg-123' as MessageID
      getMessageMetaMock.mockResolvedValue({
        creator: socialId,
        cardId,
        id: messageId
      } as any)

      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.RemovePatch,
        cardId,
        messageId
      }

      await middleware.event(session, event, false)

      expect(getMessageMetaMock).toHaveBeenCalledWith(cardId, messageId)
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should reject RemovePatch when user is not message author', async () => {
      const messageId = 'msg-123' as MessageID
      getMessageMetaMock.mockResolvedValue({
        creator: 'other-social' as SocialID,
        cardId,
        id: messageId
      } as any)

      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.RemovePatch,
        cardId,
        messageId
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow('message author is not allowed')
    })
  })

  describe('AttachmentPatch and BlobPatch events', () => {
    it('should allow AttachmentPatch when user is message author', async () => {
      const messageId = 'msg-123' as MessageID
      getMessageMetaMock.mockResolvedValue({
        creator: socialId,
        cardId,
        id: messageId
      } as any)

      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.AttachmentPatch,
        cardId,
        messageId,
        operations: []
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should allow BlobPatch when user is message author', async () => {
      const messageId = 'msg-123' as MessageID
      getMessageMetaMock.mockResolvedValue({
        creator: socialId,
        cardId,
        id: messageId
      } as any)

      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.BlobPatch,
        cardId,
        messageId,
        operations: []
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })
  })

  describe('ReactionPatch and ThreadPatch events', () => {
    it('should allow ReactionPatch with correct socialId', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.ReactionPatch,
        cardId,
        messageId: 'msg-123' as MessageID,
        operation: { opcode: 'add', reaction: '👍' as Emoji }
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should reject ReactionPatch with incorrect socialId', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.ReactionPatch,
        cardId,
        messageId: 'msg-123' as MessageID,
        operation: { opcode: 'add', reaction: '👍' as Emoji },
        socialId: 'other-social' as SocialID
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow()
    })

    it('should allow ThreadPatch with correct socialId', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.ThreadPatch,
        cardId,
        messageId: 'msg-123' as MessageID,
        operation: { opcode: 'attach', threadId: 'thread-123' as CardID, threadType: 'threadType' as CardType }
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should reject ThreadPatch with incorrect socialId', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.ThreadPatch,
        cardId,
        messageId: 'msg-123' as MessageID,
        operation: { opcode: 'attach', threadId: 'thread-123' as CardID, threadType: 'threadType' as CardType },
        socialId: 'other-social' as SocialID
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow()
    })
  })

  describe('Notification events', () => {
    it('should allow UpdateNotificationContext for own account', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: NotificationEventType.UpdateNotificationContext,
        contextId: 'ctx-123' as ContextID,
        account: accountUuid,
        updates: {}
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should reject UpdateNotificationContext for other account', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: NotificationEventType.UpdateNotificationContext,
        contextId: 'ctx-123' as ContextID,
        account: 'other-account' as AccountUuid,
        updates: {}
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow()
    })

    it('should allow RemoveNotifications for own account', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: NotificationEventType.RemoveNotifications,
        contextId: 'ctx-123' as ContextID,
        account: accountUuid,
        ids: ['notif-1' as NotificationID]
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should reject RemoveNotifications for other account', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: NotificationEventType.RemoveNotifications,
        contextId: 'ctx-123' as ContextID,
        account: 'other-account' as AccountUuid,
        ids: ['notif-1' as NotificationID]
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow()
    })

    it('should allow UpdateNotification for own account', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: NotificationEventType.UpdateNotification,
        contextId: 'ctx-123' as ContextID,
        account: accountUuid,
        updates: { read: true },
        query: {}
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should allow RemoveNotificationContext for own account', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: NotificationEventType.RemoveNotificationContext,
        contextId: 'ctx-123' as ContextID,
        account: accountUuid
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })
  })

  describe('System-only operations', () => {
    it('should reject TranslateMessage for non-system account', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.TranslateMessage,
        cardId,
        content: '',
        messageId: 'msg-123' as MessageID,
        language: 'en'
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow()
    })

    it('should allow TranslateMessage for system account', async () => {
      const systemSession: SessionData = {
        ...session,
        account: {
          uuid: systemAccountUuid,
          socialIds: [socialId],
          role: AccountRole.User
        }
      } as any as SessionData

      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.TranslateMessage,
        cardId,
        messageId: 'msg-123' as MessageID,
        language: 'en',
        content: ''
      }

      await middleware.event(systemSession, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should reject CreatePeer for non-system account', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: PeerEventType.CreatePeer,
        workspaceId: workspace,
        cardId,
        value: '123',
        kind: 'card'
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow()
    })

    it('should allow CreatePeer for system account', async () => {
      const systemSession: SessionData = {
        ...session,
        account: {
          uuid: systemAccountUuid,
          socialIds: [socialId],
          role: AccountRole.User
        }
      } as any as SessionData

      const event: Enriched<Event> = {
        ...basicEvent,
        type: PeerEventType.CreatePeer,
        workspaceId: workspace,
        cardId,
        value: '123',
        kind: 'card'
      }

      await middleware.event(systemSession, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should reject RemovePeer for non-system account', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: PeerEventType.RemovePeer,
        workspaceId: workspace,
        cardId,
        kind: 'card',
        value: '123'
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow()
    })

    it('should allow RemovePeer for system account', async () => {
      const systemSession: SessionData = {
        ...session,
        account: {
          uuid: systemAccountUuid,
          socialIds: [socialId],
          role: AccountRole.User
        }
      } as any as SessionData

      const event: Enriched<Event> = {
        ...basicEvent,
        workspaceId: workspace,
        type: PeerEventType.RemovePeer,
        cardId,
        kind: 'card',
        value: '123'
      }

      await middleware.event(systemSession, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })
  })

  describe('Collaborators events', () => {
    it('should allow AddCollaborators with correct socialId', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: NotificationEventType.AddCollaborators,
        cardId,
        cardType: 'task' as CardType,
        collaborators: [accountUuid]
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should reject AddCollaborators with incorrect socialId', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: NotificationEventType.AddCollaborators,
        cardId,
        cardType: 'task' as CardType,
        collaborators: [accountUuid],
        socialId: 'other-social' as SocialID
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow()
    })

    it('should allow RemoveCollaborators with correct socialId', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: NotificationEventType.RemoveCollaborators,
        cardId,
        cardType: 'task' as CardType,
        collaborators: [accountUuid]
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should reject RemoveCollaborators with incorrect socialId', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: NotificationEventType.RemoveCollaborators,
        cardId,
        cardType: 'task' as CardType,
        collaborators: [accountUuid],
        socialId: 'other-social' as SocialID
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow()
    })
  })

  describe('Middleware chaining', () => {
    it('should call next middleware and return its result', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId,
        cardType: 'task' as CardType,
        content: 'Test' as Markdown,
        messageType: MessageType.Text
      }

      const expectedResult = { success: true, eventId: 'event-123' }
      mockNext.event.mockResolvedValue(expectedResult)

      const result = await middleware.event(session, event, false)

      expect(result).toEqual(expectedResult)
      expect(mockNext.event).toHaveBeenCalledTimes(1)
    })
  })
})
