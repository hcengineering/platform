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
//

import { type AccountUuid, systemAccountUuid, type WorkspaceUuid } from '@hcengineering/core'
import { extractToken } from '@hcengineering/server-client'
import { type Token } from '@hcengineering/server-token'
import { type NextFunction, type Response } from 'express'

import { HttpError } from '../error'
import { type RequestWithAuth, withAuthorization, withBlob } from '../middleware'

jest.mock('@hcengineering/server-client', () => ({
  extractToken: jest.fn()
}))

const extractTokenMock = extractToken as jest.MockedFunction<typeof extractToken>

const workspaceA = '00000000-0000-4000-8000-00000000000a' as WorkspaceUuid
const workspaceB = '00000000-0000-4000-8000-00000000000b' as WorkspaceUuid
const account = '00000000-0000-4000-8000-0000000000ac' as AccountUuid

function makeToken (token: Partial<Token>): Token {
  const result: Token = { account, workspace: workspaceA, extra: {} }
  return { ...result, ...token }
}

function makeRequest (workspace: string, name: string, token?: Token): RequestWithAuth {
  return { headers: {}, params: { workspace, name }, token } as unknown as RequestWithAuth
}

const res = {} as unknown as Response

describe('withAuthorization', () => {
  beforeEach(() => {
    extractTokenMock.mockReset()
  })

  it('rejects requests without a token', () => {
    extractTokenMock.mockReturnValue(undefined)
    const next = jest.fn() as unknown as NextFunction

    withAuthorization(makeRequest(workspaceA, 'blob'), res, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 401 }))
  })

  it('rejects guest and readonly tokens', () => {
    for (const extra of [{ guest: 'true' }, { readonly: 'true' }]) {
      extractTokenMock.mockReturnValue(makeToken({ extra }))
      const next = jest.fn() as unknown as NextFunction

      withAuthorization(makeRequest(workspaceA, 'blob'), res, next)

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 401 }))
    }
  })

  it('attaches a valid token to the request', () => {
    const token = makeToken({})
    extractTokenMock.mockReturnValue(token)
    const req = makeRequest(workspaceA, 'blob')
    const next = jest.fn() as unknown as NextFunction

    withAuthorization(req, res, next)

    expect(req.token).toBe(token)
    expect(next).toHaveBeenCalledWith()
  })
})

describe('withBlob', () => {
  it('rejects a missing workspace', () => {
    const next = jest.fn() as unknown as NextFunction
    withBlob(makeRequest('', 'blob'), res, next)
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 400 }))
  })

  it('accepts a non-uuid workspace id when the token matches it', () => {
    const workspace = 'not-a-uuid'
    const next = jest.fn() as unknown as NextFunction

    withBlob(makeRequest(workspace, 'blob', makeToken({ workspace: workspace as WorkspaceUuid })), res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('rejects a missing blob name', () => {
    const next = jest.fn() as unknown as NextFunction
    withBlob(makeRequest(workspaceA, ''), res, next)
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 400 }))
  })

  it('rejects a token scoped to another workspace', () => {
    const next = jest.fn() as unknown as NextFunction

    withBlob(makeRequest(workspaceB, 'blob', makeToken({ workspace: workspaceA })), res, next)

    expect(next).toHaveBeenCalledWith(expect.any(HttpError))
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 401 }))
  })

  it('allows a token scoped to the requested workspace', () => {
    const next = jest.fn() as unknown as NextFunction

    withBlob(makeRequest(workspaceA, 'blob', makeToken({ workspace: workspaceA })), res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('allows the system account and admins to access any workspace', () => {
    for (const token of [
      makeToken({ account: systemAccountUuid, workspace: workspaceA }),
      makeToken({ workspace: workspaceA, extra: { admin: 'true' } })
    ]) {
      const next = jest.fn() as unknown as NextFunction
      withBlob(makeRequest(workspaceB, 'blob', token), res, next)
      expect(next).toHaveBeenCalledWith()
    }
  })

  it('rejects requests with no token attached', () => {
    const next = jest.fn() as unknown as NextFunction

    withBlob(makeRequest(workspaceA, 'blob'), res, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 401 }))
  })
})
