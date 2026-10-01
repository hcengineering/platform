/**
 * A set of tests against a real PostgreSQL database, for both CorockachDB and pure.
 */

import { generateUuid, SocialIdType, type AccountUuid, type PersonId } from '@hcengineering/core'
import { getDBClient, shutdownPostgres, type PostgresClientReference } from '@hcengineering/postgres'
import { type Sql } from 'postgres'
import { PostgresAccountDB } from '../collections/postgres/postgres'
import { getMigrations } from '../collections/postgres/migrations'
import { type DBFlavor, type SocialId } from '../types'
import { createAccount, getDbFlavor, normalizeValue } from '../utils'
import { getLegacyAdminMigrations } from './fixtures/legacyAdminMigrations'

const FOUNDATION_V28_ID = 'account_db_v28_account_lifecycle_admin_audit'

/**
 * Account DB that stops before the foundation migration, i.e. the schema state
 * of a deployment running the previous release.
 */
class PreFoundationAccountDB extends PostgresAccountDB {
  protected getMigrations (): Array<[string, string]> {
    return super.getMigrations().filter(([id]) => id !== FOUNDATION_V28_ID)
  }
}

jest.setTimeout(90000)

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

  let crSql: Sql
  let pgSql: Sql
  let pgFlavor: DBFlavor

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
      await Promise.all([initCockroachDB(adminClientCRRef, dbUuid), initPostgreSQL(adminClientPGRef, dbUuid)])
    } catch (err) {
      console.error('Failed to create test database:', err)
      throw err
    }

    crClient = getDBClient(crDbUri)
    crSql = await crClient.getClient()

    pgClient = getDBClient(pgDbUri)
    pgSql = await pgClient.getClient()
    pgFlavor = await getDbFlavor(pgSql)

    // Initial DB's

    crAccount = new PostgresAccountDB(crSql, dbUuid)

    pgAccount = new PostgresAccountDB(pgSql, dbUuid, pgFlavor)

    await Promise.all([migrateCockroachDB(crAccount, crDbUri), migratePostgreSQL(pgAccount, pgDbUri)])

    await Promise.all([prepareAccounts(pgAccount), prepareAccounts(crAccount)])
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

  describe('account lifecycle migration (v28)', () => {
    const upgradeNs = 'upgrade_account'

    function targets (): Array<{ name: string, sql: Sql, flavor: DBFlavor }> {
      return [
        { name: 'cockroach', sql: crSql, flavor: 'cockroach' },
        { name: 'postgres', sql: pgSql, flavor: pgFlavor }
      ]
    }

    async function appliedMigrations (sql: Sql, ns: string): Promise<Map<string, boolean>> {
      const rows = await sql.unsafe(`SELECT identifier, applied_at FROM ${ns}._account_applied_migrations`)
      return new Map(rows.map((r: any) => [r.identifier as string, r.applied_at != null]))
    }

    async function columns (sql: Sql, ns: string, table: string): Promise<Array<{ name: string, nullable: boolean }>> {
      const rows = await sql.unsafe(
        'SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
        [ns, table]
      )
      return rows.map((r: any) => ({ name: r.column_name, nullable: r.is_nullable === 'YES' }))
    }

    async function indexes (sql: Sql, ns: string): Promise<string[]> {
      const rows = await sql.unsafe('SELECT indexname FROM pg_indexes WHERE schemaname = $1', [ns])
      return rows.map((r: any) => r.indexname as string)
    }

    async function createUser (db: PostgresAccountDB): Promise<AccountUuid> {
      const uuid = generateUuid() as AccountUuid
      await db.person.insertOne({ uuid, firstName: 'Upgrade', lastName: 'User' })
      await createAccount(db, uuid, true)
      return uuid
    }

    it('applies on top of the legacy admin migrations (v27-v30 ids)', async () => {
      for (const { name, sql, flavor } of targets()) {
        // 1. Previous release schema + the legacy admin migrations, recorded by id.
        const legacyDb = new PreFoundationAccountDB(sql, upgradeNs, flavor)
        await legacyDb.init()
        const legacy = getLegacyAdminMigrations(upgradeNs, flavor)
        for (const [id, ddl] of legacy) {
          await legacyDb.migrate(id, ddl)
        }
        const before = await appliedMigrations(sql, upgradeNs)
        expect(before.has(FOUNDATION_V28_ID)).toBe(false)

        // 2. Upgrade: only the foundation migration is new and must apply cleanly.
        const db = new PostgresAccountDB(sql, upgradeNs, flavor)
        await db.init()

        const applied = await appliedMigrations(sql, upgradeNs)
        for (const id of [...legacy.map(([id]) => id), FOUNDATION_V28_ID]) {
          expect({ name, id, applied: applied.get(id) }).toEqual({ name, id, applied: true })
        }
        expect(applied.size).toBe(before.size + 1)

        const accountColumns = (await columns(sql, upgradeNs, 'account')).map((c) => c.name)
        for (const col of ['disabled_at', 'token_version', 'last_activity_at']) {
          expect({ name, col, count: accountColumns.filter((c) => c === col).length }).toEqual({ name, col, count: 1 })
        }

        // Legacy-only schema extensions are left as they are.
        const auditColumns = await columns(sql, upgradeNs, 'admin_audit_log')
        expect(auditColumns.some((c) => c.name === 'batch_id')).toBe(true)
        expect(auditColumns.find((c) => c.name === 'target_account')?.nullable).toBe(true)

        const idx = await indexes(sql, upgradeNs)
        for (const index of [
          'admin_audit_log_target_idx',
          'account_disabled_at_idx',
          'workspace_members_account_idx'
        ]) {
          expect({ name, index, present: idx.includes(index) }).toEqual({ name, index, present: true })
        }

        // Runtime: the foundation code works against the upgraded schema.
        const target = await createUser(db)
        const admin = await createUser(db)
        await db.adminAuditLog.insert({
          adminAccount: admin,
          targetAccount: target,
          action: 'admin_action_denied',
          workspaceUuid: null,
          details: { reason: 'self_disable' }
        })
        const auditRows = await sql.unsafe(
          `SELECT admin_account, target_account, action, details, batch_id FROM ${upgradeNs}.admin_audit_log`
        )
        expect(auditRows).toHaveLength(1)
        expect(auditRows[0].batch_id).toBeNull()

        const account = await db.account.findOne({ uuid: target })
        expect(account).toEqual(
          expect.objectContaining({ uuid: target, disabledAt: null, tokenVersion: 0, lastActivityAt: null })
        )
        await db.account.update(
          { uuid: target },
          { disabledAt: 1700000000000, lastActivityAt: 1700000000001, $inc: { tokenVersion: 1 } }
        )
        expect(await db.account.findOne({ uuid: target })).toEqual(
          expect.objectContaining({ disabledAt: 1700000000000, tokenVersion: 1, lastActivityAt: 1700000000001 })
        )
        await db.account.update({ uuid: target }, { disabledAt: null, lastActivityAt: null })
      }
    })

    it('is idempotent on a fresh database', async () => {
      for (const { sql, flavor } of targets()) {
        const db = new PostgresAccountDB(sql, upgradeNs, flavor)
        await db.init()
        const first = await appliedMigrations(sql, upgradeNs)
        expect(first.get(FOUNDATION_V28_ID)).toBe(true)

        await new PostgresAccountDB(sql, upgradeNs, flavor).init()
        expect(await appliedMigrations(sql, upgradeNs)).toEqual(first)

        // The DDL itself must be re-runnable (the runner only tracks ids).
        const ddl = getMigrations(upgradeNs, flavor).find(([id]) => id === FOUNDATION_V28_ID)?.[1] ?? ''
        await sql.unsafe(ddl)
        await sql.unsafe(ddl)

        const accountColumns = (await columns(sql, upgradeNs, 'account')).map((c) => c.name)
        expect(accountColumns.filter((c) => c === 'token_version')).toHaveLength(1)
        const auditColumns = await columns(sql, upgradeNs, 'admin_audit_log')
        expect(auditColumns.find((c) => c.name === 'target_account')?.nullable).toBe(false)
        expect(auditColumns.some((c) => c.name === 'batch_id')).toBe(false)
      }
    })
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

async function migrateCockroachDB (crAccount: PostgresAccountDB, crDbUri: string): Promise<void> {
  let error: boolean = false
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
}

async function initPostgreSQL (adminClientPGRef: PostgresClientReference, dbUuid: string): Promise<void> {
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
  await adminClientPg`CREATE DATABASE ${adminClientPg(dbUuid)}`
}

async function initCockroachDB (adminClientCRRef: PostgresClientReference, dbUuid: string): Promise<void> {
  const adminClient = await adminClientCRRef.getClient()
  // Clean up any leftover test databases with prefix 'accountdb'
  const existingCrs = await adminClient`SELECT datname FROM pg_database WHERE datname LIKE 'accountdb%'`
  for (const row of existingCrs) {
    await adminClient`DROP DATABASE IF EXISTS ${adminClient(row.datname)} CASCADE`
  }
  await adminClient`CREATE DATABASE ${adminClient(dbUuid)}`
}
