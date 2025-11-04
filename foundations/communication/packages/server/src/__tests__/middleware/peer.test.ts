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
import {
  AttachmentPatchEvent,
  CreateMessageEvent,
  CreatePeerEvent,
  Event,
  MessageEventType,
  NotificationEventType,
  PeerEventType, RemovePatchEvent,
  SessionData, UpdatePatchEvent
} from '@hcengineering/communication-sdk-types'
import {
  AccountUuid,
  CardID,
  CardType,
  Markdown,
  MessageID,
  MessageType,
  SocialID
} from '@hcengineering/communication-types'
import { PeerMiddleware } from '../../middleware/peer'
import { Enriched, Middleware, MiddlewareContext } from '../../types'
import { LowLevelClient } from '../../client'

describe('PeerMiddleware', () => {
  let mockContext: MiddlewareContext
  let mockClient: jest.Mocked<LowLevelClient>
  let mockMeasureCtx: jest.Mocked<MeasureContext>
  let mockNext: any
  let mockHead: any
  let session: SessionData
  let middleware: PeerMiddleware

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

    mockHead = {
      findPeers: jest.fn().mockResolvedValue([]),
      event: jest.fn().mockResolvedValue({}),
      findMessagesMeta: jest.fn().mockResolvedValue([]),
      findMessagesGroups: jest.fn().mockResolvedValue([]),
      findNotificationContexts: jest.fn().mockResolvedValue([]),
      findNotifications: jest.fn().mockResolvedValue([]),
      findLabels: jest.fn().mockResolvedValue([]),
      findCollaborators: jest.fn().mockResolvedValue([]),
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
      cadsWithPeers: new Set(),
      head: mockHead
    }

    session = {
      account: {
        uuid: accountUuid,
        socialIds: [socialId]
      },
      sessionId: 'session-123'
    } as any as SessionData

    middleware = new PeerMiddleware(mockContext, mockNext)
  })

  describe('CreatePeer events', () => {
    it('should add cardId to cadsWithPeers on CreatePeer event', async () => {
      const event: Enriched<CreatePeerEvent> = {
        ...basicEvent,
        workspaceId: workspace,
        kind: 'card',
        type: PeerEventType.CreatePeer,
        cardId,
        value: '123'
      }

      expect(mockContext.cadsWithPeers.has(cardId as any)).toBe(false)

      await middleware.event(session, event, false)

      expect(mockContext.cadsWithPeers.has(cardId as any)).toBe(true)
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should work with derived CreatePeer events', async () => {
      const event: Enriched<CreatePeerEvent> = {
        ...basicEvent,
        workspaceId: workspace,
        kind: 'card',
        type: PeerEventType.CreatePeer,
        cardId,
        value: '123'
      }

      await middleware.event(session, event, true)

      expect(mockContext.cadsWithPeers.has(cardId as any)).toBe(true)
      expect(mockNext.event).toHaveBeenCalledWith(session, event, true)
    })
  })

  describe('Message events with peers', () => {
    beforeEach(() => {
      mockContext.cadsWithPeers.add(cardId as any)
    })

    it('should fetch and attach peers for CreateMessage event', async () => {
      const peers = [
        { kind: 'card', members: [{ workspaceId: workspace, cardId: 'peer-card' }] }
      ]
      mockHead.findPeers.mockResolvedValue(peers)

      const event: Enriched<CreateMessageEvent> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId,
        cardType: 'task' as CardType,
        content: 'Test' as Markdown,
        messageType: MessageType.Text
      }

      await middleware.event(session, event, false)

      expect(mockHead.findPeers).toHaveBeenCalledWith(session, {
        workspaceId: workspace,
        cardId
      })
      expect(event._eventExtra?.peers).toEqual(peers)
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should fetch and attach peers for UpdatePatch event', async () => {
      const peers = [{ kind: 'card', members: [] }]
      mockHead.findPeers.mockResolvedValue(peers)

      const event: Enriched<UpdatePatchEvent> = {
        ...basicEvent,
        type: MessageEventType.UpdatePatch,
        cardId,
        messageId: 'msg-123' as MessageID,
        content: 'Updated' as Markdown
      }

      await middleware.event(session, event, false)

      expect(mockHead.findPeers).toHaveBeenCalledWith(session, {
        workspaceId: workspace,
        cardId
      })
      expect(event._eventExtra?.peers).toEqual(peers)
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should fetch and attach peers for RemovePatch event', async () => {
      const peers = [{ kind: 'card', members: [] }]
      mockHead.findPeers.mockResolvedValue(peers)

      const event: Enriched<RemovePatchEvent> = {
        ...basicEvent,
        type: MessageEventType.RemovePatch,
        cardId,
        messageId: 'msg-123' as MessageID
      }

      await middleware.event(session, event, false)

      expect(event._eventExtra?.peers).toEqual(peers)
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should fetch and attach peers for AttachmentPatch event', async () => {
      const peers = [{ kind: 'card', members: [] }]
      mockHead.findPeers.mockResolvedValue(peers)

      const event: Enriched<AttachmentPatchEvent> = {
        ...basicEvent,
        type: MessageEventType.AttachmentPatch,
        cardId,
        messageId: 'msg-123' as MessageID,
        operations: []
      }

      await middleware.event(session, event, false)

      expect(event._eventExtra?.peers).toEqual(peers)
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should initialize _eventExtra if not present', async () => {
      const peers = [{ kind: 'card', members: [] }]
      mockHead.findPeers.mockResolvedValue(peers)

      const event: Enriched<CreateMessageEvent> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId,
        cardType: 'task' as CardType,
        content: 'Test' as Markdown,
        messageType: MessageType.Text
      }

      await middleware.event(session, event, false)

      expect(event._eventExtra).toBeDefined()
      expect(event._eventExtra?.peers).toEqual(peers)
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should handle errors when fetching peers', async () => {
      mockHead.findPeers.mockRejectedValue(new Error('Fetch error'))

      const event: Enriched<CreateMessageEvent> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId,
        cardType: 'task' as CardType,
        content: 'Test' as Markdown,
        messageType: MessageType.Text
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow('Fetch error')
    })
  })

  describe('Message events without peers', () => {
    it('should not fetch peers when cardId not in cadsWithPeers', async () => {
      const event: Enriched<CreateMessageEvent> = {
        ...basicEvent,
        type: MessageEventType.CreateMessage,
        cardId: 'card-456' as CardID,
        cardType: 'task' as CardType,
        content: 'Test' as Markdown,
        messageType: MessageType.Text
      }

      await middleware.event(session, event, false)

      expect(mockHead.findPeers).not.toHaveBeenCalled()
      expect(event._eventExtra?.peers).toEqual([{ kind: 'card', members: [] }])
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })
  })

  describe('Non-message events', () => {
    it('should not fetch peers for notification events', async () => {
      const event: Enriched<Event> = {
        ...basicEvent,
        type: NotificationEventType.CreateNotification,
        account: accountUuid
      } as any as Enriched<Event>

      await middleware.event(session, event, false)

      expect(mockHead.findPeers).not.toHaveBeenCalled()
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })
  })
})
