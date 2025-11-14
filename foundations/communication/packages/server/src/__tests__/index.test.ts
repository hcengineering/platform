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
  CardID,
  Collaborator,
  FindCollaboratorsParams,
  FindLabelsParams,
  FindMessagesGroupParams,
  FindMessagesMetaParams,
  FindNotificationContextParams,
  FindNotificationsParams,
  FindPeersParams,
  Label,
  MessageMeta,
  MessagesGroup,
  Notification,
  NotificationContext,
  Peer
} from '@hcengineering/communication-types'
import { Event, EventResult, SessionData } from '@hcengineering/communication-sdk-types'
import { createDbAdapter } from '@hcengineering/communication-cockroach'
import { Api } from '../index'
import { getMetadata } from '../metadata'
import { buildMiddlewares } from '../middlewares'
import { Blob } from '../blob'
import { LowLevelClient } from '../client'

// Mock dependencies
jest.mock('@hcengineering/communication-cockroach')
jest.mock('../metadata')
jest.mock('../middlewares')
jest.mock('../blob')
jest.mock('../client')

describe('Api', () => {
  let mockCtx: jest.Mocked<MeasureContext>
  let mockMiddlewares: any
  let mockSession: SessionData
  let mockDbAdapter: any
  let mockBlob: jest.Mocked<Blob>
  let mockClient: jest.Mocked<LowLevelClient>
  let mockMetadata: any

  const workspace = 'test-workspace' as WorkspaceUuid
  const dbUrl = 'postgresql://test-db'
  const cardId = 'test-card-id' as CardID

  const createMockCallbacks = (): { registerAsyncRequest: jest.Mock, broadcast: jest.Mock, enqueue: jest.Mock } => ({
    registerAsyncRequest: jest.fn(),
    broadcast: jest.fn(),
    enqueue: jest.fn()
  })

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock MeasureContext
    mockCtx = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      newChild: jest.fn().mockReturnThis()
    } as any

    // Mock SessionData
    mockSession = {
      sessionId: 'session-123',
      account: {
        uuid: 'account-uuid',
        socialIds: []
      }
    } as any

    // Mock metadata
    mockMetadata = {
      accountsUrl: 'http://accounts',
      hulylakeUrl: 'http://hulylake',
      secret: 'test-secret',
      messagesPerBlob: 200
    }
    ;(getMetadata as jest.Mock).mockReturnValue(mockMetadata)

    // Mock DbAdapter
    mockDbAdapter = {
      findMessagesMeta: jest.fn(),
      close: jest.fn()
    }
    ;(createDbAdapter as jest.Mock).mockResolvedValue(mockDbAdapter)

    // Mock Blob
    mockBlob = {
      createMessage: jest.fn()
    } as any
    ;(Blob as jest.Mock).mockImplementation(() => mockBlob)

    // Mock LowLevelClient
    mockClient = {
      db: mockDbAdapter,
      blob: mockBlob
    } as any
    ;(LowLevelClient as jest.Mock).mockImplementation(() => mockClient)

    // Mock middlewares
    mockMiddlewares = {
      findMessagesMeta: jest.fn(),
      findMessagesGroups: jest.fn(),
      findNotificationContexts: jest.fn(),
      findNotifications: jest.fn(),
      findLabels: jest.fn(),
      findCollaborators: jest.fn(),
      findPeers: jest.fn(),
      subscribeCard: jest.fn(),
      unsubscribeCard: jest.fn(),
      event: jest.fn(),
      closeSession: jest.fn(),
      close: jest.fn()
    }
    ;(buildMiddlewares as jest.Mock).mockResolvedValue(mockMiddlewares)
  })

  describe('create', () => {
    it('should create Api instance with all dependencies', async () => {
      const callbacks = createMockCallbacks()
      const api = await Api.create(mockCtx, workspace, dbUrl, callbacks)

      expect(api).toBeInstanceOf(Api)
      expect(getMetadata).toHaveBeenCalled()
      expect(createDbAdapter).toHaveBeenCalledWith(dbUrl, workspace, mockCtx, { withLogs: false })
      expect(Blob).toHaveBeenCalledWith(mockCtx, workspace, mockMetadata)
      expect(LowLevelClient).toHaveBeenCalledWith(mockDbAdapter, mockBlob, mockMetadata, workspace)
      expect(buildMiddlewares).toHaveBeenCalled()
    })

    it('should initialize middlewares with correct context', async () => {
      const callbacks = createMockCallbacks()
      await Api.create(mockCtx, workspace, dbUrl, callbacks)

      expect(buildMiddlewares).toHaveBeenCalledWith(mockCtx, workspace, mockMetadata, mockClient, callbacks)
    })

    it('should handle callback functions', async () => {
      const callbacks = {
        onCardUpdated: jest.fn(),
        onMessageCreated: jest.fn(),
        registerAsyncRequest: jest.fn(),
        broadcast: jest.fn(),
        enqueue: jest.fn()
      }

      await Api.create(mockCtx, workspace, dbUrl, callbacks)

      expect(buildMiddlewares).toHaveBeenCalled()
    })
  })

  describe('findMessagesMeta', () => {
    it('should delegate to middlewares.findMessagesMeta', async () => {
      const params: FindMessagesMetaParams = { cardId }
      const expectedResult: MessageMeta[] = [
        { cardId, id: 'msg-1' as any, blobId: 'blob-1' as any, createdOn: Date.now() }
      ] as any

      mockMiddlewares.findMessagesMeta.mockResolvedValue(expectedResult)
      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())

      const result = await api.findMessagesMeta(mockSession, params)

      expect(result).toEqual(expectedResult)
      expect(mockMiddlewares.findMessagesMeta).toHaveBeenCalledWith(mockSession, params)
    })
  })

  describe('findMessagesGroups', () => {
    it('should delegate to middlewares.findMessagesGroups', async () => {
      const params: FindMessagesGroupParams = { cardId }
      const expectedResult: MessagesGroup[] = [{ cardId, blobId: 'blob-1' as any, count: 10 }] as any

      mockMiddlewares.findMessagesGroups.mockResolvedValue(expectedResult)
      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())

      const result = await api.findMessagesGroups(mockSession, params)

      expect(result).toEqual(expectedResult)
      expect(mockMiddlewares.findMessagesGroups).toHaveBeenCalledWith(mockSession, params)
    })
  })

  describe('findNotificationContexts', () => {
    it('should delegate to middlewares.findNotificationContexts without subscription', async () => {
      const params: FindNotificationContextParams = { limit: 10 }
      const expectedResult: NotificationContext[] = [{ id: 'ctx-1', cardId, unreadCount: 5 }] as any

      mockMiddlewares.findNotificationContexts.mockResolvedValue(expectedResult)
      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())

      const result = await api.findNotificationContexts(mockSession, params)

      expect(result).toEqual(expectedResult)
      expect(mockMiddlewares.findNotificationContexts).toHaveBeenCalledWith(mockSession, params, undefined)
    })

    it('should pass subscription to middlewares.findNotificationContexts', async () => {
      const params: FindNotificationContextParams = { limit: 10 }
      const subscription = 'sub-123'
      const expectedResult: NotificationContext[] = []

      mockMiddlewares.findNotificationContexts.mockResolvedValue(expectedResult)
      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())

      await api.findNotificationContexts(mockSession, params, subscription)

      expect(mockMiddlewares.findNotificationContexts).toHaveBeenCalledWith(mockSession, params, subscription)
    })
  })

  describe('findNotifications', () => {
    it('should delegate to middlewares.findNotifications without subscription', async () => {
      const params: FindNotificationsParams = { cardId }
      const expectedResult: Notification[] = [{ id: 'notif-1', cardId, isRead: false }] as any

      mockMiddlewares.findNotifications.mockResolvedValue(expectedResult)
      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())

      const result = await api.findNotifications(mockSession, params)

      expect(result).toEqual(expectedResult)
      expect(mockMiddlewares.findNotifications).toHaveBeenCalledWith(mockSession, params, undefined)
    })

    it('should pass subscription to middlewares.findNotifications', async () => {
      const params: FindNotificationsParams = { cardId }
      const subscription = 'sub-456'
      const expectedResult: Notification[] = []

      mockMiddlewares.findNotifications.mockResolvedValue(expectedResult)
      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())

      await api.findNotifications(mockSession, params, subscription)

      expect(mockMiddlewares.findNotifications).toHaveBeenCalledWith(mockSession, params, subscription)
    })
  })

  describe('findLabels', () => {
    it('should delegate to middlewares.findLabels', async () => {
      const params: FindLabelsParams = { cardId }
      const expectedResult: Label[] = [{ id: 'label-1', name: 'Bug', color: 'red' }] as any

      mockMiddlewares.findLabels.mockResolvedValue(expectedResult)
      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())

      const result = await api.findLabels(mockSession, params)

      expect(result).toEqual(expectedResult)
      expect(mockMiddlewares.findLabels).toHaveBeenCalledWith(mockSession, params)
    })
  })

  describe('findCollaborators', () => {
    it('should delegate to middlewares.findCollaborators', async () => {
      const params: FindCollaboratorsParams = { cardId }
      const expectedResult: Collaborator[] = [{ personUuid: 'person-1' as any, role: 'owner' }] as any

      mockMiddlewares.findCollaborators.mockResolvedValue(expectedResult)
      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())

      const result = await api.findCollaborators(mockSession, params)

      expect(result).toEqual(expectedResult)
      expect(mockMiddlewares.findCollaborators).toHaveBeenCalledWith(mockSession, params)
    })
  })

  describe('findPeers', () => {
    it('should delegate to middlewares.findPeers', async () => {
      const params: FindPeersParams = { cardId }
      const expectedResult: Peer[] = [{ personUuid: 'person-1' as any, name: 'John Doe' }] as any

      mockMiddlewares.findPeers.mockResolvedValue(expectedResult)
      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())

      const result = await api.findPeers(mockSession, params)

      expect(result).toEqual(expectedResult)
      expect(mockMiddlewares.findPeers).toHaveBeenCalledWith(mockSession, params)
    })
  })

  describe('subscribeCard', () => {
    it('should delegate to middlewares.subscribeCard', async () => {
      const subscription = 'sub-789'
      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())

      api.subscribeCard(mockSession, cardId, subscription)

      expect(mockMiddlewares.subscribeCard).toHaveBeenCalledWith(mockSession, cardId, subscription)
    })

    it('should not return a value', async () => {
      const subscription = 'sub-789'
      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())

      api.subscribeCard(mockSession, cardId, subscription)

      expect(mockMiddlewares.subscribeCard).toHaveBeenCalled()
    })
  })

  describe('unsubscribeCard', () => {
    it('should delegate to middlewares.unsubscribeCard', async () => {
      const subscription = 'sub-999'
      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())

      api.unsubscribeCard(mockSession, cardId, subscription)

      expect(mockMiddlewares.unsubscribeCard).toHaveBeenCalledWith(mockSession, cardId, subscription)
    })

    it('should not return a value', async () => {
      const subscription = 'sub-999'
      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())

      api.unsubscribeCard(mockSession, cardId, subscription)

      expect(mockMiddlewares.unsubscribeCard).toHaveBeenCalled()
    })
  })

  describe('event', () => {
    it('should delegate to middlewares.event', async () => {
      const event: Event = {
        type: 'message.create',
        data: { cardId, content: 'Test message' }
      } as any

      const expectedResult: EventResult = {
        success: true
      } as any

      mockMiddlewares.event.mockResolvedValue(expectedResult)
      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())

      const result = await api.event(mockSession, event)

      expect(result).toEqual(expectedResult)
      expect(mockMiddlewares.event).toHaveBeenCalledWith(mockSession, event)
    })

    it('should handle different event types', async () => {
      const events: Event[] = [
        { type: 'message.update', data: {} },
        { type: 'message.delete', data: {} },
        { type: 'notification.read', data: {} }
      ] as any

      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())

      for (const event of events) {
        mockMiddlewares.event.mockResolvedValue({ success: true })
        await api.event(mockSession, event)
        expect(mockMiddlewares.event).toHaveBeenCalledWith(mockSession, event)
      }
    })
  })

  describe('closeSession', () => {
    it('should delegate to middlewares.closeSession', async () => {
      const sessionId = 'session-to-close'
      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())

      await api.closeSession(sessionId)

      expect(mockMiddlewares.closeSession).toHaveBeenCalledWith(sessionId)
    })

    it('should complete without errors', async () => {
      const sessionId = 'session-123'
      mockMiddlewares.closeSession.mockResolvedValue(undefined)
      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())

      await expect(api.closeSession(sessionId)).resolves.toBeUndefined()
    })
  })

  describe('close', () => {
    it('should delegate to middlewares.close', async () => {
      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())

      await api.close()

      expect(mockMiddlewares.close).toHaveBeenCalled()
    })

    it('should complete without errors', async () => {
      mockMiddlewares.close.mockResolvedValue(undefined)
      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())

      await expect(api.close()).resolves.toBeUndefined()
    })
  })

  describe('Error handling', () => {
    it('should propagate errors from middlewares', async () => {
      const error = new Error('Middleware error')
      mockMiddlewares.findMessagesMeta.mockRejectedValue(error)

      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())
      const params: FindMessagesMetaParams = { cardId }

      await expect(api.findMessagesMeta(mockSession, params)).rejects.toThrow(error)
    })

    it('should handle errors during creation', async () => {
      const error = new Error('DB connection failed')
      ;(createDbAdapter as jest.Mock).mockRejectedValue(error)

      await expect(Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())).rejects.toThrow(error)
    })
  })

  describe('Integration scenarios', () => {
    it('should handle multiple operations in sequence', async () => {
      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())

      mockMiddlewares.findMessagesMeta.mockResolvedValue([])
      mockMiddlewares.findLabels.mockResolvedValue([])
      mockMiddlewares.findCollaborators.mockResolvedValue([])

      await api.findMessagesMeta(mockSession, { cardId })
      await api.findLabels(mockSession, { cardId })
      await api.findCollaborators(mockSession, { cardId })

      expect(mockMiddlewares.findMessagesMeta).toHaveBeenCalledTimes(1)
      expect(mockMiddlewares.findLabels).toHaveBeenCalledTimes(1)
      expect(mockMiddlewares.findCollaborators).toHaveBeenCalledTimes(1)
    })

    it('should handle subscription and unsubscription flow', async () => {
      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())
      const subscription = 'sub-flow'

      api.subscribeCard(mockSession, cardId, subscription)
      expect(mockMiddlewares.subscribeCard).toHaveBeenCalledWith(mockSession, cardId, subscription)

      api.unsubscribeCard(mockSession, cardId, subscription)
      expect(mockMiddlewares.unsubscribeCard).toHaveBeenCalledWith(mockSession, cardId, subscription)
    })

    it('should handle session lifecycle', async () => {
      const api = await Api.create(mockCtx, workspace, dbUrl, createMockCallbacks())
      const sessionId = 'lifecycle-session'

      // Perform operations
      mockMiddlewares.findMessagesMeta.mockResolvedValue([])
      await api.findMessagesMeta(mockSession, { cardId })

      // Close session
      await api.closeSession(sessionId)
      expect(mockMiddlewares.closeSession).toHaveBeenCalledWith(sessionId)

      // Close API
      await api.close()
      expect(mockMiddlewares.close).toHaveBeenCalled()
    })
  })
})
