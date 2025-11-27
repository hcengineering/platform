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
import { MessageEventType, NotificationEventType, SessionData, LabelEventType, CardEventType, PeerEventType } from '@hcengineering/communication-sdk-types'
import { AccountUuid, CardType, Markdown, SocialID } from '@hcengineering/communication-types'
import { StorageMiddleware } from '../../middleware/storage'
import { Enriched, Middleware, MiddlewareContext } from '../../types'
import { LowLevelClient } from '../../client'

describe('StorageMiddleware', () => {
  let mockContext: MiddlewareContext
  let mockClient: {
    db: Record<string, jest.Mock>
    blob: Record<string, jest.Mock>
    getMessageMeta: jest.Mock
    findPersonUuid: jest.Mock
    removeMessageMeta: jest.Mock
  }
  let mockMeasureCtx: jest.Mocked<MeasureContext>
  let mockNext: jest.Mocked<Middleware>
  let session: SessionData
  let middleware: StorageMiddleware

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
      db: {
        findMessagesMeta: jest.fn().mockResolvedValue([]),
        findNotificationContexts: jest.fn().mockResolvedValue([]),
        findNotifications: jest.fn().mockResolvedValue([]),
        findLabels: jest.fn().mockResolvedValue([]),
        findCollaborators: jest.fn().mockResolvedValue([]),
        findPeers: jest.fn().mockResolvedValue([]),
        findThreadMeta: jest.fn().mockResolvedValue([]),
        createMessageMeta: jest.fn().mockResolvedValue(true),
        removeMessageMeta: jest.fn().mockResolvedValue(undefined),
        addCollaborators: jest.fn().mockResolvedValue([]),
        removeCollaborators: jest.fn().mockResolvedValue(undefined),
        createNotification: jest.fn().mockResolvedValue('notif-123'),
        updateNotification: jest.fn().mockResolvedValue(1),
        removeNotifications: jest.fn().mockResolvedValue([]),
        createNotificationContext: jest.fn().mockResolvedValue('ctx-123'),
        removeContext: jest.fn().mockResolvedValue('ctx-123'),
        updateContext: jest.fn().mockResolvedValue(undefined),
        createLabel: jest.fn().mockResolvedValue(undefined),
        removeLabels: jest.fn().mockResolvedValue(undefined),
        createPeer: jest.fn().mockResolvedValue(undefined),
        removePeer: jest.fn().mockResolvedValue(undefined),
        attachThreadMeta: jest.fn().mockResolvedValue(undefined),
        close: jest.fn()
      },
      blob: {
        findMessagesGroups: jest.fn().mockResolvedValue([]),
        getMessageGroupByDate: jest.fn().mockResolvedValue({ blobId: 'blob-123' }),
        insertMessage: jest.fn().mockResolvedValue(undefined),
        updateMessage: jest.fn().mockResolvedValue(undefined),
        removeMessage: jest.fn().mockResolvedValue(undefined),
        addReaction: jest.fn().mockResolvedValue(undefined),
        removeReaction: jest.fn().mockResolvedValue(undefined),
        addAttachments: jest.fn().mockResolvedValue(undefined),
        removeAttachments: jest.fn().mockResolvedValue(undefined),
        setAttachments: jest.fn().mockResolvedValue(undefined),
        updateAttachments: jest.fn().mockResolvedValue(undefined),
        attachThread: jest.fn().mockResolvedValue(undefined),
        detachThread: jest.fn().mockResolvedValue(undefined),
        addBlobs: jest.fn().mockResolvedValue(undefined),
        removeBlobs: jest.fn().mockResolvedValue(undefined),
        updateBlobs: jest.fn().mockResolvedValue(undefined),
        setBlobs: jest.fn().mockResolvedValue(undefined),
        updateThread: jest.fn().mockResolvedValue(undefined),
        addThreadReply: jest.fn().mockResolvedValue(undefined),
        removeThreadReply: jest.fn().mockResolvedValue(undefined)
      },
      getMessageMeta: jest.fn().mockResolvedValue({ blobId: 'blob-123', messageId: 'msg-123' }),
      findPersonUuid: jest.fn().mockResolvedValue('person-123'),
      removeMessageMeta: jest.fn().mockResolvedValue(undefined)
    }

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
      client: mockClient as any as LowLevelClient,
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

    middleware = new StorageMiddleware(mockContext, mockNext)
  })

  describe('findMessagesMeta', () => {
    it('should query database for messages meta', async () => {
      const params = { cardId: 'card-123' }
      const expectedResult = [{ messageId: 'msg-1', blobId: 'blob-1' }]
      mockClient.db.findMessagesMeta.mockResolvedValue(expectedResult as any)

      const result = await middleware.findMessagesMeta(session, params as any)

      expect(mockClient.db.findMessagesMeta).toHaveBeenCalledWith(params)
      expect(result).toEqual(expectedResult)
    })
  })

  describe('findMessagesGroups', () => {
    it('should query blob storage for messages groups', async () => {
      const params = { cardId: 'card-123' }
      const expectedResult = [{ blobId: 'blob-1', from: new Date(), to: new Date() }]
      mockClient.blob.findMessagesGroups.mockResolvedValue(expectedResult as any)

      const result = await middleware.findMessagesGroups(session, params as any)

      expect(mockClient.blob.findMessagesGroups).toHaveBeenCalledWith(params)
      expect(result).toEqual(expectedResult)
    })

    it('should use message meta blobId when id is provided', async () => {
      const params = { cardId: 'card-123', id: 'msg-123' }
      mockClient.getMessageMeta.mockResolvedValue({ blobId: 'blob-456', messageId: 'msg-123' } as any)

      await middleware.findMessagesGroups(session, params as any)

      expect(mockClient.getMessageMeta).toHaveBeenCalledWith('card-123', 'msg-123')
      expect(mockClient.blob.findMessagesGroups).toHaveBeenCalledWith({
        ...params,
        blobId: 'blob-456'
      })
    })

    it('should return empty array if message meta not found', async () => {
      const params = { cardId: 'card-123', id: 'msg-123' }
      mockClient.getMessageMeta.mockResolvedValue(undefined)

      const result = await middleware.findMessagesGroups(session, params as any)

      expect(result).toEqual([])
    })
  })

  describe('findNotificationContexts', () => {
    it('should query database for notification contexts', async () => {
      const params = { cardId: 'card-123', account: accountUuid }
      const expectedResult = [{ id: 'ctx-1', cardId: 'card-123' }]
      mockClient.db.findNotificationContexts.mockResolvedValue(expectedResult as any)

      const result = await middleware.findNotificationContexts(session, params as any)

      expect(mockClient.db.findNotificationContexts).toHaveBeenCalledWith(params
      )
      expect(result).toEqual(expectedResult)
    })
  })

  describe('findNotifications', () => {
    it('should query database for notifications', async () => {
      const params = { contextId: 'ctx-123' }
      const expectedResult = [{ id: 'notif-1', contextId: 'ctx-123' }]
      mockClient.db.findNotifications.mockResolvedValue(expectedResult as any)

      const result = await middleware.findNotifications(session, params as any)

      expect(mockClient.db.findNotifications).toHaveBeenCalledWith(params)
      expect(result).toEqual(expectedResult)
    })
  })

  describe('findLabels', () => {
    it('should query database for labels', async () => {
      const params = { cardId: 'card-123' }
      const expectedResult = [{ labelId: 'label-1', cardId: 'card-123' }]
      mockClient.db.findLabels.mockResolvedValue(expectedResult as any)

      const result = await middleware.findLabels(session, params as any)

      expect(mockClient.db.findLabels).toHaveBeenCalledWith(params)
      expect(result).toEqual(expectedResult)
    })
  })

  describe('findCollaborators', () => {
    it('should query database for collaborators', async () => {
      const params = { cardId: 'card-123' }
      const expectedResult = [{ account: accountUuid, cardId: 'card-123' }]
      mockClient.db.findCollaborators.mockResolvedValue(expectedResult as any)

      const result = await middleware.findCollaborators(session, params as any)

      expect(mockClient.db.findCollaborators).toHaveBeenCalledWith(params)
      expect(result).toEqual(expectedResult)
    })
  })

  describe('findPeers', () => {
    it('should query database for peers', async () => {
      const params = { workspaceId: workspace, cardId: 'card-123' }
      const expectedResult = [{ workspaceId: workspace, cardId: 'card-123' }]
      mockClient.db.findPeers.mockResolvedValue(expectedResult as any)

      const result = await middleware.findPeers(session, params as any)

      expect(mockClient.db.findPeers).toHaveBeenCalledWith(params)
      expect(result).toEqual(expectedResult)
    })
  })

  describe('event - CreateMessage', () => {
    it('should create message in storage', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        socialId,
        cardType: 'task' as CardType,
        messageType: 'text',
        content: 'Test message' as Markdown,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.blob.getMessageGroupByDate).toHaveBeenCalledWith('card-123', event.date)
      expect(mockClient.db.createMessageMeta).toHaveBeenCalledWith(
        'card-123',
        'msg-123',
        socialId,
        event.date,
        'blob-123'
      )
      expect(mockClient.blob.insertMessage).toHaveBeenCalled()
      expect(mockNext.event).toHaveBeenCalledWith(session, event, false)
    })

    it('should skip propagate if message already exists', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      mockClient.db.createMessageMeta.mockResolvedValue(false)

      await middleware.event(session, event, false)

      expect(event.skipPropagate).toBe(true)
      expect(mockNext.event).not.toHaveBeenCalled()
    })

    it('should throw error if messageId is missing', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await expect(middleware.event(session, event, false)).rejects.toThrow('Message id is required')
    })

    it('should throw error if message group not found', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.CreateMessage,
        cardId: 'card-123',
        messageId: 'msg-123',
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      mockClient.blob.getMessageGroupByDate.mockResolvedValue(null)

      await expect(middleware.event(session, event, false)).rejects.toThrow('Cannot create message')
    })
  })

  describe('event - UpdatePatch', () => {
    it('should update message in storage', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.UpdatePatch,
        cardId: 'card-123',
        messageId: 'msg-123',
        content: 'Updated content' as Markdown,
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.getMessageMeta).toHaveBeenCalledWith('card-123', 'msg-123')
      expect(mockClient.blob.updateMessage).toHaveBeenCalledWith(
        'card-123',
        'blob-123',
        'msg-123',
        {
          content: event.content,
          extra: event.extra,
          language: event.language
        },
        event.date
      )
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should skip propagate if message not found', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.UpdatePatch,
        cardId: 'card-123',
        messageId: 'msg-123',
        content: 'Updated' as Markdown,
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      mockClient.getMessageMeta.mockResolvedValue(undefined)

      await middleware.event(session, event, false)

      expect(event.skipPropagate).toBe(true)
      expect(mockNext.event).not.toHaveBeenCalled()
    })
  })

  describe('event - RemovePatch', () => {
    it('should remove message from storage', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.RemovePatch,
        cardId: 'card-123',
        messageId: 'msg-123',
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.getMessageMeta).toHaveBeenCalledWith('card-123', 'msg-123')
      expect(mockClient.blob.removeMessage).toHaveBeenCalledWith('card-123', 'blob-123', 'msg-123')
      expect(mockClient.removeMessageMeta).toHaveBeenCalledWith('card-123', 'msg-123')
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should skip propagate if message not found', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.RemovePatch,
        cardId: 'card-123',
        messageId: 'msg-123',
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      mockClient.getMessageMeta.mockResolvedValue(undefined)

      await middleware.event(session, event, false)

      expect(event.skipPropagate).toBe(true)
      expect(mockNext.event).not.toHaveBeenCalled()
    })
  })

  describe('event - ReactionPatch', () => {
    it('should add reaction to message', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.ReactionPatch,
        cardId: 'card-123',
        messageId: 'msg-123',
        operation: {
          opcode: 'add',
          reaction: '👍'
        },
        personUuid: 'person-123',
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.blob.addReaction).toHaveBeenCalledWith(
        'card-123',
        'blob-123',
        'msg-123',
        '👍',
        'person-123',
        event.date
      )
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should remove reaction from message', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.ReactionPatch,
        cardId: 'card-123',
        messageId: 'msg-123',
        operation: {
          opcode: 'remove',
          reaction: '👍'
        },
        personUuid: 'person-123',
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.blob.removeReaction).toHaveBeenCalledWith('card-123', 'blob-123', 'msg-123', '👍', 'person-123')
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should skip propagate if personUuid is missing', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.ReactionPatch,
        cardId: 'card-123',
        messageId: 'msg-123',
        operation: {
          opcode: 'add',
          reaction: '👍'
        },
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(event.skipPropagate).toBe(true)
      expect(mockNext.event).not.toHaveBeenCalled()
    })
  })

  describe('event - AttachmentPatch', () => {
    it('should add attachments to message', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.AttachmentPatch,
        cardId: 'card-123',
        messageId: 'msg-123',
        operations: [
          {
            opcode: 'add',
            attachments: [
              {
                id: 'att-1',
                mimeType: 'image/png',
                params: { fileName: 'test.png' }
              }
            ]
          }
        ],
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.blob.addAttachments).toHaveBeenCalled()
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should remove attachments from message', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.AttachmentPatch,
        cardId: 'card-123',
        messageId: 'msg-123',
        operations: [
          {
            opcode: 'remove',
            ids: ['att-1', 'att-2']
          }
        ],
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.blob.removeAttachments).toHaveBeenCalledWith('card-123', 'blob-123', 'msg-123', ['att-1', 'att-2'])
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should set attachments on message', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.AttachmentPatch,
        cardId: 'card-123',
        messageId: 'msg-123',
        operations: [
          {
            opcode: 'set',
            attachments: [
              {
                id: 'att-1',
                mimeType: 'image/png',
                params: { fileName: 'test.png' }
              }
            ]
          }
        ],
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.blob.setAttachments).toHaveBeenCalled()
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should update attachments on message', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.AttachmentPatch,
        cardId: 'card-123',
        messageId: 'msg-123',
        operations: [
          {
            opcode: 'update',
            attachments: [
              {
                id: 'att-1',
                params: { fileName: 'updated.png' }
              }
            ]
          }
        ],
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.blob.updateAttachments).toHaveBeenCalled()
      expect(mockNext.event).toHaveBeenCalled()
    })
  })

  describe('event - BlobPatch (deprecated)', () => {
    it('should convert blob attach to attachment add', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.BlobPatch,
        cardId: 'card-123',
        messageId: 'msg-123',
        operations: [
          {
            opcode: 'attach',
            blobs: [
              {
                blobId: 'blob-1',
                mimeType: 'image/png',
                fileName: 'test.png',
                size: 1024
              }
            ]
          }
        ],
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.blob.addAttachments).toHaveBeenCalled()
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should convert blob detach to attachment remove', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.BlobPatch,
        cardId: 'card-123',
        messageId: 'msg-123',
        operations: [
          {
            opcode: 'detach',
            blobIds: ['blob-1', 'blob-2']
          }
        ],
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.blob.removeAttachments).toHaveBeenCalled()
      expect(mockNext.event).toHaveBeenCalled()
    })
  })

  describe('event - ThreadPatch', () => {
    it('should attach thread to message', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.ThreadPatch,
        cardId: 'card-123',
        messageId: 'msg-123',
        operation: {
          opcode: 'attach',
          threadId: 'thread-123',
          threadType: 'task' as CardType
        },
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.db.attachThreadMeta).toHaveBeenCalledWith(
        'card-123',
        'msg-123',
        'thread-123',
        'task',
        socialId,
        event.date
      )
      expect(mockClient.blob.attachThread).toHaveBeenCalled()
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should update thread on message', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.ThreadPatch,
        cardId: 'card-123',
        messageId: 'msg-123',
        operation: {
          opcode: 'update',
          threadId: 'thread-123',
          update: { repliesCount: 5 }
        },
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.blob.updateThread).toHaveBeenCalledWith(
        'card-123',
        'blob-123',
        'msg-123',
        'thread-123',
        { repliesCount: 5 }
      )
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should add thread reply', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.ThreadPatch,
        cardId: 'card-123',
        messageId: 'msg-123',
        operation: {
          opcode: 'addReply',
          threadId: 'thread-123'
        },
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.findPersonUuid).toHaveBeenCalled()
      expect(mockClient.blob.addThreadReply).toHaveBeenCalledWith(
        'card-123',
        'blob-123',
        'msg-123',
        'thread-123',
        'person-123',
        event.date
      )
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should remove thread reply', async () => {
      const event: Enriched<any> = {
        type: MessageEventType.ThreadPatch,
        cardId: 'card-123',
        messageId: 'msg-123',
        operation: {
          opcode: 'removeReply',
          threadId: 'thread-123'
        },
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.findPersonUuid).toHaveBeenCalled()
      expect(mockClient.blob.removeThreadReply).toHaveBeenCalledWith(
        'card-123',
        'blob-123',
        'msg-123',
        'thread-123',
        'person-123'
      )
      expect(mockNext.event).toHaveBeenCalled()
    })
  })

  describe('event - Notification events', () => {
    it('should create notification', async () => {
      const event: Enriched<any> = {
        type: NotificationEventType.CreateNotification,
        contextId: 'ctx-123',
        messageId: 'msg-123',
        blobId: 'blob-123',
        notificationType: 'message',
        read: false,
        content: 'Test notification',
        creator: socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.db.createNotification).toHaveBeenCalledWith(
        'ctx-123',
        'msg-123',
        'blob-123',
        'message',
        false,
        'Test notification',
        socialId,
        event.date
      )
      expect(event.notificationId).toBe('notif-123')
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should update notification', async () => {
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

      expect(mockClient.db.updateNotification).toHaveBeenCalledWith(
        {
          contextId: 'ctx-123',
          account: accountUuid,
          type: 'message'
        },
        { read: true }
      )
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should skip propagate if no notifications updated', async () => {
      const event: Enriched<any> = {
        type: NotificationEventType.UpdateNotification,
        contextId: 'ctx-123',
        account: accountUuid,
        query: {},
        updates: { read: true },
        date: new Date(),
        _eventExtra: {}
      }

      mockClient.db.updateNotification.mockResolvedValue(0)

      await middleware.event(session, event, false)

      expect(event.skipPropagate).toBe(true)
      expect(mockNext.event).not.toHaveBeenCalled()
    })

    it('should remove notifications', async () => {
      const event: Enriched<any> = {
        type: NotificationEventType.RemoveNotifications,
        contextId: 'ctx-123',
        account: accountUuid,
        ids: ['notif-1', 'notif-2'],
        date: new Date(),
        _eventExtra: {}
      }

      mockClient.db.removeNotifications.mockResolvedValue(['notif-1', 'notif-2'])

      await middleware.event(session, event, false)

      expect(mockClient.db.removeNotifications).toHaveBeenCalledWith({
        contextId: 'ctx-123',
        account: accountUuid,
        id: ['notif-1', 'notif-2']
      })
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should skip propagate if no ids to remove', async () => {
      const event: Enriched<any> = {
        type: NotificationEventType.RemoveNotifications,
        contextId: 'ctx-123',
        account: accountUuid,
        ids: [],
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(event.skipPropagate).toBe(true)
      expect(mockNext.event).not.toHaveBeenCalled()
    })

    it('should create notification context', async () => {
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

      expect(mockClient.db.createNotificationContext).toHaveBeenCalled()
      expect(event.contextId).toBe('ctx-123')
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should remove notification context', async () => {
      const event: Enriched<any> = {
        type: NotificationEventType.RemoveNotificationContext,
        contextId: 'ctx-123',
        account: accountUuid,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.db.removeContext).toHaveBeenCalledWith({
        id: 'ctx-123',
        account: accountUuid
      })
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should skip propagate if context not found', async () => {
      const event: Enriched<any> = {
        type: NotificationEventType.RemoveNotificationContext,
        contextId: 'ctx-123',
        account: accountUuid,
        date: new Date(),
        _eventExtra: {}
      }

      mockClient.db.removeContext.mockResolvedValue(undefined)

      await middleware.event(session, event, false)

      expect(event.skipPropagate).toBe(true)
      expect(mockNext.event).not.toHaveBeenCalled()
    })

    it('should update notification context', async () => {
      const event: Enriched<any> = {
        type: NotificationEventType.UpdateNotificationContext,
        contextId: 'ctx-123',
        account: accountUuid,
        updates: { lastView: new Date() },
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.db.updateContext).toHaveBeenCalled()
      expect(mockNext.event).toHaveBeenCalled()
    })
  })

  describe('event - Collaborator events', () => {
    it('should add collaborators', async () => {
      const event: Enriched<any> = {
        type: NotificationEventType.AddCollaborators,
        cardId: 'card-123',
        cardType: 'task' as CardType,
        collaborators: [accountUuid, 'account-456' as AccountUuid],
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      mockClient.db.addCollaborators.mockResolvedValue([accountUuid, 'account-456' as AccountUuid])

      await middleware.event(session, event, false)

      expect(mockClient.db.addCollaborators).toHaveBeenCalledWith(
        'card-123',
        'task',
        [accountUuid, 'account-456'],
        event.date
      )
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should skip propagate if no collaborators added', async () => {
      const event: Enriched<any> = {
        type: NotificationEventType.AddCollaborators,
        cardId: 'card-123',
        cardType: 'task' as CardType,
        collaborators: [accountUuid],
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      mockClient.db.addCollaborators.mockResolvedValue([])

      await middleware.event(session, event, false)

      expect(event.skipPropagate).toBe(true)
      expect(mockNext.event).not.toHaveBeenCalled()
    })

    it('should remove collaborators', async () => {
      const event: Enriched<any> = {
        type: NotificationEventType.RemoveCollaborators,
        cardId: 'card-123',
        cardType: 'task' as CardType,
        collaborators: [accountUuid],
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.db.removeCollaborators).toHaveBeenCalledWith({
        cardId: 'card-123',
        account: [accountUuid]
      })
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should skip propagate if no collaborators to remove', async () => {
      const event: Enriched<any> = {
        type: NotificationEventType.RemoveCollaborators,
        cardId: 'card-123',
        cardType: 'task' as CardType,
        collaborators: [],
        socialId,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(event.skipPropagate).toBe(true)
      expect(mockNext.event).not.toHaveBeenCalled()
    })
  })

  describe('event - Label events', () => {
    it('should create label', async () => {
      const event: Enriched<any> = {
        type: LabelEventType.CreateLabel,
        cardId: 'card-123',
        cardType: 'task' as CardType,
        labelId: 'label-123',
        account: accountUuid,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.db.createLabel).toHaveBeenCalledWith(
        'card-123',
        'task',
        'label-123',
        accountUuid,
        event.date
      )
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should remove label', async () => {
      const event: Enriched<any> = {
        type: LabelEventType.RemoveLabel,
        labelId: 'label-123',
        cardId: 'card-123',
        account: accountUuid,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.db.removeLabels).toHaveBeenCalledWith({
        labelId: 'label-123',
        cardId: 'card-123',
        account: accountUuid
      })
      expect(mockNext.event).toHaveBeenCalled()
    })
  })

  describe('event - Peer events', () => {
    it('should create peer', async () => {
      const event: Enriched<any> = {
        type: PeerEventType.CreatePeer,
        workspaceId: workspace,
        cardId: 'card-123',
        kind: 'slack',
        value: 'channel-123',
        extra: { foo: 'bar' },
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.db.createPeer).toHaveBeenCalledWith(
        workspace,
        'card-123',
        'slack',
        'channel-123',
        { foo: 'bar' },
        event.date
      )
      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should remove peer', async () => {
      const event: Enriched<any> = {
        type: PeerEventType.RemovePeer,
        workspaceId: workspace,
        cardId: 'card-123',
        kind: 'slack',
        value: 'channel-123',
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockClient.db.removePeer).toHaveBeenCalledWith(
        workspace,
        'card-123',
        'slack',
        'channel-123'
      )
      expect(mockNext.event).toHaveBeenCalled()
    })
  })

  describe('event - Card events', () => {
    it('should handle UpdateCardType event', async () => {
      const event: Enriched<any> = {
        type: CardEventType.UpdateCardType,
        cardId: 'card-123',
        cardType: 'issue' as CardType,
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })

    it('should handle RemoveCard event', async () => {
      const event: Enriched<any> = {
        type: CardEventType.RemoveCard,
        cardId: 'card-123',
        date: new Date(),
        _eventExtra: {}
      }

      await middleware.event(session, event, false)

      expect(mockNext.event).toHaveBeenCalled()
    })
  })

  describe('close', () => {
    it('should close database connection', () => {
      middleware.close()

      expect(mockClient.db.close).toHaveBeenCalled()
    })
  })
})
