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
  DOMAIN_TX,
  Data,
  Ref,
  SortingOrder,
  Status,
  TxCollectionCUD,
  TxCreateDoc,
  TxOperations,
  TxUpdateDoc,
  toIdMap
} from '@hcengineering/core'
import {
  MigrateOperation,
  MigrationClient,
  MigrationUpgradeClient,
  createOrUpdate,
  tryMigrate
} from '@hcengineering/model'
import { DOMAIN_TASK, createProjectType } from '@hcengineering/model-task'
import tags from '@hcengineering/tags'
import { Issue, TimeReportDayType, TimeSpendReport } from '@hcengineering/tracker'
import view from '@hcengineering/view'
import tracker from './plugin'
import { DOMAIN_TRACKER } from './types'

async function createDefaultProject (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(tracker.class.Project, {
    _id: tracker.project.DefaultProject
  })

  const currentDeleted = await tx.findOne(core.class.TxRemoveDoc, {
    objectId: tracker.project.DefaultProject
  })

  // Create new if not deleted by customers.
  if (current === undefined && currentDeleted === undefined) {
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

    const typeId = await createProjectType(
      tx,
      {
        name: 'Base project',
        category: tracker.category.ProjectTypeCategory,
        description: ''
      },
      states,
      tracker.ids.BaseProjectType,
      tracker.class.IssueStatus
    )

    const state = await tx.findOne(
      tracker.class.IssueStatus,
      { space: typeId },
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
          type: typeId
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

async function fixIconsWithEmojis (tx: TxOperations): Promise<void> {
  const projectsWithWrongIcon = await tx.findAll(tracker.class.Project, { icon: tracker.component.IconWithEmoji })
  const promises = []
  for (const project of projectsWithWrongIcon) {
    promises.push(tx.update(project, { icon: view.ids.IconWithEmoji }))
  }
  await Promise.all(promises)
}

async function fixSpentTime (client: MigrationClient): Promise<void> {
  const issues = await client.find<Issue>(DOMAIN_TASK, { reportedTime: { $gt: 0 } })
  for (const issue of issues) {
    const childInfo = issue.childInfo
    for (const child of childInfo ?? []) {
      child.reportedTime = child.reportedTime * 8
    }
    await client.update(DOMAIN_TASK, { _id: issue._id }, { reportedTime: issue.reportedTime * 8, childInfo })
  }
  const reports = await client.find<TimeSpendReport>(DOMAIN_TRACKER, {})
  for (const report of reports) {
    await client.update(DOMAIN_TRACKER, { _id: report._id }, { value: report.value * 8 })
  }
  const createTxes = await client.find<TxCollectionCUD<Issue, TimeSpendReport>>(DOMAIN_TX, {
    'tx.objectClass': tracker.class.TimeSpendReport,
    'tx._class': core.class.TxCreateDoc,
    'tx.attributes.value': { $exists: true }
  })
  for (const tx of createTxes) {
    await client.update(
      DOMAIN_TX,
      { _id: tx._id },
      { 'tx.attributes.value': (tx.tx as TxCreateDoc<TimeSpendReport>).attributes.value * 8 }
    )
  }
  const updateTxes = await client.find<TxCollectionCUD<Issue, TimeSpendReport>>(DOMAIN_TX, {
    'tx.objectClass': tracker.class.TimeSpendReport,
    'tx._class': core.class.TxUpdateDoc,
    'tx.operations.value': { $exists: true }
  })
  for (const tx of updateTxes) {
    const val = (tx.tx as TxUpdateDoc<TimeSpendReport>).operations.value
    if (val !== undefined) {
      await client.update(DOMAIN_TX, { _id: tx._id }, { 'tx.operations.value': val * 8 })
    }
  }
}

async function fixEstimation (client: MigrationClient): Promise<void> {
  const issues = await client.find<Issue>(DOMAIN_TASK, { estimation: { $gt: 0 } })
  for (const issue of issues) {
    const childInfo = issue.childInfo
    for (const child of childInfo ?? []) {
      child.estimation = child.estimation * 8
    }
    await client.update(DOMAIN_TASK, { _id: issue._id }, { estimation: issue.estimation * 8, childInfo })
  }
  const createTxes = await client.find<TxCollectionCUD<Issue, Issue>>(DOMAIN_TX, {
    'tx.objectClass': tracker.class.Issue,
    'tx._class': core.class.TxCreateDoc,
    'tx.attributes.estimation': { $gt: 0 }
  })
  for (const tx of createTxes) {
    await client.update(
      DOMAIN_TX,
      { _id: tx._id },
      { 'tx.attributes.estimation': (tx.tx as TxCreateDoc<Issue>).attributes.estimation * 8 }
    )
  }
  const updateTxes = await client.find<TxCollectionCUD<Issue, Issue>>(DOMAIN_TX, {
    'tx.objectClass': tracker.class.Issue,
    'tx._class': core.class.TxUpdateDoc,
    'tx.operations.estimation': { $exists: true }
  })
  for (const tx of updateTxes) {
    const val = (tx.tx as TxUpdateDoc<Issue>).operations.estimation
    if (val !== undefined) {
      await client.update(DOMAIN_TX, { _id: tx._id }, { 'tx.operations.estimation': val * 8 })
    }
  }
}

async function fixRemainingTime (client: MigrationClient): Promise<void> {
  while (true) {
    const issues = await client.find<Issue>(
      DOMAIN_TASK,
      { _class: tracker.class.Issue, remainingTime: { $exists: false } },
      { limit: 1000 }
    )
    for (const issue of issues) {
      await client.update(
        DOMAIN_TASK,
        { _id: issue._id },
        { remainingTime: Math.max(0, issue.estimation - issue.reportedTime) }
      )
    }
    if (issues.length === 0) {
      break
    }
  }
  await client.update(
    DOMAIN_TASK,
    { _class: { $ne: tracker.class.Issue }, remainingTime: { $exists: true } },
    { $unset: { remainingTime: '' } }
  )
}

async function fixParentsSpace (client: MigrationClient): Promise<void> {
  while (true) {
    const issues = await client.find<Issue>(
      DOMAIN_TASK,
      { _class: tracker.class.Issue, 'parents.space': { $exists: false }, parents: { $exists: true, $ne: [] } },
      { limit: 1000 }
    )

    const parentIds: Set<Ref<Issue>> = new Set()
    for (const i of issues) {
      for (const p of i.parents ?? []) {
        parentIds.add(p.parentId)
      }
    }

    const parentIssues = toIdMap(
      await client.find<Issue>(DOMAIN_TASK, { _class: tracker.class.Issue, _id: { $in: Array.from(parentIds) } })
    )

    for (const issue of issues) {
      await client.update(
        DOMAIN_TASK,
        { _id: issue._id },
        { parents: issue.parents.map((it) => ({ ...it, space: parentIssues.get(it.parentId)?.space ?? it.space })) }
      )
    }
    if (issues.length === 0) {
      break
    }
  }
  await client.update(
    DOMAIN_TASK,
    { _class: { $ne: tracker.class.Issue }, remainingTime: { $exists: true } },
    { $unset: { remainingTime: '' } }
  )
}

async function moveIssues (client: MigrationClient): Promise<void> {
  const docs = await client.find(DOMAIN_TRACKER, { _class: tracker.class.Issue })
  if (docs.length > 0) {
    await client.move(DOMAIN_TRACKER, { _class: tracker.class.Issue }, DOMAIN_TASK)
  }
}

export const trackerOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, 'tracker', [
      {
        state: 'moveIssues',
        func: moveIssues
      },
      {
        state: 'reportTimeDayToHour',
        func: fixSpentTime
      },
      {
        state: 'estimationDayToHour',
        func: fixEstimation
      },
      {
        state: 'fixRemainingTime',
        func: fixRemainingTime
      },
      {
        state: 'fixParentsSpace',
        func: fixParentsSpace
      }
    ])
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createDefaults(tx)
    await fixIconsWithEmojis(tx)
  }
}
