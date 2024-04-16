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

import { type Card, boardId } from '@hcengineering/board'
import { TxOperations } from '@hcengineering/core'
import {
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient,
  createOrUpdate,
  tryMigrate,
  tryUpgrade
} from '@hcengineering/model'
import core, { DOMAIN_SPACE } from '@hcengineering/model-core'
import { DOMAIN_TASK, createProjectType, createSequence, fixTaskTypes } from '@hcengineering/model-task'
import tags from '@hcengineering/tags'
import task from '@hcengineering/task'
import { PaletteColorIndexes } from '@hcengineering/ui/src/colors'
import board from './plugin'

async function createSpace (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(core.class.Space, {
    _id: board.space.DefaultBoard
  })

  if (current === undefined) {
    await tx.createDoc(
      board.class.Board,
      core.space.Space,
      {
        name: 'Default',
        description: 'Default board',
        private: false,
        archived: false,
        members: [],
        type: board.template.DefaultBoard
      },
      board.space.DefaultBoard
    )
  }
}

async function createDefaultProjectType (tx: TxOperations): Promise<void> {
  const existing = await tx.findOne(task.class.ProjectType, { _id: board.template.DefaultBoard })
  const existingDeleted = await tx.findOne(core.class.TxRemoveDoc, {
    objectId: board.template.DefaultBoard
  })

  if (existing !== undefined || existingDeleted !== undefined) {
    return
  }

  await createProjectType(
    tx,
    {
      name: 'Default board',
      descriptor: board.descriptors.BoardType,
      description: '',
      tasks: [],
      roles: 0,
      classic: false
    },
    [
      {
        _id: board.taskType.Card,
        descriptor: board.descriptors.Card,
        name: 'Card',
        ofClass: board.class.Card,
        targetClass: board.class.Card,
        statusClass: core.class.Status,
        kind: 'task',
        factory: [
          {
            color: PaletteColorIndexes.Coin,
            name: 'Unstarted',
            category: task.statusCategory.UnStarted,
            ofAttribute: board.attribute.State
          },
          {
            color: PaletteColorIndexes.Blueberry,
            name: 'To do',
            category: task.statusCategory.Active,
            ofAttribute: board.attribute.State
          },
          {
            color: PaletteColorIndexes.Arctic,
            name: 'Done',
            category: task.statusCategory.Active,
            ofAttribute: board.attribute.State
          },
          {
            color: PaletteColorIndexes.Grass,
            name: 'Completed',
            category: board.statusCategory.Completed,
            ofAttribute: board.attribute.State
          }
        ],
        statusCategories: [
          task.statusCategory.UnStarted,
          task.statusCategory.Active,
          task.statusCategory.Won,
          task.statusCategory.Lost
        ]
      }
    ],
    board.template.DefaultBoard
  )
}

async function createDefaults (tx: TxOperations): Promise<void> {
  await createSpace(tx)
  await createSequence(tx, board.class.Card)
  await createOrUpdate(
    tx,
    tags.class.TagCategory,
    tags.space.Tags,
    {
      icon: tags.icon.Tags,
      label: 'Other',
      targetClass: board.class.Card,
      tags: [],
      default: true
    },
    board.category.Other
  )
}

async function migrateIdentifiers (client: MigrationClient): Promise<void> {
  const docs = await client.find<Card>(DOMAIN_TASK, { _class: board.class.Card, identifier: { $exists: false } })
  for (const doc of docs) {
    await client.update(
      DOMAIN_TASK,
      { _id: doc._id },
      {
        identifier: `CARD-${doc.number}`
      }
    )
  }
}

export const boardOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, boardId, [
      {
        state: 'fix-category-descriptors',
        func: async (client) => {
          await client.update(
            DOMAIN_SPACE,
            { _class: task.class.ProjectType, category: 'board:category:BoardType' },
            {
              $set: { descriptor: board.descriptors.BoardType },
              $unset: { category: 1 }
            }
          )
        }
      },
      {
        state: 'fixTaskStatus',
        func: async (client): Promise<void> => {
          await fixTaskTypes(client, board.descriptors.BoardType, async () => [
            {
              name: 'Card',
              descriptor: board.descriptors.Card,
              ofClass: board.class.Card,
              targetClass: board.class.Card,
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
    // For now need to be created every time as it's system model
    await createDefaultProjectType(ops)

    await tryUpgrade(client, boardId, [
      {
        state: 'board0001',
        func: async () => {
          await createDefaults(ops)
        }
      }
    ])
  }
}
