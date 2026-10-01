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

import { type MeasureContext, systemAccountUuid } from '@hcengineering/core'
import { touchLastActivity } from '../utils'
import type { AccountDB } from '../types'

const TEST_UUID = '22222222-2222-4222-9222-222222222222' as any

describe('touchLastActivity', () => {
  let updatedTo: number | null = null
  const ctx = { warn: jest.fn() } as unknown as MeasureContext
  const mockDb = (lastActivityAt: number | null): AccountDB =>
    ({
      account: {
        findOne: jest.fn(async () => ({ uuid: TEST_UUID, lastActivityAt })),
        update: jest.fn(async (q: any, ops: any) => {
          updatedTo = ops.lastActivityAt
        })
      }
    }) as unknown as AccountDB

  beforeEach(() => {
    updatedTo = null
    jest.clearAllMocks()
  })

  it('updates lastActivityAt when never set', async () => {
    const db = mockDb(null)
    await touchLastActivity(ctx, db, TEST_UUID)
    expect(updatedTo).not.toBeNull()
    expect((updatedTo ?? 0) > Date.now() - 1000).toBe(true)
  })

  it('updates lastActivityAt when older than throttle (5 minutes)', async () => {
    const oldTime = Date.now() - 6 * 60 * 1000
    const db = mockDb(oldTime)
    await touchLastActivity(ctx, db, TEST_UUID)
    expect(updatedTo).not.toBeNull()
    expect((updatedTo ?? 0) > oldTime).toBe(true)
  })

  it('skips update when within throttle window', async () => {
    const recentTime = Date.now() - 60 * 1000
    const db = mockDb(recentTime)
    await touchLastActivity(ctx, db, TEST_UUID)
    expect(updatedTo).toBeNull()
  })

  it('uses a preloaded account row instead of reading it', async () => {
    const db = mockDb(null)
    await touchLastActivity(ctx, db, TEST_UUID, { uuid: TEST_UUID, lastActivityAt: Date.now() })
    expect(db.account.findOne).not.toHaveBeenCalled()
    expect(updatedTo).toBeNull()
  })

  it('ignores exempt principals', async () => {
    const db = mockDb(null)
    await touchLastActivity(ctx, db, systemAccountUuid)
    expect(db.account.findOne).not.toHaveBeenCalled()
    expect(db.account.update).not.toHaveBeenCalled()
  })

  it('swallows and logs database errors', async () => {
    const db = mockDb(null)
    ;(db.account.update as jest.Mock).mockRejectedValueOnce(new Error('db down'))
    await expect(touchLastActivity(ctx, db, TEST_UUID)).resolves.toBeUndefined()
    expect(ctx.warn).toHaveBeenCalled()
  })
})
