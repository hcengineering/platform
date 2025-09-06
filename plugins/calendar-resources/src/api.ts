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

import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import login from '@hcengineering/login'
import { type Integration } from '@hcengineering/account-client'
import {
  type IntegrationClient,
  getIntegrationClient as getIntegrationClientRaw,
  request
} from '@hcengineering/integration-client'
import calendar from './plugin'
import { calendarIntegrationKind } from '@hcengineering/calendar'

export async function signout (integration: Integration, client: IntegrationClient): Promise<void> {
  const url = getMetadata(calendar.metadata.CalendarServiceURL)
  const token = getMetadata(presentation.metadata.Token)
  if (url === undefined || token === undefined) {
    throw new Error('Calendar service URL or token is not defined')
  }
  const connection = await client.getConnection(integration)
  const email = integration.data?.email ?? connection?.data?.email
  if (email === undefined) {
    throw new Error('Email is not defined in integration')
  }
  await request({
    baseUrl: url,
    path: `/signout?value=${email}`,
    method: 'GET',
    token
  })
}

export async function disconnect (integration: Integration): Promise<void> {
  const integrationClient = await getIntegrationClient()
  const result = await integrationClient.removeIntegration(integration.socialId, integration.workspaceUuid)
  if (result !== undefined && result.connectionRemoved) {
    await signout(integration, integrationClient)
  }
}

export async function disconnectAll (integration: Integration): Promise<void> {
  const integrationClient = await getIntegrationClient()
  await integrationClient.removeConnection(integration)
  await signout(integration, integrationClient)
}

export async function getIntegrationClient (): Promise<IntegrationClient> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)
  const token = getMetadata(presentation.metadata.Token)
  if (accountsUrl === undefined || token === undefined) {
    throw new Error('Accounts URL or token is not defined')
  }
  return getIntegrationClientRaw(accountsUrl, token, calendarIntegrationKind, 'calendar')
}
