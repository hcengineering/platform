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

import { TxOperations } from '@hcengineering/core'
import { type Lead, leadId } from '@hcengineering/lead'
import {
  tryMigrate,
  tryUpgrade,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import core, { DOMAIN_SPACE } from '@hcengineering/model-core'
import task, { DOMAIN_TASK, createProjectType, createSequence, fixTaskTypes } from '@hcengineering/model-task'
import { PaletteColorIndexes } from '@hcengineering/ui/src/colors'
import lead from './plugin'

async function createSpace (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(core.class.Space, {
    _id: lead.space.DefaultFunnel
  })
  if (current === undefined) {
    await tx.createDoc(
      lead.class.Funnel,
      core.space.Space,
      {
        name: 'Funnel',
        description: 'Default funnel',
        private: false,
        archived: false,
        members: [],
        type: lead.template.DefaultFunnel
      },
      lead.space.DefaultFunnel
    )
  }
}

async function createSpaceType (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(task.class.ProjectType, {
    _id: lead.template.DefaultFunnel
  })

  if (current === undefined) {
    await createProjectType(
      tx,
      {
        name: 'Default funnel',
        descriptor: lead.descriptors.FunnelType,
        description: '',
        tasks: [],
        roles: 0,
        classic: false
      },
      [
        {
          _id: lead.taskType.Lead,
          name: 'Lead',
          descriptor: lead.descriptors.Lead,
          ofClass: lead.class.Lead,
          targetClass: lead.class.Lead,
          statusClass: core.class.Status,
          statusCategories: [
            task.statusCategory.UnStarted,
            task.statusCategory.Active,
            task.statusCategory.Won,
            task.statusCategory.Lost
          ],
          kind: 'task',
          factory: [
            {
              color: PaletteColorIndexes.Coin,
              name: 'Backlog',
              ofAttribute: lead.attribute.State,
              category: task.statusCategory.UnStarted
            },
            {
              color: PaletteColorIndexes.Coin,
              name: 'Incoming',
              ofAttribute: lead.attribute.State,
              category: task.statusCategory.Active
            },
            {
              color: PaletteColorIndexes.Arctic,
              name: 'Negotation',
              ofAttribute: lead.attribute.State,
              category: task.statusCategory.Active
            },
            {
              color: PaletteColorIndexes.Watermelon,
              name: 'Offer preparing',
              ofAttribute: lead.attribute.State,
              category: task.statusCategory.Active
            },
            {
              color: PaletteColorIndexes.Orange,
              name: 'Make a decision',
              ofAttribute: lead.attribute.State,
              category: task.statusCategory.Active
            },
            {
              color: PaletteColorIndexes.Ocean,
              name: 'Contract conclusion',
              ofAttribute: lead.attribute.State,
              category: task.statusCategory.Active
            },
            { name: 'Won', ofAttribute: lead.attribute.State, category: task.statusCategory.Won },
            { name: 'Lost', ofAttribute: lead.attribute.State, category: task.statusCategory.Lost }
          ]
        }
      ],
      lead.template.DefaultFunnel
    )
  }
}

async function createDefaults (tx: TxOperations): Promise<void> {
  await createSpace(tx)
  await createSequence(tx, lead.class.Lead)
}

async function migrateIdentifiers (client: MigrationClient): Promise<void> {
  const docs = await client.find<Lead>(DOMAIN_TASK, { _class: lead.class.Lead, identifier: { $exists: false } })
  for (const doc of docs) {
    await client.update(
      DOMAIN_TASK,
      { _id: doc._id },
      {
        identifier: `LEAD-${doc.number}`
      }
    )
  }
}

export const leadOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, leadId, [
      {
        state: 'fix-category-descriptors',
        func: async (client) => {
          await client.update(
            DOMAIN_SPACE,
            { _class: task.class.ProjectType, category: 'lead:category:FunnelTypeCategory' },
            {
              $set: { descriptor: lead.descriptors.FunnelType },
              $unset: { category: 1 }
            }
          )
        }
      },
      {
        state: 'fixTaskStatus',
        func: async (client): Promise<void> => {
          await fixTaskTypes(client, lead.descriptors.FunnelType, async () => [
            {
              name: 'Lead',
              descriptor: lead.descriptors.Lead,
              ofClass: lead.class.Lead,
              targetClass: lead.class.Lead,
              statusCategories: [
                task.statusCategory.UnStarted,
                task.statusCategory.Active,
                task.statusCategory.Won,
                task.statusCategory.Lost
              ],
              statusClass: core.class.Status,
              kind: 'task'
            }
          ])
        }
      },
      {
        state: 'identifier',
        func: migrateIdentifiers
      }
    ])
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const ops = new TxOperations(client, core.account.System)
    // Currently space type has to be recreated every time as it's in the model
    // created by the system user
    await createSpaceType(ops)

    await tryUpgrade(client, leadId, [
      {
        state: 'u-default-funnel',
        func: async () => {
          await createDefaults(ops)
        }
      }
    ])
  }
}
