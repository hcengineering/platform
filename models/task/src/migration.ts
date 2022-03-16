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

import { AttachedDoc, Class, Doc, Domain, DOMAIN_TX, Ref, TxCollectionCUD, TxCreateDoc, TxCUD, TxOperations, TxResult } from '@anticrm/core'
import {
  MigrateOperation,
  MigrateUpdate,
  MigrationClient,
  MigrationResult,
  MigrationUpgradeClient
} from '@anticrm/model'
import core from '@anticrm/model-core'
import type { State, StateTemplate, Issue } from '@anticrm/task'
import { DOMAIN_TASK, DOMAIN_STATE, DOMAIN_KANBAN } from '.'
import task from './plugin'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  logInfo(
    `${from} => ${to} Collection transactions`,
    // eslint-disable-next-line
    await client.update<TxCollectionCUD<Doc, AttachedDoc>>(DOMAIN_TX, { ['tx.objectClass']: from }, { ['tx.objectClass']: to })
  )
}

async function createDefaultProject (tx: TxOperations): Promise<void> {
  const createTx = await tx.findOne(core.class.TxCreateDoc, {
    objectId: task.space.TasksPublic
  })
  if (createTx === undefined) {
    await tx.createDoc(
      task.class.Project,
      core.space.Space,
      {
        name: 'public',
        description: 'Public tasks',
        private: false,
        archived: false,
        members: []
      },
      task.space.TasksPublic
    )
  }
}

async function createDefaultSequence (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(core.class.Space, {
    _id: task.space.Sequence
  })
  if (current === undefined) {
    await tx.createDoc(
      core.class.Space,
      core.space.Space,
      {
        name: 'Sequences',
        description: 'Internal space to store sequence numbers',
        members: [],
        private: false,
        archived: false
      },
      task.space.Sequence
    )
  }
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

    const txes = await client.find<TxCreateDoc<Issue>>(DOMAIN_TX, {
      _class: core.class.TxCreateDoc,
      objectClass: task.class.Issue
    })
    for (const tx of txes) {
      if (tx.attributes.attachedTo !== undefined) continue
      await client.update<TxCreateDoc<Issue>>(DOMAIN_TX, { _id: tx._id }, {
        attributes: {
          ...tx.attributes,
          attachedTo: task.global.Task,
          attachedToClass: task.class.Issue
        }
      })
    }
    const nullTxes = await client.find<TxCollectionCUD<Doc, AttachedDoc>>(DOMAIN_TX, {
      objectClass: null
    })
    for (const tx of nullTxes) {
      const doc = await client.find<TxCreateDoc<AttachedDoc>>(DOMAIN_TX, {
        objectId: tx.tx.objectId,
        _class: core.class.TxCreateDoc
      })
      await client.update<TxCollectionCUD<Doc, AttachedDoc>>(DOMAIN_TX, { _id: tx._id }, {
        objectId: doc[0].attributes.attachedTo,
        objectClass: doc[0].attributes.attachedToClass,
        collection: doc[0].attributes.collection
      })
    }
    await client.update(DOMAIN_KANBAN, { _class: task.class.Sequence, attachedTo: task.class.Task }, {
      attachedTo: task.class.Issue
    })
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    console.log('Task: Performing model upgrades')

    const ops = new TxOperations(client, core.account.System)

    const tasks = await client.findAll(task.class.Issue, {})
    for (const doc of tasks) {
      if (doc.attachedTo === undefined) {
        await ops.updateDoc(doc._class, doc.space, doc._id, {
          attachedTo: task.global.Task,
          attachedToClass: task.class.Issue
        })
      }
    }

    const tx = new TxOperations(client, core.account.System)
    await createDefaultSequence(tx)
    await createDefaultProject(tx)

    // To not depend on ui package let's use inlined ones one time
    const colors = new Map([
      '#A5D179',
      '#77C07B',
      '#60B96E',
      '#45AEA3',
      '#46CBDE',
      '#47BDF6',
      '#5AADF6',
      '#73A6CD',
      '#B977CB',
      '#7C6FCD',
      '#6F7BC5',
      '#F28469'
    ].map((color, idx) => [color, idx]))
    const getIndex = (color: string): number => colors.get(color) ?? 0

    const updateStates = async (states: (State[] | StateTemplate[])): Promise<TxResult[]> =>
      await Promise.all(
        states
          .filter((state) => typeof state.color === 'string')
          .map(async (state) => await tx.update(state, { color: getIndex(state.color as never as string) }))
      )

    const states = await client.findAll(task.class.State, {})
    await updateStates(states)

    const templateStates = await client.findAll(task.class.StateTemplate, {})
    await updateStates(templateStates)
  }
}
