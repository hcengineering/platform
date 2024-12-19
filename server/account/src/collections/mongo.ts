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
import { ObjectId as MongoObjectId, UUID } from 'mongodb'
import type { Collection, CreateIndexesOptions, Db, Filter, OptionalUnlessRequiredId, Sort } from 'mongodb'
import type { Data, Version } from '@hcengineering/core'

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

  async find (query: Query<T>, sort?: { [P in keyof T]?: 'ascending' | 'descending' }, limit?: number): Promise<T[]> {
    const cursor = this.collection.find<T>(query as Filter<T>)

    if (sort !== undefined) {
      cursor.sort(sort as Sort)
    }

    if (limit !== undefined) {
      cursor.limit(limit)
    }

    return await cursor.toArray()
  }

  async findOne (query: Query<T>): Promise<T | null> {
    return await this.collection.findOne<T>(query as Filter<T>)
  }

  async insertOne<K extends keyof T>(data: Partial<T>, idKey?: K): Promise<any> {
    const res = await this.collection.insertOne(data as OptionalUnlessRequiredId<T>)

    return res.insertedId
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
      salt: Buffer.from(acc.salt.buffer)
    }
  }

  async find (
    query: Query<Account>,
    sort?: { [P in keyof Account]?: 'ascending' | 'descending' },
    limit?: number
  ): Promise<Account[]> {
    const res = await super.find(query, sort, limit)

    return res.map((acc: Account) => this.convertToObj(acc))
  }

  async findOne (query: Query<Account>): Promise<Account | null> {
    const res = await this.collection.findOne<Account>(query as Filter<Account>)

    return res !== null ? this.convertToObj(res) : null
  }
}

export class WorkspaceMongoDbCollection extends MongoDbCollection<Workspace> implements WorkspaceDbCollection {
  constructor (db: Db) {
    super('workspace', db)
  }

  async insertOne<K extends keyof Workspace>(data: Partial<Workspace>, idKey?: K): Promise<any> {
    if (data.uuid === undefined) {
      data.uuid = new UUID().toJSON()
    }

    return await super.insertOne(data, idKey)
  }

  async countWorkspacesInRegion (region: string, upToVersion?: Data<Version>, visitedSince?: number): Promise<number> {
    const regionQuery = region === '' ? { $or: [{ region: { $exists: false } }, { region: '' }] } : { region }
    const query: Filter<Workspace>['$and'] = [
      regionQuery,
      { $or: [{ disabled: false }, { disabled: { $exists: false } }] }
    ]

    if (upToVersion !== undefined) {
      query.push({
        $or: [
          { 'version.major': { $lt: upToVersion.major } },
          { 'version.major': upToVersion.major, 'version.minor': { $lt: upToVersion.minor } },
          {
            'version.major': upToVersion.major,
            'version.minor': upToVersion.minor,
            'version.patch': { $lt: upToVersion.patch }
          }
        ]
      })
    }

    if (visitedSince !== undefined) {
      query.push({ lastVisit: { $gt: visitedSince } })
    }

    return await this.db.collection<Workspace>(this.name).countDocuments({
      $and: query
    })
  }

  async getPendingWorkspace (
    region: string,
    version: Data<Version>,
    operation: WorkspaceOperation,
    processingTimeoutMs: number,
    wsLivenessMs?: number
  ): Promise<WorkspaceInfo | undefined> {
    const pendingCreationQuery: Filter<Workspace>['$or'] = [{ mode: { $in: ['pending-creation', 'creating'] } }]

    const migrationQuery: Filter<Workspace>['$or'] = [
      { mode: { $in: ['migration-backup', 'migration-pending-backup', 'migration-clean', 'migration-pending-clean'] } }
    ]

    const archivingQuery: Filter<Workspace>['$or'] = [
      { mode: { $in: ['archiving-pending-backup', 'archiving-backup', 'archiving-pending-clean', 'archiving-clean'] } }
    ]

    const restoreQuery: Filter<Workspace>['$or'] = [{ mode: { $in: ['pending-restore', 'restoring'] } }]

    const versionQuery = {
      $or: [
        { 'version.major': { $lt: version.major } },
        { 'version.major': version.major, 'version.minor': { $lt: version.minor } },
        { 'version.major': version.major, 'version.minor': version.minor, 'version.patch': { $lt: version.patch } }
      ]
    }
    const pendingUpgradeQuery: Filter<Workspace>['$or'] = [
      {
        $and: [
          {
            $or: [{ disabled: false }, { disabled: { $exists: false } }]
          },
          {
            $or: [{ mode: 'active' }, { mode: { $exists: false } }]
          },
          versionQuery,
          ...(wsLivenessMs !== undefined
            ? [
                {
                  lastVisit: { $gt: Date.now() - wsLivenessMs }
                }
              ]
            : [])
        ]
      },
      {
        $or: [{ disabled: false }, { disabled: { $exists: false } }],
        mode: 'upgrading'
      }
    ]
    // TODO: support returning pending deletion workspaces when we will actually want
    // to clear them with the worker.

    const defaultRegionQuery = { $or: [{ region: { $exists: false } }, { region: '' }] }
    let operationQuery: Filter<Workspace> = {}

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
          $or: [...pendingCreationQuery, ...pendingUpgradeQuery, ...migrationQuery, ...archivingQuery, ...restoreQuery]
        }
        break
    }
    const attemptsQuery = { $or: [{ attempts: { $exists: false } }, { attempts: { $lte: 3 } }] }

    // We must have all the conditions in the DB query and we cannot filter anything in the code
    // because of possible concurrency between account services. We have to update "lastProcessingTime"
    // at the time of retrieval and not after some additional processing.
    const query: Filter<Workspace> = {
      $and: [
        { mode: { $ne: 'manual-creation' } },
        operationQuery,
        attemptsQuery,
        region !== '' ? { region } : defaultRegionQuery,
        {
          $or: [
            { lastProcessingTime: { $exists: false } },
            { lastProcessingTime: { $lt: Date.now() - processingTimeoutMs } }
          ]
        }
      ]
    }

    return (
      (await this.collection.findOneAndUpdate(
        query,
        {
          $inc: {
            attempts: 1
          },
          $set: {
            lastProcessingTime: Date.now()
          }
        },
        {
          returnDocument: 'after',
          sort: {
            lastVisit: -1 // Use last visit as a priority
          }
        }
      )) ?? undefined
    )
  }
}

export class MongoAccountDB implements AccountDB {
  workspace: WorkspaceMongoDbCollection
  account: MongoDbCollection<Account>
  otp: MongoDbCollection<OtpRecord>
  invite: MongoDbCollection<Invite>
  upgrade: MongoDbCollection<UpgradeStatistic>

  constructor (readonly db: Db) {
    this.workspace = new WorkspaceMongoDbCollection(db)
    this.account = new AccountMongoDbCollection(db)
    this.otp = new MongoDbCollection<OtpRecord>('otp', db)
    this.invite = new MongoDbCollection<Invite>('invite', db)
    this.upgrade = new MongoDbCollection<UpgradeStatistic>('upgrade', db)
  }

  async init (): Promise<void> {
    await this.account.ensureIndices([
      {
        key: { email: 1 },
        options: { unique: true, name: 'hc_account_email_1' }
      }
    ])

    await this.workspace.ensureIndices([
      {
        key: { workspace: 1 },
        options: {
          unique: true,
          name: 'hc_account_workspace_1'
        }
      },
      {
        key: { workspaceUrl: 1 },
        options: {
          unique: true,
          name: 'hc_account_workspaceUrl_1'
        }
      }
    ])
  }

  async assignWorkspace (accountId: ObjectId, workspaceId: ObjectId): Promise<void> {
    await this.db
      .collection<Workspace>('workspace')
      .updateOne({ _id: workspaceId }, { $addToSet: { accounts: accountId } })

    await this.db
      .collection<Account>('account')
      .updateOne({ _id: accountId }, { $addToSet: { workspaces: workspaceId } })
  }

  async unassignWorkspace (accountId: ObjectId, workspaceId: ObjectId): Promise<void> {
    await this.db.collection<Workspace>('workspace').updateOne({ _id: workspaceId }, { $pull: { accounts: accountId } })

    await this.db.collection<Account>('account').updateOne({ _id: accountId }, { $pull: { workspaces: workspaceId } })
  }

  getObjectId (id: string): ObjectId {
    return new MongoObjectId(id)
  }
}
