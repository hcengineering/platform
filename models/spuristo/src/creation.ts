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

import core, { Client, TxOperations } from '@anticrm/core'
import { Team } from '@anticrm/spuristo'
import spuristo from './plugin'

export async function createDeps (client: Client): Promise<void> {
  const tx = new TxOperations(client, core.account.System)

  const current = await tx.findOne(spuristo.class.Team, {
    _id: spuristo.team.DefaultTeam
  })

  if (current === undefined) {
    await tx.createDoc<Team>(
      spuristo.class.Team,
      core.space.Space,
      {
        name: 'Default',
        description: 'Default team',
        private: false,
        members: [],
        archived: false,
        identifier: 'TSK',
        sequence: 0
      },
      spuristo.team.DefaultTeam
    )
  }
}
