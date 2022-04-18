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
import { IssueStatus, IssueStatusCategory, Team } from '@anticrm/tracker'
import tracker from './plugin'

interface CreateTeamIssueStatusesArgs {
  tx: TxOperations
  teamId: Ref<Team>
  categories: IssueStatusCategory[]
  defaultStatusId?: Ref<IssueStatus>
  defaultCategoryId?: Ref<IssueStatusCategory>
}

async function createTeamIssueStatuses ({
  tx,
  teamId: attachedTo,
  categories,
  defaultStatusId,
  defaultCategoryId = tracker.issueStatusCategory.Backlog
}: CreateTeamIssueStatusesArgs): Promise<void> {
  for (const statusCategory of categories) {
    const { _id: category, defaultStatusName } = statusCategory

    await tx.addCollection(
      tracker.class.IssueStatus,
      attachedTo,
      attachedTo,
      tracker.class.Team,
      'issueStatuses',
      { name: defaultStatusName, category },
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

async function createDefaults (tx: TxOperations): Promise<void> {
  await createDefaultTeam(tx)
}

export const trackerOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {},
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createDefaults(tx)
  }
}
