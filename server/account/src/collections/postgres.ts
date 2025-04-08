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
import {
  type Data,
  type Version,
  type Person,
  type WorkspaceMemberInfo,
  AccountRole,
  type PersonUuid,
  type WorkspaceUuid
} from '@hcengineering/core'

import type {
  DbCollection,
  Query,
  Operations,
  Workspace,
  WorkspaceOperation,
  AccountDB,
  Account,
  OTP,
  WorkspaceInvite,
  AccountEvent,
  SocialId,
  WorkspaceData,
  WorkspaceStatus,
  WorkspaceStatusData,
  WorkspaceInfoWithStatus,
  Sort,
  Mailbox,
  MailboxSecret,
  Integration,
  IntegrationSecret
} from '../types'

function toSnakeCase (str: string): string {
  // Preserve leading underscore
  const hasLeadingUnderscore = str.startsWith('_')
  const baseStr = hasLeadingUnderscore ? str.slice(1) : str
  const converted = baseStr.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
  return hasLeadingUnderscore ? '_' + converted : converted
}

function toCamelCase (str: string): string {
  // Preserve leading underscore
  const hasLeadingUnderscore = str.startsWith('_')
  const baseStr = hasLeadingUnderscore ? str.slice(1) : str
  const converted = baseStr.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase())
  return hasLeadingUnderscore ? '_' + converted : converted
}

function convertKeysToCamelCase (obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((v) => convertKeysToCamelCase(v))
  } else if (obj !== null && typeof obj === 'object') {
    const camelObj: any = {}
    for (const key of Object.keys(obj)) {
      camelObj[toCamelCase(key)] = convertKeysToCamelCase(obj[key])
    }
    return camelObj
  }
  return obj
}

function convertKeysToSnakeCase (obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((v) => convertKeysToSnakeCase(v))
  } else if (obj !== null && typeof obj === 'object') {
    const snakeObj: any = {}
    for (const key of Object.keys(obj)) {
      snakeObj[toSnakeCase(key)] = convertKeysToSnakeCase(obj[key])
    }
    return snakeObj
  }
  return obj
}

function formatVar (idx: number, type?: string): string {
  return type != null ? `$${idx}::${type}` : `$${idx}`
}

export class PostgresDbCollection<T extends Record<string, any>, K extends keyof T | undefined = undefined>
implements DbCollection<T> {
  constructor (
    readonly name: string,
    readonly client: Sql,
    readonly idKey?: K,
    readonly ns?: string,
    readonly fieldTypes: Record<string, string> = {}
  ) {}

  getTableName (): string {
    if (this.ns === '') {
      return this.name
    }

    return `${this.ns}.${this.name}`
  }

  protected buildSelectClause (): string {
    return `SELECT * FROM ${this.getTableName()}`
  }

  protected buildWhereClause (query: Query<T>, lastRefIdx: number = 0): [string, any[]] {
    const filteredQuery = Object.entries(query).reduce<Query<T>>((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key as keyof Query<T>] = value
      }
      return acc
    }, {})

    if (Object.keys(filteredQuery).length === 0) {
      return ['', []]
    }

    const whereChunks: string[] = []
    const values: any[] = []
    let currIdx: number = lastRefIdx

    for (const key of Object.keys(filteredQuery)) {
      const qKey = filteredQuery[key]
      if (qKey === undefined) continue

      const operator = qKey != null && typeof qKey === 'object' ? Object.keys(qKey)[0] : ''
      const castType = this.fieldTypes[key]
      const snakeKey = toSnakeCase(key)
      switch (operator) {
        case '$in': {
          const inVals = Object.values(qKey as object)[0]
          const inVars: string[] = []
          for (const val of inVals) {
            currIdx++
            inVars.push(formatVar(currIdx, castType))
            values.push(val)
          }
          whereChunks.push(`"${snakeKey}" IN (${inVars.join(', ')})`)
          break
        }
        case '$lt': {
          currIdx++
          whereChunks.push(`"${snakeKey}" < ${formatVar(currIdx, castType)}`)
          values.push(Object.values(qKey as object)[0])
          break
        }
        case '$lte': {
          currIdx++
          whereChunks.push(`"${snakeKey}" <= ${formatVar(currIdx, castType)}`)
          values.push(Object.values(qKey as object)[0])
          break
        }
        case '$gt': {
          currIdx++
          whereChunks.push(`"${snakeKey}" > ${formatVar(currIdx, castType)}`)
          values.push(Object.values(qKey as object)[0])
          break
        }
        case '$gte': {
          currIdx++
          whereChunks.push(`"${snakeKey}" >= ${formatVar(currIdx, castType)}`)
          values.push(Object.values(qKey as object)[0])
          break
        }
        case '$ne': {
          currIdx++
          whereChunks.push(`"${snakeKey}" != ${formatVar(currIdx, castType)}`)
          values.push(Object.values(qKey as object)[0])
          break
        }
        default: {
          if (qKey !== null) {
            currIdx++
            whereChunks.push(`"${snakeKey}" = ${formatVar(currIdx, castType)}`)
            values.push(qKey)
          } else {
            whereChunks.push(`"${snakeKey}" IS NULL`)
          }
        }
      }
    }

    return [`WHERE ${whereChunks.join(' AND ')}`, values]
  }

  protected buildSortClause (sort: Sort<T>): string {
    const sortChunks: string[] = []

    for (const key of Object.keys(sort)) {
      const snakeKey = toSnakeCase(key)
      sortChunks.push(`"${snakeKey}" ${sort[key] === 'ascending' ? 'ASC' : 'DESC'}`)
    }

    return `ORDER BY ${sortChunks.join(', ')}`
  }

  protected convertToObj (row: unknown): T {
    return convertKeysToCamelCase(row) as T
  }

  async find (query: Query<T>, sort?: Sort<T>, limit?: number, client?: Sql): Promise<T[]> {
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
    const _client = client ?? this.client
    const result = await _client.unsafe(finalSql, whereValues)

    return result.map((row) => this.convertToObj(row))
  }

  async findOne (query: Query<T>, client?: Sql): Promise<T | null> {
    return (await this.find(query, undefined, 1, client))[0] ?? null
  }

  async insertOne (data: Partial<T>, client?: Sql): Promise<K extends keyof T ? T[K] : undefined> {
    const snakeData = convertKeysToSnakeCase(data)
    const keys: string[] = Object.keys(snakeData)
    const values = Object.values(snakeData) as any

    const sql = `INSERT INTO ${this.getTableName()} (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${keys.map((_, idx) => `$${idx + 1}`).join(', ')}) RETURNING *`

    const _client = client ?? this.client
    const res: any | undefined = await _client.unsafe(sql, values)
    const idKey = this.idKey

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
            const snakeKey = toSnakeCase(incKey)
            currIdx++
            updateChunks.push(`"${snakeKey}" = "${snakeKey}" + $${currIdx}`)
            values.push(inc[incKey])
          }
          break
        }
        default: {
          const snakeKey = toSnakeCase(key)
          const castType = this.fieldTypes[key]
          currIdx++
          updateChunks.push(`"${snakeKey}" = ${formatVar(currIdx, castType)}`)
          values.push(ops[key])
        }
      }
    }

    return [`SET ${updateChunks.join(', ')}`, values]
  }

  async updateOne (query: Query<T>, ops: Operations<T>, client?: Sql): Promise<void> {
    const sqlChunks: string[] = [`UPDATE ${this.getTableName()}`]
    const [updateClause, updateValues] = this.buildUpdateClause(ops)
    const [whereClause, whereValues] = this.buildWhereClause(query, updateValues.length)

    sqlChunks.push(updateClause)
    if (whereClause !== '') {
      sqlChunks.push(whereClause)
    }

    const finalSql = sqlChunks.join(' ')
    const _client = client ?? this.client
    await _client.unsafe(finalSql, [...updateValues, ...whereValues])
  }

  async deleteMany (query: Query<T>, client?: Sql): Promise<void> {
    const sqlChunks: string[] = [`DELETE FROM ${this.getTableName()}`]
    const [whereClause, whereValues] = this.buildWhereClause(query)

    if (whereClause !== '') {
      sqlChunks.push(whereClause)
    }

    const finalSql = sqlChunks.join(' ')
    const _client = client ?? this.client
    await _client.unsafe(finalSql, whereValues)
  }
}

export class AccountPostgresDbCollection
  extends PostgresDbCollection<Account, 'uuid'>
  implements DbCollection<Account> {
  private readonly passwordKeys = ['hash', 'salt']

  constructor (
    readonly client: Sql,
    readonly ns?: string
  ) {
    super('account', client, 'uuid', ns)
  }

  getPasswordsTableName (): string {
    const ownName = 'account_passwords'
    if (this.ns === '') {
      return ownName
    }

    return `${this.ns}.${ownName}`
  }

  protected buildSelectClause (): string {
    return `SELECT * FROM (
      SELECT 
        a.uuid,
        a.timezone,
        a.locale,
        a.automatic,
        p.hash,
        p.salt
      FROM ${this.getTableName()} as a
        LEFT JOIN ${this.getPasswordsTableName()} as p ON p.account_uuid = a.uuid
    )`
  }

  async find (query: Query<Account>, sort?: Sort<Account>, limit?: number, client?: Sql): Promise<Account[]> {
    if (Object.keys(query).some((k) => this.passwordKeys.includes(k))) {
      throw new Error('Passwords are not allowed in find query conditions')
    }

    const result = await super.find(query, sort, limit, client)

    for (const r of result) {
      if (r.hash != null) {
        r.hash = Buffer.from(Object.values(r.hash))
      }
      if (r.salt != null) {
        r.salt = Buffer.from(Object.values(r.salt))
      }
    }

    return result
  }

  async insertOne (data: Partial<Account>, client?: Sql): Promise<Account['uuid']> {
    if (Object.keys(data).some((k) => this.passwordKeys.includes(k))) {
      throw new Error('Passwords are not allowed in insert query')
    }

    return await super.insertOne(data, client)
  }

  async updateOne (query: Query<Account>, ops: Operations<Account>, client?: Sql): Promise<void> {
    if (Object.keys({ ...ops, ...query }).some((k) => this.passwordKeys.includes(k))) {
      throw new Error('Passwords are not allowed in update query')
    }

    await super.updateOne(query, ops, client)
  }

  async deleteMany (query: Query<Account>, client?: Sql): Promise<void> {
    if (Object.keys(query).some((k) => this.passwordKeys.includes(k))) {
      throw new Error('Passwords are not allowed in delete query')
    }

    await super.deleteMany(query, client)
  }
}

export class PostgresAccountDB implements AccountDB {
  readonly wsMembersName = 'workspace_members'

  person: PostgresDbCollection<Person, 'uuid'>
  account: AccountPostgresDbCollection
  socialId: PostgresDbCollection<SocialId, '_id'>
  workspace: PostgresDbCollection<Workspace, 'uuid'>
  workspaceStatus: PostgresDbCollection<WorkspaceStatus>
  accountEvent: PostgresDbCollection<AccountEvent>
  otp: PostgresDbCollection<OTP>
  invite: PostgresDbCollection<WorkspaceInvite, 'id'>
  mailbox: PostgresDbCollection<Mailbox, 'mailbox'>
  mailboxSecret: PostgresDbCollection<MailboxSecret>
  integration: PostgresDbCollection<Integration>
  integrationSecret: PostgresDbCollection<IntegrationSecret>

  constructor (
    readonly client: Sql,
    readonly ns: string = 'global_account'
  ) {
    this.person = new PostgresDbCollection<Person, 'uuid'>('person', client, 'uuid', ns)
    this.account = new AccountPostgresDbCollection(client, ns)
    this.socialId = new PostgresDbCollection<SocialId, '_id'>('social_id', client, '_id', ns)
    this.workspaceStatus = new PostgresDbCollection<WorkspaceStatus>('workspace_status', client, undefined, ns)
    this.workspace = new PostgresDbCollection<Workspace, 'uuid'>('workspace', client, 'uuid', ns)
    this.accountEvent = new PostgresDbCollection<AccountEvent>('account_events', client, undefined, ns)
    this.otp = new PostgresDbCollection<OTP>('otp', client, undefined, ns)
    this.invite = new PostgresDbCollection<WorkspaceInvite, 'id'>('invite', client, 'id', ns)
    this.mailbox = new PostgresDbCollection<Mailbox, 'mailbox'>('mailbox', client, undefined, ns)
    this.mailboxSecret = new PostgresDbCollection<MailboxSecret>('mailbox_secrets', client, undefined, ns)
    this.integration = new PostgresDbCollection<Integration>('integrations', client, undefined, ns)
    this.integrationSecret = new PostgresDbCollection<IntegrationSecret>('integration_secrets', client, undefined, ns)
  }

  getWsMembersTableName (): string {
    return `${this.ns}.${this.wsMembersName}`
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
        await client`INSERT INTO ${this.client(this.ns)}._account_applied_migrations (identifier, ddl) VALUES (${name}, ${ddl}) ON CONFLICT DO NOTHING`

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
        CREATE SCHEMA IF NOT EXISTS ${this.ns};

        CREATE TABLE IF NOT EXISTS ${this.ns}._account_applied_migrations (
            identifier VARCHAR(255) NOT NULL PRIMARY KEY
          , ddl TEXT NOT NULL
          , applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `
    )
  }

  async createWorkspace (data: WorkspaceData, status: WorkspaceStatusData): Promise<WorkspaceUuid> {
    return await this.client.begin(async (client) => {
      const workspaceUuid = await this.workspace.insertOne(data, client)
      await this.workspaceStatus.insertOne({ ...status, workspaceUuid }, client)

      return workspaceUuid
    })
  }

  async assignWorkspace (accountUuid: PersonUuid, workspaceUuid: WorkspaceUuid, role: AccountRole): Promise<void> {
    await this
      .client`INSERT INTO ${this.client(this.getWsMembersTableName())} (workspace_uuid, account_uuid, role) VALUES (${workspaceUuid}, ${accountUuid}, ${role})`
  }

  async unassignWorkspace (accountUuid: PersonUuid, workspaceUuid: WorkspaceUuid): Promise<void> {
    await this
      .client`DELETE FROM ${this.client(this.getWsMembersTableName())} WHERE workspace_uuid = ${workspaceUuid} AND account_uuid = ${accountUuid}`
  }

  async updateWorkspaceRole (accountUuid: PersonUuid, workspaceUuid: WorkspaceUuid, role: AccountRole): Promise<void> {
    await this
      .client`UPDATE ${this.client(this.getWsMembersTableName())} SET role = ${role} WHERE workspace_uuid = ${workspaceUuid} AND account_uuid = ${accountUuid}`
  }

  async getWorkspaceRole (accountUuid: PersonUuid, workspaceUuid: WorkspaceUuid): Promise<AccountRole | null> {
    const res: any = await this
      .client`SELECT role FROM ${this.client(this.getWsMembersTableName())} WHERE workspace_uuid = ${workspaceUuid} AND account_uuid = ${accountUuid}`

    return res[0]?.role ?? null
  }

  async getWorkspaceMembers (workspaceUuid: WorkspaceUuid): Promise<WorkspaceMemberInfo[]> {
    const res: any = await this
      .client`SELECT account_uuid, role FROM ${this.client(this.getWsMembersTableName())} WHERE workspace_uuid = ${workspaceUuid}`

    return res.map((p: any) => ({
      person: p.account_uuid,
      role: p.role
    }))
  }

  async getAccountWorkspaces (accountUuid: PersonUuid): Promise<WorkspaceInfoWithStatus[]> {
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
           FROM ${this.getWsMembersTableName()} as m 
           INNER JOIN ${this.workspace.getTableName()} as w ON m.workspace_uuid = w.uuid
           INNER JOIN ${this.workspaceStatus.getTableName()} as s ON s.workspace_uuid = w.uuid
           WHERE m.account_uuid = $1
           ORDER BY s.last_visit DESC
    `

    const res: any = await this.client.unsafe(sql, [accountUuid])

    return convertKeysToCamelCase(res)
  }

  async getPendingWorkspace (
    region: string,
    version: Data<Version>,
    operation: WorkspaceOperation,
    processingTimeoutMs: number,
    wsLivenessMs?: number
  ): Promise<WorkspaceInfoWithStatus | undefined> {
    const sqlChunks: string[] = [
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
           FROM ${this.workspace.getTableName()} as w
           INNER JOIN ${this.workspaceStatus.getTableName()} as s ON s.workspace_uuid = w.uuid
    `
    ]
    const whereChunks: string[] = []
    const values: any[] = []

    const pendingCreationSql = "s.mode IN ('pending-creation', 'creating')"
    const migrationSql =
      "s.mode IN ('migration-backup', 'migration-pending-backup', 'migration-clean', 'migration-pending-clean')"

    const restoringSql = "s.mode IN ('pending-restore', 'restoring')"
    const deletingSql = "s.mode IN ('pending-deletion', 'deleting')"
    const archivingSql =
      "s.mode IN ('archiving-pending-backup', 'archiving-backup', 'archiving-pending-clean', 'archiving-clean')"
    const versionSql =
      '(s.version_major < $1 OR (s.version_major = $1 AND s.version_minor < $2) OR (s.version_major = $1 AND s.version_minor = $2 AND s.version_patch < $3))'
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
        operationSql = `(${pendingCreationSql} OR ${pendingUpgradeSql} OR ${migrationSql} OR ${archivingSql} OR ${restoringSql} OR ${deletingSql})`
        break
    }

    if (operation !== 'create') {
      values.push(version.major, version.minor, version.patch)

      if (wsLivenessMs !== undefined) {
        values.push(Date.now() - wsLivenessMs)
      }
    }
    whereChunks.push(operationSql)

    // TODO: support returning pending deletion workspaces when we will actually want
    // to clear them with the worker.
    whereChunks.push("s.mode <> 'manual-creation'")
    whereChunks.push('(s.processing_attempts IS NULL OR s.processing_attempts <= 3)')
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
          `UPDATE ${this.workspaceStatus.getTableName()} SET processing_attempts = processing_attempts + 1, "last_processing_time" = $1 WHERE workspace_uuid = $2`,
          [Date.now(), res[0].uuid]
        )
      }
    })

    return convertKeysToCamelCase(res[0]) as WorkspaceInfoWithStatus
  }

  async setPassword (accountUuid: PersonUuid, hash: Buffer, salt: Buffer): Promise<void> {
    await this
      .client`UPSERT INTO ${this.client(this.account.getPasswordsTableName())} (account_uuid, hash, salt) VALUES (${accountUuid}, ${hash.buffer as any}::bytea, ${salt.buffer as any}::bytea)`
  }

  async resetPassword (accountUuid: PersonUuid): Promise<void> {
    await this
      .client`DELETE FROM ${this.client(this.account.getPasswordsTableName())} WHERE account_uuid = ${accountUuid}`
  }

  protected getMigrations (): [string, string][] {
    return [
      this.getV1Migration(),
      this.getV2Migration1(),
      this.getV2Migration2(),
      this.getV2Migration3(),
      this.getV3Migration(),
      this.getV4Migration(),
      this.getV4Migration1(),
      this.getV5Migration(),
      this.getV6Migration(),
      this.getV7Migration()
    ]
  }

  // NOTE: NEVER MODIFY EXISTING MIGRATIONS. IF YOU NEED TO ADJUST THE SCHEMA, ADD A NEW MIGRATION.
  private getV1Migration (): [string, string] {
    return [
      'account_db_v1_global_init',
      `
      /* ======= FUNCTIONS ======= */

      CREATE OR REPLACE FUNCTION current_epoch_ms() 
      RETURNS BIGINT AS $$
          SELECT (extract(epoch from current_timestamp) * 1000)::bigint;
      $$ LANGUAGE SQL;

      /* ======= T Y P E S ======= */
      CREATE TYPE IF NOT EXISTS ${this.ns}.social_id_type AS ENUM ('email', 'github', 'google', 'phone', 'oidc', 'huly', 'telegram');
      CREATE TYPE IF NOT EXISTS ${this.ns}.location AS ENUM ('kv', 'weur', 'eeur', 'wnam', 'enam', 'apac');
      CREATE TYPE IF NOT EXISTS ${this.ns}.workspace_role AS ENUM ('OWNER', 'MAINTAINER', 'USER', 'GUEST', 'DOCGUEST');

      /* ======= P E R S O N ======= */
      CREATE TABLE IF NOT EXISTS ${this.ns}.person (
          uuid UUID NOT NULL DEFAULT gen_random_uuid(),
          first_name STRING NOT NULL,
          last_name STRING NOT NULL,
          country STRING,
          city STRING,
          CONSTRAINT person_pk PRIMARY KEY (uuid)
      );

      /* ======= A C C O U N T ======= */
      CREATE TABLE IF NOT EXISTS ${this.ns}.account (
          uuid UUID NOT NULL,
          timezone STRING,
          locale STRING,
          CONSTRAINT account_pk PRIMARY KEY (uuid),
          CONSTRAINT account_person_fk FOREIGN KEY (uuid) REFERENCES ${this.ns}.person(uuid)
      );

      CREATE TABLE IF NOT EXISTS ${this.ns}.account_passwords (
          account_uuid UUID NOT NULL,
          hash BYTES NOT NULL,
          salt BYTES NOT NULL,
          CONSTRAINT account_auth_pk PRIMARY KEY (account_uuid),
          CONSTRAINT account_passwords_account_fk FOREIGN KEY (account_uuid) REFERENCES ${this.ns}.account(uuid)
      );

      CREATE TABLE IF NOT EXISTS ${this.ns}.account_events (
          account_uuid UUID NOT NULL,
          event_type STRING NOT NULL,
          time BIGINT NOT NULL DEFAULT current_epoch_ms(),
          data JSONB,
          CONSTRAINT account_events_pk PRIMARY KEY (account_uuid, event_type, time),
          CONSTRAINT account_events_account_fk FOREIGN KEY (account_uuid) REFERENCES ${this.ns}.account(uuid)
      );

      /* ======= S O C I A L   I D S ======= */
      CREATE TABLE IF NOT EXISTS ${this.ns}.social_id (
          type ${this.ns}.social_id_type NOT NULL,
          value STRING NOT NULL,
          key STRING AS (CONCAT(type::STRING, ':', value)) STORED,
          person_uuid UUID NOT NULL,
          created_on BIGINT NOT NULL DEFAULT current_epoch_ms(),
          verified_on BIGINT,
          CONSTRAINT social_id_pk PRIMARY KEY (type, value),
          CONSTRAINT social_id_key_unique UNIQUE (key),
          INDEX social_id_account_idx (person_uuid),
          CONSTRAINT social_id_person_fk FOREIGN KEY (person_uuid) REFERENCES ${this.ns}.person(uuid)
      );

      /* ======= W O R K S P A C E ======= */
      CREATE TABLE IF NOT EXISTS ${this.ns}.workspace (
          uuid UUID NOT NULL DEFAULT gen_random_uuid(),
          name STRING NOT NULL,
          url STRING NOT NULL,
          data_id STRING,
          branding STRING,
          location ${this.ns}.location,
          region STRING,
          created_by UUID, -- account uuid
          created_on BIGINT NOT NULL DEFAULT current_epoch_ms(),
          billing_account UUID,
          CONSTRAINT workspace_pk PRIMARY KEY (uuid),
          CONSTRAINT workspace_url_unique UNIQUE (url),
          CONSTRAINT workspace_created_by_fk FOREIGN KEY (created_by) REFERENCES ${this.ns}.account(uuid),
          CONSTRAINT workspace_billing_account_fk FOREIGN KEY (billing_account) REFERENCES ${this.ns}.account(uuid)
      );

      CREATE TABLE IF NOT EXISTS ${this.ns}.workspace_status (
          workspace_uuid UUID NOT NULL,
          mode STRING,
          processing_progress INT2 DEFAULT 0,
          version_major INT2 NOT NULL DEFAULT 0,
          version_minor INT2 NOT NULL DEFAULT 0,
          version_patch INT4 NOT NULL DEFAULT 0,
          last_processing_time BIGINT DEFAULT 0,
          last_visit BIGINT,
          is_disabled BOOL DEFAULT FALSE,
          processing_attempts INT2 DEFAULT 0,
          processing_message STRING,
          backup_info JSONB,
          CONSTRAINT workspace_status_pk PRIMARY KEY (workspace_uuid),
          CONSTRAINT workspace_status_workspace_fk FOREIGN KEY (workspace_uuid) REFERENCES ${this.ns}.workspace(uuid)
      );

      CREATE TABLE IF NOT EXISTS ${this.ns}.workspace_members (
          workspace_uuid UUID NOT NULL,
          account_uuid UUID NOT NULL,
          role ${this.ns}.workspace_role NOT NULL DEFAULT 'USER',
          CONSTRAINT workspace_assignment_pk PRIMARY KEY (workspace_uuid, account_uuid),
          CONSTRAINT members_workspace_fk FOREIGN KEY (workspace_uuid) REFERENCES ${this.ns}.workspace(uuid),
          CONSTRAINT members_account_fk FOREIGN KEY (account_uuid) REFERENCES ${this.ns}.account(uuid)
      );

      /* ========================================================================================== */
      /* MAIN SCHEMA ENDS HERE */
      /* ===================== */

      /* ======= O T P ======= */
      CREATE TABLE IF NOT EXISTS ${this.ns}.otp (
          social_id STRING NOT NULL,
          code STRING NOT NULL,
          expires_on BIGINT NOT NULL,
          created_on BIGINT NOT NULL DEFAULT current_epoch_ms(),
          CONSTRAINT otp_pk PRIMARY KEY (social_id, code),
          CONSTRAINT otp_social_id_fk FOREIGN KEY (social_id) REFERENCES ${this.ns}.social_id(key)
      );

      /* ======= I N V I T E ======= */
      CREATE TABLE IF NOT EXISTS ${this.ns}.invite (
          id INT8 NOT NULL DEFAULT unique_rowid(),
          workspace_uuid UUID NOT NULL,
          expires_on BIGINT NOT NULL,
          email_pattern STRING,
          remaining_uses INT2,
          role ${this.ns}.workspace_role NOT NULL DEFAULT 'USER',
          migrated_from STRING,
          CONSTRAINT invite_pk PRIMARY KEY (id),
          INDEX workspace_invite_idx (workspace_uuid),
          INDEX migrated_from_idx (migrated_from),
          CONSTRAINT invite_workspace_fk FOREIGN KEY (workspace_uuid) REFERENCES ${this.ns}.workspace(uuid)
      );
    `
    ]
  }

  private getV2Migration1 (): [string, string] {
    return [
      'account_db_v2_social_id_id_add',
      `
      -- Add _id column to social_id table
      ALTER TABLE ${this.ns}.social_id
      ADD COLUMN IF NOT EXISTS _id INT8 NOT NULL DEFAULT unique_rowid();
      `
    ]
  }

  private getV2Migration2 (): [string, string] {
    return [
      'account_db_v2_social_id_pk_change',
      `
      -- Drop existing otp foreign key constraint
      ALTER TABLE ${this.ns}.otp
      DROP CONSTRAINT IF EXISTS otp_social_id_fk;

      -- Drop existing primary key on social_id
      ALTER TABLE ${this.ns}.social_id
      DROP CONSTRAINT IF EXISTS social_id_pk;

      -- Add new primary key on _id
      ALTER TABLE ${this.ns}.social_id
      ADD CONSTRAINT social_id_pk PRIMARY KEY (_id);
      `
    ]
  }

  private getV2Migration3 (): [string, string] {
    return [
      'account_db_v2_social_id_constraints',
      `
      -- Add unique constraint on type, value
      ALTER TABLE ${this.ns}.social_id
      ADD CONSTRAINT social_id_tv_key_unique UNIQUE (type, value);

      -- Drop old table
      DROP TABLE ${this.ns}.otp;

      -- Create new OTP table with correct column type
      CREATE TABLE ${this.ns}.otp (
          social_id INT8 NOT NULL,
          code STRING NOT NULL,
          expires_on BIGINT NOT NULL,
          created_on BIGINT NOT NULL DEFAULT current_epoch_ms(),
          CONSTRAINT otp_new_pk PRIMARY KEY (social_id, code),
          CONSTRAINT otp_new_social_id_fk FOREIGN KEY (social_id) REFERENCES ${this.ns}.social_id(_id)
      );
      `
    ]
  }

  private getV3Migration (): [string, string] {
    return [
      'account_db_v3_add_invite_auto_join_final',
      `
      ALTER TABLE ${this.ns}.invite
      ADD COLUMN IF NOT EXISTS email STRING,
      ADD COLUMN IF NOT EXISTS auto_join BOOL DEFAULT FALSE;

      ALTER TABLE ${this.ns}.account
      ADD COLUMN IF NOT EXISTS automatic BOOL;
      `
    ]
  }

  private getV4Migration (): [string, string] {
    return [
      'account_db_v4_mailbox',
      `
      CREATE TABLE IF NOT EXISTS ${this.ns}.mailbox (
          account_uuid UUID NOT NULL,
          mailbox STRING NOT NULL,
          CONSTRAINT mailbox_pk PRIMARY KEY (mailbox),
          CONSTRAINT mailbox_account_fk FOREIGN KEY (account_uuid) REFERENCES ${this.ns}.account(uuid)
      );

      CREATE TABLE IF NOT EXISTS ${this.ns}.mailbox_secrets (
          mailbox STRING NOT NULL,
          app STRING,
          secret STRING NOT NULL,
          CONSTRAINT mailbox_secret_mailbox_fk FOREIGN KEY (mailbox) REFERENCES ${this.ns}.mailbox(mailbox)
      );
      `
    ]
  }

  private getV4Migration1 (): [string, string] {
    return [
      'account_db_v4_remove_mailbox_account_fk',
      `
      ALTER TABLE ${this.ns}.mailbox
      DROP CONSTRAINT IF EXISTS mailbox_account_fk;
      `
    ]
  }

  private getV5Migration (): [string, string] {
    return [
      'account_db_v5_social_id_is_deleted',
      `
      ALTER TABLE ${this.ns}.social_id
      ADD COLUMN IF NOT EXISTS is_deleted BOOL NOT NULL DEFAULT FALSE;
      `
    ]
  }

  private getV6Migration (): [string, string] {
    return [
      'account_db_v6_add_social_id_integrations',
      `
      CREATE TABLE IF NOT EXISTS ${this.ns}.integrations (
          social_id INT8 NOT NULL,
          kind STRING NOT NULL,
          workspace_uuid UUID,
          _def_ws_uuid UUID NOT NULL GENERATED ALWAYS AS (COALESCE(workspace_uuid, '00000000-0000-0000-0000-000000000000')) STORED NOT VISIBLE,
          data JSONB,
          CONSTRAINT integrations_pk PRIMARY KEY (social_id, kind, _def_ws_uuid),
          INDEX integrations_kind_idx (kind),
          CONSTRAINT integrations_social_id_fk FOREIGN KEY (social_id) REFERENCES ${this.ns}.social_id(_id),
          CONSTRAINT integrations_workspace_fk FOREIGN KEY (workspace_uuid) REFERENCES ${this.ns}.workspace(uuid)
      );

      CREATE TABLE IF NOT EXISTS ${this.ns}.integration_secrets (
          social_id INT8 NOT NULL,
          kind STRING NOT NULL,
          workspace_uuid UUID,
          _def_ws_uuid UUID NOT NULL GENERATED ALWAYS AS (COALESCE(workspace_uuid, '00000000-0000-0000-0000-000000000000')) STORED NOT VISIBLE,
          key STRING,
          secret STRING NOT NULL,
          CONSTRAINT integration_secrets_pk PRIMARY KEY (social_id, kind, _def_ws_uuid, key)
      );
      `
    ]
  }

  private getV7Migration (): [string, string] {
    return [
      'account_db_v7_add_display_value',
      `
      ALTER TABLE ${this.ns}.social_id
      ADD COLUMN IF NOT EXISTS display_value TEXT;
      `
    ]
  }
}
