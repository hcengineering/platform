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
    constructor (msg: string) {
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

describe('API tokens', () => {
  const mockCtx = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  } as unknown as MeasureContext

  const accountUuid = 'account-uuid' as PersonUuid
  const workspaceUuid = 'workspace-uuid' as WorkspaceUuid
  const validParams = { name: 'test', workspaceUuid, expiryDays: 30 }

  let mockDb: AccountDB

  const methods = getMethods()
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const createApiToken = methods.createApiToken!
  const listApiTokens = methods.listApiTokens!
  const revokeApiToken = methods.revokeApiToken!
  /* eslint-enable @typescript-eslint/no-non-null-assertion */

  const token = (extra: Record<string, any> = {}): void => {
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({ account: accountUuid, workspace: workspaceUuid, extra })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockDb = {
      account: { findOne: jest.fn() },
      workspace: { find: jest.fn().mockResolvedValue([{ uuid: workspaceUuid, name: 'Test' }]) },
      apiToken: {
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn(),
        insertOne: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined)
      },
      getWorkspaceRole: jest.fn().mockResolvedValue(AccountRole.Owner)
    } as unknown as AccountDB
    token()
  })

  describe('createApiToken', () => {
    test('creates a token for a workspace member', async () => {
      const result = await createApiToken(mockCtx, mockDb, null, { id: 1, params: validParams }, 'test-token')

      expect(result.result.id).toBeDefined()
      expect(result.result.token).toContain('mocked-token')
      expect(mockDb.apiToken.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({ accountUuid, workspaceUuid, revoked: false })
      )
    })

    test('embeds the token id so it can be revoked later', async () => {
      await createApiToken(mockCtx, mockDb, null, { id: 1, params: validParams }, 'test-token')

      const [, , extra] = (generateToken as jest.Mock).mock.calls[0]
      const inserted = (mockDb.apiToken.insertOne as jest.Mock).mock.calls[0][0]
      expect(extra).toEqual({ apiTokenId: inserted.id })
    })

    test('rejects a guest', async () => {
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Guest)

      const result = await createApiToken(mockCtx, mockDb, null, { id: 1, params: validParams }, 'test-token')

      expect(result.error).toBeDefined()
      expect(mockDb.apiToken.insertOne).not.toHaveBeenCalled()
    })

    test('rejects a non-member', async () => {
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(null)

      const result = await createApiToken(mockCtx, mockDb, null, { id: 1, params: validParams }, 'test-token')

      expect(result.error).toBeDefined()
      expect(mockDb.apiToken.insertOne).not.toHaveBeenCalled()
    })

    test('rejects a caller presenting an API token', async () => {
      token({ apiTokenId: 'some-token' })

      const result = await createApiToken(mockCtx, mockDb, null, { id: 1, params: validParams }, 'test-token')

      expect(result.error).toBeDefined()
      expect(mockDb.apiToken.insertOne).not.toHaveBeenCalled()
    })

    test.each([
      ['expiry below range', { ...validParams, expiryDays: 0 }],
      ['expiry above range', { ...validParams, expiryDays: 366 }],
      ['expiry not a number', { ...validParams, expiryDays: 'thirty' }],
      ['empty name', { ...validParams, name: '   ' }],
      ['overlong name', { ...validParams, name: 'x'.repeat(256) }],
      ['missing workspace', { name: 'test', expiryDays: 30 }]
    ])('rejects %s', async (_label, params) => {
      const result = await createApiToken(mockCtx, mockDb, null, { id: 1, params }, 'test-token')

      expect(result.error).toBeDefined()
      expect(mockDb.apiToken.insertOne).not.toHaveBeenCalled()
    })

    test('counts only usable tokens toward the limit', async () => {
      const now = Date.now()
      const spent = Array.from({ length: 200 }, (_, i) => ({
        id: `old-${i}`,
        revoked: i % 2 === 0,
        expiresOn: i % 2 === 0 ? now + 86400000 : now - 1
      }))
      ;(mockDb.apiToken.find as jest.Mock).mockResolvedValue(spent)

      const result = await createApiToken(mockCtx, mockDb, null, { id: 1, params: validParams }, 'test-token')

      expect(result.error).toBeUndefined()
      expect(mockDb.apiToken.insertOne).toHaveBeenCalled()
    })

    test('refuses once the limit of usable tokens is reached', async () => {
      const live = Array.from({ length: 100 }, (_, i) => ({
        id: `live-${i}`,
        revoked: false,
        expiresOn: Date.now() + 86400000
      }))
      ;(mockDb.apiToken.find as jest.Mock).mockResolvedValue(live)

      const result = await createApiToken(mockCtx, mockDb, null, { id: 1, params: validParams }, 'test-token')

      expect(result.error).toBeDefined()
      expect(mockDb.apiToken.insertOne).not.toHaveBeenCalled()
    })
  })

  describe('revokeApiToken', () => {
    beforeEach(() => {
      ;(mockDb.apiToken.findOne as jest.Mock).mockResolvedValue({
        id: 'token-1',
        accountUuid,
        workspaceUuid,
        revoked: false
      })
    })

    test('revokes a token the caller owns', async () => {
      const result = await revokeApiToken(
        mockCtx,
        mockDb,
        null,
        { id: 1, params: { tokenId: 'token-1' } },
        'test-token'
      )

      expect(result.error).toBeUndefined()
      expect(mockDb.apiToken.update).toHaveBeenCalledWith({ id: 'token-1' }, { revoked: true })
    })

    test('revokes even after the owner left the workspace', async () => {
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(null)

      const result = await revokeApiToken(
        mockCtx,
        mockDb,
        null,
        { id: 1, params: { tokenId: 'token-1' } },
        'test-token'
      )

      expect(result.error).toBeUndefined()
      expect(mockDb.apiToken.update).toHaveBeenCalledWith({ id: 'token-1' }, { revoked: true })
    })

    test('does not revoke a token belonging to somebody else', async () => {
      ;(mockDb.apiToken.findOne as jest.Mock).mockResolvedValue(null)

      const result = await revokeApiToken(mockCtx, mockDb, null, { id: 1, params: { tokenId: 'other' } }, 'test-token')

      expect(result.error).toBeDefined()
      expect(mockDb.apiToken.update).not.toHaveBeenCalled()
      expect((mockDb.apiToken.findOne as jest.Mock).mock.calls[0][0]).toEqual({ id: 'other', accountUuid })
    })

    test('rejects a caller presenting an API token', async () => {
      token({ apiTokenId: 'token-1' })

      const result = await revokeApiToken(
        mockCtx,
        mockDb,
        null,
        { id: 1, params: { tokenId: 'token-1' } },
        'test-token'
      )

      expect(result.error).toBeDefined()
      expect(mockDb.apiToken.update).not.toHaveBeenCalled()
    })
  })

  describe('listApiTokens', () => {
    test('returns the caller tokens with workspace names resolved', async () => {
      ;(mockDb.apiToken.find as jest.Mock).mockResolvedValue([
        { id: 'token-1', accountUuid, name: 'CI', workspaceUuid, createdOn: 1000, expiresOn: 2000, revoked: false }
      ])

      const result = await listApiTokens(mockCtx, mockDb, null, { id: 1, params: {} }, 'test-token')

      expect(result.result).toEqual([
        expect.objectContaining({ id: 'token-1', name: 'CI', workspaceName: 'Test', revoked: false })
      ])
    })

    test('rejects a caller presenting an API token', async () => {
      token({ apiTokenId: 'token-1' })

      const result = await listApiTokens(mockCtx, mockDb, null, { id: 1, params: {} }, 'test-token')

      expect(result.error).toBeDefined()
      expect(mockDb.apiToken.find).not.toHaveBeenCalled()
    })
  })
})
