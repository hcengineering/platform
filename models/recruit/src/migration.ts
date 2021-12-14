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

import recruit from './plugin'

export const recruitOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {

  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    console.log('Recruit: Performing model upgrades')

    const ops = new TxOperations(client, core.account.System)

    const outdatedApplications = (await client.findAll(recruit.class.Applicant, {}))
      .filter((x) => x.doneState === undefined)

    await Promise.all(
      outdatedApplications.map(async (application) => {
        console.info('Upgrade application:', application._id)

        try {
          await ops.updateDoc(application._class, application.space, application._id, { doneState: null })
        } catch (err: unknown) {
          console.error(err)
        }
      })
    )
  }
}
