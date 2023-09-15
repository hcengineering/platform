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

import {
  Attribute,
  Class,
  DOMAIN_STATUS,
  DOMAIN_TX,
  Doc,
  Domain,
  Ref,
  Space,
  Status,
  Tx,
  TxCollectionCUD,
  TxCreateDoc,
  TxOperations,
  TxProcessor,
  TxUpdateDoc,
  toIdMap
} from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient, createOrUpdate } from '@hcengineering/model'
import core, { DOMAIN_SPACE } from '@hcengineering/model-core'
import tags from '@hcengineering/model-tags'
import { DOMAIN_VIEW } from '@hcengineering/model-view'
import { DoneState, DoneStateTemplate, KanbanTemplate, State, StateTemplate, Task, genRanks } from '@hcengineering/task'
import view, { Filter, FilteredView } from '@hcengineering/view'
import { DOMAIN_TASK } from '.'
import task from './plugin'

/**
 * @public
 */
export const DOMAIN_STATE = 'state' as Domain

type OldStatus = Status & { rank: string }

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
  data: KanbanTemplateData,
  ofAttribute: Ref<Attribute<Status>>,
  doneAtrtribute?: Ref<Attribute<DoneState>>
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
        ofAttribute: doneAtrtribute ?? ofAttribute,
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
        ofAttribute,
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

async function createDefaultStatesSpace (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(core.class.Space, {
    _id: task.space.Statuses
  })
  if (current === undefined) {
    await tx.createDoc(
      core.class.Space,
      core.space.Space,
      {
        name: 'Statuses',
        description: 'Internal space to store all Statuses',
        members: [],
        private: false,
        archived: false
      },
      task.space.Statuses
    )
  }
}

async function createDefaults (tx: TxOperations): Promise<void> {
  await createDefaultSequence(tx)
  await createDefaultStatesSpace(tx)
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

async function fixStatusAttributes (client: MigrationClient): Promise<void> {
  const spaces = await client.find<Space>(DOMAIN_SPACE, {})
  const map = toIdMap(spaces)
  const oldStatuses = await client.find<OldStatus>(DOMAIN_STATUS, { space: { $ne: task.space.Statuses } })
  for (const oldStatus of oldStatuses) {
    const space = map.get(oldStatus.space)
    if (space !== undefined) {
      try {
        const isDone = client.hierarchy.isDerived(oldStatus._class, task.class.DoneState)
        let ofAttribute = task.attribute.State
        if (space._class === ('recruit:class:Vacancy' as Ref<Class<Space>>)) {
          ofAttribute = isDone
            ? ('recruit:attribute:DoneState' as Ref<Attribute<State>>)
            : ('recruit:attribute:State' as Ref<Attribute<State>>)
        }
        if (space._class === ('lead:class:Funnel' as Ref<Class<Space>>)) {
          ofAttribute = isDone
            ? ('lead:attribute:DoneState' as Ref<Attribute<State>>)
            : ('lead:attribute:State' as Ref<Attribute<State>>)
        }
        if (space._class === ('board:class:Board' as Ref<Class<Space>>)) {
          ofAttribute = isDone
            ? ('board:attribute:DoneState' as Ref<Attribute<State>>)
            : ('board:attribute:State' as Ref<Attribute<State>>)
        }
        if (space._class === ('tracker:class:Project' as Ref<Class<Space>>)) {
          ofAttribute = 'tracker:attribute:IssueStatus' as Ref<Attribute<State>>
        }
        if (ofAttribute !== oldStatus.ofAttribute) {
          await client.update(DOMAIN_STATUS, { _id: oldStatus._id }, { ofAttribute })
        }
      } catch (err) {
        console.log(err)
      }
    }
  }
}

async function migrateStatuses (client: MigrationClient): Promise<void> {
  await fixStatusAttributes(client)
  const oldStatuses = await client.find<OldStatus>(DOMAIN_STATUS, { space: { $ne: task.space.Statuses } })
  const newStatuses: Map<string, Status> = new Map()
  const oldStatusesMap = new Map<Ref<Status>, Ref<Status>>()
  oldStatuses.sort((a, b) => a.rank.localeCompare(b.rank))
  for (const oldStatus of oldStatuses) {
    const name = oldStatus.name.toLowerCase().trim()
    const mapId = `${oldStatus.ofAttribute}_${name}`
    const current = newStatuses.get(mapId)
    if (current !== undefined) {
      oldStatusesMap.set(oldStatus._id, current._id)
      if (client.hierarchy.isDerived(oldStatus._class, task.class.DoneState)) {
        await client.update(DOMAIN_SPACE, { _id: oldStatus.space }, { $addToSet: { doneStates: current._id } })
      } else {
        await client.update(DOMAIN_SPACE, { _id: oldStatus.space }, { $addToSet: { states: current._id } })
      }
    } else {
      newStatuses.set(mapId, oldStatus)
      if (client.hierarchy.isDerived(oldStatus._class, task.class.DoneState)) {
        await client.update(DOMAIN_SPACE, { _id: oldStatus.space }, { $addToSet: { doneStates: oldStatus._id } })
      } else {
        await client.update(DOMAIN_SPACE, { _id: oldStatus.space }, { $addToSet: { states: oldStatus._id } })
      }
    }
  }
  if (oldStatusesMap.size > 0) {
    const tasks = await client.find<Task>(DOMAIN_TASK, {})
    for (const task of tasks) {
      const update: any = {}
      const newStatus = oldStatusesMap.get(task.status)
      if (newStatus !== undefined) {
        update.status = newStatus
      }
      if (task.doneState != null) {
        const newDoneStatus = oldStatusesMap.get(task.doneState)
        if (newDoneStatus !== undefined) {
          update.doneState = newDoneStatus
        }
      }
      if (Object.keys(update).length > 0) {
        await client.update(DOMAIN_TASK, { _id: task._id }, update)
      }
      const txes = await client.find(DOMAIN_TX, { 'tx.objectId': task._id })
      for (const tx of txes) {
        const update: any = {}
        const ctx = tx as TxCollectionCUD<Doc, Task>
        if (ctx.tx._class === core.class.TxCreateDoc) {
          const createTx = ctx.tx as TxCreateDoc<Task>
          const newStatus = oldStatusesMap.get(createTx.attributes.status)
          if (newStatus !== undefined) {
            update['tx.attributes.status'] = newStatus
          }
          if (createTx.attributes.doneState != null) {
            const newDoneStatus = oldStatusesMap.get(createTx.attributes.doneState)
            if (newDoneStatus !== undefined) {
              update['tx.attributes.doneState'] = newDoneStatus
            }
          }
        } else if (ctx.tx._class === core.class.TxUpdateDoc) {
          const updateTx = ctx.tx as TxUpdateDoc<Task>
          if (updateTx.operations.status !== undefined) {
            const newStatus = oldStatusesMap.get(updateTx.operations.status)
            if (newStatus !== undefined) {
              update['tx.operations.status'] = newStatus
            }
          }
          if (updateTx.operations.doneState != null) {
            const newDoneStatus = oldStatusesMap.get(updateTx.operations.doneState)
            if (newDoneStatus !== undefined) {
              update['tx.operations.doneState'] = newDoneStatus
            }
          }
        }
        if (Object.keys(update).length > 0) {
          await client.update(DOMAIN_TX, { _id: tx._id }, update)
        }
      }
    }

    const descendants = client.hierarchy.getDescendants(task.class.Task)
    const filters = await client.find<FilteredView>(DOMAIN_VIEW, {
      _class: view.class.FilteredView,
      filterClass: { $in: descendants }
    })
    for (const filter of filters) {
      const filters = JSON.parse(filter.filters) as Filter[]
      let changed = false
      for (const filter of filters) {
        if (['status', 'doneStatus'].includes(filter.key.key)) {
          for (let index = 0; index < filter.value.length; index++) {
            const val = filter.value[index]
            const newVal = oldStatusesMap.get(val)
            if (newVal !== undefined) {
              filter.value[index] = newVal
              changed = true
            }
          }
        }
      }
      if (changed) {
        await client.update(DOMAIN_VIEW, { _id: filter._id }, { filters: JSON.stringify(filters) })
      }
    }
  }
  const toRemove = Array.from(oldStatusesMap.keys())
  for (const remove of toRemove) {
    await client.delete(DOMAIN_STATUS, remove)
  }
  await client.update(DOMAIN_STATUS, { rank: { $exists: true } }, { $unset: { rank: '' } })
  await client.update(DOMAIN_STATUS, { space: { $ne: task.space.Statuses } }, { space: task.space.Statuses })
}

async function fixFilters (client: MigrationClient): Promise<void> {
  const currentStatuses = await client.find<Status>(DOMAIN_STATUS, {})
  const currentStatusesMap = toIdMap(currentStatuses)
  const cacheMap = new Map<Ref<Status>, Ref<Status>>()
  const descendants = client.hierarchy.getDescendants(task.class.Task)
  const filters = await client.find<FilteredView>(DOMAIN_VIEW, {
    _class: view.class.FilteredView,
    filterClass: { $in: descendants }
  })
  for (const filter of filters) {
    const filters = JSON.parse(filter.filters) as Filter[]
    let changed = false
    for (const filter of filters) {
      if (['status', 'doneStatus'].includes(filter.key.key)) {
        for (let index = 0; index < filter.value.length; index++) {
          const val = filter.value[index]
          if (!currentStatusesMap.has(val)) {
            const newVal = cacheMap.get(val)
            if (newVal !== undefined) {
              filter.value[index] = newVal
              changed = true
            } else {
              const ownTxes = await client.find<Tx>(DOMAIN_TX, { objectId: val })
              const attachedTxes = await client.find<Tx>(DOMAIN_TX, { 'tx.objectId': val })
              const txes = [...ownTxes, ...attachedTxes].sort((a, b) => a.modifiedOn - b.modifiedOn)
              const oldStatus = TxProcessor.buildDoc2Doc<Status>(txes)
              if (oldStatus !== undefined) {
                const newStatus = currentStatuses.find(
                  (p) =>
                    p.ofAttribute === oldStatus.ofAttribute &&
                    p.name.toLowerCase().trim() === oldStatus.name.toLowerCase().trim()
                )
                if (newStatus !== undefined) {
                  filter.value[index] = newStatus._id
                  cacheMap.set(val, newStatus._id)
                  changed = true
                }
              }
            }
          }
        }
      }
    }
    if (changed) {
      await client.update(DOMAIN_VIEW, { _id: filter._id }, { filters: JSON.stringify(filters) })
    }
  }
}

export const taskOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await renameState(client)
    await migrateStatuses(client)
    await fixFilters(client)
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
