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
import { type Sql, type TransactionSql } from 'postgres'
import {
  type Data,
  type Version,
  type Person,
  type WorkspaceMemberInfo,
  type AccountRole,
  type WorkspaceUuid,
  type AccountUuid,
  type PersonUuid
} from '@hcengineering/core'

import { getMigrations } from './migrations'
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
  IntegrationSecret,
  AccountAggregatedInfo
} from '../../types'

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

function convertTimestamp (ts: string): number | null {
  const val = Number.parseInt(ts)

  return Number.isNaN(val) ? null : val
}

export interface PostgresDbCollectionOptions<T extends Record<string, any>, K extends keyof T | undefined = undefined> {
  idKey?: K
  ns?: string
  fieldTypes?: Record<string, string>
  timestampFields?: Array<keyof T>
  withRetryClient?: <R>(callback: (client: Sql) => Promise<R>) => Promise<R>
}

export class PostgresDbCollection<T extends Record<string, any>, K extends keyof T | undefined = undefined>
implements DbCollection<T> {
  constructor (
    readonly name: string,
    readonly client: Sql,
    readonly options: PostgresDbCollectionOptions<T, K> = {}
  ) {}

  get ns (): string {
    return this.options.ns ?? ''
  }

  get idKey (): K | undefined {
    return this.options.idKey
  }

  get fieldTypes (): Record<string, string> {
    return this.options.fieldTypes ?? {}
  }

  get timestampFields (): Array<keyof T> {
    return this.options.timestampFields ?? []
  }

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
          const val = Object.values(qKey as object)[0]
          if (val === null) {
            whereChunks.push(`"${snakeKey}" IS NOT NULL`)
          } else {
            currIdx++
            whereChunks.push(`"${snakeKey}" != ${formatVar(currIdx, castType)}`)
            values.push(val)
          }
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
    const res = convertKeysToCamelCase(row)
    for (const field of this.timestampFields) {
      res[field] = convertTimestamp(res[field])
    }

    return res as T
  }

  async unsafe (sql: string, values: any[], client?: Sql): Promise<any[]> {
    if (client !== undefined) {
      return await client.unsafe(sql, values)
    } else if (this.options.withRetryClient !== undefined) {
      return await this.options.withRetryClient((_client) => _client.unsafe(sql, values))
    } else {
      return await this.client.unsafe(sql, values)
    }
  }

  async exists (query: Query<T>, client?: Sql): Promise<boolean> {
    const [whereClause, whereValues] = this.buildWhereClause(query)
    const sql = `SELECT EXISTS (SELECT 1 FROM ${this.getTableName()} ${whereClause})`

    const result = await this.unsafe(sql, whereValues, client)

    return result[0]?.exists === true
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
    const result = await this.unsafe(finalSql, whereValues, client)

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

    const res: any | undefined = await this.unsafe(sql, values, client)
    const idKey = this.idKey

    if (idKey === undefined) {
      return undefined as any
    }

    return res[0][idKey]
  }

  async insertMany (data: Array<Partial<T>>, client?: Sql): Promise<K extends keyof T ? Array<T[K]> : undefined> {
    const snakeData = convertKeysToSnakeCase(data)
    const columns = new Set<string>()
    for (const record of snakeData) {
      Object.keys(record).forEach((k) => columns.add(k))
    }
    const columnsList = Array.from(columns).sort()

    const values: any[] = []
    for (const record of snakeData) {
      const recordValues = columnsList.map((col) => record[col] ?? null)
      values.push(...recordValues)
    }

    const placeholders = snakeData
      .map((_: any, i: number) => `(${columnsList.map((_, j) => `$${i * columnsList.length + j + 1}`).join(', ')})`)
      .join(', ')

    const sql = `
      INSERT INTO ${this.getTableName()} 
      (${columnsList.map((k) => `"${k}"`).join(', ')})
      VALUES ${placeholders}
      RETURNING *
    `

    const res: any = await this.unsafe(sql, values, client)
    const idKey = this.idKey

    if (idKey === undefined) {
      return undefined as any
    }

    return res.map((r: any) => r[idKey])
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

  async update (query: Query<T>, ops: Operations<T>, client?: Sql): Promise<void> {
    const sqlChunks: string[] = [`UPDATE ${this.getTableName()}`]
    const [updateClause, updateValues] = this.buildUpdateClause(ops)
    const [whereClause, whereValues] = this.buildWhereClause(query, updateValues.length)

    sqlChunks.push(updateClause)
    if (whereClause !== '') {
      sqlChunks.push(whereClause)
    }

    const finalSql = sqlChunks.join(' ')
    await this.unsafe(finalSql, [...updateValues, ...whereValues], client)
  }

  async deleteMany (query: Query<T>, client?: Sql): Promise<void> {
    const sqlChunks: string[] = [`DELETE FROM ${this.getTableName()}`]
    const [whereClause, whereValues] = this.buildWhereClause(query)

    if (whereClause !== '') {
      sqlChunks.push(whereClause)
    }

    const finalSql = sqlChunks.join(' ')
    await this.unsafe(finalSql, whereValues, client)
  }
}

export class AccountPostgresDbCollection
  extends PostgresDbCollection<Account, 'uuid'>
  implements DbCollection<Account> {
  private readonly passwordKeys = ['hash', 'salt']

  constructor (
    client: Sql,
    ns?: string,
    withRetryClient?: PostgresDbCollectionOptions<Account, 'uuid'>['withRetryClient']
  ) {
    super('account', client, { idKey: 'uuid', ns, withRetryClient })
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
        a.max_workspaces,
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

  async update (query: Query<Account>, ops: Operations<Account>, client?: Sql): Promise<void> {
    if (Object.keys({ ...ops, ...query }).some((k) => this.passwordKeys.includes(k))) {
      throw new Error('Passwords are not allowed in update query')
    }

    await super.update(query, ops, client)
  }

  async deleteMany (query: Query<Account>, client?: Sql): Promise<void> {
    if (Object.keys(query).some((k) => this.passwordKeys.includes(k))) {
      throw new Error('Passwords are not allowed in delete query')
    }

    const [whereClause, whereValues] = this.buildWhereClause(query)

    // Delete passwords first
    const passwordsSql = `
      DELETE FROM ${this.getPasswordsTableName()}
      WHERE account_uuid IN (
        SELECT uuid FROM ${this.getTableName()} ${whereClause}
      )`
    await this.unsafe(passwordsSql, whereValues, client)

    await super.deleteMany(query, client)
  }
}

export class PostgresAccountDB implements AccountDB {
  private readonly retryOptions = {
    maxAttempts: 5,
    initialDelayMs: 100,
    maxDelayMs: 2000
  }

  readonly wsMembersName = 'workspace_members'
  readonly pendingWorkspaceLockName = '_pending_workspace_lock'

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
    const withRetryClient = this.withRetry
    this.person = new PostgresDbCollection<Person, 'uuid'>('person', client, { ns, idKey: 'uuid', withRetryClient })
    this.account = new AccountPostgresDbCollection(client, ns, withRetryClient)
    this.socialId = new PostgresDbCollection<SocialId, '_id'>('social_id', client, {
      ns,
      idKey: '_id',
      timestampFields: ['createdOn', 'verifiedOn'],
      withRetryClient
    })
    this.workspaceStatus = new PostgresDbCollection<WorkspaceStatus>('workspace_status', client, {
      ns,
      timestampFields: ['lastProcessingTime', 'lastVisit'],
      withRetryClient
    })
    this.workspace = new PostgresDbCollection<Workspace, 'uuid'>('workspace', client, {
      ns,
      idKey: 'uuid',
      timestampFields: ['createdOn'],
      withRetryClient
    })
    this.accountEvent = new PostgresDbCollection<AccountEvent>('account_events', client, {
      ns,
      timestampFields: ['time'],
      withRetryClient
    })
    this.otp = new PostgresDbCollection<OTP>('otp', client, { ns, timestampFields: ['expiresOn', 'createdOn'] })
    this.invite = new PostgresDbCollection<WorkspaceInvite, 'id'>('invite', client, {
      ns,
      idKey: 'id',
      timestampFields: ['expiresOn'],
      withRetryClient
    })
    this.mailbox = new PostgresDbCollection<Mailbox, 'mailbox'>('mailbox', client, { ns, withRetryClient })
    this.mailboxSecret = new PostgresDbCollection<MailboxSecret>('mailbox_secrets', client, { ns, withRetryClient })
    this.integration = new PostgresDbCollection<Integration>('integrations', client, { ns, withRetryClient })
    this.integrationSecret = new PostgresDbCollection<IntegrationSecret>('integration_secrets', client, {
      ns,
      withRetryClient
    })
  }

  getWsMembersTableName (): string {
    return `${this.ns}.${this.wsMembersName}`
  }

  getPendingWorkspaceLockTableName (): string {
    return `${this.ns}.${this.pendingWorkspaceLockName}`
  }

  async init (): Promise<void> {
    await this._init()

    // Apply all the migrations
    for (const migration of this.getMigrations()) {
      await this.migrate(migration[0], migration[1])
    }
  }

  async migrate (name: string, ddl: string): Promise<void> {
    const staleTimeoutMs = 30000
    const retryIntervalMs = 5000
    let migrationComplete = false
    let updateInterval: NodeJS.Timeout | null = null
    let executed = false

    const executeMigration = async (client: Sql): Promise<void> => {
      updateInterval = setInterval(() => {
        this.client`
          UPDATE ${this.client(this.ns)}._account_applied_migrations 
          SET last_processed_at = NOW() 
          WHERE identifier = ${name} AND applied_at IS NULL
        `.catch((err) => {
            console.error(`Failed to update last_processed_at for migration ${name}:`, err)
          })
      }, 5000)

      await client.unsafe(ddl)
      executed = true
    }

    try {
      while (!migrationComplete) {
        try {
          executed = false
          await this.client.begin(async (client) => {
            // Only locks if row exists and is not already locked
            const existing = await client`
              SELECT identifier, applied_at, last_processed_at
              FROM ${this.client(this.ns)}._account_applied_migrations 
              WHERE identifier = ${name}
              FOR UPDATE NOWAIT
            `

            if (existing.length > 0) {
              if (existing[0].applied_at !== null) {
                // Already completed
                migrationComplete = true
              } else if (
                existing[0].last_processed_at === null ||
                Date.now() - new Date(existing[0].last_processed_at).getTime() > staleTimeoutMs
              ) {
                // Take over the stale migration
                await client`
                  UPDATE ${this.client(this.ns)}._account_applied_migrations 
                  SET last_processed_at = NOW()
                  WHERE identifier = ${name}
                `

                await executeMigration(client)
              }
            } else {
              const res = await client`
                INSERT INTO ${this.client(this.ns)}._account_applied_migrations 
                (identifier, ddl, last_processed_at) 
                VALUES (${name}, ${ddl}, NOW())
                ON CONFLICT (identifier) DO NOTHING
              `

              if (res.count === 1) {
                // Successfully inserted
                await executeMigration(client)
              }
              // If insert failed (count === 0), another worker got it first, we'll retry the loop
            }
          })

          if (executed) {
            await this.client`
              UPDATE ${this.client(this.ns)}._account_applied_migrations 
              SET applied_at = NOW() 
              WHERE identifier = ${name}
            `
            migrationComplete = true
          }
        } catch (err: any) {
          if (['55P03', '40001'].includes(err.code)) {
            // newLockNotAvailableError, WriteTooOldError
          } else {
            console.error(`Error in migration ${name}: ${err.code} - ${err.message}`)
          }

          if (updateInterval !== null) {
            clearInterval(updateInterval)
          }
        }

        if (!migrationComplete) {
          await new Promise((resolve) => setTimeout(resolve, retryIntervalMs))
        }
      }
    } finally {
      if (updateInterval !== null) {
        clearInterval(updateInterval)
      }
    }
  }

  async _init (): Promise<void> {
    await this.client.unsafe(
      `
        CREATE SCHEMA IF NOT EXISTS ${this.ns};

        CREATE TABLE IF NOT EXISTS ${this.ns}._account_applied_migrations (
            identifier VARCHAR(255) NOT NULL PRIMARY KEY
          , ddl TEXT NOT NULL
          , applied_at TIMESTAMP WITH TIME ZONE
          , last_processed_at TIMESTAMP WITH TIME ZONE
        );

        ALTER TABLE ${this.ns}._account_applied_migrations 
        ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMP WITH TIME ZONE;
      `
    )

    const constraintsExist = await this.client`
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = ${this.ns}
      AND table_name = '_account_applied_migrations'
      AND column_name = 'applied_at'
      AND (column_default IS NOT NULL OR is_nullable = 'NO')
    `

    if (constraintsExist.length > 0) {
      try {
        await this.client.unsafe(
          `
            ALTER TABLE ${this.ns}._account_applied_migrations 
            ALTER COLUMN applied_at DROP DEFAULT;

            ALTER TABLE ${this.ns}._account_applied_migrations 
            ALTER COLUMN applied_at DROP NOT NULL;
          `
        )
      } catch (err) {
        // Ignore errors since they likely mean constraints were already removed by another concurrent migration
      }
    }
  }

  withRetry = async <T>(callback: (client: TransactionSql) => Promise<T>): Promise<T> => {
    let attempt = 0
    let delay = this.retryOptions.initialDelayMs

    while (true) {
      try {
        return (await this.client.begin(callback)) as T
      } catch (err: any) {
        attempt++

        if (!this.isRetryableError(err) || attempt >= this.retryOptions.maxAttempts) {
          throw err
        }

        await new Promise((resolve) => setTimeout(resolve, delay))

        delay = Math.min(delay * 2, this.retryOptions.maxDelayMs)
      }
    }
  }

  private isRetryableError (err: any): boolean {
    const msg: string = err?.message ?? ''

    return (
      err.code === '40001' || // Retry transaction
      err.code === '55P03' || // Lock not available
      err.code === 'CONNECTION_CLOSED' || // This error is thrown if the connection was closed without an error.
      err.code === 'CONNECTION_DESTROYED' || // This error is thrown for any queries that were pending when the timeout to sql.end({ timeout: X }) was reached. If the DB client is being closed completely retry will result in CONNECTION_ENDED which is not retried so should be fine.
      msg.includes('RETRY_SERIALIZABLE')
    )
  }

  async createWorkspace (data: WorkspaceData, status: WorkspaceStatusData): Promise<WorkspaceUuid> {
    return await this.withRetry(async (rTx) => {
      const workspaceUuid = await this.workspace.insertOne(data, rTx)
      await this.workspaceStatus.insertOne({ ...status, workspaceUuid }, rTx)

      return workspaceUuid
    })
  }

  async updateAllowReadOnlyGuests (workspaceId: WorkspaceUuid, readOnlyGuestsAllowed: boolean): Promise<void> {
    await this
      .client`UPDATE ${this.client(this.workspace.getTableName())} SET allow_read_only_guest = ${readOnlyGuestsAllowed} WHERE uuid = ${workspaceId}`
  }

  async updateAllowGuestSignUp (workspaceId: WorkspaceUuid, guestSignUpAllowed: boolean): Promise<void> {
    await this
      .client`UPDATE ${this.client(this.workspace.getTableName())} SET allow_guest_sign_up = ${guestSignUpAllowed} WHERE uuid = ${workspaceId}`
  }

  async assignWorkspace (accountUuid: AccountUuid, workspaceUuid: WorkspaceUuid, role: AccountRole): Promise<void> {
    await this.withRetry(
      async (rTx) =>
        await rTx`INSERT INTO ${this.client(this.getWsMembersTableName())} (workspace_uuid, account_uuid, role) VALUES (${workspaceUuid}, ${accountUuid}, ${role})`
    )
  }

  async batchAssignWorkspace (data: [AccountUuid, WorkspaceUuid, AccountRole][]): Promise<void> {
    const placeholders = data.map((_: any, i: number) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(', ')
    const values = data.flat()

    const sql = `
      INSERT INTO ${this.getWsMembersTableName()} 
      (account_uuid, workspace_uuid, role)
      VALUES ${placeholders}
    `

    await this.withRetry(async (rTx) => await rTx.unsafe(sql, values))
  }

  async unassignWorkspace (accountUuid: AccountUuid, workspaceUuid: WorkspaceUuid): Promise<void> {
    await this.withRetry(
      async (rTx) =>
        await rTx`DELETE FROM ${this.client(this.getWsMembersTableName())} WHERE workspace_uuid = ${workspaceUuid} AND account_uuid = ${accountUuid}`
    )
  }

  async updateWorkspaceRole (accountUuid: AccountUuid, workspaceUuid: WorkspaceUuid, role: AccountRole): Promise<void> {
    await this.withRetry(
      async (rTx) =>
        await rTx`UPDATE ${this.client(this.getWsMembersTableName())} SET role = ${role} WHERE workspace_uuid = ${workspaceUuid} AND account_uuid = ${accountUuid}`
    )
  }

  async getWorkspaceRole (accountUuid: AccountUuid, workspaceUuid: WorkspaceUuid): Promise<AccountRole | null> {
    return await this.withRetry(async (rTx) => {
      const res =
        await rTx`SELECT role FROM ${this.client(this.getWsMembersTableName())} WHERE workspace_uuid = ${workspaceUuid} AND account_uuid = ${accountUuid}`

      return res[0]?.role ?? null
    })
  }

  async getWorkspaceRoles (accountUuid: AccountUuid): Promise<Map<WorkspaceUuid, AccountRole>> {
    return await this.withRetry(async (rTx) => {
      const res =
        await rTx`SELECT workspace_uuid, role FROM ${this.client(this.getWsMembersTableName())} WHERE account_uuid = ${accountUuid}`

      return new Map(res.map((it) => [it.workspace_uuid as WorkspaceUuid, it.role]))
    })
  }

  async getWorkspaceMembers (workspaceUuid: WorkspaceUuid): Promise<WorkspaceMemberInfo[]> {
    return await this.withRetry(async (rTx) => {
      const res: any =
        await rTx`SELECT account_uuid, role FROM ${this.client(this.getWsMembersTableName())} WHERE workspace_uuid = ${workspaceUuid}`

      return res.map((p: any) => ({
        person: p.account_uuid,
        role: p.role
      }))
    })
  }

  async getAccountWorkspaces (accountUuid: AccountUuid): Promise<WorkspaceInfoWithStatus[]> {
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

    return await this.withRetry(async (rTx) => {
      const res: any = await rTx.unsafe(sql, [accountUuid])

      for (const row of res) {
        row.created_on = convertTimestamp(row.created_on)
        row.status.last_processing_time = convertTimestamp(row.status.last_processing_time)
        row.status.last_visit = convertTimestamp(row.status.last_visit)
      }

      return convertKeysToCamelCase(res)
    })
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
          w.data_id,
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

    return await this.withRetry(async (rTx) => {
      await rTx`SELECT 1 FROM ${this.client(this.getPendingWorkspaceLockTableName())} WHERE id = 1 FOR UPDATE;`
      // We must have all the conditions in the DB query and we cannot filter anything in the code
      // because of possible concurrency between account services.
      const res: any = await rTx.unsafe(sqlChunks.join(' '), values)

      if ((res.length ?? 0) > 0) {
        await rTx.unsafe(
          `UPDATE ${this.workspaceStatus.getTableName()} SET processing_attempts = processing_attempts + 1, "last_processing_time" = $1 WHERE workspace_uuid = $2`,
          [Date.now(), res[0].uuid]
        )
      }

      return convertKeysToCamelCase(res[0]) as WorkspaceInfoWithStatus
    })
  }

  async setPassword (accountUuid: AccountUuid, hash: Buffer, salt: Buffer): Promise<void> {
    await this.withRetry(
      async (rTx) =>
        await rTx`UPSERT INTO ${this.client(this.account.getPasswordsTableName())} (account_uuid, hash, salt) VALUES (${accountUuid}, ${hash.buffer as any}::bytea, ${salt.buffer as any}::bytea)`
    )
  }

  async resetPassword (accountUuid: AccountUuid): Promise<void> {
    await this.withRetry(
      async (rTx) =>
        await rTx`DELETE FROM ${this.client(this.account.getPasswordsTableName())} WHERE account_uuid = ${accountUuid}`
    )
  }

  async deleteAccount (accountUuid: AccountUuid): Promise<void> {
    await this.withRetry(async (rTx) => {
      const socialIds = await this.socialId.find({ personUuid: accountUuid }, undefined, undefined, rTx)

      for (const socialIdObj of socialIds) {
        await this.integrationSecret.deleteMany({ socialId: socialIdObj._id }, rTx)
        await this.integration.deleteMany({ socialId: socialIdObj._id }, rTx)
      }

      const mailboxes = await this.mailbox.find({ accountUuid }, undefined, undefined, rTx)

      for (const mailboxObj of mailboxes) {
        await this.mailboxSecret.deleteMany({ mailbox: mailboxObj.mailbox }, rTx)
      }

      await this.mailbox.deleteMany({ accountUuid }, rTx)

      await this.socialId.update({ personUuid: accountUuid }, { verifiedOn: undefined }, rTx)

      // Unassign from all workspaces
      await rTx`DELETE FROM ${this.client(this.getWsMembersTableName())} WHERE account_uuid = ${accountUuid}`

      // This removes the account along with the password if any
      await this.account.deleteMany({ uuid: accountUuid }, rTx)
    })
  }

  async listAccounts (search?: string, skip?: number, limit?: number): Promise<AccountAggregatedInfo[]> {
    const sqlChunks: string[] = [
      `
      WITH account_data AS (
        SELECT 
          a.uuid,
          a.timezone,
          a.locale,
          a.automatic,
          a.max_workspaces,
          p.first_name,
          p.last_name,
          p.country,
          p.city,
          p.migrated_to,
          (
            SELECT jsonb_agg(jsonb_build_object(
              'socialId', i.social_id,
              'kind', i.kind,
              'workspaceUuid', i.workspace_uuid
            )) 
            FROM ${this.integration.getTableName()} i 
            WHERE i.social_id IN (SELECT _id FROM ${this.socialId.getTableName()} s WHERE s.person_uuid = a.uuid)
          ) as integrations,
          (
            SELECT jsonb_agg(jsonb_build_object(
              '_id', s._id,
              'type', s.type,
              'value', s.value,
              'personUuid', s.person_uuid,
              'createdOn', s.created_on,
              'verifiedOn', s.verified_on,
              'displayValue', s.display_value
            ))
            FROM ${this.socialId.getTableName()} s
            WHERE s.person_uuid = a.uuid AND s.is_deleted = FALSE
          ) as social_ids,
          (
            SELECT jsonb_agg(jsonb_build_object(
              'uuid', w.uuid,
              'name', w.name,
              'url', w.url,
              'dataId', w.data_id,
              'branding', w.branding,
              'region', w.region,
              'createdBy', w.created_by,
              'createdOn', w.created_on,
              'billingAccount', w.billing_account
            ))
            FROM ${this.workspace.getTableName()} w
            INNER JOIN ${this.getWsMembersTableName()} m ON m.workspace_uuid = w.uuid
            WHERE m.account_uuid = a.uuid
          ) as workspaces
        FROM ${this.account.getTableName()} a
        INNER JOIN ${this.ns}.person p ON p.uuid = a.uuid
    `
    ]

    const values: any[] = []
    let paramIndex = 1

    if (search !== undefined && search !== '') {
      sqlChunks.push(`
        WHERE 
          p.first_name ILIKE $${paramIndex} OR 
          p.last_name ILIKE $${paramIndex} OR
          EXISTS (
            SELECT 1 FROM ${this.socialId.getTableName()} s 
            WHERE s.person_uuid = a.uuid AND s.value ILIKE $${paramIndex}
          )
      `)
      values.push(`%${search}%`)
      paramIndex++
    }

    sqlChunks.push('ORDER BY p.first_name')

    if (limit !== undefined) {
      sqlChunks.push(`LIMIT $${paramIndex}`)
      values.push(limit)
      paramIndex++
    }

    if (skip !== undefined) {
      sqlChunks.push(`OFFSET $${paramIndex}`)
      values.push(skip)
    }

    sqlChunks.push(') SELECT * FROM account_data')

    return await this.withRetry(async (rTx) => {
      const result = await rTx.unsafe(sqlChunks.join(' '), values)

      return result.map((row: any) => {
        // Handle null arrays
        row.integrations = row.integrations ?? []
        row.social_ids = row.social_ids ?? []
        row.workspaces = row.workspaces ?? []

        const converted = convertKeysToCamelCase(row)

        // Convert timestamp fields
        if (converted.workspaces != null) {
          for (const ws of converted.workspaces) {
            ws.createdOn = convertTimestamp(ws.createdOn)
          }
        }

        if (converted.socialIds != null) {
          for (const sid of converted.socialIds) {
            sid.createdOn = convertTimestamp(sid.createdOn)
            sid.verifiedOn = convertTimestamp(sid.verifiedOn)
          }
        }

        return converted as AccountAggregatedInfo
      })
    })
  }

  async generatePersonUuid (): Promise<PersonUuid> {
    const res = await this.client`SELECT gen_random_uuid();`

    return res[0].gen_random_uuid as PersonUuid
  }

  protected getMigrations (): [string, string][] {
    return getMigrations(this.ns)
  }
}
