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
import type { Client } from '@anticrm/core'
import contact from '@anticrm/model-contact'
import recruit from '@anticrm/model-recruit'

export async function createDeps (client: Client): Promise<void> {
  const account = await client.findOne(contact.class.EmployeeAccount, { email: 'rosamund@hc.engineering' })

  if (account === undefined) {
    throw Error('Failed to find EmployeeAccount')
  }

  const tx = new TxOperations(client, account._id)

  // Create missing Employee
  await tx.createDoc(
    contact.class.Employee,
    contact.space.Employee,
    {
      name: 'Chen,Rosamund',
      city: 'Mountain View',
      channels: []
    },
    account.employee
  )

  await tx.createDoc(
    recruit.class.Candidate,
    recruit.space.CandidatesPublic,
    {
      name: 'P.,Andrey',
      title: 'Chief Architect',
      city: 'Monte Carlo',
      channels: [
        {
          provider: contact.channelProvider.Email,
          value: 'andrey@hc.engineering'
        }
      ]
    }
  )

  await tx.createDoc(
    recruit.class.Candidate,
    recruit.space.CandidatesPublic,
    {
      name: 'M.,Marina',
      title: 'Chief Designer',
      city: 'Los Angeles',
      channels: [
        {
          provider: contact.channelProvider.Email,
          value: 'marina@hc.engineering'
        }
      ]
    }
  )

  await tx.createDoc(
    recruit.class.Candidate,
    recruit.space.CandidatesPublic,
    {
      name: 'P.,Alex',
      title: 'Frontend Engineer',
      city: 'Krasnodar, Russia',
      channels: [
        {
          provider: contact.channelProvider.Email,
          value: 'alex@hc.engineering'
        }
      ]
    }
  )
}
