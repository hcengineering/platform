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

import { Collection, MongoClient } from 'mongodb'

import config from './config'

export interface OldUserRecord {
  telegramId: number
  telegramUsername?: string
  email: string
}

// TODO: remove mongo db after disconnect users
export class MongoDb {
  private constructor (
    private readonly client: MongoClient,
    private readonly users: Collection<OldUserRecord>
  ) {}

  async getAllUsers (): Promise<OldUserRecord[]> {
    return await this.users.find().toArray()
  }

  async removeAllUsers (): Promise<void> {
    await this.users.deleteMany({})
  }

  static async create (): Promise<MongoDb> {
    const client = new MongoClient(config.MongoURL)
    await client.connect()

    const db = client.db(config.MongoDB)

    const userStorage = db.collection<OldUserRecord>('users')

    await db.dropCollection('messages')
    await db.dropCollection('otp')
    await db.dropCollection('replies')
    await db.dropCollection('channels')

    return new MongoDb(client, userStorage)
  }

  async close (): Promise<void> {
    await this.client.close()
  }
}
