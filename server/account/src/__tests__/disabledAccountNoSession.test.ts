//
// Copyright © 2026 Hardcore Engineering Inc.
//

import { AccountRole, type MeasureContext, type WorkspaceUuid } from '@hcengineering/core'
import { PlatformError, setMetadata } from '@hcengineering/platform'
import serverToken, { generateToken } from '@hcengineering/server-token'

import { getLoginWithWorkspaceInfo } from '../operations'
import { accountPlugin } from '../plugin'
import type { AccountDB } from '../types'

setMetadata(serverToken.metadata.Secret, 'test-secret')
// A single transactor so getEndpointInfo()/getWorkspaceEndpoint() resolve — this
// lets the pre-fix code path build a full LoginInfoWithWorkspaces (the leak we test).
setMetadata(accountPlugin.metadata.Transactors, 'http://tx:3000;http://tx:3000;')

const TARGET = 'a2222222-2222-4222-9222-222222222222' as any
const WS = 'b3333333-3333-4333-9333-333333333333' as WorkspaceUuid

const ctx = {
  newChild: () => ctx,
  info: () => {},
  warn: () => {},
  error: () => {},
  measure: () => {}
} as unknown as MeasureContext

// A disabled account that still holds a valid, never-expiring workspace JWT.
function mockDisabledDb (): AccountDB {
  const account = { uuid: TARGET, tokenVersion: 1, disabledAt: 1_700_000_000_000 }
  return {
    account: {
      findOne: async (q: any) => (q.uuid === TARGET ? account : null)
    },
    socialId: {
      find: async () => [{ _id: 'sid-1', personUuid: TARGET, type: 'email', value: 'x@example.com', verifiedOn: 1 }]
    },
    person: {
      findOne: async () => ({ uuid: TARGET, firstName: 'Dis', lastName: 'Abled' })
    },
    workspaceStatus: {
      update: async () => undefined
    },
    getAccountWorkspaces: async () => [
      {
        uuid: WS,
        url: 'ws-url',
        dataId: undefined,
        region: undefined,
        branding: null,
        passwordAgingRule: undefined,
        status: {
          mode: 'active',
          versionMajor: 0,
          versionMinor: 0,
          versionPatch: 0,
          processingProgress: 100
        }
      }
    ],
    getWorkspaceRoles: async () => new Map([[WS, AccountRole.Owner]])
  } as unknown as AccountDB
}

describe('getLoginWithWorkspaceInfo — disabled account transactor gate (C2)', () => {
  it('rejects a disabled account holding a never-expiring workspace token with Unauthorized', async () => {
    const db = mockDisabledDb()
    // Token issued before disable (no token_version claim). Workspace JWTs have no exp,
    // so without the transactor-side disable check the account keeps full access.
    const staleToken = generateToken(TARGET, WS, {})

    await expect(getLoginWithWorkspaceInfo(ctx, db, null, staleToken)).rejects.toThrow(PlatformError)
  })
})
