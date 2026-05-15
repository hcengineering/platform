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
import {
  type Issue,
  type IssueRelation,
  type IssueStatus,
  type Project,
  TimeReportDayType,
  trackerId
} from '@hcengineering/tracker'
import view, { type ViewOptionModel } from '@hcengineering/view'

import { classicIssueTaskStatuses } from '.'
import tracker from './plugin'
import { DOMAIN_TRACKER } from './types'
import { ganttViewOptions } from './viewlets'

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

export async function migrateAddStartDate (client: MigrationClient): Promise<void> {
  // Issues live in DOMAIN_TASK; Milestones live in DOMAIN_TRACKER.
  await client.update(
    DOMAIN_TASK,
    { _class: tracker.class.Issue, startDate: { $exists: false } },
    { startDate: null }
  )
  await client.update(
    DOMAIN_TRACKER,
    { _class: tracker.class.Milestone, startDate: { $exists: false } },
    { startDate: null }
  )
}

// Phase 1 (Visual Polish) adds four new ViewOptions to the IssueGantt
// viewlet (ganttBarLabelLeft/Inside/Right + ganttQuickInfoOnClick).
// builder.createDoc is idempotent, so existing workspaces don't pick
// up the new entries on upgrade-workspace. Re-add the missing ones by
// merging on `key`, preserving the user's groupBy/orderBy and any
// already-stored entries. Idempotent — a re-run is a no-op.
//
// Mirrors models/card/src/migration.ts:addShowAllVersionsViewOption.
async function addGanttPhase1ViewOptions (client: MigrationUpgradeClient): Promise<void> {
  const txOp = new TxOperations(client, core.account.System)

  const viewlets = await client.findAll(view.class.Viewlet, {
    _id: tracker.viewlet.IssueGantt
  })
  if (viewlets.length === 0) return

  const desiredOther = ganttViewOptions().other ?? []

  for (const v of viewlets) {
    const current = v.viewOptions ?? { groupBy: [], orderBy: [], other: [] }
    const currentOther: ViewOptionModel[] = current.other ?? []
    const existingKeys = new Set(currentOther.map((o) => o.key))
    const missing = desiredOther.filter((o) => !existingKeys.has(o.key))
    if (missing.length === 0) continue

    await txOp.update(v, {
      viewOptions: {
        ...current,
        other: [...currentOther, ...missing]
      }
    })
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
      if (project.defaultIssueStatus != null) {
        const newDefaultIssueStatus = getNewStatus(project.defaultIssueStatus)

        if (project.defaultIssueStatus !== newDefaultIssueStatus) {
          await client.update(DOMAIN_SPACE, { _id: project._id }, { defaultIssueStatus: newDefaultIssueStatus })
        }
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

/**
 * Tier-2 Item 8 — Activity-Log Remove-Detail Fix.
 *
 * Legacy IssueRelation removals went through `ops.removeDoc`, which emits
 * a bare TxRemoveDoc without parent-issue attachment. The activity
 * pipeline therefore wrote a DocUpdateMessage whose attachedTo is the
 * relation itself, never showing up in the issue's activity feed. This
 * migration re-attaches such DUMs to their parent issue by looking up the
 * original TxCreateDoc of the now-removed IssueRelation. Best-effort:
 * when the create-tx is missing (db compaction) the DUM still gets
 * `updateCollection='relations'` so the activity feed at least shows
 * "removed dependency" without the target detail.
 *
 * Idempotent — once a DUM has Issue-side attachment + `updateCollection`,
 * the predicate skips it on subsequent runs. The predicate is a local
 * 4-LOC copy of `isBrokenRelationDum` in
 * `plugins/tracker-resources/src/components/gantt/lib/relation-activity-migration.ts`
 * (cannot import across package layers — models/tracker is below
 * tracker-resources). The helper module is the one with unit tests.
 */
async function migrateRelationActivityAttachment (client: MigrationClient): Promise<void> {
  const issueClass = tracker.class.Issue
  const dums = await client.find<DocUpdateMessage>(
    DOMAIN_ACTIVITY,
    {
      _class: activity.class.DocUpdateMessage,
      objectClass: tracker.class.IssueRelation,
      action: 'remove'
    }
  )
  if (dums.length === 0) return
  for (const dum of dums) {
    const isBroken = dum.attachedToClass !== issueClass || dum.updateCollection !== 'relations'
    if (!isBroken) continue
    // Find the create-tx for this relation. The relation objectId remains
    // the same across the doc's whole life — that's the key we look up.
    const createTxes = await client.find<TxCreateDoc<IssueRelation>>(
      DOMAIN_MODEL_TX,
      {
        _class: core.class.TxCreateDoc,
        objectId: dum.objectId as Ref<IssueRelation>
      },
      { limit: 1 }
    )
    const createTx = createTxes[0]
    const patch: Partial<DocUpdateMessage> = {}
    if (
      createTx !== undefined &&
      createTx.attachedTo !== undefined &&
      createTx.attachedToClass !== undefined
    ) {
      patch.attachedTo = createTx.attachedTo
      patch.attachedToClass = createTx.attachedToClass
      patch.updateCollection = createTx.collection ?? 'relations'
    } else {
      // Placeholder: ensure the DUM at least shows up in the parent
      // issue's feed by giving it the collection name; we leave
      // attachedTo as-is (the runtime DocUpdateMessageObjectValue will
      // still try buildRemovedDoc with objectId, which often succeeds
      // even when the create-tx for the *DUM's* attachedTo is gone).
      if (dum.updateCollection === 'relations') continue
      patch.updateCollection = 'relations'
    }
    await client.update<DocUpdateMessage>(
      DOMAIN_ACTIVITY,
      { _id: dum._id },
      patch
    )
  }
}

export const trackerOperation: MigrateOperation = {
  async preMigrate (client: MigrationClient, logger: ModelLogger, mode): Promise<void> {
    await tryMigrate(mode, client, trackerId, [
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
  async migrate (client: MigrationClient, mode): Promise<void> {
    await tryMigrate(mode, client, trackerId, [
      {
        state: 'identifier',
        mode: 'upgrade',
        func: migrateIdentifiers
      },
      {
        state: 'passIdentifierToParentInfo',
        mode: 'upgrade',
        func: passIdentifierToParentInfo
      },
      {
        state: 'statusesToModel-2',
        mode: 'upgrade',
        func: migrateStatusesToModel
      },
      {
        state: 'migrateDefaultTypeMixins',
        mode: 'upgrade',
        func: migrateDefaultTypeMixins
      },
      {
        state: 'gantt-add-startdate',
        mode: 'upgrade',
        func: migrateAddStartDate
      },
      {
        // Phase-2 working-days calendar. The property is optional and
        // additive — every existing Project keeps `workingDaysConfig =
        // undefined` (legacy calendar-day semantics). The migration entry
        // exists only so the tracker state-tracker registers the schema
        // version bump; no data is touched.
        state: 'gantt-add-working-days-config',
        mode: 'upgrade',
        func: async () => {}
      },
      {
        // Tier-2 Item 8 — Activity-Log Remove-Detail Fix.
        state: 'relation-activity-attached-v1',
        mode: 'upgrade',
        func: migrateRelationActivityAttachment
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>, mode): Promise<void> {
    await tryUpgrade(mode, state, client, trackerId, [
      {
        state: 'create-defaults',
        func: async (client) => {
          const tx = new TxOperations(client, core.account.System)
          await createDefaults(tx)
        }
      },
      {
        state: 'add-gantt-phase1-view-options',
        func: addGanttPhase1ViewOptions
      }
    ])
  }
}
