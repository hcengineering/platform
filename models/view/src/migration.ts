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

import { TxOperations } from '@anticrm/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@anticrm/model'
import core from '@anticrm/model-core'
import view from './plugin'

export const viewOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {

  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    console.log('View: Performing model upgrades')

    const ops = new TxOperations(client, core.account.System)
    const kanbans = (await client.findAll(view.class.Kanban, {}))
      .filter((kanban) => kanban.doneStates == null)

    await Promise.all(
      kanbans
        .map(async (kanban) => {
          console.log(`Updating kanban: ${kanban._id}`)
          try {
            const doneStates = await Promise.all([
              ops.createDoc(core.class.WonState, kanban.space, {
                title: 'Won'
              }),
              ops.createDoc(core.class.LostState, kanban.space, {
                title: 'Lost'
              })
            ])

            await ops.updateDoc(kanban._class, kanban.space, kanban._id, {
              doneStates
            })
          } catch (e) {
            console.error(e)
          }
        }))
  }
}
