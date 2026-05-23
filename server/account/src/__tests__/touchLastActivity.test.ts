//
// Copyright © 2026 Hardcore Engineering Inc.
//

import { touchLastActivity } from '../utils'
import type { AccountDB } from '../types'

const TEST_UUID = '22222222-2222-2222-2222-222222222222' as any

describe('touchLastActivity', () => {
  let updatedTo: number | null = null
  const mockDb = (lastActivityAt: number | null): AccountDB =>
    ({
      account: {
        findOne: async () => ({ uuid: TEST_UUID, lastActivityAt }),
        update: async (q: any, ops: any) => {
          updatedTo = ops.lastActivityAt
        }
      }
    }) as unknown as AccountDB

  beforeEach(() => {
    updatedTo = null
  })

  it('updates lastActivityAt when never set', async () => {
    const db = mockDb(null)
    await touchLastActivity(db, TEST_UUID)
    expect(updatedTo).not.toBeNull()
    expect(updatedTo! > Date.now() - 1000).toBe(true)
  })

  it('updates lastActivityAt when older than throttle (5 minutes)', async () => {
    const oldTime = Date.now() - 6 * 60 * 1000
    const db = mockDb(oldTime)
    await touchLastActivity(db, TEST_UUID)
    expect(updatedTo).not.toBeNull()
    expect(updatedTo! > oldTime).toBe(true)
  })

  it('skips update when within throttle window', async () => {
    const recentTime = Date.now() - 60 * 1000
    const db = mockDb(recentTime)
    await touchLastActivity(db, TEST_UUID)
    expect(updatedTo).toBeNull()
  })
})
