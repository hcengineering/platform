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

import core, { DOMAIN_STATUS, DOMAIN_TX, Status, TxCUD, TxOperations, TxProcessor } from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient, createOrUpdate } from '@hcengineering/model'
import { DOMAIN_TASK } from '@hcengineering/model-task'
import tags from '@hcengineering/tags'
import { Project, TimeReportDayType, createStatuses } from '@hcengineering/tracker'
import { DOMAIN_TRACKER } from '.'
import tracker from './plugin'
import { DOMAIN_SPACE } from '@hcengineering/model-core'

async function createDefaultProject (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(tracker.class.Project, {
    _id: tracker.project.DefaultProject
  })

  const currentDeleted = await tx.findOne(core.class.TxRemoveDoc, {
    objectId: tracker.project.DefaultProject
  })

  // Create new if not deleted by customers.
  if (current === undefined && currentDeleted === undefined) {
    const states = await createStatuses(tx, tracker.class.IssueStatus, tracker.attribute.IssueStatus)

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
        defaultIssueStatus: states[0],
        defaultTimeReportDay: TimeReportDayType.PreviousWorkDay,
        defaultAssignee: undefined,
        states
      },
      tracker.project.DefaultProject
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

async function fixProjectDefaultStatuses (client: MigrationClient): Promise<void> {
  const projects = await client.find<Project>(DOMAIN_SPACE, { _class: tracker.class.Project })
  for (const project of projects) {
    const state = await client.find(DOMAIN_STATUS, { _id: project.defaultIssueStatus })
    if (state.length === 0) {
      const oldStateTxes = await client.find<TxCUD<Status>>(DOMAIN_TX, { objectId: project.defaultIssueStatus })
      const oldState = TxProcessor.buildDoc2Doc<Status>(oldStateTxes)
      if (oldState !== undefined) {
        const newState = await client.find<Status>(DOMAIN_STATUS, {
          name: oldState.name.trim(),
          ofAttribute: tracker.attribute.IssueStatus
        })
        if (newState.length > 0) {
          await client.update(DOMAIN_SPACE, { _id: project._id }, { defaultIssueStatus: newState[0]._id })
        }
      } else {
        await client.update(DOMAIN_SPACE, { _id: project._id }, { defaultIssueStatus: project.states[0] })
      }
    }
  }
}

export const trackerOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await moveIssues(client)
    await fixProjectDefaultStatuses(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createDefaults(tx)
    await fixProjectIcons(tx)
  }
}
