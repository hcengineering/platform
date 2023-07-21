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

import { Doc, Ref } from '@hcengineering/core'
import { IntlString, mergeIds, Resource } from '@hcengineering/platform'
import { gmailId } from '@hcengineering/gmail'
import gmail from '@hcengineering/gmail-resources/src/plugin'
import type { AnyComponent } from '@hcengineering/ui'
import type { TxViewlet } from '@hcengineering/activity'
import { Action } from '@hcengineering/view'
import { NotificationGroup } from '@hcengineering/notification'

export default mergeIds(gmailId, gmail, {
  action: {
    WriteEmail: '' as Ref<Action>
  },
  string: {
    MessageID: '' as IntlString,
    IntegrationLabel: '' as IntlString,
    IntegrationDescription: '' as IntlString,
    SharedMessages: '' as IntlString,
    SharedMessage: '' as IntlString,
    ReplyTo: '' as IntlString,
    Message: '' as IntlString,
    Messages: '' as IntlString,
    Incoming: '' as IntlString,
    Status: '' as IntlString,
    EmailPlaceholder: '' as IntlString,
    ConfigLabel: '' as IntlString,
    ConfigDescription: '' as IntlString
  },
  ids: {
    TxSharedCreate: '' as Ref<TxViewlet>,
    NewMessageNotification: '' as Ref<TxViewlet>,
    EmailNotificationGroup: '' as Ref<NotificationGroup>
  },
  activity: {
    TxSharedCreate: '' as AnyComponent,
    TxWriteMessage: '' as AnyComponent
  },
  function: {
    HasEmail: '' as Resource<(doc?: Doc | Doc[] | undefined) => Promise<boolean>>
  }
})
