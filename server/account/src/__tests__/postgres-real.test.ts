/**
 * A set of tests against a real PostgreSQL database, for both CorockachDB and pure.
 */

import { type AccountUuid, generateUuid, SocialIdType, type PersonId } from '@hcengineering/core'
import { getDBClient, shutdownPostgres, type PostgresClientReference } from '@hcengineering/postgres'
import { PostgresAccountDB } from '../collections/postgres/postgres'
import { createAccount, getDbFlavor, normalizeValue } from '../utils'
import { type SocialId } from '../types'

describe('real-account', () => {
  // It should create a DB and test on it for every execution, and drop it after it.
  //
  // Use environment variable or default to localhost CockroachDB
  const cockroachDB: string = process.env.DB_URL ?? 'postgresql://root@localhost:26258/defaultdb?sslmode=disable'

  const postgresDB: string = process.env.POSTGRES_URL ?? 'postgresql://postgres:postgres@localhost:5433/postgres'

  let crDbUri = cockroachDB
  let pgDbUri = postgresDB

  // Administrative client for creating/dropping test databases
  // This connects to 'defaultdb' and is used ONLY for DB admin operations
  let adminClientCRRef: PostgresClientReference
  let adminClientPGRef: PostgresClientReference

  let dbUuid: string

  let crClient: PostgresClientReference
  let pgClient: PostgresClientReference

  let crAccount: PostgresAccountDB
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
    // This client stays connected to 'defaultdb' for admin operations only
    adminClientCRRef = getDBClient(cockroachDB)
    adminClientPGRef = getDBClient(postgresDB)
  })

  afterAll(async () => {
    adminClientCRRef.close()
    adminClientPGRef.close()
    await shutdownPostgres()
  })

  beforeEach(async () => {
    // Create a unique database for each test to ensure isolation
    dbUuid = 'accountdb' + Date.now().toString()
    crDbUri = cockroachDB.replace('/defaultdb', '/' + dbUuid)
    const c = postgresDB.split('/')
    c[c.length - 1] = dbUuid
    pgDbUri = c.join('/')

    try {
      // Use admin client to create the test database
      const adminClient = await adminClientCRRef.getClient()
      // Clean up any leftover test databases with prefix 'accountdb'
      const existingCrs = await adminClient`SELECT datname FROM pg_database WHERE datname LIKE 'accountdb%'`
      for (const row of existingCrs) {
        await adminClient`DROP DATABASE IF EXISTS ${adminClient(row.datname)} CASCADE`
      }
      await adminClient`CREATE DATABASE ${adminClient(dbUuid)}`

      const adminClientPg = await adminClientPGRef.getClient()
      // Clean up any leftover test databases with prefix 'accountdb' for Postgres
      const existingPgs = await adminClientPg`SELECT datname FROM pg_database WHERE datname LIKE 'accountdb%'`
      for (const row of existingPgs) {
        try {
          await adminClientPg`DROP DATABASE IF EXISTS ${adminClientPg(row.datname)}`
        } catch (err: any) {
          // Ignore, Postgress says database is being used by other users
        }
      }
      await adminClientPg`CREATE DATABASE ${adminClient(dbUuid)}`
    } catch (err) {
      console.error('Failed to create test database:', err)
      throw err
    }

    crClient = getDBClient(crDbUri)
    const crPGClient = await crClient.getClient()

    pgClient = getDBClient(pgDbUri)
    const pgPGClient = await pgClient.getClient()

    // Initial DB's

    crAccount = new PostgresAccountDB(crPGClient, dbUuid)

    pgAccount = new PostgresAccountDB(pgPGClient, dbUuid, await getDbFlavor(pgPGClient))

    let error = false

    do {
      try {
        await crAccount.init()
        error = false
      } catch (e) {
        console.error('Error while initializing postgres account db', e, crDbUri)
        error = true
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    } while (error)

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

    await prepareAccounts(pgAccount)
    await prepareAccounts(crAccount)
  })

  afterEach(async () => {
    try {
      pgClient.close()
      crClient.close()

      // Use admin client to drop the test database
      const adminClient = await adminClientCRRef.getClient()
      await adminClient`DROP DATABASE IF EXISTS ${adminClient(dbUuid)} CASCADE`

      const adminClientPG = await adminClientPGRef.getClient()
      await adminClientPG`DROP DATABASE IF EXISTS ${adminClient(dbUuid)}`
    } catch (err) {
      console.error('Cleanup error:', err)
    }
  })

  it('Check accounts', async () => {
    const user1 = await crAccount.account.findOne({ uuid: users[0].uuid })
    expect(user1).not.toBeNull()
    expect(user1).toBeDefined()

    const user1PG = await pgAccount.account.findOne({ uuid: users[0].uuid })
    expect(user1).not.toBeNull()
    expect(user1PG).toBeDefined()
  })

  it('Check social ids', async () => {
    const user1 = await crAccount.account.findOne({ uuid: users[0].uuid })
    expect(user1).not.toBeNull()
    expect(user1).toBeDefined()

    const socialIds = await crAccount.socialId.find({ personUuid: user1?.uuid })
    expect(socialIds).not.toBeNull()
    expect(socialIds).toBeDefined()
    expect(socialIds.length).toEqual(2)

    const user1PG = await pgAccount.account.findOne({ uuid: users[0].uuid })
    expect(user1).not.toBeNull()
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
    const users = await crAccount.listAccounts()
    expect(users.length).toBe(2)

    const usersPG = await pgAccount.listAccounts()
    expect(usersPG.length).toBe(2)
  })

  it('check invites', async () => {
    const wsUuid = await crAccount.createWorkspace(
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
    const inviteLink = await crAccount.invite.insertOne({
      workspaceUuid: wsUuid,
      expiresOn: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).getTime()
    })
    expect(inviteLink).toBeDefined()

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
