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

import type { AccountUuid } from '@hcengineering/core'
import platform, { ERROR, OK, PlatformError, Severity, Status } from '@hcengineering/platform'

import { verifySignatureCredentials } from '../signature'

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

describe('verifySignatureCredentials', () => {
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
