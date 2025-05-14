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

import { Request, Response } from 'express'
import { MeasureContext } from '@hcengineering/core'
import { createMessages } from '@hcengineering/mail-common'
import { type MtaMessage, handleMtaHook } from '../handlerMta'
import * as client from '../client'

// Mock dependencies
jest.mock('@hcengineering/mail-common', () => ({
  createMessages: jest.fn()
}))

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
    storageConfig: 'test-storage-config'
  }),
  { virtual: true }
)

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

    // Should process the message
    expect(createMessages).toHaveBeenCalledWith(
      client.baseConfig,
      mockCtx,
      client.kvsClient,
      client.mailServiceToken,
      expect.objectContaining({
        mailId: expect.any(String),
        from: { email: 'sender@example.com', firstName: 'sender', lastName: 'example.com' },
        to: [{ email: 'recipient@example.com', firstName: 'recipient', lastName: 'example.com' }],
        subject: 'Test Subject',
        content: 'Hello, this is a test email',
        incoming: true,
        modifiedOn: MOCK_TIMESTAMP,
        sendOn: MOCK_TIMESTAMP
      }),
      []
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

    // Should process the message with correct names
    expect(createMessages).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        from: { email: 'sender@example.com', firstName: 'John', lastName: 'Doe' },
        to: [{ email: 'recipient@example.com', firstName: 'Jane', lastName: 'Smith' }]
      }),
      expect.anything()
    )
  })

  it('should handle strip email tags correctly', async () => {
    // Mock request with tagged email
    mockReq = {
      headers: { 'x-hook-token': 'test-hook-token' },
      body: createValidMtaMessage('sender+tag@example.com', ['recipient+tag@example.com'])
    }

    await handleMtaHook(mockReq as Request, mockRes as Response, mockCtx)

    // Should process the message with stripped tags
    expect(createMessages).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        from: { email: 'sender+tag@example.com', firstName: 'sender', lastName: 'example.com' },
        to: [{ email: 'recipient@example.com', firstName: 'recipient', lastName: 'example.com' }]
      }),
      expect.anything()
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

    // Should use the provided Message-ID
    expect(createMessages).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        mailId: messageId
      }),
      expect.anything()
    )
  })

  it('should generate mailId when Message-ID is missing', async () => {
    // Mock request without Message-ID
    mockReq = {
      headers: { 'x-hook-token': 'test-hook-token' },
      body: createValidMtaMessage()
    }

    await handleMtaHook(mockReq as Request, mockRes as Response, mockCtx)

    // Should generate an ID
    expect(createMessages).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        mailId: expect.any(String)
      }),
      expect.anything()
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

    // Should include the replyTo field
    expect(createMessages).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        replyTo: inReplyTo
      }),
      expect.anything()
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
})
