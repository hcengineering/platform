//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { type PersonAccount } from '@hcengineering/contact'
import { type Account, type Doc, type Ref, SortingOrder, TxOperations } from '@hcengineering/core'
import {
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient,
  createOrUpdate,
  tryMigrate,
  tryUpgrade
} from '@hcengineering/model'
import { makeRank } from '@hcengineering/rank'
import core from '@hcengineering/model-core'
import task from '@hcengineering/task'
import tags from '@hcengineering/tags'
import { timeId, type ToDo, ToDoPriority } from '@hcengineering/time'
import { DOMAIN_TIME } from '.'
import time from './plugin'

export async function migrateWorkSlots (client: TxOperations): Promise<void> {
  const h = client.getHierarchy()
  const desc = h.getDescendants(task.class.Task)
  const oldWorkSlots = await client.findAll(time.class.WorkSlot, {
    attachedToClass: { $in: desc }
  })
  const now = Date.now()
  const todos = new Map<Ref<Doc>, Ref<ToDo>>()
  const count = new Map<Ref<ToDo>, number>()
  let rank = makeRank(undefined, undefined)
  for (const oldWorkSlot of oldWorkSlots) {
    const todo = todos.get(oldWorkSlot.attachedTo)
    if (todo === undefined) {
      const acc = oldWorkSlot.space.replace('_calendar', '') as Ref<Account>
      const account = (await client.findOne(core.class.Account, { _id: acc })) as PersonAccount
      if (account.person !== undefined) {
        rank = makeRank(undefined, rank)
        const todo = await client.addCollection(
          time.class.ProjectToDo,
          time.space.ToDos,
          oldWorkSlot.attachedTo,
          oldWorkSlot.attachedToClass,
          'todos',
          {
            attachedSpace: (oldWorkSlot as any).attachedSpace,
            title: oldWorkSlot.title,
            description: '',
            doneOn: oldWorkSlot.dueDate > now ? null : oldWorkSlot.dueDate,
            workslots: 0,
            priority: ToDoPriority.NoPriority,
            user: account.person,
            visibility: 'public',
            rank
          }
        )
        await client.update(oldWorkSlot, {
          attachedTo: todo,
          attachedToClass: time.class.ProjectToDo,
          collection: 'workslots'
        })
        todos.set(oldWorkSlot.attachedTo, todo)
        count.set(todo, 1)
      }
    } else {
      await client.update(oldWorkSlot, {
        attachedTo: todo,
        attachedToClass: time.class.ProjectToDo,
        collection: 'workslots'
      })
      const c = count.get(todo) ?? 1
      count.set(todo, c + 1)
    }
  }
  for (const [todoId, c] of count.entries()) {
    const todo = await client.findOne(time.class.ToDo, { _id: todoId })
    if (todo === undefined) continue
    const tx = client.txFactory.createTxUpdateDoc(time.class.ToDo, todo.space, todo._id, {
      workslots: c
    })
    tx.space = core.space.DerivedTx
    await client.tx(tx)
  }
}

async function migrateTodosSpace (client: TxOperations): Promise<void> {
  const oldTodos = await client.findAll(time.class.ToDo, {
    space: { $ne: time.space.ToDos }
  })
  for (const oldTodo of oldTodos) {
    const account = (await client.findOne(core.class.Account, {
      _id: oldTodo.space as string as Ref<Account>
    })) as PersonAccount
    if (account.person === undefined) continue
    await client.update(oldTodo, {
      user: account.person,
      space: time.space.ToDos
    })
  }
}

async function migrateTodosRanks (client: TxOperations): Promise<void> {
  const doneTodos = await client.findAll(
    time.class.ToDo,
    {
      rank: { $exists: false },
      doneOn: null
    },
    {
      sort: { modifiedOn: SortingOrder.Ascending }
    }
  )
  let doneTodoRank = makeRank(undefined, undefined)
  for (const todo of doneTodos) {
    await client.update(todo, {
      rank: doneTodoRank
    })
    doneTodoRank = makeRank(undefined, doneTodoRank)
  }

  const undoneTodos = await client.findAll(
    time.class.ToDo,
    {
      rank: { $exists: false },
      doneOn: { $ne: null }
    },
    {
      sort: { doneOn: SortingOrder.Ascending }
    }
  )
  let undoneTodoRank = makeRank(undefined, undefined)
  for (const todo of undoneTodos) {
    await client.update(todo, {
      rank: undoneTodoRank
    })
    undoneTodoRank = makeRank(undefined, undoneTodoRank)
  }
}

async function createDefaultSpace (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(core.class.Space, {
    _id: time.space.ToDos
  })
  if (current === undefined) {
    await tx.createDoc(
      core.class.Space,
      core.space.Space,
      {
        name: 'Todos',
        description: 'Space for all todos',
        private: false,
        archived: false,
        members: []
      },
      time.space.ToDos
    )
  }
}

async function fillProps (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_TIME,
    { _class: time.class.ProjectToDo, visibility: { $exists: false } },
    { visibility: 'public' }
  )
  await client.update(
    DOMAIN_TIME,
    { _class: time.class.ToDo, visibility: { $exists: false } },
    { visibility: 'private' }
  )
  await client.update(DOMAIN_TIME, { priority: { $exists: false } }, { priority: ToDoPriority.NoPriority })
}

export const timeOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, timeId, [
      {
        state: 'm-time-001',
        func: async (client) => {
          await fillProps(client)
        }
      }
    ])
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    await tryUpgrade(client, timeId, [
      {
        state: 'u-time-0001',
        func: async (client) => {
          const tx = new TxOperations(client, core.account.System)
          await createDefaultSpace(tx)
          await createOrUpdate(
            tx,
            tags.class.TagCategory,
            tags.space.Tags,
            {
              icon: tags.icon.Tags,
              label: 'Other',
              targetClass: time.class.ToDo,
              tags: [],
              default: true
            },
            time.category.Other
          )
          await migrateWorkSlots(tx)
          await migrateTodosSpace(tx)
          await migrateTodosRanks(tx)
        }
      }
    ])
  }
}
