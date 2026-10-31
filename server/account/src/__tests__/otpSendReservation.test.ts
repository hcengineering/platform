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

import {
  SocialIdType,
  type AccountUuid,
  type MeasureContext,
  type PersonId,
  type PersonUuid
} from '@hcengineering/core'
import platform from '@hcengineering/platform'
import type { Db } from 'mongodb'
import type { Sql } from 'postgres'

import { MongoAccountDB } from '../collections/mongo'
import { PostgresAccountDB } from '../collections/postgres/postgres'
import { cleanExpiredOtp, isOtpValid, sendOtp } from '../utils'
import type { Account, AccountDB, OTP, SocialId } from '../types'
import { loginOtp, signUpOtp, validateOtp } from '../operations'

jest.mock('@hcengineering/server-token', () => ({
  ...jest.requireActual('@hcengineering/server-token'),
  generateToken: jest.fn(() => 'synthetic-login-token')
}))

const socialId = 'email-id' as PersonId

describe('OTP send reservations', () => {
  const databaseNow = 1000
  const deadline = 31000

  it.each([true, false])('uses database time for an atomic conditional SQL update (reserved: %s)', async (reserved) => {
    const row = { now: databaseNow, otp_retry_on: deadline }
    const unsafe = jest
      .fn()
      .mockResolvedValueOnce(reserved ? [row] : [])
      .mockResolvedValue([row])
    const client = { unsafe, begin: jest.fn() }
    client.begin.mockImplementation(async (transaction: (sql: Sql) => Promise<unknown>) => {
      return await transaction(client as unknown as Sql)
    })
    const db = new PostgresAccountDB(client as unknown as Sql, 'test_account')

    await expect(db.reserveOtpSend(socialId, 30000)).resolves.toEqual({
      reserved,
      now: databaseNow,
      retryOn: deadline
    })
    const now = 'FLOOR(EXTRACT(EPOCH FROM statement_timestamp()) * 1000)::BIGINT'
    expect(unsafe.mock.calls[0][0].replace(/\s+/g, ' ').trim()).toBe(
      `UPDATE test_account.social_id SET otp_retry_on = ${now} + $2 ` +
        `WHERE _id = $1 AND (otp_retry_on IS NULL OR otp_retry_on <= ${now}) ` +
        'RETURNING otp_retry_on - $2 AS now, otp_retry_on'
    )
    expect(unsafe.mock.calls[0][1]).toEqual([socialId, 30000])
    expect(unsafe).toHaveBeenCalledTimes(reserved ? 1 : 2)
    if (!reserved) {
      expect(unsafe.mock.calls[1]).toEqual([
        `SELECT ${now} AS now, otp_retry_on FROM test_account.social_id WHERE _id = $1`,
        [socialId]
      ])
    }
  })

  it.each([true, false])(
    'uses database time for an atomic conditional MongoDB update (reserved: %s)',
    async (reserved) => {
      const findOneAndUpdate = jest.fn().mockResolvedValue(reserved ? { otpRetryOn: deadline } : null)
      const next = jest.fn().mockResolvedValue({ now: databaseNow, retryOn: deadline })
      const aggregate = jest.fn().mockReturnValue({ next })
      const collection = jest.fn().mockReturnValue({ findOneAndUpdate, aggregate })
      const db = new MongoAccountDB({ collection } as unknown as Db)

      await expect(db.reserveOtpSend(socialId, 30000)).resolves.toEqual({
        reserved,
        now: databaseNow,
        retryOn: deadline
      })
      expect(collection).toHaveBeenCalledWith('socialId')
      expect(findOneAndUpdate).toHaveBeenCalledTimes(1)
      expect(findOneAndUpdate).toHaveBeenCalledWith(
        { _id: socialId, $expr: { $lte: [{ $ifNull: ['$otpRetryOn', 0] }, { $toLong: '$$NOW' }] } },
        [{ $set: { otpRetryOn: { $add: [{ $toLong: '$$NOW' }, 30000] } } }],
        { returnDocument: 'after', includeResultMetadata: false }
      )
      if (!reserved) {
        expect(aggregate).toHaveBeenCalledWith([
          { $match: { _id: socialId } },
          { $project: { now: { $toLong: '$$NOW' }, retryOn: '$otpRetryOn' } }
        ])
      }
    }
  )

  it.each(['mongo', 'sql'] as const)(
    'does not send replica clock values to %s at either cooldown boundary',
    async (storage) => {
      // Scripted database results exercise adapter contracts, not a live database's atomicity or clock.
      const findOneAndUpdate = jest
        .fn()
        .mockResolvedValueOnce({ otpRetryOn: deadline })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ otpRetryOn: 61000 })
      const next = jest.fn().mockResolvedValue({ now: 30999, retryOn: deadline })
      const mongo = { collection: jest.fn().mockReturnValue({ findOneAndUpdate, aggregate: () => ({ next }) }) }
      const unsafe = jest
        .fn()
        .mockResolvedValueOnce([{ now: 1000, otp_retry_on: deadline }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ now: 30999, otp_retry_on: deadline }])
        .mockResolvedValueOnce([{ now: 31000, otp_retry_on: 61000 }])
      const client = { unsafe, begin: jest.fn() }
      client.begin.mockImplementation(async (transaction: (sql: Sql) => Promise<unknown>) => {
        return await transaction(client as unknown as Sql)
      })
      const first =
        storage === 'mongo'
          ? new MongoAccountDB(mongo as unknown as Db)
          : new PostgresAccountDB(client as unknown as Sql, 'test_account')
      const second =
        storage === 'mongo'
          ? new MongoAccountDB(mongo as unknown as Db)
          : new PostgresAccountDB(client as unknown as Sql, 'test_account')
      const localNow = jest.spyOn(Date, 'now').mockReturnValue(-100000)
      try {
        await expect(first.reserveOtpSend(socialId, 30000)).resolves.toEqual({
          reserved: true,
          now: 1000,
          retryOn: deadline
        })
        localNow.mockReturnValue(100000)
        await expect(second.reserveOtpSend(socialId, 30000)).resolves.toEqual({
          reserved: false,
          now: 30999,
          retryOn: deadline
        })
        await expect(second.reserveOtpSend(socialId, 30000)).resolves.toEqual({
          reserved: true,
          now: 31000,
          retryOn: 61000
        })
        expect(localNow).not.toHaveBeenCalled()
        if (storage === 'sql') {
          expect(unsafe.mock.calls.map((call) => call[1])).toEqual([
            [socialId, 30000],
            [socialId, 30000],
            [socialId],
            [socialId, 30000]
          ])
        } else {
          expect(findOneAndUpdate.mock.calls[0]).toEqual(findOneAndUpdate.mock.calls[1])
          expect(findOneAndUpdate.mock.calls[1]).toEqual(findOneAndUpdate.mock.calls[2])
        }
      } finally {
        localNow.mockRestore()
      }
    }
  )
})

// These collaborators model storage operations at explicit barriers. They assert the real adapter
// inputs, but do not replace live PostgreSQL/CockroachDB/MongoDB concurrency verification.
interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
}

function deferred<T> (): Deferred<T> {
  let complete: (value: T) => void = () => {
    throw new Error('Deferred not initialized')
  }
  const promise = new Promise<T>((resolve) => {
    complete = resolve
  })
  return { promise, resolve: complete }
}

function attemptStorage (storage: 'mongo' | 'sql'): {
  db: AccountDB
  rows: Map<string, OTP>
  setNow: (now: number) => void
  hold: (count: number) => { reached: Promise<void>, release: () => void }
} {
  let now = 1000
  let retryOn = 0
  const rows = new Map<string, OTP>()
  let barrier: { count: number, reached: Deferred<undefined>, released: Deferred<undefined> } | undefined
  async function checkpoint (): Promise<void> {
    const current = barrier
    if (current === undefined) return
    current.count--
    if (current.count === 0) current.reached.resolve(undefined)
    await current.released.promise
  }
  function active (row: OTP): boolean {
    return row.socialId === socialId && row.expiresOn > now && (row.attempts ?? 0) < 5
  }
  function advance (id: string): { code: string } | null {
    const row = rows.get(id)
    if (row === undefined || !active(row)) return null
    row.attempts = (row.attempts ?? 0) + 1
    return { code: row.code }
  }
  const activeExpr = {
    $and: [{ $gt: ['$expiresOn', { $toLong: '$$NOW' }] }, { $lt: [{ $ifNull: ['$attempts', 0] }, 5] }]
  }
  const otp = {
    find: jest.fn((query, options) => {
      expect(query).toEqual({ socialId, $expr: activeExpr })
      expect(options).toEqual({ projection: { _id: 1 } })
      const ids = Array.from(rows)
        .filter(([, row]) => active(row))
        .map(([id]) => ({ _id: id }))
      return {
        toArray: async () => {
          await checkpoint()
          return ids
        }
      }
    }),
    findOneAndUpdate: jest.fn(async (query, update, options) => {
      expect(query).toEqual({ socialId, $expr: activeExpr, _id: expect.any(String) })
      expect(update).toEqual({ $inc: { attempts: 1 } })
      expect(options).toEqual({ returnDocument: 'after', includeResultMetadata: false })
      return advance(query._id)
    }),
    deleteMany: jest.fn(async (query) => {
      expect(query).toEqual({ $expr: { $lte: ['$expiresOn', { $toLong: '$$NOW' }] } })
      for (const [id, row] of rows) if (row.expiresOn <= now) rows.delete(id)
    })
  }
  const identity = {
    findOneAndUpdate: jest.fn(async () => {
      if (retryOn > now) return null
      retryOn = now + 30000
      return { otpRetryOn: retryOn }
    }),
    aggregate: () => ({ next: async () => ({ now, retryOn }) })
  }
  const mongo = { collection: (name: string) => (name === 'otp' ? otp : identity) }
  const unsafe = jest.fn(async (query: string, values?: unknown[]) => {
    const sql = query.replace(/\s+/g, ' ').trim()
    if (sql.startsWith('UPDATE test_account.otp')) {
      expect(sql).toBe(
        'UPDATE test_account.otp SET attempts = COALESCE(attempts, 0) + 1 ' +
          'WHERE social_id = $1 AND expires_on > FLOOR(EXTRACT(EPOCH FROM statement_timestamp()) * 1000)::BIGINT ' +
          'AND COALESCE(attempts, 0) < 5 RETURNING code'
      )
      expect(values).toEqual([socialId])
      const advanced = Array.from(rows.keys())
        .map(advance)
        .filter((row) => row !== null)
      await checkpoint()
      return advanced
    }
    if (sql.startsWith('DELETE FROM')) {
      expect(sql).toBe(
        'DELETE FROM test_account.otp ' +
          'WHERE expires_on <= FLOOR(EXTRACT(EPOCH FROM statement_timestamp()) * 1000)::BIGINT'
      )
      for (const [id, row] of rows) if (row.expiresOn <= now) rows.delete(id)
      return []
    }
    if (sql.startsWith('UPDATE test_account.social_id')) {
      if (retryOn > now) return []
      retryOn = now + Number(values?.[1])
      return [{ now, otp_retry_on: retryOn }]
    }
    if (sql.startsWith('SELECT') && sql.includes('social_id')) return [{ now, otp_retry_on: retryOn }]
    throw new Error('Unexpected SQL operation')
  })
  const client = { unsafe, begin: jest.fn() }
  client.begin.mockImplementation(async (transaction: (sql: Sql) => Promise<unknown>) => {
    return await transaction(client as unknown as Sql)
  })
  const db =
    storage === 'mongo'
      ? new MongoAccountDB(mongo as unknown as Db)
      : new PostgresAccountDB(client as unknown as Sql, 'test_account')
  return {
    db,
    rows,
    setNow: (value) => {
      now = value
    },
    hold: (count) => {
      const current = { count, reached: deferred<undefined>(), released: deferred<undefined>() }
      barrier = current
      return {
        reached: current.reached.promise,
        release: () => {
          barrier = undefined
          current.released.resolve(undefined)
        }
      }
    }
  }
}

function otpRow (code = '123456'): OTP {
  return { socialId, code, createdOn: 1000, expiresOn: 61000, attempts: 0 }
}

describe.each(['mongo', 'sql'] as const)('OTP attempts and lifetime through %s adapter', (storage) => {
  it.each([false, true])(
    'does not compare a new code inserted after attempt selection (old code: %s)',
    async (oldCode) => {
      const { db, rows, hold } = attemptStorage(storage)
      if (oldCode) rows.set('old', otpRow('999999'))
      const barrier = hold(6)
      const guesses = ['123456', '000001', '000002', '000003', '000004', '000005']
      const pending = guesses.map(async (guess) => await isOtpValid(db, socialId, guess))
      await barrier.reached
      rows.set('new', otpRow())
      barrier.release()
      expect(await Promise.all(pending)).toEqual(guesses.map(() => false))
      expect(rows.get('new')?.attempts).toBe(0)
      if (oldCode) expect(rows.get('old')?.attempts).toBe(5)
      expect(await isOtpValid(db, socialId, '123456')).toBe(true)
      expect(rows.get('new')?.attempts).toBe(1)
    }
  )

  it.each([5, 6])('initializes legacy counters and checks the correct code on attempt %s', async (correctAttempt) => {
    const { db, rows } = attemptStorage(storage)
    rows.set('legacy', { ...otpRow(), attempts: undefined })
    for (let attempt = 0; attempt < correctAttempt - 1; attempt++) {
      expect(await isOtpValid(db, socialId, '000000')).toBe(false)
    }
    expect(await isOtpValid(db, socialId, '123456')).toBe(correctAttempt === 5)
    expect(await isOtpValid(db, socialId, '123456')).toBe(false)
    expect(rows.get('legacy')?.attempts).toBe(5)
  })

  it('limits concurrent comparisons to five independently of result delivery order', async () => {
    const { db, rows } = attemptStorage(storage)
    rows.set('code', otpRow())
    const results = await Promise.all(Array.from({ length: 6 }, async () => await isOtpValid(db, socialId, '123456')))
    expect(results.filter(Boolean)).toHaveLength(5)
    expect(rows.get('code')?.attempts).toBe(5)
  })

  it.each([-120000, 120000])(
    'issues, validates and cleans up using database time with replica offset %s',
    async (offset) => {
      const { db, rows, setNow } = attemptStorage(storage)
      // Mail is deliberately unavailable: this tests storage lifetime, not delivery.
      const ctx = { error: jest.fn() } as unknown as MeasureContext
      const identity: SocialId = {
        _id: socialId,
        personUuid: 'person' as PersonUuid,
        type: SocialIdType.EMAIL,
        value: 'test@example.com',
        key: 'email:test@example.com',
        verifiedOn: 1
      }
      const insert = jest.spyOn(db.otp, 'insertOne').mockImplementation(async (row) => {
        if (
          row.socialId === undefined ||
          row.code === undefined ||
          row.createdOn === undefined ||
          row.expiresOn === undefined
        ) {
          throw new Error('Incomplete OTP insertion')
        }
        rows.set('issued', {
          socialId: row.socialId,
          code: row.code,
          createdOn: row.createdOn,
          expiresOn: row.expiresOn,
          attempts: row.attempts
        })
        return undefined
      })
      jest.spyOn(db.otp, 'findOne').mockResolvedValue(null)
      const localNow = jest.spyOn(Date, 'now').mockReturnValue(1000 + offset)
      try {
        await sendOtp(ctx, db, null, identity)
        expect(insert).toHaveBeenCalledWith({ ...otpRow(), code: expect.stringMatching(/^\d{6}$/) })
        const code = rows.get('issued')?.code ?? ''
        await cleanExpiredOtp(db)
        expect(rows.size).toBe(1)
        expect(await isOtpValid(db, socialId, code)).toBe(true)
        setNow(61000)
        localNow.mockReturnValue(61000 + offset)
        expect(await isOtpValid(db, socialId, code)).toBe(false)
        await cleanExpiredOtp(db)
        expect(rows.size).toBe(0)
      } finally {
        jest.restoreAllMocks()
      }
    }
  )

  it('resends an exhausted pending signup code after cooldown and creates the account only on validation', async () => {
    const { db, rows, setNow } = attemptStorage(storage)
    // Synthetic storage and token signing; mail is unavailable. The signup operations and adapters are real.
    const ctx = { error: jest.fn(), info: jest.fn(), warn: jest.fn() } as unknown as MeasureContext
    const person = { uuid: 'person' as PersonUuid, firstName: 'Test', lastName: 'Signer' }
    const identity: SocialId = {
      _id: socialId,
      personUuid: person.uuid,
      type: SocialIdType.EMAIL,
      value: 'signup@example.com',
      key: 'email:signup@example.com'
    }
    let account: Account | null = null
    const findAccount = jest.spyOn(db.account, 'findOne').mockImplementation(async (query) => {
      expect(query).toEqual({ uuid: person.uuid })
      return account
    })
    const createAccount = jest.spyOn(db.account, 'insertOne').mockImplementation(async (row) => {
      expect(row).toEqual({ uuid: person.uuid, automatic: false })
      account = { uuid: person.uuid as AccountUuid, automatic: false }
      return person.uuid as AccountUuid
    })
    jest.spyOn(db.account, 'update').mockResolvedValue()
    const createEvent = jest.spyOn(db.accountEvent, 'insertOne').mockResolvedValue(undefined)
    const createProfile = jest.spyOn(db.userProfile, 'insertOne').mockResolvedValue(undefined)
    jest.spyOn(db.person, 'findOne').mockResolvedValue(person)
    const updatePerson = jest.spyOn(db.person, 'update').mockResolvedValue()
    jest.spyOn(db.socialId, 'findOne').mockResolvedValue(identity)
    const confirmEmail = jest.spyOn(db.socialId, 'update').mockResolvedValue()
    const createSocialId = jest.spyOn(db.socialId, 'insertOne').mockResolvedValue('huly-id' as PersonId)
    const insert = jest.spyOn(db.otp, 'insertOne').mockImplementation(async (row) => {
      if (
        row.socialId === undefined ||
        row.code === undefined ||
        row.createdOn === undefined ||
        row.expiresOn === undefined
      ) {
        throw new Error('Incomplete OTP insertion')
      }
      rows.set(`issued-${rows.size}`, {
        socialId: row.socialId,
        code: row.code,
        createdOn: row.createdOn,
        expiresOn: row.expiresOn,
        attempts: row.attempts
      })
      return undefined
    })
    jest.spyOn(db.otp, 'findOne').mockResolvedValue(null)
    const consume = jest.spyOn(db.otp, 'deleteMany').mockImplementation(async (query) => {
      expect(query).toEqual({ socialId })
      rows.clear()
    })
    // SignupForm passes this same signUpOtp request (including the retained names) to OtpForm.onResend.
    const signup = { email: identity.value, firstName: person.firstName, lastName: person.lastName }
    try {
      await expect(signUpOtp(ctx, db, null, '', signup)).resolves.toEqual({ sent: true, retryOn: 31000 })
      const original = rows.get('issued-0')
      if (original === undefined) throw new Error('Missing initial signup code')
      const wrongCode = original.code === '000000' ? '000001' : '000000'
      for (let attempt = 0; attempt < 5; attempt++) {
        await expect(validateOtp(ctx, db, null, '', { email: signup.email, code: wrongCode })).rejects.toMatchObject({
          status: { code: platform.status.InvalidOtp }
        })
      }
      expect(original.attempts).toBe(5)
      await expect(validateOtp(ctx, db, null, '', { email: signup.email, code: original.code })).rejects.toMatchObject({
        status: { code: platform.status.InvalidOtp }
      })
      expect(createAccount).not.toHaveBeenCalled()
      expect(account).toBeNull()

      // Resend before the deadline stays suppressed even though the original record is exhausted.
      await expect(signUpOtp(ctx, db, null, '', signup)).resolves.toEqual({ sent: true, retryOn: 31000 })
      expect(insert).toHaveBeenCalledTimes(1)
      setNow(31000)
      await expect(validateOtp(ctx, db, null, '', { email: signup.email, code: original.code })).rejects.toMatchObject({
        status: { code: platform.status.InvalidOtp }
      })
      await expect(signUpOtp(ctx, db, null, '', signup)).resolves.toEqual({ sent: true, retryOn: 61000 })
      expect(insert).toHaveBeenCalledTimes(2)
      expect(createAccount).not.toHaveBeenCalled()
      expect(account).toBeNull()
      const replacement = rows.get('issued-1')
      if (replacement === undefined) throw new Error('Missing replacement signup code')
      expect(replacement).toMatchObject({ createdOn: 31000, expiresOn: 91000, attempts: 0 })

      await expect(
        validateOtp(ctx, db, null, '', { email: signup.email, code: replacement.code })
      ).resolves.toMatchObject({
        account: person.uuid,
        token: 'synthetic-login-token'
      })
      expect(findAccount).toHaveBeenCalled()
      expect(updatePerson).toHaveBeenCalledWith({ uuid: person.uuid }, { firstName: 'Test', lastName: 'Signer' })
      expect(confirmEmail).toHaveBeenCalledWith({ _id: socialId }, { verifiedOn: expect.any(Number) })
      expect(createAccount).toHaveBeenCalledTimes(1)
      expect(createSocialId).toHaveBeenCalledWith({
        type: SocialIdType.HULY,
        value: person.uuid,
        personUuid: person.uuid,
        verifiedOn: expect.any(Number)
      })
      expect(createEvent).toHaveBeenCalledTimes(1)
      expect(createProfile).toHaveBeenCalledWith({ personUuid: person.uuid, isPublic: false })
      expect(consume).toHaveBeenCalledTimes(1)
      expect(rows.size).toBe(0)
    } finally {
      jest.restoreAllMocks()
    }
  })

  it('preserves suppression after consumption and issues a usable replacement after cooldown', async () => {
    const { db, rows, setNow } = attemptStorage(storage)
    const ctx = { error: jest.fn(), info: jest.fn() } as unknown as MeasureContext
    const identity: SocialId = {
      _id: socialId,
      personUuid: 'person' as PersonUuid,
      type: SocialIdType.EMAIL,
      value: 'test@example.com',
      key: 'email:test@example.com',
      verifiedOn: 1
    }
    const insert = jest.spyOn(db.otp, 'insertOne').mockImplementation(async (row) => {
      if (
        row.socialId === undefined ||
        row.code === undefined ||
        row.createdOn === undefined ||
        row.expiresOn === undefined
      ) {
        throw new Error('Incomplete OTP insertion')
      }
      rows.set('issued', {
        socialId: row.socialId,
        code: row.code,
        createdOn: row.createdOn,
        expiresOn: row.expiresOn,
        attempts: row.attempts
      })
      return undefined
    })
    jest.spyOn(db.otp, 'findOne').mockResolvedValue(null)
    jest.spyOn(db.socialId, 'findOne').mockResolvedValue(identity)
    jest.spyOn(db.socialId, 'find').mockResolvedValue([])
    jest.spyOn(db.account, 'findOne').mockResolvedValue({ uuid: identity.personUuid as AccountUuid })
    jest.spyOn(db.account, 'update').mockResolvedValue()
    jest
      .spyOn(db.person, 'findOne')
      .mockResolvedValue({ uuid: identity.personUuid, firstName: 'Test', lastName: 'Signer' })
    const consume = jest.spyOn(db.otp, 'deleteMany').mockImplementation(async (query) => {
      expect(query).toEqual({ socialId })
      rows.clear()
    })
    try {
      await loginOtp(ctx, db, null, '', { email: identity.value })
      const code = rows.get('issued')?.code ?? ''
      await expect(validateOtp(ctx, db, null, '', { email: identity.value, code })).resolves.toMatchObject({
        account: identity.personUuid,
        token: 'synthetic-login-token'
      })
      expect(consume).toHaveBeenCalledTimes(1)
      expect(rows.size).toBe(0)
      await expect(loginOtp(ctx, db, null, '', { email: identity.value })).resolves.toEqual({
        sent: true,
        retryOn: 31000
      })
      expect(insert).toHaveBeenCalledTimes(1)
      expect(await isOtpValid(db, socialId, code)).toBe(false)
      setNow(31000)
      await loginOtp(ctx, db, null, '', { email: identity.value })
      expect(insert).toHaveBeenCalledTimes(2)
      expect(await isOtpValid(db, socialId, rows.get('issued')?.code ?? '')).toBe(true)
    } finally {
      jest.restoreAllMocks()
    }
  })
})
