//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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

import notification, { notificationId } from '@hcengineering/notification'
import { IntlString, mergeIds } from '@hcengineering/platform'
import { AnyComponent } from '@hcengineering/ui'

export default mergeIds(notificationId, notification, {
  string: {
    LastView: '' as IntlString,
    DM: '' as IntlString,
    DMNotification: '' as IntlString,
    MentionNotification: '' as IntlString,
    PlatformNotification: '' as IntlString,
    BrowserNotification: '' as IntlString,
    EmailNotification: '' as IntlString
  },
  component: {
    NotificationSettings: '' as AnyComponent
  }
})
