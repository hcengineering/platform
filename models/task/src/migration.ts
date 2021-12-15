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

import { Class, Doc, Domain, DOMAIN_TX, Ref, TxCUD, TxOperations } from '@anticrm/core'
import { MigrateOperation, MigrateUpdate, MigrationClient, MigrationResult, MigrationUpgradeClient } from '@anticrm/model'
import core from '@anticrm/model-core'
import { createProjectKanban } from '@anticrm/task'
import { DOMAIN_TASK, DOMAIN_STATE, DOMAIN_KANBAN } from '.'
import task from './plugin'

function logInfo (msg: string, result: MigrationResult): void {
  if (result.updated > 0) {
    console.log(`Tasks: Migrate ${msg} ${result.updated}`)
  }
}
async function migrateClass<T extends Doc> (client: MigrationClient, domain: Domain, from: Ref<Class<Doc>>, to: Ref<Class<T>>, extraOps: MigrateUpdate<T> = {}, txExtraOps: MigrateUpdate<TxCUD<Doc>> = {}): Promise<void> {
  logInfo(`Migrate ${from} => ${to}: `,
    await client.update<Doc>(domain, { _class: from }, { ...extraOps, _class: to }))
  logInfo(`Migrate ${from} => ${to} Transactions`,
    await client.update<TxCUD<Doc>>(DOMAIN_TX, { objectClass: from }, { ...txExtraOps, objectClass: to }))
}

export const taskOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    // Since we should not have Task class instances, we convert them all to Issue.
    await migrateClass(client, DOMAIN_TASK, task.class.Task, task.class.Issue)
    await migrateClass(client, DOMAIN_STATE, 'core:class:State' as Ref<Class<Doc>>, task.class.State)
    await migrateClass(client, DOMAIN_KANBAN, 'view:class:Kanban' as Ref<Class<Doc>>, task.class.Kanban)
    await migrateClass(client, DOMAIN_KANBAN, 'view:class:Sequence' as Ref<Class<Doc>>, task.class.Sequence, { space: task.space.Sequence }, { objectSpace: task.space.Sequence })

    // Update attached to for task
    await client.update(DOMAIN_KANBAN, { _class: task.class.Sequence, attachedTo: task.class.Task }, { attachedTo: task.class.Issue })

    await migrateClass(client, DOMAIN_KANBAN, 'view:class:KanbanTemplate' as Ref<Class<Doc>>, task.class.KanbanTemplate)
    await migrateClass(client, DOMAIN_KANBAN, 'view:class:StateTemplate' as Ref<Class<Doc>>, task.class.StateTemplate)
    await migrateClass(client, DOMAIN_KANBAN, 'view:class:DoneStateTemplate' as Ref<Class<Doc>>, task.class.DoneStateTemplate)
    await migrateClass(client, DOMAIN_KANBAN, 'view:class:LostStateTemplate' as Ref<Class<Doc>>, task.class.LostStateTemplate)

    await client.move('recruit' as Domain, {
      _class: 'recruit:class:Applicant' as Ref<Class<Doc>>
    }, DOMAIN_TASK)

    await client.move('lead' as Domain, {
      _class: 'lead:class:Lead' as Ref<Class<Doc>>
    }, DOMAIN_TASK)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    console.log('Task: Performing model upgrades')

    const ops = new TxOperations(client, core.account.System)
    if (await client.findOne(task.class.Sequence, { attachedTo: task.class.Issue }) === undefined) {
      console.info('Create sequence for default task project.')
      // We need to create sequence
      await ops.createDoc(task.class.Sequence, task.space.Sequence, {
        attachedTo: task.class.Issue,
        sequence: 0
      })
    } else {
      console.log('Task: => sequence is ok')
    }
    if (await client.findOne(task.class.Kanban, { attachedTo: task.space.TasksPublic }) === undefined) {
      console.info('Create kanban for default task project.')
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

    const kanbans = (await client.findAll(task.class.Kanban, {}))
      .filter((kanban) => kanban.doneStates == null)

    await Promise.all(
      kanbans
        .map(async (kanban) => {
          console.log(`Updating kanban: ${kanban._id}`)
          try {
            const doneStates = await Promise.all([
              ops.createDoc(task.class.WonState, kanban.space, {
                title: 'Won'
              }),
              ops.createDoc(task.class.LostState, kanban.space, {
                title: 'Lost'
              })
            ])

            await ops.updateDoc(kanban._class, kanban.space, kanban._id, {
              doneStates
            })
          } catch (e) {
            console.error(e)
          }
        }))

    const outdatedTasks = (await client.findAll(task.class.Task, {}))
      .filter((x) => x.doneState === undefined)

    await Promise.all(
      outdatedTasks.map(async (task) => {
        console.info('Upgrade task:', task._id)
        try {
          await ops.updateDoc(task._class, task.space, task._id, { doneState: null })
        } catch (err: unknown) {
          console.error(err)
        }
      })
    )
  }
}
