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

import { type Ref } from '@hcengineering/core'
import { type IntlString, type Resource, mergeIds } from '@hcengineering/platform'
import { telegramId } from '@hcengineering/telegram'
import telegram from '@hcengineering/telegram-resources/src/plugin'
import type { AnyComponent } from '@hcengineering/ui/src/types'
import type { DocUpdateMessageViewlet } from '@hcengineering/activity'
import { type TemplateFieldFunc } from '@hcengineering/templates'
import { type NotificationGroup } from '@hcengineering/notification'

export default mergeIds(telegramId, telegram, {
  string: {
    SharedMessages: '' as IntlString,
    SharedMessage: '' as IntlString,
    Content: '' as IntlString,
    Incoming: '' as IntlString,
    Messages: '' as IntlString,
    Telegram: '' as IntlString,
    Status: '' as IntlString,
    ConfigLabel: '' as IntlString,
    ConfigDescription: '' as IntlString,
    NewMessage: '' as IntlString,
    NewIncomingMessage: '' as IntlString,
    TelegramNotificationDescription: '' as IntlString
  },
  ids: {
    NotificationGroup: '' as Ref<NotificationGroup>,
    TelegramMessageSharedActivityViewlet: '' as Ref<DocUpdateMessageViewlet>,
    TelegramMessageCreatedActivityViewlet: '' as Ref<DocUpdateMessageViewlet>
  },
  function: {
    GetCurrentEmployeeTG: '' as Resource<TemplateFieldFunc>,
    GetIntegrationOwnerTG: '' as Resource<TemplateFieldFunc>,
    IsTelegramNotificationsAvailable: '' as Resource<() => boolean>
  },
  activity: {
    TelegramMessageCreated: '' as AnyComponent
  },
  component: {
    NotificationProviderPresenter: '' as AnyComponent,
    TelegramIntegrationDescription: '' as AnyComponent
  }
})
