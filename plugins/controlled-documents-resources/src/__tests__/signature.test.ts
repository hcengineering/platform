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
import { Analytics } from '@hcengineering/analytics'
import { type AccountUuid, type PersonId, SocialIdType } from '@hcengineering/core'
import platform, { ERROR, OK, PlatformError, Severity, Status } from '@hcengineering/platform'

import { SignatureRequests, loadSignatureConfirmation, verifySignatureCredentials } from '../signature'

jest.mock('@hcengineering/analytics', () => ({ Analytics: { handleError: jest.fn() } }))

jest.mock('../plugin', () => ({
  __esModule: true,
  default: { string: { SignatureAccountMismatch: 'documents:string:SignatureAccountMismatch' } }
}))

const me = 'me-uuid' as AccountUuid
const other = 'other-uuid' as AccountUuid
const handleError = jest.spyOn(Analytics, 'handleError')

beforeEach(() => {
  jest.clearAllMocks()
})

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
    const error = new Error('network')
    const client = {
      checkHasPassword: jest.fn().mockRejectedValue(error),
      getSocialIds: jest.fn().mockResolvedValue([email])
    }

    await expect(loadSignatureConfirmation(client, me)).resolves.toEqual({ method: 'password', email: email.value })
    expect(handleError).toHaveBeenCalledWith(error)
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
    const error = new Error('network')
    const client = mockClient(error)
    const res = await verifySignatureCredentials(client, { method: 'password', email: 'a@b.c', password: 'p' }, me)
    expect(res).toBe(ERROR)
    expect(handleError).toHaveBeenCalledWith(error)
  })
})

function deferred<T> (): { promise: Promise<T>, resolve: (value: T) => void } {
  const control: { resolve: (value: T) => void } = {
    resolve: () => {
      throw new Error('Deferred not initialized')
    }
  }
  const promise = new Promise<T>((resolve) => {
    control.resolve = resolve
  })
  return { promise, resolve: control.resolve }
}

describe('SignatureRequests', () => {
  const credentials = { method: 'otp', email: 'a@b.c', code: '123456' } as const

  it.each(['password', 'otp'] as const)('serializes repeated %s verification and conflicting sends', async (method) => {
    const response = deferred<{ account: AccountUuid }>()
    const login = jest.fn().mockReturnValue(response.promise)
    const validateOtp = jest.fn().mockReturnValue(response.promise)
    const loginOtp = jest.fn()
    const changed = jest.fn()
    const requests = new SignatureRequests({ login, validateOtp, loginOtp }, me, changed)
    const input = method === 'otp' ? credentials : { method, email: 'a@b.c', password: 'p' }
    const first = requests.verify(input)
    expect(requests.pending).toBe('verify')
    await expect(requests.verify(input)).resolves.toBe(false)
    await requests.sendCode('a@b.c')
    expect(loginOtp).not.toHaveBeenCalled()
    expect(method === 'otp' ? validateOtp : login).toHaveBeenCalledTimes(1)
    response.resolve({ account: me })
    await expect(first).resolves.toBe(true)
    expect(requests.pending).toBeUndefined()
    expect(changed).toHaveBeenCalledTimes(2)
  })

  it('blocks resend and verification while a send is pending', async () => {
    const response = deferred<{ sent: boolean, retryOn: number }>()
    const loginOtp = jest.fn().mockReturnValue(response.promise)
    const validateOtp = jest.fn()
    const requests = new SignatureRequests({ ...mockClient(me), loginOtp, validateOtp }, me, () => {})
    const first = requests.sendCode('a@b.c')
    expect(requests.pending).toBe('send')
    await requests.sendCode('a@b.c')
    await expect(requests.verify(credentials)).resolves.toBe(false)
    expect(validateOtp).not.toHaveBeenCalled()
    expect(loginOtp).toHaveBeenCalledTimes(1)
    expect(loginOtp).toHaveBeenCalledWith('a@b.c')
    response.resolve({ sent: true, retryOn: Date.now() + 30000 })
    await first
    expect(requests.pending).toBeUndefined()
    expect(requests.codeRequested).toBe(true)
  })

  it('retains suppression after consumption in another dialog and permits recovery after cooldown', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1000)
    const loginOtp = jest.fn().mockResolvedValue({ sent: true, retryOn: 31000 })
    const validateOtp = jest
      .fn()
      .mockResolvedValueOnce({ account: me })
      .mockRejectedValueOnce(new PlatformError(new Status(Severity.ERROR, platform.status.InvalidOtp, {})))
      .mockResolvedValueOnce({ account: me })
    const client = { ...mockClient(me), validateOtp, loginOtp }
    try {
      const first = new SignatureRequests(client, me, () => {})
      await first.sendCode('a@b.c')
      await expect(first.verify(credentials)).resolves.toBe(true)
      const next = new SignatureRequests(client, me, () => {})
      // The shared server cooldown survives consumption; `sent` also acknowledges suppression.
      await next.sendCode('a@b.c')
      expect(next.retryOn).toBe(31000)
      await next.sendCode('a@b.c')
      expect(loginOtp).toHaveBeenCalledTimes(2)
      await expect(next.verify(credentials)).resolves.toBe(false)
      expect(next.status.code).toBe(platform.status.InvalidOtp)
      now.mockReturnValue(31000)
      loginOtp.mockResolvedValue({ sent: true, retryOn: 61000 })
      await next.sendCode('a@b.c')
      expect(loginOtp).toHaveBeenCalledTimes(3)
      expect(next.retryOn).toBe(61000)
      await expect(next.verify(credentials)).resolves.toBe(true)
    } finally {
      now.mockRestore()
    }
  })

  it('reports a send failure and releases the request guard', async () => {
    const error = new Error('network')
    const loginOtp = jest.fn().mockRejectedValue(error)
    const requests = new SignatureRequests({ ...mockClient(me), loginOtp }, me, () => {})
    await requests.sendCode('a@b.c')
    expect(requests.status).toBe(ERROR)
    expect(requests.pending).toBeUndefined()
    expect(requests.codeRequested).toBe(false)
    expect(handleError).toHaveBeenCalledWith(error)
  })

  it('recovers from an exhausted code only after requesting a new code after cooldown', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1000)
    const exhausted = new Status(Severity.ERROR, platform.status.InvalidOtp, {})
    const loginOtp = jest
      .fn()
      .mockResolvedValueOnce({ sent: true, retryOn: 31000 })
      .mockResolvedValueOnce({ sent: true, retryOn: 61000 })
    // The server budget is covered by the account tests; these responses model the dialog's recovery path.
    const validateOtp = jest
      .fn()
      .mockRejectedValueOnce(new PlatformError(exhausted))
      .mockRejectedValueOnce(new PlatformError(exhausted))
      .mockResolvedValueOnce({ account: me })
    const requests = new SignatureRequests({ ...mockClient(me), loginOtp, validateOtp }, me, () => {})
    try {
      await requests.sendCode('a@b.c')
      await expect(requests.verify(credentials)).resolves.toBe(false)
      expect(requests.status).toBe(exhausted)
      expect(requests.pending).toBeUndefined()
      await requests.sendCode('a@b.c')
      expect(loginOtp).toHaveBeenCalledTimes(1)

      now.mockReturnValue(31000)
      await expect(requests.verify(credentials)).resolves.toBe(false)
      await requests.sendCode('a@b.c')
      expect(loginOtp).toHaveBeenCalledTimes(2)
      expect(requests.status).toBe(OK)
      await expect(requests.verify({ ...credentials, code: '654321' })).resolves.toBe(true)
      expect(validateOtp).toHaveBeenLastCalledWith('a@b.c', '654321')
    } finally {
      now.mockRestore()
    }
  })
})
