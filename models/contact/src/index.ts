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

import { Builder, Model, Prop, TypeString, UX } from '@anticrm/model'
import type { IntlString } from '@anticrm/platform'

import core, { TDoc } from '@anticrm/model-core'
import type { Contact, Person, Organization, Employee } from '@anticrm/contact'

import view from '@anticrm/model-view'
import { ids as contact } from './plugin'

@Model(contact.class.Contact, core.class.Doc)
export class TContact extends TDoc implements Contact {
}

@Model(contact.class.Person, contact.class.Contact)
@UX('Person' as IntlString)
export class TPerson extends TContact implements Person {
  @Prop(TypeString(), 'First name' as IntlString)
  firstName!: string

  @Prop(TypeString(), 'Last name' as IntlString)
  lastName!: string

  @Prop(TypeString(), 'Email' as IntlString)
  email!: string

  @Prop(TypeString(), 'Phone' as IntlString)
  phone!: string

  @Prop(TypeString(), 'City' as IntlString)
  city!: string
}

@Model(contact.class.Organization, contact.class.Contact)
export class TOrganization extends TContact implements Organization {
  name!: string
}

@Model(contact.class.Employee, contact.class.Person)
export class TEmployee extends TPerson implements Employee {
}

export function createModel (builder: Builder): void {
  builder.createModel(TContact, TPerson, TOrganization, TEmployee)

  builder.mixin(contact.class.Person, core.class.Class, view.mixin.AttributePresenter, {
    presenter: contact.component.PersonPresenter
  })
}

export { contact as default }
