// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { getClient } from '@hcengineering/account-client'
import {
  docGuestAccountUuid,
  readOnlyGuestAccountUuid,
  systemAccountUuid,
  AccountRole,
  type AccountUuid,
  type WorkspaceUuid
} from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import platform, { PlatformError, Severity, Status } from '@hcengineering/platform'
import { createAuthenticator, createRecipientResolver } from '../auth'

jest.mock('@hcengineering/account-client', () => ({ getClient: jest.fn() }))
const account = '267c1923-5983-4ab0-ac89-82f481836724' as AccountUuid
const secret = 'marketplace-test-secret'
const getAccountInfo = jest.fn()
const getPerson = jest.fn()
const resolveAccountByEmail = jest.fn()
const authenticate = createAuthenticator('https://accounts.example.test', secret)

beforeEach(() => {
  jest.clearAllMocks()
  const client: Partial<ReturnType<typeof getClient>> = { getAccountInfo, getPerson, resolveAccountByEmail }
  jest.mocked(getClient).mockReturnValue(client as ReturnType<typeof getClient>)
  getAccountInfo.mockResolvedValue({})
  getPerson.mockResolvedValue({ firstName: 'Jane', lastName: 'Doe' })
})

it('verifies the signed global account through the configured authority', async () => {
  const token = generateToken(account, undefined, undefined, secret)
  await expect(authenticate(token)).resolves.toEqual({ uuid: account, name: 'Jane Doe' })
  expect(getClient).toHaveBeenCalledWith('https://accounts.example.test', token)
  expect(getAccountInfo).toHaveBeenCalledWith(account)
})

it('uses the account UUID when the profile name is empty', async () => {
  getPerson.mockResolvedValue({ firstName: '', lastName: '' })
  await expect(authenticate(generateToken(account, undefined, undefined, secret))).resolves.toEqual({
    uuid: account,
    name: account.slice(0, 8)
  })
})

it('rejects invalid signatures and expired tokens before account lookup', async () => {
  await expect(authenticate(generateToken(account, undefined, undefined, 'wrong-secret'))).rejects.toMatchObject({
    status: 401
  })
  await expect(authenticate(generateToken(account, undefined, undefined, secret, { exp: 1 }))).rejects.toMatchObject({
    status: 401
  })
  expect(getClient).not.toHaveBeenCalled()
})

it.each([systemAccountUuid, readOnlyGuestAccountUuid, docGuestAccountUuid])(
  'rejects a special account %s',
  async (uuid) => {
    await expect(authenticate(generateToken(uuid, undefined, undefined, secret))).rejects.toMatchObject({ status: 401 })
    expect(getClient).not.toHaveBeenCalled()
  }
)

it.each<Record<string, string>>([{ service: 'workspace' }, { apiKey: 'key' }, { readonly: 'true' }, { guest: 'true' }])(
  'rejects non-account credentials %j',
  async (extra) => {
    await expect(authenticate(generateToken(account, undefined, extra, secret))).rejects.toMatchObject({ status: 401 })
    expect(getClient).not.toHaveBeenCalled()
  }
)

it('fails closed if the account authority cannot verify the account', async () => {
  getAccountInfo.mockRejectedValueOnce(
    new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {}))
  )
  await expect(authenticate(generateToken(account, undefined, undefined, secret))).rejects.toMatchObject({
    status: 401
  })
  expect(getPerson).not.toHaveBeenCalled()
})

it('reports account-service outages without treating them as a new identity', async () => {
  getAccountInfo.mockRejectedValueOnce(new Error('Connection failed'))
  await expect(authenticate(generateToken(account, undefined, undefined, secret))).rejects.toMatchObject({
    status: 503
  })
})

it('rejects a permission grant even when signed by the same authority', async () => {
  const token = generateToken(account, undefined, undefined, secret, {
    grant: { workspace: 'ac842ec2-bd9e-4f51-86ef-ce1393386348' as WorkspaceUuid, role: AccountRole.User },
    sub: account
  })
  await expect(authenticate(token)).rejects.toMatchObject({ status: 401 })
  expect(getClient).not.toHaveBeenCalled()
})

describe('verified recipient resolution', () => {
  const resolve = createRecipientResolver('https://accounts.example.test')

  it('uses the configured authority and registered verified email resolution', async () => {
    resolveAccountByEmail.mockResolvedValueOnce(account)
    await expect(resolve('owner-token', 'recipient@example.com')).resolves.toBe(account)
    expect(getClient).toHaveBeenCalledWith('https://accounts.example.test', 'owner-token')
    expect(resolveAccountByEmail).toHaveBeenCalledWith('recipient@example.com')
  })

  it.each([undefined, systemAccountUuid, readOnlyGuestAccountUuid, docGuestAccountUuid])(
    'rejects nonexistent or special recipient %s',
    async (recipient) => {
      resolveAccountByEmail.mockResolvedValueOnce(recipient)
      await expect(resolve('owner-token', 'recipient@example.com')).rejects.toMatchObject({ status: 404 })
    }
  )

  it('fails closed on authority errors and outages', async () => {
    resolveAccountByEmail.mockRejectedValueOnce(
      new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    )
    await expect(resolve('owner-token', 'recipient@example.com')).rejects.toMatchObject({ status: 400 })
    resolveAccountByEmail.mockRejectedValueOnce(new Error('offline'))
    await expect(resolve('owner-token', 'recipient@example.com')).rejects.toMatchObject({ status: 503 })
  })
})
