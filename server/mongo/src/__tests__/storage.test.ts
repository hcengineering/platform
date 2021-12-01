/* eslint-disable @typescript-eslint/no-non-null-assertion */
//
// Copyright © 2020 Anticrm Platform Contributors.
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
import core, {
  Account,
  Class,
  Client,
  createClient,
  Doc,
  DocumentQuery,
  DOMAIN_MODEL,
  DOMAIN_TX,
  FindOptions,
  FindResult,
  generateId,
  Hierarchy,
  ModelDb,
  Ref,
  SortingOrder,
  Space,
  Tx,
  TxOperations,
  TxResult,
  TxUpdateDoc
} from '@anticrm/core'
import { createServerStorage, DbAdapter, DbConfiguration, FullTextAdapter, IndexedDoc } from '@anticrm/server-core'
import { Document, MongoClient } from 'mongodb'
import { createMongoAdapter, createMongoTxAdapter } from '..'
import { mongoEscape, mongoUnescape } from '../escaping'
import { getMongoClient, shutdown, _dropAllDBWithPrefix } from '../utils'
import { genMinModel } from './minmodel'
import { createTaskModel, Task, taskPlugin } from './tasks'

const txes = genMinModel()

createTaskModel(txes)

class NullDbAdapter implements DbAdapter {
  async init (model: Tx[]): Promise<void> {}
  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T> | undefined
  ): Promise<FindResult<T>> {
    return []
  }

  async tx (tx: Tx): Promise<TxResult> {
    return {}
  }
}

async function createNullAdapter (hierarchy: Hierarchy, url: string, db: string, modelDb: ModelDb): Promise<DbAdapter> {
  return new NullDbAdapter()
}

class NullFullTextAdapter implements FullTextAdapter {
  async index (doc: IndexedDoc): Promise<TxResult> {
    console.log('noop full text indexer: ', doc)
    return {}
  }

  async update (id: Ref<Doc>, update: Record<string, any>): Promise<TxResult> {
    return {}
  }

  async search (query: any): Promise<IndexedDoc[]> {
    return []
  }
}

async function createNullFullTextAdapter (): Promise<FullTextAdapter> {
  return new NullFullTextAdapter()
}

describe('mongo operations', () => {
  const mongodbUri: string = process.env.MONGODB_URI ?? 'mongodb://localhost:27017'
  let mongoClient!: MongoClient
  let dbId: string = generateId()
  let hierarchy: Hierarchy
  let model: ModelDb
  let client: Client
  let operations: TxOperations

  beforeAll(async () => {
    mongoClient = await getMongoClient(mongodbUri)
    await _dropAllDBWithPrefix('mongo-testdb-', mongoClient)
  })

  afterAll(async () => {
    await shutdown()
  })

  beforeEach(async () => {
    dbId = 'mongo-testdb-' + generateId()
  })

  afterEach(async () => {
    try {
      await mongoClient.db(dbId).dropDatabase()
    } catch (eee) {}
  })

  async function initDb (): Promise<void> {
    // Remove all stuff from database.
    hierarchy = new Hierarchy()
    model = new ModelDb(hierarchy)
    for (const t of txes) {
      await hierarchy.tx(t)
    }
    for (const t of txes) {
      await model.tx(t)
    }

    const txStorage = await createMongoTxAdapter(hierarchy, mongodbUri, dbId, model)

    // Put all transactions to Tx
    for (const t of txes) {
      await txStorage.tx(t)
    }

    const conf: DbConfiguration = {
      domains: {
        [DOMAIN_TX]: 'MongoTx',
        [DOMAIN_MODEL]: 'Null'
      },
      defaultAdapter: 'Mongo',
      adapters: {
        MongoTx: {
          factory: createMongoTxAdapter,
          url: mongodbUri
        },
        Mongo: {
          factory: createMongoAdapter,
          url: mongodbUri
        },
        Null: {
          factory: createNullAdapter,
          url: ''
        }
      },
      fulltextAdapter: {
        factory: createNullFullTextAdapter,
        url: ''
      },
      workspace: dbId
    }
    const serverStorage = await createServerStorage(conf)

    client = await createClient(async (handler) => {
      return await Promise.resolve(serverStorage)
    })

    operations = new TxOperations(client, core.account.System)
  }

  beforeEach(async () => {
    return await initDb()
  })

  it('check add', async () => {
    for (let i = 0; i < 50; i++) {
      await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: `my-task-${i}`,
        description: `${i * i}`,
        rate: 20 + i
      })
    }

    const r = await client.findAll<Task>(taskPlugin.class.Task, {})
    expect(r.length).toEqual(50)

    const r2 = await client.findAll(core.class.Tx, {})
    expect(r2.length).toBeGreaterThan(50)
  })

  it('check find by criteria', async () => {
    for (let i = 0; i < 50; i++) {
      await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: `my-task-${i}`,
        description: `${i * i}`,
        rate: 20 + i
      })
    }

    const r = await client.findAll<Task>(taskPlugin.class.Task, {})
    expect(r.length).toEqual(50)

    const first = await client.findAll<Task>(taskPlugin.class.Task, { name: 'my-task-0' })
    expect(first.length).toEqual(1)

    const second = await client.findAll<Task>(taskPlugin.class.Task, { name: { $like: '%0' } })
    expect(second.length).toEqual(5)

    const third = await client.findAll<Task>(taskPlugin.class.Task, { rate: { $in: [25, 26, 27, 28] } })
    expect(third.length).toEqual(4)
  })

  it('check update', async () => {
    await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
      name: 'my-task',
      description: 'some data ',
      rate: 20
    })

    const doc = (await client.findAll<Task>(taskPlugin.class.Task, {}))[0]

    await operations.updateDoc(doc._class, doc.space, doc._id, { rate: 30 })
    const tasks = await client.findAll<Task>(taskPlugin.class.Task, {})
    expect(tasks.length).toEqual(1)
    expect(tasks[0].rate).toEqual(30)
  })

  it('check remove', async () => {
    for (let i = 0; i < 10; i++) {
      await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: `my-task-${i}`,
        description: `${i * i}`,
        rate: 20 + i
      })
    }

    let r = await client.findAll<Task>(taskPlugin.class.Task, {})
    expect(r.length).toEqual(10)
    await operations.removeDoc<Task>(taskPlugin.class.Task, '' as Ref<Space>, r[0]._id)
    r = await client.findAll<Task>(taskPlugin.class.Task, {})
    expect(r.length).toEqual(9)
  })

  it('limit and sorting', async () => {
    for (let i = 0; i < 5; i++) {
      await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: `my-task-${i}`,
        description: `${i * i}`,
        rate: 20 + i
      })
    }

    const without = await client.findAll(taskPlugin.class.Task, {})
    expect(without).toHaveLength(5)

    const limit = await client.findAll(taskPlugin.class.Task, {}, { limit: 1 })
    expect(limit).toHaveLength(1)

    const sortAsc = await client.findAll(taskPlugin.class.Task, {}, { sort: { name: SortingOrder.Ascending } })
    expect(sortAsc[0].name).toMatch('my-task-0')

    const sortDesc = await client.findAll(taskPlugin.class.Task, {}, { sort: { name: SortingOrder.Descending } })
    expect(sortDesc[0].name).toMatch('my-task-4')
  })

  it('check mongo insert update tx', async () => {
    const db = mongoClient.db(dbId)
    const tx: TxUpdateDoc<Doc> = {
      _id: '60f58968abd82692921c51b4' as Ref<TxUpdateDoc<Doc>>,
      _class: core.class.TxUpdateDoc,
      space: core.space.Tx,
      modifiedBy: 'john@appleseed.com' as Ref<Account>,
      modifiedOn: 1626704232444,
      objectId: '60f58968abd82692921c51b1' as Ref<Doc>,
      objectClass: taskPlugin.class.Task,
      objectSpace: core.space.Model,
      operations: {
        $push: {
          comments: '60f58968abd82692921c51b3'
        }
      }
    }
    const r = await db.collection('tx').insertMany([mongoEscape(tx) as Document])
    expect(r.insertedCount).toEqual(1)

    const v = await db.collection('tx').findOne({ 'operations.\\$push.comments': '60f58968abd82692921c51b3' })
    const d1 = mongoUnescape(v)
    expect(d1).not.toBeNull()
    expect(d1!.operations.$push.comments).toEqual('60f58968abd82692921c51b3')
  })
})
