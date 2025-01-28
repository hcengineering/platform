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
import type { Collection, CreateIndexesOptions, Db, Filter, FindCursor, OptionalUnlessRequiredId, Sort } from 'mongodb'
import { type WorkspaceUuid } from '@hcengineering/core'
import type {
  DbCollection,
  Query,
  ObjectId,
  Operations,
  Workspace,
  AccountDB,
  Account,
  Invite,
  OtpRecord,
  UpgradeStatistic,
  Migration
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
    return await this.findCursor(query, sort, limit).toArray()
  }

  findCursor (query: Query<T>, sort?: { [P in keyof T]?: 'ascending' | 'descending' }, limit?: number): FindCursor<T> {
    const cursor = this.collection.find<T>(query as Filter<T>)

    if (sort !== undefined) {
      cursor.sort(sort as Sort)
    }

    if (limit !== undefined) {
      cursor.limit(limit)
    }

    return cursor
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

export class WorkspaceMongoDbCollection extends MongoDbCollection<Workspace> implements DbCollection<Workspace> {
  constructor (db: Db) {
    super('workspace', db)
  }

  async insertOne<K extends keyof Workspace>(data: Partial<Workspace>, idKey?: K): Promise<any> {
    if (data.uuid === undefined) {
      data.uuid = new UUID().toJSON() as WorkspaceUuid
    }

    return await super.insertOne(data, idKey)
  }
}

export class MongoAccountDB implements AccountDB {
  workspace: WorkspaceMongoDbCollection
  account: MongoDbCollection<Account>
  otp: MongoDbCollection<OtpRecord>
  invite: MongoDbCollection<Invite>
  upgrade: MongoDbCollection<UpgradeStatistic>
  migration: MongoDbCollection<Migration>

  constructor (readonly db: Db) {
    this.workspace = new WorkspaceMongoDbCollection(db)
    this.account = new AccountMongoDbCollection(db)
    this.otp = new MongoDbCollection<OtpRecord>('otp', db)
    this.invite = new MongoDbCollection<Invite>('invite', db)
    this.upgrade = new MongoDbCollection<UpgradeStatistic>('upgrade', db)
    this.migration = new MongoDbCollection<Migration>('migration', db)
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
