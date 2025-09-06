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
import { type MeasureContext } from '@hcengineering/core'
import { MailClient } from '../mail'
import { handleSendMail } from '../main'

jest.mock('../mail', () => ({
  MailClient: jest.fn().mockImplementation(() => ({
    sendMessage: jest.fn()
  }))
}))
jest.mock('../config', () => ({
  source: 'noreply@example.com'
}))

describe('handleSendMail', () => {
  let req: Request
  let res: Response
  let sendMailMock: jest.Mock
  let mailClient: MailClient
  let mockCtx: MeasureContext

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    req = {
      body: {
        text: 'Hello, world!',
        subject: 'Test Subject',
        to: 'test@example.com'
      }
    } as Request

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    } as unknown as Response

    mailClient = new MailClient()
    sendMailMock = (mailClient.sendMessage as jest.Mock).mockResolvedValue({})
    mockCtx = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as MeasureContext
  })

  it('should return 400 if text is missing', async () => {
    req.body.text = undefined

    await handleSendMail(new MailClient(), req, res, mockCtx)

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.send).toHaveBeenCalledWith({ err: "'text' and 'html' are missing" })
  })

  it('should return 400 if subject is missing', async () => {
    req.body.subject = undefined

    await handleSendMail(new MailClient(), req, res, mockCtx)

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.send).toHaveBeenCalledWith({ err: "'subject' is missing" })
  })

  it('should return 400 if to is missing', async () => {
    req.body.to = undefined

    await handleSendMail(new MailClient(), req, res, mockCtx)

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.send).toHaveBeenCalledWith({ err: "'to' is missing" })
  })

  it('handles errors thrown by MailClient', async () => {
    sendMailMock.mockRejectedValue(new Error('Email service error'))

    await handleSendMail(new MailClient(), req, res, mockCtx)

    expect(res.send).toHaveBeenCalled() // Check that a response is still sent
  })

  it('should use source from config if from is not provided', async () => {
    await handleSendMail(mailClient, req, res, mockCtx)

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@example.com', // Verify that the default source from config is used
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Hello, world!'
      }),
      mockCtx,
      undefined
    )
  })

  it('should use from if it is provided', async () => {
    req.body.from = 'test.from@example.com'
    await handleSendMail(mailClient, req, res, mockCtx)

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'test.from@example.com', // Verify that the from is used
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Hello, world!'
      }),
      mockCtx,
      undefined
    )
  })

  it('should send to multiple addresses', async () => {
    req.body.to = ['test1@example.com', 'test2@example.com']
    await handleSendMail(mailClient, req, res, mockCtx)

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@example.com',
        to: ['test1@example.com', 'test2@example.com'], // Verify that multiple addresses are passed
        subject: 'Test Subject',
        text: 'Hello, world!'
      }),
      mockCtx,
      undefined
    )
  })

  it('should send email with credentials', async () => {
    req.body.to = ['test1@example.com', 'test2@example.com']
    req.body.password = 'test-password'
    await handleSendMail(mailClient, req, res, mockCtx)

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@example.com',
        to: ['test1@example.com', 'test2@example.com'], // Verify that multiple addresses are passed
        subject: 'Test Subject',
        text: 'Hello, world!'
      }),
      mockCtx,
      'test-password'
    )
  })
})
