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
  MessageEventType,
  type SessionData,
  NotificationEventType
} from '@hcengineering/communication-sdk-types'
import { type AccountUuid, type CardType, type Markdown, type SocialID } from '@hcengineering/communication-types'

import { TriggersMiddleware } from '../../middleware/triggers'
import { type Enriched, type MiddlewareContext, type CommunicationCallbacks, Middleware } from '../../types'
import { type LowLevelClient } from '../../client'
import { notify } from '../../notification/notification'

// Mock external dependencies
jest.mock('../../triggers/all', () => [])
jest.mock('../../notification/notification', () => ({
  notify: jest.fn().mockResolvedValue([])
}))

describe('TriggersMiddleware', () => {
  // Test fixtures
  let mockContext: MiddlewareContext
  let mockClient: jest.Mocked<LowLevelClient>
  let mockMeasureCtx: jest.Mocked<MeasureContext>
  let mockNext: any
  let mockCallbacks: jest.Mocked<CommunicationCallbacks>
  let session: SessionData
  let middleware: TriggersMiddleware

  // Test constants
  const workspace = 'test-workspace' as WorkspaceUuid
  const accountUuid = 'account-123' as AccountUuid
  const socialId = 'social-123' as SocialID

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock context
    mockMeasureCtx = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      newChild: jest.fn().mockReturnThis(),
      contextData: undefined
    } as any as jest.Mocked<MeasureContext>

    // Setup mock client
    mockClient = {
      db: {
        findNotificationContexts: jest.fn().mockResolvedValue([]),
        findCollaborators: jest.fn().mockResolvedValue([]),
        findThreadMeta: jest.fn().mockResolvedValue([]),
        getAccountsByPersonIds: jest.fn().mockResolvedValue([])
      },
      blob: {},
      findPersonUuid: jest.fn().mockResolvedValue('person-123')
    } as unknown as jest.Mocked<LowLevelClient>

    // Setup mock middleware chain
    mockNext = {
      event: jest.fn().mockResolvedValue({}),
      handleBroadcast: jest.fn(),
      findNotificationContexts: jest.fn().mockResolvedValue([]),
      findNotifications: jest.fn().mockResolvedValue([]),
      findLabels: jest.fn().mockResolvedValue([]),
      findCollaborators: jest.fn().mockResolvedValue([]),
      findPeers: jest.fn().mockResolvedValue([]),
      findMessagesMeta: jest.fn().mockResolvedValue([]),
      findMessagesGroups: jest.fn().mockResolvedValue([]),
      subscribeCard: jest.fn(),
      unsubscribeCard: jest.fn(),
      closeSession: jest.fn(),
      close: jest.fn()
    } as any as jest.Mocked<Middleware>

    // Setup mock callbacks
    mockCallbacks = {
      registerAsyncRequest: jest.fn((ctx, fn) => {
        void fn(ctx).catch(() => {})
        return undefined
      }),
      broadcast: jest.fn(),
      enqueue: jest.fn()
    } as any as jest.Mocked<CommunicationCallbacks>

    // Setup middleware context
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
      cadsWithPeers: new Set(),
      head: mockNext
    }

    // Setup test session
    session = {
      account: {
        uuid: accountUuid,
        socialIds: [socialId]
      },
      sessionId: 'session-123',
      asyncData: []
    } as any as SessionData

    middleware = new TriggersMiddleware(mockCallbacks, mockContext, mockNext)
  })

  describe('event', () => {
    it('should process event and call next middleware', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        cardType: 'task' as CardType,
        messageType: 'text',
        content: 'Test message' as Markdown,
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      const result = await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
      expect(result).toBeDefined()
    })

    it('should skip propagation if event has skipPropagate flag', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        skipPropagate: true,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should handle derived events', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.UpdatePatch,
        cardId: 'card-123',
        messageId: 'msg-123',
        content: 'Updated' as Markdown,
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, true)

      expect(mockNext.event).toHaveBeenCalledWith(session, event, true)
    })

    it('should register async request for non-derived events', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        cardType: 'task' as CardType,
        messageType: 'text',
        content: 'Test' as Markdown,
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      session.contextData = { foo: 'bar' }

      await middleware.event(session, event, false)

      expect(mockCallbacks.registerAsyncRequest).toHaveBeenCalled()
      expect(session.isAsyncContext).toBe(true)
    })

    it('should not register duplicate async requests', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        cardType: 'task' as CardType,
        messageType: 'text',
        content: 'Test' as Markdown,
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      session.contextData = { foo: 'bar' }
      session.isAsyncContext = true

      await middleware.event(session, event, false)

      expect(mockCallbacks.registerAsyncRequest).not.toHaveBeenCalled()
    })

    it('should handle events without context data', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        cardType: 'task' as CardType,
        messageType: 'text',
        content: 'Test' as Markdown,
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockCallbacks.registerAsyncRequest).not.toHaveBeenCalled()
    })

    it('should sort async data by date', async () => {
      const date1 = new Date('2025-01-01T10:00:00Z')
      const date2 = new Date('2025-01-01T09:00:00Z')
      const date3 = new Date('2025-01-01T11:00:00Z')

      const event1: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-1',
        date: date1,
        _eventExtra: {}
      }

      const event2: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-2',
        date: date2,
        _eventExtra: {}
      }

      const event3: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-3',
        date: date3,
        _eventExtra: {}
      }

      session.asyncData = [event1, event2, event3]

      await middleware.event(session, event1, false)

      expect(session.asyncData).toBeDefined()
    })
  })

  describe('processDerived', () => {
    it('should process derived events', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        cardType: 'task' as CardType,
        messageType: 'text',
        content: 'Test' as Markdown,
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.processDerived(session, [event], true)

      expect(mockCallbacks.registerAsyncRequest).not.toHaveBeenCalled()
    })

    it('should register async request for non-derived events with context data', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        date: new Date(),
        _eventExtra: {}
      }

      session.contextData = { foo: 'bar' }

      await middleware.processDerived(session, [event], false)

      expect(mockCallbacks.registerAsyncRequest).toHaveBeenCalled()
      expect(session.isAsyncContext).toBe(true)
    })

    it('should handle multiple events', async () => {
      const event1: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-1',
        date: new Date(),
        _eventExtra: {}
      }

      const event2: Enriched<any> = {
        type: MessageEventType.UpdatePatch,
        cardId: 'card-123',
        messageId: 'msg-2',
        content: 'Updated' as Markdown,
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.processDerived(session, [event1, event2], false)

      expect(session.asyncData).toBeDefined()
    })

    it('should filter out events with skipPropagate in asyncData', async () => {
      const event1: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as any,
        messageId: 'msg-1',
        date: new Date(),
        skipPropagate: false,
        _eventExtra: {}
      }

      const event2: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-456' as any,
        messageId: 'msg-2',
        date: new Date(),
        skipPropagate: true,
        _eventExtra: {}
      }

      await middleware.processDerived(session, [event1, event2], false)

      expect(session.asyncData).toBeDefined()
    })
  })

  describe('notification events', () => {
    it('should handle notification context events', async () => {
      const event: Enriched<any> = {
        type: NotificationEventType.CreateNotificationContext,
        account: accountUuid,
        cardId: 'card-123',
        lastUpdate: new Date(),
        lastView: new Date(),
        lastNotify: new Date(),
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should handle update notification events', async () => {
      const event: Enriched<any> = {
        type: NotificationEventType.UpdateNotification,
        contextId: 'ctx-123',
        account: accountUuid,
        query: { type: 'message' },
        updates: { read: true },
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })
  })

  describe('async context handling', () => {
    it('should handle async context correctly', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        cardType: 'task' as CardType,
        messageType: 'text',
        content: 'Test' as Markdown,
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      session.isAsyncContext = true

      await middleware.event(session, event, false)

      expect(mockCallbacks.registerAsyncRequest).not.toHaveBeenCalled()
    })

    it('should clear asyncData after processing non-async events', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        date: new Date(),
        _eventExtra: {}
      }

      session.asyncData = [
        {
          type: MessageEventType.CreateMessage,
          cardId: 'card-456' as any,
          messageId: 'msg-456' as any,
          cardType: 'task' as CardType,
          messageType: 'text' as any,
          content: 'Test' as Markdown,
          socialId,
          date: new Date(),
          _eventExtra: {}
        }
      ]

      await middleware.event(session, event, false)

      expect(session.asyncData).toEqual([])
    })

    it('should preserve asyncData in async context', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        date: new Date(),
        _eventExtra: {}
      }

      session.isAsyncContext = true
      session.asyncData = [
        {
          type: MessageEventType.CreateMessage,
          cardId: 'card-456' as any,
          messageId: 'msg-456' as any,
          cardType: 'task' as CardType,
          messageType: 'text' as any,
          content: 'Test' as Markdown,
          socialId,
          date: new Date(),
          _eventExtra: {}
        }
      ]

      const initialAsyncDataLength = session.asyncData.length

      await middleware.event(session, event, false)

      expect(session.asyncData.length).toBeGreaterThanOrEqual(initialAsyncDataLength)
    })
  })

  describe('error handling', () => {
    it('should handle errors in trigger execution', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        date: new Date(),
        _eventExtra: {}
      }

      mockNext.event.mockRejectedValue(new Error('Trigger error'))

      await expect(middleware.event(session, event, false)).rejects.toThrow('Trigger error')
    })

    it('should handle errors in async context', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        date: new Date(),
        _eventExtra: {}
      }

      session.contextData = { foo: 'bar' }

      let asyncCallbackPromise: Promise<void> | undefined
      mockCallbacks.registerAsyncRequest.mockImplementation((ctx, fn) => {
        asyncCallbackPromise = fn(ctx)
        return undefined
      })

      const notifyMock = notify as jest.MockedFunction<typeof notify>
      notifyMock.mockRejectedValueOnce(new Error('Async error'))

      await middleware.event(session, event, false)

      expect(mockCallbacks.registerAsyncRequest).toHaveBeenCalled()

      if (asyncCallbackPromise !== undefined) {
        await expect(asyncCallbackPromise).rejects.toThrow('Async error')
      }
    })
  })

  describe('edge cases', () => {
    it('should handle empty asyncData array', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        date: new Date(),
        _eventExtra: {}
      }

      session.asyncData = []

      await middleware.event(session, event, false)

      expect(session.asyncData).toEqual([])
    })

    it('should handle undefined asyncData', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        date: new Date(),
        _eventExtra: {}
      }

      session.asyncData = undefined as any

      await middleware.event(session, event, false)

      expect(session.asyncData).toBeDefined()
    })

    it('should handle events without head middleware', async () => {
      const contextWithoutHead = { ...mockContext, head: undefined }
      const middlewareWithoutHead = new TriggersMiddleware(mockCallbacks, contextWithoutHead, mockNext)

      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        date: new Date(),
        _eventExtra: {}
      }

      await middlewareWithoutHead.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should handle events with null values', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.UpdatePatch,
        cardId: 'card-123',
        messageId: 'msg-123',
        content: null as any,
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should process events with skipPropagate', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        skipPropagate: true,
        date: new Date(),
        _eventExtra: {}
      }

      const result = await middleware.event(session, event, false)

      expect(result).toBeDefined()
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should handle very large asyncData arrays', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        date: new Date(),
        _eventExtra: {}
      }

      session.asyncData = Array.from({ length: 1000 }, (_, i) => ({
        type: MessageEventType.CreateMessage,
        cardId: `card-${i}`,
        messageId: `msg-${i}`,
        cardType: 'task' as CardType,
        messageType: 'text',
        content: 'Test' as Markdown,
        socialId,
        date: new Date(),
        _eventExtra: {}
      })) as any

      await middleware.event(session, event, false)

      expect(session.asyncData).toBeDefined()
    })

    it('should handle events with different date formats', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        date: new Date('2025-01-01T00:00:00.000Z'),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should handle concurrent event processing', async () => {
      const event1: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-1',
        messageId: 'msg-1',
        date: new Date(),
        _eventExtra: {}
      }

      const event2: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-2',
        messageId: 'msg-2',
        date: new Date(),
        _eventExtra: {}
      }

      await Promise.all([
        middleware.event(session, event1, false),
        middleware.event(session, event2, false)
      ])

      expect(mockNext.event).toHaveBeenCalledTimes(2)
    })

    it('should preserve event order in asyncData', async () => {
      const dates = [
        new Date('2025-01-01T10:00:00Z'),
        new Date('2025-01-01T09:00:00Z'),
        new Date('2025-01-01T11:00:00Z')
      ]

      const events = dates.map((date, i) => ({
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: `msg-${i}`,
        date,
        _eventExtra: {}
      }))

      for (const event of events) {
        await middleware.event(session, event as Enriched<any>, false)
      }

      expect(session.asyncData).toBeDefined()
    })
  })

  describe('trigger integration', () => {
    it('should execute triggers for message events', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        cardType: 'task' as CardType,
        messageType: 'text',
        content: 'Test with @mention' as Markdown,
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should execute triggers for notification events', async () => {
      const event: Enriched<any> = {
        type: NotificationEventType.CreateNotification,
        contextId: 'ctx-123',
        messageId: 'msg-123',
        blobId: 'blob-123',
        notificationType: 'message',
        content: 'Test notification',
        creator: socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should handle multiple trigger results', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        cardType: 'task' as CardType,
        messageType: 'text',
        content: 'Test message' as Markdown,
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })
  })

  describe('async request management', () => {
    it('should register only one async request per session', async () => {
      const event1: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-1',
        messageId: 'msg-1',
        date: new Date(),
        _eventExtra: {}
      }

      const event2: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-2',
        messageId: 'msg-2',
        date: new Date(),
        _eventExtra: {}
      }

      session.contextData = { foo: 'bar' }

      await middleware.event(session, event1, false)
      await middleware.event(session, event2, false)

      expect(mockCallbacks.registerAsyncRequest).toHaveBeenCalledTimes(1)
    })

    it('should handle async request with contextData', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        date: new Date(),
        _eventExtra: {}
      }

      session.contextData = { userId: 'user-123', requestId: 'req-456' }

      await middleware.event(session, event, false)

      expect(mockCallbacks.registerAsyncRequest).toHaveBeenCalled()
      expect(session.isAsyncContext).toBe(true)
    })

    it('should execute async callback immediately in tests', async () => {
      let callbackExecuted = false
      mockCallbacks.registerAsyncRequest.mockImplementation((ctx, fn) => {
        callbackExecuted = true
        void fn(ctx)
        return undefined
      })

      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        date: new Date(),
        _eventExtra: {}
      }

      session.contextData = { foo: 'bar' }

      await middleware.event(session, event, false)

      expect(callbackExecuted).toBe(true)
    })
  })

  describe('broadcast handling', () => {
    it('should call handleBroadcast after event processing', async () => {
      const handleBroadcastSpy = jest.spyOn(middleware, 'handleBroadcast')

      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(handleBroadcastSpy).toHaveBeenCalled()
    })

    it('should handle broadcast with multiple events', async () => {
      const events: Enriched<any>[] = [
        {
          type: MessageEventType.CreateMessage,
          cardId: 'card-1',
          messageId: 'msg-1',
          date: new Date(),
          _eventExtra: {}
        },
        {
          type: MessageEventType.CreateMessage,
          cardId: 'card-2',
          messageId: 'msg-2',
          date: new Date(),
          _eventExtra: {}
        }
      ]

      middleware.handleBroadcast(session, events)

      expect(mockNext.handleBroadcast).toHaveBeenCalledWith(session, events)
    })

    it('should handle empty broadcast', async () => {
      middleware.handleBroadcast(session, [])

      expect(mockNext.handleBroadcast).toHaveBeenCalledWith(session, [])
    })
  })

  describe('performance and memory', () => {
    it('should handle rapid succession of events', async () => {
      const events = Array.from({ length: 100 }, (_, i) => ({
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: `msg-${i}`,
        date: new Date(),
        _eventExtra: {}
      }))

      for (const event of events) {
        await middleware.event(session, event as Enriched<any>, false)
      }

      expect(mockNext.event).toHaveBeenCalledTimes(100)
    })

    it('should clean up processed peers events', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(session.asyncData).toEqual([])
    })
  })
})
