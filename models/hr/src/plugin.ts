//
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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

import { Ref } from '@hcengineering/core'
import { hrId } from '@hcengineering/hr'
import hr from '@hcengineering/hr-resources/src/plugin'
import { NotificationGroup } from '@hcengineering/notification'
import { IntlString, mergeIds } from '@hcengineering/platform'
import { AnyComponent } from '@hcengineering/ui'
import { Action, ActionCategory, ViewAction } from '@hcengineering/view'

export default mergeIds(hrId, hr, {
  string: {
    Request: '' as IntlString,
    Vacation: '' as IntlString,
    Sick: '' as IntlString,
    PTO: '' as IntlString,
    PTO2: '' as IntlString,
    Remote: '' as IntlString,
    Overtime: '' as IntlString,
    Overtime2: '' as IntlString,
    Subscribers: '' as IntlString,
    PublicHoliday: '' as IntlString,
    RequestCreated: '' as IntlString,
    RequestUpdated: '' as IntlString,
    RequestRemoved: '' as IntlString,
    ConfigLabel: '' as IntlString,
    ConfigDescription: '' as IntlString
  },
  component: {
    Structure: '' as AnyComponent,
    CreateDepartment: '' as AnyComponent,
    EditDepartment: '' as AnyComponent,
    DepartmentStaff: '' as AnyComponent,
    DepartmentEditor: '' as AnyComponent,
    Schedule: '' as AnyComponent,
    EditRequest: '' as AnyComponent,
    TzDatePresenter: '' as AnyComponent,
    TzDateEditor: '' as AnyComponent,
    RequestPresenter: '' as AnyComponent
  },
  category: {
    HR: '' as Ref<ActionCategory>
  },
  action: {
    CreateDepartment: '' as Ref<Action>,
    EditDepartment: '' as Ref<Action>,
    ArchiveDepartment: '' as Ref<Action>,
    EditRequest: '' as Ref<Action>,
    EditRequestType: '' as Ref<Action>,
    DeleteRequest: '' as Ref<Action>
  },
  actionImpl: {
    EditRequestType: '' as ViewAction
  },
  ids: {
    HRNotificationGroup: '' as Ref<NotificationGroup>
  }
})
