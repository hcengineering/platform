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

import { type Class, type Obj, type Query, type Options, type Ref } from '@hcengineering/communication'

import { getDBClient, type PostgresClientReference } from './postgres/connection'
import { type Pipeline, type PipelineContext } from './types'
import { type PostgresWorker, PostgresWorkerImpl } from './postgres/postgres'

/**
 * @public
 */
export async function createPipeline (
  context: PipelineContext,
  broadcast: (obj: Obj) => Promise<void>
): Promise<Pipeline> {
  return await PipelineImpl.create(context, broadcast)
}

class PipelineImpl implements Pipeline {
  private pgClient?: PostgresClientReference
  private db?: PostgresWorker

  private constructor (
    readonly context: PipelineContext,
    readonly _broadcast: (obj: Obj) => Promise<void>
  ) {
    void this.init()
  }

  async broadcast (obj: Obj): Promise<void> {
    await this._broadcast(obj)
  }

  static async create (context: PipelineContext, broadcast: (obj: Obj) => Promise<void>): Promise<PipelineImpl> {
    return new PipelineImpl(context, broadcast)
  }

  async init (): Promise<void> {
    const dbClient = this.context.dbUrl.startsWith('postgresql') ? getDBClient(this.context.dbUrl) : undefined

    if (dbClient === undefined) {
      console.error('Db url is not supported', { dbUrl: this.context.dbUrl })
      return
    }

    this.pgClient = dbClient

    const client = await dbClient.getClient()
    const db = new PostgresWorkerImpl(client, this.context.workspace)

    await db.init()

    this.db = db
  }

  async findAll<T extends Obj>(_class: Ref<Class<T>>, query: Query<T>, options?: Options<T>): Promise<T[]> {
    if (this.db !== undefined) {
      return await this.db.findAll(_class, query, options)
    }

    return []
  }

  async create<T extends Obj>(object: T): Promise<void> {
    if (this.db !== undefined) {
      await this.db.insertOne(object)
      await this.broadcast(object)
    }
  }

  async close (): Promise<void> {
    this.pgClient?.close()
  }
}
