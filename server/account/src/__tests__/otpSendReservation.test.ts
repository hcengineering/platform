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

import type { PersonId } from '@hcengineering/core'
import type { Db } from 'mongodb'
import type { Sql } from 'postgres'

import { MongoAccountDB } from '../collections/mongo'
import { PostgresAccountDB } from '../collections/postgres/postgres'
import { isOtpValid } from '../utils'

const socialId = 'email-id' as PersonId

describe('OTP send reservations', () => {
  it.each([true, false])('uses an atomic conditional SQL update (reserved: %s)', async (reserved) => {
    const unsafe = jest.fn().mockResolvedValue(reserved ? [{ _id: socialId }] : [])
    const client = { unsafe, begin: jest.fn() }
    client.begin.mockImplementation(async (callback: (sql: Sql) => Promise<boolean>) => {
      return await callback(client as unknown as Sql)
    })
    const db = new PostgresAccountDB(client as unknown as Sql, 'test_account')

    await expect(db.reserveOtpSend(socialId, 1000, 31000)).resolves.toBe(reserved)

    expect(unsafe).toHaveBeenCalledTimes(1)
    expect(unsafe.mock.calls[0][0].replace(/\s+/g, ' ').trim()).toBe(
      'UPDATE test_account.social_id SET otp_retry_on = $2 ' +
        'WHERE _id = $1 AND (otp_retry_on IS NULL OR otp_retry_on <= $3) RETURNING _id'
    )
    expect(unsafe.mock.calls[0][1]).toEqual([socialId, 31000, 1000])
  })

  it.each([true, false])('uses an atomic conditional MongoDB update (reserved: %s)', async (reserved) => {
    const updateOne = jest.fn().mockResolvedValue({ matchedCount: reserved ? 1 : 0 })
    const collection = jest.fn().mockReturnValue({ updateOne })
    const mongo = { collection }
    const db = new MongoAccountDB(mongo as unknown as Db)

    await expect(db.reserveOtpSend(socialId, 1000, 31000)).resolves.toBe(reserved)

    expect(collection).toHaveBeenCalledWith('socialId')
    expect(updateOne).toHaveBeenCalledTimes(1)
    expect(updateOne).toHaveBeenCalledWith(
      { _id: socialId, $or: [{ otpRetryOn: { $exists: false } }, { otpRetryOn: { $lte: 1000 } }] },
      { $set: { otpRetryOn: 31000 } }
    )
  })

  it('allows another MongoDB reservation only when the cooldown ends', async () => {
    let retryOn: number | undefined
    const updateOne = jest.fn(async (query: { $or: unknown[] }, update: { $set: { otpRetryOn: number } }) => {
      const now = (query.$or[1] as { otpRetryOn: { $lte: number } }).otpRetryOn.$lte
      if (retryOn !== undefined && retryOn > now) return { matchedCount: 0 }
      retryOn = update.$set.otpRetryOn
      return { matchedCount: 1 }
    })
    const mongo = { collection: jest.fn().mockReturnValue({ updateOne }) }
    const db = new MongoAccountDB(mongo as unknown as Db)

    expect(await db.reserveOtpSend(socialId, 1000, 31000)).toBe(true)
    expect(await db.reserveOtpSend(socialId, 30999, 60999)).toBe(false)
    expect(await db.reserveOtpSend(socialId, 31000, 61000)).toBe(true)
    expect(retryOn).toBe(61000)
  })
})

describe('OTP attempt storage', () => {
  it('increments legacy MongoDB counters before checking the code and attempt budget', async () => {
    let attempts: number | undefined
    const updateMany = jest.fn(async () => {
      attempts = (attempts ?? 0) + 1
    })
    const findOne = jest.fn(async (query: { code: string, attempts: { $lte: number } }) => {
      if (query.code !== '123456' || (attempts ?? 0) > query.attempts.$lte) return null
      return { socialId, code: '123456', createdOn: Date.now(), expiresOn: Date.now() + 60000, attempts }
    })
    const mongo = { collection: jest.fn().mockReturnValue({ updateMany, findOne }) }
    const db = new MongoAccountDB(mongo as unknown as Db)

    for (let attempt = 0; attempt < 4; attempt++) {
      expect(await isOtpValid(db, socialId, '000000')).toBe(false)
    }
    expect(await isOtpValid(db, socialId, '123456')).toBe(true)
    expect(await isOtpValid(db, socialId, '123456')).toBe(false)
    expect(attempts).toBe(6)
    expect(updateMany).toHaveBeenCalledTimes(6)
    expect(updateMany).toHaveBeenCalledWith(
      { socialId, expiresOn: { $gt: expect.any(Number) } },
      { $set: {}, $inc: { attempts: 1 } }
    )
    expect(findOne).toHaveBeenLastCalledWith({ socialId, code: '123456', attempts: { $lte: 5 } })
  })

  it('increments SQL counters before checking the code and attempt budget', async () => {
    const unsafe = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([])
    const client = { unsafe }
    const db = new PostgresAccountDB(client as unknown as Sql, 'test_account')

    expect(await isOtpValid(db, socialId, '123456')).toBe(false)
    expect(unsafe).toHaveBeenCalledTimes(2)
    expect(unsafe.mock.calls[0][0]).toBe(
      'UPDATE test_account.otp SET "attempts" = "attempts" + $1 WHERE "social_id" = $2 AND "expires_on" > $3'
    )
    expect(unsafe.mock.calls[0][1]).toEqual([1, socialId, expect.any(Number)])
    expect(unsafe.mock.calls[1][0]).toBe(
      'SELECT * FROM test_account.otp WHERE "social_id" = $1 AND "code" = $2 AND "attempts" <= $3 LIMIT 1'
    )
    expect(unsafe.mock.calls[1][1]).toEqual([socialId, '123456', 5])
  })
})
