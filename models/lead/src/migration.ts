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

import { Doc, Ref, Space, TxOperations } from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import { createKanbanTemplate, createSequence } from '@hcengineering/model-task'
import task, { KanbanTemplate, createKanban } from '@hcengineering/task'
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
        members: []
      },
      lead.space.DefaultFunnel
    )
  }
}

async function createDefaultKanbanTemplate (tx: TxOperations): Promise<Ref<KanbanTemplate>> {
  const defaultKanban = {
    states: [
      { color: 9, title: 'Incoming' },
      { color: 10, title: 'Negotation' },
      { color: 1, title: 'Offer preparing' },
      { color: 0, title: 'Make a decision' },
      { color: 11, title: 'Contract conclusion' },
      { color: 9, title: 'Done' }
    ],
    doneStates: [
      { isWon: true, title: 'Won' },
      { isWon: false, title: 'Lost' }
    ]
  }

  return await createKanbanTemplate(tx, {
    kanbanId: lead.template.DefaultFunnel,
    space: lead.space.FunnelTemplates as Ref<Doc> as Ref<Space>,
    title: 'Default funnel',
    states: defaultKanban.states,
    doneStates: defaultKanban.doneStates
  })
}

async function createDefaultKanban (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(task.class.Kanban, {
    attachedTo: lead.space.DefaultFunnel
  })
  if (current !== undefined) return
  const defaultTmpl = await createDefaultKanbanTemplate(tx)
  await createKanban(tx, lead.space.DefaultFunnel, defaultTmpl)
}

async function createDefaults (tx: TxOperations): Promise<void> {
  await createSpace(tx)
  await createSequence(tx, lead.class.Lead)
  await createDefaultKanban(tx)
}

export const leadOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {},
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const ops = new TxOperations(client, core.account.System)
    await createDefaults(ops)
  }
}
