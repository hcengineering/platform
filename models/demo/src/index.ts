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

import core from '@anticrm/core'
import contact from '@anticrm/model-contact'
import recruit from '@anticrm/model-recruit'

export function createDemo (builder: Builder): void {
  builder.createDoc(contact.class.Employee, contact.space.Employee, {
    firstName: 'Rosamund',
    lastName: 'Chen',
    email: 'rosamund@hc.engineering',
    phone: '+1 655 912 3424',
    city: 'Mountain View'
  })

  builder.createDoc(core.class.Account, core.space.Model, {
    email: 'rosamund@hc.engineering'
  })

  builder.createDoc(contact.class.Employee, contact.space.Employee, {
    firstName: 'Elon',
    lastName: 'Musk',
    email: 'elon@hc.engineering',
    phone: '+1 655 843 3453',
    city: 'Bel Air'
  })

  builder.createDoc(core.class.Account, core.space.Model, {
    email: 'elon@hc.engineering'
  })

  builder.createDoc(recruit.class.Candidate, recruit.space.CandidatesPublic, {
    firstName: 'Andrey',
    lastName: 'P.',
    email: 'andrey@hc.engineering',
    phone: '+1 646 667 6832',
    city: 'Monte Carlo'
  })

  builder.createDoc(recruit.class.Candidate, recruit.space.CandidatesPublic, {
    firstName: 'Marina',
    lastName: 'M.',
    email: 'marina@hc.engineering',
    phone: '+1 646 777 3333',
    city: 'Los Angeles'
  })
}
