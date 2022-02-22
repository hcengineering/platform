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

import { IntlString, mergeIds, Resource } from '@anticrm/platform'
import type { Ref } from '@anticrm/core'
import { contactId } from '@anticrm/contact'
import contact from '@anticrm/contact-resources/src/plugin'
import type { AnyComponent } from '@anticrm/ui'
import {} from '@anticrm/core'
import { ObjectSearchCategory, ObjectSearchFactory } from '@anticrm/model-presentation'

export default mergeIds(contactId, contact, {
  component: {
    PersonPresenter: '' as AnyComponent,
    ContactPresenter: '' as AnyComponent,
    ChannelsPresenter: '' as AnyComponent,
    CreatePerson: '' as AnyComponent,
    EditPerson: '' as AnyComponent,
    EditOrganization: '' as AnyComponent,
    CreateOrganization: '' as AnyComponent,
    CreatePersons: '' as AnyComponent,
    CreateOrganizations: '' as AnyComponent,
    OrganizationPresenter: '' as AnyComponent,
    Contacts: '' as AnyComponent
  },
  string: {
    Persons: '' as IntlString,
    SearchEmployee: '' as IntlString,
    SearchPerson: '' as IntlString,
    SearchOrganization: '' as IntlString,
    ContactInfo: '' as IntlString,
    Contact: '' as IntlString,
    Location: '' as IntlString,
    Channel: '' as IntlString,
    ChannelProvider: '' as IntlString,
    Person: '' as IntlString,
    Organization: '' as IntlString,
    Employee: '' as IntlString,
    Value: '' as IntlString
  },
  completion: {
    PersonQuery: '' as Resource<ObjectSearchFactory>,
    EmployeeQuery: '' as Resource<ObjectSearchFactory>,
    OrganizationQuery: '' as Resource<ObjectSearchFactory>,
    EmployeeCategory: '' as Ref<ObjectSearchCategory>,
    PersonCategory: '' as Ref<ObjectSearchCategory>,
    OrganizationCategory: '' as Ref<ObjectSearchCategory>
  }
})
