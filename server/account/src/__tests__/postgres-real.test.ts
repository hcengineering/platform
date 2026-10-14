//
// Copyright © 2026 TraceX SAS.
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
/**
 * A set of tests against a real PostgreSQL database.
 */

import { generateUuid, SocialIdType, type AccountUuid, type PersonId } from '@hcengineering/core'
import { getDBClient, shutdownPostgres, type PostgresClientReference } from '@hcengineering/postgres'
import { PostgresAccountDB } from '../collections/postgres/postgres'
import { type SocialId } from '../types'
import { createAccount, normalizeValue, verifyOtpAttempt } from '../utils'

jest.setTimeout(90000)

describe('real-account', () => {
  // It should create a DB and test on it for every execution, and drop it after it.
  //

  const postgresDB: string = process.env.POSTGRES_URL ?? 'postgresql://postgres:postgres@localhost:5433/postgres'

  let pgDbUri = postgresDB

  // Administrative client for creating/dropping test databases

  let adminClientPGRef: PostgresClientReference

  let dbUuid: string

  let pgClient: PostgresClientReference

  let pgAccount: PostgresAccountDB

  const users = [
    {
      name: 'user1',
      uuid: generateUuid() as AccountUuid,
      email: 'user1@example.com',
      firstName: 'Jon',
      lastName: 'Doe'
    },
    {
      name: 'user2',
      uuid: generateUuid() as AccountUuid,
      email: 'user2@example.com',
      firstName: 'Pavel',
      lastName: 'Siaro'
    }
  ]

  async function addSocialId (
    account: PostgresAccountDB,
    user: (typeof users)[0],
    type: SocialIdType,
    value: string
  ): Promise<PersonId> {
    const normalizedValue = normalizeValue(value)
    const newSocialId = {
      type,
      value: normalizedValue,
      personUuid: user.uuid
    }
    return await account.socialId.insertOne(newSocialId)
  }

  async function prepareAccounts (account: PostgresAccountDB): Promise<void> {
    for (const user of users) {
      const ex = await account.account.findOne({ uuid: user.uuid })
      if (ex == null) {
        await account.person.insertOne({ uuid: user.uuid, firstName: user.firstName, lastName: user.lastName })
        await createAccount(account, user.uuid, true)
        await addSocialId(account, user, SocialIdType.EMAIL, user.email)
      }
    }
  }

  beforeAll(() => {
    // Get admin client for database creation/deletion

    adminClientPGRef = getDBClient(postgresDB)
  })

  afterAll(async () => {
    adminClientPGRef.close()
    await shutdownPostgres()
  })

  beforeEach(async () => {
    // Create a unique database for each test to ensure isolation
    dbUuid = 'accountdb' + Date.now().toString()

    const c = postgresDB.split('/')
    c[c.length - 1] = dbUuid
    pgDbUri = c.join('/')

    try {
      // Use admin client to create the test database
      await initPostgreSQL(adminClientPGRef, dbUuid)
    } catch (err) {
      console.error('Failed to create test database:', err)
      throw err
    }

    pgClient = getDBClient(pgDbUri)
    const pgPGClient = await pgClient.getClient()

    // Initial DB's

    pgAccount = new PostgresAccountDB(pgPGClient, dbUuid)

    await migratePostgreSQL(pgAccount, pgDbUri)

    await prepareAccounts(pgAccount)
  })

  afterEach(async () => {
    try {
      pgClient.close()

      // Use admin client to drop the test database

      const adminClientPG = await adminClientPGRef.getClient()
      await adminClientPG`DROP DATABASE IF EXISTS ${adminClientPG(dbUuid)}`
    } catch (err) {
      console.error('Cleanup error:', err)
    }
  })

  it('Check accounts', async () => {
    const user1PG = await pgAccount.account.findOne({ uuid: users[0].uuid })
    expect(user1PG).not.toBeNull()
    expect(user1PG).toBeDefined()
  })

  it('Check social ids', async () => {
    const user1PG = await pgAccount.account.findOne({ uuid: users[0].uuid })
    expect(user1PG).not.toBeNull()
    expect(user1PG).toBeDefined()

    const socialIdsPG = await pgAccount.socialId.find({ personUuid: user1PG?.uuid })
    expect(socialIdsPG).not.toBeNull()
    expect(socialIdsPG).toBeDefined()
    expect(socialIdsPG.length).toEqual(2)

    const em = socialIdsPG.find((it) => it.type === SocialIdType.EMAIL) as SocialId
    expect(em).toBeDefined()
    expect(em.key).toEqual('email:user1@example.com')
  })
  it('List accounts', async () => {
    const usersPG = await pgAccount.listAccounts()
    expect(usersPG.length).toBe(2)
  })

  describe('otp concurrency', () => {
    const code = '123456'

    async function createOtp (): Promise<PersonId> {
      const socialId = (await pgAccount.socialId.find({ personUuid: users[0].uuid })).find(
        (it) => it.type === SocialIdType.EMAIL
      ) as SocialId
      const now = Date.now()
      await pgAccount.otp.insertOne({ socialId: socialId._id, code, expiresOn: now + 60000, createdOn: now })
      return socialId._id
    }

    it('deleteMany lets exactly one of many concurrent consumers delete the code', async () => {
      const socialId = await createOtp()

      const results = await Promise.all(
        Array.from({ length: 20 }, async () => await pgAccount.otp.deleteMany({ socialId, code }))
      )

      expect(results.reduce((sum, it) => sum + it, 0)).toBe(1)
      expect(await pgAccount.otp.count({ socialId })).toBe(0)
    })

    it('only one concurrent verify + consume flow succeeds for the same valid code', async () => {
      const socialId = await createOtp()

      // Same sequence as validateOtp: verify the attempt, then atomically consume the code.
      // Kept below the attempts limit so every request is 'valid' and only consume can stop the extras.
      const results = await Promise.all(
        Array.from({ length: 4 }, async () => {
          if ((await verifyOtpAttempt(pgAccount, socialId, code)) !== 'valid') return false
          return (await pgAccount.otp.deleteMany({ socialId, code })) > 0
        })
      )

      expect(results.filter((it) => it).length).toBe(1)
    })

    it('concurrent attempts cannot exceed the attempts limit', async () => {
      const socialId = await createOtp()

      const results = await Promise.all(
        Array.from({ length: 30 }, async () => await verifyOtpAttempt(pgAccount, socialId, code))
      )

      // Default OTP_MAX_ATTEMPTS is 5: at most 5 concurrent requests may be accepted
      expect(results.filter((it) => it === 'valid').length).toBeLessThanOrEqual(5)
      const [otp] = await pgAccount.otp.find({ socialId })
      expect(otp.attempts).toBe(30)
    })
  })

  it('check invites', async () => {
    const wsUuidPG = await pgAccount.createWorkspace(
      {
        url: 'test-ws',
        name: 'test-ws',
        allowGuestSignUp: true,
        allowReadOnlyGuest: true
      },
      {
        isDisabled: false,
        mode: 'active',
        versionMajor: 0,
        versionMinor: 7,
        versionPatch: 0
      }
    )
    const inviteLinkPG = await pgAccount.invite.insertOne({
      workspaceUuid: wsUuidPG,
      expiresOn: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).getTime()
    })
    expect(inviteLinkPG).toBeDefined()
  })
})

async function migratePostgreSQL (pgAccount: PostgresAccountDB, pgDbUri: string): Promise<void> {
  let error = false
  do {
    try {
      await pgAccount.init()
      error = false
    } catch (e) {
      console.error('Error while initializing postgres account db', e, pgDbUri)
      error = true
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  } while (error)
}

async function initPostgreSQL (adminClientPGRef: PostgresClientReference, dbUuid: string): Promise<void> {
  const adminClientPg = await adminClientPGRef.getClient()
  await adminClientPg`CREATE DATABASE ${adminClientPg(dbUuid)}`
}
