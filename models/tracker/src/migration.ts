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

import core, { Ref, TxOperations, generateId } from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient, createOrUpdate } from '@hcengineering/model'
import tags from '@hcengineering/tags'
import { IssueStatus, Project, TimeReportDayType, createStatuses } from '@hcengineering/tracker'
import tracker from './plugin'
import { DOMAIN_TRACKER } from '.'
import { DOMAIN_TASK } from '@hcengineering/model-task'

async function createDefaultProject (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(tracker.class.Project, {
    _id: tracker.project.DefaultProject
  })

  const currentDeleted = await tx.findOne(core.class.TxRemoveDoc, {
    objectId: tracker.project.DefaultProject
  })

  // Create new if not deleted by customers.
  if (current === undefined && currentDeleted === undefined) {
    const defaultStatusId: Ref<IssueStatus> = generateId()

    await tx.createDoc<Project>(
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
        defaultIssueStatus: defaultStatusId,
        defaultTimeReportDay: TimeReportDayType.PreviousWorkDay,
        defaultAssignee: undefined
      },
      tracker.project.DefaultProject
    )
    await createStatuses(
      tx,
      tracker.project.DefaultProject,
      tracker.class.IssueStatus,
      tracker.attribute.IssueStatus,
      defaultStatusId
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

async function fixProjectIcons (tx: TxOperations): Promise<void> {
  // @ts-expect-error
  const projectsWithWrongIcon = await tx.findAll(tracker.class.Project, { icon: 'tracker:component:IconWithEmojii' })
  const promises = []
  for (const project of projectsWithWrongIcon) {
    promises.push(tx.update(project, { icon: tracker.component.IconWithEmoji }))
  }
  await Promise.all(promises)
}

async function moveIssues (client: MigrationClient): Promise<void> {
  const docs = await client.find(DOMAIN_TRACKER, { _class: tracker.class.Issue })
  if (docs.length > 0) {
    await client.move(DOMAIN_TRACKER, { _class: tracker.class.Issue }, DOMAIN_TASK)
  }
}

export const trackerOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await moveIssues(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createDefaults(tx)
    await fixProjectIcons(tx)
  }
}
