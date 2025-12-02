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

import { MeasureContext, WorkspaceUuid } from '@hcengineering/core'
import { Event, MessageEventType, ReactionPatchEvent, SessionData } from '@hcengineering/communication-sdk-types'
import {
  AccountUuid,
  CardID,
  CardType, Emoji,
  Markdown,
  MessageID,
  MessageType,
  SocialID
} from '@hcengineering/communication-types'

import { IdMiddleware } from '../../middleware/id'
import { Enriched, MiddlewareContext, Middleware } from '../../types'
import { LowLevelClient } from '../../client'

describe('IdMiddleware', () => {
  let mockContext: MiddlewareContext
  let mockClient: jest.Mocked<LowLevelClient>
  let mockMeasureCtx: jest.Mocked<MeasureContext>
  let mockNext: jest.Mocked<Middleware>
  let session: SessionData
  let middleware: IdMiddleware

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
      blob: {}
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

    middleware = new IdMiddleware(mockContext, mockNext)
  })

  describe('CreateMessage events', () => {
    it('should generate messageId when not provided', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as CardID,
        cardType: 'task' as CardType,
        content: 'Test message' as Markdown,
        messageType: MessageType.Text
      }

      await middleware.event(session, event, false)

      expect(event.messageId).toBeDefined()
      expect(typeof event.messageId).toBe('string')
      // @ts-expect-error check messageId
      expect(event.messageId.length).toBeGreaterThan(0)
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should generate unique messageIds for different events', async () => {
      const event1: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as CardID,
        cardType: 'task' as CardType,
        content: 'First message' as Markdown,
        messageType: MessageType.Text
      }

      const event2: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as CardID,
        cardType: 'task' as CardType,
        content: 'Second message' as Markdown,
        messageType: MessageType.Text
      }

      await middleware.event(session, event1, false)
      await middleware.event(session, event2, false)

      expect(event1.messageId).toBeDefined()
      expect(event2.messageId).toBeDefined()
      expect(event1.messageId).not.toBe(event2.messageId)
    })

    it('should preserve existing messageId', async () => {
      const existingMessageId = 'existing-msg-id' as MessageID
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as CardID,
        cardType: 'task' as CardType,
        content: 'Test message' as Markdown,
        messageType: MessageType.Text,
        messageId: existingMessageId
      }

      await middleware.event(session, event, false)

      expect(event.messageId).toBe(existingMessageId)
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should generate messageId for derived CreateMessage events', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as CardID,
        cardType: 'task' as CardType,
        content: 'Test' as Markdown,
        messageType: MessageType.Text
      }

      await middleware.event(session, event, true)

      expect(event.messageId).toBeDefined()
      expect(typeof event.messageId).toBe('string')
      expect(mockNext.event).toHaveBeenCalledWith(session, event, true)
    })
  })

  describe('Non-CreateMessage events', () => {
    it('should not modify messageId for UpdatePatch events', async () => {
      const messageId = 'msg-123' as MessageID
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.UpdatePatch,
        cardId: 'card-123' as CardID,
        messageId,
        content: 'Updated' as Markdown
      }

      await middleware.event(session, event, false)

      expect(event.messageId).toBe(messageId)
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should not modify messageId for RemovePatch events', async () => {
      const messageId = 'msg-123' as MessageID
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.RemovePatch,
        cardId: 'card-123' as CardID,
        messageId
      }

      await middleware.event(session, event, false)

      expect(event.messageId).toBe(messageId)
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should not modify messageId for ReactionPatch events', async () => {
      const messageId = 'msg-123' as MessageID
      const event: Enriched<ReactionPatchEvent> = {
        ...basicEvent,
        type: MessageEventType.ReactionPatch,
        cardId: 'card-123' as CardID,
        messageId,
        operation: { opcode: 'add', reaction: '👍' as Emoji }
      }

      await middleware.event(session, event, false)

      expect(event.messageId).toBe(messageId)
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })
  })
})
