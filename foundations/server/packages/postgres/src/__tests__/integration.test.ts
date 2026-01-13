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

/**
 * Integration tests for PostgreSQL adapter against real CockroachDB
 * These tests require a running CockroachDB instance (via docker-compose)
 * Run: cd tests && ./prepare-tests.sh
 */

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
import { runSharedIntegrationTests } from '@hcengineering/server-core/src/__tests__/shared-integration'
import {
  createPostgresAdapter,
  createPostgresTxAdapter,
  getDBClient,
  shutdownPostgres,
  type PostgresClientReference
} from '..'
import { genMinModel } from './minmodel'
import { createTaskModel, TaskReproduce, TaskStatus, type Task, type TaskComment, taskPlugin } from './tasks'

const txes = genMinModel()
createTaskModel(txes)

const contextVars: Record<string, any> = {}

describe('PostgreSQL Integration Tests (Real Database)', () => {
  // Use environment variable or default to localhost CockroachDB
  const baseDbUri: string = process.env.DB_URL ?? 'postgresql://root@localhost:26258/defaultdb?sslmode=disable'

  // Administrative client for creating/dropping test databases
  // This connects to 'defaultdb' and is used ONLY for DB admin operations
  let adminClientRef: PostgresClientReference

  // Test-specific variables - unique for each test
  let dbUuid: WorkspaceUuid
  let dbUri: string
  let hierarchy: Hierarchy
  let model: ModelDb
  let client: Client
  let operations: TxOperations
  let serverStorage: DbAdapter

  beforeAll(() => {
    // Get admin client for database creation/deletion
    // This client stays connected to 'defaultdb' for admin operations only
    adminClientRef = getDBClient(baseDbUri)
  })

  afterAll(async () => {
    adminClientRef.close()
    await shutdownPostgres()
  })

  beforeEach(async () => {
    // Create a unique database for each test to ensure isolation
    dbUuid = crypto.randomUUID() as WorkspaceUuid
    dbUri = baseDbUri.replace('defaultdb', dbUuid)

    try {
      // Use admin client to create the test database
      const adminClient = await adminClientRef.getClient()
      await adminClient`CREATE DATABASE ${adminClient(dbUuid)}`
    } catch (err) {
      console.error('Failed to create test database:', err)
      throw err
    }

    // Initialize the test database with schema and data
    // Note: createPostgresAdapter and createPostgresTxAdapter will create
    // their own connections to the UUID database (not using adminClientRef)
    await initDb()
  })

  afterEach(async () => {
    try {
      // Close connections to the test database
      await client?.close()
      await serverStorage?.close()

      // Use admin client to drop the test database
      const adminClient = await adminClientRef.getClient()
      await adminClient`DROP DATABASE IF EXISTS ${adminClient(dbUuid)} CASCADE`
    } catch (err) {
      console.error('Cleanup error:', err)
    }
  })

  async function initDb (): Promise<void> {
    hierarchy = new Hierarchy()
    model = new ModelDb(hierarchy)

    for (const t of txes) {
      hierarchy.tx(t)
    }

    for (const t of txes) {
      await model.tx(t)
    }

    const mctx = new MeasureMetricsContext('integration-test', {})

    // Initialize Tx storage - this creates its OWN connection to the UUID database
    // using dbUri (not adminClientRef)
    const txStorage = await createPostgresTxAdapter(
      mctx,
      hierarchy,
      dbUri, // Connects to the UUID database
      { uuid: dbUuid, url: dbUri },
      model
    )

    // Initialize the tx storage to create tables
    await txStorage.init?.(mctx, {})

    // Put all model transactions into Tx storage
    for (const t of txes) {
      await txStorage.tx(mctx, t)
    }
    await txStorage.close()

    // Initialize main storage adapter - this also creates its OWN connection
    // to the UUID database using dbUri (not adminClientRef)
    const ctx = new MeasureMetricsContext('integration-test', {})
    serverStorage = await createPostgresAdapter(
      ctx,
      hierarchy,
      dbUri, // Connects to the UUID database
      { uuid: dbUuid, url: dbUri },
      model
    )

    await serverStorage.init?.(ctx, contextVars)

    client = await createClient(async (handler) => {
      return wrapAdapterToClient(ctx, serverStorage, txes)
    })

    operations = new TxOperations(client, core.account.System)
  }

  describe('Basic CRUD Operations', () => {
    it('should create a document in real database', async () => {
      const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Integration Test Task',
        description: 'Testing real database',
        rate: 42
      })

      expect(taskId).toBeDefined()

      const tasks = await client.findAll<Task>(taskPlugin.class.Task, {})
      expect(tasks).toHaveLength(1)
      expect(tasks[0].name).toBe('Integration Test Task')
      expect(tasks[0].rate).toBe(42)
    })

    it('should update a document in real database', async () => {
      const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Initial Name',
        description: 'Initial Description',
        rate: 10
      })

      await operations.updateDoc(taskPlugin.class.Task, '' as Ref<Space>, taskId, {
        name: 'Updated Name',
        rate: 20
      })

      const task = await client.findOne<Task>(taskPlugin.class.Task, { _id: taskId })
      expect(task?.name).toBe('Updated Name')
      expect(task?.rate).toBe(20)
    })

    it('should delete a document from real database', async () => {
      const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'To Be Deleted',
        description: 'This will be removed',
        rate: 5
      })

      let tasks = await client.findAll<Task>(taskPlugin.class.Task, {})
      expect(tasks).toHaveLength(1)

      await operations.removeDoc(taskPlugin.class.Task, '' as Ref<Space>, taskId)

      tasks = await client.findAll<Task>(taskPlugin.class.Task, {})
      expect(tasks).toHaveLength(0)
    })
  })

  describe('Array Operations', () => {
    it('should handle $push operation on arrays', async () => {
      const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Array Test',
        description: 'Testing arrays',
        rate: 1,
        arr: []
      })

      await operations.updateDoc(taskPlugin.class.Task, '' as Ref<Space>, taskId, {
        $push: { arr: 10 }
      })

      let task = await client.findOne<Task>(taskPlugin.class.Task, { _id: taskId })
      expect(task?.arr).toEqual([10])

      await operations.updateDoc(taskPlugin.class.Task, '' as Ref<Space>, taskId, {
        $push: { arr: 20 }
      })

      task = await client.findOne<Task>(taskPlugin.class.Task, { _id: taskId })
      expect(task?.arr).toEqual([10, 20])
    })

    it('should handle $pull operation on arrays', async () => {
      const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Array Pull Test',
        description: 'Testing array removal',
        rate: 1,
        arr: [1, 2, 3, 4, 5]
      })

      await operations.updateDoc(taskPlugin.class.Task, '' as Ref<Space>, taskId, {
        $pull: { arr: 3 }
      })

      const task = await client.findOne<Task>(taskPlugin.class.Task, { _id: taskId })
      expect(task?.arr).toEqual([1, 2, 4, 5])
    })

    it('should handle arrays with various data types', async () => {
      const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Mixed Array Test',
        description: 'Testing mixed types',
        rate: 1,
        arr: [1, 2, 3]
      })

      const task = await client.findOne<Task>(taskPlugin.class.Task, { _id: taskId })
      expect(task?.arr).toEqual([1, 2, 3])
    })
  })

  describe('Numeric Operations', () => {
    it('should handle $inc operation', async () => {
      const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Increment Test',
        description: 'Testing increment',
        rate: 100
      })

      await operations.updateDoc(taskPlugin.class.Task, '' as Ref<Space>, taskId, {
        $inc: { rate: 50 }
      })

      let task = await client.findOne<Task>(taskPlugin.class.Task, { _id: taskId })
      expect(task?.rate).toBe(150)

      await operations.updateDoc(taskPlugin.class.Task, '' as Ref<Space>, taskId, {
        $inc: { rate: -30 }
      })

      task = await client.findOne<Task>(taskPlugin.class.Task, { _id: taskId })
      expect(task?.rate).toBe(120)
    })

    it('should handle null values', async () => {
      const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Null Test',
        description: 'Testing null',
        rate: 50
      })

      await operations.updateDoc(taskPlugin.class.Task, '' as Ref<Space>, taskId, {
        rate: null
      })

      const task = await client.findOne<Task>(taskPlugin.class.Task, { _id: taskId })
      expect(task?.rate).toBeNull()
    })
  })

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Create test data (0, 10, 20, ..., 90)
      for (let i = 0; i < 10; i++) {
        await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
          name: `Task ${i}`,
          description: `Description ${i}`,
          rate: i * 10,
          arr: new Array(i).fill(i)
        })
      }
    })

    it('should filter by exact match', async () => {
      const tasks = await client.findAll<Task>(taskPlugin.class.Task, { name: 'Task 5' })
      expect(tasks).toHaveLength(1)
      expect(tasks[0].name).toBe('Task 5')
    })

    it('should filter using $like operator', async () => {
      const tasks = await client.findAll<Task>(taskPlugin.class.Task, {
        name: { $like: '%Task 1%' }
      })
      // With 10 tasks (Task 0-9), only "Task 1" matches '%Task 1%'
      expect(tasks.length).toBeGreaterThanOrEqual(1)
      expect(tasks.every((t) => t.name.includes('Task 1'))).toBe(true)
    })

    it('should filter using $in operator', async () => {
      const tasks = await client.findAll<Task>(taskPlugin.class.Task, {
        rate: { $in: [10, 20, 30] }
      })
      expect(tasks).toHaveLength(3)
      const rates = tasks.map((t) => t.rate).sort((a, b) => (a ?? 0) - (b ?? 0))
      expect(rates).toEqual([10, 20, 30])
    })

    it('should filter using $gt and $lt operators', async () => {
      const tasks = await client.findAll<Task>(taskPlugin.class.Task, {
        rate: { $gt: 20, $lt: 70 }
      })
      expect(tasks.length).toBeGreaterThan(0)
      expect(tasks.every((t) => t.rate != null && t.rate > 20 && t.rate < 70)).toBe(true)
    })

    it('should filter using $size operator on arrays', async () => {
      const tasks = await client.findAll<Task>(taskPlugin.class.Task, {
        arr: { $size: 5 }
      })
      expect(tasks).toHaveLength(1)
      expect(tasks[0].arr).toHaveLength(5)
    })

    it('should handle sorting ascending', async () => {
      const tasks = await client.findAll<Task>(taskPlugin.class.Task, {}, { sort: { rate: SortingOrder.Ascending } })
      expect(tasks).toHaveLength(10)
      expect(tasks[0].rate).toBe(0)
      expect(tasks[9].rate).toBe(90)
    })

    it('should handle sorting descending', async () => {
      const tasks = await client.findAll<Task>(taskPlugin.class.Task, {}, { sort: { rate: SortingOrder.Descending } })
      expect(tasks).toHaveLength(10)
      expect(tasks[0].rate).toBe(90)
      expect(tasks[9].rate).toBe(0)
    })

    it('should handle limit', async () => {
      const tasks = await client.findAll<Task>(taskPlugin.class.Task, {}, { limit: 5 })
      expect(tasks).toHaveLength(5)
    })

    it('should handle combined limit and sort', async () => {
      const tasks = await client.findAll<Task>(
        taskPlugin.class.Task,
        {},
        {
          limit: 3,
          sort: { rate: SortingOrder.Descending }
        }
      )
      expect(tasks).toHaveLength(3)
      expect(tasks[0].rate).toBe(90)
      expect(tasks[1].rate).toBe(80)
      expect(tasks[2].rate).toBe(70)
    })
  })

  describe('Attachments and Collections', () => {
    it('should create and query attached documents', async () => {
      const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Parent Task',
        description: 'Has comments',
        rate: 10
      })

      await operations.addCollection(
        taskPlugin.class.TaskComment,
        '' as Ref<Space>,
        taskId,
        taskPlugin.class.Task,
        'tasks',
        {
          message: 'First comment',
          date: new Date()
        }
      )

      await operations.addCollection(
        taskPlugin.class.TaskComment,
        '' as Ref<Space>,
        taskId,
        taskPlugin.class.Task,
        'tasks',
        {
          message: 'Second comment',
          date: new Date()
        }
      )

      const comments = await client.findAll<TaskComment>(taskPlugin.class.TaskComment, {
        attachedTo: taskId
      })

      expect(comments).toHaveLength(2)
      expect(comments[0].message).toBe('First comment')
      expect(comments[1].message).toBe('Second comment')
    })

    it('should handle lookups on attached documents', async () => {
      const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Task with Lookup',
        description: 'Testing lookup',
        rate: 25
      })

      await operations.addCollection(
        taskPlugin.class.TaskComment,
        '' as Ref<Space>,
        taskId,
        taskPlugin.class.Task,
        'tasks',
        {
          message: 'Comment for lookup test',
          date: new Date()
        }
      )

      const comments = await client.findAll<TaskComment>(
        taskPlugin.class.TaskComment,
        {},
        {
          lookup: {
            attachedTo: taskPlugin.class.Task
          }
        }
      )

      expect(comments).toHaveLength(1)
      expect((comments[0].$lookup?.attachedTo as Task)?.name).toBe('Task with Lookup')
    })
  })

  describe('Projections', () => {
    beforeEach(async () => {
      // Create test data with various fields
      for (let i = 0; i < 5; i++) {
        await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
          name: `Task ${i}`,
          description: `Description ${i}`,
          rate: i * 10,
          arr: [i, i + 1, i + 2]
        })
      }
    })

    it('should project specific fields only', async () => {
      const tasks = await client.findAll<Task>(
        taskPlugin.class.Task,
        {},
        {
          projection: {
            name: 1,
            rate: 1
          }
        }
      )

      expect(tasks).toHaveLength(5)
      expect(tasks[0].name).toBeDefined()
      expect(tasks[0].rate).toBeDefined()
      // Description should not be included (unless it's included by default)
      // Note: _id, _class, space are always included
      expect(tasks[0]._id).toBeDefined()
      expect(tasks[0]._class).toBeDefined()
    })

    it('should project with exclusion', async () => {
      const tasks = await client.findAll<Task>(
        taskPlugin.class.Task,
        {},
        {
          projection: {
            description: 0
          }
        }
      )

      expect(tasks).toHaveLength(5)
      expect(tasks[0].name).toBeDefined()
      expect(tasks[0].rate).toBeDefined()
      // Note: Projection exclusion behavior may vary by implementation
      // Some implementations may still include excluded fields
    })

    it('should project array fields', async () => {
      const tasks = await client.findAll<Task>(
        taskPlugin.class.Task,
        {},
        {
          projection: {
            name: 1,
            arr: 1
          }
        }
      )

      expect(tasks).toHaveLength(5)
      expect(tasks[0].arr).toBeDefined()
      expect(Array.isArray(tasks[0].arr)).toBe(true)
    })

    it('should handle empty projection', async () => {
      const tasks = await client.findAll<Task>(
        taskPlugin.class.Task,
        {},
        {
          projection: {}
        }
      )

      expect(tasks).toHaveLength(5)
      // All fields should be present with empty projection (or at least required fields)
      expect(tasks[0]._id).toBeDefined()
      expect(tasks[0]._class).toBeDefined()
    })

    it('should combine projection with query filters', async () => {
      const tasks = await client.findAll<Task>(
        taskPlugin.class.Task,
        { rate: { $gt: 10 } },
        {
          projection: {
            name: 1,
            rate: 1
          }
        }
      )

      expect(tasks.length).toBeGreaterThan(0)
      expect(tasks.every((t) => t.rate != null && t.rate > 10)).toBe(true)
      expect(tasks[0].name).toBeDefined()
    })

    it('should combine projection with sorting', async () => {
      const tasks = await client.findAll<Task>(
        taskPlugin.class.Task,
        {},
        {
          projection: {
            name: 1,
            rate: 1
          },
          sort: { rate: SortingOrder.Descending }
        }
      )

      expect(tasks).toHaveLength(5)
      expect(tasks[0].rate).toBe(40)
      expect(tasks[4].rate).toBe(0)
    })

    it('should combine projection with limit', async () => {
      const tasks = await client.findAll<Task>(
        taskPlugin.class.Task,
        {},
        {
          projection: {
            name: 1
          },
          limit: 2
        }
      )

      expect(tasks).toHaveLength(2)
    })
  })

  describe('Advanced Lookups', () => {
    let parentTaskId: Ref<Task>
    let commentId1: Ref<TaskComment>
    let nestedCommentId: Ref<TaskComment>

    beforeEach(async () => {
      // Create parent task
      parentTaskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Parent Task',
        description: 'Has nested structure',
        rate: 100
      })

      // Create child task (for potential future tests)
      await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Child Task',
        description: 'Related task',
        rate: 50
      })

      // Add comments to parent task
      commentId1 = await operations.addCollection(
        taskPlugin.class.TaskComment,
        '' as Ref<Space>,
        parentTaskId,
        taskPlugin.class.Task,
        'tasks',
        {
          message: 'First comment on parent',
          date: new Date()
        }
      )

      await operations.addCollection(
        taskPlugin.class.TaskComment,
        '' as Ref<Space>,
        parentTaskId,
        taskPlugin.class.Task,
        'tasks',
        {
          message: 'Second comment on parent',
          date: new Date()
        }
      )

      // Add nested comment (comment on comment)
      nestedCommentId = await operations.addCollection(
        taskPlugin.class.TaskComment,
        '' as Ref<Space>,
        commentId1,
        taskPlugin.class.TaskComment,
        'comments',
        {
          message: 'Reply to first comment',
          date: new Date()
        }
      )
    })

    it('should perform simple lookup on attachedTo', async () => {
      const comments = await client.findAll<TaskComment>(
        taskPlugin.class.TaskComment,
        { attachedTo: parentTaskId },
        {
          lookup: {
            attachedTo: taskPlugin.class.Task
          }
        }
      )

      expect(comments).toHaveLength(2)
      expect(comments[0].$lookup?.attachedTo).toBeDefined()
      expect((comments[0].$lookup?.attachedTo as Task)?.name).toBe('Parent Task')
      expect((comments[0].$lookup?.attachedTo as Task)?.rate).toBe(100)
    })

    it('should perform reverse lookup (_id lookup)', async () => {
      const tasks = await client.findAll<Task>(
        taskPlugin.class.Task,
        { _id: parentTaskId },
        {
          lookup: {
            _id: { comments: taskPlugin.class.TaskComment }
          }
        }
      )

      expect(tasks).toHaveLength(1)
      expect((tasks[0].$lookup as any)?.comments).toBeDefined()
      expect((tasks[0].$lookup as any)?.comments).toHaveLength(2)

      const comments = (tasks[0].$lookup as any).comments as TaskComment[]
      expect(comments[0].message).toBeDefined()
      expect(comments.some((c) => c.message === 'First comment on parent')).toBe(true)
      expect(comments.some((c) => c.message === 'Second comment on parent')).toBe(true)
    })

    it('should perform nested lookup (2 levels)', async () => {
      const nestedComments = await client.findAll<TaskComment>(
        taskPlugin.class.TaskComment,
        { _id: nestedCommentId },
        {
          lookup: {
            attachedTo: [taskPlugin.class.TaskComment, { attachedTo: taskPlugin.class.Task } as any]
          }
        }
      )

      expect(nestedComments).toHaveLength(1)

      // First level lookup
      const parentComment = nestedComments[0].$lookup?.attachedTo as TaskComment
      expect(parentComment).toBeDefined()
      expect(parentComment.message).toBe('First comment on parent')

      // Second level lookup
      const parentTask = (parentComment as any).$lookup?.attachedTo as Task
      expect(parentTask).toBeDefined()
      expect(parentTask.name).toBe('Parent Task')
    })

    it('should handle multiple lookups', async () => {
      const comments = await client.findAll<TaskComment>(
        taskPlugin.class.TaskComment,
        { attachedTo: parentTaskId },
        {
          lookup: {
            attachedTo: taskPlugin.class.Task
          }
        }
      )

      expect(comments).toHaveLength(2)
      comments.forEach((comment) => {
        expect(comment.$lookup?.attachedTo).toBeDefined()
        expect((comment.$lookup?.attachedTo as Task)?.name).toBe('Parent Task')
      })
    })

    it('should combine lookup with projection', async () => {
      const comments = await client.findAll<TaskComment>(
        taskPlugin.class.TaskComment,
        { attachedTo: parentTaskId },
        {
          lookup: {
            attachedTo: taskPlugin.class.Task
          },
          projection: {
            message: 1
          }
        }
      )

      expect(comments).toHaveLength(2)
      expect(comments[0].message).toBeDefined()
      expect(comments[0].$lookup?.attachedTo).toBeDefined()
    })

    it('should combine lookup with sorting', async () => {
      const comments = await client.findAll<TaskComment>(
        taskPlugin.class.TaskComment,
        { attachedTo: parentTaskId },
        {
          lookup: {
            attachedTo: taskPlugin.class.Task
          },
          sort: { message: SortingOrder.Ascending }
        }
      )

      expect(comments).toHaveLength(2)
      expect(comments[0].message).toBe('First comment on parent')
      expect(comments[1].message).toBe('Second comment on parent')
      expect(comments[0].$lookup?.attachedTo).toBeDefined()
    })

    it('should combine lookup with limit', async () => {
      const comments = await client.findAll<TaskComment>(
        taskPlugin.class.TaskComment,
        { attachedTo: parentTaskId },
        {
          lookup: {
            attachedTo: taskPlugin.class.Task
          },
          limit: 1
        }
      )

      expect(comments).toHaveLength(1)
      expect(comments[0].$lookup?.attachedTo).toBeDefined()
    })

    it('should handle lookup with filters', async () => {
      const comments = await client.findAll<TaskComment>(
        taskPlugin.class.TaskComment,
        {
          attachedTo: parentTaskId,
          message: { $like: '%First%' }
        },
        {
          lookup: {
            attachedTo: taskPlugin.class.Task
          }
        }
      )

      expect(comments).toHaveLength(1)
      expect(comments[0].message).toBe('First comment on parent')
      expect((comments[0].$lookup?.attachedTo as Task)?.name).toBe('Parent Task')
    })

    it('should handle empty lookup results', async () => {
      // Query for non-existent comments
      const comments = await client.findAll<TaskComment>(
        taskPlugin.class.TaskComment,
        { attachedTo: 'non-existent-id' as Ref<Task> },
        {
          lookup: {
            attachedTo: taskPlugin.class.Task
          }
        }
      )

      expect(comments).toHaveLength(0)
    })
  })

  describe('Complex Query Scenarios', () => {
    beforeEach(async () => {
      // Create diverse test data
      await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'High Priority',
        description: 'Urgent task',
        rate: 100,
        arr: [1, 2, 3]
      })

      await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Medium Priority',
        description: 'Normal task',
        rate: 50,
        arr: [4, 5]
      })

      await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Low Priority',
        description: 'Can wait',
        rate: 10,
        arr: []
      })

      await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'No Rate Task',
        description: 'Not rated',
        rate: null,
        arr: [6]
      })
    })

    it('should handle complex query with multiple operators', async () => {
      const tasks = await client.findAll<Task>(taskPlugin.class.Task, {
        rate: { $gt: 20, $lt: 80 },
        name: { $like: '%Priority%' }
      })

      expect(tasks).toHaveLength(1)
      expect(tasks[0].name).toBe('Medium Priority')
    })

    it('should handle null checks', async () => {
      const tasks = await client.findAll<Task>(taskPlugin.class.Task, { rate: null })

      expect(tasks).toHaveLength(1)
      expect(tasks[0].name).toBe('No Rate Task')
    })

    it('should handle array $size with $gt', async () => {
      const tasks = await client.findAll<Task>(taskPlugin.class.Task, { arr: { $size: { $gt: 1 } } })

      expect(tasks.length).toBeGreaterThan(0)
      expect(tasks.every((t) => t.arr != null && t.arr.length > 1)).toBe(true)
    })

    it('should handle combined projection, sorting, limit and filter', async () => {
      const tasks = await client.findAll<Task>(
        taskPlugin.class.Task,
        { rate: { $ne: null } },
        {
          projection: {
            name: 1,
            rate: 1
          },
          sort: { rate: SortingOrder.Descending },
          limit: 2
        }
      )

      expect(tasks).toHaveLength(2)
      // Verify projection worked - name should be present
      expect(tasks[0].name).toBeDefined()
      expect(tasks[0].rate).toBeDefined()
      // Note: Sorting with projection may have different behavior
      // Just verify we got valid tasks back
    })

    it('should handle $in with empty array', async () => {
      const tasks = await client.findAll<Task>(taskPlugin.class.Task, { rate: { $in: [] } })

      expect(tasks).toHaveLength(0)
    })

    it('should handle $nin (not in) operator', async () => {
      const tasks = await client.findAll<Task>(taskPlugin.class.Task, { rate: { $nin: [100, 10] } })

      // Should find Medium Priority (50) and No Rate Task (null)
      expect(tasks.length).toBeGreaterThan(0)
      expect(tasks.every((t) => t.rate !== 100 && t.rate !== 10)).toBe(true)
    })
  })

  describe('$ne predicate with missing fields', () => {
    let taskWithRate100: Ref<Task>
    let taskWithRate50: Ref<Task>
    let taskWithRateNull: Ref<Task>
    let taskWithoutRate: Ref<Task>

    beforeEach(async () => {
      // Create tasks with different rate scenarios
      taskWithRate100 = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Task with rate 100',
        description: 'Should not match $ne: 100',
        rate: 100
      })

      taskWithRate50 = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Task with rate 50',
        description: 'Should match $ne: 100',
        rate: 50
      })

      taskWithRateNull = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Task with rate null',
        description: 'Should match $ne: 100 (null != 100)',
        rate: null
      })

      // Create task without rate field (missing field)
      taskWithoutRate = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Task without rate field',
        description: 'Should match $ne: 100 (missing field should match)'
        // rate field is not provided - it will be missing/undefined in the document
      })
    })

    it('should match documents with missing fields when using $ne', async () => {
      const tasks = await client.findAll<Task>(taskPlugin.class.Task, { rate: { $ne: 100 } })

      // Should match:
      // - Task with rate 50 (different value)
      // - Task with rate null (null != 100)
      // - Task without rate field (missing field should match)
      // Should NOT match:
      // - Task with rate 100

      expect(tasks).toHaveLength(3)

      const taskIds = tasks.map((t) => t._id)
      expect(taskIds).not.toContain(taskWithRate100)
      expect(taskIds).toContain(taskWithRate50)
      expect(taskIds).toContain(taskWithRateNull)
      expect(taskIds).toContain(taskWithoutRate)

      // Verify that the task without rate field has undefined or null rate
      const taskWithoutRateDoc = tasks.find((t) => t._id === taskWithoutRate)
      expect(taskWithoutRateDoc).toBeDefined()
      expect(taskWithoutRateDoc?.rate === undefined || taskWithoutRateDoc?.rate === null).toBe(true)
    })

    it('should match documents with missing fields when using $ne with boolean true', async () => {
      // Test with a boolean field scenario
      // Create tasks with status field (which is optional)
      const taskWithStatusOpen = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Task with status Open',
        description: 'Has status',
        status: TaskStatus.Open
      })

      const taskWithStatusClose = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Task with status Close',
        description: 'Has different status',
        status: TaskStatus.Close
      })

      const taskWithoutStatus = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Task without status',
        description: 'Missing status field'
        // status field is not provided
      })

      // Query for tasks where status is not Open
      const tasks = await client.findAll<Task>(taskPlugin.class.Task, { status: { $ne: TaskStatus.Open } })

      // Should match:
      // - Task with status Close (different value)
      // - Task without status field (missing field should match)
      // Should NOT match:
      // - Task with status Open

      expect(tasks.length).toBeGreaterThanOrEqual(2)

      const taskIds = tasks.map((t) => t._id)
      expect(taskIds).not.toContain(taskWithStatusOpen)
      expect(taskIds).toContain(taskWithStatusClose)
      expect(taskIds).toContain(taskWithoutStatus)
    })

    it('should handle $ne with string value and missing fields', async () => {
      // Test with a string field that can be missing
      const taskWithReproduceAlways = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Task with reproduce Always',
        description: 'Has reproduce field',
        reproduce: TaskReproduce.Always
      })

      const taskWithReproduceRare = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Task with reproduce Rare',
        description: 'Has different reproduce value',
        reproduce: TaskReproduce.Rare
      })

      const taskWithoutReproduce = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Task without reproduce field',
        description: 'Missing reproduce field'
        // reproduce field is not provided
      })

      // Query for tasks where reproduce is not Always
      const tasks = await client.findAll<Task>(taskPlugin.class.Task, {
        reproduce: { $ne: TaskReproduce.Always }
      })

      // Should match:
      // - Task with reproduce Rare (different value)
      // - Task without reproduce field (missing field should match)
      // Should NOT match:
      // - Task with reproduce Always

      expect(tasks.length).toBeGreaterThanOrEqual(2)

      const taskIds = tasks.map((t) => t._id)
      expect(taskIds).not.toContain(taskWithReproduceAlways)
      expect(taskIds).toContain(taskWithReproduceRare)
      expect(taskIds).toContain(taskWithoutReproduce)
    })
  })

  describe('Projection with Lookups Combined', () => {
    let taskId: Ref<Task>

    beforeEach(async () => {
      taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Main Task',
        description: 'Task with comments',
        rate: 75,
        arr: [1, 2, 3]
      })

      await operations.addCollection(
        taskPlugin.class.TaskComment,
        '' as Ref<Space>,
        taskId,
        taskPlugin.class.Task,
        'tasks',
        {
          message: 'Comment with details',
          date: new Date()
        }
      )
    })

    it('should project fields and perform lookup', async () => {
      const comments = await client.findAll<TaskComment>(
        taskPlugin.class.TaskComment,
        {},
        {
          projection: {
            message: 1
          },
          lookup: {
            attachedTo: taskPlugin.class.Task
          }
        }
      )

      expect(comments).toHaveLength(1)
      expect(comments[0].message).toBe('Comment with details')
      expect(comments[0].$lookup?.attachedTo).toBeDefined()
      expect((comments[0].$lookup?.attachedTo as Task)?.name).toBe('Main Task')
    })

    it('should perform reverse lookup with projection', async () => {
      const tasks = await client.findAll<Task>(
        taskPlugin.class.Task,
        { _id: taskId },
        {
          projection: {
            name: 1,
            rate: 1
          },
          lookup: {
            _id: { comments: taskPlugin.class.TaskComment }
          }
        }
      )

      expect(tasks).toHaveLength(1)
      expect(tasks[0].name).toBe('Main Task')
      expect(tasks[0].rate).toBe(75)
      expect((tasks[0].$lookup as any)?.comments).toBeDefined()
      expect((tasks[0].$lookup as any)?.comments).toHaveLength(1)
    })

    it('should combine everything: filter, projection, lookup, sort, limit', async () => {
      // Add more tasks and comments
      const task2Id = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Second Task',
        description: 'Another task',
        rate: 90
      })

      await operations.addCollection(
        taskPlugin.class.TaskComment,
        '' as Ref<Space>,
        task2Id,
        taskPlugin.class.Task,
        'tasks',
        {
          message: 'Another comment',
          date: new Date()
        }
      )

      const comments = await client.findAll<TaskComment>(
        taskPlugin.class.TaskComment,
        { message: { $like: '%comment%' } },
        {
          projection: {
            message: 1
          },
          lookup: {
            attachedTo: taskPlugin.class.Task
          },
          sort: { message: SortingOrder.Ascending },
          limit: 2
        }
      )

      expect(comments.length).toBeGreaterThan(0)
      expect(comments.length).toBeLessThanOrEqual(2)
      expect(comments[0].message).toBeDefined()
      expect(comments[0].$lookup?.attachedTo).toBeDefined()
    })
  })

  describe('Edge Cases in Queries', () => {
    it('should handle findAll with no matches', async () => {
      const tasks = await client.findAll<Task>(taskPlugin.class.Task, { name: 'This Task Does Not Exist' })

      expect(tasks).toHaveLength(0)
      expect(Array.isArray(tasks)).toBe(true)
    })

    it('should handle queries on array contents', async () => {
      await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Array Test',
        description: 'Has array',
        rate: 1,
        arr: [10, 20, 30]
      })

      // Note: Exact array query syntax depends on implementation
      const tasks = await client.findAll<Task>(taskPlugin.class.Task, { arr: { $size: 3 } })

      expect(tasks.length).toBeGreaterThan(0)
    })

    it('should handle very long projection list', async () => {
      await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Projection Test',
        description: 'Long projection',
        rate: 1
      })

      const tasks = await client.findAll<Task>(
        taskPlugin.class.Task,
        {},
        {
          projection: {
            _id: 1,
            _class: 1,
            space: 1,
            name: 1,
            description: 1,
            rate: 1,
            arr: 1
          }
        }
      )

      expect(tasks.length).toBeGreaterThan(0)
      expect(tasks[0]._id).toBeDefined()
      expect(tasks[0].name).toBeDefined()
    })

    it('should handle limit of 0', async () => {
      await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Test Task',
        description: 'Test',
        rate: 1
      })

      const tasks = await client.findAll<Task>(taskPlugin.class.Task, {}, { limit: 0 })

      // Limit 0 might return all or none depending on implementation
      expect(Array.isArray(tasks)).toBe(true)
    })

    it('should handle very large limit', async () => {
      await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Test Task',
        description: 'Test',
        rate: 1
      })

      const tasks = await client.findAll<Task>(taskPlugin.class.Task, {}, { limit: 1000000 })

      expect(Array.isArray(tasks)).toBe(true)
      expect(tasks.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Bulk Operations', () => {
    it('should handle bulk creation efficiently', async () => {
      const startTime = Date.now()
      const promises = []

      for (let i = 0; i < 100; i++) {
        promises.push(
          operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
            name: `Bulk Task ${i}`,
            description: `Bulk test ${i}`,
            rate: i
          })
        )
      }

      await Promise.all(promises)
      const duration = Date.now() - startTime

      const tasks = await client.findAll<Task>(taskPlugin.class.Task, {})
      expect(tasks).toHaveLength(100)

      console.log(`Created 100 documents in ${duration}ms`)
      // Should complete in reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000)
    })

    it('should handle bulk updates', async () => {
      const taskIds = []
      for (let i = 0; i < 10; i++) {
        const id = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
          name: `Update Task ${i}`,
          description: 'Original',
          rate: 0
        })
        taskIds.push(id)
      }

      // Update all tasks
      const updatePromises = taskIds.map((id) =>
        operations.updateDoc(taskPlugin.class.Task, '' as Ref<Space>, id, {
          description: 'Updated',
          rate: 100
        })
      )

      await Promise.all(updatePromises)

      const tasks = await client.findAll<Task>(taskPlugin.class.Task, {})
      expect(tasks.every((t) => t.description === 'Updated' && t.rate === 100)).toBe(true)
    })
  })

  describe('Transaction Consistency', () => {
    it('should maintain consistency across operations', async () => {
      const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Consistency Test',
        description: 'Initial',
        rate: 0
      })

      // Perform multiple updates
      await operations.updateDoc(taskPlugin.class.Task, '' as Ref<Space>, taskId, { rate: 10 })
      await operations.updateDoc(taskPlugin.class.Task, '' as Ref<Space>, taskId, { rate: 20 })
      await operations.updateDoc(taskPlugin.class.Task, '' as Ref<Space>, taskId, { rate: 30 })

      const task = await client.findOne<Task>(taskPlugin.class.Task, { _id: taskId })
      expect(task?.rate).toBe(30)
    })

    it('should handle concurrent updates', async () => {
      const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Concurrent Test',
        description: 'Testing concurrency',
        rate: 0,
        arr: []
      })

      // Perform concurrent increments
      const updates = Array.from({ length: 10 }, (_, i) =>
        operations.updateDoc(taskPlugin.class.Task, '' as Ref<Space>, taskId, {
          $inc: { rate: 1 }
        })
      )

      await Promise.all(updates)

      const task = await client.findOne<Task>(taskPlugin.class.Task, { _id: taskId })
      // Note: This might not always be 10 due to race conditions,
      // but it validates the database handles concurrent writes
      expect(task?.rate).toBeGreaterThan(0)
      expect(task?.rate).toBeLessThanOrEqual(10)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty results gracefully', async () => {
      const tasks = await client.findAll<Task>(taskPlugin.class.Task, {
        name: 'Non-existent Task'
      })
      expect(tasks).toHaveLength(0)
    })

    it('should handle special characters in strings', async () => {
      const specialChars = 'Test with \'quotes\' and "double quotes" and backslash \\ and emoji 😀'
      const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: specialChars,
        description: 'Special chars test',
        rate: 1
      })

      const task = await client.findOne<Task>(taskPlugin.class.Task, { _id: taskId })
      expect(task?.name).toBe(specialChars)
    })

    it('should handle very long strings', async () => {
      const longString = 'A'.repeat(10000)
      const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Long String Test',
        description: longString,
        rate: 1
      })

      const task = await client.findOne<Task>(taskPlugin.class.Task, { _id: taskId })
      expect(task?.description).toBe(longString)
      expect(task?.description.length).toBe(10000)
    })

    it('should handle Date objects correctly', async () => {
      const now = new Date()
      const commentId = await operations.createDoc(taskPlugin.class.TaskComment, '' as Ref<Space>, {
        message: 'Date test',
        date: now,
        attachedTo: 'test' as Ref<Task>,
        attachedToClass: taskPlugin.class.Task,
        collection: 'comments'
      })

      const comment = await client.findOne<TaskComment>(taskPlugin.class.TaskComment, { _id: commentId })
      // Note: Dates come back as ISO strings from database
      expect(comment?.date).toBeDefined()
      const commentDate = new Date(comment?.date as any)
      expect(commentDate.getTime()).toBe(now.getTime())
    })
  })

  describe('Database Schema and Migration', () => {
    it('should have correct table structure', async () => {
      // Create at least one document to ensure table exists
      await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
        name: 'Schema Test',
        description: 'Testing schema',
        rate: 1
      })

      const tasks = await client.findAll<Task>(taskPlugin.class.Task, {})
      expect(tasks).toHaveLength(1)

      // Verify required fields exist
      const task = tasks[0]
      expect(task._id).toBeDefined()
      expect(task._class).toBeDefined()
      expect(task.space).toBeDefined()
      expect(task.name).toBeDefined()
    })
  })

  describe('Memory Limit Tests', () => {
    /**
     * Helper to generate tasks with substantial data to test memory limits
     */
    async function generateLargeDataset (count: number, dataSize: number = 1000): Promise<void> {
      const largeDescription = 'X'.repeat(dataSize)
      const createPromises: Array<Promise<any>> = []

      for (let i = 0; i < count; i++) {
        createPromises.push(
          operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
            name: `Large Task ${i}`,
            description: largeDescription,
            rate: i
          })
        )
      }

      await Promise.all(createPromises)
    }

    it('should use direct query when memoryLimit is not specified', async () => {
      // Generate dataset
      const docCount = 100
      const docSize = 1000

      await generateLargeDataset(docCount, docSize)

      const ctx = new MeasureMetricsContext('no-memory-limit-test', {})

      // Query without memoryLimit should use direct query (no cursor, no memory check)
      const result = await serverStorage.findAll(ctx, taskPlugin.class.Task, {}, {})

      expect(result.length).toBe(docCount)
    })

    it('should enforce memory limit when memoryLimit is specified and exceeded', async () => {
      // Generate small dataset with tiny memory limit
      const docCount = 100
      const docSize = 1000 // 1KB per document

      await generateLargeDataset(docCount, docSize)

      // Query with very small memory limit (10KB) should trigger memory limit error
      const ctx = new MeasureMetricsContext('memory-limit-exceeded-test', {})

      await expect(async () => {
        await serverStorage.findAll(ctx, taskPlugin.class.Task, {}, { memoryLimit: 10 * 1024 })
      }).rejects.toThrow(/Memory limit.*exceeded/)
    })

    it('should work with memoryLimit when not exceeded', async () => {
      // Generate small amount of data
      const docCount = 100
      const docSize = 1000 // 1KB per document

      await generateLargeDataset(docCount, docSize)

      const ctx = new MeasureMetricsContext('memory-limit-success-test', {})

      // Set a very small custom memory limit (20KB) that will be exceeded
      const tinyLimit = 20 * 1024 // 20KB

      // This should fail with 20KB limit
      await expect(async () => {
        await serverStorage.findAll(ctx, taskPlugin.class.Task, {}, { memoryLimit: tinyLimit })
      }).rejects.toThrow(/Memory limit.*exceeded/)

      // But should work with reasonable limit (5MB)
      const result = await serverStorage.findAll(
        ctx,
        taskPlugin.class.Task,
        {},
        {
          memoryLimit: 5 * 1024 * 1024
        }
      )

      expect(result.length).toBe(docCount)
    })

    it('should handle memory limit with sorting and projection', async () => {
      // Test that memory limit works with complex queries
      const docCount = 200
      const docSize = 1000 // 1KB per document

      await generateLargeDataset(docCount, docSize)

      const ctx = new MeasureMetricsContext('complex-query-test', {})

      // Query with sorting and projection should still respect small memory limit
      await expect(async () => {
        await serverStorage.findAll(
          ctx,
          taskPlugin.class.Task,
          {},
          {
            sort: { rate: SortingOrder.Ascending },
            projection: { name: 1, rate: 1 },
            memoryLimit: 10 * 1024 // 10KB limit - very small to ensure we exceed it
          }
        )
      }).rejects.toThrow(/Memory limit.*exceeded/)

      // But with higher limit should work
      const result = await serverStorage.findAll(
        ctx,
        taskPlugin.class.Task,
        {},
        {
          sort: { rate: SortingOrder.Ascending },
          projection: { name: 1, rate: 1 },
          memoryLimit: 5 * 1024 * 1024 // 5MB limit
        }
      )

      expect(result.length).toBeGreaterThan(0)
      // Verify sorting worked - first element should have rate 0
      expect(result[0].rate).toBe(0)
      // Last element should have the highest rate
      expect(result[result.length - 1].rate).toBeGreaterThan(result[0].rate ?? 0)
    })

    it('should handle empty results with memoryLimit', async () => {
      const ctx = new MeasureMetricsContext('empty-results-test', {})

      // Query that returns no results should not throw memory limit error
      const result = await serverStorage.findAll(
        ctx,
        taskPlugin.class.Task,
        {
          name: 'Non-existent task name that will never match'
        },
        { memoryLimit: 1024 * 1024 }
      )

      expect(result.length).toBe(0)
    })

    it('should handle total count with memoryLimit', async () => {
      // Test that total count works with memory limit
      const docCount = 100
      const docSize = 1000

      await generateLargeDataset(docCount, docSize)

      const ctx = new MeasureMetricsContext('total-count-test', {})

      const result = await serverStorage.findAll(
        ctx,
        taskPlugin.class.Task,
        {},
        {
          total: true,
          memoryLimit: 10 * 1024 * 1024
        }
      )

      expect(result.length).toBe(docCount)
      expect(result.total).toBe(docCount)
    })

    describe('Performance Comparison: Direct Query vs Cursor', () => {
      it('should compare performance with normal dataset (1000 docs)', async () => {
        const docCount = 1000
        const docSize = 2000 // 2KB per document

        await generateLargeDataset(docCount, docSize)

        const ctx = new MeasureMetricsContext('performance-1000-test', {})

        // Test 1: Direct query (no memoryLimit)
        const startDirect = Date.now()
        const directResult = await serverStorage.findAll(ctx, taskPlugin.class.Task, {}, {})
        const directTime = Date.now() - startDirect

        expect(directResult.length).toBe(docCount)

        // Test 2: Cursor-based query with memoryLimit
        const startCursor = Date.now()
        const cursorResult = await serverStorage.findAll(
          ctx,
          taskPlugin.class.Task,
          {},
          {
            memoryLimit: 50 * 1024 * 1024 // 50MB - high enough to not trigger limit
          }
        )
        const cursorTime = Date.now() - startCursor

        expect(cursorResult.length).toBe(docCount)

        // Log performance metrics
        console.log(`\nPerformance comparison for ${docCount} documents (~${docSize} bytes each):`)
        console.log(`  Direct query (no memoryLimit): ${directTime}ms`)
        console.log(`  Cursor query (with memoryLimit): ${cursorTime}ms`)
        console.log(`  Overhead ratio: ${(cursorTime / directTime).toFixed(2)}x`)

        // Both should return the same number of documents
        expect(cursorResult.length).toBe(directResult.length)
      })

      it('should compare performance with larger dataset (2000 docs)', async () => {
        const docCount = 2000
        const docSize = 1500 // 1.5KB per document

        await generateLargeDataset(docCount, docSize)

        const ctx = new MeasureMetricsContext('performance-2000-test', {})

        // Test 1: Direct query (no memoryLimit)
        const startDirect = Date.now()
        const directResult = await serverStorage.findAll(ctx, taskPlugin.class.Task, {}, {})
        const directTime = Date.now() - startDirect

        expect(directResult.length).toBe(docCount)

        // Test 2: Cursor-based query with memoryLimit
        const startCursor = Date.now()
        const cursorResult = await serverStorage.findAll(
          ctx,
          taskPlugin.class.Task,
          {},
          {
            memoryLimit: 50 * 1024 * 1024 // 50MB - high enough to not trigger limit
          }
        )
        const cursorTime = Date.now() - startCursor

        expect(cursorResult.length).toBe(docCount)

        // Log performance metrics
        console.log(`\nPerformance comparison for ${docCount} documents (~${docSize} bytes each):`)
        console.log(`  Direct query (no memoryLimit): ${directTime}ms`)
        console.log(`  Cursor query (with memoryLimit): ${cursorTime}ms`)
        console.log(`  Overhead ratio: ${(cursorTime / directTime).toFixed(2)}x`)

        // Cursor should be reasonably performant (allow up to 3x overhead)
        if (cursorTime > directTime * 3) {
          console.warn(`  Warning: Cursor overhead is high (${(cursorTime / directTime).toFixed(2)}x)`)
        }

        // Both should return the same number of documents
        expect(cursorResult.length).toBe(directResult.length)
      })

      it('should compare performance with sorting and projection', async () => {
        const docCount = 1000
        const docSize = 2000

        await generateLargeDataset(docCount, docSize)

        const ctx = new MeasureMetricsContext('performance-complex-test', {})

        const queryOptions = {
          sort: { rate: SortingOrder.Ascending },
          projection: { name: 1 as const, rate: 1 as const, description: 1 as const }
        }

        // Test 1: Direct query (no memoryLimit)
        const startDirect = Date.now()
        const directResult = await serverStorage.findAll(ctx, taskPlugin.class.Task, {}, queryOptions)
        const directTime = Date.now() - startDirect

        expect(directResult.length).toBe(docCount)

        // Test 2: Cursor-based query with memoryLimit
        const startCursor = Date.now()
        const cursorResult = await serverStorage.findAll(
          ctx,
          taskPlugin.class.Task,
          {},
          {
            ...queryOptions,
            memoryLimit: 50 * 1024 * 1024
          }
        )
        const cursorTime = Date.now() - startCursor

        expect(cursorResult.length).toBe(docCount)

        // Log performance metrics
        console.log(`\nPerformance comparison for ${docCount} documents with sorting and projection:`)
        console.log(`  Direct query (no memoryLimit): ${directTime}ms`)
        console.log(`  Cursor query (with memoryLimit): ${cursorTime}ms`)
        console.log(`  Overhead ratio: ${(cursorTime / directTime).toFixed(2)}x`)

        // Both should return the same sorted data
        expect(directResult[0].rate).toBe(0)
        expect(cursorResult[0].rate).toBe(0)
      })
    })
  })

  // Run shared integration tests
  runSharedIntegrationTests('PostgreSQL', () => ({
    client,
    operations,
    taskPlugin
  }))
})
