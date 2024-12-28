//
// Copyright © 2024 Hardcore Engineering Inc.
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
import { Sql } from 'postgres'
import { type Data, type Version, AccountRole } from '@hcengineering/core'

import type {
  DbCollection,
  Query,
  Operations,
  Workspace,
  WorkspaceDbCollection,
  WorkspaceOperation,
  AccountDB,
  Account,
  OTP,
  WorkspaceInvite,
  AccountEvent,
  SocialId,
  Person,
  WorkspaceData,
  WorkspaceStatus,
  WorkspaceStatusData,
  WorkspaceInfoWithStatus,
  Sort,
  WorkspaceMemberInfo
} from '../types'

export class PostgresDbCollection<T extends Record<string, any>> implements DbCollection<T> {
  constructor (
    readonly name: string,
    readonly client: Sql
  ) {}

  protected buildSelectClause (): string {
    return `SELECT * FROM ${this.name}`
  }

  protected buildWhereClause (query: Query<T>, lastRefIdx: number = 0): [string, any[]] {
    if (Object.keys(query).length === 0) {
      return ['', []]
    }

    const whereChunks: string[] = []
    const values: any[] = []
    let currIdx: number = lastRefIdx

    for (const key of Object.keys(query)) {
      const qKey = query[key]
      const operator = typeof qKey === 'object' ? Object.keys(qKey)[0] : ''
      switch (operator) {
        case '$in': {
          const inVals = Object.values(qKey as object)[0]
          const inVars: string[] = []
          for (const val of inVals) {
            currIdx++
            inVars.push(`$${currIdx}`)
            values.push(val)
          }
          whereChunks.push(`"${key}" IN (${inVars.join(', ')})`)
          break
        }
        case '$lt': {
          currIdx++
          whereChunks.push(`"${key}" < $${currIdx}`)
          values.push(Object.values(qKey as object)[0])
          break
        }
        case '$lte': {
          currIdx++
          whereChunks.push(`"${key}" <= $${currIdx}`)
          values.push(Object.values(qKey as object)[0])
          break
        }
        case '$gt': {
          currIdx++
          whereChunks.push(`"${key}" > $${currIdx}`)
          values.push(Object.values(qKey as object)[0])
          break
        }
        case '$gte': {
          currIdx++
          whereChunks.push(`"${key}" >= $${currIdx}`)
          values.push(Object.values(qKey as object)[0])
          break
        }
        case '$ne': {
          currIdx++
          whereChunks.push(`"${key}" != $${currIdx}`)
          values.push(Object.values(qKey as object)[0])
          break
        }
        default: {
          currIdx++
          whereChunks.push(`"${key}" = $${currIdx}`)
          values.push(qKey)
        }
      }
    }

    return [`WHERE ${whereChunks.join(' AND ')}`, values]
  }

  protected buildSortClause (sort: Sort<T>): string {
    const sortChunks: string[] = []

    for (const key of Object.keys(sort)) {
      sortChunks.push(`"${key}" ${sort[key] === 'ascending' ? 'ASC' : 'DESC'}`)
    }

    return `ORDER BY ${sortChunks.join(', ')}`
  }

  protected convertToObj (row: unknown): T {
    return row as T
  }

  async find (query: Query<T>, sort?: Sort<T>, limit?: number): Promise<T[]> {
    const sqlChunks: string[] = [this.buildSelectClause()]
    const [whereClause, whereValues] = this.buildWhereClause(query)

    if (whereClause !== '') {
      sqlChunks.push(whereClause)
    }

    if (sort !== undefined) {
      sqlChunks.push(this.buildSortClause(sort))
    }

    if (limit !== undefined) {
      sqlChunks.push(`LIMIT ${limit}`)
    }

    const finalSql: string = sqlChunks.join(' ')
    const result = await this.client.unsafe(finalSql, whereValues)

    return result.map((row) => this.convertToObj(row))
  }

  async findOne (query: Query<T>): Promise<T | null> {
    return (await this.find(query, undefined, 1))[0] ?? null
  }

  async insertOne<K extends keyof T | undefined>(
    data: Partial<T>,
    idKey?: K
  ): Promise<K extends keyof T ? T[K] : undefined> {
    const keys: string[] = Object.keys(data)
    const values = Object.values(data)

    const sql = `INSERT INTO ${this.name} (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${keys.map((_, idx) => `$${idx + 1}`).join(', ')})`

    let res: any | undefined
    await this.client.begin(async (client) => {
      res = await client.unsafe(sql, values)
    })

    if (idKey === undefined) {
      return undefined as any
    }

    return res[0][idKey]
  }

  protected buildUpdateClause (ops: Operations<T>, lastRefIdx: number = 0): [string, any[]] {
    const updateChunks: string[] = []
    const values: any[] = []
    let currIdx: number = lastRefIdx

    for (const key of Object.keys(ops)) {
      switch (key) {
        case '$inc': {
          const inc = ops.$inc as Partial<T>

          for (const incKey of Object.keys(inc)) {
            currIdx++
            updateChunks.push(`"${incKey}" = "${incKey}" + $${currIdx}`)
            values.push(inc[incKey])
          }
          break
        }
        default: {
          currIdx++
          updateChunks.push(`"${key}" = $${currIdx}`)
          values.push(ops[key])
        }
      }
    }

    return [`SET ${updateChunks.join(', ')}`, values]
  }

  async updateOne (query: Query<T>, ops: Operations<T>): Promise<void> {
    const sqlChunks: string[] = [`UPDATE ${this.name}`]
    const [updateClause, updateValues] = this.buildUpdateClause(ops)
    const [whereClause, whereValues] = this.buildWhereClause(query, updateValues.length)

    sqlChunks.push(updateClause)
    if (whereClause !== '') {
      sqlChunks.push(whereClause)
    }

    const finalSql = sqlChunks.join(' ')
    await this.client.begin(async (client) => {
      await client.unsafe(finalSql, [...updateValues, ...whereValues])
    })
  }

  async deleteMany (query: Query<T>): Promise<void> {
    const sqlChunks: string[] = [`DELETE FROM ${this.name}`]
    const [whereClause, whereValues] = this.buildWhereClause(query)

    if (whereClause !== '') {
      sqlChunks.push(whereClause)
    }

    const finalSql = sqlChunks.join(' ')
    await this.client.begin(async (client) => {
      await client.unsafe(finalSql, whereValues)
    })
  }
}

export class AccountPostgresDbCollection extends PostgresDbCollection<Account> implements DbCollection<Account> {
  constructor (readonly client: Sql) {
    super('account', client)
  }

  protected buildSelectClause (): string {
    return `SELECT 
      _id, 
      email, 
      hash, 
      salt, 
      first, 
      last, 
      admin, 
      confirmed, 
      "lastWorkspace", 
      "createdOn", 
      "lastVisit", 
      "githubId",
      "openId",
      array(
        SELECT workspace 
        FROM workspace_assignment t 
        WHERE t.account = ${this.name}._id
      ) as workspaces FROM ${this.name}`
  }

  async insertOne<K extends keyof Account | undefined>(
    data: Partial<Account>,
    idKey?: K
  ): Promise<K extends keyof Account ? Account[K] : undefined> {
    // TODO: remove if not needed in the end
    // if (data.workspaces !== undefined) {
    //   if (data.workspaces.length > 0) {
    //     console.warn('Cannot assign workspaces directly')
    //   }

    //   delete data.workspaces
    // }

    return await super.insertOne(data, idKey)
  }
}

export class WorkspacePostgresDbCollection extends PostgresDbCollection<Workspace> implements WorkspaceDbCollection {
  constructor (readonly client: Sql) {
    super('workspace', client)
  }

  protected buildSelectClause (): string {
    return `SELECT 
      _id, 
      workspace,
      disabled,
      json_build_object(
          'major', "versionMajor", 
          'minor', "versionMinor", 
          'patch', "versionPatch"
        ) version,
      branding,
      "workspaceUrl",
      "workspaceName",
      "createdOn",
      "lastVisit",
      "createdBy",
      mode,
      progress,
      endpoint,
      region,
      "lastProcessingTime",
      attempts,
      message,
      "backupInfo",
      array(
        SELECT account 
        FROM workspace_assignment t
        WHERE t.workspace = ${this.name}._id
      ) as accounts FROM ${this.name}`
  }

  objectToDb (data: Partial<Workspace>): any {
    const dbData: any = {
      ...data
    }

    // if (data.members !== undefined) {
    //   if (data.members.length > 0) {
    //     console.warn('Cannot assign members directly')
    //   }

    //   delete dbData.accounts
    // }

    // TODO: proper support for status
    // const version = data.version
    // if (data.version !== undefined) {
    //   delete dbData.version
    //   dbData.versionMajor = version?.major ?? 0
    //   dbData.versionMinor = version?.minor ?? 0
    //   dbData.versionPatch = version?.patch ?? 0
    // }

    return dbData
  }

  async insertOne<K extends keyof Workspace | undefined>(
    data: Partial<Workspace>,
    idKey?: K
  ): Promise<K extends keyof Workspace ? Workspace[K] : undefined> {
    return await super.insertOne(this.objectToDb(data), idKey)
  }

  async updateOne (query: Query<Workspace>, ops: Operations<Workspace>): Promise<void> {
    await super.updateOne(query, this.objectToDb(ops))
  }

  async getPendingWorkspace (
    region: string,
    version: Data<Version>,
    operation: WorkspaceOperation,
    processingTimeoutMs: number,
    wsLivenessMs?: number
  ): Promise<WorkspaceInfoWithStatus | undefined> {
    const sqlChunks: string[] = [`SELECT 
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
           FROM workspace as w
           INNER JOIN workspace_status as s ON s.workspace_uuid = w.uuid
    `]
    const whereChunks: string[] = []
    const values: any[] = []

    const pendingCreationSql = "s.mode IN ('pending-creation', 'creating')"
    const migrationSql =
      "s.mode IN ('migration-backup', 'migration-pending-backup', 'migration-clean', 'migration-pending-clean')"

    const restoringSql = "s.mode IN ('pending-restore', 'restoring')"
    const deletingSql = "s.mode IN ('pending-deletion', 'deleting')"
    const archivingSql = "s.mode IN ('archiving-pending-backup', 'archiving-backup', 'archiving-pending-clean', 'archiving-clean')"
    const versionSql =
      '(s.version_major < $1) OR (s.version_major = $1 AND s.version_minor < $2) OR (s.version_major = $1 AND s.version_minor = $2 AND s.version_patch < $3)'
    const pendingUpgradeSql = `(((s.is_disabled = FALSE OR s.is_disabled IS NULL) AND (s.mode = 'active' OR s.mode IS NULL) AND ${versionSql} ${wsLivenessMs !== undefined ? 'AND s.last_visit > $4' : ''}) OR ((s.is_disabled = FALSE OR s.is_disabled IS NULL) AND s.mode = 'upgrading'))`
    let operationSql: string = ''
    switch (operation) {
      case 'create':
        operationSql = pendingCreationSql
        break
      case 'upgrade':
        operationSql = pendingUpgradeSql
        break
      case 'all':
        operationSql = `(${pendingCreationSql} OR ${pendingUpgradeSql})`
        break
      case 'all+backup':
        operationSql = `(${pendingCreationSql} OR ${pendingUpgradeSql} OR ${migrationSql} OR ${archivingSql} OR ${restoringSql}) OR ${deletingSql}`
        break
    }

    if (operation === 'upgrade' || operation === 'all') {
      values.push(version.major, version.minor, version.patch)

      if (wsLivenessMs !== undefined) {
        values.push(Date.now() - wsLivenessMs)
      }
    }
    whereChunks.push(operationSql)

    // TODO: support returning pending deletion workspaces when we will actually want
    // to clear them with the worker.
    whereChunks.push("s.mode <> 'manual-creation'")
    whereChunks.push('(s.attempts IS NULL OR s.attempts <= 3)')
    whereChunks.push(`(s.last_processing_time IS NULL OR s.last_processing_time < $${values.length + 1})`)
    values.push(Date.now() - processingTimeoutMs)

    if (region !== '') {
      whereChunks.push(`region = $${values.length + 1}`)
      values.push(region)
    } else {
      whereChunks.push("(w.region IS NULL OR w.region = '')")
    }

    sqlChunks.push(`WHERE ${whereChunks.join(' AND ')}`)
    sqlChunks.push('ORDER BY s.last_visit DESC')
    sqlChunks.push('LIMIT 1')
    // Note: SKIP LOCKED is supported starting from Postgres 9.5 and CockroachDB v22.2.1
    sqlChunks.push('FOR UPDATE SKIP LOCKED')

    // We must have all the conditions in the DB query and we cannot filter anything in the code
    // because of possible concurrency between account services.
    let res: any | undefined
    await this.client.begin(async (client) => {
      res = await client.unsafe(sqlChunks.join(' '), values)

      if ((res.length ?? 0) > 0) {
        await client.unsafe(
          `UPDATE ${this.name} SET attempts = attempts + 1, "lastProcessingTime" = $1 WHERE _id = $2`,
          [Date.now(), res[0]._id]
        )
      }
    })

    return res[0] as WorkspaceInfoWithStatus
  }
}

export class PostgresAccountDB implements AccountDB {
  readonly wsMembersName = 'workspace_members'

  person: PostgresDbCollection<Person>
  account: PostgresDbCollection<Account>
  socialId: PostgresDbCollection<SocialId>
  workspace: WorkspacePostgresDbCollection
  workspaceStatus: PostgresDbCollection<WorkspaceStatus>
  accountEvent: PostgresDbCollection<AccountEvent>
  otp: PostgresDbCollection<OTP>
  invite: PostgresDbCollection<WorkspaceInvite>

  constructor (readonly client: Sql) {
    this.person = new PostgresDbCollection<Person>('person', client)
    this.account = new AccountPostgresDbCollection(client)
    this.socialId = new PostgresDbCollection<SocialId>('social_id', client)
    this.workspaceStatus = new PostgresDbCollection<WorkspaceStatus>('workspace_status', client)
    this.workspace = new WorkspacePostgresDbCollection(client)
    this.accountEvent = new PostgresDbCollection<AccountEvent>('account_event', client)
    this.otp = new PostgresDbCollection<OTP>('otp', client)
    this.invite = new PostgresDbCollection<WorkspaceInvite>('invite', client)
  }

  async init (): Promise<void> {
    await this._init()

    // Apply all the migrations
    for (const migration of this.getMigrations()) {
      await this.migrate(migration[0], migration[1])
    }
  }

  async migrate (name: string, ddl: string): Promise<void> {
    await this.client.begin(async (client) => {
      const res =
        await client`INSERT INTO _account_applied_migrations (identifier, ddl) VALUES (${name}, ${ddl}) ON CONFLICT DO NOTHING`

      if (res.count === 1) {
        console.log(`Applying migration: ${name}`)
        await client.unsafe(ddl)
      } else {
        console.log(`Migration ${name} already applied`)
      }
    })
  }

  async _init (): Promise<void> {
    await this.client.unsafe(
      `
        CREATE TABLE IF NOT EXISTS _account_applied_migrations (
            identifier VARCHAR(255) NOT NULL PRIMARY KEY
          , ddl TEXT NOT NULL
          , applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `
    )
  }

  async createWorkspace (data: WorkspaceData, status: WorkspaceStatusData): Promise<string> {
    try {
      return await this.client.begin(async (client) => {
        const workspace = await this.workspace.insertOne(data) as string
        await this.workspaceStatus.insertOne({ ...status, workspaceUuid: workspace })

        return workspace
      })
    } catch (err: any) {
      await this.client.unsafe('ROLLBACK')
      throw err
    }
  }

  async assignWorkspace (accountUuid: string, workspaceUuid: string, role: AccountRole): Promise<void> {
    await this.client.begin(async (client) => {
      await client`INSERT INTO ${client(this.wsMembersName)} (workspace_uuid, account_uuid, role) VALUES (${workspaceUuid}, ${accountUuid}, ${role})`
    })
  }

  async unassignWorkspace (accountUuid: string, workspaceUuid: string): Promise<void> {
    await this.client.begin(async (client) => {
      await client`DELETE FROM ${client(this.wsMembersName)} WHERE workspace_uuid = ${workspaceUuid} AND account_uuid = ${accountUuid}`
    })
  }

  async updateWorkspaceRole (accountUuid: string, workspaceUuid: string, role: AccountRole): Promise<void> {
    await this.client.begin(async (client) => {
      await client`UPDATE ${this.wsMembersName} SET role = ${role} WHERE workspace_uuid = ${workspaceUuid} AND account_uuid = ${accountUuid}`
    })
  }

  async getWorkspaceRole (accountUuid: string, workspaceUuid: string): Promise<AccountRole | null> {
    const res: any = await this.client`SELECT role FROM ${this.wsMembersName} WHERE workspace_uuid = ${workspaceUuid} AND account = ${accountUuid}`

    return res[0]?.role ?? null
  }

  async getWorkspaceMembers (workspaceUuid: string): Promise<WorkspaceMemberInfo[]> {
    const res: any = await this.client`SELECT role FROM ${this.wsMembersName} WHERE workspace_uuid = ${workspaceUuid}`

    return res.map((p: any) => ({
      person: p.account_uuid,
      role: p.role
    }))
  }

  async getAccountWorkspaces (accountUuid: string): Promise<WorkspaceInfoWithStatus[]> {
    const sql = `SELECT 
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
           FROM ${this.wsMembersName} as m 
           INNER JOIN workspace as w
           INNER JOIN workspace_status as s
           WHERE m.workspace_uuid = w.uuid AND s.workspace_uuid = w.uuid AND m.account_uuid = $1
           ORDER BY s.last_visit DESC
    `

    const res: any = await this.client.unsafe(sql, [accountUuid])

    return res
  }

  async setPassword (accountUuid: string, hash: Buffer, salt: Buffer): Promise<void> {
    await this.client.begin(async (client) => {
      await client`UPSERT INTO account_passwords (account_uuid, hash, salt) VALUES (${accountUuid}, ${hash as unknown as Uint8Array}, ${salt as unknown as Uint8Array})`
    })
  }

  async resetPassword (accountUuid: string): Promise<void> {
    await this.client`DELETE FROM account_passwords WHERE account_uuid = ${accountUuid}`
  }

  protected getMigrations (): [string, string][] {
    return [this.getV1Migration()]
  }

  // NOTE: NEVER MODIFY EXISTING MIGRATIONS. IF YOU NEED TO ADJUST THE SCHEMA, ADD A NEW MIGRATION.
  private getV1Migration (): [string, string] {
    return [
      'account_db_v1_global_init',
      `
      CREATE SCHEMA IF NOT EXISTS global_account;

      /* ======= T Y P E S ======= */
      CREATE TYPE global_account.social_id_type AS ENUM ('email', 'github', 'google', 'phone', 'oidc', 'huly', 'telegram');
      CREATE TYPE global_account.location AS ENUM ('kv', 'weur', 'eeur', 'wnam', 'enam', 'apac');
      CREATE TYPE global_account.workspace_role AS ENUM ('OWNER', 'MAINTAINER', 'USER', 'GUEST', 'DOCGUEST');

      /* ======= P E R S O N ======= */
      CREATE TABLE IF NOT EXISTS global_account.person (
          uuid UUID NOT NULL DEFAULT gen_random_uuid(),
          first_name STRING NOT NULL,
          last_name STRING NOT NULL,
          country STRING,
          city STRING,
          CONSTRAINT person_pk PRIMARY KEY (uuid)
      );

      /* ======= A C C O U N T ======= */
      CREATE TABLE IF NOT EXISTS global_account.account (
          uuid UUID NOT NULL,
          timezone STRING,
          locale STRING,
          CONSTRAINT account_pk PRIMARY KEY (uuid),
          CONSTRAINT account_person_fk FOREIGN KEY (uuid) REFERENCES global_account.person(uuid)
      );

      CREATE TABLE IF NOT EXISTS global_account.account_passwords (
          account_uuid UUID NOT NULL,
          hash BYTES NOT NULL,
          salt BYTES NOT NULL,
          CONSTRAINT account_auth_pk PRIMARY KEY (account_uuid),
          CONSTRAINT account_passwords_account_fk FOREIGN KEY (account_uuid) REFERENCES global_account.account(uuid)
      );

      CREATE TABLE IF NOT EXISTS global_account.account_events (
          account_uuid UUID NOT NULL,
          event_type STRING NOT NULL,
          time TIMESTAMP NOT NULL DEFAULT current_timestamp(),
          data JSONB,
          CONSTRAINT account_events_pk PRIMARY KEY (account_uuid, event_type, time),
          CONSTRAINT account_events_account_fk FOREIGN KEY (account_uuid) REFERENCES global_account.account(uuid)
      );

      /* ======= S O C I A L   I D S ======= */
      CREATE TABLE IF NOT EXISTS global_account.social_id (
          id INT8 NOT NULL DEFAULT unique_rowid(),
          type global_account.social_id_type NOT NULL,
          value STRING NOT NULL,
          key STRING AS (CONCAT(type, ':', value)) STORED,
          person_uuid UUID NOT NULL,
          created_on TIMESTAMP NOT NULL DEFAULT current_timestamp(),
          verified_on TIMESTAMP,
          CONSTRAINT social_id_pk PRIMARY KEY (id),
          CONSTRAINT social_id_type_identifier_idx UNIQUE (type, identifier),
          CONSTRAINT social_id_account_idx INDEX (person_uuid),
          CONSTRAINT social_id_person_fk FOREIGN KEY (person_uuid) REFERENCES global_account.person(uuid),
      );

      /* ======= W O R K S P A C E ======= */
      CREATE TABLE IF NOT EXISTS global_account.workspace (
          uuid UUID NOT NULL DEFAULT gen_random_uuid(),
          name STRING NOT NULL,
          url STRING NOT NULL,
          branding STRING,
          location global_account.location,
          region STRING,
          created_by UUID NOT NULL, -- account uuid
          created_on TIMESTAMP NOT NULL DEFAULT current_timestamp(),
          billing_account UUID NOT NULL,
          CONSTRAINT workspace_pk PRIMARY KEY (uuid),
          CONSTRAINT workspace_url_unique UNIQUE (url),
          CONSTRAINT workspace_created_by_fk FOREIGN KEY (created_by) REFERENCES global_account.account(uuid),
          CONSTRAINT workspace_billing_account_fk FOREIGN KEY (billing_account) REFERENCES global_account.account(uuid)
      );

      CREATE TABLE IF NOT EXISTS global_account.workspace_status (
          workspace_uuid UUID NOT NULL,
          mode STRING,
          processing_progress INT2 DEFAULT 0,,
          version_major INT2 NOT NULL DEFAULT 0,
          version_minor INT2 NOT NULL DEFAULT 0,
          version_patch INT4 NOT NULL DEFAULT 0,
          last_processing_time TIMESTAMP DEFAULT 0,
          last_visit TIMESTAMP,
          is_disabled BOOL DEFAULT FALSE,
          processing_attempts INT2 DEFAULT 0,
          processing_message STRING,
          backup_info JSONB,
          CONSTRAINT workspace_status_pk PRIMARY KEY (workspace_uuid),
          CONSTRAINT workspace_status_workspace_fk FOREIGN KEY (workspace_uuid) REFERENCES global_account.workspace(uuid)
      );

      CREATE TABLE IF NOT EXISTS global_account.workspace_members (
          workspace_uuid UUID NOT NULL,
          account_uuid UUID NOT NULL,
          role global_account.workspace_role NOT NULL DEFAULT 'USER',
          CONSTRAINT workspace_assignment_pk PRIMARY KEY (workspace_uuid, account_uuid),
          CONSTRAINT members_workspace_fk FOREIGN KEY (workspace_uuid) REFERENCES global_account.workspace(uuid),
          CONSTRAINT members_account_fk FOREIGN KEY (account_uuid) REFERENCES global_account.account(uuid)
      );

      /* ========================================================================================== */
      /* MAIN SCHEMA ENDS HERE */
      /* ===================== */

      /* ======= O T P ======= */
      CREATE TABLE IF NOT EXISTS global_account.otp (
          social_id INT8 NOT NULL,
          code STRING NOT NULL,
          expires_on TIMESTAMP NOT NULL,
          created_on TIMESTAMP NOT NULL DEFAULT current_timestamp(),
          CONSTRAINT otp_pk PRIMARY KEY (social_id, otp),
          CONSTRAINT otp_social_id_fk FOREIGN KEY (social_id) REFERENCES global_account.social_id(id)
      );

      /* ======= I N V I T E ======= */
      CREATE TABLE IF NOT EXISTS global_account.invite (
          id INT8 NOT NULL DEFAULT unique_rowid(),
          workspace_uuid UUID NOT NULL,
          expires_on TIMESTAMP NOT NULL,
          email_pattern STRING,
          remaining_uses INT2,
          role global_account.workspace_role NOT NULL DEFAULT 'USER',
          CONSTRAINT invite_pk PRIMARY KEY (id),
          CONSTRAINT workspace_invite_idx INDEX (workspace_uuid),
          CONSTRAINT invite_workspace_fk FOREIGN KEY (workspace_uuid) REFERENCES global_account.workspace(uuid)
      );
    `
    ]
  }
}
