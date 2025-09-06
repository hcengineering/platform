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

import { type Ref } from '@hcengineering/core'
import type { IntlString } from '@hcengineering/platform'
import { mergeIds } from '@hcengineering/platform'
import { requestId } from '@hcengineering/request'
import request from '@hcengineering/request-resources/src/plugin'
import { type AnyComponent } from '@hcengineering/ui/src/types'
import type { NotificationGroup, NotificationType } from '@hcengineering/notification'

export default mergeIds(requestId, request, {
  component: {
    EditRequest: '' as AnyComponent,
    NotificationRequestView: '' as AnyComponent,
    RequestedChangedNotification: '' as AnyComponent
  },
  ids: {
    RequestNotificationGroup: '' as Ref<NotificationGroup>,
    CreateRequestNotification: '' as Ref<NotificationType>,
    RemoveRequestNotification: '' as Ref<NotificationType>
  },
  string: {
    Status: '' as IntlString,
    Requested: '' as IntlString,
    NewRequest: '' as IntlString,
    CancelRequest: '' as IntlString
  }
})
