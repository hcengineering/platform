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

import { getMetadata, type Resources } from '@hcengineering/platform'
import { concatLink } from '@hcengineering/core'
import presentation from '@hcengineering/presentation'

import Chat from './components/Chat.svelte'
import Connect from './components/Connect.svelte'
import Reconnect from './components/Reconnect.svelte'
import IconTelegram from './components/icons/TelegramColor.svelte'
import TelegramMessageCreated from './components/activity/TelegramMessageCreated.svelte'
import MessagePresenter from './components/MessagePresenter.svelte'
import NotificationProviderPresenter from './components/NotificationProviderPresenter.svelte'
import TelegramIntegrationDescription from './components/TelegramIntegrationDescription.svelte'

import telegram from './plugin'
import { getCurrentEmployeeTG, getIntegrationOwnerTG, isTelegramNotificationsAvailable } from './utils'
import SharedMessages from './components/SharedMessages.svelte'

export default async (): Promise<Resources> => ({
  component: {
    Chat,
    Connect,
    Reconnect,
    IconTelegram,
    SharedMessages,
    MessagePresenter,
    NotificationProviderPresenter,
    TelegramIntegrationDescription
  },
  activity: {
    TelegramMessageCreated
  },
  function: {
    GetCurrentEmployeeTG: getCurrentEmployeeTG,
    GetIntegrationOwnerTG: getIntegrationOwnerTG,
    IsTelegramNotificationsAvailable: isTelegramNotificationsAvailable
  },
  handler: {
    DisconnectHandler: async () => {
      const url = getMetadata(telegram.metadata.TelegramURL) ?? ''
      await fetch(concatLink(url, '/signout'), {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + (getMetadata(presentation.metadata.Token) ?? ''),
          'Content-Type': 'application/json'
        }
      })
    }
  }
})
