//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

/**
 * A set of tests against a real PostgreSQL database, for both CockroachDB and pure PostgreSQL.
 * These tests verify that the database schema and operations are compatible with both database flavors.
 */

import postgres from 'postgres'
import { generateUuid, type AccountUuid, type WorkspaceUuid } from '@hcengineering/core'
import { PostgresDB } from '../db'
import { type ChannelRecord, type MessageRecord, type OtpRecord, type ReplyRecord } from '../types'

jest.setTimeout(90000)

describe('PostgresDB compatibility tests', () => {
  // Use environment variables or default to localhost databases
  const cockroachDB: string = process.env.DB_URL ?? 'postgresql://root@localhost:26258/defaultdb?sslmode=disable'
  const postgresDB: string = process.env.POSTGRES_URL ?? 'postgresql://postgres:postgres@localhost:5433/postgres'

  let crDbUri = cockroachDB
  let pgDbUri = postgresDB

  // Administrative clients for creating/dropping test databases
  let adminClientCR: postgres.Sql
  let adminClientPG: postgres.Sql

  let dbUuid: string

  let crClient: postgres.Sql
  let pgClient: postgres.Sql

  let crDb: PostgresDB
  let pgDb: PostgresDB

  const testAccount = generateUuid() as AccountUuid
  const testWorkspace = generateUuid() as WorkspaceUuid

  beforeAll(async () => {
    // Get admin clients for database creation/deletion
    adminClientCR = postgres(cockroachDB, {
      connection: {
        application_name: 'telegram-bot-test-admin-cr'
      }
    })
    adminClientPG = postgres(postgresDB, {
      connection: {
        application_name: 'telegram-bot-test-admin-pg'
      }
    })
  })

  afterAll(async () => {
    await adminClientCR.end({ timeout: 0 })
    await adminClientPG.end({ timeout: 0 })
  })

  beforeEach(async () => {
    // Create a unique database for each test to ensure isolation
    dbUuid = 'telegrambotdb' + Date.now().toString()
    crDbUri = cockroachDB.replace('/defaultdb', '/' + dbUuid)
    const c = postgresDB.split('/')
    c[c.length - 1] = dbUuid
    pgDbUri = c.join('/')

    try {
      // Use admin clients to create the test databases
      await Promise.all([
        initCockroachDB(adminClientCR, dbUuid),
        initPostgreSQL(adminClientPG, dbUuid)
      ])
    } catch (err) {
      console.error('Failed to create test database:', err)
      throw err
    }

    // Create clients for the test databases
    crClient = postgres(crDbUri, {
      connection: {
        application_name: 'telegram-bot-test-cr'
      },
      fetch_types: true,
      prepare: true
    })

    pgClient = postgres(pgDbUri, {
      connection: {
        application_name: 'telegram-bot-test-pg'
      },
      fetch_types: true,
      prepare: true
    })

    // Initialize databases
    crDb = await PostgresDB.create(crClient)
    pgDb = await PostgresDB.create(pgClient)
  })

  afterEach(async () => {
    try {
      await crDb.close()
      await pgDb.close()
      await crClient.end({ timeout: 0 })
      await pgClient.end({ timeout: 0 })

      // Use admin clients to drop the test databases
      await adminClientCR`DROP DATABASE IF EXISTS ${adminClientCR(dbUuid)} CASCADE`
      await adminClientPG`DROP DATABASE IF EXISTS ${adminClientPG(dbUuid)}`
    } catch (err) {
      console.error('Cleanup error:', err)
    }
  })

  describe('Schema initialization', () => {
    it('should create schema successfully on CockroachDB', async () => {
      // Schema creation is done in beforeEach via PostgresDB.create()
      // Verify tables exist by querying them
      const tables = await crClient`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'telegram_bot'
        ORDER BY table_name
      `
      const tableNames = tables.map((t: any) => t.table_name).sort((a, b) => a.localeCompare(b))
      expect(tableNames).toEqual(['channels', 'messages', 'otp', 'replies'])
    })

    it('should create schema successfully on PostgreSQL', async () => {
      // Schema creation is done in beforeEach via PostgresDB.create()
      // Verify tables exist by querying them
      const tables = await pgClient`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'telegram_bot'
        ORDER BY table_name
      `
      const tableNames = tables.map((t: any) => t.table_name).sort((a, b) => a.localeCompare(b))
      expect(tableNames).toEqual(['channels', 'messages', 'otp', 'replies'])
    })

    it('should use correct rowid type for CockroachDB', async () => {
      const columns = await crClient`
        SELECT column_name, column_default, data_type
        FROM information_schema.columns
        WHERE table_schema = 'telegram_bot' 
        AND table_name = 'channels'
        AND column_name = 'rowid'
      `
      expect(columns.length).toBe(1)
      const rowid = columns[0] as any
      expect(rowid.data_type).toBe('bigint')
      // CockroachDB uses unique_rowid() as default
      expect(rowid.column_default).toContain('unique_rowid')
    })

    it('should use correct rowid type for PostgreSQL', async () => {
      const columns = await pgClient`
        SELECT column_name, data_type, is_identity, identity_generation
        FROM information_schema.columns
        WHERE table_schema = 'telegram_bot' 
        AND table_name = 'channels'
        AND column_name = 'rowid'
      `
      expect(columns.length).toBe(1)
      const rowid = columns[0] as any
      expect(rowid.data_type).toBe('bigint')
      // PostgreSQL uses GENERATED ALWAYS AS IDENTITY (SQL standard)
      expect(rowid.is_identity).toBe('YES')
      expect(rowid.identity_generation).toBe('ALWAYS')
    })
  })

  describe('OTP operations', () => {
    it('should insert and retrieve OTP on CockroachDB', async () => {
      const otp: OtpRecord = {
        telegramId: 12345,
        telegramUsername: 'testuser',
        code: 'TEST123',
        expires: new Date(Date.now() + 3600000),
        createdAt: new Date()
      }

      await crDb.insertOtp(otp)
      const retrieved = await crDb.getOtpByCode('TEST123')

      expect(retrieved).toBeDefined()
      expect(retrieved?.telegramId).toBe(12345)
      expect(retrieved?.telegramUsername).toBe('testuser')
      expect(retrieved?.code).toBe('TEST123')
    })

    it('should insert and retrieve OTP on PostgreSQL', async () => {
      const otp: OtpRecord = {
        telegramId: 12345,
        telegramUsername: 'testuser',
        code: 'TEST123',
        expires: new Date(Date.now() + 3600000),
        createdAt: new Date()
      }

      await pgDb.insertOtp(otp)
      const retrieved = await pgDb.getOtpByCode('TEST123')

      expect(retrieved).toBeDefined()
      expect(retrieved?.telegramId).toBe(12345)
      expect(retrieved?.telegramUsername).toBe('testuser')
      expect(retrieved?.code).toBe('TEST123')
    })

    it('should get OTP by telegram ID on both databases', async () => {
      const otp: OtpRecord = {
        telegramId: 67890,
        telegramUsername: 'anotheruser',
        code: 'CODE456',
        expires: new Date(Date.now() + 3600000),
        createdAt: new Date()
      }

      await crDb.insertOtp(otp)
      await pgDb.insertOtp(otp)

      const crRetrieved = await crDb.getOtpByTelegramId(67890)
      const pgRetrieved = await pgDb.getOtpByTelegramId(67890)

      expect(crRetrieved?.code).toBe('CODE456')
      expect(pgRetrieved?.code).toBe('CODE456')
    })

    it('should remove expired OTP on both databases', async () => {
      const expiredOtp: OtpRecord = {
        telegramId: 11111,
        telegramUsername: 'expired',
        code: 'EXPIRED',
        expires: new Date(Date.now() - 1000), // Expired
        createdAt: new Date()
      }

      await crDb.insertOtp(expiredOtp)
      await pgDb.insertOtp(expiredOtp)

      await crDb.removeExpiredOtp()
      await pgDb.removeExpiredOtp()

      const crRetrieved = await crDb.getOtpByCode('EXPIRED')
      const pgRetrieved = await pgDb.getOtpByCode('EXPIRED')

      expect(crRetrieved).toBeUndefined()
      expect(pgRetrieved).toBeUndefined()
    })
  })

  describe('Channel operations', () => {
    it('should insert and retrieve channels on CockroachDB', async () => {
      const channel: Omit<ChannelRecord, 'rowId'> = {
        workspace: testWorkspace,
        account: testAccount,
        _id: 'channel1' as any,
        _class: 'class:chunter:Space' as any,
        name: 'Test Channel'
      }

      await crDb.insertChannel(channel)
      const channels = await crDb.getChannels(testAccount, testWorkspace)

      expect(channels.length).toBe(1)
      expect(channels[0].name).toBe('Test Channel')
      expect(channels[0]._id).toBe('channel1')
      expect(channels[0].rowId).toBeDefined()
    })

    it('should insert and retrieve channels on PostgreSQL', async () => {
      const channel: Omit<ChannelRecord, 'rowId'> = {
        workspace: testWorkspace,
        account: testAccount,
        _id: 'channel1' as any,
        _class: 'class:chunter:Space' as any,
        name: 'Test Channel'
      }

      await pgDb.insertChannel(channel)
      const channels = await pgDb.getChannels(testAccount, testWorkspace)

      expect(channels.length).toBe(1)
      expect(channels[0].name).toBe('Test Channel')
      expect(channels[0]._id).toBe('channel1')
      expect(channels[0].rowId).toBeDefined()
    })

    it('should update channel name on both databases', async () => {
      const channel: Omit<ChannelRecord, 'rowId'> = {
        workspace: testWorkspace,
        account: testAccount,
        _id: 'channel2' as any,
        _class: 'class:chunter:Space' as any,
        name: 'Original Name'
      }

      await crDb.insertChannel(channel)
      await pgDb.insertChannel(channel)

      const crChannels = await crDb.getChannels(testAccount, testWorkspace)
      const pgChannels = await pgDb.getChannels(testAccount, testWorkspace)

      const crChannelId = crChannels.find(c => c._id === 'channel2')?.rowId
      const pgChannelId = pgChannels.find(c => c._id === 'channel2')?.rowId

      expect(crChannelId).toBeDefined()
      expect(pgChannelId).toBeDefined()

      if (crChannelId != null) {
        await crDb.updateChannelName(crChannelId, 'Updated Name')
        const updated = await crDb.getChannel(testAccount, crChannelId)
        expect(updated?.name).toBe('Updated Name')
      }

      if (pgChannelId != null) {
        await pgDb.updateChannelName(pgChannelId, 'Updated Name')
        const updated = await pgDb.getChannel(testAccount, pgChannelId)
        expect(updated?.name).toBe('Updated Name')
      }
    })
  })

  describe('Message operations', () => {
    it('should insert and retrieve messages on CockroachDB', async () => {
      const message: MessageRecord = {
        messageId: 'msg1' as any,
        workspace: testWorkspace,
        account: testAccount,
        telegramMessageId: 1001
      }

      await crDb.insertMessage(message)
      const retrieved = await crDb.getMessageByRef(testAccount, 'msg1' as any)

      expect(retrieved).toBeDefined()
      expect(retrieved?.telegramMessageId).toBe(1001)
      expect(retrieved?.messageId).toBe('msg1')
    })

    it('should insert and retrieve messages on PostgreSQL', async () => {
      const message: MessageRecord = {
        messageId: 'msg1' as any,
        workspace: testWorkspace,
        account: testAccount,
        telegramMessageId: 1001
      }

      await pgDb.insertMessage(message)
      const retrieved = await pgDb.getMessageByRef(testAccount, 'msg1' as any)

      expect(retrieved).toBeDefined()
      expect(retrieved?.telegramMessageId).toBe(1001)
      expect(retrieved?.messageId).toBe('msg1')
    })

    it('should get message by telegram ID on both databases', async () => {
      const message: MessageRecord = {
        messageId: 'msg2' as any,
        workspace: testWorkspace,
        account: testAccount,
        telegramMessageId: 2002
      }

      await crDb.insertMessage(message)
      await pgDb.insertMessage(message)

      const crRetrieved = await crDb.getMessageByTgId(testAccount, 2002)
      const pgRetrieved = await pgDb.getMessageByTgId(testAccount, 2002)

      expect(crRetrieved?.messageId).toBe('msg2')
      expect(pgRetrieved?.messageId).toBe('msg2')
    })
  })

  describe('Reply operations', () => {
    it('should insert and retrieve replies on CockroachDB', async () => {
      const reply: ReplyRecord = {
        messageId: 'msg3' as any,
        telegramUserId: 3003,
        replyId: 4004
      }

      await crDb.insertReply(reply)
      const retrieved = await crDb.getReply(3003, 4004)

      expect(retrieved).toBeDefined()
      expect(retrieved?.messageId).toBe('msg3')
      expect(retrieved?.telegramUserId).toBe(3003)
      expect(retrieved?.replyId).toBe(4004)
    })

    it('should insert and retrieve replies on PostgreSQL', async () => {
      const reply: ReplyRecord = {
        messageId: 'msg3' as any,
        telegramUserId: 3003,
        replyId: 4004
      }

      await pgDb.insertReply(reply)
      const retrieved = await pgDb.getReply(3003, 4004)

      expect(retrieved).toBeDefined()
      expect(retrieved?.messageId).toBe('msg3')
      expect(retrieved?.telegramUserId).toBe(3003)
      expect(retrieved?.replyId).toBe(4004)
    })
  })
})

async function initPostgreSQL (adminClient: postgres.Sql, dbUuid: string): Promise<void> {
  // Clean up any leftover test databases with prefix 'telegrambotdb' for Postgres
  const existingPgs = await adminClient`
    SELECT datname FROM pg_database WHERE datname LIKE 'telegrambotdb%'
  `
  for (const row of existingPgs) {
    try {
      await adminClient`DROP DATABASE IF EXISTS ${adminClient(row.datname)}`
    } catch (err: any) {
      // Ignore, PostgreSQL says database is being used by other users
    }
  }
  await adminClient`CREATE DATABASE ${adminClient(dbUuid)}`
}

async function initCockroachDB (adminClient: postgres.Sql, dbUuid: string): Promise<void> {
  // Clean up any leftover test databases with prefix 'telegrambotdb'
  const existingCrs = await adminClient`
    SELECT datname FROM pg_database WHERE datname LIKE 'telegrambotdb%'
  `
  for (const row of existingCrs) {
    await adminClient`DROP DATABASE IF EXISTS ${adminClient(row.datname)} CASCADE`
  }
  await adminClient`CREATE DATABASE ${adminClient(dbUuid)}`
}
