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
import { leadId } from '@hcengineering/lead'
import {
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient,
  tryUpgrade
} from '@hcengineering/model'
import core from '@hcengineering/model-core'
import { createProjectType, createSequence } from '@hcengineering/model-task'
import tracker from '@hcengineering/model-tracker'
import task from '@hcengineering/task'
import { PaletteColorIndexes } from '@hcengineering/ui/src/colors'
import lead from './plugin'

async function createSpace (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(core.class.Space, {
    _id: lead.space.DefaultFunnel
  })
  if (current === undefined) {
    const type = await createProjectType(
      tx,
      {
        name: 'Default funnel',
        category: lead.category.FunnelTypeCategory,
        description: ''
      },
      [
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
      ],
      lead.template.DefaultFunnel
    )
    await tx.createDoc(
      lead.class.Funnel,
      core.space.Space,
      {
        name: 'Funnel',
        description: 'Default funnel',
        private: false,
        archived: false,
        members: [],
        type
      },
      lead.space.DefaultFunnel
    )
  }
}

async function createDefaults (tx: TxOperations): Promise<void> {
  await createSpace(tx)
  await createSequence(tx, lead.class.Lead)
}

export const leadOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {},
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const ops = new TxOperations(client, core.account.System)
    await createDefaults(ops)

    await tryUpgrade(client, leadId, [
      {
        state: 'related-targets',
        func: async (client): Promise<void> => {
          const ops = new TxOperations(client, core.account.ConfigUser)
          await ops.createDoc(tracker.class.RelatedIssueTarget, core.space.Configuration, {
            rule: {
              kind: 'classRule',
              ofClass: lead.class.Lead
            }
          })
        }
      }
    ])
  }
}
