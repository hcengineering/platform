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

import { MigrateOperation, MigrationClient, MigrationResult, MigrationUpgradeClient } from '@anticrm/model'
import contact, { DOMAIN_CONTACT } from '@anticrm/model-contact'
import { DOMAIN_TASK } from '@anticrm/model-task'
import recruit from './plugin'

function logInfo (msg: string, result: MigrationResult): void {
  if (result.updated > 0) {
    console.log(`Recruit: Migrate ${msg} ${result.updated}`)
  }
}
export const recruitOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    logInfo('done for Applicants', await client.update(DOMAIN_TASK, { _class: recruit.class.Applicant, doneState: { $exists: false } }, { doneState: null }))

    logInfo('$move employee => assignee', await client.update(
      DOMAIN_TASK,
      { _class: recruit.class.Applicant, employee: { $exists: true } },
      { $rename: { employee: 'assignee' } }
    ))

    const employees = (await client.find(DOMAIN_CONTACT, { _class: contact.class.Employee })).map(emp => emp._id)

    // update assignee to unassigned if there is no employee exists.
    logInfo('applicants wrong assignee', await client.update(
      DOMAIN_TASK,
      { _class: recruit.class.Applicant, assignee: { $not: { $in: employees } } },
      { assignee: null }
    ))
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    console.log('Recruit: Performing model upgrades')
  }
}
