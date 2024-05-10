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

import core, {
  DOMAIN_STATUS,
  DOMAIN_TX,
  TxOperations,
  TxProcessor,
  generateId,
  toIdMap,
  type Data,
  type Ref,
  type Status,
  type Tx,
  type TxCreateDoc,
  type StatusCategory,
  type TxMixin
} from '@hcengineering/core'
import {
  createOrUpdate,
  tryMigrate,
  tryUpgrade,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import { DOMAIN_SPACE } from '@hcengineering/model-core'
import { DOMAIN_TASK, createProjectType, fixTaskTypes } from '@hcengineering/model-task'
import tags from '@hcengineering/tags'
import task, { type ProjectType, type TaskType } from '@hcengineering/task'
import {
  TimeReportDayType,
  classicIssueTaskStatuses,
  createStatesData,
  trackerId,
  type Issue,
  type IssueStatus,
  type Project
} from '@hcengineering/tracker'
import { PaletteColorIndexes } from '@hcengineering/ui/src/colors'
import tracker from './plugin'

async function createDefaultProject (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(tracker.class.Project, {
    _id: tracker.project.DefaultProject
  })

  const currentDeleted = await tx.findOne(core.class.TxRemoveDoc, {
    objectId: tracker.project.DefaultProject
  })

  // temporary disabled until nice automation
  // if ((await tx.findOne(task.class.ProjectType, { _id: tracker.ids.BaseProjectType })) === undefined) {
  //   const issueId: Ref<TaskType> = generateId()

  //   const states: Omit<Data<Status>, 'rank'>[] = createStatesData(baseIssueTaskStatuses)
  //   await createProjectType(
  //     tx,
  //     {
  //       name: 'Base project',
  //       descriptor: tracker.descriptors.ProjectType,
  //       description: '',
  //       tasks: [],
  //       classic: false
  //     },
  //     [
  //       {
  //         _id: issueId,
  //         name: 'Issue',
  //         descriptor: tracker.descriptors.Issue,
  //         factory: states,
  //         ofClass: tracker.class.Issue,
  //         targetClass: tracker.class.Issue,
  //         statusCategories: baseIssueTaskStatuses.map((it) => it.category),
  //         statusClass: core.class.Status,
  //         kind: 'both',
  //         allowedAsChildOf: [issueId]
  //       }
  //     ],
  //     tracker.ids.BaseProjectType
  //   )
  // }

  // Create new if not deleted by customers.
  if (current === undefined && currentDeleted === undefined) {
    const taskType = await tx.findOne(task.class.TaskType, {
      _id: tracker.taskTypes.Issue
    })
    if (taskType !== undefined) {
      const state = await tx.findOne(core.class.Status, { _id: taskType.statuses[0] })
      if (state !== undefined) {
        await tx.createDoc(
          tracker.class.Project,
          core.space.Space,
          {
            name: 'Default',
            description: 'Default project',
            private: false,
            members: [],
            archived: false,
            identifier: 'TSK',
            sequence: 0,
            defaultIssueStatus: state._id,
            defaultTimeReportDay: TimeReportDayType.PreviousWorkDay,
            defaultAssignee: undefined,
            type: tracker.ids.ClassingProjectType
          },
          tracker.project.DefaultProject
        )
      }
    }
  }
}

async function createDefaultProjectType (tx: TxOperations): Promise<void> {
  const existing = await tx.findOne(task.class.ProjectType, { _id: tracker.ids.ClassingProjectType })
  const existingDeleted = await tx.findOne(core.class.TxRemoveDoc, {
    objectId: tracker.ids.ClassingProjectType
  })

  if (existing === undefined && existingDeleted === undefined) {
    const states: Omit<Data<Status>, 'rank'>[] = createStatesData(classicIssueTaskStatuses)
    await createProjectType(
      tx,
      {
        name: 'Classic project',
        descriptor: tracker.descriptors.ProjectType,
        description: '',
        tasks: [],
        roles: 0,
        classic: true
      },
      [
        {
          _id: tracker.taskTypes.Issue,
          descriptor: tracker.descriptors.Issue,
          name: 'Issue',
          factory: states,
          ofClass: tracker.class.Issue,
          targetClass: tracker.class.Issue,
          statusCategories: classicIssueTaskStatuses.map((it) => it.category),
          statusClass: core.class.Status,
          kind: 'both',
          allowedAsChildOf: [tracker.taskTypes.Issue]
        }
      ],
      tracker.ids.ClassingProjectType
    )
  }
}

async function createDefaults (tx: TxOperations): Promise<void> {
  await createDefaultProject(tx)
  await createOrUpdate(
    tx,
    tags.class.TagCategory,
    tags.space.Tags,
    {
      icon: tags.icon.Tags,
      label: 'Other',
      targetClass: tracker.class.Issue,
      tags: [],
      default: true
    },
    tracker.category.Other
  )
}

async function fixTrackerTaskTypes (client: MigrationClient): Promise<void> {
  await fixTaskTypes(client, tracker.descriptors.ProjectType, async (t) => {
    const typeId: Ref<TaskType> = generateId()
    return [
      {
        _id: typeId,
        name: 'Issue',
        descriptor: tracker.descriptors.Issue,
        ofClass: tracker.class.Issue,
        targetClass: tracker.class.Issue,
        statusCategories: classicIssueTaskStatuses,
        statusClass: tracker.class.IssueStatus,
        kind: 'task',
        allowedAsChildOf: [typeId]
      }
    ]
  })
}

async function passIdentifierToParentInfo (client: MigrationClient): Promise<void> {
  const issues = await client.find<Issue>(DOMAIN_TASK, { _class: tracker.class.Issue, 'parents.0': { $exists: true } })
  for (const issue of issues) {
    const parents = toIdMap(
      await client.find<Issue>(DOMAIN_TASK, { _id: { $in: issue.parents.map((p) => p.parentId) } })
    )
    for (const parent of issue.parents) {
      const p = parents.get(parent.parentId)
      if (p === undefined) continue
      parent.identifier = p.identifier
    }
    await client.update(DOMAIN_TASK, { _id: issue._id }, { $set: { parents: issue.parents } })
  }
}

async function tryCreateStatus (client: MigrationClient): Promise<Ref<Status>> {
  const exists = await client.find<Status>(DOMAIN_STATUS, {
    _class: tracker.class.IssueStatus,
    name: 'Todo',
    ofAttribute: tracker.attribute.IssueStatus
  })
  if (exists.length > 0) return exists[0]._id
  const newStatus: IssueStatus = {
    ofAttribute: tracker.attribute.IssueStatus,
    name: 'Todo',
    _id: generateId(),
    category: task.statusCategory.ToDo,
    color: PaletteColorIndexes.Porpoise,
    space: task.space.Statuses,
    modifiedOn: Date.now(),
    createdBy: core.account.System,
    createdOn: Date.now(),
    modifiedBy: core.account.System,
    _class: tracker.class.IssueStatus
  }
  await client.create<Status>(DOMAIN_STATUS, newStatus)
  const tx: TxCreateDoc<IssueStatus> = {
    modifiedOn: Date.now(),
    createdBy: core.account.System,
    createdOn: Date.now(),
    modifiedBy: core.account.System,
    _id: generateId(),
    objectClass: newStatus._class,
    objectSpace: newStatus.space,
    objectId: newStatus._id,
    _class: core.class.TxCreateDoc,
    space: core.space.Tx,
    attributes: {
      category: newStatus.category,
      color: newStatus.color,
      ofAttribute: newStatus.ofAttribute,
      name: newStatus.name
    }
  }
  await client.create(DOMAIN_TX, tx)
  return newStatus._id
}

async function restoreToDoCategory (client: MigrationClient): Promise<void> {
  const updatedStatus = new Set<Ref<Status>>()
  const allStatuses = await client.find<Status>(
    DOMAIN_STATUS,
    { _class: tracker.class.IssueStatus },
    { projection: { name: 1, _id: 1 } }
  )
  const statusMap = toIdMap(allStatuses)
  const projects = await client.find<ProjectType>(DOMAIN_SPACE, {
    _class: task.class.ProjectType,
    descriptor: tracker.descriptors.ProjectType,
    classic: true
  })
  for (const p of projects) {
    const changed = new Map<Ref<Status>, Ref<Status>>()
    const pushStatuses: {
      _id: Ref<Status>
      taskType: Ref<TaskType>
    }[] = []
    const taskTypes = await client.find<TaskType>(DOMAIN_TASK, {
      _class: task.class.TaskType,
      descriptor: tracker.descriptors.Issue,
      _id: { $in: p.tasks ?? [] }
    })
    for (const taskType of taskTypes) {
      if (taskType.statusCategories.includes(task.statusCategory.ToDo)) continue
      const activeIndexes: number[] = []
      for (let index = 0; index < taskType.statuses.length; index++) {
        const status = taskType.statuses[index]
        const st = statusMap.get(status)
        if (st === undefined) continue
        if (st.category !== task.statusCategory.Active) continue
        activeIndexes.push(index)
      }
      if (activeIndexes.length < 2) {
        // we should create new status
        const newStatus = await tryCreateStatus(client)
        pushStatuses.push({
          _id: newStatus,
          taskType: taskType._id
        })
        taskType.statuses.splice(activeIndexes[0] ?? 0, 0, newStatus)
      } else {
        // let's try to find ToDo status
        let changed = false
        for (const index of activeIndexes) {
          const status = taskType.statuses[index]
          const st = statusMap.get(status)
          if (st === undefined) continue
          const ownTxes = await client.find<Tx>(DOMAIN_TX, { objectId: status })
          const attachedTxes = await client.find<Tx>(DOMAIN_TX, { 'tx.objectId': status })
          const original = TxProcessor.buildDoc2Doc<Status>([...ownTxes, ...attachedTxes])
          if (original === undefined) continue
          if (original.category === tracker.issueStatusCategory.Unstarted) {
            // We need to update status
            if (!updatedStatus.has(status)) {
              await client.update<Status>(
                DOMAIN_STATUS,
                { _id: status },
                { $set: { category: task.statusCategory.ToDo } }
              )
              updatedStatus.add(status)
            }
            changed = true
          }
        }
        if (!changed) {
          // we should create new status
          const newStatus = await tryCreateStatus(client)
          pushStatuses.push({
            _id: newStatus,
            taskType: taskType._id
          })
          taskType.statuses.splice(activeIndexes[0] ?? 0, 0, newStatus)
        }
      }
      await client.update(
        DOMAIN_TASK,
        { _id: taskType._id },
        {
          $set: {
            statusCategories: [
              task.statusCategory.UnStarted,
              task.statusCategory.ToDo,
              task.statusCategory.Active,
              task.statusCategory.Won,
              task.statusCategory.Lost
            ],
            statuses: taskType.statuses
          }
        }
      )
    }
    if (changed.size > 0) {
      const statuses = p.statuses
        .map((it) => {
          return {
            ...it,
            _id: changed.get(it._id) ?? it._id
          }
        })
        .concat(pushStatuses)
      await client.update(DOMAIN_SPACE, { _id: p._id }, { $set: { statuses } })
    }
  }
}

async function migrateIdentifiers (client: MigrationClient): Promise<void> {
  const classes = client.hierarchy.getDescendants(tracker.class.Issue)
  const issues = await client.find<Issue>(DOMAIN_TASK, { _class: { $in: classes }, identifier: { $exists: false } })
  if (issues.length === 0) return
  const projects = await client.find<Project>(DOMAIN_SPACE, { _class: tracker.class.Project })
  const projectsMap = toIdMap(projects)
  for (const issue of issues) {
    const project = projectsMap.get(issue.space)
    if (project === undefined) continue
    const identifier = project.identifier + '-' + issue.number
    await client.update(DOMAIN_TASK, { _id: issue._id }, { $set: { identifier } })
  }
}

async function restoreTaskTypes (client: MigrationClient): Promise<void> {
  // Query all tracker project types creations (in Model)
  // We only update new project types in model here and not old ones in spaces
  const projectTypes = (await client.find(DOMAIN_TX, {
    _class: core.class.TxCreateDoc,
    objectClass: task.class.ProjectType,
    objectSpace: core.space.Model,
    'attributes.descriptor': tracker.descriptors.ProjectType
  })) as TxCreateDoc<ProjectType>[]

  if (projectTypes.length === 0) {
    return
  }

  const descr = client.model.getObject(tracker.descriptors.ProjectType)
  const knownCategories = classicIssueTaskStatuses.map((c) => c.category)

  function compareCategories (a: Ref<StatusCategory>, b: Ref<StatusCategory>): number {
    const indexOfA = knownCategories.indexOf(a)
    const indexOfB = knownCategories.indexOf(b)

    return indexOfA - indexOfB
  }

  for (const projType of projectTypes) {
    for (const taskTypeId of projType.attributes.tasks) {
      // Check if task type create TX exists
      const createTx = (
        (await client.find(DOMAIN_TX, {
          _class: core.class.TxCreateDoc,
          objectClass: task.class.TaskType,
          objectSpace: core.space.Model,
          objectId: taskTypeId
        })) as TxCreateDoc<TaskType>[]
      )[0]

      if (createTx !== undefined) {
        continue
      }

      // Restore create task type tx

      // Get target class mixin

      const typeMixin = (
        await client.find(DOMAIN_TX, {
          mixin: task.mixin.TaskTypeClass,
          'attributes.projectType': projType.objectId,
          'attributes.taskType': taskTypeId
        })
      )[0] as TxMixin<any, any>

      if (typeMixin === undefined) {
        console.error(new Error('No type mixin found for the task type being restored'))
        continue
      }

      // Get statuses and categories
      const statusesIds = projType.attributes.statuses.filter((s) => s.taskType === taskTypeId).map((s) => s._id)
      if (statusesIds.length === 0) {
        throw new Error('No statuses defined for the task type being restored')
      }
      const statuses = await client.find<Status>(DOMAIN_STATUS, {
        _id: { $in: statusesIds }
      })
      const categoriesIds = new Set<Ref<StatusCategory>>()

      statuses.forEach((st) => {
        if (st.category !== undefined) {
          categoriesIds.add(st.category)
        }
      })

      if (categoriesIds.size === 0) {
        throw new Error('No categories found for the task type being restored')
      }

      const statusCategories = Array.from(categoriesIds)

      statusCategories.sort(compareCategories)

      const createTxNew: TxCreateDoc<TaskType> = {
        _id: generateId(),
        _class: core.class.TxCreateDoc,
        space: core.space.Tx,
        objectId: taskTypeId,
        objectClass: task.class.TaskType,
        objectSpace: core.space.Model,
        modifiedBy: core.account.ConfigUser, // So it's not removed during the next migration
        modifiedOn: projType.modifiedOn,
        createdOn: projType.createdOn,
        attributes: {
          name: 'Issue',
          descriptor: tracker.descriptors.Issue,
          ofClass: tracker.class.Issue,
          targetClass: typeMixin.objectId,
          statusClass: tracker.class.IssueStatus,
          allowedAsChildOf: [taskTypeId],
          statuses: statusesIds,
          statusCategories,
          parent: projType.objectId,
          kind: 'both',
          icon: descr.icon
        }
      }

      await client.create(DOMAIN_TX, createTxNew)

      // If there were updates to the task type - move them to the model
      // Check if task type create TX exists
      const updateTxes = await client.find(DOMAIN_TX, {
        _class: { $in: [core.class.TxUpdateDoc, core.class.TxRemoveDoc] },
        objectClass: task.class.TaskType,
        objectSpace: projType.objectId,
        objectId: taskTypeId
      })

      for (const updTx of updateTxes) {
        await client.create<Tx>(DOMAIN_TX, {
          ...updTx,
          _id: generateId(),
          objectSpace: core.space.Model
        })
      }
    }
  }
}

async function migrateIssueStatuses (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_TX,
    {
      objectClass: task.class.TaskType,
      'attributes.ofClass': tracker.class.Issue,
      'attributes.statusClass': core.class.Status
    },
    {
      $set: {
        'attributes.statusClass': tracker.class.IssueStatus
      }
    }
  )

  await client.update(
    DOMAIN_STATUS,
    {
      _class: core.class.Status,
      ofAttribute: tracker.attribute.IssueStatus
    },
    {
      $set: {
        _class: tracker.class.IssueStatus
      }
    }
  )
}

export const trackerOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, trackerId, [
      {
        state: 'fix-category-descriptors',
        func: async (client) => {
          await client.update(
            DOMAIN_SPACE,
            { _class: task.class.ProjectType, category: 'tracker:category:ProjectTypeCategory' },
            {
              $set: { descriptor: tracker.descriptors.ProjectType },
              $unset: { category: 1 }
            }
          )
        }
      },
      {
        state: 'migrate-category-types',
        func: async (client) => {
          //
          await client.update<Status>(
            DOMAIN_STATUS,
            { _class: tracker.class.IssueStatus, category: tracker.issueStatusCategory.Backlog },
            { $set: { category: task.statusCategory.UnStarted } }
          )

          await client.update<Status>(
            DOMAIN_STATUS,
            { _class: tracker.class.IssueStatus, category: tracker.issueStatusCategory.Unstarted },
            { $set: { category: task.statusCategory.ToDo } }
          )
          await client.update<Status>(
            DOMAIN_STATUS,
            { _class: tracker.class.IssueStatus, category: tracker.issueStatusCategory.Started },
            { $set: { category: task.statusCategory.Active } }
          )

          await client.update<Status>(
            DOMAIN_STATUS,
            { _class: tracker.class.IssueStatus, category: tracker.issueStatusCategory.Completed },
            { $set: { category: task.statusCategory.Won } }
          )
          await client.update<Status>(
            DOMAIN_STATUS,
            { _class: tracker.class.IssueStatus, category: tracker.issueStatusCategory.Canceled },
            { $set: { category: task.statusCategory.Lost } }
          )

          // We need to update Project and TaskTypes.
          const projectTypes = await client.find<ProjectType>(DOMAIN_SPACE, { _class: task.class.ProjectType })

          // We need to update Project and TaskTypes.
          const taskTypes = await client.find<TaskType>(DOMAIN_TASK, { _class: task.class.TaskType })

          const ptUpdate = new Map<Ref<ProjectType>, ProjectType>()
          const ttUpdate = new Map<Ref<TaskType>, TaskType>()

          for (const tt of taskTypes) {
            if (tt.statusCategories.includes(tracker.issueStatusCategory.Backlog)) {
              // We need to replace category
              tt.statusCategories = [
                task.statusCategory.UnStarted,
                task.statusCategory.ToDo,
                task.statusCategory.Active,
                task.statusCategory.Won,
                task.statusCategory.Lost
              ]
              ttUpdate.set(tt._id, tt)
            }
          }

          // We need to fix duplicate statuses per category.
          const toRemove: Ref<Status>[] = []
          for (const c of [
            task.statusCategory.UnStarted,
            task.statusCategory.ToDo,
            task.statusCategory.Active,
            task.statusCategory.Won,
            task.statusCategory.Lost
          ]) {
            const allStatuses = await client.find<Status>(
              DOMAIN_STATUS,
              { _class: tracker.class.IssueStatus, category: c },
              { projection: { name: 1, _id: 1 } }
            )
            let idx = -1
            for (const s of allStatuses) {
              idx++
              const sName = s.name.trim().toLowerCase()
              const prev = allStatuses.findIndex((it) => it.name.trim().toLowerCase() === sName)
              if (prev !== idx) {
                const prevStatus = allStatuses[prev]

                // We have a duplicate tasks
                await client.update<Status>(DOMAIN_TASK, { status: s._id }, { $set: { status: prevStatus._id } })

                for (const tt of taskTypes) {
                  const pos = tt.statuses.indexOf(s._id)
                  if (pos !== -1) {
                    tt.statuses[pos] = prevStatus._id
                    ttUpdate.set(tt._id, tt)
                  }
                }

                for (const pt of projectTypes) {
                  const pos = pt.statuses.findIndex((q) => q._id === s._id)
                  if (pos !== -1) {
                    pt.statuses[pos]._id = prevStatus._id
                    ptUpdate.set(pt._id, pt)
                  }
                }

                toRemove.push(s._id)
              }
            }
          }
          for (const v of ptUpdate.values()) {
            await client.update(DOMAIN_SPACE, { _id: v._id }, { $set: { statuses: v.statuses } })
          }
          for (const v of ttUpdate.values()) {
            await client.update(DOMAIN_TASK, { _id: v._id }, { $set: { statuses: v.statuses } })
          }
        }
      },
      {
        state: 'fixTaskTypes',
        func: fixTrackerTaskTypes
      },
      {
        state: 'restoreToDoCategory',
        func: restoreToDoCategory
      },
      {
        state: 'identifier',
        func: migrateIdentifiers
      },
      {
        state: 'passIdentifierToParentInfo',
        func: passIdentifierToParentInfo
      },
      {
        state: 'restoreTaskTypes',
        func: restoreTaskTypes
      },
      {
        state: 'fixIssueStatuses',
        func: migrateIssueStatuses
      }
    ])
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    // For now need to be created every time as it's system model
    await createDefaultProjectType(tx)

    await tryUpgrade(client, trackerId, [
      {
        state: 'create-defaults',
        func: async () => {
          await createDefaults(tx)
        }
      }
    ])
  }
}
