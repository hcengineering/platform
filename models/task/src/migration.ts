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
  Data,
  Doc,
  Ref,
  Space,
  Status,
  TxOperations,
  generateId,
  toIdMap
} from '@hcengineering/core'
import {
  MigrateOperation,
  MigrationClient,
  MigrationUpgradeClient,
  createOrUpdate,
  tryMigrate,
  tryUpgrade
} from '@hcengineering/model'
import core, { DOMAIN_SPACE } from '@hcengineering/model-core'
import tags from '@hcengineering/model-tags'
import {
  Project,
  ProjectStatus,
  ProjectType,
  ProjectTypeCategory,
  Task,
  createState,
  taskId
} from '@hcengineering/task'
import view, { Filter } from '@hcengineering/view'
import { DOMAIN_KANBAN, DOMAIN_TASK } from '.'
import task from './plugin'

type ProjectData = Omit<Data<ProjectType>, 'statuses' | 'private' | 'members' | 'archived'>
type OldStatus = Status & { rank: string }

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
export async function createProjectType (
  client: TxOperations,
  data: ProjectData,
  states: Data<Status>[],
  _id: Ref<ProjectType>,
  stateClass: Ref<Class<Status>> = core.class.Status
): Promise<Ref<ProjectType>> {
  const current = await client.findOne(task.class.ProjectType, { _id })
  if (current !== undefined) {
    return current._id
  }

  const statuses: Ref<Status>[] = []
  for (const st of states) {
    statuses.push(await createState(client, stateClass, st))
  }

  const tmpl = await client.createDoc(
    task.class.ProjectType,
    core.space.Model,
    {
      description: data.description,
      shortDescription: data.shortDescription,
      category: data.category,
      statuses: statuses.map((p) => {
        return { _id: p }
      }),
      name: data.name,
      private: false,
      members: [],
      archived: false
    },
    _id
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
  const oldStatuses = await client.find<OldStatus>(DOMAIN_STATUS, { ofAttribute: { $exists: false } })
  for (const oldStatus of oldStatuses) {
    const space = map.get(oldStatus.space)
    if (space !== undefined) {
      try {
        let ofAttribute = task.attribute.State
        if (space._class === ('recruit:class:Vacancy' as Ref<Class<Space>>)) {
          ofAttribute = 'recruit:attribute:State' as Ref<Attribute<Status>>
        }
        if (space._class === ('lead:class:Funnel' as Ref<Class<Space>>)) {
          ofAttribute = 'lead:attribute:State' as Ref<Attribute<Status>>
        }
        if (space._class === ('board:class:Board' as Ref<Class<Space>>)) {
          ofAttribute = 'board:attribute:State' as Ref<Attribute<Status>>
        }
        if (space._class === ('tracker:class:Project' as Ref<Class<Space>>)) {
          ofAttribute = 'tracker:attribute:IssueStatus' as Ref<Attribute<Status>>
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

async function removeDoneStatuses (client: MigrationClient): Promise<void> {
  const tasks = await client.find<Task>(DOMAIN_TASK, { doneState: { $exists: true } })
  for (const task of tasks) {
    if ((task as any).doneState != null) {
      await client.update(DOMAIN_TASK, { _id: task._id }, { status: (task as any).doneState, isDone: true })
    }
    await client.update(DOMAIN_TASK, { _id: task._id }, { $unset: { doneState: '' } })
  }
  await client.update(
    DOMAIN_TX,
    { 'tx.operations.doneState': { $exists: true } },
    { $rename: { 'tx.operations.doneState': 'tx.operations.status' } }
  )
  await client.update(
    DOMAIN_TX,
    { 'tx.attributes.doneState': { $exists: true } },
    { $rename: { 'tx.attributes.doneState': 'tx.attributes.status' } }
  )

  // we need join doneStates to states for all projects
  const classes = client.hierarchy.getDescendants(task.class.Project)
  const projects = await client.find<Project>(DOMAIN_SPACE, { _class: { $in: classes }, doneStates: { $exists: true } })
  for (const project of projects) {
    await client.update(
      DOMAIN_SPACE,
      { _id: project._id },
      { states: (project as any).states.concat((project as any).doneStates) }
    )
    await client.update(DOMAIN_SPACE, { _id: project._id }, { $unset: { doneStates: '' } })
  }
}

async function removeStateClass (client: MigrationClient): Promise<void> {
  await client.update<Status>(
    DOMAIN_STATUS,
    { _class: 'task:class:State' as Ref<Class<Doc>> },
    { _class: core.class.Status, category: task.statusCategory.Active }
  )
  await client.update(DOMAIN_TX, { objectClass: 'task:class:State' }, { objectClass: core.class.Status })
  await client.update(
    DOMAIN_STATUS,
    { _class: 'task:class:WonState' as Ref<Class<Doc>> },
    { _class: core.class.Status, category: task.statusCategory.Won }
  )
  await client.update(DOMAIN_TX, { objectClass: 'task:class:WonState' }, { objectClass: core.class.Status })
  await client.update(
    DOMAIN_STATUS,
    { _class: 'task:class:LostState' as Ref<Class<Doc>> },
    { _class: core.class.Status, category: task.statusCategory.Lost }
  )
  await client.update(DOMAIN_TX, { objectClass: 'task:class:LostState' }, { objectClass: core.class.Status })
  await client.update(
    DOMAIN_STATUS,
    { _class: 'task:class:DoneState' as Ref<Class<Doc>> },
    { _class: core.class.Status }
  )
  await client.update(DOMAIN_TX, { objectClass: 'task:class:DoneState' }, { objectClass: core.class.Status })
}

async function migrateTemplatesToTypes (client: MigrationClient): Promise<void> {
  interface KanbanTemplate extends Doc {
    title: string
    description?: string
    shortDescription?: string
  }

  interface StateTemplate extends Doc, Status {
    attachedTo: Ref<KanbanTemplate>
    rank: string
  }

  const classes = client.hierarchy.getDescendants(task.class.Project)
  const templates = await client.find<KanbanTemplate>(DOMAIN_KANBAN, {
    _class: 'task:class:KanbanTemplate' as Ref<Class<Doc>>
  })
  for (const template of templates) {
    const states = await client.find<StateTemplate>(
      DOMAIN_KANBAN,
      { _class: 'task:class:StateTemplate' as Ref<Class<Doc>>, attachedTo: template._id },
      { sort: { rank: 1 } }
    )
    const wonStates = await client.find<StateTemplate>(
      DOMAIN_KANBAN,
      { _class: 'task:class:WonStateTemplate' as Ref<Class<Doc>>, attachedTo: template._id },
      { sort: { rank: 1 } }
    )
    const lostStates = await client.find<StateTemplate>(
      DOMAIN_KANBAN,
      { _class: 'task:class:LostStateTemplate' as Ref<Class<Doc>>, attachedTo: template._id },
      { sort: { rank: 1 } }
    )

    const statuses: ProjectStatus[] = []
    const currentStates = await client.find<Status>(DOMAIN_STATUS, {})
    for (const st of states) {
      const exists = currentStates.find(
        (p) =>
          p.name.toLocaleLowerCase() === st.name.toLocaleLowerCase() &&
          p.ofAttribute === st.ofAttribute &&
          p.category === st.category
      )
      if (exists !== undefined) {
        statuses.push({ _id: exists._id, color: st.color })
      } else {
        const id = generateId<Status>()
        await client.create<Status>(DOMAIN_STATUS, {
          ofAttribute: st.ofAttribute,
          name: st.name,
          _id: id,
          space: task.space.Statuses,
          modifiedOn: st.modifiedOn,
          modifiedBy: st.modifiedBy,
          _class: core.class.Status,
          color: st.color,
          createdBy: st.createdBy,
          createdOn: st.createdOn,
          category: task.statusCategory.Active
        })
        statuses.push({ _id: id, color: st.color })
      }
    }

    for (const st of wonStates) {
      const exists = currentStates.find(
        (p) =>
          p.name.toLocaleLowerCase() === st.name.toLocaleLowerCase() &&
          p.ofAttribute === st.ofAttribute &&
          p.category === st.category
      )
      if (exists !== undefined) {
        statuses.push({ _id: exists._id, color: st.color })
      } else {
        const id = generateId<Status>()
        await client.create<Status>(DOMAIN_STATUS, {
          ofAttribute: st.ofAttribute,
          name: st.name,
          _id: id,
          space: task.space.Statuses,
          modifiedOn: st.modifiedOn,
          modifiedBy: st.modifiedBy,
          _class: core.class.Status,
          color: st.color,
          createdBy: st.createdBy,
          createdOn: st.createdOn,
          category: task.statusCategory.Won
        })
        statuses.push({ _id: id, color: st.color })
      }
    }

    for (const st of lostStates) {
      const exists = currentStates.find(
        (p) =>
          p.name.toLocaleLowerCase() === st.name.toLocaleLowerCase() &&
          p.ofAttribute === st.ofAttribute &&
          p.category === st.category
      )
      if (exists !== undefined) {
        statuses.push({ _id: exists._id, color: st.color })
      } else {
        const id = generateId<Status>()
        await client.create<Status>(DOMAIN_STATUS, {
          ofAttribute: st.ofAttribute,
          name: st.name,
          _id: id,
          space: task.space.Statuses,
          modifiedOn: st.modifiedOn,
          modifiedBy: st.modifiedBy,
          _class: core.class.Status,
          color: st.color,
          createdBy: st.createdBy,
          createdOn: st.createdOn,
          category: task.statusCategory.Lost
        })
        statuses.push({ _id: id, color: st.color })
      }
    }

    await client.create<ProjectType>(DOMAIN_SPACE, {
      name: template.title,
      description: template.description ?? '',
      shortDescription: template.shortDescription,
      category: template.space as Ref<Doc> as Ref<ProjectTypeCategory>,
      private: false,
      members: [],
      archived: false,
      _id: template._id as Ref<Doc> as Ref<ProjectType>,
      space: core.space.Space,
      modifiedOn: template.modifiedOn,
      modifiedBy: template.modifiedBy,
      _class: task.class.ProjectType,
      statuses
    })
    await client.delete(DOMAIN_KANBAN, template._id)
  }

  // we should found all projects without types and has templateID we should just rename it to type (if it exists)
  const projectsWithTemplate = await client.find<Project>(DOMAIN_SPACE, {
    _class: { $in: classes },
    type: { $exists: false },
    templateId: { $exists: true }
  })
  for (const project of projectsWithTemplate) {
    await client.update(DOMAIN_SPACE, { _id: project._id }, { type: (project as any).templateId })
  }

  // we should remove all state templates
  const stateClasses = [
    'task:class:StateTemplate' as Ref<Class<Doc>>,
    'task:class:WonStateTemplate' as Ref<Class<Doc>>,
    'task:class:LostStateTemplate' as Ref<Class<Doc>>
  ]
  const states = await client.find(DOMAIN_KANBAN, { _class: { $in: stateClasses } })
  for (const st of states) {
    await client.delete(DOMAIN_KANBAN, st._id)
  }
}

async function getProjectTypeCategory (
  client: MigrationClient,
  _class: Ref<Class<Project>>
): Promise<Ref<ProjectTypeCategory> | undefined> {
  let clazz = _class
  while (true) {
    const res = await client.model.findAll(task.class.ProjectTypeCategory, { attachedToClass: clazz })
    if (res[0] !== undefined) return res[0]._id
    const parent = client.hierarchy.getClass(clazz)
    if (parent.extends === undefined) return
    clazz = parent.extends
  }
}

async function migrateProjectTypes (client: MigrationClient): Promise<void> {
  const classes = client.hierarchy.getDescendants(task.class.Project)
  // we should found all projects without types and group by class and then by statuses and create new type
  const projects = await client.find<Project>(DOMAIN_SPACE, { _class: { $in: classes }, type: { $exists: false } })
  const projectsByCategory: Map<Ref<ProjectTypeCategory>, Project[]> = new Map()
  for (const project of projects) {
    const category = await getProjectTypeCategory(client, project._class)
    if (category === undefined) continue
    const arr = projectsByCategory.get(category) ?? []
    arr.push(project)
    projectsByCategory.set(category, arr)
  }
  for (const [category, projects] of projectsByCategory) {
    const gouped = group(projects)
    for (const gr of gouped) {
      await client.create<ProjectType>(DOMAIN_SPACE, {
        category,
        name: gr.projects[0].name,
        description: '',
        private: false,
        members: [],
        archived: false,
        _id: gr.type,
        space: core.space.Space,
        modifiedOn: Date.now(),
        modifiedBy: core.account.System,
        _class: task.class.ProjectType,
        statuses: gr.statuses.map((p) => {
          return { _id: p }
        })
      })

      await client.update(DOMAIN_SPACE, { _id: { $in: gr.projects.map((p) => p._id) } }, { type: gr.type })
    }
  }

  // we need remove states from all projects
  const allProjects = await client.find<Project>(DOMAIN_SPACE, { _class: { $in: classes } })
  await Promise.all(
    allProjects.map(async (project) => {
      await client.update(
        DOMAIN_SPACE,
        { _id: project._id },
        { $unset: { states: '', templateId: '', doneStates: '' } }
      )
    })
  )
}

interface ProjectTypeGroup {
  statuses: Ref<Status>[]
  projects: Project[]
  type: Ref<ProjectType>
}

function group (projects: Project[]): ProjectTypeGroup[] {
  const map: Map<string, ProjectTypeGroup> = new Map()

  for (const project of projects) {
    const ids = getIds((project as any).states ?? [])
    const obj: ProjectTypeGroup = map.get(ids) ?? {
      statuses: (project as any).states ?? [],
      projects: [],
      type: generateId<ProjectType>()
    }
    obj.projects.push(project)
    map.set(ids, obj)
  }
  return Array.from(map.values())
}

function getIds (states: Ref<Status>[]): string {
  return states.join(',')
}

export const taskOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, taskId, [
      {
        state: 'fixStatusAttributes',
        func: fixStatusAttributes
      },
      {
        state: 'renameState',
        func: renameState
      },
      {
        state: 'removeDoneStatuses',
        func: removeDoneStatuses
      },
      {
        state: 'removeStateClass',
        func: removeStateClass
      },
      {
        state: 'migrateTemplatesToTypes',
        func: migrateTemplatesToTypes
      },
      {
        state: 'migrateProjectTypes',
        func: migrateProjectTypes
      }
    ])
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

    await tryUpgrade(client, taskId, [
      {
        state: 'renameStatePrefs',
        func: renameStatePrefs
      }
    ])
  }
}
