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
 * Shared integration test suite for database adapters (MongoDB and PostgreSQL)
 * These tests verify that both adapters work correctly against real database instances
 *
 * Usage in your adapter test file:
 * ```typescript
 * import { runSharedIntegrationTests } from '@hcengineering/server-core/src/__tests__/shared-integration.test'
 *
 * describe('My Adapter Tests', () => {
 *   // ... setup code ...
 *
 *   runSharedIntegrationTests('PostgreSQL', () => ({
 *     client,
 *     operations,
 *     taskPlugin
 *   }))
 * })
 * ```
 */

import core, { type Client, type Ref, SortingOrder, type Space, type TxOperations } from '@hcengineering/core'

/**
 * Test context provided to the shared test suite
 */
export interface TestContext {
  client: Client
  operations: TxOperations
  taskPlugin: any
}

/**
 * Run shared integration tests for a database adapter
 * @param adapterName - Name of the adapter being tested (e.g., 'PostgreSQL', 'MongoDB')
 * @param getContext - Function that returns the current test context
 */
export function runSharedIntegrationTests (adapterName: string, getContext: () => TestContext): void {
  describe(`${adapterName} - Shared Integration Tests`, () => {
    describe('Basic CRUD Operations', () => {
      it('should create a document', async () => {
        const { operations, client, taskPlugin } = getContext()

        const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
          name: 'Integration Test Task',
          description: 'Testing real database',
          rate: 42
        })

        expect(taskId).toBeDefined()

        const tasks: any[] = await client.findAll(taskPlugin.class.Task, {})
        expect(tasks).toHaveLength(1)
        expect(tasks[0].name).toBe('Integration Test Task')
        expect(tasks[0].rate).toBe(42)
      })

      it('should update a document', async () => {
        const { operations, client, taskPlugin } = getContext()

        const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
          name: 'Initial Name',
          description: 'Initial Description',
          rate: 10
        })

        await operations.updateDoc(taskPlugin.class.Task, '' as Ref<Space>, taskId, {
          name: 'Updated Name',
          rate: 20
        } as any)

        const task: any = await client.findOne(taskPlugin.class.Task, { _id: taskId })
        expect(task?.name).toBe('Updated Name')
        expect(task?.rate).toBe(20)
      })

      it('should delete a document', async () => {
        const { operations, client, taskPlugin } = getContext()

        const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
          name: 'To Be Deleted',
          description: 'This will be removed',
          rate: 5
        })

        let tasks: any[] = await client.findAll(taskPlugin.class.Task, {})
        expect(tasks).toHaveLength(1)

        await operations.removeDoc(taskPlugin.class.Task, '' as Ref<Space>, taskId)

        tasks = await client.findAll(taskPlugin.class.Task, {})
        expect(tasks).toHaveLength(0)
      })

      it('should create multiple documents', async () => {
        const { operations, client, taskPlugin } = getContext()

        for (let i = 0; i < 50; i++) {
          await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
            name: `my-task-${i}`,
            description: `${i * i}`,
            rate: 20 + i
          })
        }

        const tasks: any[] = await client.findAll(taskPlugin.class.Task, {})
        expect(tasks.length).toEqual(50)
      })
    })

    describe('Array Operations', () => {
      it('should handle $push operation on arrays', async () => {
        const { operations, client, taskPlugin } = getContext()

        const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
          name: 'Array Test',
          description: 'Testing arrays',
          rate: 1,
          arr: []
        })

        await operations.updateDoc(taskPlugin.class.Task, '' as Ref<Space>, taskId, {
          $push: { arr: 10 }
        } as any)

        let task: any = await client.findOne(taskPlugin.class.Task, { _id: taskId })
        expect(task?.arr).toEqual([10])

        await operations.updateDoc(taskPlugin.class.Task, '' as Ref<Space>, taskId, {
          $push: { arr: 20 }
        } as any)

        task = await client.findOne(taskPlugin.class.Task, { _id: taskId })
        expect(task?.arr).toEqual([10, 20])
      })

      it('should handle $pull operation on arrays', async () => {
        const { operations, client, taskPlugin } = getContext()

        const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
          name: 'Array Pull Test',
          description: 'Testing array removal',
          rate: 1,
          arr: [1, 2, 3, 4, 5]
        })

        await operations.updateDoc(taskPlugin.class.Task, '' as Ref<Space>, taskId, {
          $pull: { arr: 3 }
        } as any)

        const task: any = await client.findOne(taskPlugin.class.Task, { _id: taskId })
        expect(task?.arr).toEqual([1, 2, 4, 5])
      })

      it('should handle arrays with various data types', async () => {
        const { operations, client, taskPlugin } = getContext()

        const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
          name: 'Mixed Array Test',
          description: 'Testing mixed types',
          rate: 1,
          arr: [1, 2, 3]
        })

        const task: any = await client.findOne(taskPlugin.class.Task, { _id: taskId })
        expect(task?.arr).toEqual([1, 2, 3])
      })
    })

    describe('Numeric Operations', () => {
      it('should handle $inc operation', async () => {
        const { operations, client, taskPlugin } = getContext()

        const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
          name: 'Increment Test',
          description: 'Testing increment',
          rate: 100
        })

        await operations.updateDoc(taskPlugin.class.Task, '' as Ref<Space>, taskId, {
          $inc: { rate: 50 }
        } as any)

        let task: any = await client.findOne(taskPlugin.class.Task, { _id: taskId })
        expect(task?.rate).toBe(150)

        await operations.updateDoc(taskPlugin.class.Task, '' as Ref<Space>, taskId, {
          $inc: { rate: -30 }
        } as any)

        task = await client.findOne(taskPlugin.class.Task, { _id: taskId })
        expect(task?.rate).toBe(120)
      })

      it('should handle null values', async () => {
        const { operations, client, taskPlugin } = getContext()

        const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
          name: 'Null Test',
          description: 'Testing null',
          rate: 50
        })

        await operations.updateDoc(taskPlugin.class.Task, '' as Ref<Space>, taskId, {
          rate: null
        } as any)

        const task: any = await client.findOne(taskPlugin.class.Task, { _id: taskId })
        expect(task?.rate).toBeNull()
      })
    })

    describe('Query Operations', () => {
      beforeEach(async () => {
        const { operations, taskPlugin } = getContext()
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
        const { client, taskPlugin } = getContext()

        const tasks: any[] = await client.findAll(taskPlugin.class.Task, { name: 'Task 5' })
        expect(tasks).toHaveLength(1)
        expect(tasks[0].name).toBe('Task 5')
      })

      it('should filter using $like operator', async () => {
        const { client, taskPlugin } = getContext()

        const tasks: any[] = await client.findAll(taskPlugin.class.Task, {
          name: { $like: '%0' }
        })
        expect(tasks.length).toBeGreaterThanOrEqual(1)
        expect(tasks.every((t: any) => t.name.endsWith('0'))).toBe(true)
      })

      it('should filter using $in operator', async () => {
        const { client, taskPlugin } = getContext()

        const tasks: any[] = await client.findAll(taskPlugin.class.Task, {
          rate: { $in: [10, 20, 30] }
        })
        expect(tasks).toHaveLength(3)
        const rates = tasks.map((t: any) => t.rate).sort((a: number, b: number) => a - b)
        expect(rates).toEqual([10, 20, 30])
      })

      it('should filter using $gt and $lt operators', async () => {
        const { client, taskPlugin } = getContext()

        const tasks: any[] = await client.findAll(taskPlugin.class.Task, {
          rate: { $gt: 20, $lt: 70 }
        })
        expect(tasks.length).toBeGreaterThan(0)
        expect(tasks.every((t: any) => t.rate != null && t.rate > 20 && t.rate < 70)).toBe(true)
      })

      it('should filter using $size operator on arrays', async () => {
        const { client, taskPlugin } = getContext()

        const tasks: any[] = await client.findAll(taskPlugin.class.Task, {
          arr: { $size: 5 }
        })
        expect(tasks).toHaveLength(1)
        expect(tasks[0].arr).toHaveLength(5)
      })

      it('should handle sorting ascending', async () => {
        const { client, taskPlugin } = getContext()

        const tasks: any[] = await client.findAll(taskPlugin.class.Task, {}, { sort: { rate: SortingOrder.Ascending } })
        expect(tasks).toHaveLength(10)
        expect(tasks[0].rate).toBe(0)
        expect(tasks[9].rate).toBe(90)
      })

      it('should handle sorting descending', async () => {
        const { client, taskPlugin } = getContext()

        const tasks: any[] = await client.findAll(
          taskPlugin.class.Task,
          {},
          { sort: { rate: SortingOrder.Descending } }
        )
        expect(tasks).toHaveLength(10)
        expect(tasks[0].rate).toBe(90)
        expect(tasks[9].rate).toBe(0)
      })

      it('should handle limit', async () => {
        const { client, taskPlugin } = getContext()

        const tasks: any[] = await client.findAll(taskPlugin.class.Task, {}, { limit: 5 })
        expect(tasks).toHaveLength(5)
      })

      it('should handle combined limit and sort', async () => {
        const { client, taskPlugin } = getContext()

        const tasks: any[] = await client.findAll(
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
        const { operations, client, taskPlugin } = getContext()

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

        const comments: any[] = await client.findAll(taskPlugin.class.TaskComment, {
          attachedTo: taskId
        })

        expect(comments).toHaveLength(2)
        expect(comments[0].message).toBe('First comment')
        expect(comments[1].message).toBe('Second comment')
      })

      it('should handle lookups on attached documents', async () => {
        const { operations, client, taskPlugin } = getContext()

        const taskId = await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
          name: 'Task with Lookup',
          description: 'Testing lookup',
          rate: 25
        })

        const commentId = await operations.addCollection(
          taskPlugin.class.TaskComment,
          '' as Ref<Space>,
          taskId,
          taskPlugin.class.Task,
          'tasks',
          {
            message: 'Comment with lookup',
            date: new Date()
          }
        )

        const comments: any[] = await client.findAll(
          taskPlugin.class.TaskComment,
          { _id: commentId },
          {
            lookup: { attachedTo: taskPlugin.class.Task } as any
          }
        )

        expect(comments).toHaveLength(1)
        expect(comments[0].$lookup?.attachedTo).toBeDefined()
        expect(comments[0].$lookup?.attachedTo._id).toEqual(taskId)
      })
    })

    describe('Associations', () => {
      it('should handle document associations', async () => {
        const { operations, client, taskPlugin } = getContext()

        const association = await operations.findOne(core.class.Association, {})
        if (association == null) {
          // Skip if no associations defined in model
          return
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

        const r: any[] = await client.findAll(
          taskPlugin.class.Task,
          { _id: firstTask },
          {
            associations: [[association._id, 1]]
          }
        )
        expect(r.length).toEqual(1)
        expect(r[0].$associations?.[association._id][0]?._id).toEqual(secondTask)
      })
    })

    describe('Date Handling', () => {
      it('should handle Date objects correctly', async () => {
        const { operations, client, taskPlugin } = getContext()

        const now = new Date()
        const commentId = await operations.createDoc(taskPlugin.class.TaskComment, '' as Ref<Space>, {
          message: 'Date test',
          date: now,
          attachedTo: 'test' as Ref<any>,
          attachedToClass: taskPlugin.class.Task,
          collection: 'comments'
        })

        const comment: any = await client.findOne(taskPlugin.class.TaskComment, { _id: commentId })
        expect(comment?.date).toBeDefined()
        const commentDate = new Date(comment?.date)
        expect(commentDate.getTime()).toBe(now.getTime())
      })
    })

    describe('Document Structure', () => {
      it('should have correct document structure', async () => {
        const { operations, client, taskPlugin } = getContext()

        await operations.createDoc(taskPlugin.class.Task, '' as Ref<Space>, {
          name: 'Schema Test',
          description: 'Testing schema',
          rate: 1
        })

        const tasks: any[] = await client.findAll(taskPlugin.class.Task, {})
        expect(tasks).toHaveLength(1)

        // Verify required fields exist
        const task = tasks[0]
        expect(task._id).toBeDefined()
        expect(task._class).toBeDefined()
        expect(task.space).toBeDefined()
        expect(task.name).toBeDefined()
      })
    })
  })
}
