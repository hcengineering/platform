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

import core, { TxOperations } from '@anticrm/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@anticrm/model'
import contact, { EmployeeAccount } from '@anticrm/contact'
import recruit from '@anticrm/model-recruit'

async function createCandidate (
  tx: TxOperations,
  name: string,
  city: string,
  email: string,
  title: string
): Promise<void> {
  const current = await tx.findOne(core.class.TxCreateDoc, {
    objectClass: contact.class.Person,
    'attributes.name': name
  })
  if (current !== undefined) return
  const u1 = await tx.createDoc(contact.class.Person, recruit.space.CandidatesPublic, {
    name,
    city
  })
  await tx.addCollection(contact.class.Channel, recruit.space.CandidatesPublic, u1, contact.class.Person, 'channels', {
    provider: contact.channelProvider.Email,
    value: email
  })

  await tx.createMixin(u1, contact.class.Person, recruit.space.CandidatesPublic, recruit.mixin.Candidate, {
    title
  })
}

export const demoOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {},
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    const current = await tx.findOne(contact.class.EmployeeAccount, {
      email: 'rosamund@hc.engineering'
    })
    if (current === undefined) {
      const employee = await tx.createDoc(contact.class.Employee, contact.space.Employee, {
        name: 'Chen,Rosamund',
        city: 'Mountain View',
        active: true
      })

      await tx.createDoc<EmployeeAccount>(contact.class.EmployeeAccount, core.space.Model, {
        email: 'rosamund@hc.engineering',
        employee,
        name: 'Chen,Rosamund'
      })
    }

    await createCandidate(tx, 'P.,Andrey', 'Monte Carlo', 'andrey@hc.engineering', 'Chief Architect')
    await createCandidate(tx, 'M.,Marina', 'Los Angeles', 'marina@hc.engineering', 'Chief Designer')
    await createCandidate(tx, 'P.,Alex', 'Krasnodar, Russia', 'alex@hc.engineering', 'Frontend Engineer')
  }
}
