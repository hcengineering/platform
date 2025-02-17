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

import lead, { leadId } from '@hcengineering/lead'
import { type IntlString, mergeIds, type Resource } from '@hcengineering/platform'
import { type Client, type Doc, type Ref } from '@hcengineering/core'
import { type AnyComponent } from '@hcengineering/ui/src/types'

export default mergeIds(leadId, lead, {
  string: {
    FunnelName: '' as IntlString,
    CreateFunnel: '' as IntlString,
    LeadName: '' as IntlString,
    More: '' as IntlString,
    SelectFunnel: '' as IntlString,
    CreateLead: '' as IntlString,
    LeadCreateLabel: '' as IntlString,
    Customer: '' as IntlString,
    SelectCustomer: '' as IntlString,
    Customers: '' as IntlString,
    Leads: '' as IntlString,
    MyLeads: '' as IntlString,
    NoLeadsForDocument: '' as IntlString,
    LeadPlaceholder: '' as IntlString,
    CreateCustomer: '' as IntlString,
    IssueDescriptionPlaceholder: '' as IntlString,
    CreateCustomerLabel: '' as IntlString,
    Description: '' as IntlString,
    FullDescription: '' as IntlString,
    FunnelPlaceholder: '' as IntlString,
    Members: '' as IntlString,
    Assignee: '' as IntlString,
    UnAssign: '' as IntlString,
    FunnelMembers: '' as IntlString,
    RoleLabel: '' as IntlString,
    EditFunnel: '' as IntlString
  },
  component: {
    CreateCustomer: '' as AnyComponent,
    LeadsPresenter: '' as AnyComponent,
    CreateFunnel: '' as AnyComponent,
    EditFunnel: '' as AnyComponent,
    MyLeads: '' as AnyComponent,
    TitlePresenter: '' as AnyComponent
  },
  function: {
    LeadTitleProvider: '' as Resource<(client: Client, ref: Ref<Doc>, doc?: Doc) => Promise<string>>,
    LeadIdProvider: '' as Resource<(client: Client, ref: Ref<Doc>, doc?: Doc) => Promise<string>>
  }
})
