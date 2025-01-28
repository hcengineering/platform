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
import core, {
  type Client,
  createClient,
  Hierarchy,
  MeasureMetricsContext,
  ModelDb,
  type Ref,
  SortingOrder,
  type Space,
  TxOperations,
  type WorkspaceUuid
} from '@hcengineering/core'
import { type DbAdapter, wrapAdapterToClient } from '@hcengineering/server-core'
import { createPostgresAdapter, createPostgresTxAdapter } from '..'
import { getDBClient, type PostgresClientReference, shutdownPostgres } from '../utils'
import { genMinModel } from './minmodel'
import { createTaskModel, type Task, type TaskComment, taskPlugin } from './tasks'

const txes = genMinModel()

createTaskModel(txes)

const contextVars: Record<string, any> = {}

describe('postgres operations', () => {
  const baseDbUri: string = process.env.DB_URL ?? 'postgresql://root@localhost:26257/defaultdb?sslmode=disable'
  let dbUuid = crypto.randomUUID() as WorkspaceUuid
  let dbUri: string = baseDbUri.replace('defaultdb', dbUuid)
  const clientRef: PostgresClientReference = getDBClient(contextVars, baseDbUri)
  let hierarchy: Hierarchy
  let model: ModelDb
  let client: Client
  let operations: TxOperations
  let serverStorage: DbAdapter | undefined

  afterAll(async () => {
    clientRef.close()
    await shutdownPostgres(contextVars)
  })

  beforeEach(async () => {
    try {
      dbUuid = crypto.randomUUID() as WorkspaceUuid
      dbUri = baseDbUri.replace('defaultdb', dbUuid)
      const client = await clientRef.getClient()
      await client`CREATE DATABASE ${client(dbUuid)}`
    } catch (err) {
      console.error(err)
    }

    jest.setTimeout(30000)
    await initDb()
  })

  afterEach(async () => {
    try {
      // await client.close()
      // await (await clientRef.getClient()).query(`DROP DATABASE ${dbId}`)
    } catch (err) {
      console.log(err)
    }
    await serverStorage?.close()
  })

  async function initDb (): Promise<void> {
    // Remove all stuff from database.
    hierarchy = new Hierarchy()
    model = new ModelDb(hierarchy)
    for (const t of txes) {
      hierarchy.tx(t)
    }
    for (const t of txes) {
      await model.tx(t)
    }

    const mctx = new MeasureMetricsContext('', {})
    const txStorage = await createPostgresTxAdapter(
      mctx,
      contextVars,
      hierarchy,
      dbUri,
      {
        uuid: dbUuid,
        url: dbUri
      },
      model
    )

    // Put all transactions to Tx
    for (const t of txes) {
      await txStorage.tx(mctx, t)
    }

    await txStorage.close()

    const ctx = new MeasureMetricsContext('client', {})
    const serverStorage = await createPostgresAdapter(
      ctx,
      contextVars,
      hierarchy,
      dbUri,
      {
        uuid: dbUuid,
        url: dbUri
      },
      model
    )
    await serverStorage.init?.(ctx, contextVars)
    client = await createClient(async (handler) => {
      return wrapAdapterToClient(ctx, serverStorage, txes)
    })

    operations = new TxOperations(client, core.account.System)
  }

  it('check add', async () => {
    const times: number[] = []
    for (let i = 0; i < 50; i++) {
      const t = Date.now()
      await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: `my-task-${i}`,
        description: `${i * i}`,
        rate: 20 + i
      })
      times.push(Date.now() - t)
    }

    console.log('createDoc times', times)

    const r = await client.findAll<Task>(taskPlugin.class.Task, {})
    expect(r.length).toEqual(50)
  })

  it('check find by criteria', async () => {
    jest.setTimeout(20000)
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
      rate: 20,
      arr: []
    })

    const doc = (await client.findAll<Task>(taskPlugin.class.Task, {}))[0]
    await operations.updateDoc(doc._class, doc.space, doc._id, { rate: null })
    let tasks = await client.findAll<Task>(taskPlugin.class.Task, {})
    expect(tasks.length).toEqual(1)
    expect(tasks[0].rate).toBeNull()

    await operations.updateDoc(doc._class, doc.space, doc._id, { rate: 30 })
    tasks = await client.findAll<Task>(taskPlugin.class.Task, {})
    expect(tasks.length).toEqual(1)
    expect(tasks[0].rate).toEqual(30)

    await operations.updateDoc(doc._class, doc.space, doc._id, { $inc: { rate: 1 } })
    tasks = await client.findAll<Task>(taskPlugin.class.Task, {})
    expect(tasks.length).toEqual(1)
    expect(tasks[0].rate).toEqual(31)

    await operations.updateDoc(doc._class, doc.space, doc._id, { $inc: { rate: -1 } })
    tasks = await client.findAll<Task>(taskPlugin.class.Task, {})
    expect(tasks.length).toEqual(1)
    expect(tasks[0].rate).toEqual(30)

    await operations.updateDoc(doc._class, doc.space, doc._id, { $push: { arr: 1 } })
    tasks = await client.findAll<Task>(taskPlugin.class.Task, {})
    expect(tasks.length).toEqual(1)
    expect(tasks[0].arr?.length).toEqual(1)
    expect(tasks[0].arr?.[0]).toEqual(1)

    await operations.updateDoc(doc._class, doc.space, doc._id, { $push: { arr: 3 } })
    tasks = await client.findAll<Task>(taskPlugin.class.Task, {})
    expect(tasks.length).toEqual(1)
    expect(tasks[0].arr?.length).toEqual(2)
    expect(tasks[0].arr?.[0]).toEqual(1)
    expect(tasks[0].arr?.[1]).toEqual(3)
  }, 1000000)

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

  it('check attached', async () => {
    const docId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
      name: 'my-task',
      description: 'Descr',
      rate: 20
    })

    const commentId = await operations.addCollection(
      taskPlugin.class.TaskComment,
      '' as Ref<Space>,
      docId,
      taskPlugin.class.Task,
      'tasks',
      {
        message: 'my-msg',
        date: new Date()
      }
    )

    await operations.addCollection(
      taskPlugin.class.TaskComment,
      '' as Ref<Space>,
      docId,
      taskPlugin.class.Task,
      'tasks',
      {
        message: 'my-msg2',
        date: new Date()
      }
    )

    const r2 = await client.findAll<TaskComment>(
      taskPlugin.class.TaskComment,
      {},
      {
        lookup: {
          attachedTo: taskPlugin.class.Task
        }
      }
    )
    expect(r2.length).toEqual(2)
    expect((r2[0].$lookup?.attachedTo as Task)?._id).toEqual(docId)

    const r3 = await client.findAll<Task>(
      taskPlugin.class.Task,
      {},
      {
        lookup: {
          _id: { comment: taskPlugin.class.TaskComment }
        }
      }
    )

    expect(r3).toHaveLength(1)
    expect((r3[0].$lookup as any).comment).toHaveLength(2)

    const comment2Id = await operations.addCollection(
      taskPlugin.class.TaskComment,
      '' as Ref<Space>,
      commentId,
      taskPlugin.class.TaskComment,
      'comments',
      {
        message: 'my-msg3',
        date: new Date()
      }
    )

    const r4 = await client.findAll<TaskComment>(
      taskPlugin.class.TaskComment,
      {
        _id: comment2Id
      },
      {
        lookup: { attachedTo: [taskPlugin.class.TaskComment, { attachedTo: taskPlugin.class.Task } as any] }
      }
    )
    expect((r4[0].$lookup?.attachedTo as TaskComment)?._id).toEqual(commentId)
    expect(((r4[0].$lookup?.attachedTo as any)?.$lookup.attachedTo as Task)?._id).toEqual(docId)
  })

  it('check associations', async () => {
    const association = await operations.findOne(core.class.Association, {})
    if (association == null) {
      throw new Error('Association not found')
    }

    const firstTask = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
      name: 'my-task',
      description: 'Descr',
      rate: 20
    })

    const secondTask = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
      name: 'my-task2',
      description: 'Descr',
      rate: 20
    })

    await operations.createDoc(core.class.Relation, '' as Ref<Space>, {
      docA: firstTask,
      docB: secondTask,
      association: association._id
    })

    const r = await client.findAll(
      taskPlugin.class.Task,
      { _id: firstTask },
      {
        associations: [[association._id, 1]]
      }
    )
    expect(r.length).toEqual(1)
    expect((r[0].$associations?.[association._id][0] as unknown as Task)?._id).toEqual(secondTask)
  })
})
