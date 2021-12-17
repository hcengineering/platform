//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import { AttachedDoc, Class, Client, Doc, DocWithRank, Domain, DOMAIN_TX, genRanks, Ref, Space, TxCUD, TxOperations } from '@anticrm/core'
import {
  MigrateOperation,
  MigrateUpdate,
  MigrationClient,
  MigrationResult,
  MigrationUpgradeClient
} from '@anticrm/model'
import core from '@anticrm/model-core'
import { createProjectKanban, KanbanTemplate } from '@anticrm/task'
import { DOMAIN_TASK, DOMAIN_STATE, DOMAIN_KANBAN } from '.'
import task from './plugin'

function logInfo (msg: string, result: MigrationResult): void {
  if (result.updated > 0) {
    console.log(`Task: Migrate ${msg} ${result.updated}`)
  }
}
async function migrateClass<T extends Doc> (
  client: MigrationClient,
  domain: Domain,
  from: Ref<Class<Doc>>,
  to: Ref<Class<T>>,
  extraOps: MigrateUpdate<T> = {},
  txExtraOps: MigrateUpdate<TxCUD<Doc>> = {}
): Promise<void> {
  logInfo(`${from} => ${to}: `, await client.update<Doc>(domain, { _class: from }, { ...extraOps, _class: to }))
  logInfo(
    `${from} => ${to} Transactions`,
    await client.update<TxCUD<Doc>>(DOMAIN_TX, { objectClass: from }, { ...txExtraOps, objectClass: to })
  )
}

export const taskOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    // Since we should not have Task class instances, we convert them all to Issue.
    await migrateClass(client, DOMAIN_TASK, task.class.Task, task.class.Issue)
    await migrateClass(client, DOMAIN_STATE, 'core:class:State' as Ref<Class<Doc>>, task.class.State)
    await migrateClass(client, DOMAIN_STATE, 'core:class:WonState' as Ref<Class<Doc>>, task.class.WonState)
    await migrateClass(client, DOMAIN_STATE, 'core:class:LostState' as Ref<Class<Doc>>, task.class.LostState)
    await migrateClass(client, DOMAIN_KANBAN, 'view:class:Kanban' as Ref<Class<Doc>>, task.class.Kanban)
    await migrateClass(
      client,
      DOMAIN_KANBAN,
      'view:class:Sequence' as Ref<Class<Doc>>,
      task.class.Sequence,
      { space: task.space.Sequence },
      { objectSpace: task.space.Sequence }
    )

    // Update attached to for task
    await client.update(
      DOMAIN_KANBAN,
      { _class: task.class.Sequence, attachedTo: task.class.Task },
      { attachedTo: task.class.Issue }
    )

    await migrateClass(client, DOMAIN_KANBAN, 'view:class:KanbanTemplate' as Ref<Class<Doc>>, task.class.KanbanTemplate)
    await migrateClass(client, DOMAIN_KANBAN, 'view:class:StateTemplate' as Ref<Class<Doc>>, task.class.StateTemplate)
    await migrateClass(
      client,
      DOMAIN_KANBAN,
      'view:class:DoneStateTemplate' as Ref<Class<Doc>>,
      task.class.DoneStateTemplate
    )
    await migrateClass(
      client,
      DOMAIN_KANBAN,
      'view:class:WonStateTemplate' as Ref<Class<Doc>>,
      task.class.WonStateTemplate
    )
    await migrateClass(
      client,
      DOMAIN_KANBAN,
      'view:class:LostStateTemplate' as Ref<Class<Doc>>,
      task.class.LostStateTemplate
    )

    await client.move(
      'recruit' as Domain,
      {
        _class: 'recruit:class:Applicant' as Ref<Class<Doc>>
      },
      DOMAIN_TASK
    )

    await client.move(
      'lead' as Domain,
      {
        _class: 'lead:class:Lead' as Ref<Class<Doc>>
      },
      DOMAIN_TASK
    )

    // Update done states for tasks
    await client.update(DOMAIN_TASK, { _class: task.class.Issue, doneState: { $exists: false } }, { doneState: null })
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    console.log('Task: Performing model upgrades')

    const ops = new TxOperations(client, core.account.System)
    if ((await client.findOne(task.class.Sequence, { attachedTo: task.class.Issue })) === undefined) {
      console.info('Task: Create sequence for default task project.')
      // We need to create sequence
      await ops.createDoc(task.class.Sequence, task.space.Sequence, {
        attachedTo: task.class.Issue,
        sequence: 0
      })
    } else {
      console.log('Task: => sequence is ok')
    }
    if ((await client.findOne(task.class.Kanban, { attachedTo: task.space.TasksPublic })) === undefined) {
      console.info('Task: Create kanban for default task project.')
      await createProjectKanban(task.space.TasksPublic, async (_class, space, data, id) => {
        const doc = await ops.findOne<Doc>(_class, { _id: id })
        if (doc === undefined) {
          await ops.createDoc(_class, space, data, id)
        } else {
          await ops.updateDoc(_class, space, id, data)
        }
      }).catch((err) => console.error(err))
    } else {
      console.log('Task: => public project Kanban is ok')
    }

    console.log('View: Performing model upgrades')

    await createMissingDoneStates(client, ops)
    await updateRankItems({ client, ops, _class: task.class.State, extractOrder: (kanban) => kanban.states })
    await updateRankItems({ client, ops, _class: task.class.DoneState, extractOrder: (kanban) => kanban.doneStates })
    await updateRankItems({ client, ops, _class: task.class.Task, extractOrder: (kanban) => kanban.order })
    await updateTemplateRankItems({ client, ops, _class: task.class.StateTemplate, extractOrder: (kanban) => kanban.states })
    await updateTemplateRankItems({ client, ops, _class: task.class.DoneStateTemplate, extractOrder: (kanban) => kanban.doneStates })
  }
}

async function createMissingDoneStates (client: Client, ops: TxOperations): Promise<void> {
  const spacesWithStates = await client.findAll(task.class.SpaceWithStates, {})
  const doneStates = await client.findAll(task.class.DoneState, {})
  const spaceIdsWithDoneStates = new Set(doneStates.map(x => x.space))
  const outdatedSpaces = spacesWithStates.filter((space) => !spaceIdsWithDoneStates.has(space._id))

  const pairRanks = [...genRanks(2)]

  await Promise.all(
    outdatedSpaces
      .map(async (space) => {
        console.log(`Creating done states for space: ${space._id}`)
        try {
          await Promise.all([
            ops.createDoc(task.class.WonState, space._id, {
              title: 'Won',
              rank: pairRanks[0]
            }),
            ops.createDoc(task.class.LostState, space._id, {
              title: 'Lost',
              rank: pairRanks[1]
            })
          ])
        } catch (e) {
          console.error(e)
        }
      }))
}

async function updateRankItems<T extends DocWithRank> ({
  client,
  ops,
  _class,
  extractOrder
}: {
  client: Client
  ops: TxOperations
  _class: Ref<Class<T>>
  extractOrder: (kanban: any) => Ref<T>[]
}): Promise<void> {
  const allItems = await client.findAll(_class, {})
  const unorderedItems = allItems
    .filter((item) => item.rank === undefined)
  const groupedUnsortedItems = new Map<Ref<Space>, T[]>()

  unorderedItems.forEach((item) => {
    const existing = groupedUnsortedItems.get(item.space) ?? []
    groupedUnsortedItems.set(item.space, [...existing, item])
  })

  for (const [space, items] of groupedUnsortedItems.entries()) {
    const kanban = await client.findOne(task.class.Kanban, { attachedTo: space })

    if (kanban === undefined) {
      console.error(`Failed to find kanban attached to space '${space}'`)
      continue
    }

    const order = extractOrder(kanban)

    if (order === undefined) {
      console.error(`Kanban doesn't contain items order: ${kanban._id}`)
      continue
    }

    const orderedItems = order
      .map((id) => items.find(x => x._id === id))
      .filter((items): items is T => items !== undefined)
    const ranks = genRanks(orderedItems.length)

    for (const item of orderedItems) {
      const rank = ranks.next().value

      if (rank === undefined) {
        console.error('Failed to generate rank')
        break
      }

      await ops.updateDoc(item._class as Ref<Class<DocWithRank>>, item.space, item._id, { rank })
    }
  }
}

async function updateTemplateRankItems<T extends DocWithRank & AttachedDoc> ({
  client,
  ops,
  _class,
  extractOrder
}: {
  client: Client
  ops: TxOperations
  _class: Ref<Class<T>>
  extractOrder: (kanban: any) => Ref<T>[]
}): Promise<void> {
  const allItems = await client.findAll(_class, {})
  const unorderedItems = allItems
    .filter((state) => state.rank === undefined)
  const groupedUnsortedItems = new Map<Ref<Doc>, T[]>()

  unorderedItems.forEach((item) => {
    const existing = groupedUnsortedItems.get(item.attachedTo) ?? []
    groupedUnsortedItems.set(item.attachedTo, [...existing, item])
  })

  for (const [attachedTo, items] of groupedUnsortedItems.entries()) {
    const kanban = await client.findOne(task.class.KanbanTemplate, { _id: attachedTo as Ref<KanbanTemplate> })

    if (kanban === undefined) {
      console.error(`Failed to find kanban '${attachedTo}'`)
      continue
    }

    const order = extractOrder(kanban)

    if (order === undefined) {
      console.error(`Kanban doesn't contain items order: ${kanban._id}`)
      continue
    }

    const orderedItems = order
      .map((id) => items.find(x => x._id === id))
      .filter((items): items is T => items !== undefined)
    const ranks = genRanks(orderedItems.length)

    for (const item of orderedItems) {
      const rank = ranks.next().value

      if (rank === undefined) {
        console.error('Failed to generate rank')
        break
      }

      await ops.updateDoc(item._class as Ref<Class<DocWithRank>>, item.space, item._id, { rank })
    }
  }
}
