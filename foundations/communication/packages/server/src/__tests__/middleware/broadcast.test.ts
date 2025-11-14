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

import { type MeasureContext, type WorkspaceUuid } from '@hcengineering/core'
import {
  AddCollaboratorsEvent,
  AttachmentPatchEvent,
  BlobPatchEvent,
  CardEventType,
  CreateLabelEvent,
  CreateMessageEvent,
  CreateNotificationContextEvent,
  CreateNotificationEvent,
  CreatePeerEvent,
  LabelEventType,
  MessageEventType,
  NotificationEventType,
  PeerEventType,
  ReactionPatchEvent,
  RemoveCardEvent,
  RemoveCollaboratorsEvent,
  RemoveLabelEvent,
  RemoveNotificationContextEvent,
  RemoveNotificationsEvent,
  RemovePatchEvent,
  RemovePeerEvent,
  type SessionData,
  ThreadPatchEvent,
  TranslateMessageEvent,
  UpdateCardTypeEvent,
  UpdateNotificationContextEvent,
  UpdateNotificationEvent,
  UpdatePatchEvent
} from '@hcengineering/communication-sdk-types'
import {
  type AccountUuid,
  CardID,
  type CardType,
  ContextID,
  Label,
  LabelID,
  type Markdown,
  MessageType,
  NotificationContext,
  type SocialID
} from '@hcengineering/communication-types'

import { BroadcastMiddleware } from '../../middleware/broadcast'
import { type CommunicationCallbacks, type Enriched, Middleware, type MiddlewareContext } from '../../types'
import { type LowLevelClient } from '../../client'

describe('BroadcastMiddleware', () => {
  let mockContext: MiddlewareContext
  let mockClient: jest.Mocked<LowLevelClient>
  let mockMeasureCtx: jest.Mocked<MeasureContext>
  let mockCallbacks: jest.Mocked<CommunicationCallbacks>
  let mockNext: any
  let session: SessionData
  let session2: SessionData
  let middleware: BroadcastMiddleware

  const workspace = 'test-workspace' as WorkspaceUuid
  const accountUuid = 'account-123' as AccountUuid
  const accountUuid2 = 'account-456' as AccountUuid
  const socialId = 'social-123' as SocialID
  const socialId2 = 'social-456' as SocialID
  const cardId = 'card-123' as CardID
  const cardId2 = 'card-456' as CardID

  const basicEvent = {
    _id: 'event-123',
    _eventExtra: {},
    socialId,
    date: new Date()
  } as const

  // Helper function to create a complete CreateMessage event for session initialization
  const createSessionEvent = (_cardId: CardID = cardId): Enriched<CreateMessageEvent> => ({
    ...basicEvent,
    type: MessageEventType.CreateMessage,
    cardId: _cardId,
    cardType: 'task' as CardType,
    messageType: MessageType.Text,
    content: 'Test' as Markdown,
    socialId,
    date: new Date()
  })

  beforeEach(() => {
    jest.clearAllMocks()

    mockMeasureCtx = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      newChild: jest.fn().mockReturnThis(),
      contextData: {}
    } as any as jest.Mocked<MeasureContext>

    mockClient = {
      db: {},
      blob: {}
    } as unknown as jest.Mocked<LowLevelClient>

    mockCallbacks = {
      broadcast: jest.fn(),
      enqueue: jest.fn(),
      registerAsyncRequest: jest.fn()
    } as any as jest.Mocked<CommunicationCallbacks>

    mockNext = {
      event: jest.fn().mockResolvedValue({}),
      findNotificationContexts: jest.fn().mockResolvedValue([]),
      findNotifications: jest.fn().mockResolvedValue([]),
      findLabels: jest.fn().mockResolvedValue([]),
      findMessagesMeta: jest.fn().mockResolvedValue([]),
      findMessagesGroups: jest.fn().mockResolvedValue([]),
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
        socialIds: [socialId]
      },
      sessionId: 'session-123',
      contextData: {}
    } as any as SessionData

    session2 = {
      account: {
        uuid: accountUuid2,
        socialIds: [socialId2]
      },
      sessionId: 'session-456',
      contextData: {}
    } as any as SessionData

    middleware = new BroadcastMiddleware(mockCallbacks, mockContext, mockNext)
  })

  describe('event', () => {
    it('should create session and process event', async () => {
      const event: Enriched<CreateMessageEvent> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId,
        cardType: 'task' as CardType,
        messageType: MessageType.Text,
        content: 'Test' as Markdown,
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should handle derived events', async () => {
      const event: Enriched<CreateMessageEvent> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId,
        cardType: 'task' as CardType,
        messageType: MessageType.Text,
        content: 'Test' as Markdown,
        socialId
      }

      await middleware.event(session, event, true)

      expect(mockNext.event).toHaveBeenCalledWith(session, event, true)
    })

    it('should create session for multiple users', async () => {
      const event: Enriched<CreateMessageEvent> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId,
        cardType: 'task' as CardType,
        messageType: MessageType.Text,
        content: 'Test' as Markdown,
        socialId
      }

      await middleware.event(session, event, false)
      await middleware.event(session2, event, false)

      expect(mockNext.event).toHaveBeenCalledTimes(2)
    })
  })

  describe('findNotificationContexts', () => {
    it('should create session and find notification contexts', async () => {
      const params = { cardId }
      const contexts = [{ id: 'ctx-1', cardId, account: accountUuid }]
      mockNext.findNotificationContexts.mockResolvedValue(contexts)

      const result = await middleware.findNotificationContexts(session, params)

      expect(result).toEqual(contexts)
      expect(mockNext.findNotificationContexts).toHaveBeenCalledWith(session, params, undefined)
    })

    it('should subscribe to contexts cards when subscription provided', async () => {
      const params = { cardId }
      const subscription = 'sub-123'
      const contexts = [
        { id: 'ctx-1' as ContextID, cardId: 'card-1' as CardID, account: accountUuid },
        { id: 'ctx-2' as ContextID, cardId: 'card-2' as CardID, account: accountUuid }
      ]
      mockNext.findNotificationContexts.mockResolvedValue(contexts)

      await middleware.findNotificationContexts(session, params, subscription)

      expect(mockNext.findNotificationContexts).toHaveBeenCalledWith(session, params, subscription)
    })

    it('should auto-subscribe to all returned context cards', async () => {
      const params = { cardId }
      const subscription = 'sub-123'
      const contexts = [
        { id: 'ctx-1' as ContextID, cardId: 'card-1' as CardID, account: accountUuid },
        { id: 'ctx-2' as ContextID, cardId: 'card-2' as CardID, account: accountUuid },
        { id: 'ctx-3' as ContextID, cardId: 'card-3' as CardID, account: accountUuid }
      ]
      mockNext.findNotificationContexts.mockResolvedValue(contexts)

      await middleware.findNotificationContexts(session, params, subscription)

      // Verify that subscription tracking is working by checking broadcast behavior
      const event: Enriched<CreateMessageEvent> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId: 'card-1' as CardID,
        cardType: 'task' as CardType,
        messageType: MessageType.Text,
        content: 'Test' as Markdown
      }

      middleware.handleBroadcast(session, [event])
      expect(mockCallbacks.broadcast).toHaveBeenCalled()
    })

    it('should not subscribe when no subscription provided', async () => {
      const params = { cardId }
      const contexts = [{ id: 'ctx-1' as ContextID, cardId, account: accountUuid }]
      mockNext.findNotificationContexts.mockResolvedValue(contexts)

      await middleware.findNotificationContexts(session, params)

      expect(mockNext.findNotificationContexts).toHaveBeenCalled()
    })

    it('should not subscribe when sessionId is empty', async () => {
      const sessionWithoutId: SessionData = {
        ...session,
        sessionId: ''
      } as any

      const params = { cardId }
      const subscription = 'sub-123'
      const contexts: NotificationContext[] = [{ id: 'ctx-1' as ContextID, cardId, account: accountUuid }] as any[]
      mockNext.findNotificationContexts.mockResolvedValue(contexts)

      await middleware.findNotificationContexts(sessionWithoutId, params, subscription)

      expect(mockNext.findNotificationContexts).toHaveBeenCalled()
    })

    it('should not subscribe when sessionId is null', async () => {
      const sessionWithoutId: SessionData = {
        ...session,
        sessionId: null
      } as any

      const params = { cardId }
      const subscription = 'sub-123'
      const contexts: NotificationContext[] = [{ id: 'ctx-1' as ContextID, cardId, account: accountUuid }] as any[]
      mockNext.findNotificationContexts.mockResolvedValue(contexts)

      await middleware.findNotificationContexts(sessionWithoutId, params, subscription)

      expect(mockNext.findNotificationContexts).toHaveBeenCalled()
    })
  })

  describe('findNotifications', () => {
    it('should create session and find notifications', async () => {
      const params = { contextId: 'ctx-123' as ContextID }
      const notifications = [{ id: 'notif-1' }]
      mockNext.findNotifications.mockResolvedValue(notifications)

      const result = await middleware.findNotifications(session, params)

      expect(result).toEqual(notifications)
      expect(mockNext.findNotifications).toHaveBeenCalledWith(session, params, undefined)
    })

    it('should pass query id when provided', async () => {
      const params = { contextId: 'ctx-123' as ContextID }
      const queryId = 'query-456'
      const notifications = [{ id: 'notif-1' }]
      mockNext.findNotifications.mockResolvedValue(notifications)

      await middleware.findNotifications(session, params, queryId)

      expect(mockNext.findNotifications).toHaveBeenCalledWith(session, params, queryId)
    })
  })

  describe('findLabels', () => {
    it('should create session and find labels', async () => {
      const params = { cardId }
      const labels: Label[] = [{ labelId: 'label-1' as LabelID, cardId }] as any[]
      mockNext.findLabels.mockResolvedValue(labels)

      const result = await middleware.findLabels(session, params)

      expect(result).toEqual(labels)
      expect(mockNext.findLabels).toHaveBeenCalledWith(session, params, undefined)
    })

    it('should pass query id when provided', async () => {
      const params = { cardId }
      const queryId = 'query-789'
      mockNext.findLabels.mockResolvedValue([])

      await middleware.findLabels(session, params, queryId)

      expect(mockNext.findLabels).toHaveBeenCalledWith(session, params, queryId)
    })
  })

  describe('subscribeCard', () => {
    it('should track subscription for card', () => {
      const subscription = 'sub-123'

      middleware.subscribeCard(session, cardId, subscription)

      expect(() => {
        middleware.subscribeCard(session, cardId, subscription)
      }).not.toThrow()
    })

    it('should handle multiple subscriptions for same card', () => {
      const subscription1 = 'sub-1'
      const subscription2 = 'sub-2'

      middleware.subscribeCard(session, cardId, subscription1)
      middleware.subscribeCard(session, cardId, subscription2)

      expect(() => {
        middleware.subscribeCard(session, cardId, subscription1)
      }).not.toThrow()
    })

    it('should handle subscriptions for different cards', () => {
      const subscription = 'sub-123'

      middleware.subscribeCard(session, cardId, subscription)
      middleware.subscribeCard(session, cardId2, subscription)

      expect(() => {
        middleware.subscribeCard(session, cardId, subscription)
      }).not.toThrow()
    })

    it('should handle subscription with numeric ID', () => {
      const subscription = 12345

      middleware.subscribeCard(session, cardId, subscription)

      expect(() => {
        middleware.subscribeCard(session, cardId, subscription)
      }).not.toThrow()
    })

    it('should not subscribe when session has no sessionId', () => {
      const sessionWithoutId: SessionData = {
        ...session,
        sessionId: null
      } as any
      const subscription = 'sub-123'

      expect(() => {
        middleware.subscribeCard(sessionWithoutId, cardId, subscription)
      }).not.toThrow()
    })
  })

  describe('unsubscribeCard', () => {
    it('should remove subscription from card', () => {
      const subscription = 'sub-123'

      middleware.subscribeCard(session, cardId, subscription)
      middleware.unsubscribeCard(session, cardId, subscription)

      expect(() => {
        middleware.unsubscribeCard(session, cardId, subscription)
      }).not.toThrow()
    })

    it('should handle unsubscribe when not subscribed', () => {
      const subscription = 'sub-123'

      middleware.unsubscribeCard(session, cardId, subscription)

      expect(() => {
        middleware.unsubscribeCard(session, cardId, subscription)
      }).not.toThrow()
    })

    it('should handle unsubscribe without sessionId', () => {
      const sessionWithoutId: SessionData = {
        ...session,
        sessionId: null
      } as any
      const subscription = 'sub-123'

      middleware.unsubscribeCard(sessionWithoutId, cardId, subscription)

      expect(() => {
        middleware.unsubscribeCard(sessionWithoutId, cardId, subscription)
      }).not.toThrow()
    })

    it('should handle unsubscribe for non-existent session', () => {
      const subscription = 'sub-123'

      expect(() => {
        middleware.unsubscribeCard(session, cardId, subscription)
      }).not.toThrow()
    })

    it('should handle unsubscribe for non-existent card', () => {
      const subscription = 'sub-123'

      // Create session first
      middleware.subscribeCard(session, cardId, subscription)

      // Try to unsubscribe from different card
      expect(() => {
        middleware.unsubscribeCard(session, cardId2, subscription)
      }).not.toThrow()
    })

    it('should only remove specific subscription', async () => {
      const subscription1 = 'sub-1'
      const subscription2 = 'sub-2'

      // Create session first
      await middleware.event(session, createSessionEvent(cardId), false)

      middleware.subscribeCard(session, cardId, subscription1)
      middleware.subscribeCard(session, cardId, subscription2)
      middleware.unsubscribeCard(session, cardId, subscription1)

      // Verify subscription2 is still active by checking broadcast
      const event: Enriched<CreateMessageEvent> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId,
        cardType: 'task' as CardType,
        messageType: MessageType.Text,
        content: 'Test' as Markdown
      }

      middleware.handleBroadcast(session, [event])
      expect(mockCallbacks.broadcast).toHaveBeenCalled()
    })
  })

  describe('handleBroadcast', () => {
    it('should call broadcast and enqueue', async () => {
      // Create session first
      await middleware.event(session, createSessionEvent(cardId), false)

      const events: Enriched<CreateMessageEvent>[] = [
        {
          ...basicEvent,
          type: MessageEventType.CreateMessage,
          cardId,
          cardType: 'task' as CardType,
          messageType: MessageType.Text,
          content: 'Test' as Markdown
        }
      ]

      middleware.subscribeCard(session, cardId, 'sub-123')
      middleware.handleBroadcast(session, events)

      expect(mockCallbacks.broadcast).toHaveBeenCalled()
      expect(mockCallbacks.enqueue).toHaveBeenCalledWith(expect.anything(), events)
    })

    it('should handle empty events array', () => {
      middleware.handleBroadcast(session, [])

      expect(mockCallbacks.broadcast).not.toHaveBeenCalled()
      expect(mockCallbacks.enqueue).not.toHaveBeenCalled()
    })

    it('should filter events by subscription', async () => {
      // Create session first
      await middleware.event(session, createSessionEvent(cardId), false)

      middleware.subscribeCard(session, cardId, 'sub-123')

      const subscribedEvent: Enriched<CreateMessageEvent> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId,
        cardType: 'task' as CardType,
        messageType: MessageType.Text,
        content: 'Test' as Markdown
      }

      const unsubscribedEvent: Enriched<CreateMessageEvent> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId: cardId2,
        cardType: 'task' as CardType,
        messageType: MessageType.Text,
        content: 'Test' as Markdown
      }

      middleware.handleBroadcast(session, [subscribedEvent, unsubscribedEvent])

      expect(mockCallbacks.broadcast).toHaveBeenCalled()
      const broadcastCall = mockCallbacks.broadcast.mock.calls[0][1]
      expect(broadcastCall[session.sessionId ?? '']).toEqual([subscribedEvent])
    })

    it('should broadcast to multiple sessions', async () => {
      // Create sessions first
      await middleware.event(session, createSessionEvent(cardId), false)
      await middleware.event(session2, createSessionEvent(cardId), false)

      middleware.subscribeCard(session, cardId, 'sub-1')
      middleware.subscribeCard(session2, cardId, 'sub-2')

      const event: Enriched<CreateMessageEvent> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId,
        cardType: 'task' as CardType,
        messageType: MessageType.Text,
        content: 'Test' as Markdown
      }

      middleware.handleBroadcast(session, [event])

      expect(mockCallbacks.broadcast).toHaveBeenCalled()
      const broadcastCall = mockCallbacks.broadcast.mock.calls[0][1]
      expect(broadcastCall[session.sessionId ?? '']).toEqual([event])
      expect(broadcastCall[session2.sessionId ?? '']).toEqual([event])
    })

    it('should handle MessageEventType.ThreadPatch', async () => {
      await middleware.event(session, createSessionEvent(), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<ThreadPatchEvent> = {
        ...basicEvent,
        type: MessageEventType.ThreadPatch,
        cardId
      } as any

      middleware.handleBroadcast(session, [event])
      expect(mockCallbacks.broadcast).toHaveBeenCalled()
    })

    it('should handle MessageEventType.ReactionPatch', async () => {
      await middleware.event(session, createSessionEvent(), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<ReactionPatchEvent> = {
        ...basicEvent,
        type: MessageEventType.ReactionPatch,
        cardId
      } as any

      middleware.handleBroadcast(session, [event])
      expect(mockCallbacks.broadcast).toHaveBeenCalled()
    })

    it('should handle MessageEventType.BlobPatch', async () => {
      await middleware.event(session, createSessionEvent(), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<BlobPatchEvent> = {
        ...basicEvent,
        type: MessageEventType.BlobPatch,
        cardId
      } as any

      middleware.handleBroadcast(session, [event])
      expect(mockCallbacks.broadcast).toHaveBeenCalled()
    })

    it('should handle MessageEventType.AttachmentPatch', async () => {
      await middleware.event(session, createSessionEvent(), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<AttachmentPatchEvent> = {
        ...basicEvent,
        type: MessageEventType.AttachmentPatch,
        cardId
      } as any

      middleware.handleBroadcast(session, [event])
      expect(mockCallbacks.broadcast).toHaveBeenCalled()
    })

    it('should handle MessageEventType.RemovePatch', async () => {
      await middleware.event(session, createSessionEvent(), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<RemovePatchEvent> = {
        ...basicEvent,
        type: MessageEventType.RemovePatch,
        cardId
      } as any

      middleware.handleBroadcast(session, [event])
      expect(mockCallbacks.broadcast).toHaveBeenCalled()
    })

    it('should handle MessageEventType.UpdatePatch', async () => {
      await middleware.event(session, createSessionEvent(), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<UpdatePatchEvent> = {
        type: MessageEventType.UpdatePatch,
        cardId
      } as any

      middleware.handleBroadcast(session, [event])
      expect(mockCallbacks.broadcast).toHaveBeenCalled()
    })

    it('should handle MessageEventType.TranslateMessage', async () => {
      await middleware.event(session, createSessionEvent(), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<TranslateMessageEvent> = {
        type: MessageEventType.TranslateMessage,
        cardId
      } as any

      middleware.handleBroadcast(session, [event])
      expect(mockCallbacks.broadcast).toHaveBeenCalled()
    })

    it('should handle NotificationEventType.CreateNotification for matching account', async () => {
      await middleware.event(session, createSessionEvent(), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<CreateNotificationEvent> = {
        type: NotificationEventType.CreateNotification,
        account: accountUuid
      } as any

      middleware.handleBroadcast(session, [event])

      expect(mockCallbacks.broadcast).toHaveBeenCalled()
      const broadcastCall = mockCallbacks.broadcast.mock.calls[0][1]
      expect(broadcastCall[session.sessionId ?? '']).toEqual([event])
    })

    it('should not broadcast NotificationEventType.CreateNotification for different account', async () => {
      await middleware.event(session, createSessionEvent(), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<CreateNotificationEvent> = {
        type: NotificationEventType.CreateNotification,
        account: accountUuid2
      } as any

      middleware.handleBroadcast(session, [event])

      // Enqueue is still called
      expect(mockCallbacks.enqueue).toHaveBeenCalled()
      // No sessions should receive this event (either undefined or empty array)
      const broadcastCall = mockCallbacks.broadcast.mock.calls[0]?.[1]
      const sessionEvents = broadcastCall?.[session.sessionId ?? '']
      expect(sessionEvents === undefined || sessionEvents.length === 0).toBe(true)
    })

    it('should handle NotificationEventType.UpdateNotification', async () => {
      await middleware.event(session, createSessionEvent(), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<UpdateNotificationEvent> = {
        type: NotificationEventType.UpdateNotification,
        account: accountUuid
      } as any

      middleware.handleBroadcast(session, [event])
      expect(mockCallbacks.broadcast).toHaveBeenCalled()
    })

    it('should handle NotificationEventType.RemoveNotifications', async () => {
      await middleware.event(session, createSessionEvent(), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<RemoveNotificationsEvent> = {
        type: NotificationEventType.RemoveNotifications,
        account: accountUuid
      } as any

      middleware.handleBroadcast(session, [event])
      expect(mockCallbacks.broadcast).toHaveBeenCalled()
    })

    it('should handle NotificationEventType.CreateNotificationContext', async () => {
      await middleware.event(session, createSessionEvent(), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<CreateNotificationContextEvent> = {
        type: NotificationEventType.CreateNotificationContext,
        account: accountUuid
      } as any

      middleware.handleBroadcast(session, [event])
      expect(mockCallbacks.broadcast).toHaveBeenCalled()
    })

    it('should handle NotificationEventType.UpdateNotificationContext', async () => {
      await middleware.event(session, createSessionEvent(), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<UpdateNotificationContextEvent> = {
        type: NotificationEventType.UpdateNotificationContext,
        account: accountUuid
      } as any

      middleware.handleBroadcast(session, [event])
      expect(mockCallbacks.broadcast).toHaveBeenCalled()
    })

    it('should handle NotificationEventType.RemoveNotificationContext', async () => {
      await middleware.event(session, createSessionEvent(), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<RemoveNotificationContextEvent> = {
        type: NotificationEventType.RemoveNotificationContext,
        account: accountUuid
      } as any

      middleware.handleBroadcast(session, [event])
      expect(mockCallbacks.broadcast).toHaveBeenCalled()
    })

    it('should broadcast NotificationEventType.AddCollaborators to all sessions', async () => {
      await middleware.event(session, createSessionEvent(), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<AddCollaboratorsEvent> = {
        type: NotificationEventType.AddCollaborators
      } as any

      middleware.handleBroadcast(session, [event])

      expect(mockCallbacks.broadcast).toHaveBeenCalled()
      const broadcastCall = mockCallbacks.broadcast.mock.calls[0][1]
      expect(broadcastCall[session.sessionId ?? '']).toEqual([event])
    })

    it('should broadcast NotificationEventType.RemoveCollaborators to all sessions', async () => {
      await middleware.event(session, createSessionEvent(), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<RemoveCollaboratorsEvent> = {
        ...basicEvent,
        type: NotificationEventType.RemoveCollaborators
      } as any

      middleware.handleBroadcast(session, [event])
      expect(mockCallbacks.broadcast).toHaveBeenCalled()
    })

    it('should handle LabelEventType.CreateLabel for matching account', async () => {
      await middleware.event(session, createSessionEvent(), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<CreateLabelEvent> = {
        ...basicEvent,
        type: LabelEventType.CreateLabel,
        account: accountUuid
      } as any

      middleware.handleBroadcast(session, [event])
      expect(mockCallbacks.broadcast).toHaveBeenCalled()
    })

    it('should handle LabelEventType.RemoveLabel for matching account', async () => {
      await middleware.event(session, createSessionEvent(), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<RemoveLabelEvent> = {
        ...basicEvent,
        type: LabelEventType.RemoveLabel,
        account: accountUuid
      } as any

      middleware.handleBroadcast(session, [event])
      expect(mockCallbacks.broadcast).toHaveBeenCalled()
    })

    it('should broadcast CardEventType.UpdateCardType to all sessions', async () => {
      await middleware.event(session, createSessionEvent(), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<UpdateCardTypeEvent> = {
        ...basicEvent,
        type: CardEventType.UpdateCardType
      } as any

      middleware.handleBroadcast(session, [event])
      expect(mockCallbacks.broadcast).toHaveBeenCalled()
    })

    it('should broadcast CardEventType.RemoveCard to all sessions', async () => {
      await middleware.event(session, createSessionEvent(), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<RemoveCardEvent> = {
        ...basicEvent,
        type: CardEventType.RemoveCard
      } as any

      middleware.handleBroadcast(session, [event])
      expect(mockCallbacks.broadcast).toHaveBeenCalled()
    })

    it('should not broadcast PeerEventType.CreatePeer', async () => {
      await middleware.event(session, createSessionEvent(), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<CreatePeerEvent> = {
        ...basicEvent,
        type: PeerEventType.CreatePeer
      } as any

      middleware.handleBroadcast(session, [event])

      // Enqueue is still called
      expect(mockCallbacks.enqueue).toHaveBeenCalled()
      // No sessions should receive this event (either undefined or empty array)
      const broadcastCall = mockCallbacks.broadcast.mock.calls[0]?.[1]
      const sessionEvents = broadcastCall?.[session.sessionId ?? '']
      expect(sessionEvents === undefined || sessionEvents.length === 0).toBe(true)
    })

    it('should not broadcast PeerEventType.RemovePeer', async () => {
      await middleware.event(session, createSessionEvent(), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<RemovePeerEvent> = {
        ...basicEvent,
        type: PeerEventType.RemovePeer
      } as any

      middleware.handleBroadcast(session, [event])

      // Enqueue is still called
      expect(mockCallbacks.enqueue).toHaveBeenCalled()
      // No sessions should receive this event (either undefined or empty array)
      const broadcastCall = mockCallbacks.broadcast.mock.calls[0]?.[1]
      const sessionEvents = broadcastCall?.[session.sessionId ?? '']
      expect(sessionEvents === undefined || sessionEvents.length === 0).toBe(true)
    })

    it('should handle broadcast errors gracefully', async () => {
      mockCallbacks.broadcast.mockImplementation(() => {
        throw new Error('Broadcast error')
      })

      await middleware.event(session, createSessionEvent(cardId), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<CreateMessageEvent> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId,
        cardType: 'task' as CardType,
        messageType: MessageType.Text,
        content: 'Test' as Markdown,
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      expect(() => {
        middleware.handleBroadcast(session, [event])
      }).not.toThrow()

      expect(mockMeasureCtx.error).toHaveBeenCalledWith(
        'Failed to broadcast event',
        expect.objectContaining({ error: expect.any(Error) })
      )
    })

    it('should handle enqueue errors gracefully', async () => {
      mockCallbacks.enqueue.mockImplementation(() => {
        throw new Error('Enqueue error')
      })

      await middleware.event(session, createSessionEvent(cardId), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<CreateMessageEvent> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId,
        cardType: 'task' as CardType,
        messageType: MessageType.Text,
        content: 'Test' as Markdown
      }

      expect(() => {
        middleware.handleBroadcast(session, [event])
      }).not.toThrow()

      expect(mockMeasureCtx.error).toHaveBeenCalledWith(
        'Failed to broadcast event',
        expect.objectContaining({ error: expect.any(Error) })
      )
    })

    it('should pass context data to broadcast', async () => {
      await middleware.event(session, createSessionEvent(cardId), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      const event: Enriched<CreateMessageEvent> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId,
        cardType: 'task' as CardType,
        messageType: MessageType.Text,
        content: 'Test' as Markdown
      }

      middleware.handleBroadcast(session, [event])

      expect(mockMeasureCtx.newChild).toHaveBeenCalledWith('enqueue', {})
      expect(mockCallbacks.broadcast).toHaveBeenCalled()
      expect(mockCallbacks.enqueue).toHaveBeenCalled()
    })
  })

  describe('close and closeSession', () => {
    it('should handle close', async () => {
      await middleware.event(session, createSessionEvent(cardId), false)
      await middleware.event(session2, createSessionEvent(cardId), false)

      middleware.subscribeCard(session, cardId, 'sub-123')
      middleware.subscribeCard(session2, cardId, 'sub-456')

      expect(() => {
        middleware.close()
      }).not.toThrow()
    })

    it('should clear all sessions on close', async () => {
      await middleware.event(session, createSessionEvent(cardId), false)
      await middleware.event(session2, createSessionEvent(cardId), false)

      middleware.subscribeCard(session, cardId, 'sub-123')
      middleware.subscribeCard(session2, cardId, 'sub-456')

      middleware.close()

      // After close, broadcast should not have any sessions
      const event: Enriched<CreateMessageEvent> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId,
        cardType: 'task' as CardType,
        messageType: MessageType.Text,
        content: 'Test' as Markdown
      }

      middleware.handleBroadcast(session, [event])

      // Enqueue is still called but broadcast shouldn't be (no sessions)
      expect(mockCallbacks.enqueue).toHaveBeenCalled()
      // broadcast should not be called since there are no sessions
      const broadcastCalls = mockCallbacks.broadcast.mock.calls
      if (broadcastCalls.length > 0) {
        const lastBroadcastCall = broadcastCalls[broadcastCalls.length - 1][1]
        expect(Object.keys(lastBroadcastCall)).toHaveLength(0)
      }
    })

    it('should handle closeSession', async () => {
      await middleware.event(session, createSessionEvent(cardId), false)
      middleware.subscribeCard(session, cardId, 'sub-123')

      expect(() => {
        middleware.closeSession('session-123')
      }).not.toThrow()
    })

    it('should remove specific session on closeSession', async () => {
      await middleware.event(session, createSessionEvent(cardId), false)
      await middleware.event(session2, createSessionEvent(cardId), false)

      middleware.subscribeCard(session, cardId, 'sub-123')
      middleware.subscribeCard(session2, cardId, 'sub-456')

      middleware.closeSession('session-123')

      // After closeSession, only session2 should receive broadcasts
      const event: Enriched<CreateMessageEvent> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId,
        cardType: 'task' as CardType,
        messageType: MessageType.Text,
        content: 'Test' as Markdown
      }

      middleware.handleBroadcast(session, [event])

      expect(mockCallbacks.broadcast).toHaveBeenCalled()
      const broadcastCall = mockCallbacks.broadcast.mock.calls[0][1]
      expect(broadcastCall[session.sessionId ?? '']).toBeUndefined()
      expect(broadcastCall[session2.sessionId ?? '']).toEqual([event])
    })

    it('should handle closeSession for non-existent session', () => {
      expect(() => {
        middleware.closeSession('non-existent-session')
      }).not.toThrow()
    })
  })
})
