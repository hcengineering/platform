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

import { Class, Doc, Domain, Ref, Space, TxOperations, DOMAIN_STATUS } from '@hcengineering/core'
import { createOrUpdate, MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import tags from '@hcengineering/model-tags'
import { createKanban, DoneStateTemplate, genRanks, KanbanTemplate, StateTemplate } from '@hcengineering/task'
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
      client.addCollection(
        st.isWon ? task.class.WonStateTemplate : task.class.LostStateTemplate,
        data.space,
        data.kanbanId,
        task.class.KanbanTemplate,
        'doneStatesC',
        {
          ofAttribute: task.attribute.DoneState,
          rank: doneStateRanks[i],
          name: st.name
        }
      )
    )
  )

  const stateRanks = [...genRanks(data.states.length)]
  await Promise.all(
    data.states.map((st, i) =>
      client.addCollection(task.class.StateTemplate, data.space, data.kanbanId, task.class.KanbanTemplate, 'statesC', {
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

async function createDefaultKanbanTemplate (tx: TxOperations): Promise<Ref<KanbanTemplate>> {
  const defaultKanban = {
    states: [
      { color: 9, name: 'Open' },
      { color: 10, name: 'In Progress' },
      { color: 1, name: 'Under review' },
      { color: 0, name: 'Done' },
      { color: 11, name: 'Invalid' }
    ],
    doneStates: [
      { isWon: true, name: 'Won' },
      { isWon: false, name: 'Lost' }
    ]
  }

  return await createKanbanTemplate(tx, {
    kanbanId: task.template.DefaultProject,
    space: task.space.ProjectTemplates as Ref<Doc> as Ref<Space>,
    title: 'Default project',
    description: '',
    shortDescription: '',
    states: defaultKanban.states,
    doneStates: defaultKanban.doneStates
  })
}

async function createDefaultKanban (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(task.class.Kanban, {
    attachedTo: task.space.TasksPublic
  })
  if (current !== undefined) return
  const defaultTmpl = await createDefaultKanbanTemplate(tx)
  await createKanban(tx, task.space.TasksPublic, defaultTmpl)
}

async function createSpace (tx: TxOperations): Promise<void> {
  const currentTemplate = await tx.findOne(core.class.Space, {
    _id: task.space.ProjectTemplates
  })
  if (currentTemplate === undefined) {
    await tx.createDoc(
      task.class.KanbanTemplateSpace,
      core.space.Space,
      {
        name: task.string.Projects,
        description: task.string.ManageProjectStatues,
        icon: task.component.TemplatesIcon,
        private: false,
        members: [],
        archived: false
      },
      task.space.ProjectTemplates
    )
  }
}

async function createDefaults (tx: TxOperations): Promise<void> {
  await createSpace(tx)
  await createDefaultSequence(tx)
  await createDefaultKanban(tx)
}

async function migrateTodoItems (client: MigrationClient): Promise<void> {
  const assigneeTodos = await client.find(DOMAIN_TASK, { _class: task.class.TodoItem, assignee: { $exists: false } })
  for (const todo of assigneeTodos) {
    await client.update(DOMAIN_TASK, { _id: todo._id }, { assignee: null })
  }

  const dueToTodos = await client.find(DOMAIN_TASK, { _class: task.class.TodoItem, dueTo: { $exists: false } })
  for (const todo of dueToTodos) {
    await client.update(DOMAIN_TASK, { _id: todo._id }, { dueTo: null })
  }
}

export const taskOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await Promise.all([migrateTodoItems(client)])

    const stateClasses = client.hierarchy
      .getDescendants(task.class.State)
      .concat(client.hierarchy.getDescendants(task.class.StateTemplate))
    const doneStateClasses = client.hierarchy
      .getDescendants(task.class.DoneState)
      .concat(client.hierarchy.getDescendants(task.class.DoneStateTemplate))

    await client.move(DOMAIN_STATE, { _class: { $in: [...stateClasses, ...doneStateClasses] } }, DOMAIN_STATUS)

    await client.update(
      DOMAIN_STATUS,
      { _class: { $in: stateClasses }, ofAttribute: { $exists: false } },
      { ofAttribute: task.attribute.State }
    )
    await client.update(
      DOMAIN_STATUS,
      { _class: { $in: stateClasses }, title: { $exists: true } },
      { $rename: { title: 'name' } }
    )

    await client.update(
      DOMAIN_STATUS,
      { _class: { $in: doneStateClasses }, ofAttribute: { $exists: false } },
      { ofAttribute: task.attribute.DoneState }
    )
    await client.update(
      DOMAIN_STATUS,
      { _class: { $in: doneStateClasses }, title: { $exists: true } },
      { $rename: { title: 'name' } }
    )
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
  }
}
