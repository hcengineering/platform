//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import core, { Doc, Space, TxOperations } from '@anticrm/core'
import type { Client, Ref } from '@anticrm/core'
import task, { createKanban } from '@anticrm/task'
import type { KanbanTemplate } from '@anticrm/task'
import { createKanbanTemplate } from '@anticrm/model-task'

import board from './plugin'

export async function createDeps (client: Client): Promise<void> {
  const tx = new TxOperations(client, core.account.System)

  if ((await tx.findOne(task.class.Sequence, { _id: board.ids.Sequence })) === undefined) {
    await tx.createDoc(
      task.class.Sequence,
      task.space.Sequence,
      {
        attachedTo: board.class.Card,
        sequence: 0
      },
      board.ids.Sequence
    )
  }
  if ((await tx.findOne(task.class.KanbanTemplate, { _id: board.template.DefaultBoard })) === undefined) {
    const defaultTmpl = await createDefaultKanbanTemplate(tx)
    await createKanban(tx, board.space.DefaultBoard, defaultTmpl)
  }
}

const defaultKanban = {
  states: [
    { color: 9, title: 'To do' },
    { color: 9, title: 'Done' }
  ],
  doneStates: [
    { isWon: true, title: 'Won' },
    { isWon: false, title: 'Lost' }
  ]
}

async function createDefaultKanbanTemplate (client: TxOperations): Promise<Ref<KanbanTemplate>> {
  return await createKanbanTemplate(client, {
    kanbanId: board.template.DefaultBoard,
    space: board.space.BoardTemplates as Ref<Doc> as Ref<Space>,
    title: 'Default board',
    states: defaultKanban.states,
    doneStates: defaultKanban.doneStates
  })
}
