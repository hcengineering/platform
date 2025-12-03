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
import { CreateMessageEvent, MessageEventType, type SessionData } from '@hcengineering/communication-sdk-types'
import {
  type AccountUuid,
  CardID,
  type CardType,
  type ContextID,
  type Markdown,
  MessageID,
  MessageType,
  type SocialID
} from '@hcengineering/communication-types'

import { BaseMiddleware } from '../../middleware/base'
import { type Enriched, type Middleware, type MiddlewareContext } from '../../types'
import { type LowLevelClient } from '../../client'

describe('BaseMiddleware', () => {
  let mockContext: MiddlewareContext
  let mockClient: jest.Mocked<LowLevelClient>
  let mockMeasureCtx: jest.Mocked<MeasureContext>
  let mockNext: jest.Mocked<Middleware>
  let session: SessionData
  let middleware: BaseMiddleware

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
    } as unknown as jest.Mocked<LowLevelClient>

    mockNext = {
      event: jest.fn().mockResolvedValue({ success: true }),
      findNotificationContexts: jest.fn().mockResolvedValue([{ id: 'ctx-1' }]),
      findNotifications: jest.fn().mockResolvedValue([{ id: 'notif-1' }]),
      findLabels: jest.fn().mockResolvedValue([{ labelId: 'label-1' }]),
      findCollaborators: jest.fn().mockResolvedValue([{ account: accountUuid }]),
      findPeers: jest.fn().mockResolvedValue([{ cardId: 'card-1' }]),
      findMessagesMeta: jest.fn().mockResolvedValue([{ messageId: 'msg-1' }]),
      findMessagesGroups: jest.fn().mockResolvedValue([{ blobId: 'blob-1' }]),
      handleBroadcast: jest.fn(),
      subscribeCard: jest.fn(),
      unsubscribeCard: jest.fn(),
      close: jest.fn(),
      closeSession: jest.fn()
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

    middleware = new BaseMiddleware(mockContext, mockNext)
  })

  describe('event', () => {
    it('should delegate to next middleware', async () => {
      const event: Enriched<CreateMessageEvent> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as CardID,
        messageId: 'msg-123' as MessageID,
        cardType: 'task' as CardType,
        messageType: MessageType.Text,
        content: 'Test' as Markdown,
        socialId
      }

      const result = await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
      expect(result).toEqual({ success: true })
    })

    it('should return empty object if no next middleware', async () => {
      const middlewareWithoutNext = new BaseMiddleware(mockContext)
      const event: Enriched<CreateMessageEvent> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as CardID,
        messageId: 'msg-123' as MessageID,
        cardType: 'task' as CardType,
        messageType: MessageType.Text,
        content: 'Test' as Markdown,
        socialId
      }

      const result = await middlewareWithoutNext.event(session, event, false)

      expect(result).toEqual({})
    })
  })

  describe('findMessagesMeta', () => {
    it('should delegate to next middleware', async () => {
      const params = { cardId: 'card-123' as CardID }

      const result = await middleware.findMessagesMeta(session, params)

      expect(mockNext.findMessagesMeta).toHaveBeenCalledWith(session, params)
      expect(result).toEqual([{ messageId: 'msg-1' }])
    })

    it('should return empty array if no next middleware', async () => {
      const middlewareWithoutNext = new BaseMiddleware(mockContext)
      const params = { cardId: 'card-123' as CardID }

      const result = await middlewareWithoutNext.findMessagesMeta(session, params)

      expect(result).toEqual([])
    })
  })

  describe('findMessagesGroups', () => {
    it('should delegate to next middleware', async () => {
      const params = { cardId: 'card-123' as CardID }

      const result = await middleware.findMessagesGroups(session, params)

      expect(mockNext.findMessagesGroups).toHaveBeenCalledWith(session, params)
      expect(result).toEqual([{ blobId: 'blob-1' }])
    })

    it('should return empty array if no next middleware', async () => {
      const middlewareWithoutNext = new BaseMiddleware(mockContext)
      const params = { cardId: 'card-123' as CardID }

      const result = await middlewareWithoutNext.findMessagesGroups(session, params)

      expect(result).toEqual([])
    })
  })

  describe('findNotificationContexts', () => {
    it('should delegate to next middleware', async () => {
      const params = { cardId: 'card-123' as CardID, account: accountUuid }
      const subscription = 'sub-123'

      const result = await middleware.findNotificationContexts(session, params, subscription)

      expect(mockNext.findNotificationContexts).toHaveBeenCalledWith(session, params, subscription)
      expect(result).toEqual([{ id: 'ctx-1' }])
    })

    it('should return empty array if no next middleware', async () => {
      const middlewareWithoutNext = new BaseMiddleware(mockContext)
      const params = { cardId: 'card-123' as CardID }

      const result = await middlewareWithoutNext.findNotificationContexts(session, params)

      expect(result).toEqual([])
    })
  })

  describe('findNotifications', () => {
    it('should delegate to next middleware', async () => {
      const params = { contextId: 'ctx-123' as ContextID }
      const subscription = 'sub-123'

      const result = await middleware.findNotifications(session, params, subscription)

      expect(mockNext.findNotifications).toHaveBeenCalledWith(session, params, subscription)
      expect(result).toEqual([{ id: 'notif-1' }])
    })

    it('should return empty array if no next middleware', async () => {
      const middlewareWithoutNext = new BaseMiddleware(mockContext)
      const params = { contextId: 'ctx-123' as ContextID }

      const result = await middlewareWithoutNext.findNotifications(session, params)

      expect(result).toEqual([])
    })
  })

  describe('findLabels', () => {
    it('should delegate to next middleware', async () => {
      const params = { cardId: 'card-123' as CardID }
      const subscription = 'sub-123'

      const result = await middleware.findLabels(session, params, subscription)

      expect(mockNext.findLabels).toHaveBeenCalledWith(session, params, subscription)
      expect(result).toEqual([{ labelId: 'label-1' }])
    })

    it('should return empty array if no next middleware', async () => {
      const middlewareWithoutNext = new BaseMiddleware(mockContext)
      const params = { cardId: 'card-123' as CardID }

      const result = await middlewareWithoutNext.findLabels(session, params)

      expect(result).toEqual([])
    })
  })

  describe('findCollaborators', () => {
    it('should delegate to next middleware', async () => {
      const params = { cardId: 'card-123' as CardID }

      const result = await middleware.findCollaborators(session, params)

      expect(mockNext.findCollaborators).toHaveBeenCalledWith(session, params)
      expect(result).toEqual([{ account: accountUuid }])
    })

    it('should return empty array if no next middleware', async () => {
      const middlewareWithoutNext = new BaseMiddleware(mockContext)
      const params = { cardId: 'card-123' as CardID }

      const result = await middlewareWithoutNext.findCollaborators(session, params)

      expect(result).toEqual([])
    })
  })

  describe('findPeers', () => {
    it('should delegate to next middleware', async () => {
      const params = { workspaceId: workspace, cardId: 'card-123' as CardID }

      const result = await middleware.findPeers(session, params)

      expect(mockNext.findPeers).toHaveBeenCalledWith(session, params)
      expect(result).toEqual([{ cardId: 'card-1' }])
    })

    it('should return empty array if no next middleware', async () => {
      const middlewareWithoutNext = new BaseMiddleware(mockContext)
      const params = { workspaceId: workspace, cardId: 'card-123' as CardID }

      const result = await middlewareWithoutNext.findPeers(session, params)

      expect(result).toEqual([])
    })
  })

  describe('handleBroadcast', () => {
    it('should delegate to next middleware', () => {
      const events: Enriched<any>[] = [
        {
          type: MessageEventType.CreateMessage,
          cardId: 'card-123',
          date: new Date(),
          _eventExtra: {}
        }
      ]

      middleware.handleBroadcast(session, events)

      expect(mockNext.handleBroadcast).toHaveBeenCalledWith(session, events)
    })

    it('should do nothing if no next middleware', () => {
      const middlewareWithoutNext = new BaseMiddleware(mockContext)
      const events: Enriched<any>[] = [
        {
          type: MessageEventType.CreateMessage,
          date: new Date(),
          _eventExtra: {}
        }
      ]

      expect(() => {
        middlewareWithoutNext.handleBroadcast(session, events)
      }).not.toThrow()
    })
  })

  describe('subscribeCard', () => {
    it('should delegate to next middleware', () => {
      const cardId = 'card-123' as CardID
      const subscription = 'sub-123'

      middleware.subscribeCard(session, cardId, subscription)

      expect(mockNext.subscribeCard).toHaveBeenCalledWith(session, cardId, subscription)
    })

    it('should do nothing if no next middleware', () => {
      const middlewareWithoutNext = new BaseMiddleware(mockContext)
      const cardId = 'card-123' as CardID
      const subscription = 'sub-123'

      expect(() => {
        middlewareWithoutNext.subscribeCard(session, cardId, subscription)
      }).not.toThrow()
    })
  })

  describe('unsubscribeCard', () => {
    it('should delegate to next middleware', () => {
      const cardId = 'card-123' as CardID
      const subscription = 'sub-123'

      middleware.unsubscribeCard(session, cardId, subscription)

      expect(mockNext.unsubscribeCard).toHaveBeenCalledWith(session, cardId, subscription)
    })

    it('should do nothing if no next middleware', () => {
      const middlewareWithoutNext = new BaseMiddleware(mockContext)
      const cardId = 'card-123' as CardID
      const subscription = 'sub-123'

      expect(() => {
        middlewareWithoutNext.unsubscribeCard(session, cardId, subscription)
      }).not.toThrow()
    })
  })

  describe('close', () => {
    it('should call close without errors', () => {
      expect(() => {
        middleware.close()
      }).not.toThrow()
    })
  })

  describe('closeSession', () => {
    it('should call closeSession without errors', () => {
      expect(() => {
        middleware.closeSession('session-123')
      }).not.toThrow()
    })
  })
})
