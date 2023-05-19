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

import contact, { EmployeeAccount } from '@hcengineering/contact'
import core, { AccountRole, DOMAIN_TX, TxCreateDoc, TxOperations } from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import { DOMAIN_CONTACT } from '@hcengineering/model-contact'
import recruit from '@hcengineering/model-recruit'

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
  async migrate (client: MigrationClient): Promise<void> {
    const rosamunds = await client.find<TxCreateDoc<EmployeeAccount>>(DOMAIN_TX, {
      _class: core.class.TxCreateDoc,
      objectClass: contact.class.EmployeeAccount,
      'attributes.email': 'rosamund@hc.engineering'
    })
    const docs = await client.find(DOMAIN_CONTACT, {
      _id: { $in: rosamunds.map((p) => p.attributes.employee) }
    })
    const currentEmployees = new Set(docs.map((p) => p._id))
    for (const rosamund of rosamunds) {
      if (!currentEmployees.has(rosamund.attributes.employee)) await client.delete(DOMAIN_TX, rosamund._id)
    }
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const ops = new TxOperations(client, core.account.System)
    const tx = await ops.findOne(core.class.TxCreateDoc, {
      objectClass: contact.class.EmployeeAccount,
      'attributes.email': 'rosamund@hc.engineering'
    })
    const current = await ops.findOne(contact.class.EmployeeAccount, {
      email: 'rosamund@hc.engineering'
    })
    if (tx === undefined && current === undefined) {
      const employee = await ops.createDoc(contact.class.Employee, contact.space.Employee, {
        name: 'Chen,Rosamund',
        city: 'Mountain View',
        active: true
      })

      await ops.createDoc<EmployeeAccount>(contact.class.EmployeeAccount, core.space.Model, {
        email: 'rosamund@hc.engineering',
        employee,
        name: 'Chen,Rosamund',
        role: AccountRole.User
      })
    }

    await createCandidate(ops, 'P.,Andrey', 'Monte Carlo', 'andrey@hc.engineering', 'Chief Architect')
    await createCandidate(ops, 'M.,Marina', 'Los Angeles', 'marina@hc.engineering', 'Chief Designer')
    await createCandidate(ops, 'P.,Alex', 'Krasnodar, Russia', 'alex@hc.engineering', 'Frontend Engineer')
  }
}
