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

import type { Domain, Type } from '@anticrm/core'
import { DOMAIN_MODEL } from '@anticrm/core'
import { Builder, Model, Prop, TypeString, UX } from '@anticrm/model'
import type { IntlString, Asset } from '@anticrm/platform'

import core, { TDoc, TType } from '@anticrm/model-core'
import type { Contact, Person, Organization, Employee, Channel, ChannelProvider } from '@anticrm/contact'

import view from '@anticrm/model-view'
import { ids as contact } from './plugin'

export const DOMAIN_CONTACT = 'contact' as Domain

@Model(contact.class.ChannelProvider, core.class.Doc, DOMAIN_MODEL)
export class TChannelProvider extends TDoc implements ChannelProvider {
  label!: IntlString
  icon?: Asset
  placeholder!: string
}

@Model(contact.class.TypeChannels, core.class.Type)
export class TTypeChannels extends TType {}

/**
 * @public
 */
export function TypeChannels (): Type<Channel[]> {
  return { _class: contact.class.TypeChannels }
}

@Model(contact.class.Contact, core.class.Doc, DOMAIN_CONTACT)
export class TContact extends TDoc implements Contact {
  @Prop(TypeChannels(), 'Contact Info' as IntlString)
  channels!: Channel[]
}

@Model(contact.class.Person, contact.class.Contact)
@UX('Person' as IntlString)
export class TPerson extends TContact implements Person {
  @Prop(TypeString(), 'First name' as IntlString)
  firstName!: string

  @Prop(TypeString(), 'Last name' as IntlString)
  lastName!: string

  // @Prop(TypeString(), 'Email' as IntlString)
  // email!: string

  // @Prop(TypeString(), 'Phone' as IntlString)
  // phone!: string

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
  builder.createModel(TChannelProvider, TTypeChannels, TContact, TPerson, TOrganization, TEmployee)

  builder.mixin(contact.class.TypeChannels, core.class.Class, view.mixin.AttributePresenter, {
    presenter: contact.component.ChannelsPresenter
  })

  builder.createDoc(contact.class.ChannelProvider, core.space.Model, {
    label: 'Email' as IntlString,
    icon: contact.icon.Email,
    placeholder: 'john.appleseed@apple.com'
  }, contact.channelProvider.Email)

  builder.createDoc(contact.class.ChannelProvider, core.space.Model, {
    label: 'Phone' as IntlString,
    icon: contact.icon.Phone,
    placeholder: '+1 555 333 7777'
  })

  builder.createDoc(contact.class.ChannelProvider, core.space.Model, {
    label: 'LinkedIn' as IntlString,
    icon: contact.icon.LinkedIn,
    placeholder: 'https://linkedin.com/in/jappleseed'
  })

  builder.createDoc(contact.class.ChannelProvider, core.space.Model, {
    label: 'Twitter' as IntlString,
    icon: contact.icon.Twitter,
    placeholder: '@appleseed'
  })

  builder.createDoc(core.class.Space, core.space.Model, {
    name: 'Employees',
    description: 'Employees',
    private: false,
    members: []
  }, contact.space.Employee)

  builder.mixin(contact.class.Person, core.class.Class, view.mixin.AttributePresenter, {
    presenter: contact.component.PersonPresenter
  })
}

export { contact as default }
