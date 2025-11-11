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
import { MessageEventType, SessionData } from '@hcengineering/communication-sdk-types'
import { AccountUuid, CardType, Markdown, SocialID } from '@hcengineering/communication-types'
import { buildMiddlewares, Middlewares } from '../middlewares'
import { Metadata, MiddlewareContext, MiddlewareCreateFn, CommunicationCallbacks } from '../types'
import { LowLevelClient } from '../client'

describe('Middlewares', () => {
  let mockContext: MiddlewareContext
  let mockClient: {
    db: {
      findPeers: jest.Mock
      findMessagesMeta: jest.Mock
      findNotificationContexts: jest.Mock
      findNotifications: jest.Mock
      findLabels: jest.Mock
      findCollaborators: jest.Mock
    }
    blob: Record<string, unknown>
  }
  let mockMeasureCtx: jest.Mocked<MeasureContext>
  let mockCallbacks: jest.Mocked<CommunicationCallbacks>
  let session: SessionData
  let metadata: Metadata

  const workspace = 'test-workspace' as WorkspaceUuid
  const accountUuid = 'account-123' as AccountUuid
  const socialId = 'social-123' as SocialID

  beforeEach(() => {
    jest.clearAllMocks()

    mockMeasureCtx = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      newChild: jest.fn().mockReturnThis(),
      contextData: undefined
    } as unknown as jest.Mocked<MeasureContext>

    mockClient = {
      db: {
        findPeers: jest.fn().mockResolvedValue([]),
        findMessagesMeta: jest.fn().mockResolvedValue([]),
        findNotificationContexts: jest.fn().mockResolvedValue([]),
        findNotifications: jest.fn().mockResolvedValue([]),
        findLabels: jest.fn().mockResolvedValue([]),
        findCollaborators: jest.fn().mockResolvedValue([])
      },
      blob: {}
    }

    mockCallbacks = {
      registerAsyncRequest: jest.fn(),
      broadcast: jest.fn(),
      enqueue: jest.fn()
    } as any as jest.Mocked<CommunicationCallbacks>

    metadata = {
      accountsUrl: 'http://accounts.test',
      hulylakeUrl: 'http://hulylake.test',
      secret: 'test-secret',
      messagesPerBlob: 100
    }

    mockContext = {
      ctx: mockMeasureCtx,
      client: mockClient as unknown as LowLevelClient,
      workspace,
      metadata,
      cadsWithPeers: new Set()
    }

    session = {
      account: {
        uuid: accountUuid,
        socialIds: [socialId]
      },
      sessionId: 'session-123',
      asyncData: []
    } as unknown as SessionData
  })

  describe('buildMiddlewares', () => {
    it('should build middleware chain with all middlewares', async () => {
      const middlewares = await buildMiddlewares(
        mockMeasureCtx,
        workspace,
        metadata,
        mockClient as unknown as LowLevelClient,
        mockCallbacks
      )

      expect(middlewares).toBeDefined()
      expect(mockClient.db.findPeers).toHaveBeenCalledWith({ workspaceId: workspace })
    })

    it('should initialize cadsWithPeers from database', async () => {
      const peers = [
        { cardId: 'card-1' as any, workspaceId: workspace, kind: 'slack', value: 'channel-1' },
        { cardId: 'card-2' as any, workspaceId: workspace, kind: 'slack', value: 'channel-2' }
      ]
      mockClient.db.findPeers.mockResolvedValue(peers as any)

      await buildMiddlewares(
        mockMeasureCtx,
        workspace,
        metadata,
        mockClient as unknown as LowLevelClient,
        mockCallbacks
      )

      expect(mockClient.db.findPeers).toHaveBeenCalledWith({ workspaceId: workspace })
    })

    it('should handle errors during middleware initialization', async () => {
      mockClient.db.findPeers.mockRejectedValue(new Error('Database error'))

      await expect(
        buildMiddlewares(mockMeasureCtx, workspace, metadata, mockClient as unknown as LowLevelClient, mockCallbacks)
      ).rejects.toThrow('Database error')
    })
  })

  describe('Middlewares.create', () => {
    it('should create middleware chain from create functions', async () => {
      const createFns: MiddlewareCreateFn[] = [
        async (context, next) =>
          ({
            ...next,
            event: jest.fn().mockResolvedValue({}),
            findMessagesMeta: jest.fn().mockResolvedValue([]),
            findMessagesGroups: jest.fn().mockResolvedValue([]),
            findNotificationContexts: jest.fn().mockResolvedValue([]),
            findNotifications: jest.fn().mockResolvedValue([]),
            findLabels: jest.fn().mockResolvedValue([]),
            findCollaborators: jest.fn().mockResolvedValue([]),
            findPeers: jest.fn().mockResolvedValue([]),
            handleBroadcast: jest.fn(),
            subscribeCard: jest.fn(),
            unsubscribeCard: jest.fn(),
            close: jest.fn(),
            closeSession: jest.fn()
          }) as any
      ]

      const middlewares = await Middlewares.create(mockMeasureCtx, mockContext, createFns)

      expect(middlewares).toBeDefined()
    })

    it('should handle errors during chain building', async () => {
      const createFns: MiddlewareCreateFn[] = [
        async () => {
          throw new Error('Middleware initialization failed')
        }
      ]

      await expect(Middlewares.create(mockMeasureCtx, mockContext, createFns)).rejects.toThrow(
        'Middleware initialization failed'
      )

      expect(mockMeasureCtx.error).toHaveBeenCalledWith(
        'failed to initialize middlewares',
        expect.objectContaining({
          workspace
        })
      )
    })

    it('should build chain in correct order', async () => {
      const order: string[] = []
      const createFns: MiddlewareCreateFn[] = [
        async (context, next) => {
          order.push('first')
          return {
            ...next,
            event: jest.fn().mockResolvedValue({}),
            findMessagesMeta: jest.fn().mockResolvedValue([]),
            findMessagesGroups: jest.fn().mockResolvedValue([]),
            findNotificationContexts: jest.fn().mockResolvedValue([]),
            findNotifications: jest.fn().mockResolvedValue([]),
            findLabels: jest.fn().mockResolvedValue([]),
            findCollaborators: jest.fn().mockResolvedValue([]),
            findPeers: jest.fn().mockResolvedValue([]),
            handleBroadcast: jest.fn(),
            subscribeCard: jest.fn(),
            unsubscribeCard: jest.fn(),
            close: jest.fn(),
            closeSession: jest.fn()
          } as any
        },
        async (context, next) => {
          order.push('second')
          return {
            ...next,
            event: jest.fn().mockResolvedValue({}),
            findMessagesMeta: jest.fn().mockResolvedValue([]),
            findMessagesGroups: jest.fn().mockResolvedValue([]),
            findNotificationContexts: jest.fn().mockResolvedValue([]),
            findNotifications: jest.fn().mockResolvedValue([]),
            findLabels: jest.fn().mockResolvedValue([]),
            findCollaborators: jest.fn().mockResolvedValue([]),
            findPeers: jest.fn().mockResolvedValue([]),
            handleBroadcast: jest.fn(),
            subscribeCard: jest.fn(),
            unsubscribeCard: jest.fn(),
            close: jest.fn(),
            closeSession: jest.fn()
          } as any
        }
      ]

      await Middlewares.create(mockMeasureCtx, mockContext, createFns)

      // Middlewares should be created in reverse order (last to first)
      expect(order).toEqual(['second', 'first'])
    })
  })

  describe('Middlewares methods', () => {
    let middlewares: Middlewares
    let mockHead: any

    beforeEach(async () => {
      mockHead = {
        event: jest.fn().mockResolvedValue({}),
        findMessagesMeta: jest.fn().mockResolvedValue([{ messageId: 'msg-1' }]),
        findMessagesGroups: jest.fn().mockResolvedValue([{ blobId: 'blob-1' }]),
        findNotificationContexts: jest.fn().mockResolvedValue([{ id: 'ctx-1' }]),
        findNotifications: jest.fn().mockResolvedValue([{ id: 'notif-1' }]),
        findLabels: jest.fn().mockResolvedValue([{ labelId: 'label-1' }]),
        findCollaborators: jest.fn().mockResolvedValue([{ account: accountUuid }]),
        findPeers: jest.fn().mockResolvedValue([{ cardId: 'card-1' }]),
        handleBroadcast: jest.fn(),
        subscribeCard: jest.fn(),
        unsubscribeCard: jest.fn(),
        close: jest.fn(),
        closeSession: jest.fn()
      }

      const createFns: MiddlewareCreateFn[] = [async () => mockHead]

      middlewares = await Middlewares.create(mockMeasureCtx, mockContext, createFns)
    })

    describe('findMessagesMeta', () => {
      it('should delegate to head middleware', async () => {
        const params = { cardId: 'card-123' as any }

        const result = await middlewares.findMessagesMeta(session, params)

        expect(mockHead.findMessagesMeta).toHaveBeenCalledWith(session, params)
        expect(result).toEqual([{ messageId: 'msg-1' }])
      })

      it('should return empty array if no head', async () => {
        const middlewaresNoHead = await Middlewares.create(mockMeasureCtx, mockContext, [])

        const result = await middlewaresNoHead.findMessagesMeta(session, { cardId: 'card-123' as any })

        expect(result).toEqual([])
      })
    })

    describe('findMessagesGroups', () => {
      it('should delegate to head middleware', async () => {
        const params = { cardId: 'card-123' as any }

        const result = await middlewares.findMessagesGroups(session, params)

        expect(mockHead.findMessagesGroups).toHaveBeenCalledWith(session, params)
        expect(result).toEqual([{ blobId: 'blob-1' }])
      })

      it('should return empty array if no head', async () => {
        const middlewaresNoHead = await Middlewares.create(mockMeasureCtx, mockContext, [])

        const result = await middlewaresNoHead.findMessagesGroups(session, { cardId: 'card-123' as any })

        expect(result).toEqual([])
      })
    })

    describe('findNotificationContexts', () => {
      it('should delegate to head middleware', async () => {
        const params = { cardId: 'card-123' as any }
        const subscription = 'sub-123'

        const result = await middlewares.findNotificationContexts(session, params, subscription)

        expect(mockHead.findNotificationContexts).toHaveBeenCalledWith(session, params, subscription)
        expect(result).toEqual([{ id: 'ctx-1' }])
      })

      it('should return empty array if no head', async () => {
        const middlewaresNoHead = await Middlewares.create(mockMeasureCtx, mockContext, [])

        const result = await middlewaresNoHead.findNotificationContexts(session, { cardId: 'card-123' as any })

        expect(result).toEqual([])
      })
    })

    describe('findNotifications', () => {
      it('should delegate to head middleware', async () => {
        const params = { contextId: 'ctx-123' as any }
        const subscription = 'sub-123'

        const result = await middlewares.findNotifications(session, params, subscription)

        expect(mockHead.findNotifications).toHaveBeenCalledWith(session, params, subscription)
        expect(result).toEqual([{ id: 'notif-1' }])
      })

      it('should return empty array if no head', async () => {
        const middlewaresNoHead = await Middlewares.create(mockMeasureCtx, mockContext, [])

        const result = await middlewaresNoHead.findNotifications(session, { contextId: 'ctx-123' as any })

        expect(result).toEqual([])
      })
    })

    describe('findLabels', () => {
      it('should delegate to head middleware', async () => {
        const params = { cardId: 'card-123' as any }

        const result = await middlewares.findLabels(session, params)

        expect(mockHead.findLabels).toHaveBeenCalledWith(session, params)
        expect(result).toEqual([{ labelId: 'label-1' }])
      })

      it('should return empty array if no head', async () => {
        const middlewaresNoHead = await Middlewares.create(mockMeasureCtx, mockContext, [])

        const result = await middlewaresNoHead.findLabels(session, { cardId: 'card-123' as any })

        expect(result).toEqual([])
      })
    })

    describe('findCollaborators', () => {
      it('should delegate to head middleware', async () => {
        const params = { cardId: 'card-123' as any }

        const result = await middlewares.findCollaborators(session, params)

        expect(mockHead.findCollaborators).toHaveBeenCalledWith(session, params)
        expect(result).toEqual([{ account: accountUuid }])
      })

      it('should return empty array if no head', async () => {
        const middlewaresNoHead = await Middlewares.create(mockMeasureCtx, mockContext, [])

        const result = await middlewaresNoHead.findCollaborators(session, { cardId: 'card-123' as any })

        expect(result).toEqual([])
      })
    })

    describe('findPeers', () => {
      it('should delegate to head middleware', async () => {
        const params = { workspaceId: workspace, cardId: 'card-123' as any }

        const result = await middlewares.findPeers(session, params)

        expect(mockHead.findPeers).toHaveBeenCalledWith(session, params)
        expect(result).toEqual([{ cardId: 'card-1' }])
      })

      it('should return empty array if no head', async () => {
        const middlewaresNoHead = await Middlewares.create(mockMeasureCtx, mockContext, [])

        const result = await middlewaresNoHead.findPeers(session, { workspaceId: workspace, cardId: 'card-123' as any })

        expect(result).toEqual([])
      })
    })

    describe('event', () => {
      it('should process event through middleware chain', async () => {
        const event: any = {
          type: MessageEventType.CreateMessage,
          cardId: 'card-123',
          messageId: 'msg-123',
          cardType: 'task' as CardType,
          messageType: 'text',
          content: 'Test' as Markdown,
          socialId,
          date: new Date()
        }

        const result = await middlewares.event(session, event)

        expect(mockHead.event).toHaveBeenCalledWith(session, event, false)
        expect(mockHead.handleBroadcast).toHaveBeenCalledWith(session, [event])
        expect(result).toBeDefined()
      })

      it('should handle derived flag from session', async () => {
        const event: any = {
          type: MessageEventType.UpdatePatch,
          cardId: 'card-123',
          messageId: 'msg-123',
          content: 'Updated' as Markdown,
          socialId,
          date: new Date()
        }

        session.derived = true

        await middlewares.event(session, event)

        expect(mockHead.event).toHaveBeenCalledWith(session, event, true)
      })

      it('should return empty object if no head', async () => {
        const middlewaresNoHead = await Middlewares.create(mockMeasureCtx, mockContext, [])

        const event: any = {
          type: MessageEventType.CreateMessage,
          date: new Date()
        }

        const result = await middlewaresNoHead.event(session, event)

        expect(result).toEqual({})
      })
    })

    describe('subscribeCard', () => {
      it('should delegate to head middleware', () => {
        const cardId = 'card-123' as any
        const subscription = 'sub-123'

        middlewares.subscribeCard(session, cardId, subscription)

        expect(mockHead.subscribeCard).toHaveBeenCalledWith(session, cardId, subscription)
      })

      it('should do nothing if no head', () => {
        const middlewaresNoHead = Middlewares.create(mockMeasureCtx, mockContext, [])

        expect(() => {
          void middlewaresNoHead.then((m) => {
            m.subscribeCard(session, 'card-123' as any, 'sub-123')
          })
        }).not.toThrow()
      })
    })

    describe('unsubscribeCard', () => {
      it('should delegate to head middleware', () => {
        const cardId = 'card-123' as any
        const subscription = 'sub-123'

        middlewares.unsubscribeCard(session, cardId, subscription)

        expect(mockHead.unsubscribeCard).toHaveBeenCalledWith(session, cardId, subscription)
      })

      it('should do nothing if no head', async () => {
        const middlewaresNoHead = await Middlewares.create(mockMeasureCtx, mockContext, [])

        expect(() => {
          middlewaresNoHead.unsubscribeCard(session, 'card-123' as any, 'sub-123')
        }).not.toThrow()
      })
    })

    describe('closeSession', () => {
      it('should delegate to head middleware', async () => {
        await middlewares.closeSession('session-123')

        expect(mockHead.closeSession).toHaveBeenCalledWith('session-123')
      })

      it('should do nothing if no head', async () => {
        const middlewaresNoHead = await Middlewares.create(mockMeasureCtx, mockContext, [])

        await expect(middlewaresNoHead.closeSession('session-123')).resolves.not.toThrow()
      })
    })

    describe('close', () => {
      it('should close all middlewares', async () => {
        await middlewares.close()

        expect(mockHead.close).toHaveBeenCalled()
      })

      it('should handle errors during close', async () => {
        // Create a fresh context to avoid mock clearing issues
        const freshMockMeasureCtx = {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          newChild: jest.fn().mockReturnThis(),
          contextData: undefined
        } as unknown as jest.Mocked<MeasureContext>

        const freshContext = {
          ...mockContext,
          ctx: freshMockMeasureCtx
        }

        // Create a new middlewares instance with a close function that throws
        const mockMiddleware = {
          event: jest.fn().mockResolvedValue({}),
          findMessagesMeta: jest.fn().mockResolvedValue([]),
          findMessagesGroups: jest.fn().mockResolvedValue([]),
          findNotificationContexts: jest.fn().mockResolvedValue([]),
          findNotifications: jest.fn().mockResolvedValue([]),
          findLabels: jest.fn().mockResolvedValue([]),
          findCollaborators: jest.fn().mockResolvedValue([]),
          findPeers: jest.fn().mockResolvedValue([]),
          handleBroadcast: jest.fn(),
          subscribeCard: jest.fn(),
          unsubscribeCard: jest.fn(),
          close: jest.fn(() => {
            throw new Error('Close error')
          }),
          closeSession: jest.fn()
        }

        const createFns: MiddlewareCreateFn[] = [async () => mockMiddleware]

        const testMiddlewares = await Middlewares.create(freshMockMeasureCtx, freshContext, createFns)

        await testMiddlewares.close()

        expect(mockMiddleware.close).toHaveBeenCalled()
        expect(freshMockMeasureCtx.error).toHaveBeenCalledWith(
          'Failed to close middleware',
          expect.objectContaining({
            workspace
          })
        )
      })

      it('should do nothing if no head', async () => {
        const middlewaresNoHead = await Middlewares.create(mockMeasureCtx, mockContext, [])

        await expect(middlewaresNoHead.close()).resolves.not.toThrow()
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle empty middleware chain', async () => {
      const middlewares = await Middlewares.create(mockMeasureCtx, mockContext, [])

      const event: any = {
        type: MessageEventType.CreateMessage,
        date: new Date()
      }

      const result = await middlewares.event(session, event)
      expect(result).toEqual({})

      const messages = await middlewares.findMessagesMeta(session, { cardId: 'card-123' as any })
      expect(messages).toEqual([])
    })

    it('should handle multiple middlewares in chain', async () => {
      const middleware1Called: string[] = []
      const middleware2Called: string[] = []

      const createFns: MiddlewareCreateFn[] = [
        async (context, next) =>
          ({
            ...next,
            event: jest.fn().mockImplementation(async (s, e, d) => {
              middleware1Called.push('event')
              return next?.event != null ? await next.event(s, e, d) : {}
            }),
            findMessagesMeta: jest.fn().mockImplementation(async (s, p) => {
              middleware1Called.push('findMessagesMeta')
              return next?.findMessagesMeta != null ? await next.findMessagesMeta(s, p) : []
            }),
            findMessagesGroups: jest.fn().mockResolvedValue([]),
            findNotificationContexts: jest.fn().mockResolvedValue([]),
            findNotifications: jest.fn().mockResolvedValue([]),
            findLabels: jest.fn().mockResolvedValue([]),
            findCollaborators: jest.fn().mockResolvedValue([]),
            findPeers: jest.fn().mockResolvedValue([]),
            handleBroadcast: jest.fn(),
            subscribeCard: jest.fn(),
            unsubscribeCard: jest.fn(),
            close: jest.fn(),
            closeSession: jest.fn()
          }) as any,
        async (context, next) =>
          ({
            ...next,
            event: jest.fn().mockImplementation(async (s, e, d) => {
              middleware2Called.push('event')
              return {}
            }),
            findMessagesMeta: jest.fn().mockImplementation(async () => {
              middleware2Called.push('findMessagesMeta')
              return [{ messageId: 'msg-1' }]
            }),
            findMessagesGroups: jest.fn().mockResolvedValue([]),
            findNotificationContexts: jest.fn().mockResolvedValue([]),
            findNotifications: jest.fn().mockResolvedValue([]),
            findLabels: jest.fn().mockResolvedValue([]),
            findCollaborators: jest.fn().mockResolvedValue([]),
            findPeers: jest.fn().mockResolvedValue([]),
            handleBroadcast: jest.fn(),
            subscribeCard: jest.fn(),
            unsubscribeCard: jest.fn(),
            close: jest.fn(),
            closeSession: jest.fn()
          }) as any
      ]

      const middlewares = await Middlewares.create(mockMeasureCtx, mockContext, createFns)

      await middlewares.event(session, { type: MessageEventType.CreateMessage, date: new Date() } as any)
      await middlewares.findMessagesMeta(session, { cardId: 'card-123' as any })

      expect(middleware1Called).toContain('event')
      expect(middleware1Called).toContain('findMessagesMeta')
      expect(middleware2Called).toContain('event')
      expect(middleware2Called).toContain('findMessagesMeta')
    })
  })
})
