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

import { Ref, TxOperations } from '@hcengineering/core'
import { createOrUpdate, MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import { createKanbanTemplate, createSequence } from '@hcengineering/model-task'
import tags from '@hcengineering/tags'
import task, { createKanban, KanbanTemplate } from '@hcengineering/task'
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
        members: []
      },
      board.space.DefaultBoard
    )
  }
  const currentTemplate = await tx.findOne(core.class.Space, {
    _id: board.space.BoardTemplates
  })
  if (currentTemplate === undefined) {
    await tx.createDoc(
      task.class.KanbanTemplateSpace,
      core.space.Space,
      {
        name: board.string.Boards,
        description: board.string.ManageBoardStatuses,
        icon: board.component.TemplatesIcon,
        private: false,
        archived: false,
        members: [],
        attachedToClass: board.class.Board
      },
      board.space.BoardTemplates
    )
  }
}

async function createDefaultKanbanTemplate (tx: TxOperations): Promise<Ref<KanbanTemplate>> {
  const defaultKanban = {
    states: [
      { color: 9, name: 'To do' },
      { color: 9, name: 'Done' }
    ],
    doneStates: [
      { isWon: true, name: 'Won' },
      { isWon: false, name: 'Lost' }
    ]
  }

  return await createKanbanTemplate(tx, {
    kanbanId: board.template.DefaultBoard,
    space: board.space.BoardTemplates,
    title: 'Default board',
    states: defaultKanban.states,
    doneStates: defaultKanban.doneStates
  })
}

async function createDefaultKanban (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(task.class.Kanban, {
    attachedTo: board.space.DefaultBoard
  })
  if (current !== undefined) return
  const defaultTmpl = await createDefaultKanbanTemplate(tx)
  await createKanban(tx, board.space.DefaultBoard, defaultTmpl)
}

async function createDefaults (tx: TxOperations): Promise<void> {
  await createSpace(tx)
  await createSequence(tx, board.class.Card)
  await createDefaultKanban(tx)
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

async function fixTemplateSpace (tx: TxOperations): Promise<void> {
  const templateSpace = await tx.findOne(task.class.KanbanTemplateSpace, { _id: board.space.BoardTemplates })
  if (templateSpace !== undefined && templateSpace?.attachedToClass === undefined) {
    await tx.update(templateSpace, { attachedToClass: board.class.Board })
  }
}

async function migrateLabels (client: MigrationClient): Promise<void> {}
export const boardOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await Promise.all([migrateLabels(client)])
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const ops = new TxOperations(client, core.account.System)
    await createDefaults(ops)
    await fixTemplateSpace(ops)
  }
}
