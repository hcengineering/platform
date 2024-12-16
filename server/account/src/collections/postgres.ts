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
import postgres from 'postgres'
import { generateId, type Data, type Version } from '@hcengineering/core'

import type {
  DbCollection,
  Query,
  ObjectId,
  Operations,
  Workspace,
  WorkspaceDbCollection,
  WorkspaceInfo,
  WorkspaceOperation,
  AccountDB,
  Account,
  Invite,
  OtpRecord,
  UpgradeStatistic
} from '../types'

export class PostgresDbCollection<T extends Record<string, any>> implements DbCollection<T> {
  constructor (
    readonly name: string,
    readonly client: postgres.Sql
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
        default: {
          currIdx++
          whereChunks.push(`"${key}" = $${currIdx}`)
          values.push(qKey)
        }
      }
    }

    return [`WHERE ${whereChunks.join(' AND ')}`, values]
  }

  protected buildSortClause (sort: { [P in keyof T]?: 'ascending' | 'descending' }): string {
    const sortChunks: string[] = []

    for (const key of Object.keys(sort)) {
      sortChunks.push(`"${key}" ${sort[key] === 'ascending' ? 'ASC' : 'DESC'}`)
    }

    return `ORDER BY ${sortChunks.join(', ')}`
  }

  protected convertToObj (row: any): T {
    return row as T
  }

  async find (query: Query<T>, sort?: { [P in keyof T]?: 'ascending' | 'descending' }, limit?: number): Promise<T[]> {
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

  async insertOne<K extends keyof T>(data: Partial<T>, idKey?: K): Promise<any> {
    const keys: string[] = idKey !== undefined ? [idKey as any] : []
    keys.push(...Object.keys(data))

    const id = generateId()
    const values: any[] = idKey !== undefined ? [id] : []
    values.push(...Object.values(data))

    const sql = `INSERT INTO ${this.name} (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${keys.map((_, idx) => `$${idx + 1}`).join(', ')})`

    await this.client.begin(async (client) => {
      await client.unsafe(sql, values)
    })

    return id
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
  constructor (readonly client: postgres.Sql) {
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

  async insertOne<K extends keyof Account>(data: Partial<Account>, idKey?: K): Promise<any> {
    if (data.workspaces !== undefined) {
      if (data.workspaces.length > 0) {
        console.warn('Cannot assign workspaces directly')
      }

      delete data.workspaces
    }

    return await super.insertOne(data, idKey)
  }
}

export class WorkspacePostgresDbCollection extends PostgresDbCollection<Workspace> implements WorkspaceDbCollection {
  constructor (readonly client: postgres.Sql) {
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

    if (data.accounts !== undefined) {
      if (data.accounts.length > 0) {
        console.warn('Cannot assign workspaces directly')
      }

      delete dbData.accounts
    }

    const version = data.version
    if (data.version !== undefined) {
      delete dbData.version
      dbData.versionMajor = version?.major ?? 0
      dbData.versionMinor = version?.minor ?? 0
      dbData.versionPatch = version?.patch ?? 0
    }

    return dbData
  }

  async insertOne<K extends keyof Workspace>(data: Partial<Workspace>, idKey?: K): Promise<any> {
    return await super.insertOne(this.objectToDb(data), idKey)
  }

  async updateOne (query: Query<Workspace>, ops: Operations<Workspace>): Promise<void> {
    await super.updateOne(query, this.objectToDb(ops))
  }

  async countWorkspacesInRegion (region: string, upToVersion?: Data<Version>, visitedSince?: number): Promise<number> {
    const sqlChunks: string[] = [`SELECT COUNT(_id) FROM ${this.name}`]
    const whereChunks: string[] = []
    const values: any[] = []
    let nextValIdx = 1

    whereChunks.push('(disabled = FALSE OR disabled IS NULL)')

    if (upToVersion !== undefined) {
      whereChunks.push(
        '(("versionMajor" < $1) OR ("versionMajor" = $1 AND "versionMinor" < $2) OR ("versionMajor" = $1 AND "versionMinor" = $2 AND "versionPatch" < $3))'
      )
      values.push(...[upToVersion?.major, upToVersion?.minor, upToVersion?.patch])
      nextValIdx = 4
    }

    if (region !== '') {
      whereChunks.push(`region = $${nextValIdx}`)
      values.push(region)
      nextValIdx++
    } else {
      whereChunks.push("(region IS NULL OR region = '')")
    }

    if (visitedSince !== undefined) {
      whereChunks.push(`"lastVisit" > $${nextValIdx}`)
      values.push(visitedSince)
    }

    sqlChunks.push(`WHERE ${whereChunks.join(' AND ')}`)

    let count = 0

    await this.client.begin(async (client) => {
      const res = await client.unsafe(sqlChunks.join(' '), values)
      count = res[0].count
    })

    return count
  }

  async getPendingWorkspace (
    region: string,
    version: Data<Version>,
    operation: WorkspaceOperation,
    processingTimeoutMs: number,
    wsLivenessMs?: number
  ): Promise<WorkspaceInfo | undefined> {
    const sqlChunks: string[] = [`SELECT * FROM ${this.name}`]
    const whereChunks: string[] = []
    const values: any[] = []

    const pendingCreationSql = "mode IN ('pending-creation', 'creating')"
    const migrationSql =
      "mode IN ('migration-backup', 'migration-pending-backup', 'migration-clean', 'migration-pending-clean')"

    const restoringSql = "mode IN ('pending-restore', 'restoring')"

    const archivingSql = "'archiving-pending-backup', 'archiving-backup', 'archiving-pending-clean', 'archiving-clean')"
    const versionSql =
      '("versionMajor" < $1) OR ("versionMajor" = $1 AND "versionMinor" < $2) OR ("versionMajor" = $1 AND "versionMinor" = $2 AND "versionPatch" < $3)'
    const pendingUpgradeSql = `(((disabled = FALSE OR disabled IS NULL) AND (mode = 'active' OR mode IS NULL) AND ${versionSql} ${wsLivenessMs !== undefined ? 'AND "lastVisit" > $4' : ''}) OR ((disabled = FALSE OR disabled IS NULL) AND mode = 'upgrading'))`
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
        operationSql = `(${pendingCreationSql} OR ${pendingUpgradeSql} OR ${migrationSql} OR ${archivingSql} OR ${restoringSql})`
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

    whereChunks.push("mode <> 'manual-creation'")
    whereChunks.push('(attempts IS NULL OR attempts <= 3)')
    whereChunks.push(`("lastProcessingTime" IS NULL OR "lastProcessingTime" < $${values.length + 1})`)
    values.push(Date.now() - processingTimeoutMs)

    if (region !== '') {
      whereChunks.push(`region = $${values.length + 1}`)
      values.push(region)
    } else {
      whereChunks.push("(region IS NULL OR region = '')")
    }

    sqlChunks.push(`WHERE ${whereChunks.join(' AND ')}`)
    sqlChunks.push('ORDER BY "lastVisit" DESC')
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

    return res[0] as WorkspaceInfo
  }
}

export class InvitePostgresDbCollection extends PostgresDbCollection<Invite> implements DbCollection<Invite> {
  constructor (readonly client: postgres.Sql) {
    super('invite', client)
  }

  protected buildSelectClause (): string {
    return `SELECT 
      _id, 
      json_build_object(
          'name', "workspace"
        ) workspace,
      exp,
      "emailMask",
      "limit",
      role,
      "personId"
    FROM ${this.name}`
  }

  objectToDb (data: Partial<Invite>): any {
    const dbData: any = {
      ...data
    }

    if (data.workspace !== undefined) {
      dbData.workspace = data.workspace.name
    }

    return dbData
  }

  async insertOne<K extends keyof Invite>(data: Partial<Invite>, idKey?: K): Promise<any> {
    return await super.insertOne(this.objectToDb(data), idKey)
  }

  async updateOne (query: Query<Invite>, ops: Operations<Invite>): Promise<void> {
    await super.updateOne(query, this.objectToDb(ops))
  }
}

export class PostgresAccountDB implements AccountDB {
  readonly wsAssignmentName = 'workspace_assignment'

  workspace: WorkspacePostgresDbCollection
  account: PostgresDbCollection<Account>
  otp: PostgresDbCollection<OtpRecord>
  invite: PostgresDbCollection<Invite>
  upgrade: PostgresDbCollection<UpgradeStatistic>

  constructor (readonly client: postgres.Sql) {
    this.workspace = new WorkspacePostgresDbCollection(client)
    this.account = new AccountPostgresDbCollection(client)
    this.otp = new PostgresDbCollection<OtpRecord>('otp', client)
    this.invite = new InvitePostgresDbCollection(client)
    this.upgrade = new PostgresDbCollection<UpgradeStatistic>('upgrade', client)
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

  async assignWorkspace (accountId: ObjectId, workspaceId: ObjectId): Promise<void> {
    await this.client.begin(async (client) => {
      await client`INSERT INTO ${client(this.wsAssignmentName)} (workspace, account) VALUES (${workspaceId}, ${accountId})`
    })
  }

  async unassignWorkspace (accountId: ObjectId, workspaceId: ObjectId): Promise<void> {
    await this.client.begin(async (client) => {
      await client`DELETE FROM ${client(this.wsAssignmentName)} WHERE workspace = ${workspaceId} AND account = ${accountId}`
    })
  }

  getObjectId (id: string): ObjectId {
    return id
  }

  protected getMigrations (): [string, string][] {
    return [this.getV1Migration(), this.getV2Migration()]
  }

  // NOTE: NEVER MODIFY EXISTING MIGRATIONS. IF YOU NEED TO ADJUST THE SCHEMA, ADD A NEW MIGRATION.
  private getV1Migration (): [string, string] {
    return [
      'account_db_v1_init',
      `
      /* ======= ACCOUNT ======= */
      CREATE TABLE IF NOT EXISTS account (
        _id VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        hash BYTEA,
        salt BYTEA NOT NULL,
        first VARCHAR(255) NOT NULL,
        last VARCHAR(255) NOT NULL,
        admin BOOLEAN,
        confirmed BOOLEAN,
        "lastWorkspace" BIGINT,
        "createdOn" BIGINT NOT NULL,
        "lastVisit" BIGINT,
        "githubId" VARCHAR(100),
        "openId" VARCHAR(100),
        PRIMARY KEY(_id)
      );

      CREATE INDEX IF NOT EXISTS account_email ON account ("email");

      /* ======= WORKSPACE ======= */
      CREATE TABLE IF NOT EXISTS workspace (
        _id VARCHAR(255) NOT NULL,
        workspace VARCHAR(255) NOT NULL,
        disabled BOOLEAN,
        "versionMajor" SMALLINT NOT NULL,
        "versionMinor" SMALLINT NOT NULL,
        "versionPatch" SMALLINT NOT NULL,
        branding VARCHAR(255),
        "workspaceUrl" VARCHAR(255),
        "workspaceName" VARCHAR(255),
        "createdOn" BIGINT NOT NULL,
        "lastVisit" BIGINT,
        "createdBy" VARCHAR(255),
        mode VARCHAR(60),
        progress SMALLINT,
        endpoint VARCHAR(255),
        region VARCHAR(100),
        "lastProcessingTime" BIGINT,
        attempts SMALLINT,
        message VARCHAR(1000),
        "backupInfo" JSONB,
        PRIMARY KEY(_id)
      );

      CREATE INDEX IF NOT EXISTS workspace_workspace ON workspace ("workspace");

      /* ======= OTP ======= */
      CREATE TABLE IF NOT EXISTS otp (
        account VARCHAR(255) NOT NULL REFERENCES account (_id),
        otp VARCHAR(20) NOT NULL,
        expires BIGINT NOT NULL,
        "createdOn" BIGINT NOT NULL,
        PRIMARY KEY(account, otp)
      );

      /* ======= INVITE ======= */
      CREATE TABLE IF NOT EXISTS invite (
        _id VARCHAR(255) NOT NULL,
        workspace VARCHAR(255) NOT NULL,
        exp BIGINT NOT NULL,
        "emailMask" VARCHAR(100),
        "limit" SMALLINT,
        role VARCHAR(40),
        "personId" VARCHAR(255),
        PRIMARY KEY(_id)
      );

      /* ======= UPGRADE ======= */
      CREATE TABLE IF NOT EXISTS upgrade (
        region VARCHAR(100) NOT NULL,
        version VARCHAR(100) NOT NULL,
        "startTime" BIGINT NOT NULL,
        total INTEGER NOT NULL,
        "toProcess" INTEGER NOT NULL,
        "lastUpdate" BIGINT,
        PRIMARY KEY(region, version)
      );

      /* ======= SUPPLEMENTARY ======= */
      CREATE TABLE IF NOT EXISTS ${this.wsAssignmentName} (
        workspace VARCHAR(255) NOT NULL REFERENCES workspace (_id),
        account VARCHAR(255) NOT NULL REFERENCES account (_id),
        PRIMARY KEY(workspace, account)
      );
    `
    ]
  }

  private getV2Migration (): [string, string] {
    return [
      'account_db_v2_fix_workspace',
      `

      /* ======= WORKSPACE ======= */
      ALTER TABLE workspace ALTER COLUMN "versionPatch" type INT4;
    `
    ]
  }
}
