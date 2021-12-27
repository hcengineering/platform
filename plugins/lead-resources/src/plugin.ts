//
// Copyright © 2020 Anticrm Platform Contributors.
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

import { IntlString, mergeIds } from '@anticrm/platform'

import lead, { leadId } from '@anticrm/lead'
import { AnyComponent } from '@anticrm/ui'

export default mergeIds(leadId, lead, {
  string: {
    FunnelName: '' as IntlString,
    MakePrivate: '' as IntlString,
    MakePrivateDescription: '' as IntlString,
    CreateFunnel: '' as IntlString,
    LeadName: '' as IntlString,
    More: '' as IntlString,
    SelectFunnel: '' as IntlString,
    CreateLead: '' as IntlString,
    Customer: '' as IntlString,
    Customers: '' as IntlString,
    Leads: '' as IntlString,
    NoLeadsForDocument: '' as IntlString
  },
  component: {
    CreateCustomer: '' as AnyComponent,
    LeadsPresenter: '' as AnyComponent
  }
})
