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

import core, { SortingOrder, TxOperations, generateId, type Data, type Ref, type Status } from '@hcengineering/core'
import {
  createOrUpdate,
  tryMigrate,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import { DOMAIN_SPACE } from '@hcengineering/model-core'
import { createProjectType, fixTaskTypes } from '@hcengineering/model-task'
import tags from '@hcengineering/tags'
import task, { type TaskType } from '@hcengineering/task'
import { TimeReportDayType } from '@hcengineering/tracker'
import tracker from './plugin'

async function createDefaultProject (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(tracker.class.Project, {
    _id: tracker.project.DefaultProject
  })

  const currentDeleted = await tx.findOne(core.class.TxRemoveDoc, {
    objectId: tracker.project.DefaultProject
  })

  if ((await tx.findOne(task.class.ProjectType, { _id: tracker.ids.ClassingProjectType })) === undefined) {
    const categories = await tx.findAll(
      core.class.StatusCategory,
      { ofAttribute: tracker.attribute.IssueStatus },
      { sort: { order: SortingOrder.Ascending } }
    )
    const states: Omit<Data<Status>, 'rank'>[] = []

    for (const category of categories) {
      states.push({
        ofAttribute: tracker.attribute.IssueStatus,
        name: category.defaultStatusName,
        category: category._id
      })
    }
    await createProjectType(
      tx,
      {
        name: 'Classic project',
        descriptor: tracker.descriptors.ProjectType,
        description: '',
        tasks: []
      },
      [
        {
          _id: tracker.taskTypes.Issue,
          descriptor: tracker.descriptors.Issue,
          name: 'Issue',
          factory: states,
          ofClass: tracker.class.Issue,
          targetClass: tracker.class.Issue,
          statusCategories: categories.map((it) => it._id),
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
    const baseCategories = [
      task.statusCategory.UnStarted,
      task.statusCategory.Active,
      task.statusCategory.Won,
      task.statusCategory.Lost
    ]
    const categories = await tx.findAll(
      core.class.StatusCategory,
      { _id: { $in: baseCategories } },
      { sort: { order: SortingOrder.Ascending } }
    )
    const states: Omit<Data<Status>, 'rank'>[] = []

    for (const category of categories) {
      states.push({
        ofAttribute: tracker.attribute.IssueStatus,
        name: category.defaultStatusName,
        category: category._id
      })
    }
    await createProjectType(
      tx,
      {
        name: 'Base project',
        descriptor: tracker.descriptors.ProjectType,
        description: '',
        tasks: []
      },
      [
        {
          _id: issueId,
          name: 'Issue',
          descriptor: tracker.descriptors.Issue,
          factory: states,
          ofClass: tracker.class.Issue,
          targetClass: tracker.class.Issue,
          statusCategories: baseCategories,
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
        statusCategories: [
          tracker.issueStatusCategory.Backlog,
          tracker.issueStatusCategory.Unstarted,
          tracker.issueStatusCategory.Started,
          tracker.issueStatusCategory.Completed,
          tracker.issueStatusCategory.Canceled
        ],
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
