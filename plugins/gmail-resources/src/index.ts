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
import presentation from '@hcengineering/presentation'
import GmailWriteMessage from './components/activity/GmailWriteMessage.svelte'
import GmailSharedMessage from './components/activity/GmailSharedMessage.svelte'
import Configure from './components/Configure.svelte'
import Connect from './components/Connect.svelte'
import IconGmail from './components/icons/GmailColor.svelte'
import Main from './components/Main.svelte'
import NewMessages from './components/NewMessages.svelte'
import IntegrationState from './components/IntegrationState.svelte'
import gmail from '@hcengineering/gmail'
import { checkHasEmail, MessageTitleProvider } from './utils'
import { getIntegrationClient, signout } from './api'
import type { Integration } from '@hcengineering/account-client'

export default async (): Promise<Resources> => ({
  component: {
    Main,
    Connect,
    IconGmail,
    NewMessages,
    Configure,
    IntegrationState
  },
  activity: {
    GmailWriteMessage,
    GmailSharedMessage
  },
  function: {
    HasEmail: checkHasEmail,
    MessageTitleProvider
  },
  handler: {
    DisconnectHandler: async (integration: Integration): Promise<void> => {
      const url = getMetadata(gmail.metadata.GmailURL)
      const token = getMetadata(presentation.metadata.Token)
      if (url === undefined || token === undefined) {
        console.error('Url or token is not defined in DisconnectHandler')
      }
      if (integration == null) {
        console.error('Missing required argument integration in DisconnectHandler')
        return
      }
      const integrationClient = await getIntegrationClient()
      const result = await integrationClient.removeIntegration(integration.socialId, integration.workspaceUuid)
      if (result !== undefined && result.connectionRemoved) {
        await signout()
      }
    },
    DisconnectAllHandler: async (integration: Integration): Promise<void> => {
      const url = getMetadata(gmail.metadata.GmailURL)
      const token = getMetadata(presentation.metadata.Token)
      if (url === undefined || token === undefined) {
        console.error('Url or token is not defined in DisconnectHandler')
      }
      if (integration == null) {
        console.error('Missing required argument integration in DisconnectHandler')
        return
      }
      const integrationClient = await getIntegrationClient()
      await integrationClient.removeConnection(integration)
      await signout()
    }
  }
})
