import {
  MeasureContext,
  Ref,
  Blob,
  TxOperations,
  WorkspaceUuid,
  Doc,
  Space,
  Class,
  PersonId
} from '@hcengineering/core'
import { StorageAdapter } from '@hcengineering/server-core'
import { gmail_v1 } from 'googleapis'
import { AttachmentHandler } from '../message/attachments'
import type { Attachment as AttachedFile } from '@hcengineering/mail-common'
import attachment, { Attachment } from '@hcengineering/attachment'
import { decode64, encode64 } from '../base64'
import { WorkspaceLoginInfo } from '@hcengineering/account-client'

jest.mock('../config')

/* eslint-disable @typescript-eslint/unbound-method */

describe('AttachmentHandler', () => {
  const mockCtx: MeasureContext = {
    contextData: {},
    newChild: jest.fn(),
    with: jest.fn(),
    withSync: jest.fn(),
    extractMeta: jest.fn(),
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      logOperation: jest.fn(),
      childLogger: jest.fn(),
      close: jest.fn()
    },
    measure: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    end: jest.fn(),
    getParams: jest.fn()
  }
  const mockWorkspaceLoginInfo: WorkspaceLoginInfo = {
    endpoint: 'wss://test-endpoint.com',
    workspace: 'test-workspace' as WorkspaceUuid,
    token: 'test-token'
  } as any
  const mockStorageAdapter = {
    put: jest.fn(),
    read: jest.fn()
  } as unknown as StorageAdapter
  const mockGmail = {
    messages: {
      attachments: {
        get: jest.fn()
      }
    }
  } as unknown as gmail_v1.Resource$Users
  const mockClient = {
    addCollection: jest.fn(),
    findAll: jest.fn()
  } as unknown as TxOperations

  const getBaseAttachment = (): Attachment => ({
    _id: 'test-attachment' as Ref<Attachment>,
    name: 'test.txt',
    type: 'text/plain',
    file: 'test-file' as Ref<Blob>,
    size: 0,
    lastModified: 0,
    attachedTo: '' as Ref<Doc>,
    attachedToClass: '' as Ref<Class<Doc>>,
    collection: '',
    space: '' as Ref<Space>,
    modifiedOn: 0,
    modifiedBy: '' as PersonId,
    _class: '' as Ref<Class<Attachment>>
  })

  let attachmentHandler: AttachmentHandler

  beforeEach(() => {
    attachmentHandler = new AttachmentHandler(
      mockCtx,
      mockWorkspaceLoginInfo,
      mockStorageAdapter,
      mockGmail,
      mockClient
    )
  })

  describe('addAttachement', () => {
    it('should not add attachment if it already exists', async () => {
      const file: AttachedFile = {
        id: 'test-id',
        data: Buffer.from('test-file'),
        name: 'test.txt',
        contentType: 'text/plain',
        size: 100,
        lastModified: Date.now()
      }
      const message = { _id: 'test-message', _class: 'test-class', space: 'test-space' }
      const currentAttachments: Attachment[] = [
        {
          ...getBaseAttachment(),
          name: 'test.txt',
          lastModified: file.lastModified ?? Date.now()
        }
      ]

      await attachmentHandler.addAttachement(file, message, currentAttachments)

      expect(mockStorageAdapter.put).not.toHaveBeenCalled()
      expect(mockClient.addCollection).not.toHaveBeenCalled()
    })

    it('should add new attachment', async () => {
      const file: AttachedFile = {
        id: 'test-id',
        data: Buffer.from('test-file'),
        name: 'test.txt',
        contentType: 'text/plain',
        size: 100,
        lastModified: Date.now()
      }
      const message = { _id: 'test-message', _class: 'test-class', space: 'test-space' }
      const currentAttachments: Attachment[] = []

      await attachmentHandler.addAttachement(file, message, currentAttachments)

      expect(mockStorageAdapter.put).toHaveBeenCalled()
      expect(mockClient.addCollection).toHaveBeenCalledWith(
        attachment.class.Attachment,
        message.space,
        message._id,
        message._class,
        'attachments',
        expect.any(Object)
      )
    })
  })

  describe('getPartFiles', () => {
    it('should return empty array for undefined part', async () => {
      const result = await attachmentHandler.getPartFiles(undefined, 'test-message')
      expect(result).toEqual([])
    })

    it('should get files from attachment', async () => {
      const part: gmail_v1.Schema$MessagePart = {
        filename: 'test.txt',
        mimeType: 'text/plain',
        body: {
          attachmentId: 'test-attachment',
          size: 100
        }
      }
      const mockAttachment = {
        data: 'test-data',
        size: 100
      }
      ;(mockGmail.messages.attachments.get as jest.Mock).mockResolvedValue({ data: mockAttachment })

      const result = await attachmentHandler.getPartFiles(part, 'test-message')

      expect(result).toEqual([
        {
          id: expect.any(String),
          data: expect.any(Buffer),
          name: 'test.txt',
          contentType: 'text/plain',
          size: 100,
          lastModified: expect.any(Number)
        }
      ])
    })

    it('should get files from body data', async () => {
      const part: gmail_v1.Schema$MessagePart = {
        filename: 'test.txt',
        mimeType: 'text/plain',
        body: {
          data: 'test-data',
          size: 100
        }
      }

      const result = await attachmentHandler.getPartFiles(part, 'test-message')

      expect(result).toEqual([
        {
          id: expect.any(String),
          data: expect.any(Buffer),
          name: 'test.txt',
          contentType: 'text/plain',
          size: 100,
          lastModified: expect.any(Number)
        }
      ])
    })
  })

  describe('makeAttachmentsBody', () => {
    it('should create message body with attachments', async () => {
      const message = {
        to: 'test@example.com',
        subject: 'Test Subject',
        content: 'Test Content',
        _id: 'test-message'
      }
      const from = 'from@example.com'
      const attachment: Attachment = {
        ...getBaseAttachment(),
        _id: 'test-attachment' as Ref<Attachment>,
        name: 'test.txt',
        type: 'text/plain',
        file: 'test-file' as Ref<Blob>
      }
      const mockAttachments: Attachment[] = [attachment]
      ;(mockClient.findAll as jest.Mock).mockResolvedValue(mockAttachments)
      ;(mockStorageAdapter.read as jest.Mock).mockResolvedValue([Buffer.from('test-data', 'utf8')])

      const result = await attachmentHandler.makeAttachmentsBody(message, from)
      const decodedResult = decode64(result)

      expect(decodedResult).toContain('Content-Type: multipart/mixed')
      expect(decodedResult).toContain('To: test@example.com')
      expect(decodedResult).toContain('From: from@example.com')
      expect(decodedResult).toContain(`Subject: =?UTF-8?B?${encode64('Test Subject')}?= \n`)
      expect(decodedResult).toContain('Test Content')
      expect(decodedResult).toContain('test.txt')
      expect(decodedResult).toContain('Content-Disposition: attachment; filename="test.txt"')
      expect(decodedResult).toContain('<br><br><p>Sent via <a href="https://huly.io">Huly</a></p>')
    })
  })
})
