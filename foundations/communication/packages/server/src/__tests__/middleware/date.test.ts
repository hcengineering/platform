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

import { MeasureContext, systemAccountUuid, WorkspaceUuid } from '@hcengineering/core'
import { Event, MessageEventType, SessionData } from '@hcengineering/communication-sdk-types'
import {
  AccountUuid,
  CardID,
  CardType,
  Markdown,
  MessageID,
  MessageType,
  SocialID
} from '@hcengineering/communication-types'

import { DateMiddleware } from '../../middleware/date'
import { Enriched, Middleware, MiddlewareContext } from '../../types'
import { LowLevelClient } from '../../client'

describe('DateMiddleware', () => {
  let mockContext: MiddlewareContext
  let mockClient: jest.Mocked<LowLevelClient>
  let mockMeasureCtx: jest.Mocked<MeasureContext>
  let mockNext: jest.Mocked<Middleware>
  let session: SessionData
  let middleware: DateMiddleware

  const workspace = 'test-workspace' as WorkspaceUuid
  const accountUuid = 'account-123' as AccountUuid
  const socialId = 'social-123' as SocialID

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

    mockClient = {
      db: {},
      blob: {},
      findPersonUuid: jest.fn()
    } as any as jest.Mocked<LowLevelClient>

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
        socialIds: [socialId]
      },
      sessionId: 'session-123',
      asyncData: []
    } as any as SessionData

    middleware = new DateMiddleware(mockContext, mockNext)
  })

  describe('event', () => {
    it('should set date when not provided and not derived', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as CardID,
        cardType: 'task' as CardType,
        content: 'Test' as Markdown,
        messageType: MessageType.Text
      }

      const beforeTime = new Date().getTime()
      await middleware.event(session, event, false)
      const afterTime = new Date().getTime()

      expect(event.date).toBeDefined()
      expect(event.date).toBeInstanceOf(Date)
      expect(event.date.getTime()).toBeGreaterThanOrEqual(beforeTime)
      expect(event.date.getTime()).toBeLessThanOrEqual(afterTime)
      expect(event._eventExtra).toBeDefined()
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should preserve date when derived is true and date is provided', async () => {
      const customDate = new Date('2025-01-01T00:00:00Z')
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as CardID,
        cardType: 'task' as CardType,
        content: 'Test' as Markdown,
        messageType: MessageType.Text,
        socialId,
        date: customDate
      }

      await middleware.event(session, event, true)

      expect(event.date).toEqual(customDate)
      expect(mockNext.event).toHaveBeenCalledWith(session, event, true)
    })

    it('should preserve date when user is system account', async () => {
      const customDate = new Date('2025-01-01T00:00:00Z')
      const systemSession: SessionData = {
        ...session,
        account: {
          uuid: systemAccountUuid,
          socialIds: [socialId]
        }
      } as any as SessionData

      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as CardID,
        cardType: 'task' as CardType,
        content: 'Test' as Markdown,
        messageType: MessageType.Text,
        socialId,
        date: customDate
      }

      await middleware.event(systemSession, event, false)

      expect(event.date).toEqual(customDate)
      expect(mockNext.event).toHaveBeenCalledWith(systemSession, event, false)
    })

    it('should set date even when null is provided for non-system account', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as CardID,
        cardType: 'task' as CardType,
        content: 'Test' as Markdown,
        messageType: MessageType.Text,
        socialId,
        date: null as any
      }

      await middleware.event(session, event, false)

      expect(event.date).toBeDefined()
      expect(event.date).toBeInstanceOf(Date)
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should initialize _eventExtra if not present', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        _eventExtra: undefined as any,
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as CardID,
        cardType: 'task' as CardType,
        content: 'Test' as Markdown,
        messageType: MessageType.Text,
        socialId
      }

      await middleware.event(session, event, false)

      expect(event._eventExtra).toBeDefined()
      expect(event._eventExtra).toEqual({})
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should preserve existing _eventExtra', async () => {
      const existingExtra = { someData: 'value' }
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as CardID,
        cardType: 'task' as CardType,
        content: 'Test' as Markdown,
        messageType: MessageType.Text,
        socialId,
        _eventExtra: existingExtra
      }

      await middleware.event(session, event, false)

      expect(event._eventExtra).toEqual(existingExtra)
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should handle events without date property', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.RemovePatch,
        cardId: 'card-123' as CardID,
        messageId: 'msg-123' as MessageID,
        socialId,
        date: undefined as any
      }

      await middleware.event(session, event, false)

      expect(event.date).toBeDefined()
      expect(event.date).toBeInstanceOf(Date)
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })
  })
})
