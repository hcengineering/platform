import { type MeasureContext, PersonId, TxOperations, AttachedData } from '@hcengineering/core'
import { type GaxiosResponse } from 'gaxios'
import { gmail_v1 } from 'googleapis'
import { type Message } from '@hcengineering/gmail'

import { type Channel } from '../types'
import { AttachmentHandler } from '../message/attachments'
import { MessageManagerV1 } from '../message/v1/message'

/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/unbound-method */

jest.mock('../config')

describe('MessageManager', () => {
  let messageManager: MessageManagerV1
  let mockCtx: MeasureContext
  let mockClient: TxOperations
  let mockAttachmentHandler: AttachmentHandler
  let mockSocialId: PersonId
  let mockWorkspace: { getChannel: (email: string) => Channel | undefined }

  beforeEach(() => {
    mockCtx = {
      measure: jest.fn(),
      with: jest.fn()
    } as unknown as MeasureContext

    mockClient = {
      findOne: jest.fn(),
      findAll: jest.fn(),
      tx: jest.fn()
    } as unknown as TxOperations

    mockAttachmentHandler = {
      getPartFiles: jest.fn(),
      addAttachement: jest.fn()
    } as unknown as AttachmentHandler

    mockSocialId = 'test-social-id' as PersonId

    mockWorkspace = {
      getChannel: jest.fn()
    }

    messageManager = new MessageManagerV1(mockCtx, mockClient, mockAttachmentHandler, mockSocialId, mockWorkspace)
  })

  describe('saveMessage', () => {
    const createMockGmailResponse = (): GaxiosResponse<gmail_v1.Schema$Message> => ({
      config: {},
      data: {
        id: 'test-message-id',
        internalDate: '1234567890',
        payload: {
          headers: [
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'recipient@example.com' },
            { name: 'Message-ID', value: 'test-message-id' },
            { name: 'Subject', value: 'Test Subject' }
          ],
          parts: [
            {
              mimeType: 'text/plain',
              body: { data: 'dGVzdCBjb250ZW50' }
            },
            {
              mimeType: 'text/html',
              body: { data: 'PHA+dGVzdCBjb250ZW50PC9wPg==' }
            }
          ]
        }
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      request: {
        responseURL: 'https://example.com'
      }
    })

    const createMockMessage = (): AttachedData<Message> => ({
      messageId: 'test-message-id',
      textContent: 'test content',
      subject: 'Test Subject',
      content: 'test content',
      sendOn: 1234567890,
      from: 'sender@example.com',
      to: 'recipient@example.com',
      copy: [],
      incoming: true
    })

    it('should save message with attachments', async () => {
      const mockMessage = createMockGmailResponse()
      const mockChannel = { _id: 'test-channel-id' } as Channel
      mockWorkspace.getChannel = jest.fn().mockReturnValue(mockChannel)
      mockClient.findOne = jest.fn().mockResolvedValue(undefined)
      mockAttachmentHandler.getPartFiles = jest.fn().mockResolvedValue([])

      await messageManager.saveMessage(mockMessage, 'test@example.com')

      expect(mockClient.tx).toHaveBeenCalled()
      expect(mockAttachmentHandler.getPartFiles).toHaveBeenCalled()
    })

    it('should update existing message', async () => {
      const mockMessage = createMockGmailResponse()
      const mockChannel = { _id: 'test-channel-id' } as Channel
      const existingMessage = createMockMessage()
      mockWorkspace.getChannel = jest.fn().mockReturnValue(mockChannel)
      mockClient.findOne = jest.fn().mockResolvedValue(existingMessage)
      mockAttachmentHandler.getPartFiles = jest.fn().mockResolvedValue([])

      await messageManager.saveMessage(mockMessage, 'test@example.com')

      expect(mockClient.tx).toHaveBeenCalled()
      expect(mockAttachmentHandler.getPartFiles).toHaveBeenCalled()
    })

    it('should not save message when no channels found', async () => {
      const mockMessage = createMockGmailResponse()
      mockWorkspace.getChannel = jest.fn().mockReturnValue(undefined)

      await messageManager.saveMessage(mockMessage, 'test@example.com')

      expect(mockClient.tx).not.toHaveBeenCalled()
      expect(mockAttachmentHandler.getPartFiles).not.toHaveBeenCalled()
    })

    it('should handle incoming messages correctly', async () => {
      const mockMessage = createMockGmailResponse()
      const mockChannel = { _id: 'test-channel-id' } as Channel
      mockWorkspace.getChannel = jest.fn().mockReturnValue(mockChannel)
      mockClient.findOne = jest.fn().mockResolvedValue(undefined)
      mockAttachmentHandler.getPartFiles = jest.fn().mockResolvedValue([])

      await messageManager.saveMessage(mockMessage, 'recipient@example.com')

      expect(mockWorkspace.getChannel).toHaveBeenCalledWith('sender@example.com')
    })

    it('should handle outgoing messages correctly', async () => {
      const mockMessage = createMockGmailResponse()
      const mockChannel = { _id: 'test-channel-id' } as Channel
      mockWorkspace.getChannel = jest.fn().mockReturnValue(mockChannel)
      mockClient.findOne = jest.fn().mockResolvedValue(undefined)
      mockAttachmentHandler.getPartFiles = jest.fn().mockResolvedValue([])

      await messageManager.saveMessage(mockMessage, 'sender@example.com')

      expect(mockWorkspace.getChannel).toHaveBeenCalledWith('recipient@example.com')
    })
  })
})
