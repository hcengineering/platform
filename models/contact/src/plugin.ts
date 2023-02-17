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

import { contactId } from '@hcengineering/contact'
import contact from '@hcengineering/contact-resources/src/plugin'
import type { Ref } from '@hcengineering/core'
import {} from '@hcengineering/core'
import { ObjectSearchCategory, ObjectSearchFactory } from '@hcengineering/model-presentation'
import { IntlString, mergeIds, Resource } from '@hcengineering/platform'
import type { AnyComponent } from '@hcengineering/ui'
import { Action, ActionCategory, ViewAction } from '@hcengineering/view'

export default mergeIds(contactId, contact, {
  component: {
    PersonPresenter: '' as AnyComponent,
    ContactRefPresenter: '' as AnyComponent,
    ContactPresenter: '' as AnyComponent,
    EditPerson: '' as AnyComponent,
    EditOrganization: '' as AnyComponent,
    CreatePersons: '' as AnyComponent,
    CreateOrganizations: '' as AnyComponent,
    OrganizationPresenter: '' as AnyComponent,
    Contacts: '' as AnyComponent,
    ContactsTabs: '' as AnyComponent,
    EmployeeAccountPresenter: '' as AnyComponent,
    OrganizationEditor: '' as AnyComponent,
    EmployeePresenter: '' as AnyComponent,
    EmployeeRefPresenter: '' as AnyComponent,
    PersonRefPresenter: '' as AnyComponent,
    PersonEditor: '' as AnyComponent,
    Members: '' as AnyComponent,
    MemberPresenter: '' as AnyComponent,
    EditMember: '' as AnyComponent,
    EmployeeArrayEditor: '' as AnyComponent,
    EmployeeEditor: '' as AnyComponent,
    CreateEmployee: '' as AnyComponent,
    AccountArrayEditor: '' as AnyComponent
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
    Value: '' as IntlString,
    Phone: '' as IntlString,
    PhonePlaceholder: '' as IntlString,
    LinkedIn: '' as IntlString,
    LinkedInPlaceholder: '' as IntlString,
    AtPlaceHolder: '' as IntlString,
    FacebookPlaceholder: '' as IntlString,
    HomepagePlaceholder: '' as IntlString,
    Twitter: '' as IntlString,
    GitHub: '' as IntlString,
    Facebook: '' as IntlString,
    TypeLabel: '' as IntlString,
    Homepage: '' as IntlString,
    Birthday: '' as IntlString,
    CreatedOn: '' as IntlString,
    Whatsapp: '' as IntlString,
    WhatsappPlaceholder: '' as IntlString
  },
  completion: {
    PersonQuery: '' as Resource<ObjectSearchFactory>,
    EmployeeQuery: '' as Resource<ObjectSearchFactory>,
    OrganizationQuery: '' as Resource<ObjectSearchFactory>,
    EmployeeCategory: '' as Ref<ObjectSearchCategory>,
    PersonCategory: '' as Ref<ObjectSearchCategory>,
    OrganizationCategory: '' as Ref<ObjectSearchCategory>
  },
  category: {
    Contact: '' as Ref<ActionCategory>
  },
  action: {
    KickEmployee: '' as Ref<Action>
  },
  actionImpl: {
    KickEmployee: '' as ViewAction,
    OpenChannel: '' as ViewAction
  }
})
