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
import contact, { contactId } from '@anticrm/contact'
import type { AnyComponent } from '@anticrm/ui'
import {} from '@anticrm/core'
import { Application } from '@anticrm/workbench'
import { ObjectSearchCategory, ObjectSearchFactory } from '@anticrm/model-presentation'

export const ids = mergeIds(contactId, contact, {
  app: {
    Contacts: '' as Ref<Application>
  },
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
    Organizations: '' as IntlString,
    OrganizationsFolder: '' as IntlString,
    PersonsFolder: '' as IntlString,
    Persons: '' as IntlString,
    Contacts: '' as IntlString,
    CreatePersons: '' as IntlString,
    CreateOrganizations: '' as IntlString,
    SearchEmployee: '' as IntlString,
    SearchPerson: '' as IntlString,
    SearchOrganization: '' as IntlString,
    ContactInfo: '' as IntlString
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
