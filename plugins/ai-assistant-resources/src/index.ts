//
// Copyright © 2025 Hardcore Engineering Inc.
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
import type { Integration } from '@hcengineering/account-client'

import Configure from './components/Configure.svelte'
import IconHulyAssistant from './components/icons/HulyAssistant.svelte'
import { getIntegrationClient } from './utils'

export default async (): Promise<Resources> => ({
  component: {
    Connect: Configure,
    Configure,
    IconHulyAssistant
  },
  handler: {
    DisconnectHandler: async (integration: Integration): Promise<void> => {
      if (integration == null) {
        console.error('Missing required argument integration in DisconnectHandler')
        return
      }
      const integrationClient = await getIntegrationClient()
      await integrationClient.removeIntegration(integration.socialId, integration.workspaceUuid)
    },
    DisconnectAllHandler: async (integration: Integration): Promise<void> => {
      if (integration == null) {
        console.error('Missing required argument integration in DisconnectHandler')
        return
      }
      const integrationClient = await getIntegrationClient()
      await integrationClient.removeConnection(integration)
    }
  }
})
