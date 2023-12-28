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
  SortingOrder,
  TxOperations,
  generateId,
  type Data,
  type Ref,
  type Status
} from '@hcengineering/core'
import {
  createOrUpdate,
  tryMigrate,
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
  baseIssueTaskStatuses,
  classicIssueTaskStatuses,
  createStatesData
} from '@hcengineering/tracker'
import tracker from './plugin'

async function createDefaultProject (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(tracker.class.Project, {
    _id: tracker.project.DefaultProject
  })

  const currentDeleted = await tx.findOne(core.class.TxRemoveDoc, {
    objectId: tracker.project.DefaultProject
  })

  if ((await tx.findOne(task.class.ProjectType, { _id: tracker.ids.ClassingProjectType })) === undefined) {
    const states: Omit<Data<Status>, 'rank'>[] = createStatesData(classicIssueTaskStatuses)
    await createProjectType(
      tx,
      {
        name: 'Classic project',
        descriptor: tracker.descriptors.ProjectType,
        description: '',
        tasks: [],
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

  if ((await tx.findOne(task.class.ProjectType, { _id: tracker.ids.BaseProjectType })) === undefined) {
    const issueId: Ref<TaskType> = generateId()

    const states: Omit<Data<Status>, 'rank'>[] = createStatesData(baseIssueTaskStatuses)
    await createProjectType(
      tx,
      {
        name: 'Base project',
        descriptor: tracker.descriptors.ProjectType,
        description: '',
        tasks: [],
        classic: false
      },
      [
        {
          _id: issueId,
          name: 'Issue',
          descriptor: tracker.descriptors.Issue,
          factory: states,
          ofClass: tracker.class.Issue,
          targetClass: tracker.class.Issue,
          statusCategories: baseIssueTaskStatuses.map((it) => it.category),
          statusClass: core.class.Status,
          kind: 'both',
          allowedAsChildOf: [issueId]
        }
      ],
      tracker.ids.BaseProjectType
    )
  }

  // Create new if not deleted by customers.
  if (current === undefined && currentDeleted === undefined) {
    const state = await tx.findOne(
      tracker.class.IssueStatus,
      { space: tracker.ids.DefaultProjectType },
      { sort: { rank: SortingOrder.Ascending } }
    )
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
          type: tracker.ids.DefaultProjectType
        },
        tracker.project.DefaultProject
      )
    }
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

export const trackerOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, 'tracker', [
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
            { $set: { category: task.statusCategory.Active } }
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
      }
    ])
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createDefaults(tx)
  }
}
