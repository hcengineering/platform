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

import { Doc, TxOperations } from '@anticrm/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@anticrm/model'
import core from '@anticrm/model-core'
import view from '@anticrm/model-view'
import { createProjectKanban } from '@anticrm/task'
import task from './plugin'

export const taskOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {

  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    console.log('Task: Performing model upgrades')

    const ops = new TxOperations(client, core.account.System)
    if (await client.findOne(view.class.Sequence, { attachedTo: task.class.Task }) === undefined) {
      console.info('Create sequence for default task project.')
      // We need to create sequence
      await ops.createDoc(view.class.Sequence, view.space.Sequence, {
        attachedTo: task.class.Task,
        sequence: 0
      })
    } else {
      console.log('Task: => sequence is ok')
    }
    if (await client.findOne(view.class.Kanban, { attachedTo: task.space.TasksPublic }) === undefined) {
      console.info('Create kanban for default task project.')
      await createProjectKanban(task.space.TasksPublic, async (_class, space, data, id) => {
        const doc = await ops.findOne<Doc>(_class, { _id: id })
        if (doc === undefined) {
          await ops.createDoc(_class, space, data, id)
        } else {
          await ops.updateDoc(_class, space, id, data)
        }
      }).catch((err) => console.error(err))
    } else {
      console.log('Task: => public project Kanban is ok')
    }
  }
}
