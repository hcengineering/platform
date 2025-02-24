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

import { MongoClientReference, getMongoClient } from '@hcengineering/mongo'
import { Collection, Db, MongoClient, ObjectId, UpdateFilter, WithId } from 'mongodb'
import { Doc, Ref, SortingOrder, WorkspaceUuid } from '@hcengineering/core'
import { WorkspaceInfoRecord } from '@hcengineering/server-ai-bot'

import config from './config'
import { HistoryRecord } from './types'

const clientRef: MongoClientReference = getMongoClient(config.MongoURL)
let client: MongoClient | undefined

const connectDB = (() => {
  return async () => {
    if (client === undefined) {
      client = await clientRef.getClient()
    }

    return client.db(config.ConfigurationDB)
  }
})()

export async function getDbStorage (): Promise<DbStorage> {
  const db = await connectDB()
  return new DbStorage(db)
}

export class DbStorage {
  private readonly workspacesInfoCollection: Collection<WorkspaceInfoRecord>
  private readonly historyCollection: Collection<HistoryRecord>

  constructor (private readonly db: Db) {
    this.workspacesInfoCollection = this.db.collection<WorkspaceInfoRecord>('workspacesInfo')
    this.historyCollection = this.db.collection<HistoryRecord>('history')
  }

  async addHistoryRecord (record: HistoryRecord): Promise<ObjectId> {
    return (await this.historyCollection.insertOne(record)).insertedId
  }

  async getHistoryRecords (workspace: WorkspaceUuid, objectId: Ref<Doc>): Promise<WithId<HistoryRecord>[]> {
    return await this.historyCollection
      .find({ workspace, objectId }, { sort: { timestamp: SortingOrder.Ascending } })
      .toArray()
  }

  async removeHistoryRecords (_ids: ObjectId[]): Promise<void> {
    await this.historyCollection.deleteMany({ _id: { $in: _ids } })
  }

  async getWorkspace (workspace: string): Promise<WorkspaceInfoRecord | undefined> {
    return (await this.workspacesInfoCollection.findOne({ workspace })) ?? undefined
  }

  async addWorkspace (record: WorkspaceInfoRecord): Promise<void> {
    await this.workspacesInfoCollection.insertOne(record)
  }

  async updateWorkspace (workspace: string, update: UpdateFilter<WorkspaceInfoRecord>): Promise<void> {
    await this.workspacesInfoCollection.updateOne({ workspace }, update)
  }

  close (): void {
    clientRef.close()
  }
}
