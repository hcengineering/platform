//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { getClient, type SocialId } from '@hcengineering/account-client'
import { type AccountUuid, type PersonId, SocialIdType } from '@hcengineering/core'
import platform, { ERROR, OK, PlatformError, Severity, Status } from '@hcengineering/platform'

import { loadSignatureConfirmation, verifySignatureCredentials } from '../signature'

jest.mock('../plugin', () => ({
  __esModule: true,
  default: { string: { SignatureAccountMismatch: 'documents:string:SignatureAccountMismatch' } }
}))

const me = 'me-uuid' as AccountUuid
const other = 'other-uuid' as AccountUuid

function mockClient (account: AccountUuid | Error): { login: jest.Mock, validateOtp: jest.Mock } {
  const impl = async (): Promise<any> => {
    if (account instanceof Error) throw account
    return { account }
  }
  return { login: jest.fn(impl), validateOtp: jest.fn(impl) }
}

describe('loadSignatureConfirmation', () => {
  const email: SocialId = {
    _id: 'email-id' as PersonId,
    personUuid: me,
    type: SocialIdType.EMAIL,
    value: 'a@b.c',
    key: 'email:a@b.c',
    verifiedOn: 1
  }

  it.each([true, false])('selects the dialog mode when hasPassword is %s', async (hasPassword) => {
    const checkHasPassword = jest.fn().mockResolvedValue(hasPassword)
    const getSocialIds = jest.fn().mockResolvedValue([email])

    await expect(loadSignatureConfirmation({ checkHasPassword, getSocialIds }, me)).resolves.toEqual({
      method: hasPassword ? 'password' : 'otp',
      email: email.value
    })
    expect(checkHasPassword).toHaveBeenCalledTimes(1)
    expect(getSocialIds).toHaveBeenCalledWith()
  })

  it('falls back to password confirmation when the password check fails', async () => {
    const client = {
      checkHasPassword: jest.fn().mockRejectedValue(new Error('network')),
      getSocialIds: jest.fn().mockResolvedValue([email])
    }

    await expect(loadSignatureConfirmation(client, me)).resolves.toEqual({ method: 'password', email: email.value })
  })

  it('waits for the authenticated password check before selecting OTP mode', async () => {
    let resolvePasswordCheck: (hasPassword: boolean) => void = () => {
      throw new Error('Password check has not started')
    }
    const passwordCheck = new Promise<boolean>((resolve) => {
      resolvePasswordCheck = resolve
    })
    const checkHasPassword = jest.fn().mockReturnValue(passwordCheck)
    const getSocialIds = jest.fn().mockResolvedValue([email])
    const confirmation = loadSignatureConfirmation({ checkHasPassword, getSocialIds }, me)

    await Promise.resolve()
    expect(getSocialIds).not.toHaveBeenCalled()
    resolvePasswordCheck(false)
    await expect(confirmation).resolves.toEqual({ method: 'otp', email: email.value })
  })

  const invalidEmails: SocialId[] = [
    { ...email, value: 'unverified@b.c', verifiedOn: undefined },
    { ...email, value: 'zero-timestamp@b.c', verifiedOn: 0 },
    { ...email, value: 'other-account@b.c', personUuid: other },
    { ...email, value: 'deleted@b.c', isDeleted: true },
    { ...email, value: 'google@b.c', type: SocialIdType.GOOGLE },
    { ...email, value: ' ' }
  ]

  it.each(invalidEmails)('uses only a verified active email of the signed-in account (%j)', async (invalidEmail) => {
    const client = {
      checkHasPassword: jest.fn().mockResolvedValue(false),
      getSocialIds: jest.fn().mockResolvedValue([invalidEmail, email])
    }

    await expect(loadSignatureConfirmation(client, me)).resolves.toEqual({ method: 'otp', email: email.value })
  })

  it.each(invalidEmails)(
    'leaves the email empty when no verified account email is available (%j)',
    async (invalidEmail) => {
      const client = {
        checkHasPassword: jest.fn().mockResolvedValue(false),
        getSocialIds: jest.fn().mockResolvedValue([invalidEmail])
      }

      await expect(loadSignatureConfirmation(client, me)).resolves.toEqual({ method: 'otp', email: '' })
    }
  )

  it('preserves password mode for manual email entry when no verified email is available', async () => {
    const client = {
      checkHasPassword: jest.fn().mockResolvedValue(true),
      getSocialIds: jest.fn().mockResolvedValue([])
    }

    await expect(loadSignatureConfirmation(client, me)).resolves.toEqual({ method: 'password', email: '' })
  })

  it('rejects initialization when account identities cannot be loaded', async () => {
    const error = new Error('network')
    const client = {
      checkHasPassword: jest.fn().mockResolvedValue(false),
      getSocialIds: jest.fn().mockRejectedValue(error)
    }

    await expect(loadSignatureConfirmation(client, me)).rejects.toBe(error)
  })
})

describe('verifySignatureCredentials', () => {
  it.each(['password', 'otp'] as const)('preserves the current RPC session after %s confirmation', async (method) => {
    const loginResponse = {
      json: jest.fn().mockResolvedValue({ result: { account: me, token: 'new-login-token' } })
    } as unknown as Response
    const socialIdsResponse = { json: jest.fn().mockResolvedValue({ result: [] }) } as unknown as Response
    const fetch = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(loginResponse)
      .mockResolvedValueOnce(socialIdsResponse)

    try {
      const client = getClient('https://accounts.example.com', 'current-session-token')
      const credentials =
        method === 'otp' ? { method, email: 'a@b.c', code: '123456' } : { method, email: 'a@b.c', password: 'p' }

      expect(await verifySignatureCredentials(client, credentials, me)).toBe(OK)
      await expect(client.getSocialIds()).resolves.toEqual([])
      expect(fetch).toHaveBeenCalledTimes(2)
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        'https://accounts.example.com',
        expect.objectContaining({
          body: JSON.stringify({
            method: method === 'otp' ? 'validateOtp' : 'login',
            params: method === 'otp' ? { email: 'a@b.c', code: '123456' } : { email: 'a@b.c', password: 'p' }
          })
        })
      )
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        'https://accounts.example.com',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer current-session-token' }),
          body: JSON.stringify({ method: 'getSocialIds', params: {} })
        })
      )
    } finally {
      fetch.mockRestore()
    }
  })

  it('discards login tokens for both signature methods', async () => {
    for (const method of ['password', 'otp'] as const) {
      const info = { account: me }
      const readToken = jest.fn(() => 'new-login-token')
      Object.defineProperty(info, 'token', { get: readToken })
      const client = {
        login: jest.fn().mockResolvedValue(info),
        validateOtp: jest.fn().mockResolvedValue(info)
      }
      const credentials =
        method === 'otp' ? { method, email: 'a@b.c', code: '123456' } : { method, email: 'a@b.c', password: 'p' }

      expect(await verifySignatureCredentials(client, credentials, me)).toBe(OK)
      expect(readToken).not.toHaveBeenCalled()
    }
  })

  it('accepts a valid password of the current account', async () => {
    const client = mockClient(me)
    const res = await verifySignatureCredentials(client, { method: 'password', email: 'a@b.c', password: 'p' }, me)
    expect(res).toBe(OK)
    expect(client.login).toHaveBeenCalledWith('a@b.c', 'p')
    expect(client.validateOtp).not.toHaveBeenCalled()
  })

  it('accepts a valid one-time code of the current account', async () => {
    const client = mockClient(me)
    const res = await verifySignatureCredentials(client, { method: 'otp', email: 'a@b.c', code: '123456' }, me)
    expect(res).toBe(OK)
    expect(client.validateOtp).toHaveBeenCalledWith('a@b.c', '123456')
    expect(client.login).not.toHaveBeenCalled()
  })

  it('rejects credentials of another account', async () => {
    for (const method of ['password', 'otp'] as const) {
      const client = mockClient(other)
      const credentials =
        method === 'otp' ? { method, email: 'x@b.c', code: '123456' } : { method, email: 'x@b.c', password: 'p' }
      const res = await verifySignatureCredentials(client, credentials, me)
      expect(res.severity).toBe(Severity.ERROR)
      expect(res.code).toBe('documents:string:SignatureAccountMismatch')
    }
  })

  it('returns the platform error status on failure', async () => {
    const status = new Status(Severity.ERROR, platform.status.InvalidOtp, {})
    const client = mockClient(new PlatformError(status))
    const res = await verifySignatureCredentials(client, { method: 'otp', email: 'a@b.c', code: '000000' }, me)
    expect(res).toBe(status)
  })

  it('returns a generic error on unexpected failure', async () => {
    const client = mockClient(new Error('network'))
    const res = await verifySignatureCredentials(client, { method: 'password', email: 'a@b.c', password: 'p' }, me)
    expect(res).toBe(ERROR)
  })
})
