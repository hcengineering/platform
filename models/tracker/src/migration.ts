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
  Doc,
  DocumentUpdate,
  DOMAIN_TX,
  generateId,
  Ref,
  SortingOrder,
  TxOperations,
  TxResult
} from '@hcengineering/core'
import { createOrUpdate, MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import tags from '@hcengineering/tags'
import {
  calcRank,
  genRanks,
  Issue,
  IssueStatus,
  IssueStatusCategory,
  Team,
  TimeReportDayType,
  WorkDayLength
} from '@hcengineering/tracker'
import { DOMAIN_TRACKER } from '.'
import tracker from './plugin'

enum DeprecatedIssueStatus {
  Backlog,
  Todo,
  InProgress,
  Done,
  Canceled
}

interface CreateTeamIssueStatusesArgs {
  tx: TxOperations
  teamId: Ref<Team>
  categories: IssueStatusCategory[]
  defaultStatusId?: Ref<IssueStatus>
  defaultCategoryId?: Ref<IssueStatusCategory>
}

const categoryByDeprecatedIssueStatus = {
  [DeprecatedIssueStatus.Backlog]: tracker.issueStatusCategory.Backlog,
  [DeprecatedIssueStatus.Todo]: tracker.issueStatusCategory.Unstarted,
  [DeprecatedIssueStatus.InProgress]: tracker.issueStatusCategory.Started,
  [DeprecatedIssueStatus.Done]: tracker.issueStatusCategory.Completed,
  [DeprecatedIssueStatus.Canceled]: tracker.issueStatusCategory.Canceled
} as const

async function createTeamIssueStatuses ({
  tx,
  teamId: attachedTo,
  categories,
  defaultStatusId,
  defaultCategoryId = tracker.issueStatusCategory.Backlog
}: CreateTeamIssueStatusesArgs): Promise<void> {
  const issueStatusRanks = [...genRanks(categories.length)]

  for (const [i, statusCategory] of categories.entries()) {
    const { _id: category, defaultStatusName } = statusCategory
    const rank = issueStatusRanks[i]

    await tx.addCollection(
      tracker.class.IssueStatus,
      attachedTo,
      attachedTo,
      tracker.class.Team,
      'issueStatuses',
      { name: defaultStatusName, category, rank },
      category === defaultCategoryId ? defaultStatusId : undefined
    )
  }
}

async function createDefaultTeam (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(tracker.class.Team, {
    _id: tracker.team.DefaultTeam
  })

  const currentDeleted = await tx.findOne(core.class.TxRemoveDoc, {
    objectId: tracker.team.DefaultTeam
  })

  // Create new if not deleted by customers.
  if (current === undefined && currentDeleted === undefined) {
    const defaultStatusId: Ref<IssueStatus> = generateId()
    const categories = await tx.findAll(
      tracker.class.IssueStatusCategory,
      {},
      { sort: { order: SortingOrder.Ascending } }
    )

    await tx.createDoc<Team>(
      tracker.class.Team,
      core.space.Space,
      {
        name: 'Default',
        description: 'Default team',
        private: false,
        members: [],
        archived: false,
        identifier: 'TSK',
        sequence: 0,
        issueStatuses: 0,
        defaultIssueStatus: defaultStatusId,
        defaultTimeReportDay: TimeReportDayType.PreviousWorkDay,
        workDayLength: WorkDayLength.EIGHT_HOURS
      },
      tracker.team.DefaultTeam
    )
    await createTeamIssueStatuses({ tx, teamId: tracker.team.DefaultTeam, categories, defaultStatusId })
  }
}

async function fixTeamIssueStatusesOrder (tx: TxOperations, team: Team): Promise<TxResult> {
  const statuses = await tx.findAll(
    tracker.class.IssueStatus,
    { attachedTo: team._id },
    { lookup: { category: tracker.class.IssueStatusCategory } }
  )
  statuses.sort((a, b) => (a.$lookup?.category?.order ?? 0) - (b.$lookup?.category?.order ?? 0))
  const issueStatusRanks = genRanks(statuses.length)
  return statuses.map((status) => {
    const rank = issueStatusRanks.next().value
    if (rank === undefined || status.rank === rank) return undefined
    return tx.update(status, { rank })
  })
}

async function fixTeamsIssueStatusesOrder (tx: TxOperations): Promise<void> {
  const teams = await tx.findAll(tracker.class.Team, {})
  await Promise.all(teams.map((team) => fixTeamIssueStatusesOrder(tx, team)))
}

async function upgradeTeamSettings (tx: TxOperations): Promise<void> {
  const teams = await tx.findAll(tracker.class.Team, {
    defaultTimeReportDay: { $exists: false },
    workDayLength: { $exists: false }
  })
  await Promise.all(
    teams.map((team) =>
      tx.update(team, {
        defaultTimeReportDay: TimeReportDayType.PreviousWorkDay,
        workDayLength: WorkDayLength.EIGHT_HOURS
      })
    )
  )
}

async function upgradeTeamIssueStatuses (tx: TxOperations): Promise<void> {
  const teams = await tx.findAll(tracker.class.Team, { issueStatuses: undefined })

  if (teams.length > 0) {
    const categories = await tx.findAll(
      tracker.class.IssueStatusCategory,
      {},
      { sort: { order: SortingOrder.Ascending } }
    )

    for (const team of teams) {
      const defaultStatusId: Ref<IssueStatus> = generateId()

      await tx.update(team, { issueStatuses: 0, defaultIssueStatus: defaultStatusId })
      await createTeamIssueStatuses({ tx, teamId: team._id, categories, defaultStatusId })
    }
  }
}

async function upgradeIssueStatuses (tx: TxOperations): Promise<void> {
  const deprecatedStatuses = [
    DeprecatedIssueStatus.Backlog,
    DeprecatedIssueStatus.Canceled,
    DeprecatedIssueStatus.Done,
    DeprecatedIssueStatus.InProgress,
    DeprecatedIssueStatus.Todo
  ]
  const issues = await tx.findAll(tracker.class.Issue, { status: { $in: deprecatedStatuses as any } })

  if (issues.length > 0) {
    const statusByDeprecatedStatus = new Map<DeprecatedIssueStatus, Ref<IssueStatus>>()

    for (const issue of issues) {
      const deprecatedStatus = issue.status as unknown as DeprecatedIssueStatus

      if (!statusByDeprecatedStatus.has(deprecatedStatus)) {
        const category = categoryByDeprecatedIssueStatus[deprecatedStatus]
        const issueStatus = await tx.findOne(tracker.class.IssueStatus, { category })

        if (issueStatus === undefined) {
          throw new Error(`Could not find a new status for "${DeprecatedIssueStatus[deprecatedStatus]}"`)
        }

        statusByDeprecatedStatus.set(deprecatedStatus, issueStatus._id)
      }

      await tx.update(issue, { status: statusByDeprecatedStatus.get(deprecatedStatus) })
    }
  }
}

async function migrateParentIssues (client: MigrationClient): Promise<void> {
  let { updated } = await client.update(
    DOMAIN_TRACKER,
    { _class: tracker.class.Issue, attachedToClass: { $exists: false } },
    {
      subIssues: 0,
      collection: 'subIssues',
      attachedToClass: tracker.class.Issue
    }
  )
  updated += (
    await client.update(
      DOMAIN_TRACKER,
      { _class: tracker.class.Issue, parentIssue: { $exists: true } },
      { $rename: { parentIssue: 'attachedTo' } }
    )
  ).updated
  updated += (
    await client.update(
      DOMAIN_TRACKER,
      { _class: tracker.class.Issue, attachedTo: { $in: [null, undefined] } },
      { attachedTo: tracker.ids.NoParent }
    )
  ).updated

  if (updated === 0) {
    return
  }

  const childrenCountById = new Map<Ref<Doc>, number>()
  const parentIssueIds = (
    await client.find<Issue>(DOMAIN_TRACKER, {
      _class: tracker.class.Issue,
      attachedTo: { $nin: [tracker.ids.NoParent] }
    })
  ).map((issue) => issue.attachedTo)

  for (const issueId of parentIssueIds) {
    const count = childrenCountById.get(issueId) ?? 0
    childrenCountById.set(issueId, count + 1)
  }

  for (const [_id, childrenCount] of childrenCountById) {
    await client.update(DOMAIN_TRACKER, { _id }, { subIssues: childrenCount })
  }
}

async function updateIssueParentInfo (client: MigrationClient, parentIssue: Issue | null): Promise<void> {
  const parents =
    parentIssue === null ? [] : [{ parentId: parentIssue._id, parentTitle: parentIssue.title }, ...parentIssue.parents]
  const migrationResult = await client.update<Issue>(
    DOMAIN_TRACKER,
    {
      _class: tracker.class.Issue,
      attachedTo: parentIssue?._id ?? tracker.ids.NoParent,
      parents: { $exists: false }
    },
    { parents }
  )

  if (migrationResult.matched > 0) {
    const subIssues = await client.find<Issue>(DOMAIN_TRACKER, {
      _class: tracker.class.Issue,
      attachedTo: parentIssue?._id ?? tracker.ids.NoParent,
      subIssues: { $gt: 0 }
    })

    for (const issue of subIssues) {
      await updateIssueParentInfo(client, issue)
    }
  }
}

async function migrateIssueParentInfo (client: MigrationClient): Promise<void> {
  await updateIssueParentInfo(client, null)
}

async function migrateIssueProjects (client: MigrationClient): Promise<void> {
  const issues = await client.find(DOMAIN_TRACKER, { _class: tracker.class.Issue, project: { $exists: false } })

  if (issues.length === 0) {
    return
  }

  for (const issue of issues) {
    await client.update(DOMAIN_TRACKER, { _id: issue._id }, { project: null })
  }
}

async function upgradeProjectIcons (tx: TxOperations): Promise<void> {
  const projects = await tx.findAll(tracker.class.Project, {})

  if (projects.length === 0) {
    return
  }

  for (const project of projects) {
    const icon = project.icon as unknown

    if (icon !== undefined) {
      continue
    }

    await tx.update(project, { icon: tracker.icon.Projects })
  }
}

async function createDefaults (tx: TxOperations): Promise<void> {
  await createDefaultTeam(tx)
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

async function fillRank (client: MigrationClient): Promise<void> {
  const docs = await client.find<Issue>(DOMAIN_TRACKER, {
    _class: tracker.class.Issue,
    rank: ''
  })
  let last = (
    await client.find<Issue>(
      DOMAIN_TRACKER,
      {
        _class: tracker.class.Issue,
        rank: { $ne: '' }
      },
      {
        sort: { rank: SortingOrder.Descending },
        limit: 1
      }
    )
  )[0]
  for (const doc of docs) {
    const rank = calcRank(last)
    await client.update(
      DOMAIN_TRACKER,
      {
        _id: doc._id
      },
      {
        rank
      }
    )
    await client.update(
      DOMAIN_TX,
      { 'tx.objectId': doc._id, 'tx._class': core.class.TxCreateDoc },
      { 'tx.attributes.rank': rank }
    )
    doc.rank = rank
    last = doc
  }
}

async function upgradeTeams (tx: TxOperations): Promise<void> {
  await upgradeTeamIssueStatuses(tx)
  await fixTeamsIssueStatusesOrder(tx)
  await upgradeTeamSettings(tx)
}

async function upgradeIssues (tx: TxOperations): Promise<void> {
  await upgradeIssueStatuses(tx)

  const issues = await tx.findAll(tracker.class.Issue, {
    $or: [{ blockedBy: { $exists: true } }, { relatedIssue: { $exists: true } }]
  })

  for (const i of issues) {
    const rel = (i as any).relatedIssue as Ref<Issue>[]
    const upd: DocumentUpdate<Issue> = {}
    if (rel != null) {
      ;(upd as any).relatedIssue = null
      upd.relations = rel.map((it) => ({ _id: it, _class: tracker.class.Issue }))
    }
    if (i.blockedBy !== undefined) {
      if ((i.blockedBy as any[]).find((it) => typeof it === 'string') !== undefined) {
        upd.blockedBy = (i.blockedBy as unknown as Ref<Issue>[]).map((it) => ({ _id: it, _class: tracker.class.Issue }))
      }
    }
    if (Object.keys(upd).length > 0) {
      await tx.update(i, upd)
    }
  }
}

async function upgradeProjects (tx: TxOperations): Promise<void> {
  await upgradeProjectIcons(tx)
}

export const trackerOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await client.update(
      DOMAIN_TRACKER,
      { _class: tracker.class.Issue, reports: { $exists: false } },
      {
        reports: 0,
        estimation: 0,
        reportedTime: 0
      }
    )
    await Promise.all([migrateIssueProjects(client), migrateParentIssues(client)])
    await migrateIssueParentInfo(client)
    await fillRank(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createDefaults(tx)
    await upgradeTeams(tx)
    await upgradeIssues(tx)
    await upgradeProjects(tx)
  }
}
