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
  Emoji,
  Markdown,
  MessageID,
  MessageType,
  SocialID
} from '@hcengineering/communication-types'
import { IdentityMiddleware } from '../../middleware/indentity'
import { Enriched, Middleware, MiddlewareContext } from '../../types'
import { LowLevelClient } from '../../client'

describe('IdentityMiddleware', () => {
  let mockContext: MiddlewareContext
  let mockClient: jest.Mocked<LowLevelClient>
  let mockMeasureCtx: jest.Mocked<MeasureContext>
  let mockNext: any
  let session: SessionData
  let middleware: IdentityMiddleware
  let findPersonUuidMock: jest.MockedFunction<typeof mockClient.findPersonUuid>

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

    const findPersonUuidFn = jest.fn()

    mockClient = {
      db: {},
      blob: {},
      findPersonUuid: findPersonUuidFn
    } as any as jest.Mocked<LowLevelClient>

    findPersonUuidMock = findPersonUuidFn

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
      sessionId: 'session-123'
    } as any as SessionData

    middleware = new IdentityMiddleware(mockContext, mockNext)
  })

  describe('event - personUuid enrichment', () => {
    it('should set personUuid for ThreadPatch event', async () => {
      const personUuid = 'person-123'
      findPersonUuidMock.mockResolvedValue(personUuid as any)

      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.ThreadPatch,
        cardId: 'card-123' as CardID,
        messageId: 'msg-123' as MessageID,
        operation: { opcode: 'attach', threadId: 'thread-123' as CardID, threadType: 'threadType' as CardType },
        socialId,
        date: new Date()
      }

      await middleware.event(session, event, false)

      expect(event.personUuid).toBe(personUuid)
      expect(findPersonUuidMock).toHaveBeenCalledWith(
        { ctx: mockMeasureCtx, account: session.account },
        socialId
      )
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should set personUuid for ReactionPatch event', async () => {
      const personUuid = 'person-456'
      findPersonUuidMock.mockResolvedValue(personUuid as any)

      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.ReactionPatch,
        cardId: 'card-123' as CardID,
        messageId: 'msg-123' as MessageID,
        operation: { opcode: 'add', reaction: '👍' as Emoji }
      }

      await middleware.event(session, event, false)

      expect(event.personUuid).toBe(personUuid)
      expect(findPersonUuidMock).toHaveBeenCalledWith(
        { ctx: mockMeasureCtx, account: session.account },
        socialId
      )
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should not set personUuid for CreateMessage event', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as CardID,
        cardType: 'task' as CardType,
        content: 'Test' as Markdown,
        messageType: MessageType.Text
      }

      await middleware.event(session, event, false)

      expect((event as any).personUuid).toBeUndefined()
      expect(findPersonUuidMock).not.toHaveBeenCalled()
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should handle personUuid as undefined when not found', async () => {
      findPersonUuidMock.mockResolvedValue(undefined)

      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.ThreadPatch,
        cardId: 'card-123' as CardID,
        messageId: 'msg-123' as MessageID,
        operation: { opcode: 'update', threadId: 'thread-123' as CardID, update: { threadType: 'threadType' as CardType } }
      }

      await middleware.event(session, event, false)

      expect(event.personUuid).toBeUndefined()
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should work with derived events', async () => {
      const personUuid = 'person-789'
      findPersonUuidMock.mockResolvedValue(personUuid as any)

      const event: Enriched<Event> = {
        ...basicEvent,
        type: MessageEventType.ReactionPatch,
        cardId: 'card-123' as CardID,
        messageId: 'msg-123' as MessageID,
        operation: { opcode: 'remove', reaction: '❤️' as Emoji }
      }

      await middleware.event(session, event, true)

      expect(event.personUuid).toBe(personUuid)
      expect(mockNext.event).toHaveBeenCalledWith(session, event, true)
    })
  })

  describe('findNotificationContexts - account enrichment', () => {
    it('should enrich params with account for regular user', async () => {
      const params = { cardId: 'card-123' as CardID }
      await middleware.findNotificationContexts(session, params)

      expect(mockNext.findNotificationContexts).toHaveBeenCalledWith(
        session,
        { ...params, account: accountUuid },
        undefined
      )
    })

    it('should not enrich params for system account', async () => {
      const systemSession: SessionData = {
        ...session,
        account: { uuid: systemAccountUuid, socialIds: [socialId] }
      } as any as SessionData

      const params = { cardId: 'card-123' as CardID }
      await middleware.findNotificationContexts(systemSession, params)

      expect(mockNext.findNotificationContexts).toHaveBeenCalledWith(systemSession, params, undefined)
    })

    it('should overwrite existing account in params with session account', async () => {
      const otherAccount = 'other-account' as AccountUuid
      const params = { cardId: 'card-123' as CardID, account: otherAccount }
      await middleware.findNotificationContexts(session, params)

      expect(mockNext.findNotificationContexts).toHaveBeenCalledWith(
        session,
        { ...params, account: accountUuid }, // Session account overwrites the other account
        undefined
      )
    })

    it('should pass subscription to next middleware', async () => {
      const params = { cardId: 'card-123' as CardID }
      const subscription = 'sub-123'
      await middleware.findNotificationContexts(session, params, subscription)

      expect(mockNext.findNotificationContexts).toHaveBeenCalledWith(
        session,
        { ...params, account: accountUuid },
        subscription
      )
    })
  })

  describe('findNotifications - account enrichment', () => {
    it('should enrich params with account for regular user', async () => {
      const params = { contextId: 'ctx-123' as any }
      await middleware.findNotifications(session, params)

      expect(mockNext.findNotifications).toHaveBeenCalledWith(
        session,
        { ...params, account: accountUuid },
        undefined
      )
    })

    it('should not enrich params for system account', async () => {
      const systemSession: SessionData = {
        ...session,
        account: { uuid: systemAccountUuid, socialIds: [socialId] }
      } as any as SessionData

      const params = { contextId: 'ctx-123' as any }
      await middleware.findNotifications(systemSession, params)

      expect(mockNext.findNotifications).toHaveBeenCalledWith(systemSession, params, undefined)
    })

    it('should overwrite existing account in params with session account', async () => {
      const otherAccount = 'other-account' as AccountUuid
      const params = { contextId: 'ctx-123' as any, account: otherAccount }
      await middleware.findNotifications(session, params)

      expect(mockNext.findNotifications).toHaveBeenCalledWith(
        session,
        { ...params, account: accountUuid }, // Session account overwrites the other account
        undefined
      )
    })
  })

  describe('findLabels - account enrichment', () => {
    it('should enrich params with account for regular user', async () => {
      const params = { cardId: 'card-123' as CardID }
      await middleware.findLabels(session, params)

      expect(mockNext.findLabels).toHaveBeenCalledWith(
        session,
        { ...params, account: accountUuid },
        undefined
      )
    })

    it('should not enrich params for system account', async () => {
      const systemSession: SessionData = {
        ...session,
        account: { uuid: systemAccountUuid, socialIds: [socialId] }
      } as any as SessionData

      const params = { cardId: 'card-123' as CardID }
      await middleware.findLabels(systemSession, params)

      expect(mockNext.findLabels).toHaveBeenCalledWith(systemSession, params, undefined)
    })

    it('should overwrite existing account in params with session account', async () => {
      const otherAccount = 'other-account' as AccountUuid
      const params = { cardId: 'card-123' as CardID, account: otherAccount }
      await middleware.findLabels(session, params)

      expect(mockNext.findLabels).toHaveBeenCalledWith(
        session,
        { ...params, account: accountUuid }, // Session account overwrites the other account
        undefined
      )
    })
  })
})
