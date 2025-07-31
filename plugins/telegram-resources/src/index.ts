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

import { type Resources } from '@hcengineering/platform'
import { type Integration } from '@hcengineering/account-client'

import Chat from './components/Chat.svelte'
import Connect from './components/Connect.svelte'
import Reconnect from './components/Reconnect.svelte'
import IconTelegram from './components/icons/TelegramColor.svelte'
import TelegramMessageCreated from './components/activity/TelegramMessageCreated.svelte'
import MessagePresenter from './components/MessagePresenter.svelte'
import NotificationProviderPresenter from './components/NotificationProviderPresenter.svelte'
import TelegramIntegrationDescription from './components/TelegramIntegrationDescription.svelte'
import Configure from './components/Configure.svelte'
import StateComponent from './components/IntegrationState.svelte'

import { getCurrentEmployeeTG, getIntegrationOwnerTG, isTelegramNotificationsAvailable } from './utils'
import SharedMessages from './components/SharedMessages.svelte'
import { getIntegrationClient, disconnect, restart } from './api'

export default async (): Promise<Resources> => ({
  component: {
    Chat,
    Connect,
    Reconnect,
    Configure,
    IconTelegram,
    SharedMessages,
    MessagePresenter,
    NotificationProviderPresenter,
    TelegramIntegrationDescription,
    StateComponent
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
    DisconnectHandler: async (integration: Integration): Promise<void> => {
      const integrationClient = await getIntegrationClient()
      if (integration == null) {
        console.warn('DisconnectHandler: No integration provided')
        return
      }
      const connection = await integrationClient.getConnection(integration)
      const phone = integration.data?.phone ?? connection?.data?.phone
      const result = await integrationClient.removeIntegration(integration.socialId, integration.workspaceUuid)
      if (result?.connectionRemoved === true) {
        await disconnect(phone)
      } else {
        await restart(phone)
      }
    },
    DisconnectAllHandler: async (integration: Integration): Promise<void> => {
      const integrationClient = await getIntegrationClient()
      const connection = await integrationClient.getConnection(integration)
      if (connection == null) {
        console.warn('DisconnectAllHandler: No connection found for integration', integration)
        return
      }
      const phone = integration.data?.phone ?? connection?.data?.phone
      await disconnect(phone)
      await integrationClient.removeConnection(connection)
    }
  }
})
