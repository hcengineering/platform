//
// Copyright © 2022 Hardcore Engineering Inc.
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

import core from '@hcengineering/core'
import recruit from '@hcengineering/model-recruit'
import notification from '@hcengineering/notification'
import serverCore from '@hcengineering/server-core'
import serverNotification from '@hcengineering/server-notification'
import serverRecruit from '@hcengineering/server-recruit'
import serverContact from '@hcengineering/server-contact'
import contact from '@hcengineering/contact'

export { serverRecruitId } from '@hcengineering/server-recruit'

export function createModel (builder: Builder): void {
  builder.mixin(recruit.class.Applicant, core.class.Class, serverNotification.mixin.HTMLPresenter, {
    presenter: serverRecruit.function.ApplicationHTMLPresenter
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, serverNotification.mixin.TextPresenter, {
    presenter: serverRecruit.function.ApplicationTextPresenter
  })

  builder.mixin(recruit.class.Vacancy, core.class.Class, serverNotification.mixin.HTMLPresenter, {
    presenter: serverRecruit.function.VacancyHTMLPresenter
  })

  builder.mixin(recruit.class.Vacancy, core.class.Class, serverNotification.mixin.TextPresenter, {
    presenter: serverRecruit.function.VacancyTextPresenter
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverRecruit.trigger.OnRecruitUpdate
  })

  builder.mixin(recruit.class.Vacancy, core.class.Class, serverCore.mixin.SearchPresenter, {
    searchConfig: {
      icon: recruit.icon.Vacancy,
      title: 'name'
    }
  })

  builder.mixin(recruit.class.Applicant, core.class.Class, serverCore.mixin.SearchPresenter, {
    searchConfig: {
      iconConfig: {
        component: contact.component.Avatar,
        props: [{ avatar: ['attachedTo', 'avatar'] }, { name: ['attachedTo', 'name'] }]
      },
      shortTitle: 'identifier',
      title: {
        tmpl: '{name} - {vacName}',
        props: [{ _class: ['attachedTo', '_class'] }, { name: ['attachedTo', 'name'] }, { vacName: ['space', 'name'] }]
      }
    },
    getSearchTitle: {
      name: serverContact.function.ContactNameProvider
    }
  })

  builder.mixin(
    recruit.ids.AssigneeNotification,
    notification.class.NotificationType,
    serverNotification.mixin.TypeMatch,
    {
      func: serverNotification.function.IsUserEmployeeInFieldValue
    }
  )
}
