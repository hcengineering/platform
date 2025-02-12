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

import activity, { type DocUpdateMessage } from '@hcengineering/activity'
import core, {
  DOMAIN_MODEL_TX,
  DOMAIN_STATUS,
  type Ref,
  type Status,
  type TxCreateDoc,
  TxOperations,
  generateId,
  toIdMap
} from '@hcengineering/core'
import {
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient,
  type ModelLogger,
  createOrUpdate,
  tryMigrate,
  tryUpgrade
} from '@hcengineering/model'
import { DOMAIN_ACTIVITY } from '@hcengineering/model-activity'
import { DOMAIN_SPACE } from '@hcengineering/model-core'
import { DOMAIN_TASK, migrateDefaultStatusesBase } from '@hcengineering/model-task'
import tags from '@hcengineering/tags'
import task from '@hcengineering/task'
import tracker, {
  type Issue,
  type IssueStatus,
  type Project,
  TimeReportDayType,
  trackerId
} from '@hcengineering/tracker'

import { classicIssueTaskStatuses } from '.'

async function createDefaultProject (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(tracker.class.Project, {
    _id: tracker.project.DefaultProject
  })

  const currentDeleted = await tx.findOne(core.class.TxRemoveDoc, {
    objectId: tracker.project.DefaultProject
  })

  // temporary disabled until nice automation
  // NOTE: when it will be restored !!!
  // 1. Move to static model
  // 2. Use well-known IDs for all the objects
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
            autoJoin: true,
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

async function createDefaults (tx: TxOperations): Promise<void> {
  await createDefaultProject(tx)
  await createOrUpdate(
    tx,
    tags.class.TagCategory,
    core.space.Workspace,
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
    await client.update(DOMAIN_TASK, { _id: issue._id }, { parents: issue.parents })
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
    await client.update(DOMAIN_TASK, { _id: issue._id }, { identifier })
  }
}

async function migrateDefaultStatuses (client: MigrationClient, logger: ModelLogger): Promise<void> {
  const defaultTypeId = tracker.ids.ClassingProjectType
  const typeDescriptor = tracker.descriptors.ProjectType
  const baseClass = tracker.class.Project
  const defaultTaskTypeId = tracker.taskTypes.Issue
  const taskTypeClass = task.class.TaskType
  const baseTaskClass = tracker.class.Issue
  const statusAttributeOf = tracker.attribute.IssueStatus
  const statusClass = tracker.class.IssueStatus
  const getDefaultStatus = (oldStatus: Status): Ref<Status> | undefined => {
    const classicCategory = classicIssueTaskStatuses.find((c) => c.category === oldStatus.category)
    if (classicCategory === undefined) {
      return
    }

    const classicStatus = classicCategory.statuses.find(
      (s) => s[0].toLowerCase() === oldStatus.name.trim().toLowerCase()
    )

    return classicStatus?.[2] as Ref<Status>
  }
  const migrateProjects = async (getNewStatus: (oldStatus: Ref<Status>) => Ref<Status>): Promise<void> => {
    const projects = await client.find<Project>(DOMAIN_SPACE, { _class: tracker.class.Project })

    logger.log('projects: ', projects.length)

    // Project:
    // 1. defaultIssueStatus
    // 2. DocUpdateMessage:update:defaultIssueStatus
    for (const project of projects) {
      const newDefaultIssueStatus = getNewStatus(project.defaultIssueStatus)

      if (project.defaultIssueStatus !== newDefaultIssueStatus) {
        await client.update(DOMAIN_SPACE, { _id: project._id }, { defaultIssueStatus: newDefaultIssueStatus })
      }

      const projectUpdateMessages = await client.find<DocUpdateMessage>(DOMAIN_ACTIVITY, {
        _class: activity.class.DocUpdateMessage,
        action: 'update',
        objectId: project._id,
        'attributeUpdates.attrKey': 'defaultIssueStatus'
      })

      for (const updateMessage of projectUpdateMessages) {
        const statusSet = updateMessage.attributeUpdates?.set[0]
        const newStatusSet = statusSet != null ? getNewStatus(statusSet as Ref<Status>) : statusSet

        if (statusSet !== newStatusSet) {
          await client.update(DOMAIN_ACTIVITY, { _id: updateMessage._id }, { 'attributeUpdates.set.0': newStatusSet })
        }
      }
    }
  }

  await migrateDefaultStatusesBase<Issue>(
    client,
    logger,
    defaultTypeId,
    typeDescriptor,
    baseClass,
    defaultTaskTypeId,
    taskTypeClass,
    baseTaskClass,
    statusAttributeOf,
    statusClass,
    getDefaultStatus,
    migrateProjects
  )
}

async function migrateStatusesToModel (client: MigrationClient): Promise<void> {
  // Move statuses to model:
  // Migrate the default ones with well-known ids as system's model
  // And the rest as user's model
  // Skip __superseded statuses
  const allStatuses = await client.find<IssueStatus>(DOMAIN_STATUS, {
    _class: tracker.class.IssueStatus,
    __superseded: { $exists: false }
  })

  for (const status of allStatuses) {
    const isSystem = (status as any).__migratedFrom !== undefined
    const modifiedBy =
      status.modifiedBy === core.account.System
        ? isSystem
          ? core.account.System
          : core.account.ConfigUser
        : status.modifiedBy

    const tx: TxCreateDoc<IssueStatus> = {
      _id: generateId(),
      _class: core.class.TxCreateDoc,
      space: core.space.Tx,
      objectId: status._id,
      objectClass: status._class,
      objectSpace: core.space.Model,
      attributes: {
        ofAttribute: status.ofAttribute,
        category: status.category,
        name: status.name,
        color: status.color,
        description: status.description
      },
      modifiedOn: status.modifiedOn,
      createdBy: status.createdBy,
      createdOn: status.createdOn,
      modifiedBy
    }

    await client.create(DOMAIN_MODEL_TX, tx)
  }
}

async function migrateDefaultTypeMixins (client: MigrationClient): Promise<void> {
  const oldSpaceTypeMixin = `${tracker.ids.ClassingProjectType}:type:mixin`
  const newSpaceTypeMixin = tracker.mixin.ClassicProjectTypeData
  const oldTaskTypeMixin = `${tracker.taskTypes.Issue}:type:mixin`
  const newTaskTypeMixin = tracker.mixin.IssueTypeData

  await client.update(
    DOMAIN_MODEL_TX,
    {
      objectClass: core.class.Attribute,
      'attributes.attributeOf': oldSpaceTypeMixin
    },
    {
      'attributes.attributeOf': newSpaceTypeMixin
    }
  )

  await client.update(
    DOMAIN_SPACE,
    {
      _class: tracker.class.Project,
      [oldSpaceTypeMixin]: { $exists: true }
    },
    {
      $rename: {
        [oldSpaceTypeMixin]: newSpaceTypeMixin
      }
    }
  )

  await client.update(
    DOMAIN_TASK,
    {
      _class: tracker.class.Issue,
      [oldTaskTypeMixin]: { $exists: true }
    },
    {
      $rename: {
        [oldTaskTypeMixin]: newTaskTypeMixin
      }
    }
  )
}

async function migrateIssueStatuses (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_MODEL_TX,
    {
      objectClass: task.class.TaskType,
      'attributes.ofClass': tracker.class.Issue,
      'attributes.statusClass': core.class.Status
    },
    {
      'attributes.statusClass': tracker.class.IssueStatus
    }
  )
  await client.update(
    DOMAIN_MODEL_TX,
    {
      objectClass: core.class.Status,
      'attributes.ofAttribute': tracker.attribute.IssueStatus
    },
    {
      objectClass: tracker.class.IssueStatus
    }
  )

  await client.update(
    DOMAIN_STATUS,
    {
      _class: core.class.Status,
      ofAttribute: tracker.attribute.IssueStatus
    },
    {
      _class: tracker.class.IssueStatus
    }
  )
}

export const trackerOperation: MigrateOperation = {
  async preMigrate (client: MigrationClient, logger: ModelLogger): Promise<void> {
    await tryMigrate(client, trackerId, [
      {
        state: 'fixIncorrectIssueStatuses',
        func: migrateIssueStatuses
      },
      {
        state: 'migrate-default-statuses',
        func: (client) => migrateDefaultStatuses(client, logger)
      }
    ])
  },
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, trackerId, [
      {
        state: 'identifier',
        func: migrateIdentifiers
      },
      {
        state: 'passIdentifierToParentInfo',
        func: passIdentifierToParentInfo
      },
      {
        state: 'statusesToModel-2',
        func: migrateStatusesToModel
      },
      {
        state: 'migrateDefaultTypeMixins',
        func: migrateDefaultTypeMixins
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {
    await tryUpgrade(state, client, trackerId, [
      {
        state: 'create-defaults',
        func: async (client) => {
          const tx = new TxOperations(client, core.account.System)
          await createDefaults(tx)
        }
      }
    ])
  }
}
