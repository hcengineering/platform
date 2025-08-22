//
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
//

import fs from 'fs/promises'
import path from 'path'
import { Request, Response } from 'express'
import { MeasureContext } from '@hcengineering/core'
import { createMessages } from '@hcengineering/mail-common'
import { createRestTxOperations } from '@hcengineering/api-client'

import { handleMtaHook } from '../handlerMta'
import * as client from '../client'
import { type MtaMessage } from '../types'

// Mock only the functions that need to be mocked for testing
jest.mock('@hcengineering/mail-common', () => {
  const actualMailCommon = jest.requireActual('@hcengineering/mail-common')
  return {
    ...actualMailCommon,
    createMessages: jest.fn(),
    getProducer: jest.fn().mockReturnValue({})
  }
})

jest.mock('../client', () => ({
  mailServiceToken: 'mock-token',
  baseConfig: {
    AccountsURL: 'http://accounts.test',
    KvsUrl: 'http://kvs.test',
    StorageConfig: 'test-storage-config'
  },
  kvsClient: {}
}))

jest.mock(
  '../config',
  () => ({
    hookToken: 'test-hook-token',
    ignoredAddresses: ['ignored@example.com'],
    storageConfig: 'test-storage-config',
    workspaceUrl: 'test-workspace'
  }),
  { virtual: true }
)

// Mock workspace login info
const mockLoginInfo = {
  endpoint: 'wss://test-endpoint.com',
  workspace: 'test-workspace',
  token: 'test-token'
}

jest.mock('@hcengineering/account-client', () => ({
  getClient: jest.fn().mockImplementation(() => ({
    selectWorkspace: jest.fn().mockResolvedValue(mockLoginInfo),
    getLoginInfoByToken: jest.fn().mockResolvedValue(mockLoginInfo),
    getCurrentUser: jest.fn().mockResolvedValue({
      _id: 'test-account-id',
      email: 'test@example.com'
    }),
    getWorkspaceInfo: jest.fn().mockResolvedValue({
      title: 'Test Workspace',
      productId: 'test-product-id'
    })
  }))
}))

// Mock transaction operations
const mockTxOperations = {
  findOne: jest.fn().mockResolvedValue(null),
  findAll: jest.fn().mockResolvedValue([]),
  createDoc: jest.fn().mockResolvedValue({ _id: 'new-doc-id' }),
  updateDoc: jest.fn().mockResolvedValue({}),
  tx: jest.fn().mockResolvedValue({}),
  txUpdateDoc: jest.fn().mockResolvedValue({}),
  add: jest.fn().mockResolvedValue({}),
  remove: jest.fn().mockResolvedValue({}),
  update: jest.fn().mockResolvedValue({})
}

jest.mock('@hcengineering/api-client', () => ({
  createRestTxOperations: jest.fn().mockImplementation(() => mockTxOperations)
}))

// Mock Date.now to return consistent timestamp for tests
const MOCK_TIMESTAMP = 1620000000000
jest.spyOn(Date, 'now').mockImplementation(() => MOCK_TIMESTAMP)

describe('handleMtaHook', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockCtx: MeasureContext
  let mockSend: jest.Mock
  let mockStatus: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock response
    mockSend = jest.fn().mockReturnThis()
    mockStatus = jest.fn().mockReturnValue({ send: mockSend })
    mockRes = {
      status: mockStatus,
      send: mockSend
    }

    // Setup mock context
    mockCtx = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    } as unknown as MeasureContext
  })

  it('should validate hook token correctly', async () => {
    // Mock request with invalid token
    mockReq = {
      headers: { 'x-hook-token': 'invalid-token' },
      body: createValidMtaMessage()
    }

    await handleMtaHook(mockReq as Request, mockRes as Response, mockCtx)

    // Should still return 200 even with error
    expect(mockStatus).toHaveBeenCalledWith(200)
    expect(mockSend).toHaveBeenCalledWith({ action: 'accept' })

    // Should log error
    expect(mockCtx.error).toHaveBeenCalledWith('mta-hook', {
      error: expect.any(Error)
    })

    // Should not process the message
    expect(createMessages).not.toHaveBeenCalled()
  })

  it('should skip processing for ignored addresses', async () => {
    // Mock request with ignored address
    mockReq = {
      headers: { 'x-hook-token': 'test-hook-token' },
      body: createValidMtaMessage('ignored@example.com')
    }

    await handleMtaHook(mockReq as Request, mockRes as Response, mockCtx)

    // Should return 200
    expect(mockStatus).toHaveBeenCalledWith(200)
    expect(mockSend).toHaveBeenCalledWith({ action: 'accept' })

    // Should not process the message
    expect(createMessages).not.toHaveBeenCalled()
  })

  it('should process plain text email correctly', async () => {
    // Mock request with plain text content
    mockReq = {
      headers: { 'x-hook-token': 'test-hook-token' },
      body: createValidMtaMessage('sender@example.com', ['recipient@example.com'], {
        subject: 'Test Subject',
        contentType: 'text/plain; charset=utf-8',
        content: 'Hello, this is a test email'
      })
    }

    await handleMtaHook(mockReq as Request, mockRes as Response, mockCtx)

    // Should return 200
    expect(mockStatus).toHaveBeenCalledWith(200)
    expect(mockSend).toHaveBeenCalledWith({ action: 'accept' })

    // Should process the message with the new signature order
    expect(createMessages).toHaveBeenCalledWith(
      client.baseConfig,
      mockCtx,
      mockTxOperations, // This should be the TxOperations mock, not kvsClient
      {}, // This should be the KeyValueClient mock
      {},
      client.mailServiceToken,
      mockLoginInfo, // Added workspace login info
      expect.objectContaining({
        mailId: expect.any(String),
        from: { email: 'sender@example.com', firstName: 'sender', lastName: 'example.com' },
        to: [{ email: 'recipient@example.com', firstName: 'recipient', lastName: 'example.com' }],
        subject: 'Test Subject',
        content: 'Hello, this is a test email',
        incoming: true
      }),
      [] // attachments
    )

    // And verify createRestTxOperations was called with the transformed URL
    expect(createRestTxOperations).toHaveBeenCalledWith(
      'https://test-endpoint.com', // Transformed from wss://
      'test-workspace',
      'test-token'
    )
  })

  it('should extract names from From/To headers correctly', async () => {
    // Mock request with named contacts
    mockReq = {
      headers: { 'x-hook-token': 'test-hook-token' },
      body: createValidMtaMessage('sender@example.com', ['recipient@example.com'], {
        subject: 'Test Subject',
        contentType: 'text/plain; charset=utf-8',
        content: 'Hello, this is a test email',
        additionalHeaders: [
          ['From', 'John Doe <sender@example.com>'],
          ['To', 'Jane Smith <recipient@example.com>']
        ]
      })
    }

    await handleMtaHook(mockReq as Request, mockRes as Response, mockCtx)

    // Should process the message with the correct names and parameter order
    expect(createMessages).toHaveBeenCalledWith(
      client.baseConfig,
      mockCtx,
      mockTxOperations,
      {},
      {},
      client.mailServiceToken,
      mockLoginInfo,
      expect.objectContaining({
        from: { email: 'sender@example.com', firstName: 'John', lastName: 'Doe' },
        to: [{ email: 'recipient@example.com', firstName: 'Jane', lastName: 'Smith' }]
      }),
      []
    )
  })

  it('should handle strip email tags correctly', async () => {
    // Mock request with tagged email
    mockReq = {
      headers: { 'x-hook-token': 'test-hook-token' },
      body: createValidMtaMessage('sender+tag@example.com', ['recipient+tag@example.com'])
    }

    await handleMtaHook(mockReq as Request, mockRes as Response, mockCtx)

    // Should process the message with stripped tags in the correct parameter order
    expect(createMessages).toHaveBeenCalledWith(
      client.baseConfig,
      mockCtx,
      mockTxOperations,
      {},
      {},
      client.mailServiceToken,
      mockLoginInfo,
      expect.objectContaining({
        from: { email: 'sender+tag@example.com', firstName: 'sender', lastName: 'example.com' },
        to: [{ email: 'recipient@example.com', firstName: 'recipient', lastName: 'example.com' }]
      }),
      []
    )
  })

  it('should use Message-ID when available', async () => {
    const messageId = '<test-message-id@example.com>'

    // Mock request with Message-ID
    mockReq = {
      headers: { 'x-hook-token': 'test-hook-token' },
      body: createValidMtaMessage('sender@example.com', ['recipient@example.com'], {
        additionalHeaders: [['Message-ID', messageId]]
      })
    }

    await handleMtaHook(mockReq as Request, mockRes as Response, mockCtx)

    // Should use the provided Message-ID with the correct parameter order
    expect(createMessages).toHaveBeenCalledWith(
      client.baseConfig,
      mockCtx,
      mockTxOperations,
      {},
      {},
      client.mailServiceToken,
      mockLoginInfo,
      expect.objectContaining({
        mailId: messageId
      }),
      []
    )
  })

  it('should generate mailId when Message-ID is missing', async () => {
    // Mock request without Message-ID
    mockReq = {
      headers: { 'x-hook-token': 'test-hook-token' },
      body: createValidMtaMessage()
    }

    await handleMtaHook(mockReq as Request, mockRes as Response, mockCtx)

    // Should generate an ID with the correct parameter order
    expect(createMessages).toHaveBeenCalledWith(
      client.baseConfig,
      mockCtx,
      mockTxOperations,
      {},
      {},
      client.mailServiceToken,
      mockLoginInfo,
      expect.objectContaining({
        mailId: expect.any(String)
      }),
      []
    )
  })

  it('should handle In-Reply-To header correctly', async () => {
    const inReplyTo = '<parent-message-id@example.com>'

    // Mock request with In-Reply-To
    mockReq = {
      headers: { 'x-hook-token': 'test-hook-token' },
      body: createValidMtaMessage('sender@example.com', ['recipient@example.com'], {
        additionalHeaders: [['In-Reply-To', inReplyTo]]
      })
    }

    await handleMtaHook(mockReq as Request, mockRes as Response, mockCtx)

    // Should include the replyTo field with the correct parameter order
    expect(createMessages).toHaveBeenCalledWith(
      client.baseConfig,
      mockCtx,
      mockTxOperations,
      {},
      {},
      client.mailServiceToken,
      mockLoginInfo,
      expect.objectContaining({
        replyTo: inReplyTo
      }),
      []
    )
  })

  it('should handle errors gracefully and return 200', async () => {
    // Mock createMessages to throw an error
    ;(createMessages as jest.Mock).mockRejectedValueOnce(new Error('Test error'))

    mockReq = {
      headers: { 'x-hook-token': 'test-hook-token' },
      body: createValidMtaMessage()
    }

    await handleMtaHook(mockReq as Request, mockRes as Response, mockCtx)

    // Should log the error
    expect(mockCtx.error).toHaveBeenCalledWith('mta-hook', {
      error: expect.any(Error)
    })

    // Should still return 200
    expect(mockStatus).toHaveBeenCalledWith(200)
    expect(mockSend).toHaveBeenCalledWith({ action: 'accept' })
  })

  // Helper functions
  function createValidMtaMessage (
    fromAddress = 'sender@example.com',
    toAddresses = ['recipient@example.com'],
    options: any = {}
  ): MtaMessage {
    const {
      subject = 'Test Subject',
      contentType = 'text/plain; charset=utf-8',
      content = 'Hello, this is a test email',
      additionalHeaders = []
    } = options

    return {
      envelope: {
        from: { address: fromAddress },
        to: toAddresses.map((address) => ({ address }))
      },
      message: {
        headers: [['Content-Type', contentType], ['Subject', subject], ...additionalHeaders],
        contents: content
      }
    }
  }

  it('should process HTML email correctly', async () => {
    // Mock request with HTML content
    const htmlContent = '<html><body><h1>Hello</h1><p>This is an <b>HTML</b> test email</p></body></html>'
    const expectedContent = `Hello
=====

This is an **HTML** test email`
    mockReq = {
      headers: { 'x-hook-token': 'test-hook-token' },
      body: createValidMtaMessage('sender@example.com', ['recipient@example.com'], {
        subject: 'HTML Test Subject',
        contentType: 'text/html; charset=utf-8',
        content: htmlContent
      })
    }

    await handleMtaHook(mockReq as Request, mockRes as Response, mockCtx)

    // Should return 200
    expect(mockStatus).toHaveBeenCalledWith(200)
    expect(mockSend).toHaveBeenCalledWith({ action: 'accept' })

    // Should process the message with both HTML and text content
    expect(createMessages).toHaveBeenCalledWith(
      client.baseConfig,
      mockCtx,
      mockTxOperations,
      {},
      {},
      client.mailServiceToken,
      mockLoginInfo,
      expect.objectContaining({
        mailId: expect.any(String),
        from: { email: 'sender@example.com', firstName: 'sender', lastName: 'example.com' },
        to: [{ email: 'recipient@example.com', firstName: 'recipient', lastName: 'example.com' }],
        subject: 'HTML Test Subject',
        content: expectedContent,
        incoming: true
      }),
      [] // attachments
    )
  })

  it('should process email plain/text content header', async () => {
    // Create a multipart email with both text and HTML
    const textContent = 'This is the plain text version'

    // Mock message with multipart content by setting multiple headers and contents
    const message = {
      envelope: {
        from: { address: 'sender@example.com' },
        to: [{ address: 'recipient@example.com' }]
      },
      message: {
        headers: [
          ['Content-Type', 'multipart/alternative; boundary="boundary-string"'],
          ['Subject', 'Test Email'],
          ['From', 'Sender <sender@example.com>'],
          ['To', 'Recipient <recipient@example.com>']
        ],
        contents: `Content-Type: text/plain; charset=utf-8 \r\n${textContent}`
      }
    }

    mockReq = {
      headers: { 'x-hook-token': 'test-hook-token' },
      body: message
    }

    await handleMtaHook(mockReq as Request, mockRes as Response, mockCtx)

    // Should return 200
    expect(mockStatus).toHaveBeenCalledWith(200)
    expect(mockSend).toHaveBeenCalledWith({ action: 'accept' })

    // Should process the message with both content types
    expect(createMessages).toHaveBeenCalledWith(
      client.baseConfig,
      mockCtx,
      mockTxOperations,
      {},
      {},
      client.mailServiceToken,
      mockLoginInfo,
      expect.objectContaining({
        mailId: expect.any(String),
        from: { email: 'sender@example.com', firstName: 'Sender', lastName: 'example.com' },
        to: [{ email: 'recipient@example.com', firstName: 'Recipient', lastName: 'example.com' }],
        subject: 'Test Email',
        content: textContent,
        incoming: true
      }),
      []
    )
  })

  it('should decode encoded content in email', async () => {
    // Create a multipart email with both text and HTML
    const base64MessageData = await fs.readFile(path.join(__dirname, '__mocks__/base64Message.json'), 'utf-8')
    const mtaMessage: MtaMessage = JSON.parse(base64MessageData)

    mockReq = {
      headers: { 'x-hook-token': 'test-hook-token' },
      body: mtaMessage
    }

    await handleMtaHook(mockReq as Request, mockRes as Response, mockCtx)

    // Should return 200
    expect(mockStatus).toHaveBeenCalledWith(200)
    expect(mockSend).toHaveBeenCalledWith({ action: 'accept' })

    // Should process the message with both content types
    expect(createMessages).toHaveBeenCalledWith(
      client.baseConfig,
      mockCtx,
      mockTxOperations,
      {},
      {},
      client.mailServiceToken,
      mockLoginInfo,
      expect.objectContaining({
        mailId: expect.any(String),
        from: { email: 'example1@test.com', firstName: 'Example', lastName: 'User1' },
        to: [{ email: 'recipient2@example.com', firstName: 'Example', lastName: 'Recipient2' }],
        subject: 'This is encoded email subject',
        content: 'Test encoded email content',
        incoming: true
      }),
      []
    )
  })
})
