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

import { type MeasureContext } from '@hcengineering/core'
import platform, { PlatformError, setMetadata } from '@hcengineering/platform'
import serverToken, { generateToken, TokenError } from '@hcengineering/server-token'

import { assertAdmin } from '../utils'
import { createLifecycleDb } from './fixtures/memoryAccountDb'

setMetadata(serverToken.metadata.Secret, 'test-secret')

const ADMIN = 'a1111111-1111-4111-9111-111111111111' as any
const ctx = { newChild: () => ctx, info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as MeasureContext

describe('assertAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns the caller uuid for an admin session token', async () => {
    const { db } = createLifecycleDb([{ uuid: ADMIN, tokenVersion: 1 }])
    const token = generateToken(ADMIN, undefined, { admin: 'true', token_version: '1' })
    await expect(assertAdmin(ctx, db, token)).resolves.toBe(ADMIN)
  })

  it('rejects a token without the admin claim with Forbidden and logs it', async () => {
    const { db } = createLifecycleDb([{ uuid: ADMIN }])
    const err = await assertAdmin(ctx, db, generateToken(ADMIN)).catch((e) => e)
    expect(err).toBeInstanceOf(PlatformError)
    expect(err.status.code).toBe(platform.status.Forbidden)
    expect(ctx.warn).toHaveBeenCalledWith('Admin method denied: caller has no admin claim', { account: ADMIN })
  })

  it('rejects an API token even if it carried an admin claim', async () => {
    const { db } = createLifecycleDb([{ uuid: ADMIN }])
    const token = generateToken(ADMIN, undefined, { admin: 'true', apiTokenId: 'x' })
    await expect(assertAdmin(ctx, db, token)).rejects.toThrow(PlatformError)
  })

  it('rejects an admin token issued before the last version bump', async () => {
    const { db } = createLifecycleDb([{ uuid: ADMIN, tokenVersion: 2 }])
    const token = generateToken(ADMIN, undefined, { admin: 'true', token_version: '1' })
    await expect(assertAdmin(ctx, db, token)).rejects.toThrow(TokenError)
  })

  it('uses meta.principalAccount instead of reading the account again', async () => {
    const { db } = createLifecycleDb([{ uuid: ADMIN, tokenVersion: 0 }])
    const token = generateToken(ADMIN, undefined, { admin: 'true' })
    await expect(
      assertAdmin(ctx, db, token, { principalAccount: { uuid: ADMIN, tokenVersion: 3, disabledAt: null } })
    ).rejects.toThrow(TokenError)
    expect(db.account.findOne).not.toHaveBeenCalled()
  })
})
