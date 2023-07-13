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

import { Class, DOMAIN_TX, Doc, Domain, Ref, Space, TxOperations } from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient, createOrUpdate } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import tags from '@hcengineering/model-tags'
import { DoneStateTemplate, KanbanTemplate, StateTemplate, genRanks } from '@hcengineering/task'
import view, { Filter } from '@hcengineering/view'
import { DOMAIN_TASK } from '.'
import task from './plugin'

/**
 * @public
 */
export const DOMAIN_STATE = 'state' as Domain

/**
 * @public
 */
export interface KanbanTemplateData {
  kanbanId: Ref<KanbanTemplate>
  space: Ref<Space>
  title: KanbanTemplate['title']
  description?: string
  shortDescription?: string
  states: Pick<StateTemplate, 'name' | 'color'>[]
  doneStates: (Pick<DoneStateTemplate, 'name'> & { isWon: boolean })[]
}

/**
 * @public
 */
export async function createSequence (tx: TxOperations, _class: Ref<Class<Doc>>): Promise<void> {
  if ((await tx.findOne(task.class.Sequence, { attachedTo: _class })) === undefined) {
    await tx.createDoc(task.class.Sequence, task.space.Sequence, {
      attachedTo: _class,
      sequence: 0
    })
  }
}

/**
 * @public
 */
export async function createKanbanTemplate (
  client: TxOperations,
  data: KanbanTemplateData
): Promise<Ref<KanbanTemplate>> {
  const current = await client.findOne(task.class.KanbanTemplate, { _id: data.kanbanId })
  if (current !== undefined) {
    return current._id
  }

  const tmpl = await client.createDoc(
    task.class.KanbanTemplate,
    data.space,
    {
      doneStatesC: 0,
      statesC: 0,
      title: data.title
    },
    data.kanbanId
  )

  const doneStateRanks = [...genRanks(data.doneStates.length)]
  await Promise.all(
    data.doneStates.map((st, i) =>
      client.createDoc(st.isWon ? task.class.WonStateTemplate : task.class.LostStateTemplate, data.space, {
        rank: doneStateRanks[i],
        ofAttribute: task.attribute.DoneState,
        name: st.name,
        attachedTo: data.kanbanId
      })
    )
  )

  const stateRanks = [...genRanks(data.states.length)]
  await Promise.all(
    data.states.map((st, i) =>
      client.createDoc(task.class.StateTemplate, data.space, {
        attachedTo: data.kanbanId,
        ofAttribute: task.attribute.State,
        rank: stateRanks[i],
        name: st.name,
        color: st.color
      })
    )
  )

  return tmpl
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

async function createDefaults (tx: TxOperations): Promise<void> {
  await createDefaultSequence(tx)
}

async function renameState (client: MigrationClient): Promise<void> {
  const toUpdate = await client.find(DOMAIN_TASK, { state: { $exists: true } })
  if (toUpdate.length > 0) {
    for (const doc of toUpdate) {
      await client.update(
        DOMAIN_TX,
        { objectId: doc._id },
        { $rename: { 'attributes.state': 'attributes.status', 'operations.state': 'operations.status' } }
      )
      await client.update(
        DOMAIN_TX,
        { 'tx.objectId': doc._id },
        { $rename: { 'tx.attributes.state': 'tx.attributes.status', 'tx.operations.state': 'tx.operations.status' } }
      )
    }
    await client.update(DOMAIN_TASK, { _id: { $in: toUpdate.map((p) => p._id) } }, { $rename: { state: 'status' } })
  }
}

async function renameStatePrefs (client: MigrationUpgradeClient): Promise<void> {
  const txop = new TxOperations(client, core.account.System)
  const prefs = await client.findAll(view.class.ViewletPreference, {})
  for (const pref of prefs) {
    let update = false
    const config = pref.config
    for (let index = 0; index < config.length; index++) {
      const conf = config[index]
      if (typeof conf === 'string') {
        if (conf === 'state') {
          config[index] = 'status'
          update = true
        } else if (conf === '$lookup.state') {
          config[index] = '$lookup.status'
          update = true
        }
      } else if (conf.key === 'state') {
        conf.key = 'status'
        update = true
      }
    }
    if (update) {
      await txop.update(pref, {
        config
      })
    }
  }
  const res = await client.findAll(view.class.FilteredView, { filters: /"key":"state"/ as any })
  if (res.length > 0) {
    for (const doc of res) {
      const filters = JSON.parse(doc.filters) as Filter[]
      for (const filter of filters) {
        if (filter.key.key === 'state') {
          filter.key.key = 'status'
        }
      }
      await txop.update(doc, {
        filters: JSON.stringify(filters)
      })
    }
  }
}

export const taskOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await renameState(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createDefaults(tx)

    await createOrUpdate(
      tx,
      tags.class.TagCategory,
      tags.space.Tags,
      {
        icon: tags.icon.Tags,
        label: 'Text Label',
        targetClass: task.class.Task,
        tags: [],
        default: true
      },
      task.category.TaskTag
    )
    await renameStatePrefs(client)
  }
}
