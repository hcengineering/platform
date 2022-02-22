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

import serverCore from '@anticrm/server-core'
import core from '@anticrm/core'
import contact from '@anticrm/contact'
import view from '@anticrm/view'
import serverContact from '@anticrm/server-contact'

export function createModel (builder: Builder): void {
  builder.mixin(contact.class.Person, core.class.Class, view.mixin.HTMLPresenter, {
    presenter: serverContact.function.PersonHTMLPresenter
  })

  builder.mixin(contact.class.Person, core.class.Class, view.mixin.TextPresenter, {
    presenter: serverContact.function.PersonTextPresenter
  })

  builder.mixin(contact.class.Organization, core.class.Class, view.mixin.HTMLPresenter, {
    presenter: serverContact.function.OrganizationHTMLPresenter
  })

  builder.mixin(contact.class.Organization, core.class.Class, view.mixin.TextPresenter, {
    presenter: serverContact.function.OrganizationTextPresenter
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverContact.trigger.OnContactDelete
  })
}
