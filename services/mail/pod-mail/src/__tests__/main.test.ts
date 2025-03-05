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
import { MailClient } from '../mail'
import { handleSendMail } from '../main'

jest.mock('../mail', () => ({
  MailClient: jest.fn().mockImplementation(() => ({
    sendMessage: jest.fn()
  }))
}))
jest.mock('../config', () => ({}))

describe('handleSendMail', () => {
  let req: Request
  let res: Response
  let sendMailMock: jest.Mock

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

    sendMailMock = (new MailClient().sendMessage as jest.Mock).mockResolvedValue({})
  })

  it('should return 400 if text is missing', async () => {
    req.body.text = undefined

    await handleSendMail(new MailClient(), req, res)

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.send).toHaveBeenCalledWith({ err: "'text' is missing" })
  })

  it('should return 400 if subject is missing', async () => {
    req.body.subject = undefined

    await handleSendMail(new MailClient(), req, res)

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.send).toHaveBeenCalledWith({ err: "'subject' is missing" })
  })

  it('should return 400 if to is missing', async () => {
    req.body.to = undefined

    await handleSendMail(new MailClient(), req, res)

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.send).toHaveBeenCalledWith({ err: "'to' is missing" })
  })

  it('handles errors thrown by MailClient', async () => {
    sendMailMock.mockRejectedValue(new Error('Email service error'))

    await handleSendMail(new MailClient(), req, res)

    expect(res.send).toHaveBeenCalled() // Check that a response is still sent
  })
})
