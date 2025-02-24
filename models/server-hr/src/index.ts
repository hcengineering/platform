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

import contact from '@hcengineering/contact'
import core from '@hcengineering/core'
import hr from '@hcengineering/hr'
import serverCore from '@hcengineering/server-core'
import serverHr from '@hcengineering/server-hr'
import serverNotification from '@hcengineering/server-notification'

export { serverHrId } from '@hcengineering/server-hr'

export function createModel (builder: Builder): void {
  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverHr.trigger.OnDepartmentStaff,
    txMatch: {
      _class: core.class.TxMixin,
      mixin: hr.mixin.Staff
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverHr.trigger.OnDepartmentRemove,
    txMatch: {
      objectClass: hr.class.Department,
      _class: core.class.TxRemoveDoc
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverHr.trigger.OnRequestCreate,
    txMatch: {
      _class: core.class.TxCreateDoc,
      objectClass: hr.class.Request
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverHr.trigger.OnRequestUpdate,
    txMatch: {
      _class: core.class.TxUpdateDoc,
      objectClass: hr.class.Request
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverHr.trigger.OnRequestRemove,
    txMatch: {
      _class: core.class.TxRemoveDoc,
      objectClass: hr.class.Request
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverHr.trigger.OnEmployee,
    txMatch: {
      _class: core.class.TxMixin,
      mixin: contact.mixin.Employee
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverHr.trigger.OnEmployeeDeactivate,
    isAsync: true,
    txMatch: {
      _class: core.class.TxMixin,
      mixin: contact.mixin.Employee
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverHr.trigger.OnPublicHolidayCreate,
    txMatch: {
      _class: core.class.TxCreateDoc,
      objectClass: hr.class.PublicHoliday
    }
  })

  builder.mixin(hr.class.Request, core.class.Class, serverNotification.mixin.HTMLPresenter, {
    presenter: serverHr.function.RequestHTMLPresenter
  })

  builder.mixin(hr.class.Request, core.class.Class, serverNotification.mixin.TextPresenter, {
    presenter: serverHr.function.RequestTextPresenter
  })

  builder.mixin(hr.class.PublicHoliday, core.class.Class, serverNotification.mixin.HTMLPresenter, {
    presenter: serverHr.function.PublicHolidayHTMLPresenter
  })

  builder.mixin(hr.class.PublicHoliday, core.class.Class, serverNotification.mixin.TextPresenter, {
    presenter: serverHr.function.PublicHolidayTextPresenter
  })
}
