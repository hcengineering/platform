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

import core, { generateId, Ref, TxOperations } from '@anticrm/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@anticrm/model'
import { IssueStatus, IssueStatusCategory, Team, genRanks } from '@anticrm/tracker'
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
    const categories = await tx.findAll(tracker.class.IssueStatusCategory, {})

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
        defaultIssueStatus: defaultStatusId
      },
      tracker.team.DefaultTeam
    )
    await createTeamIssueStatuses({ tx, teamId: tracker.team.DefaultTeam, categories, defaultStatusId })
  }
}

async function upgradeTeamIssueStatuses (tx: TxOperations): Promise<void> {
  const teams = await tx.findAll(tracker.class.Team, { issueStatuses: undefined })

  if (teams.length > 0) {
    const categories = await tx.findAll(tracker.class.IssueStatusCategory, {})

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

async function createDefaults (tx: TxOperations): Promise<void> {
  await createDefaultTeam(tx)
}

async function upgradeTeams (tx: TxOperations): Promise<void> {
  await upgradeTeamIssueStatuses(tx)
}

async function upgradeIssues (tx: TxOperations): Promise<void> {
  await upgradeIssueStatuses(tx)
}

export const trackerOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {},
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createDefaults(tx)
    await upgradeTeams(tx)
    await upgradeIssues(tx)
  }
}
