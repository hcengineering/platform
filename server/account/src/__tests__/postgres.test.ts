//
// Copyright © 2025 Hardcore Engineering Inc.
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
  AccountRole,
  Data,
  Version,
  type PersonUuid,
  type WorkspaceMode,
  type WorkspaceUuid
} from '@hcengineering/core'
import { AccountPostgresDbCollection, PostgresAccountDB, PostgresDbCollection } from '../collections/postgres'
import { Sql } from 'postgres'

interface TestWorkspace {
  uuid: WorkspaceUuid
  mode: WorkspaceMode
  name: string
  processingAttempts?: number
  lastProcessingTime?: number
}

describe('PostgresDbCollection', () => {
  let mockClient: any
  let collection: PostgresDbCollection<TestWorkspace, 'uuid'>

  beforeEach(() => {
    mockClient = {
      unsafe: jest.fn().mockResolvedValue([]) // Default to empty array result
    }

    collection = new PostgresDbCollection<TestWorkspace, 'uuid'>('workspace', mockClient as Sql, 'uuid')
  })

  describe('getTableName', () => {
    it('should return table name with default namespace', () => {
      expect(collection.getTableName()).toBe('global_account.workspace')
    })

    it('should return table name without namespace when ns is empty', () => {
      collection = new PostgresDbCollection<TestWorkspace, 'uuid'>('workspace', mockClient as Sql, 'uuid', '')
      expect(collection.getTableName()).toBe('workspace')
    })

    it('should return table name with custom namespace when ns is provided', () => {
      collection = new PostgresDbCollection<TestWorkspace, 'uuid'>(
        'workspace',
        mockClient as Sql,
        'uuid',
        'custom_account'
      )
      expect(collection.getTableName()).toBe('custom_account.workspace')
    })
  })

  describe('find', () => {
    it('should generate simple query', async () => {
      await collection.find({ mode: 'active' as const })

      expect(mockClient.unsafe).toHaveBeenCalledWith('SELECT * FROM global_account.workspace WHERE "mode" = $1', [
        'active'
      ])
    })

    it('should handle $in operator', async () => {
      await collection.find({
        mode: { $in: ['active' as const, 'creating' as const] }
      })

      expect(mockClient.unsafe).toHaveBeenCalledWith(
        'SELECT * FROM global_account.workspace WHERE "mode" IN ($1, $2)',
        ['active', 'creating']
      )
    })

    it('should handle comparison operators', async () => {
      await collection.find({
        processingAttempts: { $lt: 3 },
        lastProcessingTime: { $gt: 1000 }
      })

      expect(mockClient.unsafe).toHaveBeenCalledWith(
        'SELECT * FROM global_account.workspace WHERE "processing_attempts" < $1 AND "last_processing_time" > $2',
        [3, 1000]
      )
    })

    it('should apply sort', async () => {
      await collection.find({ mode: 'active' as const }, { lastProcessingTime: 'descending', name: 'ascending' })

      expect(mockClient.unsafe).toHaveBeenCalledWith(
        'SELECT * FROM global_account.workspace WHERE "mode" = $1 ORDER BY "last_processing_time" DESC, "name" ASC',
        ['active']
      )
    })

    it('should apply limit', async () => {
      await collection.find({ mode: 'active' as const }, undefined, 10)

      expect(mockClient.unsafe).toHaveBeenCalledWith(
        'SELECT * FROM global_account.workspace WHERE "mode" = $1 LIMIT 10',
        ['active']
      )
    })

    it('should convert snake_case to camelCase in results', async () => {
      mockClient.unsafe.mockResolvedValue([
        {
          uuid: 'ws1',
          mode: 'active',
          name: 'Test',
          processing_attempts: 1,
          last_processing_time: 1000
        }
      ])

      const result = await collection.find({})

      expect(result).toEqual([
        {
          uuid: 'ws1',
          mode: 'active',
          name: 'Test',
          processingAttempts: 1,
          lastProcessingTime: 1000
        }
      ])
    })
  })

  describe('findOne', () => {
    it('should use find with limit 1', async () => {
      await collection.findOne({ uuid: 'ws1' as WorkspaceUuid })

      expect(mockClient.unsafe).toHaveBeenCalledWith(
        'SELECT * FROM global_account.workspace WHERE "uuid" = $1 LIMIT 1',
        ['ws1']
      )
    })
  })

  describe('insertOne', () => {
    it('should generate insert query with returning', async () => {
      mockClient.unsafe.mockResolvedValue([{ uuid: 'ws1' }])

      const doc = {
        mode: 'pending-creation' as const,
        name: 'New Workspace'
      }

      await collection.insertOne(doc)

      expect(mockClient.unsafe).toHaveBeenCalledWith(
        'INSERT INTO global_account.workspace ("mode", "name") VALUES ($1, $2) RETURNING *',
        ['pending-creation', 'New Workspace']
      )
    })
  })

  describe('updateOne', () => {
    it('should handle simple field updates', async () => {
      await collection.updateOne({ uuid: 'ws1' as WorkspaceUuid }, { mode: 'creating' as const })

      expect(mockClient.unsafe).toHaveBeenCalledWith(
        'UPDATE global_account.workspace SET "mode" = $1 WHERE "uuid" = $2',
        ['creating', 'ws1']
      )
    })

    it('should handle increment operations', async () => {
      await collection.updateOne({ uuid: 'ws1' as WorkspaceUuid }, { $inc: { processingAttempts: 1 } })

      expect(mockClient.unsafe).toHaveBeenCalledWith(
        'UPDATE global_account.workspace SET "processing_attempts" = "processing_attempts" + $1 WHERE "uuid" = $2',
        [1, 'ws1']
      )
    })
  })

  describe('deleteMany', () => {
    it('should generate delete query', async () => {
      await collection.deleteMany({ mode: 'deleted' as const })

      expect(mockClient.unsafe).toHaveBeenCalledWith('DELETE FROM global_account.workspace WHERE "mode" = $1', [
        'deleted'
      ])
    })
  })
})

describe('AccountPostgresDbCollection', () => {
  let mockClient: any
  let collection: AccountPostgresDbCollection

  beforeEach(() => {
    mockClient = {
      unsafe: jest.fn().mockResolvedValue([])
    }

    collection = new AccountPostgresDbCollection(mockClient as Sql)
  })

  describe('getTableName', () => {
    it('should return correct table name', () => {
      expect(collection.getTableName()).toBe('global_account.account')
    })
  })

  describe('getPasswordsTableName', () => {
    it('should return correct passwords table name', () => {
      expect(collection.getPasswordsTableName()).toBe('global_account.account_passwords')
    })
  })

  describe('find', () => {
    it('should join with passwords table', async () => {
      const mockResult = [
        {
          uuid: 'acc1' as PersonUuid,
          timezone: 'UTC',
          locale: 'en',
          hash: null,
          salt: null
        }
      ]
      mockClient.unsafe.mockResolvedValue(mockResult)

      const result = await collection.find({ uuid: 'acc1' as PersonUuid })

      expect(mockClient.unsafe).toHaveBeenCalledWith(
        `SELECT * FROM (
      SELECT 
        a.uuid,
        a.timezone,
        a.locale,
        a.automatic,
        p.hash,
        p.salt
      FROM global_account.account as a
        LEFT JOIN global_account.account_passwords as p ON p.account_uuid = a.uuid
    ) WHERE "uuid" = $1`,
        ['acc1']
      )
      expect(result).toEqual(mockResult)
    })

    it('should convert buffer fields from database', async () => {
      const mockResult = [
        {
          uuid: 'acc1' as PersonUuid,
          timezone: 'UTC',
          locale: 'en',
          hash: { 0: 1, 1: 2, 3: 3 }, // Simulating buffer data from DB
          salt: { 0: 4, 1: 5, 2: 6 }
        }
      ]
      mockClient.unsafe.mockResolvedValue(mockResult)

      const result = await collection.find({ uuid: 'acc1' as PersonUuid })

      expect(result[0].hash).toBeInstanceOf(Buffer)
      expect(result[0].salt).toBeInstanceOf(Buffer)
      expect(Buffer.from(result[0].hash as any).toString('hex')).toBe(Buffer.from([1, 2, 3]).toString('hex'))
      expect(Buffer.from(result[0].salt as any).toString('hex')).toBe(Buffer.from([4, 5, 6]).toString('hex'))
    })

    it('should throw error if querying by password fields', async () => {
      await expect(collection.find({ hash: Buffer.from([]) })).rejects.toThrow(
        'Passwords are not allowed in find query conditions'
      )
      await expect(collection.find({ salt: Buffer.from([]) })).rejects.toThrow(
        'Passwords are not allowed in find query conditions'
      )
    })
  })

  describe('insertOne', () => {
    it('should prevent inserting password fields', async () => {
      const doc = {
        uuid: 'acc1' as PersonUuid,
        hash: Buffer.from([]),
        salt: Buffer.from([])
      }

      await expect(collection.insertOne(doc)).rejects.toThrow('Passwords are not allowed in insert query')
    })

    it('should allow inserting non-password fields', async () => {
      const doc = {
        uuid: 'acc1' as PersonUuid,
        timezone: 'UTC',
        locale: 'en'
      }
      mockClient.unsafe.mockResolvedValue([{ uuid: 'acc1' }])

      await collection.insertOne(doc)

      expect(mockClient.unsafe).toHaveBeenCalledWith(
        'INSERT INTO global_account.account ("uuid", "timezone", "locale") VALUES ($1, $2, $3) RETURNING *',
        ['acc1', 'UTC', 'en']
      )
    })
  })

  describe('updateOne', () => {
    it('should prevent updating with password fields in query', async () => {
      await expect(collection.updateOne({ hash: Buffer.from([]) }, { timezone: 'UTC' })).rejects.toThrow(
        'Passwords are not allowed in update query'
      )
    })

    it('should prevent updating password fields', async () => {
      await expect(
        collection.updateOne({ uuid: 'acc1' as PersonUuid }, { hash: Buffer.from([]), salt: Buffer.from([]) })
      ).rejects.toThrow('Passwords are not allowed in update query')
    })

    it('should allow updating non-password fields', async () => {
      await collection.updateOne({ uuid: 'acc1' as PersonUuid }, { timezone: 'UTC', locale: 'en' })

      expect(mockClient.unsafe).toHaveBeenCalledWith(
        'UPDATE global_account.account SET "timezone" = $1, "locale" = $2 WHERE "uuid" = $3',
        ['UTC', 'en', 'acc1']
      )
    })
  })

  describe('deleteMany', () => {
    it('should prevent deleting by password fields', async () => {
      await expect(collection.deleteMany({ hash: Buffer.from([]) })).rejects.toThrow(
        'Passwords are not allowed in delete query'
      )
    })

    it('should allow deleting by non-password fields', async () => {
      await collection.deleteMany({ uuid: 'acc1' as PersonUuid })

      expect(mockClient.unsafe).toHaveBeenCalledWith('DELETE FROM global_account.account WHERE "uuid" = $1', ['acc1'])
    })
  })
})

describe('PostgresAccountDB', () => {
  let mockClient: any
  let accountDb: PostgresAccountDB
  let spyTag: jest.Mock
  let spyValue: any = []

  beforeEach(() => {
    // Create a spy that returns a Promise
    spyTag = jest.fn().mockImplementation(() => Promise.resolve(spyValue))

    // Create base function that's also a tag function
    const mock: any = Object.assign(spyTag, {
      unsafe: jest.fn().mockResolvedValue([]),
      begin: jest.fn().mockImplementation((callback) => callback(mock))
    })

    mockClient = mock
    accountDb = new PostgresAccountDB(mockClient)
  })

  afterEach(() => {
    spyValue = []
  })

  describe('init', () => {
    it('should apply migrations in transaction', async () => {
      spyValue = {
        count: 1
      }
      await accountDb.migrate('test_migration', 'CREATE TABLE test')

      expect(mockClient.begin).toHaveBeenCalled()
      expect(mockClient).toHaveBeenCalledWith(
        'global_account' // First call with schema name
      )
      expect(mockClient).toHaveBeenCalledWith(
        ['INSERT INTO ', '._account_applied_migrations (identifier, ddl) VALUES (', ', ', ') ON CONFLICT DO NOTHING'],
        expect.anything(),
        'test_migration',
        'CREATE TABLE test'
      )
      expect(mockClient.unsafe).toHaveBeenCalledWith('CREATE TABLE test')
    })
  })

  describe('workspace operations', () => {
    const accountId = 'acc1' as PersonUuid
    const workspaceId = 'ws1' as WorkspaceUuid
    const role = AccountRole.Owner

    describe('workspace member operations', () => {
      it('should assign workspace member', async () => {
        await accountDb.assignWorkspace(accountId, workspaceId, role)

        expect(mockClient).toHaveBeenCalledWith('global_account.workspace_members')
        expect(mockClient).toHaveBeenCalledWith(
          ['INSERT INTO ', ' (workspace_uuid, account_uuid, role) VALUES (', ', ', ', ', ')'],
          expect.anything(),
          workspaceId,
          accountId,
          role
        )
      })

      it('should unassign workspace member', async () => {
        await accountDb.unassignWorkspace(accountId, workspaceId)

        expect(mockClient).toHaveBeenCalledWith('global_account.workspace_members')
        expect(mockClient).toHaveBeenCalledWith(
          ['DELETE FROM ', ' WHERE workspace_uuid = ', ' AND account_uuid = ', ''],
          expect.anything(),
          workspaceId,
          accountId
        )
      })

      it('should update workspace role', async () => {
        await accountDb.updateWorkspaceRole(accountId, workspaceId, role)

        expect(mockClient).toHaveBeenCalledWith('global_account.workspace_members')
        expect(mockClient).toHaveBeenCalledWith(
          ['UPDATE ', ' SET role = ', ' WHERE workspace_uuid = ', ' AND account_uuid = ', ''],
          expect.anything(),
          role,
          workspaceId,
          accountId
        )
      })

      it('should get workspace role', async () => {
        mockClient.unsafe.mockResolvedValue([{ role }])

        await accountDb.getWorkspaceRole(accountId, workspaceId)

        expect(mockClient).toHaveBeenCalledWith('global_account.workspace_members')
        expect(mockClient).toHaveBeenCalledWith(
          ['SELECT role FROM ', ' WHERE workspace_uuid = ', ' AND account_uuid = ', ''],
          expect.anything(),
          workspaceId,
          accountId
        )
      })

      it('should get workspace members', async () => {
        spyValue = [
          { account_uuid: 'acc1', role: AccountRole.Owner },
          { account_uuid: 'acc2', role: AccountRole.Maintainer }
        ]

        const result = await accountDb.getWorkspaceMembers(workspaceId)

        expect(mockClient).toHaveBeenCalledWith('global_account.workspace_members')
        expect(mockClient).toHaveBeenCalledWith(
          ['SELECT account_uuid, role FROM ', ' WHERE workspace_uuid = ', ''],
          expect.anything(),
          workspaceId
        )

        expect(result).toEqual([
          { person: 'acc1', role: AccountRole.Owner },
          { person: 'acc2', role: AccountRole.Maintainer }
        ])
      })
    })

    describe('getAccountWorkspaces', () => {
      it('should return workspaces with status and converted keys', async () => {
        const mockWorkspaces = [
          {
            uuid: workspaceId,
            name: 'Test',
            url: 'test',
            status: {
              mode: 'active',
              version_major: 1,
              version_minor: 0,
              version_patch: 0,
              is_disabled: false
            }
          }
        ]
        mockClient.unsafe.mockResolvedValue(mockWorkspaces)

        const res = await accountDb.getAccountWorkspaces(accountId)

        expect(mockClient.unsafe).toHaveBeenCalledWith(expect.any(String), [accountId])
        expect(res[0]).toEqual({
          uuid: workspaceId,
          name: 'Test',
          url: 'test',
          status: {
            mode: 'active',
            versionMajor: 1,
            versionMinor: 0,
            versionPatch: 0,
            isDisabled: false
          }
        })
      })
    })

    describe('getPendingWorkspace', () => {
      const version: Data<Version> = { major: 1, minor: 0, patch: 0 }
      const processingTimeoutMs = 5000
      const wsLivenessMs = 300000 // 5 minutes
      const NOW = 1234567890000 // Fixed timestamp

      beforeEach(() => {
        jest.spyOn(Date, 'now').mockReturnValue(NOW)
      })

      afterEach(() => {
        jest.restoreAllMocks()
      })

      it('should get pending creation workspace', async () => {
        await accountDb.getPendingWorkspace('', version, 'create', processingTimeoutMs)

        expect(mockClient.unsafe.mock.calls[0][0].replace(/\s+/g, ' ')).toEqual(
          `SELECT
              w.uuid,
              w.name,
              w.url,
              w.branding,
              w.location,
              w.region,
              w.created_by,
              w.created_on,
              w.billing_account,
              json_build_object(
                'mode', s.mode,
                'processing_progress', s.processing_progress,
                'version_major', s.version_major,
                'version_minor', s.version_minor,
                'version_patch', s.version_patch,
                'last_processing_time', s.last_processing_time,
                'last_visit', s.last_visit,
                'is_disabled', s.is_disabled,
                'processing_attempts', s.processing_attempts,
                'processing_message', s.processing_message,
                'backup_info', s.backup_info
              ) status
               FROM global_account.workspace as w
               INNER JOIN global_account.workspace_status as s ON s.workspace_uuid = w.uuid
               WHERE s.mode IN ('pending-creation', 'creating')
               AND s.mode <> 'manual-creation'
               AND (s.processing_attempts IS NULL OR s.processing_attempts <= 3)
               AND (s.last_processing_time IS NULL OR s.last_processing_time < $1)
               AND (w.region IS NULL OR w.region = '')
               ORDER BY s.last_visit DESC
               LIMIT 1
               FOR UPDATE SKIP LOCKED`.replace(/\s+/g, ' ')
        )
        expect(mockClient.unsafe.mock.calls[0][1]).toEqual([NOW - processingTimeoutMs])
      })

      it('should get workspace pending upgrade', async () => {
        await accountDb.getPendingWorkspace('', version, 'upgrade', processingTimeoutMs, wsLivenessMs)

        expect(
          mockClient.unsafe.mock.calls[0][0].replace(/\s+/g, ' ').replace(/\(\s/g, '(').replace(/\s\)/g, ')')
        ).toEqual(
          `SELECT 
              w.uuid,
              w.name,
              w.url,
              w.branding,
              w.location,
              w.region,
              w.created_by,
              w.created_on,
              w.billing_account, 
              json_build_object(
                'mode', s.mode,
                'processing_progress', s.processing_progress,
                'version_major', s.version_major,
                'version_minor', s.version_minor,
                'version_patch', s.version_patch,
                'last_processing_time', s.last_processing_time,
                'last_visit', s.last_visit,
                'is_disabled', s.is_disabled,
                'processing_attempts', s.processing_attempts,
                'processing_message', s.processing_message,
                'backup_info', s.backup_info
              ) status
               FROM global_account.workspace as w
               INNER JOIN global_account.workspace_status as s ON s.workspace_uuid = w.uuid
               WHERE (
                  (
                      (s.is_disabled = FALSE OR s.is_disabled IS NULL)
                      AND (s.mode = 'active' OR s.mode IS NULL)
                      AND (
                          s.version_major < $1
                          OR (s.version_major = $1 AND s.version_minor < $2)
                          OR (s.version_major = $1 AND s.version_minor = $2 AND s.version_patch < $3)
                      )
                      AND s.last_visit > $4
                  )
                  OR
                  (
                      (s.is_disabled = FALSE OR s.is_disabled IS NULL)
                      AND s.mode = 'upgrading'
                  )
               )
               AND s.mode <> 'manual-creation'
               AND (s.processing_attempts IS NULL OR s.processing_attempts <= 3)
               AND (s.last_processing_time IS NULL OR s.last_processing_time < $5)
               AND (w.region IS NULL OR w.region = '')
               ORDER BY s.last_visit DESC
               LIMIT 1
               FOR UPDATE SKIP LOCKED`
            .replace(/\s+/g, ' ')
            .replace(/\(\s/g, '(')
            .replace(/\s\)/g, ')')
        )
        expect(mockClient.unsafe.mock.calls[0][1]).toEqual([
          version.major,
          version.minor,
          version.patch,
          NOW - wsLivenessMs,
          NOW - processingTimeoutMs
        ])
      })

      it('should get workspace for all operations', async () => {
        await accountDb.getPendingWorkspace('', version, 'all', processingTimeoutMs, wsLivenessMs)

        expect(
          mockClient.unsafe.mock.calls[0][0].replace(/\s+/g, ' ').replace(/\(\s/g, '(').replace(/\s\)/g, ')')
        ).toEqual(
          `SELECT 
              w.uuid,
              w.name,
              w.url,
              w.branding,
              w.location,
              w.region,
              w.created_by,
              w.created_on,
              w.billing_account, 
              json_build_object(
                'mode', s.mode,
                'processing_progress', s.processing_progress,
                'version_major', s.version_major,
                'version_minor', s.version_minor,
                'version_patch', s.version_patch,
                'last_processing_time', s.last_processing_time,
                'last_visit', s.last_visit,
                'is_disabled', s.is_disabled,
                'processing_attempts', s.processing_attempts,
                'processing_message', s.processing_message,
                'backup_info', s.backup_info
              ) status
               FROM global_account.workspace as w
               INNER JOIN global_account.workspace_status as s ON s.workspace_uuid = w.uuid
               WHERE (
                  s.mode IN ('pending-creation', 'creating')
                  OR
                  (
                    (
                      (s.is_disabled = FALSE OR s.is_disabled IS NULL)
                      AND (s.mode = 'active' OR s.mode IS NULL)
                      AND (
                        s.version_major < $1
                        OR (s.version_major = $1 AND s.version_minor < $2)
                        OR (s.version_major = $1 AND s.version_minor = $2 AND s.version_patch < $3)
                      )
                      AND s.last_visit > $4
                    )
                    OR
                    (
                      (s.is_disabled = FALSE OR s.is_disabled IS NULL)
                      AND s.mode = 'upgrading'
                    )
                  )
               )
               AND s.mode <> 'manual-creation'
               AND (s.processing_attempts IS NULL OR s.processing_attempts <= 3)
               AND (s.last_processing_time IS NULL OR s.last_processing_time < $5)
               AND (w.region IS NULL OR w.region = '')
               ORDER BY s.last_visit DESC
               LIMIT 1
               FOR UPDATE SKIP LOCKED`
            .replace(/\s+/g, ' ')
            .replace(/\(\s/g, '(')
            .replace(/\s\)/g, ')')
        )
        expect(mockClient.unsafe.mock.calls[0][1]).toEqual([
          version.major,
          version.minor,
          version.patch,
          NOW - wsLivenessMs,
          NOW - processingTimeoutMs
        ])
      })

      it('should get workspace for all+backup operations', async () => {
        await accountDb.getPendingWorkspace('', version, 'all+backup', processingTimeoutMs, wsLivenessMs)

        expect(
          mockClient.unsafe.mock.calls[0][0].replace(/\s+/g, ' ').replace(/\(\s/g, '(').replace(/\s\)/g, ')')
        ).toEqual(
          `SELECT 
              w.uuid,
              w.name,
              w.url,
              w.branding,
              w.location,
              w.region,
              w.created_by,
              w.created_on,
              w.billing_account, 
              json_build_object(
                'mode', s.mode,
                'processing_progress', s.processing_progress,
                'version_major', s.version_major,
                'version_minor', s.version_minor,
                'version_patch', s.version_patch,
                'last_processing_time', s.last_processing_time,
                'last_visit', s.last_visit,
                'is_disabled', s.is_disabled,
                'processing_attempts', s.processing_attempts,
                'processing_message', s.processing_message,
                'backup_info', s.backup_info
              ) status
               FROM global_account.workspace as w
               INNER JOIN global_account.workspace_status as s ON s.workspace_uuid = w.uuid
               WHERE (
                 s.mode IN ('pending-creation', 'creating')
                 OR
                  (
                    (
                      (s.is_disabled = FALSE OR s.is_disabled IS NULL)
                      AND (s.mode = 'active' OR s.mode IS NULL)
                      AND (
                        s.version_major < $1
                        OR (s.version_major = $1 AND s.version_minor < $2)
                        OR (s.version_major = $1 AND s.version_minor = $2 AND s.version_patch < $3)
                      )
                      AND s.last_visit > $4
                    )
                    OR
                    (
                      (s.is_disabled = FALSE OR s.is_disabled IS NULL)
                      AND s.mode = 'upgrading'
                    )
                  )
                 OR
                 s.mode IN (
                   'migration-backup',
                   'migration-pending-backup',
                   'migration-clean',
                   'migration-pending-clean'
                 )
                 OR
                 s.mode IN (
                   'archiving-pending-backup',
                   'archiving-backup',
                   'archiving-pending-clean',
                   'archiving-clean'
                 )
                 OR
                 s.mode IN ('pending-restore', 'restoring')
                 OR
                 s.mode IN ('pending-deletion', 'deleting')
               )
               AND s.mode <> 'manual-creation'
               AND (s.processing_attempts IS NULL OR s.processing_attempts <= 3)
               AND (s.last_processing_time IS NULL OR s.last_processing_time < $5)
               AND (w.region IS NULL OR w.region = '')
               ORDER BY s.last_visit DESC
               LIMIT 1
               FOR UPDATE SKIP LOCKED`
            .replace(/\s+/g, ' ')
            .replace(/\(\s/g, '(')
            .replace(/\s\)/g, ')')
        )
        expect(mockClient.unsafe.mock.calls[0][1]).toEqual([
          version.major,
          version.minor,
          version.patch,
          NOW - wsLivenessMs,
          NOW - processingTimeoutMs
        ])
      })

      it('should filter by region when specified', async () => {
        const region = 'us-east-1'
        await accountDb.getPendingWorkspace(region, version, 'create', processingTimeoutMs)

        expect(
          mockClient.unsafe.mock.calls[0][0].replace(/\s+/g, ' ').replace(/\(\s/g, '(').replace(/\s\)/g, ')')
        ).toEqual(
          `SELECT 
              w.uuid,
              w.name,
              w.url,
              w.branding,
              w.location,
              w.region,
              w.created_by,
              w.created_on,
              w.billing_account, 
              json_build_object(
                'mode', s.mode,
                'processing_progress', s.processing_progress,
                'version_major', s.version_major,
                'version_minor', s.version_minor,
                'version_patch', s.version_patch,
                'last_processing_time', s.last_processing_time,
                'last_visit', s.last_visit,
                'is_disabled', s.is_disabled,
                'processing_attempts', s.processing_attempts,
                'processing_message', s.processing_message,
                'backup_info', s.backup_info
              ) status
               FROM global_account.workspace as w
               INNER JOIN global_account.workspace_status as s ON s.workspace_uuid = w.uuid
               WHERE s.mode IN ('pending-creation', 'creating')
               AND s.mode <> 'manual-creation'
               AND (s.processing_attempts IS NULL OR s.processing_attempts <= 3)
               AND (s.last_processing_time IS NULL OR s.last_processing_time < $1)
               AND region = $2
               ORDER BY s.last_visit DESC
               LIMIT 1
               FOR UPDATE SKIP LOCKED`
            .replace(/\s+/g, ' ')
            .replace(/\(\s/g, '(')
            .replace(/\s\)/g, ')')
        )
        expect(mockClient.unsafe.mock.calls[0][1]).toEqual([NOW - processingTimeoutMs, region])
      })

      // Should also verify update after fetch
      it('should update processing attempts and time after fetch', async () => {
        const wsUuid = 'ws1'
        mockClient.unsafe.mockResolvedValueOnce([{ uuid: wsUuid }])

        await accountDb.getPendingWorkspace('', version, 'create', processingTimeoutMs)

        expect(
          mockClient.unsafe.mock.calls[1][0].replace(/\s+/g, ' ').replace(/\(\s/g, '(').replace(/\s\)/g, ')')
        ).toEqual(
          `UPDATE global_account.workspace_status 
           SET processing_attempts = processing_attempts + 1, "last_processing_time" = $1 
           WHERE workspace_uuid = $2`
            .replace(/\s+/g, ' ')
            .replace(/\(\s/g, '(')
            .replace(/\s\)/g, ')')
        )
        expect(mockClient.unsafe.mock.calls[1][1]).toEqual([NOW, wsUuid])
      })

      it('should handle null result', async () => {
        mockClient.unsafe.mockResolvedValueOnce([])

        const result = await accountDb.getPendingWorkspace('', version, 'create', processingTimeoutMs)

        expect(result).toBeUndefined()
      })
    })
  })

  describe('password operations', () => {
    const accountId = 'acc1' as PersonUuid
    const hash: any = {
      buffer: Buffer.from('hash')
    }
    const salt: any = {
      buffer: Buffer.from('salt')
    }

    it('should set password', async () => {
      await accountDb.setPassword(accountId, hash, salt)

      expect(mockClient).toHaveBeenCalledWith('global_account.account_passwords')
      expect(mockClient).toHaveBeenCalledWith(
        ['UPSERT INTO ', ' (account_uuid, hash, salt) VALUES (', ', ', '::bytea, ', '::bytea)'],
        expect.anything(),
        accountId,
        hash.buffer,
        salt.buffer
      )
    })

    it('should reset password', async () => {
      await accountDb.resetPassword(accountId)

      expect(mockClient).toHaveBeenCalledWith('global_account.account_passwords')
      expect(mockClient).toHaveBeenCalledWith(
        ['DELETE FROM ', ' WHERE account_uuid = ', ''],
        expect.anything(),
        accountId
      )
    })
  })
})
