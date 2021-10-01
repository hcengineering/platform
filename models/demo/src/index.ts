//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { Builder } from '@anticrm/model'
import core, { generateId } from '@anticrm/core'

import contact from '@anticrm/model-contact'
import recruit from '@anticrm/model-recruit'

export function createDemo (builder: Builder): void {
  const rosamund = generateId()

  builder.createDoc(contact.class.Employee, contact.space.Employee, {
    name: 'Chen,Rosamund',
    city: 'Mountain View',
    channels: []
  }, rosamund)

  builder.createDoc(contact.class.EmployeeAccount, core.space.Model, {
    email: 'rosamund@hc.engineering',
    employee: rosamund as any,
    name: 'Chen,Rosamund'
  })

  builder.createDoc(recruit.class.Candidate, recruit.space.CandidatesPublic, {
    name: 'P.,Andrey',
    title: 'Chief Architect',
    city: 'Monte Carlo',
    channels: [
      {
        provider: contact.channelProvider.Email,
        value: 'andrey@hc.engineering'
      }
    ],
    attachments: {}
  })

  builder.createDoc(recruit.class.Candidate, recruit.space.CandidatesPublic, {
    name: 'M.,Marina',
    title: 'Chief Designer',
    city: 'Los Angeles',
    channels: [
      {
        provider: contact.channelProvider.Email,
        value: 'marina@hc.engineering'
      }
    ],
    attachments: {}
  })

  builder.createDoc(recruit.class.Candidate, recruit.space.CandidatesPublic, {
    name: 'P.,Alex',
    title: 'Frontend Engineer',
    city: 'Krasnodar, Russia',
    channels: [
      {
        provider: contact.channelProvider.Email,
        value: 'alex@hc.engineering'
      }
    ],
    attachments: {}
  })
}
