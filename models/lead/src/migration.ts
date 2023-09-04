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
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import { createKanbanTemplate, createSequence } from '@hcengineering/model-task'
import task, { KanbanTemplate, createStates } from '@hcengineering/task'
import { PaletteColorIndexes } from '@hcengineering/ui/src/colors'
import lead from './plugin'

async function createSpace (tx: TxOperations): Promise<void> {
  const currentTemplate = await tx.findOne(core.class.Space, {
    _id: lead.space.FunnelTemplates
  })
  if (currentTemplate === undefined) {
    await tx.createDoc(
      task.class.KanbanTemplateSpace,
      core.space.Space,
      {
        name: lead.string.Funnels,
        description: lead.string.ManageFunnelStatuses,
        icon: lead.component.TemplatesIcon,
        private: false,
        members: [],
        archived: false,
        attachedToClass: lead.class.Funnel
      },
      lead.space.FunnelTemplates
    )
  }

  const current = await tx.findOne(core.class.Space, {
    _id: lead.space.DefaultFunnel
  })
  if (current === undefined) {
    const defaultTmpl = await createDefaultKanbanTemplate(tx)
    const [states, doneStates] = await createStates(tx, defaultTmpl)
    await tx.createDoc(
      lead.class.Funnel,
      core.space.Space,
      {
        name: 'Funnel',
        description: 'Default funnel',
        private: false,
        archived: false,
        members: [],
        states,
        doneStates
      },
      lead.space.DefaultFunnel
    )
  }
}

async function createDefaultKanbanTemplate (tx: TxOperations): Promise<Ref<KanbanTemplate>> {
  const defaultKanban = {
    states: [
      { color: PaletteColorIndexes.Coin, name: 'Incoming' },
      { color: PaletteColorIndexes.Arctic, name: 'Negotation' },
      { color: PaletteColorIndexes.Watermelon, name: 'Offer preparing' },
      { color: PaletteColorIndexes.Orange, name: 'Make a decision' },
      { color: PaletteColorIndexes.Ocean, name: 'Contract conclusion' },
      { color: PaletteColorIndexes.Grass, name: 'Done' }
    ],
    doneStates: [
      { isWon: true, name: 'Won' },
      { isWon: false, name: 'Lost' }
    ]
  }

  return await createKanbanTemplate(tx, {
    kanbanId: lead.template.DefaultFunnel,
    space: lead.space.FunnelTemplates,
    title: 'Default funnel',
    states: defaultKanban.states,
    doneStates: defaultKanban.doneStates
  })
}

async function fixTemplateSpace (tx: TxOperations): Promise<void> {
  const templateSpace = await tx.findOne(task.class.KanbanTemplateSpace, { _id: lead.space.FunnelTemplates })
  if (templateSpace !== undefined && templateSpace?.attachedToClass === undefined) {
    await tx.update(templateSpace, { attachedToClass: lead.class.Funnel })
  }
}

async function createDefaults (tx: TxOperations): Promise<void> {
  await createSpace(tx)
  await createSequence(tx, lead.class.Lead)
  await fixTemplateSpace(tx)
}

export const leadOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {},
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const ops = new TxOperations(client, core.account.System)
    await createDefaults(ops)
  }
}
