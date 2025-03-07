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

import { type Builder } from '@hcengineering/model'

import contact from '@hcengineering/contact'
import core from '@hcengineering/core'
import serverContact from '@hcengineering/server-contact'
import serverCore from '@hcengineering/server-core'
import serverNotification from '@hcengineering/server-notification'
import serverTemplates from '@hcengineering/server-templates'
import templates from '@hcengineering/templates'
export { serverContactId } from '@hcengineering/server-contact'

export function createModel (builder: Builder): void {
  builder.mixin(contact.class.Person, core.class.Class, serverNotification.mixin.HTMLPresenter, {
    presenter: serverContact.function.PersonHTMLPresenter
  })

  builder.mixin(contact.class.Person, core.class.Class, serverNotification.mixin.TextPresenter, {
    presenter: serverContact.function.PersonTextPresenter
  })

  builder.mixin(contact.class.Organization, core.class.Class, serverNotification.mixin.HTMLPresenter, {
    presenter: serverContact.function.OrganizationHTMLPresenter
  })

  builder.mixin(contact.class.Organization, core.class.Class, serverNotification.mixin.TextPresenter, {
    presenter: serverContact.function.OrganizationTextPresenter
  })

  builder.mixin(contact.class.Contact, core.class.Class, serverCore.mixin.SearchPresenter, {
    iconConfig: {
      component: contact.component.AvatarRef,
      fields: [['_id']]
    },
    title: {
      component: contact.component.ContactNamePresenter, // Will present on UI.
      fields: [['name']],
      template: [['func', serverContact.function.ContactNameProvider, 'true']],
      extraFields: [[['func', serverContact.function.ContactNameProvider, 'false']]]
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverContact.trigger.OnContactDelete,
    txMatch: {
      objectClass: contact.class.Contact,
      _class: core.class.TxRemoveDoc
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverContact.trigger.OnChannelUpdate,
    txMatch: {
      objectClass: contact.class.Channel,
      _class: core.class.TxUpdateDoc
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverContact.trigger.OnEmployeeCreate,
    txMatch: {
      objectClass: contact.class.Person,
      _class: core.class.TxMixin,
      mixin: contact.mixin.Employee,
      'attributes.active': true
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverContact.trigger.OnSpaceTypeMembers,
    txMatch: {
      objectClass: core.class.SpaceType,
      _class: core.class.TxUpdateDoc
    }
  })

  builder.mixin(
    contact.templateField.CurrentEmployeeName,
    templates.class.TemplateField,
    serverTemplates.mixin.ServerTemplateField,
    {
      serverFunc: serverContact.function.GetCurrentEmployeeName
    }
  )

  builder.mixin(
    contact.templateField.CurrentEmployeeEmail,
    templates.class.TemplateField,
    serverTemplates.mixin.ServerTemplateField,
    {
      serverFunc: serverContact.function.GetCurrentEmployeeEmail
    }
  )

  builder.mixin(
    contact.templateField.ContactName,
    templates.class.TemplateField,
    serverTemplates.mixin.ServerTemplateField,
    {
      serverFunc: serverContact.function.GetContactName
    }
  )

  builder.mixin(
    contact.templateField.CurrentEmployeePosition,
    templates.class.TemplateField,
    serverTemplates.mixin.ServerTemplateField,
    {
      serverFunc: serverContact.function.GetCurrentEmployeePosition
    }
  )

  builder.mixin(
    contact.templateField.ContactFirstName,
    templates.class.TemplateField,
    serverTemplates.mixin.ServerTemplateField,
    {
      serverFunc: serverContact.function.GetContactFirstName
    }
  )

  builder.mixin(
    contact.templateField.ContactLastName,
    templates.class.TemplateField,
    serverTemplates.mixin.ServerTemplateField,
    {
      serverFunc: serverContact.function.GetContactLastName
    }
  )
}
