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
import { MessageEventType, NotificationEventType, SessionData } from '@hcengineering/communication-sdk-types'
import { AccountUuid, CardID, CardType, Markdown, SocialID } from '@hcengineering/communication-types'

import { ValidateMiddleware } from '../../middleware/validate'
import { Enriched, Middleware, MiddlewareContext } from '../../types'
import { LowLevelClient } from '../../client'

describe('ValidateMiddleware', () => {
  let mockContext: MiddlewareContext
  let mockClient: jest.Mocked<LowLevelClient>
  let mockMeasureCtx: jest.Mocked<MeasureContext>
  let mockNext: any
  let session: SessionData
  let middleware: ValidateMiddleware

  const workspace = 'test-workspace' as WorkspaceUuid
  const accountUuid = 'account-123' as AccountUuid
  const socialId = 'social-123' as SocialID

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
      event: jest.fn().mockResolvedValue({}),
      findNotificationContexts: jest.fn().mockResolvedValue([]),
      findNotifications: jest.fn().mockResolvedValue([]),
      findLabels: jest.fn().mockResolvedValue([]),
      findCollaborators: jest.fn().mockResolvedValue([]),
      findMessagesGroups: jest.fn().mockResolvedValue([]),
      findMessagesMeta: jest.fn().mockResolvedValue([]),
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

    middleware = new ValidateMiddleware(mockContext, mockNext)
  })

  describe('event - CreateMessage validation', () => {
    it('should validate correct CreateMessage event', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as CardID,
        cardType: 'task' as CardType,
        messageType: 'text',
        content: 'Test message' as Markdown,
        socialId,
        date: new Date()
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should reject CreateMessage without cardId', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardType: 'task' as CardType,
        messageType: 'text',
        content: 'Test' as Markdown,
        socialId,
        date: new Date()
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow(Error)
    })

    it('should reject CreateMessage without content', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as CardID,
        cardType: 'task' as CardType,
        messageType: 'text',
        socialId,
        date: new Date()
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow(Error)
    })

    it('should reject CreateMessage without socialId', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as CardID,
        cardType: 'task' as CardType,
        messageType: 'text',
        content: 'Test' as Markdown,
        date: new Date()
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow(Error)
    })
  })

  describe('event - UpdatePatch validation', () => {
    it('should validate correct UpdatePatch event', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.UpdatePatch,
        cardId: 'card-123' as CardID,
        messageId: 'msg-123',
        content: 'Updated' as Markdown,
        socialId,
        date: new Date()
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should validate UpdatePatch without messageId', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.UpdatePatch,
        cardId: 'card-123' as CardID,
        content: 'Updated' as Markdown,
        socialId,
        date: new Date()
      }

      // UpdatePatch can have optional messageId according to schema
      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })
  })

  describe('event - RemovePatch validation', () => {
    it('should validate correct RemovePatch event', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.RemovePatch,
        cardId: 'card-123' as CardID,
        messageId: 'msg-123',
        socialId,
        date: new Date()
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should reject RemovePatch without cardId', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.RemovePatch,
        messageId: 'msg-123',
        socialId,
        date: new Date()
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow(Error)
    })
  })

  describe('event - ReactionPatch validation', () => {
    it('should validate correct ReactionPatch add event', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.ReactionPatch,
        cardId: 'card-123' as CardID,
        messageId: 'msg-123',
        operation: {
          opcode: 'add',
          reaction: '👍'
        },
        personUuid: 'person-123',
        socialId,
        date: new Date()
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should validate correct ReactionPatch remove event', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.ReactionPatch,
        cardId: 'card-123' as CardID,
        messageId: 'msg-123',
        operation: {
          opcode: 'remove',
          reaction: '👍'
        },
        personUuid: 'person-123',
        socialId,
        date: new Date()
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should reject ReactionPatch without operation', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.ReactionPatch,
        cardId: 'card-123' as any,
        messageId: 'msg-123',
        personUuid: 'person-123',
        socialId,
        date: new Date()
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow(Error)
    })

    it('should reject ReactionPatch with invalid opcode', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.ReactionPatch,
        cardId: 'card-123' as any,
        messageId: 'msg-123',
        operation: {
          opcode: 'invalid',
          reaction: '👍'
        },
        personUuid: 'person-123',
        socialId,
        date: new Date()
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow(Error)
    })
  })

  describe('event - AttachmentPatch validation', () => {
    it('should validate correct AttachmentPatch add event', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.AttachmentPatch,
        cardId: 'card-123' as any,
        messageId: 'msg-123',
        operations: [
          {
            opcode: 'add',
            attachments: [
              {
                id: '550e8400-e29b-41d4-a716-446655440000',
                mimeType: 'application/blob',
                params: {
                  blobId: '550e8400-e29b-41d4-a716-446655440001',
                  mimeType: 'image/png',
                  fileName: 'test.png',
                  size: 1024
                }
              }
            ]
          }
        ],
        socialId,
        date: new Date()
      }

      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should validate AttachmentPatch remove event', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.AttachmentPatch,
        cardId: 'card-123' as any,
        messageId: 'msg-123',
        operations: [
          {
            opcode: 'remove',
            ids: ['550e8400-e29b-41d4-a716-446655440000']
          }
        ],
        socialId,
        date: new Date()
      }

      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should validate AttachmentPatch set event', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.AttachmentPatch,
        cardId: 'card-123' as any,
        messageId: 'msg-123',
        operations: [
          {
            opcode: 'set',
            attachments: [
              {
                id: '550e8400-e29b-41d4-a716-446655440000',
                mimeType: 'application/blob',
                params: {
                  blobId: '550e8400-e29b-41d4-a716-446655440002',
                  mimeType: 'image/png',
                  fileName: 'file.png',
                  size: 2048
                }
              }
            ]
          }
        ],
        socialId,
        date: new Date()
      }

      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should validate AttachmentPatch update event', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.AttachmentPatch,
        cardId: 'card-123' as any,
        messageId: 'msg-123',
        operations: [
          {
            opcode: 'update',
            attachments: [
              {
                id: '550e8400-e29b-41d4-a716-446655440000',
                params: { newData: 'value' }
              }
            ]
          }
        ],
        socialId,
        date: new Date()
      }

      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should reject AttachmentPatch with empty operations', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.AttachmentPatch,
        cardId: 'card-123' as any,
        messageId: 'msg-123',
        operations: [],
        socialId,
        date: new Date()
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow(Error)
    })

    it('should reject AttachmentPatch without operations', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.AttachmentPatch,
        cardId: 'card-123' as any,
        messageId: 'msg-123',
        socialId,
        date: new Date()
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow(Error)
    })

    it('should validate AttachmentPatch with link preview', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.AttachmentPatch,
        cardId: 'card-123' as any,
        messageId: 'msg-123',
        operations: [
          {
            opcode: 'add',
            attachments: [
              {
                id: '550e8400-e29b-41d4-a716-446655440000',
                mimeType: 'application/vnd.huly.link-preview',
                params: {
                  url: 'https://example.com',
                  host: 'example.com'
                }
              }
            ]
          }
        ],
        socialId,
        date: new Date()
      }

      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })
  })

  describe('event - ThreadPatch validation', () => {
    it('should validate correct ThreadPatch attach event', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.ThreadPatch,
        cardId: 'card-123' as any,
        messageId: 'msg-123',
        operation: {
          opcode: 'attach',
          threadId: 'thread-123',
          threadType: 'task' as CardType
        },
        personUuid: 'person-123',
        socialId,
        date: new Date()
      }

      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should reject ThreadPatch without operation', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.ThreadPatch,
        cardId: 'card-123' as any,
        messageId: 'msg-123',
        personUuid: 'person-123',
        socialId,
        date: new Date()
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow(Error)
    })

    it('should reject ThreadPatch without personUuid', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.ThreadPatch,
        cardId: 'card-123' as any,
        messageId: 'msg-123',
        operation: {
          opcode: 'attach',
          threadId: 'thread-123',
          threadType: 'task' as CardType
        },
        socialId,
        date: new Date()
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow(Error)
    })
  })

  describe('event - BlobPatch validation (deprecated)', () => {
    it('should validate correct BlobPatch attach event', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.BlobPatch,
        cardId: 'card-123' as any,
        messageId: 'msg-123',
        operations: [
          {
            opcode: 'attach',
            blobs: [
              {
                blobId: '550e8400-e29b-41d4-a716-446655440000',
                mimeType: 'image/png',
                fileName: 'test.png',
                size: 1024
              }
            ]
          }
        ],
        socialId,
        date: new Date()
      }

      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should validate BlobPatch detach event', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.BlobPatch,
        cardId: 'card-123' as any,
        messageId: 'msg-123',
        operations: [
          {
            opcode: 'detach',
            blobIds: ['550e8400-e29b-41d4-a716-446655440000']
          }
        ],
        socialId,
        date: new Date()
      }

      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should validate BlobPatch set event', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.BlobPatch,
        cardId: 'card-123' as any,
        messageId: 'msg-123',
        operations: [
          {
            opcode: 'set',
            blobs: [
              {
                blobId: '550e8400-e29b-41d4-a716-446655440000',
                mimeType: 'application/pdf',
                fileName: 'doc.pdf',
                size: 2048
              }
            ]
          }
        ],
        socialId,
        date: new Date()
      }

      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should validate BlobPatch update event', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.BlobPatch,
        cardId: 'card-123' as any,
        messageId: 'msg-123',
        operations: [
          {
            opcode: 'update',
            blobs: [
              {
                blobId: '550e8400-e29b-41d4-a716-446655440000',
                fileName: 'updated.png'
              }
            ]
          }
        ],
        socialId,
        date: new Date()
      }

      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })
  })

  describe('event - Notification events validation', () => {
    it('should validate UpdateNotification event', async () => {
      const event: Enriched<any> = {
        type: NotificationEventType.UpdateNotification,
        contextId: 'ctx-123' as any,
        account: accountUuid,
        query: {
          type: 'message'
        },
        updates: {
          read: true
        },
        date: new Date()
      }

      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should validate RemoveNotificationContext event', async () => {
      const event: Enriched<any> = {
        type: NotificationEventType.RemoveNotificationContext,
        contextId: 'ctx-123' as any,
        account: accountUuid,
        date: new Date()
      }

      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should validate UpdateNotificationContext event', async () => {
      const event: Enriched<any> = {
        type: NotificationEventType.UpdateNotificationContext,
        contextId: 'ctx-123' as any,
        account: accountUuid,
        updates: {
          lastView: new Date()
        },
        date: new Date()
      }

      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should validate AddCollaborators event', async () => {
      const event: Enriched<any> = {
        type: NotificationEventType.AddCollaborators,
        cardId: 'card-123' as any,
        cardType: 'task' as CardType,
        collaborators: [accountUuid, 'account-456' as AccountUuid],
        socialId,
        date: new Date()
      }

      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should reject AddCollaborators with empty collaborators array', async () => {
      const event: Enriched<any> = {
        type: NotificationEventType.AddCollaborators,
        cardId: 'card-123' as any,
        cardType: 'task' as CardType,
        collaborators: [],
        socialId,
        date: new Date()
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow(Error)
    })

    it('should validate RemoveCollaborators event', async () => {
      const event: Enriched<any> = {
        type: NotificationEventType.RemoveCollaborators,
        cardId: 'card-123' as any,
        cardType: 'task' as CardType,
        collaborators: [accountUuid],
        socialId,
        date: new Date()
      }

      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should reject RemoveCollaborators with empty collaborators array', async () => {
      const event: Enriched<any> = {
        type: NotificationEventType.RemoveCollaborators,
        cardId: 'card-123' as any,
        cardType: 'task' as CardType,
        collaborators: [],
        socialId,
        date: new Date()
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow(Error)
    })
  })

  describe('event - CreateMessage with options', () => {
    it('should validate CreateMessage with skipLinkPreviews option', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as any,
        cardType: 'task' as CardType,
        messageType: 'text',
        content: 'Test' as Markdown,
        socialId,
        date: new Date(),
        options: {
          skipLinkPreviews: true
        }
      }

      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should validate CreateMessage with noNotify option', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as any,
        cardType: 'task' as CardType,
        messageType: 'text',
        content: 'Test' as Markdown,
        socialId,
        date: new Date(),
        options: {
          noNotify: true
        }
      }

      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should validate CreateMessage with ignoreMentions option', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as any,
        cardType: 'task' as CardType,
        messageType: 'text',
        content: 'Test @user' as Markdown,
        socialId,
        date: new Date(),
        options: {
          ignoreMentions: true
        }
      }

      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should validate CreateMessage with language', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as any,
        cardType: 'task' as CardType,
        messageType: 'text',
        content: 'Test' as Markdown,
        socialId,
        date: new Date(),
        language: 'en'
      }

      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should validate CreateMessage with extra data', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123' as any,
        cardType: 'task' as CardType,
        messageType: 'text',
        content: 'Test' as Markdown,
        socialId,
        date: new Date(),
        extra: {
          customField: 'value'
        }
      }

      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })
  })

  describe('event - UpdatePatch with options', () => {
    it('should validate UpdatePatch with skipLinkPreviewsUpdate option', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.UpdatePatch,
        cardId: 'card-123' as any,
        messageId: 'msg-123',
        content: 'Updated' as Markdown,
        socialId,
        date: new Date(),
        options: {
          skipLinkPreviewsUpdate: true
        }
      }

      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should validate UpdatePatch with extra data', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.UpdatePatch,
        cardId: 'card-123' as any,
        messageId: 'msg-123',
        content: 'Updated' as Markdown,
        socialId,
        date: new Date(),
        extra: {
          customField: 'newValue'
        }
      }

      await middleware.event(session, event, false)
      expect(mockNext.event).toHaveBeenCalled()
    })
  })

  describe('event - derived events', () => {
    it('should skip validation for derived events', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        // Missing required fields
        date: new Date()
      }

      await middleware.event(session, event, true)

      expect(mockNext.event).toHaveBeenCalledWith(session, event, true)
    })
  })

  describe('findNotificationContexts', () => {
    it('should validate correct params', async () => {
      const params = { cardId: 'card-123' as any }

      await middleware.findNotificationContexts(session, params)

      expect(mockNext.findNotificationContexts).toHaveBeenCalledWith(session, params, undefined)
    })

    it('should validate params with multiple fields', async () => {
      const params = {
        cardId: 'card-123' as any,
        account: accountUuid,
        limit: 10
      }

      await middleware.findNotificationContexts(session, params)

      expect(mockNext.findNotificationContexts).toHaveBeenCalled()
    })

    it('should pass subscription parameter', async () => {
      const params = { cardId: 'card-123' as any }
      const subscription = 'sub-123'

      await middleware.findNotificationContexts(session, params, subscription)

      expect(mockNext.findNotificationContexts).toHaveBeenCalledWith(session, params, subscription)
    })

    it('should validate params with array of cardIds', async () => {
      const params = {
        cardId: ['card-1', 'card-2', 'card-3'] as any[]
      }

      await middleware.findNotificationContexts(session, params)
      expect(mockNext.findNotificationContexts).toHaveBeenCalled()
    })

    it('should validate params with array of accounts', async () => {
      const params = {
        cardId: 'card-123' as any,
        account: [accountUuid, 'account-456' as AccountUuid]
      }

      await middleware.findNotificationContexts(session, params)
      expect(mockNext.findNotificationContexts).toHaveBeenCalled()
    })

    it('should validate params with notifications nested params', async () => {
      const params = {
        cardId: 'card-123' as any,
        notifications: {
          limit: 10,
          order: 1,
          read: false,
          total: true
        }
      }

      await middleware.findNotificationContexts(session, params)
      expect(mockNext.findNotificationContexts).toHaveBeenCalled()
    })

    it('should validate params with order parameter', async () => {
      const params = {
        cardId: 'card-123' as any,
        order: 1,
        limit: 20
      }

      await middleware.findNotificationContexts(session, params)
      expect(mockNext.findNotificationContexts).toHaveBeenCalled()
    })
  })

  describe('findNotifications', () => {
    it('should validate correct params', async () => {
      const params = { contextId: 'ctx-123' as any }

      await middleware.findNotifications(session, params)

      expect(mockNext.findNotifications).toHaveBeenCalledWith(session, params, undefined)
    })

    it('should validate params with query', async () => {
      const params = {
        contextId: 'ctx-123' as any,
        read: false,
        limit: 20
      }

      await middleware.findNotifications(session, params)

      expect(mockNext.findNotifications).toHaveBeenCalled()
    })

    it('should validate params with all optional fields', async () => {
      const params = {
        contextId: 'ctx-123' as any,
        read: false,
        cardId: 'card-123' as any,
        total: true,
        limit: 50,
        order: 1
      }

      await middleware.findNotifications(session, params)
      expect(mockNext.findNotifications).toHaveBeenCalled()
    })

    it('should validate params without contextId', async () => {
      const params = {
        account: accountUuid,
        cardId: 'card-123' as any
      }

      await middleware.findNotifications(session, params)
      expect(mockNext.findNotifications).toHaveBeenCalled()
    })
  })

  describe('findLabels', () => {
    it('should validate correct params', async () => {
      const params = { cardId: 'card-123' as any }

      await middleware.findLabels(session, params)

      expect(mockNext.findLabels).toHaveBeenCalledWith(session, params, undefined)
    })

    it('should validate params with labelId', async () => {
      const params = {
        cardId: 'card-123' as any,
        labelId: 'label-456' as any
      }

      await middleware.findLabels(session, params)

      expect(mockNext.findLabels).toHaveBeenCalled()
    })

    it('should validate params with array of labelIds', async () => {
      const params = {
        cardId: 'card-123' as any,
        labelId: ['label-1', 'label-2'] as any
      }

      await middleware.findLabels(session, params)
      expect(mockNext.findLabels).toHaveBeenCalled()
    })

    it('should validate params with cardType', async () => {
      const params = {
        cardId: 'card-123' as any,
        cardType: 'task' as CardType
      }

      await middleware.findLabels(session, params)
      expect(mockNext.findLabels).toHaveBeenCalled()
    })

    it('should validate params with array of cardTypes', async () => {
      const params = {
        cardId: 'card-123' as any,
        cardType: ['task', 'issue'] as CardType[]
      }

      await middleware.findLabels(session, params)
      expect(mockNext.findLabels).toHaveBeenCalled()
    })
  })

  describe('findCollaborators', () => {
    it('should validate correct params', async () => {
      const params = { cardId: 'card-123' as CardID }

      await middleware.findCollaborators(session, params)

      expect(mockNext.findCollaborators).toHaveBeenCalledWith(session, params)
    })
  })

  describe('findMessagesGroups', () => {
    it('should validate correct params', async () => {
      const params = { cardId: 'card-123' as CardID }

      await middleware.findMessagesGroups(session, params)

      expect(mockNext.findMessagesGroups).toHaveBeenCalledWith(session, params)
    })
  })

  describe('validation error handling', () => {
    it('should log validation errors', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        // Missing required fields
        date: new Date()
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow(Error)

      expect(mockMeasureCtx.error).toHaveBeenCalled()
    })
  })
})
