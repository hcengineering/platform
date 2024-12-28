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
import { UUID } from 'mongodb'
import type { Collection, CreateIndexesOptions, Db, Filter, OptionalUnlessRequiredId, Sort as RawSort } from 'mongodb'
import { buildSocialIdString, SocialKey, type AccountRole, type Data, type Version } from '@hcengineering/core'

import type {
  DbCollection,
  Query,
  Operations,
  WorkspaceDbCollection,
  WorkspaceOperation,
  AccountDB,
  Account,
  Person,
  SocialId,
  WorkspaceInvite,
  OTP,
  WorkspaceStatus,
  AccountEvent,
  WorkspaceData,
  WorkspaceInfoWithStatus,
  WorkspaceStatusData,
  Sort,
  WorkspaceMemberInfo
} from '../types'
import { isShallowEqual } from '../utils'

interface MongoIndex {
  key: Record<string, any>
  options: CreateIndexesOptions & { name: string }
}

export class MongoDbCollection<T extends Record<string, any>> implements DbCollection<T> {
  constructor (
    readonly name: string,
    readonly db: Db
  ) {}

  get collection (): Collection<T> {
    return this.db.collection<T>(this.name)
  }

  /**
   * Ensures indices in the collection or creates new if needed.
   * Drops all other indices that are not in the list.
   * @param indicesToEnsure MongoIndex
   */
  async ensureIndices (indicesToEnsure: MongoIndex[]): Promise<void> {
    try {
      const indices = await this.collection.listIndexes().toArray()

      for (const idx of indices) {
        if (idx.key._id !== undefined) {
          continue
        }

        const isEqualIndex = (ensureIdx: MongoIndex): boolean => {
          const { key, options } = ensureIdx
          const sameKeys = isShallowEqual(idx.key, key)

          if (!sameKeys) {
            return false
          }

          const shortIdxOptions = { ...idx }
          delete shortIdxOptions.key
          delete shortIdxOptions.v

          return isShallowEqual(shortIdxOptions, options)
        }

        if (indicesToEnsure.some(isEqualIndex)) {
          continue
        }

        await this.collection.dropIndex(idx.name)
      }
    } catch (e: any) {
      if (e?.codeName === 'NamespaceNotFound') {
        // Nothing to do, new DB
      } else {
        throw e
      }
    }

    for (const { key, options } of indicesToEnsure) {
      await this.collection.createIndex(key, options)
    }
  }

  async find (query: Query<T>, sort?: Sort<T>, limit?: number): Promise<T[]> {
    const cursor = this.collection.find<T>(query as Filter<T>)

    if (sort !== undefined) {
      cursor.sort(sort as RawSort)
    }

    if (limit !== undefined) {
      cursor.limit(limit)
    }

    return await cursor.toArray()
  }

  async findOne (query: Query<T>): Promise<T | null> {
    return await this.collection.findOne<T>(query as Filter<T>)
  }

  async insertOne<K extends keyof T | undefined> (data: Partial<T>, idKey?: K): Promise<any> {
    const toInsert: Partial<T> & {
      _id?: string
    } = { ...data }

    if (idKey !== undefined) {
      const key = (new UUID()).toJSON()
      toInsert[idKey] = data[idKey] ?? key as any
      toInsert._id = toInsert._id ?? toInsert[idKey]
    }

    await this.collection.insertOne(toInsert as OptionalUnlessRequiredId<T>)

    return idKey !== undefined ? toInsert[idKey] : undefined
  }

  async updateOne (query: Query<T>, ops: Operations<T>): Promise<void> {
    const resOps: any = { $set: {} }

    for (const key of Object.keys(ops)) {
      switch (key) {
        case '$inc': {
          resOps.$inc = ops.$inc
          break
        }
        default: {
          resOps.$set[key] = ops[key]
        }
      }
    }

    await this.collection.updateOne(query as Filter<T>, resOps)
  }

  async deleteMany (query: Query<T>): Promise<void> {
    await this.collection.deleteMany(query as Filter<T>)
  }
}

export class AccountMongoDbCollection extends MongoDbCollection<Account> implements DbCollection<Account> {
  constructor (db: Db) {
    super('account', db)
  }

  convertToObj (acc: Account): Account {
    return {
      ...acc,
      hash: acc.hash != null ? Buffer.from(acc.hash.buffer) : acc.hash,
      salt: acc.salt != null ? Buffer.from(acc.salt.buffer) : acc.salt
    }
  }

  async find (
    query: Query<Account>,
    sort?: Sort<Account>,
    limit?: number
  ): Promise<Account[]> {
    const res = await super.find(query, sort, limit)

    return res.map((acc: Account) => this.convertToObj(acc))
  }

  async findOne (query: Query<Account>): Promise<Account | null> {
    const res = await this.collection.findOne<Account>(query as Filter<Account>)

    return res !== null ? this.convertToObj(res) : null
  }

  async insertOne (data: Partial<Account>): Promise<any> {
    return await super.insertOne(data, 'uuid')
  }
}

export class PersonMongoDbCollection extends MongoDbCollection<Person> implements DbCollection<Person> {
  constructor (db: Db) {
    super('person', db)
  }

  async insertOne (data: Partial<Person>): Promise<any> {
    return await super.insertOne(data, 'uuid')
  }
}

export class SocialIdMongoDbCollection extends MongoDbCollection<SocialId> implements DbCollection<SocialId> {
  constructor (db: Db) {
    super('socialId', db)
  }

  async insertOne (data: Partial<SocialId>): Promise<any> {
    if (data.type === undefined || data.value === undefined) {
      throw new Error('Type and value are required')
    }

    return await super.insertOne({
      ...data,
      key: buildSocialIdString(data as SocialKey)
    }, 'id')
  }
}

export class WorkspaceMongoDbCollection extends MongoDbCollection<WorkspaceInfoWithStatus> implements WorkspaceDbCollection {
  constructor (db: Db) {
    super('workspace', db)
  }

  async insertOne (data: Partial<WorkspaceInfoWithStatus>): Promise<any> {
    return await super.insertOne(data, 'uuid')
  }

  async getPendingWorkspace (
    region: string,
    version: Data<Version>,
    operation: WorkspaceOperation,
    processingTimeoutMs: number,
    wsLivenessMs?: number
  ): Promise<WorkspaceInfoWithStatus | undefined> {
    const pendingCreationQuery: Filter<WorkspaceInfoWithStatus>['$or'] = [{ 'status.mode': { $in: ['pending-creation', 'creating'] } }]

    const migrationQuery: Filter<WorkspaceInfoWithStatus>['$or'] = [
      { 'status.mode': { $in: ['migration-backup', 'migration-pending-backup', 'migration-clean', 'migration-pending-clean'] } }
    ]

    const archivingQuery: Filter<WorkspaceInfoWithStatus>['$or'] = [
      { 'status.mode': { $in: ['archiving-pending-backup', 'archiving-backup', 'archiving-pending-clean', 'archiving-clean'] } }
    ]

    const deletingQuery: Filter<WorkspaceInfoWithStatus>['$or'] = [{ 'status.mode': { $in: ['pending-deletion', 'deleting'] } }]
    const restoreQuery: Filter<WorkspaceInfoWithStatus>['$or'] = [{ 'status.mode': { $in: ['pending-restore', 'restoring'] } }]

    const versionQuery = {
      $or: [
        { 'status.versionMajor': { $lt: version.major } },
        { 'status.versionMajor': version.major, 'status.versionMinor': { $lt: version.minor } },
        { 'status.versionMajor': version.major, 'status.versionMinor': version.minor, 'status.versionPatch': { $lt: version.patch } }
      ]
    }
    const pendingUpgradeQuery: Filter<WorkspaceInfoWithStatus>['$or'] = [
      {
        $and: [
          {
            $or: [{ 'status.isDisabled': false }, { 'status.isDisabled': { $exists: false } }]
          },
          {
            $or: [{ 'status.mode': 'active' }, { 'status.mode': { $exists: false } }]
          },
          versionQuery,
          ...(wsLivenessMs !== undefined
            ? [
                {
                  'status.lastVisit': { $gt: Date.now() - wsLivenessMs }
                }
              ]
            : [])
        ]
      },
      {
        $or: [{ 'status.isDisabled': false }, { 'status.isDisabled': { $exists: false } }],
        'status.mode': 'upgrading'
      }
    ]
    // TODO: support returning pending deletion workspaces when we will actually want
    // to clear them with the worker.

    const defaultRegionQuery = { $or: [{ region: { $exists: false } }, { region: '' }] }
    let operationQuery: Filter<WorkspaceInfoWithStatus> = {}

    switch (operation) {
      case 'create':
        operationQuery = { $or: pendingCreationQuery }
        break
      case 'upgrade':
        operationQuery = { $or: pendingUpgradeQuery }
        break
      case 'all':
        operationQuery = { $or: [...pendingCreationQuery, ...pendingUpgradeQuery] }
        break
      case 'all+backup':
        operationQuery = {
          $or: [
            ...pendingCreationQuery,
            ...pendingUpgradeQuery,
            ...migrationQuery,
            ...archivingQuery,
            ...restoreQuery,
            ...deletingQuery
          ]
        }
        break
    }
    const attemptsQuery = { $or: [{ 'status.processingAttempts': { $exists: false } }, { 'status.processingAttempts': { $lte: 3 } }] }

    // We must have all the conditions in the DB query and we cannot filter anything in the code
    // because of possible concurrency between account services. We have to update "lastProcessingTime"
    // at the time of retrieval and not after some additional processing.
    const query: Filter<WorkspaceInfoWithStatus> = {
      $and: [
        { 'status.mode': { $ne: 'manual-creation' } },
        operationQuery,
        attemptsQuery,
        region !== '' ? { region } : defaultRegionQuery,
        {
          $or: [
            { 'status.lastProcessingTime': { $exists: false } },
            { 'status.lastProcessingTime': { $lt: Date.now() - processingTimeoutMs } }
          ]
        }
      ]
    }

    return (
      (await this.collection.findOneAndUpdate(
        query,
        {
          $inc: {
            'status.processingAttempts': 1
          },
          $set: {
            'status.lastProcessingTime': Date.now()
          }
        },
        {
          returnDocument: 'after',
          sort: {
            'status.lastVisit': -1 // Use last visit as a priority
          }
        }
      )) ?? undefined
    )
  }
}

export class WorkspaceStatusMongoDbCollection implements DbCollection<WorkspaceStatus> {
  constructor (private readonly wsCollection: WorkspaceMongoDbCollection) {}

  private toWsQuery (query: Query<WorkspaceStatus>): Query<WorkspaceInfoWithStatus> {
    const res: Query<WorkspaceInfoWithStatus> = {}

    for (const key of Object.keys(query)) {
      const qVal = (query as any)[key]
      const operator = typeof qVal === 'object' ? Object.keys(qVal)[0] : ''
      const targetVal = operator !== '' ? { [operator]: qVal } : qVal

      if (key === 'workspaceUuid') {
        res.uuid = targetVal
      } else {
        if (res.status === undefined) {
          res.status = {}
        }

        (res.status as any)[key] = targetVal
      }
    }

    return res
  }

  private toWsSort (sort?: Sort<WorkspaceStatus>): Sort<WorkspaceInfoWithStatus> | undefined {
    if (sort === undefined) {
      return undefined
    }

    const res: Sort<WorkspaceInfoWithStatus> = {
      status: {}
    }

    for (const key of Object.keys(sort)) {
      (res.status as any)[key] = (sort as any)[key]
    }

    return res
  }

  private toWsOperations (ops: Operations<WorkspaceStatus>): Operations<WorkspaceInfoWithStatus> {
    const res: any = {}

    for (const key of Object.keys(ops)) {
      const op = (ops as any)[key]

      if (['$inc', '$set'].includes(key)) {
        res[key] = {}
        for (const incKey of Object.keys(op)) {
          (res[key])[`status.${incKey}`] = op[incKey]
        }
      } else {
        res[`status.${key}`] = op
      }
    }

    return res
  }

  async find (
    query: Query<WorkspaceStatus>,
    sort?: Sort<WorkspaceStatus>,
    limit?: number
  ): Promise<WorkspaceStatus[]> {
    return (await this.wsCollection.find(this.toWsQuery(query), this.toWsSort(sort), limit)).map((ws) => ws.status)
  }

  async findOne (query: Query<WorkspaceStatus>): Promise<WorkspaceStatus | null> {
    return (await this.wsCollection.findOne(this.toWsQuery(query)))?.status ?? null
  }

  async insertOne (data: Partial<WorkspaceStatus>): Promise<any> {
    if (data.workspaceUuid === undefined) {
      throw new Error('workspaceUuid is required')
    }

    const wsData = await this.wsCollection.findOne({ uuid: data.workspaceUuid })

    if (wsData === null) {
      throw new Error(`Workspace with uuid ${data.workspaceUuid} not found`)
    }

    const statusData: any = {}

    for (const key of Object.keys(data)) {
      if (key !== 'workspaceUuid') {
        statusData[`status.${key}`] = (data as any)[key]
      }
    }

    await this.wsCollection.updateOne({ uuid: data.workspaceUuid }, statusData)

    return data.workspaceUuid
  }

  async updateOne (query: Query<WorkspaceStatus>, ops: Operations<WorkspaceStatus>): Promise<void> {
    await this.wsCollection.updateOne(this.toWsQuery(query), this.toWsOperations(ops))
  }

  async deleteMany (query: Query<WorkspaceStatus>): Promise<void> {
    await this.wsCollection.deleteMany(this.toWsQuery(query))
  }
}

export class WorkspaceInviteMongoDbCollection extends MongoDbCollection<WorkspaceInvite> implements DbCollection<WorkspaceInvite> {
  constructor (db: Db) {
    super('invite', db)
  }

  async insertOne (data: Partial<WorkspaceInvite>): Promise<any> {
    return await super.insertOne(data, 'id')
  }
}

interface WorkspaceMember {
  workspaceUuid: string
  accountUuid: string
  role: AccountRole
}

export class MongoAccountDB implements AccountDB {
  person: PersonMongoDbCollection
  socialId: SocialIdMongoDbCollection
  workspace: WorkspaceMongoDbCollection
  workspaceStatus: WorkspaceStatusMongoDbCollection
  account: AccountMongoDbCollection
  accountEvent: MongoDbCollection<AccountEvent>
  otp: MongoDbCollection<OTP>
  invite: WorkspaceInviteMongoDbCollection

  workspaceMembers: MongoDbCollection<WorkspaceMember>

  constructor (readonly db: Db) {
    this.person = new PersonMongoDbCollection(db)
    this.socialId = new SocialIdMongoDbCollection(db)
    this.workspace = new WorkspaceMongoDbCollection(db)
    this.workspaceStatus = new WorkspaceStatusMongoDbCollection(this.workspace)
    this.account = new AccountMongoDbCollection(db)
    this.accountEvent = new MongoDbCollection<AccountEvent>('accountEvent', db)
    this.otp = new MongoDbCollection<OTP>('otp', db)
    this.invite = new WorkspaceInviteMongoDbCollection(db)

    this.workspaceMembers = new MongoDbCollection<WorkspaceMember>('workspaceMembers', db)
  }

  async init (): Promise<void> {
    await this.account.ensureIndices([
      {
        key: { uuid: 1 },
        options: { unique: true, name: 'hc_account_account_uuid_1' }
      }
    ])

    await this.workspace.ensureIndices([
      {
        key: { uuid: 1 },
        options: {
          unique: true,
          name: 'hc_account_workspace_uuid_1'
        }
      },
      {
        key: { url: 1 },
        options: {
          unique: true,
          name: 'hc_account_workspace_url_1'
        }
      }
    ])

    await this.workspaceMembers.ensureIndices([
      {
        key: { workspaceUuid: 1 },
        options: {
          name: 'hc_account_workspace_members_workspace_uuid_1'
        }
      },
      {
        key: { accountUuid: 1 },
        options: {
          name: 'hc_account_workspace_members_account_uuid_1'
        }
      }
    ])
  }

  async assignWorkspace (accountId: string, workspaceId: string, role: AccountRole): Promise<void> {
    await this.workspaceMembers.insertOne({
      workspaceUuid: workspaceId,
      accountUuid: accountId,
      role
    })
  }

  async unassignWorkspace (accountId: string, workspaceId: string): Promise<void> {
    await this.workspaceMembers.deleteMany({
      workspaceUuid: workspaceId,
      accountUuid: accountId
    })
  }

  async createWorkspace (data: WorkspaceData, status: WorkspaceStatusData): Promise<string> {
    const res = await this.workspace.insertOne(data)

    await this.workspaceStatus.insertOne({
      workspaceUuid: res,
      ...status
    })

    return res
  }

  async updateWorkspaceRole (accountId: string, workspaceId: string, role: AccountRole): Promise<void> {
    await this.workspaceMembers.updateOne(
      {
        workspaceUuid: workspaceId,
        accountUuid: accountId
      },
      { role }
    )
  }

  async getWorkspaceRole (accountId: string, workspaceId: string): Promise<AccountRole | null> {
    const assignment = await this.workspaceMembers.findOne({
      workspaceUuid: workspaceId,
      accountUuid: accountId
    })

    return assignment?.role ?? null
  }

  async getWorkspaceMembers (workspaceId: string): Promise<WorkspaceMemberInfo[]> {
    return (await this.workspaceMembers.find({ workspaceUuid: workspaceId })).map((wmi) => ({
      person: wmi.accountUuid,
      role: wmi.role
    }))
  }

  async getAccountWorkspaces (accountId: string): Promise<WorkspaceInfoWithStatus[]> {
    const members = await this.workspaceMembers.find({ accountUuid: accountId })
    const wsIds = members.map((m) => m.workspaceUuid)

    return await this.workspace.find({ uuid: { $in: wsIds } })
    // const workspaceStatuses = await this.workspaceStatus.find({ workspaceUuid: { $in: wsIds } })
    // const statusesById = workspaceStatuses.reduce<Record<string, WorkspaceStatus>>((acc, ws) => {
    //   acc[ws.workspaceUuid] = ws
    //   return acc
    // }, {})
    // return workspaces.map((ws) => ({ ...ws, status: statusesById[ws.uuid] }))
  }

  async setPassword (accountId: string, passwordHash: Buffer, salt: Buffer): Promise<void> {
    await this.account.updateOne({ uuid: accountId }, { hash: passwordHash, salt })
  }

  async resetPassword (accountId: string): Promise<void> {
    await this.account.updateOne({ uuid: accountId }, { hash: null, salt: null })
  }
}
