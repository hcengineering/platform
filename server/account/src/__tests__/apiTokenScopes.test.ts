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

import { AccountRole, type MeasureContext, type PersonUuid, type WorkspaceUuid } from '@hcengineering/core'
import { decodeTokenVerbose, generateToken } from '@hcengineering/server-token'

import { type AccountDB } from '../types'
import { getMethods } from '../operations'

jest.mock('@hcengineering/platform', () => {
  const actual = jest.requireActual('@hcengineering/platform')
  return {
    ...actual,
    ...actual.default,
    getMetadata: jest.fn(),
    translate: jest.fn((id, params) => `${id} << ${JSON.stringify(params)}`)
  }
})

jest.mock('@hcengineering/server-token', () => {
  class TokenError extends Error {
    constructor(msg: string) {
      super(msg)
      this.name = 'TokenError'
    }
  }
  return {
    decodeTokenVerbose: jest.fn(),
    decodeToken: jest.fn(),
    TokenError,
    generateToken: jest.fn().mockImplementation((account: string, workspace: string, extra: any) => {
      return `mocked-token-${account}-${workspace}-${JSON.stringify(extra)}`
    })
  }
})

describe('createApiToken scopes', () => {
  const mockCtx = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  } as unknown as MeasureContext

  const accountUuid = 'account-uuid' as PersonUuid
  const workspaceUuid = 'workspace-uuid' as WorkspaceUuid

  const mockDb = {
    account: { findOne: jest.fn() },
    workspace: { find: jest.fn().mockResolvedValue([]) },
    apiToken: {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      update: jest.fn()
    },
    getWorkspaceRole: jest.fn()
  } as unknown as AccountDB

  const methods = getMethods()
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const createApiToken = methods.createApiToken!

  beforeEach(() => {
    jest.clearAllMocks()
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      account: accountUuid,
      workspace: workspaceUuid,
      extra: {}
    })
    ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Owner)
    ;(mockDb.apiToken.find as jest.Mock).mockResolvedValue([])
    ;(mockDb.apiToken.insertOne as jest.Mock).mockResolvedValue(undefined)
  })

  test('creates token with valid scopes', async () => {
    const result = await createApiToken(
      mockCtx,
      mockDb,
      null,
      { id: 1, params: { name: 'test', workspaceUuid, expiryDays: 30, scopes: ['read:*'] } },
      'test-token'
    )

    expect(result.result).toBeDefined()
    expect(result.result.id).toBeDefined()
    expect(result.result.token).toContain('mocked-token')

    // Verify scopes were passed to generateToken
    expect(generateToken).toHaveBeenCalledWith(
      accountUuid,
      workspaceUuid,
      expect.objectContaining({ scopes: '["read:*"]' }),
      undefined,
      expect.any(Object)
    )

    // Verify scopes were persisted to DB
    expect(mockDb.apiToken.insertOne).toHaveBeenCalledWith(expect.objectContaining({ scopes: ['read:*'] }))
  })

  test('creates token with multiple valid scopes', async () => {
    const result = await createApiToken(
      mockCtx,
      mockDb,
      null,
      { id: 1, params: { name: 'test', workspaceUuid, expiryDays: 30, scopes: ['read:*', 'write:*', 'delete:*'] } },
      'test-token'
    )

    expect(result.result).toBeDefined()
    expect(mockDb.apiToken.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ scopes: ['read:*', 'write:*', 'delete:*'] })
    )
  })

  test('creates token without scopes (full access, backward compat)', async () => {
    const result = await createApiToken(
      mockCtx,
      mockDb,
      null,
      { id: 1, params: { name: 'test', workspaceUuid, expiryDays: 30 } },
      'test-token'
    )

    expect(result.result).toBeDefined()

    // No scopes in JWT extra
    expect(generateToken).toHaveBeenCalledWith(
      accountUuid,
      workspaceUuid,
      expect.not.objectContaining({ scopes: expect.anything() }),
      undefined,
      expect.any(Object)
    )

    // scopes field should be undefined in DB insert
    const insertArg = (mockDb.apiToken.insertOne as jest.Mock).mock.calls[0][0]
    expect(insertArg.scopes).toBeUndefined()
  })

  test('rejects invalid scope format', async () => {
    const result = await createApiToken(
      mockCtx,
      mockDb,
      null,
      { id: 1, params: { name: 'test', workspaceUuid, expiryDays: 30, scopes: ['invalid'] } },
      'test-token'
    )

    expect(result.error).toBeDefined()
  })

  test('rejects empty scopes array', async () => {
    const result = await createApiToken(
      mockCtx,
      mockDb,
      null,
      { id: 1, params: { name: 'test', workspaceUuid, expiryDays: 30, scopes: [] } },
      'test-token'
    )

    expect(result.error).toBeDefined()
  })

  test('rejects domain-scoped scopes in Phase 1', async () => {
    const result = await createApiToken(
      mockCtx,
      mockDb,
      null,
      { id: 1, params: { name: 'test', workspaceUuid, expiryDays: 30, scopes: ['read:tracker'] } },
      'test-token'
    )

    expect(result.error).toBeDefined()
  })
})

describe('listApiTokens includes scopes', () => {
  const mockCtx = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  } as unknown as MeasureContext

  const accountUuid = 'account-uuid' as PersonUuid
  const workspaceUuid = 'workspace-uuid' as WorkspaceUuid

  const mockDb = {
    workspace: {
      find: jest.fn().mockResolvedValue([{ uuid: workspaceUuid, name: 'Test' }])
    },
    apiToken: {
      find: jest.fn().mockResolvedValue([
        {
          id: 'token-1',
          accountUuid,
          name: 'Read Only',
          workspaceUuid,
          createdOn: 1000,
          expiresOn: 2000,
          revoked: false,
          scopes: ['read:*']
        },
        {
          id: 'token-2',
          accountUuid,
          name: 'Legacy',
          workspaceUuid,
          createdOn: 1000,
          expiresOn: 2000,
          revoked: false
          // no scopes field (legacy)
        }
      ])
    }
  } as unknown as AccountDB

  const methods = getMethods()
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const listApiTokens = methods.listApiTokens!

  beforeEach(() => {
    jest.clearAllMocks()
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      account: accountUuid,
      workspace: workspaceUuid,
      extra: {}
    })
  })

  test('returns scopes for scoped tokens and undefined for legacy', async () => {
    const result = await listApiTokens(mockCtx, mockDb, null, { id: 1, params: {} }, 'test-token')

    const tokens = result.result
    expect(tokens).toHaveLength(2)
    expect(tokens[0].scopes).toEqual(['read:*'])
    expect(tokens[1].scopes).toBeUndefined()
  })
})
