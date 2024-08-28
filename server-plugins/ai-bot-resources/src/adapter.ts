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

import { MeasureContext, WorkspaceId } from '@hcengineering/core'
import { getMongoClient, MongoClientReference } from '@hcengineering/mongo'
import { AIBotServiceAdapter, WorkspaceInfoRecord } from '@hcengineering/server-ai-bot'
import { Collection, Db, MongoClient } from 'mongodb'

class AIBotAdapter implements AIBotServiceAdapter {
  private readonly workspacesInfoCollection: Collection<WorkspaceInfoRecord>
  private readonly db: Db
  closed = false

  constructor (
    private readonly _client: MongoClientReference,
    private readonly client: MongoClient,
    private readonly _metrics: MeasureContext,
    private readonly dbName: string
  ) {
    this.db = client.db(dbName)
    this.workspacesInfoCollection = this.db.collection<WorkspaceInfoRecord>('workspacesInfo')
  }

  async processWorkspace (workspace: WorkspaceId): Promise<void> {
    if (this.closed) {
      return
    }
    const existsRecord = await this.workspacesInfoCollection.findOne({
      workspace: workspace.name
    })

    if (existsRecord != null && !existsRecord.active) {
      await this.workspacesInfoCollection.updateOne({ workspace: workspace.name }, { $set: { active: true } })
    } else if (existsRecord == null) {
      const record: WorkspaceInfoRecord = {
        workspace: workspace.name,
        active: true
      }

      await this.workspacesInfoCollection.insertOne(record)
    }
  }

  async close (): Promise<void> {
    this.closed = true
    this._client.close()
  }

  metrics (): MeasureContext {
    return this._metrics
  }
}

export async function createAIBotAdapter (url: string, db: string, metrics: MeasureContext): Promise<any> {
  const _client = getMongoClient(url)

  return new AIBotAdapter(_client, await _client.getClient(), metrics, db)
}
